# backend/app/routes/users.py
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Optional
from ..models.user import UserResponse, UserUpdate, UserRole, UserStatus, UserInvite
from ..models.database import get_db
from ..auth.jwt_handler import get_current_user, can_manage_users, require_super_admin, require_company_admin
import uuid
from datetime import datetime
import secrets
import hashlib


router = APIRouter(prefix="/users", tags=["users"])

def hash_password(password: str) -> str:
    """Hash seguro para producción usando salt y múltiples iteraciones"""
    salt = secrets.token_hex(16)
    hashed_password = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000  # 100,000 iteraciones para mayor seguridad
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
# RUTAS OPTIMIZADAS Y SEGURAS
# =============================================================================

@router.get("/", response_model=List[UserResponse])
async def get_company_users(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    admin: dict = Depends(can_manage_users)
):
    """
    Obtener todos los usuarios de la empresa (Company Admin y Super Admin)
    """
    try:
        db = get_db()
        
        # 🔐 SEGURIDAD: Si es super_admin, puede ver todos los usuarios
        if admin.get("role") == "super_admin":
            result = db.table("users").select("*").execute()
        else:
            # 🔐 SEGURIDAD: Company admin solo ve usuarios de su empresa
            result = db.table("users").select("*").eq("company_id", admin["company_id"]).execute()
        
        # Ordenar manualmente y aplicar paginación
        users = result.data
        if users:
            users.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            paginated_users = users[skip:skip + limit]
            return paginated_users
        return []
        
    except Exception as e:
        print(f"❌ Error en get_company_users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invite", response_model=dict)
async def invite_user(
    request: Request,
    user_data: UserInvite,
    admin: dict = Depends(can_manage_users)
):
    """
    Invitar un nuevo usuario a la empresa (Company Admin y Super Admin)
    """
    try:
        # 🔍 DEBUG CRÍTICO - Verificar exactamente qué está pasando
        print(f"🔍 [RLS FINAL DEBUG] Admin claims: {admin}")
        print(f"🔍 [RLS FINAL DEBUG] Role: {admin.get('role')}")
        print(f"🔍 [RLS FINAL DEBUG] Company ID: {admin.get('company_id')}")
        print(f"🔍 [RLS FINAL DEBUG] User ID: {admin.get('user_id')}")
        
        db = get_db()
        
        # 🔍 DEBUG: Verificar datos que se enviarán a la BD
        print(f"🔍 [RLS FINAL DEBUG] User data to insert: {user_data}")
        
        # Resto del código de creación de usuario...
        temp_password = secrets.token_urlsafe(16)
        
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
            "password_reset_required": True,
            "last_login": None,
            "updated_at": datetime.now().isoformat()
        }
        
        print(f"🔍 [RLS FINAL DEBUG] Final user object: {user}")
        
        # 🔍 DEBUG: Ejecutar INSERT con logging completo
        print("🔍 [RLS FINAL DEBUG] Executing INSERT...")
        result = db.table("users").insert(user).execute()
        
        print(f"🔍 [RLS FINAL DEBUG] Insert result: {result.data}")
        print(f"🔍 [RLS FINAL DEBUG] Insert error: {result.error}")
        
        if result.data:
            print(f"✅ [SECURITY] Usuario creado exitosamente: {user_data.email}")
            return {
                "message": "User invited successfully",
                "user": UserResponse(**result.data[0]),
                "temp_password": temp_password,
                "instructions": "User must reset password on first login"
            }
        else:
            # Manejo detallado de errores
            error_msg = str(result.error) if hasattr(result, 'error') and result.error else "Unknown database error"
            print(f"❌ [RLS FINAL DEBUG] Database error: {error_msg}")
            
            raise HTTPException(status_code=400, detail=f"Error inviting user: {error_msg}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [RLS FINAL DEBUG] Critical error: {e}")
        import traceback
        print(f"❌ [RLS FINAL DEBUG] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal server error during user invitation")


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    request: Request,
    user_id: str,
    admin: dict = Depends(can_manage_users)
):
    """
    Obtener un usuario específico (Company Admin y Super Admin)
    CON VALIDACIÓN DE PERMISOS
    """
    try:
        db = get_db()
        
        # Obtener usuario
        user_result = db.table("users").select("*").eq("id", user_id).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = user_result.data[0]
        
        # 🔐 VALIDACIÓN DE SEGURIDAD: Company admin solo puede ver usuarios de su empresa
        if admin.get("role") == "company_admin" and user.get("company_id") != admin["company_id"]:
            raise HTTPException(
                status_code=403, 
                detail="Cannot access user from other company"
            )
        
        return UserResponse(**user)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en get_user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    request: Request,
    user_id: str,
    user_data: UserUpdate,
    admin: dict = Depends(can_manage_users)
):
    """
    Actualizar un usuario (Company Admin y Super Admin)
    CON VALIDACIONES DE SEGURIDAD COMPLETAS
    """
    try:
        db = get_db()
        
        print(f"🔍 [SECURITY] Update user iniciado por: {admin.get('email')}")
        print(f"🔍 [SECURITY] User ID: {user_id}")
        
        # Obtener usuario actual
        current_user_result = db.table("users").select("*").eq("id", user_id).execute()
        if not current_user_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        current_user = current_user_result.data[0]
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 1: Company admin solo puede modificar usuarios de su empresa
        if admin.get("role") == "company_admin":
            if current_user.get("company_id") != admin["company_id"]:
                raise HTTPException(
                    status_code=403, 
                    detail="Cannot modify user from other company"
                )
            
            # 🔐 VALIDACIÓN DE SEGURIDAD 2: Company admin no puede modificar roles a super_admin
            if user_data.role and user_data.role == UserRole.SUPER_ADMIN:
                raise HTTPException(
                    status_code=403, 
                    detail="Cannot assign super_admin role"
                )
            
            # 🔐 VALIDACIÓN DE SEGURIDAD 3: Company admin no puede modificar company_id
            if user_data.company_id and user_data.company_id != admin["company_id"]:
                raise HTTPException(
                    status_code=403, 
                    detail="Cannot change user company"
                )
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 4: Nadie puede desactivarse a sí mismo
        if (user_data.status and user_data.status == UserStatus.INACTIVE and 
            user_id == admin["user_id"]):
            raise HTTPException(
                status_code=400, 
                detail="Cannot deactivate your own account"
            )
        
        update_data = user_data.dict(exclude_unset=True, exclude_none=True)
        update_data["updated_at"] = datetime.now().isoformat()
        
        print(f"🔍 [SECURITY] Datos a actualizar: {update_data}")
        
        result = db.table("users").update(update_data).eq("id", user_id).execute()
        
        if result.data:
            print(f"✅ [SECURITY] Usuario actualizado exitosamente: {user_id}")
            return UserResponse(**result.data[0])
        else:
            # Manejo profesional de errores
            error_msg = str(result.error) if hasattr(result, 'error') and result.error else "Unknown error"
            raise HTTPException(status_code=400, detail=f"Error updating user: {error_msg}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [SECURITY] Error crítico en update_user: {e}")
        import traceback
        print(f"❌ [SECURITY] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal server error during user update")

