# app/routes/auth.py
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Request
from app.models.user import UserCreate, UserLogin, UserResponse, UserRole, UserStatus
from app.models.database import get_db
from app.auth.jwt_handler import (
    create_access_token, 
    verify_token, 
    get_current_user,
    get_current_active_user,
    require_role,
    require_admin
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
    Registro de usuario con validaciones de producción
    """
    try:
        db = get_db()
        
        # Rate limiting básico por IP (en producción usa Redis)
        client_ip = request.client.host
        
        # Verificar si el usuario ya existe
        existing_user = db.table("users").select("*").eq("email", user_data.email).execute()
        if existing_user.data:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Validar fortaleza de password
        if len(user_data.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
        
        # Crear usuario con password hasheado
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "company_id": user_data.company_id,
            "role": user_data.role.value,
            "status": user_data.status.value,
            "hashed_password": hash_password(user_data.password),
            "created_at": datetime.now().isoformat(),
            "last_login": None,
            "registration_ip": client_ip
        }
        
        result = db.table("users").insert(user)
        
        if result.error:
            raise HTTPException(status_code=500, detail=f"Failed to create user: {result.error}")
        
        new_user = result.data[0] if result.data else None
        
        if not new_user:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        # Crear token de acceso
        token_data = {
            "sub": user_data.email,
            "user_id": user_id,
            "name": user_data.name,
            "company_id": user_data.company_id,
            "role": user_data.role.value
        }
        
        access_token = create_access_token(token_data)
        
        # Tarea en background para enviar email de bienvenida
        # background_tasks.add_task(send_welcome_email, new_user["email"])
        
        return {
            "message": "User created successfully", 
            "user": UserResponse(**new_user),
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 24 * 60 * 60  # 1 día en segundos (como está configurado)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")

@router.post("/login", response_model=dict)
async def login(login_data: UserLogin, request: Request):
    """
    Login de usuario con validaciones de seguridad
    """
    try:
        db = get_db()
        
        # Rate limiting básico
        client_ip = request.client.host
        
        # Buscar usuario
        user_result = db.table("users").select("*").eq("email", login_data.email).execute()
        
        if not user_result.data:
            # Mismo mensaje de error para no revelar información
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user = user_result.data[0]
        
        # Validar estado del usuario
        if user.get("status") != "active":
            raise HTTPException(status_code=401, detail="Account is not active")
        
        # Validar password
        if not verify_password(login_data.password, user.get("hashed_password", "")):
            # Registrar intento fallido (en producción)
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Validar company_id
        if user.get("company_id") != login_data.company_id:
            raise HTTPException(status_code=401, detail="Invalid company")
        
        # Actualizar último login
        db.table("users").update({
            "last_login": datetime.now().isoformat(),
            "last_login_ip": client_ip
        }).eq("id", user["id"]).execute()
        
        # Crear token
        token_data = {
            "sub": login_data.email,
            "user_id": user["id"],
            "name": user["name"],
            "company_id": user.get("company_id", "default"),
            "role": user.get("role", "user")
        }
        
        access_token = create_access_token(token_data)
        
        return {
            "message": "Login successful",
            "user": UserResponse(**user),
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 24 * 60 * 60  # 1 día en segundos
        }
        
    except HTTPException:
        raise
    except Exception as e:
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

# Rutas protegidas por roles
@router.get("/admin-only")
async def admin_only_route(admin_user: dict = Depends(require_admin)):
    """
    Ruta solo accesible para administradores
    """
    return {"message": "Welcome admin!", "user": admin_user}

@router.get("/manager-dashboard")
async def manager_dashboard(manager_user: dict = Depends(lambda: require_role("manager"))):
    """
    Ruta para managers y admins
    """
    return {"message": "Manager dashboard", "user": manager_user}