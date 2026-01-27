import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend import models

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("psql "):
    DATABASE_URL = DATABASE_URL.replace("psql ", "", 1)
if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.strip().strip("'").strip('"')
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    print("DATABASE_URL not set")
    exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def list_users():
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        for user in users:
            print(f"User: {user.username}, Role: {user.role}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_users()
