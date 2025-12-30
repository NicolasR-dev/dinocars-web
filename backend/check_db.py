from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend import models

db = SessionLocal()
count = db.query(models.DailyRecord).count()
print(f"Total records: {count}")

last = db.query(models.DailyRecord).order_by(models.DailyRecord.date.desc()).first()
if last:
    print(f"Last record date: {last.date}")
else:
    print("No records found")
db.close()
