# backend/app/routes/invitations.py
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from ..models.invitation import UserInvitationCreate, UserInvitationResponse, InvitationStatus
from ..models.database import get_db
from ..auth.jwt_handler import get_current_user, can_manage_users
import uuid
from datetime import datetime, timedelta
import secrets

router = APIRouter(prefix="/invitations", tags=["invitations"])

@router.post("/", response_model=UserInvitationResponse)
async def create_invitation(
    invitation_data: UserInvitationCreate,
    admin: dict = Depends(can_manage_users)
):
    """
    Crear una invitación para un nuevo usuario (Company Admin y Super Admin)
    """
    try:
        db = get_db()
        
        # Verificar permisos de company_id
        if admin.get("role") == "company_admin" and invitation_data.company_id != admin["company_id"]:
            raise HTTPException(
                status_code=403, 
                detail="Cannot invite users to other companies"
            )
        
        # Verificar si el usuario ya existe
        existing_user = db.table("users").select("*").eq("email", invitation_data.email).execute()
        if existing_user.data:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Verificar si ya existe una invitación pendiente
        existing_invitation = db.table("user_invitations").select("*").eq("email", invitation_data.email).eq("status", "pending").execute()
        if existing_invitation.data:
            raise HTTPException(status_code=400, detail="Pending invitation already exists for this email")
        
        # Verificar que la empresa existe
        company_check = db.table("companies").select("id").eq("id", invitation_data.company_id).execute()
        if not company_check.data:
            raise HTTPException(status_code=400, detail="Company not found")
        
        # Crear invitación
        invitation_id = str(uuid.uuid4())
        invitation = {
            "id": invitation_id,
            "email": invitation_data.email,
            "name": invitation_data.name,
            "role": invitation_data.role,
            "company_id": invitation_data.company_id,
            "invited_by": admin["user_id"],
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "expires_at": (datetime.now() + timedelta(days=7)).isoformat(),  # 7 días para aceptar
            "token": secrets.token_urlsafe(32)  # Token único para la invitación
        }
        
        result = db.table("user_invitations").insert(invitation).execute()
        
        if result.data:
            # En producción: enviar email con enlace de invitación
            return UserInvitationResponse(**result.data[0])
        else:
            raise HTTPException(status_code=400, detail="Error creating invitation")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[UserInvitationResponse])
async def get_invitations(
    skip: int = 0,
    limit: int = 100,
    admin: dict = Depends(can_manage_users)
):
    """
    Obtener todas las invitaciones (Company Admin y Super Admin)
    """
    try:
        db = get_db()
        
        # Si es super_admin, puede ver todas las invitaciones
        if admin.get("role") == "super_admin":
            result = db.table("user_invitations").select("*").order("created_at", desc=True).range(skip, skip + limit).execute()
        else:
            # Company admin solo ve invitaciones de su empresa
            result = db.table("user_invitations").select("*").eq("company_id", admin["company_id"]).order("created_at", desc=True).range(skip, skip + limit).execute()
        
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{invitation_id}")
async def cancel_invitation(
    invitation_id: str,
    admin: dict = Depends(can_manage_users)
):
    """
    Cancelar una invitación (Company Admin y Super Admin)
    """
    try:
        db = get_db()
        
        # Obtener invitación
        invitation_result = db.table("user_invitations").select("*").eq("id", invitation_id).execute()
        if not invitation_result.data:
            raise HTTPException(status_code=404, detail="Invitation not found")
        
        invitation = invitation_result.data[0]
        
        # Verificar permisos
        if admin.get("role") == "company_admin" and invitation.get("company_id") != admin["company_id"]:
            raise HTTPException(status_code=403, detail="Cannot cancel invitation from other company")
        
        # Solo se pueden cancelar invitaciones pendientes
        if invitation.get("status") != "pending":
            raise HTTPException(status_code=400, detail="Can only cancel pending invitations")
        
        # Cancelar invitación
        result = db.table("user_invitations").update({
            "status": "cancelled",
            "cancelled_at": datetime.now().isoformat(),
            "cancelled_by": admin["user_id"]
        }).eq("id", invitation_id).execute()
        
        if result.data:
            return {"message": "Invitation cancelled successfully"}
        else:
            raise HTTPException(status_code=404, detail="Invitation not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))