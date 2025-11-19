# backend/models/invitation.py
from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum
from datetime import datetime

class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class UserInvitationCreate(BaseModel):
    email: EmailStr
    name: str
    role: str  # "worker" o "company_admin"
    company_id: str

class UserInvitationResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    company_id: str
    invited_by: str
    status: InvitationStatus
    created_at: str
    expires_at: str
    accepted_at: Optional[str] = None
    user_id: Optional[str] = None

    class Config:
        from_attributes = True