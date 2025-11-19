from pydantic import BaseModel
from typing import Optional

class Vehicle(BaseModel):
    id: str
    unit_id: str
    mechanic_name: str
    model: str
    total_miles: float
    status: str
    created_at: Optional[str] = None

class VehicleCreate(BaseModel):
    unit_id: str
    mechanic_name: str
    model: str
    total_miles: float = 0
    status: str = "active"

class VehicleUpdate(BaseModel):
    unit_id: Optional[str] = None
    mechanic_name: Optional[str] = None
    model: Optional[str] = None
    total_miles: Optional[float] = None
    status: Optional[str] = None