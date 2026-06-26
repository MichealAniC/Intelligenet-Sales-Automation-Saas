import os
import sys
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.core.config import settings
from sqlalchemy import create_engine, text
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

print("=== MIGRATION 2: ORGANIZATIONS & INVITATIONS ===")
engine = create_engine(settings.DATABASE_URL)

with engine.begin() as conn:
    print("Step 1: Create organizations table")
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS organizations (
            id UUID PRIMARY KEY,
            name VARCHAR NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    
    print("Step 2: Add organization_id to users table")
    conn.execute(text("""
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;
    """))
    
    print("Step 3: Add organization_id to leads table")
    conn.execute(text("""
        ALTER TABLE leads 
        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;
    """))
    
    print("Step 4: Add organization_id to lead_scores table")
    conn.execute(text("""
        ALTER TABLE lead_scores 
        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;
    """))
    
    print("Step 5: Add organization_id to lead_assignments table")
    conn.execute(text("""
        ALTER TABLE lead_assignments 
        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;
    """))
    
    print("Step 6: Create invitations table")
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS invitations (
            id UUID PRIMARY KEY,
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            email VARCHAR NOT NULL,
            role user_role NOT NULL,
            token_hash VARCHAR NOT NULL UNIQUE,
            invited_by UUID NOT NULL REFERENCES users(id),
            expires_at TIMESTAMPTZ NOT NULL,
            accepted_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    
    print("Step7: Create indexes for invitations")
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_users_organization_id ON users(organization_id);
        CREATE INDEX IF NOT EXISTS ix_leads_organization_id ON leads(organization_id);
        CREATE INDEX IF NOT EXISTS ix_lead_scores_organization_id ON lead_scores(organization_id);
        CREATE INDEX IF NOT EXISTS ix_lead_assignments_organization_id ON lead_assignments(organization_id);
        CREATE INDEX IF NOT EXISTS ix_invitations_organization_id ON invitations(organization_id);
        CREATE INDEX IF NOT EXISTS ix_invitations_email ON invitations(email);
        CREATE INDEX IF NOT EXISTS ix_invitations_token_hash ON invitations(token_hash);
    """))
    
    print("Step8: Insert default org and set all org_ids")
    default_org_id = uuid.uuid4()
    conn.execute(text("""
        INSERT INTO organizations (id, name) 
        VALUES (:org_id, 'Default Organization') 
        ON CONFLICT DO NOTHING
    """), {"org_id": default_org_id})
    
    # Set the default org for all existing records
    conn.execute(text("""
        UPDATE users SET organization_id = COALESCE(organization_id, :org_id)
    """), {"org_id": default_org_id})
    conn.execute(text("""
        UPDATE leads SET organization_id = COALESCE(organization_id, :org_id)
    """), {"org_id": default_org_id})
    conn.execute(text("""
        UPDATE lead_scores SET organization_id = COALESCE(organization_id, :org_id)
    """), {"org_id": default_org_id})
    conn.execute(text("""
        UPDATE lead_assignments SET organization_id = COALESCE(organization_id, :org_id)
    """), {"org_id": default_org_id})
    
    # Make columns NOT NULL
    print("Step9: Make organization_id columns NOT NULL")
    conn.execute(text("""
        ALTER TABLE users ALTER COLUMN organization_id SET NOT NULL;
        ALTER TABLE leads ALTER COLUMN organization_id SET NOT NULL;
        ALTER TABLE lead_scores ALTER COLUMN organization_id SET NOT NULL;
        ALTER TABLE lead_assignments ALTER COLUMN organization_id SET NOT NULL;
    """))
    
    print("=== Done with organizations & invitations! ===")