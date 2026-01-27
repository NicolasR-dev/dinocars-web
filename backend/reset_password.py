import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend import models, auth

# Get DB URL from env or use the one provided (hardcoded for this script only)
# You can paste your Neon URL here if running locally against cloud DB
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("Error: DATABASE_URL is not set. Please export it or paste it in the script.")
    print("Example: export DATABASE_URL='postgresql://...'")
    exit(1)

# Fix for Render/Heroku using postgres:// instead of postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def reset_password(username, new_password):
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == username).first()
        if not user:
            print(f"Error: User '{username}' not found.")
            return

        print(f"Resetting password for user: {username}")
        hashed_password = auth.get_password_hash(new_password)
        user.hashed_password = hashed_password
        db.commit()
        print(f"Success! Password for '{username}' has been updated.")
            
    except Exception as e:
        print(f"Error resetting password: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python -m backend.reset_password <username> <new_password>")
        exit(1)
    
    username = sys.argv[1]
    new_password = sys.argv[2]
    reset_password(username, new_password)
