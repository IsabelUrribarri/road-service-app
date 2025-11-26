from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MaintenanceBase(BaseModel):
    vehicle_id: str
    date: str
    maintenance_type: str  # ← CAMBIADO: De service_type a maintenance_type
    description: str
    cost: float
    next_maintenance_date: str  # ← CAMBIADO: De next_service_date
    company_id: str  # ← NUEVO: Para filtrado por compañía

class MaintenanceCreate(MaintenanceBase):
    pass

class MaintenanceUpdate(BaseModel):
    date: Optional[str] = None
    maintenance_type: Optional[str] = None  # ← CAMBIADO
    description: Optional[str] = None
    cost: Optional[float] = None
    next_maintenance_date: Optional[str] = None  # ← CAMBIADO
    # company_id no se puede actualizar

class Maintenance(MaintenanceBase):
    id: str
    status: str = "pending"  # ← NUEVO: pending, completed, cancelled
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True