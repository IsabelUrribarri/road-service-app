from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FuelRecordBase(BaseModel):
    vehicle_id: str
    date: str
    fuel_amount: float
    fuel_price: float
    miles_driven: float
    company_id: str  # ← NUEVO: Para filtrado por compañía

class FuelRecordCreate(FuelRecordBase):
    # Los campos calculados se generan automáticamente
    pass

class FuelRecordUpdate(BaseModel):
    date: Optional[str] = None
    fuel_amount: Optional[float] = None
    fuel_price: Optional[float] = None
    miles_driven: Optional[float] = None
    # company_id no se puede actualizar

class FuelRecord(FuelRecordBase):
    id: str
    consumption: float  # Calculado: miles_driven / fuel_amount
    total_cost: float   # Calculado: fuel_amount * fuel_price
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True