@router.delete("/{user_id}")
async def delete_user(
    request: Request,
    user_id: str,
    admin: dict = Depends(can_manage_users)
):
    """
    Eliminar un usuario (Company Admin y Super Admin)
    CON VALIDACIONES DE SEGURIDAD AVANZADAS
    """
    try:
        db = get_db()
        
        print(f"🔍 [SECURITY] Delete user iniciado por: {admin.get('email')}")
        
        # Obtener usuario
        user_result = db.table("users").select("*").eq("id", user_id).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = user_result.data[0]
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 1: Company admin solo puede eliminar usuarios de su empresa
        if admin.get("role") == "company_admin":
            if user.get("company_id") != admin["company_id"]:
                raise HTTPException(
                    status_code=403, 
                    detail="Cannot delete user from other company"
                )
            
            # 🔐 VALIDACIÓN DE SEGURIDAD 2: Company admin no puede eliminarse a sí mismo
            if user_id == admin["user_id"]:
                raise HTTPException(
                    status_code=400, 
                    detail="Cannot delete your own account"
                )
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 3: Super admin no puede eliminarse a sí mismo
        if admin.get("role") == "super_admin" and user_id == admin["user_id"]:
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete your own account"
            )
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 4: Company admin no puede eliminar super_admins
        if (admin.get("role") == "company_admin" and 
            user.get("role") == "super_admin"):
            raise HTTPException(
                status_code=403, 
                detail="Cannot delete super admin users"
            )
        
        result = db.table("users").delete().eq("id", user_id).execute()
        
        if result.data is not None:
            print(f"✅ [SECURITY] Usuario eliminado exitosamente: {user_id}")
            return {"message": "User deleted successfully"}
        else:
            # Manejo profesional de errores
            error_msg = str(result.error) if hasattr(result, 'error') and result.error else "Unknown error"
            raise HTTPException(status_code=400, detail=f"Error deleting user: {error_msg}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [SECURITY] Error crítico en delete_user: {e}")
        import traceback
        print(f"❌ [SECURITY] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal server error during user deletion")

@router.get("/debug-rls")
async def debug_rls_policies(request: Request, admin: dict = Depends(get_current_user)):  # ← Cambiar a get_current_user
    """
    Endpoint temporal para debuggear políticas RLS
    """
    try:
        db = get_db()
        
        # Solo super_admin puede usar este endpoint
        if admin.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Super admin required")
        
        # Ejecutar función de debug en Supabase
        result = db.rpc('debug_rls_policies', {}).execute()
        
        print(f"🔍 [RLS DEBUG] Resultado del diagnóstico: {result.data}")
        
        return {
            "debug_info": result.data,
            "jwt_claims": admin,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ [RLS DEBUG] Error en diagnóstico: {e}")
        raise HTTPException(status_code=500, detail=str(e))