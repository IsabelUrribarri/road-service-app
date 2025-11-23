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

    # ⚠️ ELIMINA TODO ESTE CÓDIGO QUE ESTÁ DESPUÉS - ESTÁ INALCANZABLE ⚠️
# En auth.py - mantener solo lo esencial
@router.post("/login", response_model=dict)
async def login(login_data: UserLogin, request: Request):
    try:
        db = get_db()
        user_result = db.table("users").select("*").eq("email", login_data.email).execute()
        
        if not user_result.data:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user = user_result.data[0]
        
        if not verify_password(login_data.password, user.get("hashed_password", "")):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Crear token y retornar respuesta...
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")
    
    """
    Login de usuario con validaciones de seguridad
    """
    print("🎯 [DEBUG] === LOGIN ENDPOINT HIT ===")
    print(f"🎯 [DEBUG] login_data type: {type(login_data)}")
    print(f"🎯 [DEBUG] login_data: {login_data}")
    print(f"🎯 [DEBUG] login_data.dict(): {login_data.dict()}")
    
    try:
        db = get_db()  # ← ESTA LÍNEA DEBE IR PRIMERO
        
        print(f"🔐 [DEBUG] Email: {login_data.email}")
        print(f"🔐 [DEBUG] Password: {login_data.password}")
        print(f"🔐 [DEBUG] Company ID: {login_data.company_id}")
        
        # 🔍 DEBUG DE CONEXIÓN - TODAS LAS CONSULTAS AQUÍ
        print("🔍 [DEBUG] Probando diferentes consultas...")

        # Consulta 1 - La actual
        result1 = db.table("users").select("*").eq("email", login_data.email).execute()
        print(f"🔍 [DEBUG] Consulta 1 - users: {result1.data}")

        # Consulta 2 - Con ilike (case insensitive)  
        # result2 = db.table("users").select("*").ilike("email", login_data.email).execute()
        # print(f"🔍 [DEBUG] Consulta 2 - ilike: {result2.data}")

        # Consulta 3 - Buscar todos los usuarios para debug
        result3 = db.table("users").select("email, id").limit(5).execute()
        print(f"🔍 [DEBUG] Consulta 3 - todos: {result3.data}")

        # Consulta 4 - Buscar por ID en lugar de email
        result4 = db.table("users").select("*").eq("id", "95dba2b9-4183-46d4-94dc-fa7094697156").execute()
        print(f"🔍 [DEBUG] Consulta 4 - por ID: {result4.data}")
        
        # Consulta 5 - En public.users
        result5 = db.table("public.users").select("*").eq("email", login_data.email).execute()
        print(f"🔍 [DEBUG] Consulta 5 - public.users: {result5.data}")

        # Consulta 6 - En auth.users (vacía)
        result6 = db.table("auth.users").select("*").eq("email", login_data.email).execute()
        print(f"🔍 [DEBUG] Consulta 6 - auth.users: {result6.data}")

        # Rate limiting básico
        client_ip = request.client.host
        
        # Usar la consulta que funcione
        if result5.data:  # Si public.users funciona
            user_result = result5
            print("✅ [DEBUG] Usando public.users")
        elif result1.data:  # Si users funciona
            user_result = result1  
            print("✅ [DEBUG] Usando users")
        else:
            user_result = result1  # Fallback
            print("⚠️ [DEBUG] Ninguna consulta encontró datos")
        
        print(f"🔍 [DEBUG] Resultado final BD datos: {user_result.data}")
        print(f"🔍 [DEBUG] Longitud de data: {len(user_result.data) if user_result.data else 0}")
        
        if not user_result.data:
            print("❌ [DEBUG] USER NOT FOUND IN DATABASE")
            
            # Verificar variables de entorno
            import os
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_KEY")
            print(f"🔍 [DEBUG] SUPABASE_URL: {supabase_url}")
            print(f"🔍 [DEBUG] SUPABASE_KEY: {supabase_key[:20]}..." if supabase_key else "No SUPABASE_KEY")
            
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user = user_result.data[0]
        print(f"✅ [DEBUG] USER FOUND: {user['email']}")
        print(f"🔑 [DEBUG] User status: {user.get('status')}")
        print(f"🔑 [DEBUG] User company_id: {user.get('company_id')}")
        print(f"🔑 [DEBUG] Stored hash: {user.get('hashed_password', 'NO HASH')}")
        
        # Validar estado del usuario
        if user.get("status") != "active":
            print("❌ [DEBUG] USER NOT ACTIVE")
            raise HTTPException(status_code=401, detail="Account is not active")
        
        # Validar password con debug
        stored_hash = user.get("hashed_password", "")
        print(f"🔍 [DEBUG] Verifying password...")
        print(f"🔍 [DEBUG] Stored hash length: {len(stored_hash)}")
        
        password_valid = verify_password(login_data.password, stored_hash)
        print(f"🔍 [DEBUG] Password valid: {password_valid}")
        
        if not password_valid:
            print("❌ [DEBUG] PASSWORD VERIFICATION FAILED")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        print("✅ [DEBUG] ALL VALIDATIONS PASSED - LOGIN SUCCESS")
        
        # Actualizar último login
        # db.table("users").update({
        #     "last_login": datetime.now().isoformat(),
        #     "last_login_ip": client_ip
        # }).eq("id", user["id"]).execute()
        
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
            "expires_in": 24 * 60 * 60
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 [DEBUG] ERROR EN LOGIN: {str(e)}")
        print(f"💥 [DEBUG] ERROR TYPE: {type(e)}")
        import traceback
        print(f"💥 [DEBUG] TRACEBACK: {traceback.format_exc()}")
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


