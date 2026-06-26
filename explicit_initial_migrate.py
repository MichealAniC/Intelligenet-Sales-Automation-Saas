import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.core.config import settings
from sqlalchemy import create_engine
from sqlalchemy.dialects import postgresql
import sqlalchemy as sa

print("=== MANUAL MIGRATION SCRIPT ===")
print("Connecting to DB:", settings.DATABASE_URL)
engine = create_engine(settings.DATABASE_URL)

with engine.connect() as conn:
    print("Step 1: Create ENUM types")
    # Create ENUMs
    user_role = postgresql.ENUM("Admin", "Sales", name="user_role", create_type=False)
    user_role.create(conn, checkfirst=True)
    
    seniority_level = postgresql.ENUM(
        "C-Suite", "VP", "Director", "Manager", "Staff",
        name="seniority_level", create_type=False
    )
    seniority_level.create(conn, checkfirst=True)
    
    company_size_category = postgresql.ENUM(
        "Startup", "SMB", "Mid-Market", "Enterprise",
        name="company_size_category", create_type=False
    )
    company_size_category.create(conn, checkfirst=True)
    
    lead_source = postgresql.ENUM(
        "LinkedIn", "Webinar", "Referral", "Cold Email", "Website", "Paid Ads", "Events",
        name="lead_source", create_type=False
    )
    lead_source.create(conn, checkfirst=True)
    
    follow_up_status = postgresql.ENUM(
        "Positive", "Neutral", "Negative", "No Response",
        name="follow_up_status", create_type=False
    )
    follow_up_status.create(conn, checkfirst=True)
    
    estimated_budget = postgresql.ENUM(
        "Low", "Medium", "High",
        name="estimated_budget", create_type=False
    )
    estimated_budget.create(conn, checkfirst=True)
    
    purchase_timeline = postgresql.ENUM(
        "Immediate", "1-3 Months", "3-6 Months", "Future",
        name="purchase_timeline", create_type=False
    )
    purchase_timeline.create(conn, checkfirst=True)
    
    lead_category = postgresql.ENUM(
        "Hot", "Warm", "Cold", name="lead_category", create_type=False
    )
    lead_category.create(conn, checkfirst=True)
    
    assignment_status = postgresql.ENUM(
        "Assigned", "In Progress", "Completed",
        name="assignment_status", create_type=False
    )
    assignment_status.create(conn, checkfirst=True)
    
    print("Step 2: Create users table")
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            staff_id VARCHAR NOT NULL UNIQUE,
            full_name VARCHAR NOT NULL,
            email VARCHAR NOT NULL UNIQUE,
            password_hash VARCHAR NOT NULL,
            role user_role NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    
    print("Step 3: Create leads table")
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS leads (
            lead_id VARCHAR PRIMARY KEY,
            first_name VARCHAR NOT NULL,
            last_name VARCHAR NOT NULL,
            email VARCHAR NOT NULL,
            phone_number VARCHAR NOT NULL,
            job_title VARCHAR NOT NULL,
            seniority_level seniority_level NOT NULL,
            department VARCHAR NOT NULL,
            country VARCHAR NOT NULL,
            company_name VARCHAR NOT NULL,
            company_industry VARCHAR NOT NULL,
            company_size_category company_size_category NOT NULL,
            company_size_range VARCHAR NOT NULL,
            estimated_annual_revenue NUMERIC(18,2) NOT NULL,
            lead_source lead_source NOT NULL,
            date_captured DATE NOT NULL,
            website_visits INTEGER NOT NULL,
            pages_viewed INTEGER NOT NULL,
            average_time_on_site FLOAT NOT NULL,
            email_open_rate FLOAT NOT NULL,
            email_click_rate FLOAT NOT NULL,
            webinar_attendance BOOLEAN NOT NULL,
            last_interaction_days INTEGER NOT NULL,
            meeting_scheduled BOOLEAN NOT NULL,
            follow_up_status follow_up_status NOT NULL,
            estimated_budget estimated_budget NOT NULL,
            purchase_timeline purchase_timeline NOT NULL,
            converted BOOLEAN NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    
    print("Step 4: Create lead_scores table")
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS lead_scores (
            score_id UUID PRIMARY KEY,
            lead_id VARCHAR NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
            score_value INTEGER NOT NULL,
            score_category lead_category NOT NULL,
            prediction_probability FLOAT NOT NULL,
            prediction_result BOOLEAN NOT NULL,
            model_name VARCHAR NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    
    print("Step 5: Create lead_assignments table")
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS lead_assignments (
            assignment_id UUID PRIMARY KEY,
            lead_id VARCHAR NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
            assigned_to UUID NOT NULL REFERENCES users(id),
            assigned_by UUID REFERENCES users(id),
            assignment_priority lead_category NOT NULL,
            assignment_status assignment_status NOT NULL,
            assignment_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    
    print("Step 6: Create indexes")
    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS ix_users_staff_id ON users(staff_id);
        CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS ix_leads_email ON leads(email);
        CREATE INDEX IF NOT EXISTS ix_lead_scores_lead_id ON lead_scores(lead_id);
        CREATE INDEX IF NOT EXISTS ix_lead_assignments_lead_id ON lead_assignments(lead_id);
        CREATE INDEX IF NOT EXISTS ix_lead_assignments_assigned_to ON lead_assignments(assigned_to);
    """))
    
    print("=== Initial migration complete! ===")