# backend/app/routes/auth.py
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Request
from app.models.user import UserCreate, UserLogin, UserResponse, UserRole, UserStatus
from app.models.database import get_db
from app.auth.jwt_handler import (
    create_access_token, 
    get_current_user,
    get_current_active_user,
    require_super_admin,
    require_company_admin
)
import uuid
from datetime import datetime, timedelta
import hashlib
import secrets

router = APIRouter(prefix="/auth", tags=["auth"])

# Store for refresh tokens (en producción usa Redis o DB)
refresh_tokens_store = {}

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

@router.post("/register", response_model=dict)
async def register(user_data: UserCreate, background_tasks: BackgroundTasks, request: Request):
    """
    Registro CERRADO - Solo usuarios invitados pueden registrarse
    CON VALIDACIONES DE SEGURIDAD AVANZADAS
    """
    try:
        db = get_db()
        
        print(f"🔍 [SECURITY] Intento de registro para: {user_data.email}")
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 1: No permitir auto-asignación de super_admin
        if user_data.role == UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=403, 
                detail="Cannot self-assign super admin role during registration"
            )
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 2: Solo usuarios invitados pueden registrarse
        invited_user = db.table("user_invitations").select("*").eq("email", user_data.email).eq("status", "pending").execute()
        
        if not invited_user.data:
            # 🔐 SEGURIDAD: Log de intento de registro no autorizado
            print(f"🚨 [SECURITY] Intento de registro no autorizado: {user_data.email}")
            raise HTTPException(
                status_code=403, 
                detail="Registration is by invitation only. Please contact your administrator."
            )
        
        invitation = invited_user.data[0]
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 3: Verificar expiración de invitación
        expires_at = datetime.fromisoformat(invitation["expires_at"].replace('Z', '+00:00'))
        if datetime.now() > expires_at:
            # Marcar como expirada
            db.table("user_invitations").update({
                "status": "expired"
            }).eq("id", invitation["id"]).execute()
            
            raise HTTPException(
                status_code=400, 
                detail="Invitation has expired. Please request a new one."
            )
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 4: Verificar si el usuario ya existe
        existing_user = db.table("users").select("*").eq("email", user_data.email).execute()
        if existing_user.data:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 5: Validar que los datos coincidan con la invitación
        if user_data.company_id != invitation["company_id"]:
            raise HTTPException(
                status_code=400, 
                detail="Invalid company for invitation"
            )
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 6: Validar fortaleza de password
        if len(user_data.password) < 8:
            raise HTTPException(
                status_code=400, 
                detail="Password must be at least 8 characters long"
            )
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 7: Verificar que el rol coincida con la invitación
        if user_data.role.value != invitation["role"]:
            raise HTTPException(
                status_code=400, 
                detail="Role does not match invitation"
            )
        
        # Crear usuario con los datos de la invitación
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "company_id": invitation["company_id"],
            "role": invitation["role"],
            "status": "active",
            "hashed_password": hash_password(user_data.password),
            "created_at": datetime.now().isoformat(),
            "last_login": None,
            "invited_by": invitation["invited_by"],
            "is_invited": True,
            "password_reset_required": False
        }
        
        # Insertar usuario
        result = db.table("users").insert(user).execute()
        
        if result.error:
            raise HTTPException(status_code=500, detail=f"Failed to create user: {result.error}")
        
        # 🔐 SEGURIDAD: Marcar invitación como usada
        db.table("user_invitations").update({
            "status": "accepted",
            "accepted_at": datetime.now().isoformat(),
            "user_id": user_id
        }).eq("id", invitation["id"]).execute()
        
        new_user = result.data[0] if result.data else None
        
        if not new_user:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        # Crear token de acceso
        token_data = {
            "sub": user_data.email,
            "user_id": user_id,
            "name": user_data.name,
            "company_id": user_data.company_id,
            "role": invitation["role"]
        }
        
        access_token = create_access_token(token_data)
        
        print(f"✅ [SECURITY] Registro exitoso: {user_data.email}")
        
        return {
            "message": "User created successfully from invitation", 
            "user": UserResponse(**new_user),
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 24 * 60 * 60
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [SECURITY] Error crítico en registro: {e}")
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")

@router.post("/login", response_model=dict)
async def login(login_data: UserLogin, request: Request):
    """
    Login seguro con RPC y validaciones de seguridad
    """
    print("🎯 [SECURITY] === LOGIN ENDPOINT HIT ===")
    
    try:
        db = get_db()
        
        # 🔐 SEGURIDAD: Usar función RPC para autenticación
        result = db.rpc(
            'authenticate_user', 
            {
                'p_email': login_data.email,
                'p_password': login_data.password
            }
        ).execute()
        
        print(f"🔍 [SECURITY] Resultado RPC para: {login_data.email}")
        
        if not result.data or len(result.data) == 0:
            # 🔐 SEGURIDAD: No revelar si el usuario existe o no
            print(f"🚨 [SECURITY] Intento de login fallido para: {login_data.email}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user_data = result.data[0]
        
        # 🔐 VALIDACIÓN DE SEGURIDAD: Verificar que el usuario esté activo
        if user_data.get("status") != "active":
            print(f"🚨 [SECURITY] Intento de login para usuario inactivo: {login_data.email}")
            raise HTTPException(
                status_code=401, 
                detail="Account is inactive. Please contact your administrator."
            )
        
        # 🔐 SEGURIDAD: Verificar password con hash de la respuesta RPC
        stored_hash = user_data["hashed_password"]
        if not verify_password(login_data.password, stored_hash):
            print(f"🚨 [SECURITY] Password incorrecto para: {login_data.email}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # 🔐 SEGURIDAD: Actualizar last_login
        db.table("users").update({
            "last_login": datetime.now().isoformat()
        }).eq("id", user_data["user_id"]).execute()
        
        print(f"✅ [SECURITY] Login exitoso: {login_data.email}")
        
        # Crear token seguro
        token_data = {
            "sub": user_data["user_email"],
            "user_id": user_data["user_id"],
            "name": user_data["user_name"],
            "company_id": user_data["company_id"],
            "role": user_data["user_role"]
        }
        
        access_token = create_access_token(token_data)
        
        return {
            "message": "Login successful",
            "user": {
                "id": user_data["user_id"],
                "email": user_data["user_email"],
                "name": user_data["user_name"],
                "company_id": user_data["company_id"],
                "role": user_data["user_role"],
                "status": user_data["status"]
            },
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 24 * 60 * 60
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 [SECURITY] Error crítico en login: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")

@router.post("/refresh", response_model=dict)
async def refresh_token(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Refresh token seguro
    """
    try:
        # Crear nuevo token con los mismos datos del usuario actual
        token_data = {
            "sub": current_user["email"],
            "user_id": current_user["user_id"],
            "name": current_user["name"],
            "company_id": current_user["company_id"],
            "role": current_user.get("role", "user")
        }
        
        access_token = create_access_token(token_data)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 24 * 60 * 60
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token refresh error: {str(e)}")

@router.post("/logout", response_model=dict)
async def logout(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Logout - en producción, invalidar tokens
    """
    try:
        # En producción, agregar token a blacklist
        print(f"🔍 [SECURITY] Logout exitoso: {current_user['email']}")
        return {"message": "Logout successful"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logout error: {str(e)}")

@router.post("/change-password", response_model=dict)
async def change_password(
    request: Request,
    current_password: str,
    new_password: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Cambio de password con validaciones de seguridad avanzadas
    """
    try:
        db = get_db()
        
        print(f"🔍 [SECURITY] Cambio de password solicitado por: {current_user['email']}")
        
        # Obtener usuario actual
        user_result = db.table("users").select("*").eq("id", current_user["user_id"]).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        current_user_data = user_result.data[0]
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 1: Verificar password actual
        if not verify_password(current_password, current_user_data.get("hashed_password", "")):
            print(f"🚨 [SECURITY] Password actual incorrecto para: {current_user['email']}")
            raise HTTPException(status_code=401, detail="Current password is incorrect")
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 2: Validar nueva password
        if len(new_password) < 8:
            raise HTTPException(
                status_code=400, 
                detail="New password must be at least 8 characters long"
            )
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 3: No permitir la misma password
        if verify_password(new_password, current_user_data.get("hashed_password", "")):
            raise HTTPException(
                status_code=400, 
                detail="New password must be different from current password"
            )
        
        # 🔐 VALIDACIÓN DE SEGURIDAD 4: Verificar fortaleza de password (opcional)
        # Puedes agregar más validaciones como: mayúsculas, minúsculas, números, etc.
        
        # Actualizar password
        new_hashed_password = hash_password(new_password)
        update_result = db.table("users").update({
            "hashed_password": new_hashed_password,
            "updated_at": datetime.now().isoformat(),
            "password_changed_at": datetime.now().isoformat(),
            "password_reset_required": False
        }).eq("id", current_user["user_id"]).execute()
        
        if update_result.error:
            raise HTTPException(status_code=500, detail="Failed to update password")
        
        print(f"✅ [SECURITY] Password cambiado exitosamente: {current_user['email']}")
        
        return {"message": "Password updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [SECURITY] Error en cambio de password: {e}")
        raise HTTPException(status_code=500, detail=f"Password change error: {str(e)}")

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(request: Request, current_user: dict = Depends(get_current_active_user)):
    """
    Obtener perfil del usuario actual
    """
    try:
        db = get_db()
        user_result = db.table("users").select("*").eq("id", current_user["user_id"]).execute()
        
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserResponse(**user_result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile error: {str(e)}")

# Rutas protegidas por roles
@router.get("/super-admin-only")
async def super_admin_only_route(request: Request, admin_user: dict = Depends(require_super_admin)):
    """
    Ruta solo accesible para super administradores
    """
    return {
        "message": "Welcome super admin!", 
        "user": admin_user,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/company-admin-dashboard")
async def company_admin_dashboard(request: Request, manager_user: dict = Depends(require_company_admin)):
    """
    Ruta para company admins y super admins
    """
    return {
        "message": "Company admin dashboard", 
        "user": manager_user,
        "timestamp": datetime.now().isoformat()
    }