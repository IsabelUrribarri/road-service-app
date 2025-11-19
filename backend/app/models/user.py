from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"
    MANAGER = "manager"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class UserBase(BaseModel):
    email: EmailStr
    name: str
    company_id: str
    role: UserRole = UserRole.USER
    status: UserStatus = UserStatus.ACTIVE

class UserCreate(UserBase):
    password: str  # Para futura implementación de auth con password
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    company_id: Optional[str] = "default"

class UserUpdate(BaseModel):
    name: Optional[str]
    role: Optional[UserRole]
    status: Optional[UserStatus]
    company_id: Optional[str]

class UserResponse(UserBase):
    id: str
    created_at: str
    last_login: Optional[str]
    
    class Config:
        from_attributes = True

class UserInDB(UserResponse):
    # Campos internos que no se exponen en las respuestas
    hashed_password: Optional[str] = None