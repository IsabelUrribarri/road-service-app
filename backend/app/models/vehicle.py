from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class VehicleBase(BaseModel):
    unit_id: str
    mechanic_name: str
    model: str
    total_miles: float
    status: str
    company_id: str  # ← NUEVO: Para filtrado por compañía

class VehicleCreate(VehicleBase):
    total_miles: float = 0
    status: str = "active"

class VehicleUpdate(BaseModel):
    unit_id: Optional[str] = None
    mechanic_name: Optional[str] = None
    model: Optional[str] = None
    total_miles: Optional[float] = None
    status: Optional[str] = None
    # company_id no se puede actualizar

class Vehicle(VehicleBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True