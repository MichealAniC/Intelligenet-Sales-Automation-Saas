import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.core.config import settings
from sqlalchemy import create_engine, text
from sqlalchemy.dialects import postgresql

print("=== MIGRATION 3,4,5 & OUR TASK MIGRATION ===")
engine = create_engine(settings.DATABASE_URL)

with engine.begin() as conn:
    # -----------------
    # Migration 8f4c0e2d9c1a: Lead Ops Core
    # -----------------
    print("\n=== Step 3: Lead Ops Core ===")
    
    # Create lead_status enum
    print("  Creating lead_status enum")
    lead_status = postgresql.ENUM(
        "New", "Contacted", "Qualified", "Unqualified", "Converted", "Archived",
        name="lead_status", create_type=False
    )
    lead_status.create(conn, checkfirst=True)
    
    # Create sequence and tables
    print("  Creating lead import tables")
    conn.execute(text("CREATE SEQUENCE IF NOT EXISTS lead_id_seq"))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS lead_import_batches (
            id UUID PRIMARY KEY,
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
            batch_code VARCHAR NOT NULL,
            filename VARCHAR,
            imported_by UUID REFERENCES users(id) ON DELETE SET NULL,
            row_count INTEGER NOT NULL,
            imported_count INTEGER NOT NULL,
            updated_count INTEGER NOT NULL,
            skipped_duplicate_count INTEGER NOT NULL,
            failed_count INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(organization_id, batch_code)
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS lead_import_batch_counters (
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
            batch_date DATE NOT NULL,
            counter INTEGER NOT NULL,
            PRIMARY KEY(organization_id, batch_date)
        )
    """))
    
    # Add new cols to leads
    print("  Updating leads table with new columns")
    conn.execute(text("""
        ALTER TABLE leads 
        ADD COLUMN IF NOT EXISTS full_name VARCHAR,
        ADD COLUMN IF NOT EXISTS lead_status lead_status,
        ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES lead_import_batches(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS raw_data JSONB,
        ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id) ON DELETE SET NULL
    """))
    
    # Create the rest of the tables
    print("  Creating lead_events, lead_notes, lead_tags, lead_tag_links")
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS lead_events (
            id UUID PRIMARY KEY,
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
            lead_id VARCHAR NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
            actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            batch_id UUID REFERENCES lead_import_batches(id) ON DELETE SET NULL,
            event_type VARCHAR NOT NULL,
            data JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS lead_notes (
            id UUID PRIMARY KEY,
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
            lead_id VARCHAR NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
            author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            body TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS lead_tags (
            id UUID PRIMARY KEY,
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
            name VARCHAR NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(organization_id, name)
        );
        
        CREATE TABLE IF NOT EXISTS lead_tag_links (
            lead_id VARCHAR NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
            tag_id UUID NOT NULL REFERENCES lead_tags(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY(lead_id, tag_id)
        );
    """))
    
    # Create indexes
    print("  Creating indexes")
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_lead_import_batches_organization_id ON lead_import_batches(organization_id);
        CREATE INDEX IF NOT EXISTS ix_lead_import_batches_batch_code ON lead_import_batches(batch_code);
        CREATE INDEX IF NOT EXISTS ix_leads_is_deleted ON leads(is_deleted);
        CREATE INDEX IF NOT EXISTS ix_leads_lead_status ON leads(lead_status);
        CREATE INDEX IF NOT EXISTS ix_lead_events_organization_id ON lead_events(organization_id);
        CREATE INDEX IF NOT EXISTS ix_lead_events_lead_id ON lead_events(lead_id);
        CREATE INDEX IF NOT EXISTS ix_lead_events_created_at ON lead_events(created_at);
        CREATE INDEX IF NOT EXISTS ix_lead_notes_organization_id ON lead_notes(organization_id);
        CREATE INDEX IF NOT EXISTS ix_lead_notes_lead_id ON lead_notes(lead_id);
        CREATE INDEX IF NOT EXISTS ix_lead_tags_organization_id ON lead_tags(organization_id);
    """))
    
    # Update full_name and lead_status
    print("  Updating full_name and lead_status default")
    conn.execute(text("""
        UPDATE leads SET full_name = trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')) 
        WHERE full_name IS NULL
    """))
    conn.execute(text("UPDATE leads SET lead_status = 'New' WHERE lead_status IS NULL"))
    
    # Set full_name and lead_status to not null
    print("  Setting cols to NOT NULL")
    conn.execute(text("""
        ALTER TABLE leads ALTER COLUMN full_name SET NOT NULL;
        ALTER TABLE leads ALTER COLUMN lead_status SET NOT NULL;
    """))
    
    # -----------------
    # Migration a3b7c9e1f204: Prescriptive Lead Routing
    # -----------------
    print("\n=== Step 4: Prescriptive Lead Routing ===")
    print("  Adding sales profile and availability cols to users")
    # Create enums first (from a3b7c9e1f204)
    sales_profile = postgresql.ENUM(
        "Junior Sales Rep", "Senior Sales Rep", "Industry Specialist", "Top Performer",
        name="sales_profile", create_type=False
    )
    availability_status = postgresql.ENUM(
        "Available", "Busy", "On Leave", "Inactive",
        name="availability_status", create_type=False
    )
    sales_profile.create(conn, checkfirst=True)
    availability_status.create(conn, checkfirst=True)
    
    # Add columns
    conn.execute(text("""
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS sales_profile sales_profile,
        ADD COLUMN IF NOT EXISTS availability_status availability_status,
        ADD COLUMN IF NOT EXISTS capacity INTEGER,
        ADD COLUMN IF NOT EXISTS expertise_industries VARCHAR[],
        ADD COLUMN IF NOT EXISTS expertise_seniority_levels seniority_level[],
        ADD COLUMN IF NOT EXISTS expertise_company_size_categories company_size_category[]
    """))
    # Set defaults
    conn.execute(text("UPDATE users SET availability_status = 'Available' WHERE availability_status IS NULL"))
    conn.execute(text("ALTER TABLE users ALTER COLUMN availability_status SET NOT NULL"))
    
    # -----------------
    # Migration b5c8d2e4f608: Add Profile Status
    # -----------------
    print("\n=== Step5: Add Profile Status ===")
    profile_status = postgresql.ENUM(
        "Pending Configuration", "Active", "Disabled",
        name="profile_status", create_type=False
    )
    profile_status.create(conn, checkfirst=True)
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_status profile_status"))
    conn.execute(text("UPDATE users SET profile_status = 'Active' WHERE profile_status IS NULL"))
    conn.execute(text("ALTER TABLE users ALTER COLUMN profile_status SET NOT NULL"))
    
    # -----------------
    # MIGRATION 987654321abc: OUR TASKS TABLE!
    # -----------------
    print("\n=== FINAL STEP: ADDING TASKS TABLE ===")
    # Create task priority/status enums
    task_priority = postgresql.ENUM(
        "Low", "Medium", "High", name="task_priority", create_type=False
    )
    task_status_enum = postgresql.ENUM(
        "Pending", "Completed", "Canceled", name="task_status", create_type=False
    )
    task_priority.create(conn, checkfirst=True)
    task_status_enum.create(conn, checkfirst=True)
    
    # Create tasks table!
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS tasks (
            task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
            lead_id VARCHAR REFERENCES leads(lead_id) ON DELETE CASCADE,
            assigned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR NOT NULL,
            description TEXT,
            due_date TIMESTAMPTZ,
            priority task_priority NOT NULL DEFAULT 'Medium',
            status task_status NOT NULL DEFAULT 'Pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    
    print("\n=== ALL MIGRATIONS COMPLETED SUCCESSFULLY! ===")