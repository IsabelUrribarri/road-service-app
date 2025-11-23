from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    COMPANY_ADMIN = "company_admin"
    WORKER = "worker"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class UserBase(BaseModel):
    email: EmailStr
    name: str
    company_id: str
    role: UserRole = UserRole.WORKER
    status: UserStatus = UserStatus.ACTIVE

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

    @validator('role')
    def validate_role_assignment(cls, v, values):
        # Solo super_admin puede crear otros super_admins
        # En la práctica, esto se controlará en las rutas
        return v

class UserLogin(BaseModel):
    email: str  # ← Cambia EmailStr a str
    password: str
    company_id: Optional[str] = None

# En tu archivo de modelos (user.py)
class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    company_id: Optional[str] = None
    
    class Config:
        # Esto ayuda con la serialización de enums
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class UserResponse(UserBase):
    id: str
    created_at: str
    last_login: Optional[str]
    
    class Config:
        from_attributes = True

class UserInDB(UserResponse):
    hashed_password: Optional[str] = None

# Modelo para invitar usuarios
class UserInvite(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.WORKER
    company_id: str