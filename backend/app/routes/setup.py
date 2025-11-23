# backend/app/routes/setup.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import hashlib
import secrets
import uuid
from datetime import datetime
from ..models.database import get_db

router = APIRouter(prefix="/setup", tags=["setup"])

class SetupRequest(BaseModel):
    setup_token: str = "dev-token-2024"  # Token fijo para desarrollo

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

@router.post("/initialize")
async def initialize_system(setup_data: SetupRequest):
    """
    Endpoint SIMPLIFICADO para desarrollo
    """
    
    # ✅ TOKEN FIJO para desarrollo
    if setup_data.setup_token != "dev-token-2024":
        raise HTTPException(status_code=403, detail="Invalid setup token")
    
    try:
        db = get_db()
        
        # 🔒 CREDENCIALES
        ADMIN_EMAIL = "urribarriisabel5@gmail.com"
        ADMIN_PASSWORD = "Kellyta.2017"
        
        # 1. Crear empresa del sistema
        company_id = str(uuid.uuid4())
        company_data = {
            "id": company_id,
            "name": "Sistema RoadService",
            "contact_email": "system@roadsystem.com",
            "status": "active",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        company_result = db.table("companies").insert(company_data).execute()
        
        # 2. Crear super admin
        user_id = str(uuid.uuid4())
        user_data = {
            "id": user_id,
            "email": ADMIN_EMAIL,
            "name": "Super Administrador",
            "company_id": company_id,
            "role": "super_admin",
            "status": "active",
            "hashed_password": hash_password(ADMIN_PASSWORD),
            "created_at": datetime.now().isoformat(),
            "is_system_admin": True
        }
        
        user_result = db.table("users").insert(user_data).execute()
        
        return {
            "message": "✅ SISTEMA INICIALIZADO EXITOSAMENTE",
            "admin_email": ADMIN_EMAIL,
            "status": "success",
            "security_warning": "⚠️ CAMBIA LA CONTRASEÑA INMEDIATAMENTE"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Setup failed: {str(e)}")

@router.get("/status")
async def get_setup_status():
    """Verificar estado del sistema"""
    try:
        db = get_db()
        admins = db.table("users").select("*").eq("role", "super_admin").execute()
        
        return {
            "is_initialized": len(admins.data) > 0,
            "super_admins_count": len(admins.data),
            "message": "Usa POST /setup/initialize con {'setup_token': 'dev-token-2024'}"
        }
    except Exception as e:
        return {"error": str(e), "is_initialized": False}