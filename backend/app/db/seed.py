from sqlalchemy.orm import Session
from app.models.models import Role, User, Reservoir, Village
from app.services.auth_service import hash_password
from app.db.database import SessionLocal

def seed_database():
    """Seed the database with initial roles, admin user, reservoirs, and villages if empty"""
    db = SessionLocal()
    try:
        # 1. Seed Roles
        roles_count = db.query(Role).count()
        if roles_count == 0:
            print("Seeding database roles...")
            admin_role = Role(id=1, name="admin", description="Administrator")
            analyst_role = Role(id=2, name="analyst", description="Data Analyst")
            officer_role = Role(id=3, name="government_officer", description="Government Officer")
            
            db.add_all([admin_role, analyst_role, officer_role])
            db.commit()
            print("Roles seeded successfully!")
            
        # 2. Seed Default Admin User
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

        # 3. Seed Reservoirs & Dams
        reservoirs_count = db.query(Reservoir).count()
        if reservoirs_count == 0:
            print("Seeding database reservoirs...")
            srisailam = Reservoir(
                name="srisailam",
                capacity=500.0,
                current_level=320.0,
                district="Kurnool",
                state="Andhra Pradesh",
                latitude=16.0886,
                longitude=78.9006
            )
            krishna = Reservoir(
                name="krishna",
                capacity=1000.0,
                current_level=200.0,
                district="Nalgonda",
                state="Telangana",
                latitude=16.5739,
                longitude=79.3122
            )
            db.add_all([srisailam, krishna])
            db.commit()
            print("Reservoirs seeded successfully!")

        # 4. Seed Villages
        villages_count = db.query(Village).count()
        if villages_count == 0:
            print("Seeding database villages...")
            gaya = Village(
                name="Gaya Village",
                district="Gaya",
                state="Bihar",
                population=8000,
                latitude=24.79,
                longitude=85.0,
                water_source="Groundwater",
                reservoir_dependency=30.0
            )
            pongodu = Village(
                name="Pongodu",
                district="Kochi",
                state="Kerala",
                population=5000,
                latitude=9.50,
                longitude=76.30,
                water_source="Reservoir",
                reservoir_dependency=70.0
            )
            ponugodu = Village(
                name="Ponugodu",
                district="Nalgonda",
                state="Telangana",
                population=12000,
                latitude=16.85,
                longitude=79.22,
                water_source="Reservoir",
                reservoir_dependency=85.0
            )
            db.add_all([gaya, pongodu, ponugodu])
            db.commit()
            print("Villages seeded successfully!")

        # 5. Seed Rivers
        from app.models.models import River
        rivers_count = db.query(River).count()
        if rivers_count == 0:
            print("Seeding database rivers...")
            ganges = River(
                name="ganges",
                river_level=8.5,
                danger_level=12.0,
                flow_rate=1200.0,
                trend="Rising",
                latitude=25.3176,
                longitude=82.9739
            )
            yamuna = River(
                name="yamuna",
                river_level=6.2,
                danger_level=9.0,
                flow_rate=850.0,
                trend="Falling",
                latitude=26.4499,
                longitude=80.3319
            )
            godavari = River(
                name="godavari",
                river_level=11.8,
                danger_level=15.0,
                flow_rate=2100.0,
                trend="Rising",
                latitude=16.9891,
                longitude=81.7828
            )
            db.add_all([ganges, yamuna, godavari])
            db.commit()
            print("Rivers seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {str(e)}")
    finally:
        db.close()
