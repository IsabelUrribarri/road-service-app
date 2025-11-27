# backend/app/routes/auth.py
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Request
from app.models.user import UserCreate, UserLogin, UserResponse, UserRole, UserStatus
from app.models.database import get_db
from app.auth.jwt_handler import (
    create_access_token, 
    verify_token, 
    get_current_user,
    get_current_active_user,
    require_super_admin,  # ✅ Solo require_super_admin
    require_company_admin  # ✅ require_company_admin
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
    """
    try:
        db = get_db()
        
        # ✅ BLOQUEAR REGISTRO ABIERTO - Solo permitir usuarios invitados
        # Verificar si el usuario fue previamente invitado
        invited_user = db.table("user_invitations").select("*").eq("email", user_data.email).eq("status", "pending").execute()
        
        if not invited_user.data:
            raise HTTPException(
                status_code=403, 
                detail="Registration is by invitation only. Please contact your administrator."
            )
        
        invitation = invited_user.data[0]
        
        # Verificar si la invitación ha expirado
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
        
        # Verificar si el usuario ya existe
        existing_user = db.table("users").select("*").eq("email", user_data.email).execute()
        if existing_user.data:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Validar que los datos coincidan con la invitación
        if user_data.company_id != invitation["company_id"]:
            raise HTTPException(status_code=400, detail="Invalid company for invitation")
        
        # Validar fortaleza de password
        if len(user_data.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
        
        # Crear usuario con los datos de la invitación
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "company_id": invitation["company_id"],
            "role": invitation["role"],  # Usar el rol de la invitación
            "status": "active",
            "hashed_password": hash_password(user_data.password),
            "created_at": datetime.now().isoformat(),
            "last_login": None,
            "invited_by": invitation["invited_by"]
        }
        
        # Insertar usuario
        result = db.table("users").insert(user).execute()
        
        if result.error:
            raise HTTPException(status_code=500, detail=f"Failed to create user: {result.error}")
        
        # Marcar invitación como usada
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
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")


@router.post("/login", response_model=dict)
async def login(login_data: UserLogin, request: Request):
    """
    Login de usuario usando función de base de datos segura
    """
    print("🎯 [DEBUG] === LOGIN ENDPOINT HIT (RPC) ===")
    
    try:
        db = get_db()
        
        # 🔐 USAR FUNCIÓN RPC - MÁXIMA SEGURIDAD
        result = db.rpc(
            'authenticate_user', 
            {
                'email': login_data.email,
                'password': login_data.password
            }
        ).execute()
        
        print(f"🔍 [DEBUG] Resultado RPC: {result.data}")
        
        if not result.data or len(result.data) == 0:
            print("❌ [DEBUG] AUTENTICACIÓN FALLIDA")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user_data = result.data[0]
        print(f"✅ [DEBUG] AUTENTICACIÓN EXITOSA: {user_data['user_email']}")
        
        # Crear token
        token_data = {
            "sub": user_data["user_email"],
            "user_id": str(user_data["user_id"]),
            "name": user_data["user_name"],
            "company_id": str(user_data["company_id"]),
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
                "status": "active"
            },
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 24 * 60 * 60
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 [DEBUG] ERROR EN LOGIN (RPC): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")


@router.post("/refresh", response_model=dict)
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """
    Refresh token endpoint - crea un nuevo token con los mismos datos
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
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout - podría invalidar tokens en una implementación más avanzada
    """
    try:
        # En una implementación real, podrías agregar el token a una blacklist
        # Por ahora, el cliente simplemente descarta el token
        
        return {"message": "Logout successful"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logout error: {str(e)}")

@router.post("/change-password", response_model=dict)
async def change_password(
    current_password: str,
    new_password: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Cambio de password con validaciones de seguridad
    """
    try:
        db = get_db()
        
        # Obtener usuario actual
        user_result = db.table("users").select("*").eq("id", current_user["user_id"]).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        current_user_data = user_result.data[0]
        
        # Verificar password actual
        if not verify_password(current_password, current_user_data.get("hashed_password", "")):
            raise HTTPException(status_code=401, detail="Current password is incorrect")
        
        # Validar nueva password
        if len(new_password) < 8:
            raise HTTPException(status_code=400, detail="New password must be at least 8 characters long")
        
        # No permitir la misma password
        if verify_password(new_password, current_user_data.get("hashed_password", "")):
            raise HTTPException(status_code=400, detail="New password must be different from current password")
        
        # Actualizar password
        new_hashed_password = hash_password(new_password)
        update_result = db.table("users").update({
            "hashed_password": new_hashed_password,
            "updated_at": datetime.now().isoformat(),
            "password_changed_at": datetime.now().isoformat()
        }).eq("id", current_user["user_id"]).execute()
        
        if update_result.error:
            raise HTTPException(status_code=500, detail="Failed to update password")
        
        return {"message": "Password updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Password change error: {str(e)}")

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_active_user)):
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

# Rutas protegidas por roles - ACTUALIZADAS
@router.get("/super-admin-only")
async def super_admin_only_route(admin_user: dict = Depends(require_super_admin)):  # ✅ CORREGIDO nombre
    """
    Ruta solo accesible para super administradores
    """
    return {"message": "Welcome super admin!", "user": admin_user}

@router.get("/company-admin-dashboard")
async def company_admin_dashboard(manager_user: dict = Depends(require_company_admin)):  # ✅ CORREGIDO nombre
    """
    Ruta para company admins y super admins
    """
    return {"message": "Company admin dashboard", "user": manager_user}


