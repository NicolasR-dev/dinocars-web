import os
import sqlite3
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from backend import models

# Cloud DB URL
CLOUD_DATABASE_URL = os.getenv("DATABASE_URL")

if not CLOUD_DATABASE_URL:
    print("Error: DATABASE_URL is not set.")
    exit(1)

# Fix for Render/Heroku
if CLOUD_DATABASE_URL.startswith("psql "):
    CLOUD_DATABASE_URL = CLOUD_DATABASE_URL.replace("psql ", "", 1)
CLOUD_DATABASE_URL = CLOUD_DATABASE_URL.strip().strip("'").strip('"')
if CLOUD_DATABASE_URL.startswith("postgres://"):
    CLOUD_DATABASE_URL = CLOUD_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Connect to Cloud DB
cloud_engine = create_engine(CLOUD_DATABASE_URL)
CloudSession = sessionmaker(bind=cloud_engine)
cloud_session = CloudSession()

# Connect to Local SQLite
# We use raw sqlite3 to avoid model conflicts or complex multi-db setup with ORM
sqlite_conn = sqlite3.connect("dinocars.db")
sqlite_cursor = sqlite_conn.cursor()

def migrate_users():
    print("Migrating Users...")
    sqlite_cursor.execute("SELECT id, username, hashed_password, role FROM users")
    users = sqlite_cursor.fetchall()
    
    count = 0
    for row in users:
        # Check if user exists in cloud
        existing = cloud_session.query(models.User).filter(models.User.username == row[1]).first()
        if not existing:
            new_user = models.User(
                username=row[1],
                hashed_password=row[2],
                role=row[3]
                # created_at will be handled by default
            )
            cloud_session.add(new_user)
            count += 1
    
    cloud_session.commit()
    print(f"Migrated {count} new users.")

def migrate_records():
    print("Migrating Daily Records...")
    # Get all columns from sqlite
    sqlite_cursor.execute("SELECT * FROM daily_records")
    # Get column names
    columns = [description[0] for description in sqlite_cursor.description]
    records = sqlite_cursor.fetchall()
    
    count = 0
    for row in records:
        row_dict = dict(zip(columns, row))
        
        # Check if record exists (match date, rides_today, and total_counted to be sure)
        existing = cloud_session.query(models.DailyRecord).filter(
            models.DailyRecord.date == row_dict['date'],
            models.DailyRecord.rides_today == row_dict.get('rides_today'),
            models.DailyRecord.total_counted == row_dict.get('total_counted')
        ).first()
        
        if not existing:
            # Create new record object
            # We filter out 'id' to let Postgres generate it, or we can keep it if we want exact sync.
            # Let's keep 'id' to maintain history integrity if possible, but might conflict with sequences.
            # Safer to let Postgres generate ID, but order matters.
            # Actually, for history, date is the key.
            
            # Remove id from dict
            if 'id' in row_dict:
                del row_dict['id']
                
            new_record = models.DailyRecord(**row_dict)
            cloud_session.add(new_record)
            count += 1
            
    cloud_session.commit()
    print(f"Migrated {count} daily records.")

def migrate_schedules():
    print("Migrating Schedules...")
    # This is trickier because user_ids might have changed if we didn't preserve IDs.
    # But since we match users by username, we can look up the new user_id.
    
    sqlite_cursor.execute("SELECT s.day_of_week, s.start_time, s.end_time, u.username FROM schedules s JOIN users u ON s.user_id = u.id")
    schedules = sqlite_cursor.fetchall()
    
    count = 0
    for row in schedules:
        day, start, end, username = row
        
        # Find user in cloud DB
        cloud_user = cloud_session.query(models.User).filter(models.User.username == username).first()
        if cloud_user:
            # Check if schedule exists
            existing = cloud_session.query(models.Schedule).filter(
                models.Schedule.user_id == cloud_user.id,
                models.Schedule.day_of_week == day,
                models.Schedule.start_time == start
            ).first()
            
            if not existing:
                new_schedule = models.Schedule(
                    user_id=cloud_user.id,
                    day_of_week=day,
                    start_time=start,
                    end_time=end
                )
                cloud_session.add(new_schedule)
                count += 1
    
    cloud_session.commit()
    print(f"Migrated {count} schedules.")

if __name__ == "__main__":
    try:
        migrate_users()
        migrate_records()
        migrate_schedules()
        print("Migration complete!")
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        cloud_session.close()
        sqlite_conn.close()
