from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

class CompanyStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    TRIAL = "trial"

class CompanyBase(BaseModel):
    name: str
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    status: CompanyStatus = CompanyStatus.ACTIVE

class CompanyCreate(CompanyBase):
    # ✅ created_by se asigna automáticamente en el backend, no viene del frontend
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    status: Optional[CompanyStatus] = None

class CompanyResponse(CompanyBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime]
    created_by: Optional[str] = None
    
    class Config:
        from_attributes = True

# Modelo para estadísticas de empresa
class CompanyStats(BaseModel):
    company_id: str
    total_users: int
    total_vehicles: int
    total_fuel_records: int
    total_maintenance: int
    active_users: int
    created_at: datetime

# Modelo para respuesta con usuarios
class CompanyWithUsers(CompanyResponse):
    users: List[dict] = []  # Lista de usuarios de la empresa