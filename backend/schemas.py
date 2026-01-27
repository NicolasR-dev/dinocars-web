from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

class ScheduleBase(BaseModel):
    date: date
    start_time: str
    end_time: str

class ScheduleCreate(ScheduleBase):
    pass

class Schedule(ScheduleBase):
    id: int
    user_id: int
    class Config:
        orm_mode = True

class UserBase(BaseModel):
    username: str
    role: str = "worker"
    default_start_time: Optional[str] = None
    default_end_time: Optional[str] = None
    opening_start_time: Optional[str] = None
    opening_end_time: Optional[str] = None
    closing_start_time: Optional[str] = None
    closing_end_time: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    default_start_time: Optional[str] = None
    default_end_time: Optional[str] = None
    opening_start_time: Optional[str] = None
    opening_end_time: Optional[str] = None
    closing_start_time: Optional[str] = None
    closing_end_time: Optional[str] = None

class User(UserBase):
    id: int
    schedules: List[Schedule] = []
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class DailyRecordBase(BaseModel):
    date: str
    total_accumulated_prev: int
    total_accumulated_today: int
    rides_today: int
    admin_rides: int
    effective_rides: int
    expected_income: float
    cash_withdrawn: float
    cash_in_box: float
    card_payments: float
    total_counted: float
    status: str
    difference: float
    daily_cash_generated: float
    toys_sold_details: Optional[str] = ""
    toys_sold_total: float
    worker_name: Optional[str] = None

class DailyRecordCreate(DailyRecordBase):
    pass

class DailyRecord(DailyRecordBase):
    id: int
    created_at: datetime
    submitted_by: str

    class Config:
        orm_mode = True

class VueltasCalculationRequest(BaseModel):
    dino_counts: List[int] # List of 6 integers
    total_accumulated_prev: int

class VueltasCalculationResponse(BaseModel):
    total_today: int
    rides_today: int

# Dashboard Schemas
class DailyStats(BaseModel):
    date: str
    total_income: float
    total_rides: int

class DashboardStats(BaseModel):
    total_revenue: float
    total_rides: int
    records_count: int
    average_daily_income: float
    daily_stats: List[DailyStats]
