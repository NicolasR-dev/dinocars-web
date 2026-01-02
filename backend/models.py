from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Date
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="worker") # admin, manager, worker
    
    schedules = relationship("Schedule", back_populates="user")

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date) # Specific date instead of day_of_week
    start_time = Column(String) # HH:MM
    end_time = Column(String) # HH:MM

    user = relationship("User", back_populates="schedules")

class DailyRecord(Base):
    __tablename__ = "daily_records"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, index=True)  # YYYY-MM-DD
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Data from "Calcular Vueltas"
    total_accumulated_prev = Column(Integer)
    total_accumulated_today = Column(Integer)
    rides_today = Column(Integer)
    
    # Data from "Cuadrar Caja"
    admin_rides = Column(Integer)
    effective_rides = Column(Integer)
    expected_income = Column(Float)
    cash_withdrawn = Column(Float)
    cash_in_box = Column(Float)
    card_payments = Column(Float)
    total_counted = Column(Float)
    
    status = Column(String)  # CUADRA, EXCEDENTE, FALTANTE
    difference = Column(Float)
    daily_cash_generated = Column(Float)
    toys_sold_details = Column(String)  # JSON or text description
    toys_sold_total = Column(Float)
    
    worker_name = Column(String, nullable=True) # Nicolas, Catalina, Josefa, Otro
    submitted_by = Column(String)
