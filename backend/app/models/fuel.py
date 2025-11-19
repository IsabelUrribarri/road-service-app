from pydantic import BaseModel
from typing import Optional
from datetime import date

class FuelRecord(BaseModel):
    id: str
    vehicle_id: str
    date: str
    fuel_amount: float
    fuel_price: float
    total_cost: float
    miles_driven: float
    consumption: float
    created_at: Optional[str] = None

class FuelRecordCreate(BaseModel):
    vehicle_id: str
    date: str
    fuel_amount: float
    fuel_price: float
    miles_driven: float

class FuelRecordUpdate(BaseModel):
    date: Optional[str] = None
    fuel_amount: Optional[float] = None
    fuel_price: Optional[float] = None
    miles_driven: Optional[float] = None