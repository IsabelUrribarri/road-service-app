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
    created_by: str  # user_id del super_admin que crea la empresa

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    status: Optional[CompanyStatus] = None

class CompanyResponse(CompanyBase):
    id: str
    created_at: str
    updated_at: Optional[str]
    created_by: str
    
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
    created_at: str

# Modelo para respuesta con usuarios
class CompanyWithUsers(CompanyResponse):
    users: List[dict] = []  # Lista de usuarios de la empresa