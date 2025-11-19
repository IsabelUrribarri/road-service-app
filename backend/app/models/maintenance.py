from pydantic import BaseModel
from typing import Optional
from datetime import date

class Maintenance(BaseModel):
    id: str
    vehicle_id: str
    date: str
    service_type: str
    description: str
    cost: float
    next_service_date: str
    created_at: Optional[str] = None

class MaintenanceCreate(BaseModel):
    vehicle_id: str
    date: str
    service_type: str
    description: str
    cost: float
    next_service_date: str

class MaintenanceUpdate(BaseModel):
    date: Optional[str] = None
    service_type: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[float] = None
    next_service_date: Optional[str] = None