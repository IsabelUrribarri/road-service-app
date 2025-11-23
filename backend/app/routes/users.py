# backend/app/routes/users.py
from fastapi import APIRouter, HTTPException, Depends
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
# RUTAS CORREGIDAS - TODAS USAN .execute() CONSISTENTEMENTE
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
            result = db.table("users").select("*").execute()
        else:
            # Company admin solo ve usuarios de su empresa
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
    user_data: UserInvite,
    admin: dict = Depends(can_manage_users)
):
    """
    Invitar un nuevo usuario a la empresa (Company Admin y Super Admin)
    """
    try:
        db = get_db()
        
        print(f"🔍 Debug - Datos recibidos: {user_data}")
        print(f"🔍 Debug - Admin: {admin}")
        
        # Si el admin es company_admin, usar su company_id
        if admin.get("role") == "company_admin":
            user_data.company_id = admin["company_id"]
            print(f"🔍 Debug - Usando company_id del admin: {user_data.company_id}")
        
        # Verificar que la empresa existe
        print(f"🔍 Debug - Verificando compañía: {user_data.company_id}")
        company_check = db.table("companies").select("*").eq("id", user_data.company_id).execute()
        print(f"🔍 Debug - Resultado compañía: {company_check.data}")
        
        if not company_check.data:
            # Si la compañía no existe, crear una por defecto para super_admin
            if admin.get("role") == "super_admin":
                print("🔍 Debug - Super admin, creando compañía por defecto")
                # Crear compañía por defecto
                default_company = {
                    "id": user_data.company_id if user_data.company_id else str(uuid.uuid4()),
                    "name": "Empresa Principal",
                    "created_by": admin["user_id"],
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                # ✅ CORREGIDO: Usar .execute() para INSERT también
                company_result = db.table("companies").insert(default_company).execute()
                print(f"🔍 Debug - Compañía creada: {company_result.data}")
            else:
                raise HTTPException(status_code=400, detail="Company not found")
        
        # Verificar si el usuario ya existe
        existing_user = db.table("users").select("*").eq("email", user_data.email).execute()
        if existing_user.data:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
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
        
        print(f"🔍 Debug - Creando usuario: {user}")
        # ✅ CORREGIDO: Usar .execute() para INSERT
        result = db.table("users").insert(user).execute()
        print(f"🔍 Debug - Resultado creación usuario: {result.data}")
        print(f"🔍 Debug - Error creación usuario: {result.error}")
        
        if result.data:
            return {
                "message": "User invited successfully",
                "user": UserResponse(**result.data[0]),
                "temp_password": temp_password,
                "instructions": "User must reset password on first login"
            }
        else:
            error_msg = result.error.message if result.error else "Unknown error"
            raise HTTPException(status_code=400, detail=f"Error inviting user: {error_msg}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en invite_user: {e}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
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
        print(f"❌ Error en get_user: {e}")
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
        
        print(f"🔍 Debug update_user - User ID: {user_id}")
        print(f"🔍 Debug update_user - Datos recibidos: {user_data}")
        print(f"🔍 Debug update_user - Admin: {admin}")
        
        # Obtener usuario actual
        current_user_result = db.table("users").select("*").eq("id", user_id).execute()
        if not current_user_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        current_user = current_user_result.data[0]
        print(f"🔍 Debug update_user - Usuario actual: {current_user}")
        
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
        
        update_data = user_data.dict(exclude_unset=True, exclude_none=True)
        update_data["updated_at"] = datetime.now().isoformat()
        
        print(f"🔍 Debug update_user - Datos a actualizar: {update_data}")
        
        # ✅ CORREGIDO: Usar la sintaxis correcta de Supabase
        result = db.table("users").update(update_data).eq("id", user_id).execute()
        
        print(f"🔍 Debug update_user - Resultado: {result.data}")
        print(f"🔍 Debug update_user - Error: {result.error}")
        
        if result.data:
            return UserResponse(**result.data[0])
        else:
            error_msg = result.error.message if hasattr(result.error, 'message') else str(result.error)
            raise HTTPException(status_code=400, detail=f"Error updating user: {error_msg}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en update_user: {e}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
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
        
        # ✅ CORREGIDO: Sintaxis correcta para DELETE
        result = db.table("users").delete().eq("id", user_id).execute()
        
        if result.data is not None:
            return {"message": "User deleted successfully"}
        else:
            error_msg = result.error.message if hasattr(result.error, 'message') else str(result.error)
            raise HTTPException(status_code=400, detail=f"Error deleting user: {error_msg}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en delete_user: {e}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))