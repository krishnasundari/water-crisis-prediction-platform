from sqlalchemy.orm import Session
from app.models.models import Role, User
from app.services.auth_service import hash_password
from app.db.database import SessionLocal

def seed_database():
    """Seed the database with initial roles and a default admin user if empty"""
    db = SessionLocal()
    try:
        # Seed Roles
        roles_count = db.query(Role).count()
        if roles_count == 0:
            print("Seeding database roles...")
            admin_role = Role(id=1, name="admin", description="Administrator")
            analyst_role = Role(id=2, name="analyst", description="Data Analyst")
            officer_role = Role(id=3, name="government_officer", description="Government Officer")
            
            db.add_all([admin_role, analyst_role, officer_role])
            db.commit()
            print("Roles seeded successfully!")
            
        # Seed Default Admin User
        admin_exists = db.query(User).filter(User.email == "admin@water.gov").first()
        if not admin_exists:
            print("Creating default admin user...")
            admin_role = db.query(Role).filter(Role.name == "admin").first()
            if admin_role:
                admin_user = User(
                    email="admin@water.gov",
                    username="admin_water",
                    full_name="Admin User",
                    hashed_password=hash_password("Admin@123"),
                    role_id=admin_role.id,
                    is_active=True
                )
                db.add(admin_user)
                db.commit()
                print("Default admin user created!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {str(e)}")
    finally:
        db.close()
