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
    CON AUTENTICACIÓN JWT PARA RLS
    """
    try:
        # 🔐 OBTENER JWT DEL REQUEST PARA RLS
        auth_header = request.headers.get("Authorization")
        user_jwt = auth_header.replace("Bearer ", "") if auth_header and auth_header.startswith("Bearer ") else None
        
        # 🔐 USAR CLIENTE AUTENTICADO SI HAY JWT, SINO CLIENTE BASE
        from ..models.database import get_authenticated_db, get_db
        db = get_authenticated_db(user_jwt) if user_jwt else get_db()
        
        print(f"🔍 [JWT DEBUG] Get users - Using {'JWT' if user_jwt else 'API Key'} authentication")
        
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
        # 🔐 OBTENER JWT DEL REQUEST PARA RLS
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Token missing for RLS")
        
        user_jwt = auth_header.replace("Bearer ", "")
        
        print(f"🔍 [JWT DEBUG] Using JWT for RLS: {user_jwt[:50]}...")
        print(f"🔍 [RLS DEBUG] Admin role: {admin.get('role')}")
        
        # 🔐 USAR CLIENTE AUTENTICADO CON JWT
        from ..models.database import get_authenticated_db
        db = get_authenticated_db(user_jwt)
        
        # Validaciones de seguridad
        if admin.get("role") == "company_admin" and user_data.role == UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Company admins cannot create super admin users")
        
        if admin.get("role") == "company_admin":
            user_data.company_id = admin["company_id"]
        
        # Verificar compañía existe
        company_check = db.table("companies").select("*").eq("id", user_data.company_id).execute()
        if not company_check.data:
            if admin.get("role") == "super_admin":
                # Crear compañía por defecto
                default_company = {
                    "id": user_data.company_id,
                    "name": "Empresa Principal", 
                    "created_by": admin["user_id"],
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                db.table("companies").insert(default_company).execute()
            else:
                raise HTTPException(status_code=400, detail="Company not found")
        
        # Verificar usuario no existe
        existing_user = db.table("users").select("*").eq("email", user_data.email).execute()
        if existing_user.data:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Crear usuario
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
        
        print(f"🔍 [RLS DEBUG] Inserting user with JWT authentication...")
        result = db.table("users").insert(user).execute()
        
        if result.data:
            print(f"✅ [SECURITY] Usuario creado exitosamente: {user_data.email}")
            return {
                "message": "User invited successfully",
                "user": UserResponse(**result.data[0]),
                "temp_password": temp_password,
                "instructions": "User must reset password on first login"
            }
        else:
            error_msg = str(result.error) if hasattr(result, 'error') and result.error else "Unknown error"
            print(f"❌ [RLS DEBUG] Database error: {error_msg}")
            
            # Manejo específico de errores RLS
            if "row-level security" in error_msg.lower():
                raise HTTPException(
                    status_code=403, 
                    detail="RLS policy violation. Please check user permissions."
                )
            raise HTTPException(status_code=400, detail=f"Error inviting user: {error_msg}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [RLS DEBUG] Critical error: {e}")
        import traceback
        print(f"❌ [RLS DEBUG] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal server error during user invitation")

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    request: Request,
    user_id: str,
    admin: dict = Depends(can_manage_users)
):
    """
    Obtener un usuario específico (Company Admin y Super Admin)
    CON AUTENTICACIÓN JWT PARA RLS Y VALIDACIÓN DE PERMISOS
    """
    try:
        # 🔐 OBTENER JWT DEL REQUEST PARA RLS
        auth_header = request.headers.get("Authorization")
        user_jwt = auth_header.replace("Bearer ", "") if auth_header and auth_header.startswith("Bearer ") else None
        
        # 🔐 USAR CLIENTE AUTENTICADO SI HAY JWT
        from ..models.database import get_authenticated_db, get_db
        db = get_authenticated_db(user_jwt) if user_jwt else get_db()
        
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
    CON AUTENTICACIÓN JWT PARA RLS Y VALIDACIONES DE SEGURIDAD
    """
    try:
        # 🔐 OBTENER JWT DEL REQUEST PARA RLS
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Token missing for RLS")
        
        user_jwt = auth_header.replace("Bearer ", "")
        
        print(f"🔍 [JWT DEBUG] Update user - Using JWT for RLS")
        print(f"🔍 [SECURITY] Update user iniciado por: {admin.get('email')}")
        print(f"🔍 [SECURITY] User ID: {user_id}")
        
        # 🔐 USAR CLIENTE AUTENTICADO CON JWT
        from ..models.database import get_authenticated_db
        db = get_authenticated_db(user_jwt)
        
        # Obtener usuario actual CON AUTENTICACIÓN JWT
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
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 5: No permitir cambiar el rol propio
        if user_data.role and user_id == admin["user_id"]:
            raise HTTPException(
                status_code=400, 
                detail="Cannot change your own role"
            )
        
        update_data = user_data.dict(exclude_unset=True, exclude_none=True)
        update_data["updated_at"] = datetime.now().isoformat()
        
        print(f"🔍 [SECURITY] Datos a actualizar: {update_data}")
        
        # 🔐 EJECUTAR UPDATE CON AUTENTICACIÓN JWT
        result = db.table("users").update(update_data).eq("id", user_id).execute()
        
        if result.data:
            print(f"✅ [SECURITY] Usuario actualizado exitosamente: {user_id}")
            
            # Obtener usuario actualizado para respuesta
            updated_user_result = db.table("users").select("*").eq("id", user_id).execute()
            if updated_user_result.data:
                return UserResponse(**updated_user_result.data[0])
            else:
                raise HTTPException(status_code=500, detail="Failed to retrieve updated user")
        else:
            # Manejo profesional de errores
            error_msg = str(result.error) if hasattr(result, 'error') and result.error else "Unknown error"
            print(f"❌ [SECURITY] Error en update: {error_msg}")
            
            # Manejo específico de errores RLS
            if "row-level security" in error_msg.lower():
                raise HTTPException(
                    status_code=403, 
                    detail="RLS policy violation. Insufficient permissions to update user."
                )
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
    CON AUTENTICACIÓN JWT PARA RLS Y VALIDACIONES DE SEGURIDAD AVANZADAS
    """
    try:
        # 🔐 OBTENER JWT DEL REQUEST PARA RLS
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Token missing for RLS")
        
        user_jwt = auth_header.replace("Bearer ", "")
        
        print(f"🔍 [JWT DEBUG] Delete user - Using JWT for RLS")
        print(f"🔍 [SECURITY] Delete user iniciado por: {admin.get('email')}")
        print(f"🔍 [SECURITY] User ID a eliminar: {user_id}")
        
        # 🔐 USAR CLIENTE AUTENTICADO CON JWT
        from ..models.database import get_authenticated_db
        db = get_authenticated_db(user_jwt)
        
        # Obtener usuario CON AUTENTICACIÓN JWT
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
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 5: No eliminar el último super_admin del sistema
        if user.get("role") == "super_admin":
            # Contar super_admins restantes
            super_admins_result = db.table("users").select("id", count="exact").eq("role", "super_admin").execute()
            super_admin_count = super_admins_result.count if hasattr(super_admins_result, 'count') else 1
            
            if super_admin_count <= 1:
                raise HTTPException(
                    status_code=400, 
                    detail="Cannot delete the last super admin in the system"
                )
        
        print(f"🔍 [SECURITY] Ejecutando DELETE con autenticación JWT...")
        
        # 🔐 EJECUTAR DELETE CON AUTENTICACIÓN JWT
        result = db.table("users").delete().eq("id", user_id).execute()
        
        if result.data is not None:
            print(f"✅ [SECURITY] Usuario eliminado exitosamente: {user_id}")
            
            # 🔐 LOG DE AUDITORÍA (en producción, guardar en tabla de logs)
            print(f"📋 [AUDIT] User {user_id} deleted by {admin.get('email')} at {datetime.now().isoformat()}")
            
            return {
                "message": "User deleted successfully",
                "deleted_user_id": user_id,
                "deleted_by": admin.get("email"),
                "timestamp": datetime.now().isoformat()
            }
        else:
            # Manejo profesional de errores
            error_msg = str(result.error) if hasattr(result, 'error') and result.error else "Unknown error"
            print(f"❌ [SECURITY] Error en delete: {error_msg}")
            
            # Manejo específico de errores RLS
            if "row-level security" in error_msg.lower():
                raise HTTPException(
                    status_code=403, 
                    detail="RLS policy violation. Insufficient permissions to delete user."
                )
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