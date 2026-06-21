"""Hard Reset: Wipe leads + Sales users, preserve Admins."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.core.database import SessionLocal

db = SessionLocal()
try:
    # Count before
    leads_count = db.execute(text("SELECT count(*) FROM leads")).scalar()
    sales_count = db.execute(text("SELECT count(*) FROM users WHERE role = 'Sales'")).scalar()
    admin_count = db.execute(text("SELECT count(*) FROM users WHERE role = 'Admin'")).scalar()
    print(f"BEFORE: {leads_count} leads, {sales_count} Sales users, {admin_count} Admin users")

    # Delete child tables referencing leads (cascade order)
    db.execute(text("DELETE FROM lead_events"))
    db.execute(text("DELETE FROM lead_assignments"))
    db.execute(text("DELETE FROM lead_scores"))
    db.execute(text("DELETE FROM lead_notes"))
    db.execute(text("DELETE FROM lead_tag_links"))
    db.execute(text("DELETE FROM lead_import_batches"))
    db.execute(text("DELETE FROM leads"))
    print(f"  Deleted {leads_count} leads (+ all related events, assignments, scores, notes, tags, imports)")

    # Delete Sales users only
    db.execute(text("DELETE FROM users WHERE role = 'Sales'"))
    print(f"  Deleted {sales_count} Sales users")

    db.commit()

    # Verify
    leads_after = db.execute(text("SELECT count(*) FROM leads")).scalar()
    sales_after = db.execute(text("SELECT count(*) FROM users WHERE role = 'Sales'")).scalar()
    admin_after = db.execute(text("SELECT count(*) FROM users WHERE role = 'Admin'")).scalar()
    print(f"\nAFTER: {leads_after} leads, {sales_after} Sales users, {admin_after} Admin users")
    print(f"\nRESULT: {leads_count} leads deleted, {sales_count} Sales users deleted, {admin_after} Admins preserved")
except Exception as e:
    db.rollback()
    print(f"ERROR: {e}")
    raise
finally:
    db.close()
