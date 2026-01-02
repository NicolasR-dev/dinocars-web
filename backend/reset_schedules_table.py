from backend.database import engine, Base
from backend.models import Schedule
from sqlalchemy import text

def reset_schedules_table():
    print("Dropping schedules table...")
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS schedules"))
        conn.commit()
    
    print("Recreating schedules table...")
    Base.metadata.create_all(bind=engine)
    print("Done!")

if __name__ == "__main__":
    reset_schedules_table()
