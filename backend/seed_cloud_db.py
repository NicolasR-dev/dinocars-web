import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend import models, auth

# Get DB URL from env or use the one provided (hardcoded for this script only)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("Error: DATABASE_URL is not set.")
    exit(1)

# Fix for Render/Heroku using postgres:// instead of postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"Connecting to database...")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_db():
    print("Creating tables...")
    models.Base.metadata.create_all(bind=engine)
    print("Tables created.")

    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            print("Creating default admin user...")
            hashed_password = auth.get_password_hash("admin123")
            new_admin = models.User(
                username="admin",
                hashed_password=hashed_password,
                role="admin"
            )
            db.add(new_admin)
            db.commit()
            print("Admin user created: admin / admin123")
        else:
            print("Admin user already exists.")
            
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
