# backend/app/routes/users.py
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from ..models.user import UserResponse, UserUpdate, UserRole, UserStatus, UserInvite
from ..models.database import get_db
from ..auth.jwt_handler import get_current_user, can_manage_users, require_super_admin, require_company_admin
from ..auth.jwt_handler import create_access_token  # ✅ Solo importar lo que existe en jwt_handler
import uuid
from datetime import datetime
import secrets
import hashlib  # ✅ Importar hashlib directamente

router = APIRouter(prefix="/users", tags=["users"])

# ✅ Mover las funciones de hash aquí o importarlas desde auth
def hash_password(password: str) -> str:
    """Hash seguro para producción"""
    salt = secrets.token_hex(16)
    hashed_password = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return f"{hashed_password}:{salt}"

def verify_password(password: str, hashed: str) -> bool:
    """Verifica password contra hash almacenado"""
    try:
        if not hashed or ":" not in hashed:
            return False
        hashed_password, salt = hashed.split(":")
        new_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        ).hex()
        return secrets.compare_digest(new_hash, hashed_password)
    except Exception:
        return False

# =============================================================================
# RUTAS DE GESTIÓN DE USUARIOS (Company Admin y Super Admin)
# =============================================================================

@router.get("/", response_model=List[UserResponse])
async def get_company_users(
    skip: int = 0,
    limit: int = 100,
    admin: dict = Depends(can_manage_users)
):
    """
    Obtener todos los usuarios de la empresa (Company Admin y Super Admin)
    """
    try:
        db = get_db()
        
        # Si es super_admin, puede ver todos los usuarios (sin company_id filter)
        if admin.get("role") == "super_admin":
            result = db.table("users").select("*").order("created_at", desc=True).range(skip, skip + limit).execute()
        else:
            # Company admin solo ve usuarios de su empresa
            result = db.table("users").select("*").eq("company_id", admin["company_id"]).order("created_at", desc=True).range(skip, skip + limit).execute()
        
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invite", response_model=dict)
async def invite_user(
    user_data: UserInvite,
    admin: dict = Depends(can_manage_users)
):
    """
    Invitar un nuevo usuario a la empresa (Company Admin y Super Admin)
    """
    try:
        db = get_db()
        
        # Verificar permisos de company_id
        if admin.get("role") == "company_admin" and user_data.company_id != admin["company_id"]:
            raise HTTPException(
                status_code=403, 
                detail="Cannot invite users to other companies"
            )
        
        # Verificar si el usuario ya existe
        existing_user = db.table("users").select("*").eq("email", user_data.email).execute()
        if existing_user.data:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Verificar que la empresa existe
        company_check = db.table("companies").select("id").eq("id", user_data.company_id).execute()
        if not company_check.data:
            raise HTTPException(status_code=400, detail="Company not found")
        
        # Generar password temporal
        temp_password = secrets.token_urlsafe(12)
        
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "company_id": user_data.company_id,
            "role": user_data.role.value,
            "status": "active",
            "hashed_password": hash_password(temp_password),
            "created_at": datetime.now().isoformat(),
            "created_by": admin["user_id"],
            "is_invited": True,
            "password_reset_required": True
        }
        
        result = db.table("users").insert(user).execute()
        
        if result.data:
            # En producción: enviar email con invitación y temp_password
            # Por ahora retornamos el password temporal (solo en desarrollo)
            return {
                "message": "User invited successfully",
                "user": UserResponse(**result.data[0]),
                "temp_password": temp_password,  # Solo en desarrollo - eliminar en producción
                "instructions": "User must reset password on first login"
            }
        else:
            raise HTTPException(status_code=400, detail="Error inviting user")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    admin: dict = Depends(can_manage_users)
):
    """
    Obtener un usuario específico (Company Admin y Super Admin)
    """
    try:
        db = get_db()
        
        # Obtener usuario
        user_result = db.table("users").select("*").eq("id", user_id).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = user_result.data[0]
        
        # Verificar permisos (company_admin solo puede ver usuarios de su empresa)
        if admin.get("role") == "company_admin" and user.get("company_id") != admin["company_id"]:
            raise HTTPException(status_code=403, detail="Cannot access user from other company")
        
        return UserResponse(**user)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    admin: dict = Depends(can_manage_users)
):
    """
    Actualizar un usuario (Company Admin y Super Admin)
    """
    try:
        db = get_db()
        
        # Obtener usuario actual
        current_user_result = db.table("users").select("*").eq("id", user_id).execute()
        if not current_user_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        current_user = current_user_result.data[0]
        
        # Verificar permisos
        if admin.get("role") == "company_admin":
            # Company admin solo puede modificar usuarios de su empresa
            if current_user.get("company_id") != admin["company_id"]:
                raise HTTPException(status_code=403, detail="Cannot modify user from other company")
            
            # Company admin no puede modificar roles a super_admin
            if user_data.role and user_data.role == UserRole.SUPER_ADMIN:
                raise HTTPException(status_code=403, detail="Cannot assign super_admin role")
            
            # Company admin no puede modificar company_id
            if user_data.company_id and user_data.company_id != admin["company_id"]:
                raise HTTPException(status_code=403, detail="Cannot change user company")
        
        update_data = user_data.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.now().isoformat()
        
        result = db.table("users").update(update_data).eq("id", user_id).execute()
        
        if result.data:
            return UserResponse(**result.data[0])
        else:
            raise HTTPException(status_code=404, detail="User not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    admin: dict = Depends(can_manage_users)
):
    """
    Eliminar un usuario (Company Admin y Super Admin)
    """
    try:
        db = get_db()
        
        # Obtener usuario
        user_result = db.table("users").select("*").eq("id", user_id).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = user_result.data[0]
        
        # Verificar permisos
        if admin.get("role") == "company_admin":
            if user.get("company_id") != admin["company_id"]:
                raise HTTPException(status_code=403, detail="Cannot delete user from other company")
            
            # Company admin no puede eliminarse a sí mismo
            if user_id == admin["user_id"]:
                raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        # Super admin no puede eliminarse a sí mismo
        if admin.get("role") == "super_admin" and user_id == admin["user_id"]:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        result = db.table("users").delete().eq("id", user_id).execute()
        
        if result.data:
            return {"message": "User deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="User not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    admin: dict = Depends(can_manage_users)
):
    """
    Resetear password de un usuario (Company Admin y Super Admin)
    """
    try:
        db = get_db()
        
        # Obtener usuario
        user_result = db.table("users").select("*").eq("id", user_id).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = user_result.data[0]
        
        # Verificar permisos
        if admin.get("role") == "company_admin" and user.get("company_id") != admin["company_id"]:
            raise HTTPException(status_code=403, detail="Cannot reset password for user from other company")
        
        # Generar nuevo password temporal
        temp_password = secrets.token_urlsafe(12)
        
        update_result = db.table("users").update({
            "hashed_password": hash_password(temp_password),
            "password_reset_required": True,
            "updated_at": datetime.now().isoformat()
        }).eq("id", user_id).execute()
        
        if update_result.data:
            # En producción: enviar email con nuevo password
            return {
                "message": "Password reset successfully",
                "temp_password": temp_password,  # Solo en desarrollo
                "user_email": user["email"]
            }
        else:
            raise HTTPException(status_code=404, detail="User not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))