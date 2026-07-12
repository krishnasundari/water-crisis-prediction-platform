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
        if reservoirs_count < 10:
            print("Refreshing and seeding full database of real-world Indian reservoirs...")
            db.query(Reservoir).delete()
            db.commit()

            tehri = Reservoir(
                name="Tehri Dam",
                capacity=2600.0,
                current_level=1850.0,
                district="Tehri Garhwal",
                state="Uttarakhand",
                latitude=30.3781,
                longitude=78.4803
            )
            bhakra = Reservoir(
                name="Bhakra Nangal Dam",
                capacity=9340.0,
                current_level=7100.0,
                district="Bilaspur",
                state="Himachal Pradesh",
                latitude=31.4103,
                longitude=76.4353
            )
            hirakud = Reservoir(
                name="Hirakud Dam",
                capacity=5891.0,
                current_level=4200.0,
                district="Sambalpur",
                state="Odisha",
                latitude=21.5700,
                longitude=83.8700
            )
            sarovar = Reservoir(
                name="Sardar Sarovar Dam",
                capacity=9500.0,
                current_level=6800.0,
                district="Narmada",
                state="Gujarat",
                latitude=21.8294,
                longitude=73.7483
            )
            koyna = Reservoir(
                name="Koyna Dam",
                capacity=2797.0,
                current_level=2100.0,
                district="Satara",
                state="Maharashtra",
                latitude=17.3986,
                longitude=73.7478
            )
            mettur = Reservoir(
                name="Mettur Dam",
                capacity=2708.0,
                current_level=1980.0,
                district="Salem",
                state="Tamil Nadu",
                latitude=11.7944,
                longitude=77.8011
            )
            idukki = Reservoir(
                name="Idukki Arch Dam",
                capacity=1996.0,
                current_level=1450.0,
                district="Idukki",
                state="Kerala",
                latitude=9.8485,
                longitude=76.9736
            )
            maithon = Reservoir(
                name="Maithon Dam",
                capacity=1100.0,
                current_level=820.0,
                district="Dhanbad",
                state="Jharkhand",
                latitude=23.7711,
                longitude=86.8114
            )
            rihand = Reservoir(
                name="Rihand Dam",
                capacity=10600.0,
                current_level=7500.0,
                district="Sonbhadra",
                state="Uttar Pradesh",
                latitude=24.2072,
                longitude=83.0036
            )
            indirasagar = Reservoir(
                name="Indirasagar Dam",
                capacity=12200.0,
                current_level=9800.0,
                district="Khandwa",
                state="Madhya Pradesh",
                latitude=22.2842,
                longitude=76.4397
            )
            tungabhadra = Reservoir(
                name="Tungabhadra Dam",
                capacity=3760.0,
                current_level=2900.0,
                district="Ballari",
                state="Karnataka",
                latitude=15.2639,
                longitude=76.3347
            )
            nagarjuna = Reservoir(
                name="Nagarjuna Sagar Dam",
                capacity=11560.0,
                current_level=8900.0,
                district="Nalgonda",
                state="Telangana",
                latitude=16.5739,
                longitude=79.3122
            )
            srisailam = Reservoir(
                name="Srisailam Dam",
                capacity=6150.0,
                current_level=4800.0,
                district="Kurnool",
                state="Andhra Pradesh",
                latitude=16.0886,
                longitude=78.9006
            )

            db.add_all([
                tehri, bhakra, hirakud, sarovar, koyna, mettur, 
                idukki, maithon, rihand, indirasagar, tungabhadra, 
                nagarjuna, srisailam
            ])
            db.commit()
            print("Indian reservoirs seeded successfully!")

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
