from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import os
from datetime import timedelta, datetime

from . import models, schemas, database, auth

# Create tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="DinoCars API")

# CORS
origins = [
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Auth Endpoints ---

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_admin)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password, role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Logic Endpoints ---

@app.post("/calculate-vueltas", response_model=schemas.VueltasCalculationResponse)
def calculate_vueltas(request: schemas.VueltasCalculationRequest):
    total_today = sum(request.dino_counts)
    rides_today = total_today - request.total_accumulated_prev
    return {"total_today": total_today, "rides_today": rides_today}

@app.get("/last-record", response_model=schemas.DailyRecord)
def get_last_record(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Get the most recent record to find the previous accumulated total
    last_record = db.query(models.DailyRecord).order_by(models.DailyRecord.id.desc()).first()
    if not last_record:
        # Return a dummy record if no history exists
        return models.DailyRecord(
            id=0, date="", total_accumulated_prev=0, total_accumulated_today=0, rides_today=0,
            admin_rides=0, effective_rides=0, expected_income=0, cash_withdrawn=0,
            cash_in_box=0, card_payments=0, total_counted=0, status="", difference=0,
            daily_cash_generated=0, toys_sold_details="", toys_sold_total=0, submitted_by="",
            created_at=datetime.utcnow()
        )
    return last_record

@app.post("/records/", response_model=schemas.DailyRecord)
def create_daily_record(record: schemas.DailyRecordCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_record = models.DailyRecord(**record.dict(), submitted_by=current_user.username)
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

@app.get("/records/", response_model=List[schemas.DailyRecord])
def read_records(skip: int = 0, limit: int = 100, date: str = None, month: str = None, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    query = db.query(models.DailyRecord)
    if date:
        query = query.filter(models.DailyRecord.date == date)
    if month:
        # month format YYYY-MM
        query = query.filter(models.DailyRecord.date.like(f"{month}%"))
    records = query.order_by(models.DailyRecord.date.desc()).offset(skip).limit(limit).all()
    return records

@app.put("/records/{record_id}", response_model=schemas.DailyRecord)
def update_record(record_id: int, record: schemas.DailyRecordCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_admin)):
    db_record = db.query(models.DailyRecord).filter(models.DailyRecord.id == record_id).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    for key, value in record.dict().items():
        setattr(db_record, key, value)
    
    db.commit()
    db.refresh(db_record)
    return db_record

@app.delete("/records/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_admin)):
    db_record = db.query(models.DailyRecord).filter(models.DailyRecord.id == record_id).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    db.delete(db_record)
    db.commit()
    return {"ok": True}

# --- Init Script ---
@app.on_event("startup")
def startup_event():
    db = database.SessionLocal()
    # Create default admin if not exists
    user = db.query(models.User).filter(models.User.username == "admin").first()
    if not user:
        hashed_password = auth.get_password_hash("admin123") # Default password
        db_user = models.User(username="admin", hashed_password=hashed_password, role="admin")
        db.add(db_user)
        db.commit()
        print("Created default admin user: admin / admin123")
    db.close()

# User Management Endpoints
@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_admin)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password, role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_admin)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"ok": True}

@app.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_admin)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_update.username:
        # Check uniqueness if username is changing
        if user_update.username != db_user.username:
            existing_user = db.query(models.User).filter(models.User.username == user_update.username).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="Username already registered")
        db_user.username = user_update.username
    
    if user_update.password:
        db_user.hashed_password = auth.get_password_hash(user_update.password)
    
    if user_update.role:
        db_user.role = user_update.role
        
    db.commit()
    db.refresh(db_user)
    return db_user

# Schedule Management Endpoints
@app.post("/schedules/", response_model=schemas.Schedule)
def create_schedule(schedule: schemas.ScheduleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create schedule for the user specified in the request (we need to add user_id to ScheduleCreate or handle it here)
    # Wait, ScheduleCreate doesn't have user_id. Let's assume we pass user_id in the URL or body.
    # Actually, let's update ScheduleCreate to include user_id or pass it separately.
    # For simplicity, let's assume the frontend sends user_id in the body, but ScheduleCreate needs it.
    # I will modify ScheduleCreate in schemas.py later if needed, but for now let's assume we need a separate schema or just accept it.
    # Let's fix this: I'll update the endpoint to accept user_id as a query param or part of the body.
    # Better: Update ScheduleCreate to include user_id.
    pass 

# RE-WRITING THE ENDPOINT TO BE CORRECT
@app.post("/users/{user_id}/schedules/", response_model=schemas.Schedule)
def create_user_schedule(user_id: int, schedule: schemas.ScheduleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_schedule = models.Schedule(**schedule.dict(), user_id=user_id)
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

@app.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    schedule = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(schedule)
    db.commit()
    return {"ok": True}
