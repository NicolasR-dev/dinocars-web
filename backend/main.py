from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import os
from datetime import timedelta, datetime

from . import models, schemas, database, auth

# Create tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="DinoCars API")

# Auto-Seed Admin on Startup (for ephemeral DBs like Render SQLite)
@app.on_event("startup")
def startup_event():
    db = database.SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(models.User).filter(models.User.role == "admin").first()
        if not admin:
            print("WARNING: No admin found. Seeding default admin user.")
            hashed_pw = auth.get_password_hash("admin123") # Default password
            admin_user = models.User(
                username="admin", 
                hashed_password=hashed_pw, 
                role="admin",
                default_start_time="09:00",
                default_end_time="18:00"
            )
            db.add(admin_user)
            db.commit()
            print("Admin user seeded successfully.")
    except Exception as e:
        print(f"Error seeding admin: {e}")
    finally:
        db.close()

# CORS
origins = [
    "http://localhost:3000",
    "https://dinocars-web.vercel.app",
    "https://dinocars-web.onrender.com"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    print(f"LOGIN ATTEMPT: {form_data.username}")
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user:
        print(f"LOGIN FAILED: User {form_data.username} not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not auth.verify_password(form_data.password, user.hashed_password):
        print(f"LOGIN FAILED: Password mismatch for {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    print(f"LOGIN SUCCESS: {form_data.username}")
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
    
    # Keep Alive Mechanism
    import threading
    import time
    import requests
    
    def keep_alive():
        url = os.getenv("BACKEND_URL")
        if url:
            print(f"Starting keep-alive for {url}")
            while True:
                try:
                    time.sleep(14 * 60) # 14 minutes
                    print(f"Pinging {url} to keep alive...")
                    requests.get(f"{url}/health")
                except Exception as e:
                    print(f"Keep-alive ping failed: {e}")
        else:
            print("No BACKEND_URL set, skipping keep-alive.")

    threading.Thread(target=keep_alive, daemon=True).start()


@app.get("/admin/dashboard-stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_admin)):
    try:
        records = db.query(models.DailyRecord).order_by(models.DailyRecord.date.asc()).all()
        
        total_revenue = 0.0
        total_rides = 0
        records_count = len(records)
        daily_stats = []
        
        # New Aggregations
        sales_by_weekday = {day: 0.0 for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]}
        worker_stats = {} # { name: { rides: 0, revenue: 0 } }

        for record in records:
            income = record.daily_cash_generated or 0.0
            rides = record.effective_rides or 0
            
            total_revenue += income
            total_rides += rides
            
            # Weekday Analysis
            try:
                # record.date is String "YYYY-MM-DD" in DailyRecord
                if record.date:
                    date_obj = datetime.strptime(record.date, "%Y-%m-%d")
                    day_name = date_obj.strftime("%A")
                    if day_name in sales_by_weekday:
                        sales_by_weekday[day_name] += income
            except Exception as e:
                print(f"Error parsing date for record {record.id}: {e}")
                pass
                
            # Worker Analysis
            if record.worker_name:
                w_name = record.worker_name.strip()
                if w_name:
                    if w_name not in worker_stats:
                        worker_stats[w_name] = {"rides": 0, "revenue": 0}
                    worker_stats[w_name]["rides"] += rides
                    worker_stats[w_name]["revenue"] += income

        average_daily_income = total_revenue / records_count if records_count > 0 else 0
        
        recent_records = records[-30:] if records_count > 30 else records
        for record in recent_records:
            daily_stats.append(schemas.DailyStats(
                date=record.date or "Unknown",
                total_income=record.daily_cash_generated or 0.0,
                total_rides=record.effective_rides or 0
            ))
        
        # Format Response Lists
        sales_by_weekday_list = [{"day": k, "amount": v} for k, v in sales_by_weekday.items()]
        
        top_workers_list = [
            {"name": k, "total_rides": v["rides"], "total_generated": v["revenue"]} 
            for k, v in worker_stats.items()
        ]
        top_workers_list.sort(key=lambda x: x["total_generated"], reverse=True)

        return {
            "total_revenue": total_revenue,
            "total_rides": total_rides,
            "records_count": records_count,
            "average_daily_income": average_daily_income,
            "daily_stats": daily_stats,
            "sales_by_weekday": sales_by_weekday_list,
            "top_workers": top_workers_list
        }
    except Exception as e:
        print(f"CRITICAL ERROR in dashboard_stats: {e}")
        # Return empty safe response instead of 500
        return {
            "total_revenue": 0, "total_rides": 0, "records_count": 0, "average_daily_income": 0,
            "daily_stats": [], "sales_by_weekday": [], "top_workers": []
        }

@app.post("/schedules/bulk")
def create_bulk_schedule(bulk_data: schemas.BulkScheduleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_admin)):
    try:
        start_date = datetime.strptime(bulk_data.start_date, "%Y-%m-%d").date()
        end_date = datetime.strptime(bulk_data.end_date, "%Y-%m-%d").date()
        
        current_date_iter = start_date
        created_count = 0
        
        while current_date_iter <= end_date:
            # Check if current day of week (0=Monday, 6=Sunday) is in selected days
            if current_date_iter.weekday() in bulk_data.days_of_week:
                # Check if schedule already exists for this user and date
                # Important: models.Schedule.date is a Date column, so we compare with date object
                existing = db.query(models.Schedule).filter(
                    models.Schedule.user_id == bulk_data.user_id,
                    models.Schedule.date == current_date_iter
                ).first()
                
                if not existing:
                    new_schedule = models.Schedule(
                        user_id=bulk_data.user_id,
                        date=current_date_iter,  # Pass date object
                        start_time=bulk_data.start_time,
                        end_time=bulk_data.end_time
                    )
                    db.add(new_schedule)
                    created_count += 1
            
            current_date_iter += timedelta(days=1)
            
        db.commit()
        return {"message": f"Successfully created {created_count} schedules", "count": created_count}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
    except Exception as e:
        print(f"Error in bulk schedule: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok"}

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
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
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
    
    # Update fields based on what was sent
    update_data = user_update.dict(exclude_unset=True)
    
    # Handle specific fields that need logic
    if "password" in update_data and update_data["password"]:
        db_user.hashed_password = auth.get_password_hash(update_data["password"])
        del update_data["password"] # Don't update directly
    
    if "username" in update_data:
        if update_data["username"] != db_user.username:
            existing_user = db.query(models.User).filter(models.User.username == update_data["username"]).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="Username already registered")
        db_user.username = update_data["username"]
        del update_data["username"]

    # Update remaining fields (role, schedule times, etc.)
    for key, value in update_data.items():
        if hasattr(db_user, key):
            setattr(db_user, key, value)
        
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/admin/migrate-db")
def migrate_db(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_admin)):
    from sqlalchemy import text
    try:
        # Attempt to add columns if they don't exist
        # We use a try-except block for each column to avoid errors if some already exist
        columns = [
            "default_start_time VARCHAR",
            "default_end_time VARCHAR",
            "opening_start_time VARCHAR",
            "opening_end_time VARCHAR",
            "closing_start_time VARCHAR",
            "closing_end_time VARCHAR"
        ]
        
        results = []
        for col in columns:
            try:
                db.execute(text(f"ALTER TABLE users ADD COLUMN {col}"))
                results.append(f"Added {col}")
            except Exception as e:
                results.append(f"Skipped {col} (might exist)")
        
        db.commit()
        return {"status": "success", "details": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

@app.get("/debug-token")
def debug_token(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return {"status": "error", "message": "No Authorization header found"}
    
    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            return {"status": "error", "message": "Scheme is not Bearer"}
            
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username = payload.get("sub")
        role = payload.get("role")
        exp = payload.get("exp")
        
        user = db.query(models.User).filter(models.User.username == username).first()
        user_found = user is not None
        
        return {
            "status": "ok",
            "decoded_username": username,
            "decoded_role": role,
            "token_exp": datetime.fromtimestamp(exp) if exp else None,
            "server_time": datetime.utcnow(),
            "user_found_in_db": user_found,
            "user_role_in_db": user.role if user else None
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "type": str(type(e))}
