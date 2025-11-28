# app/auth/jwt_handler.py
from datetime import datetime, timedelta
from typing import Optional
import jwt
from fastapi import HTTPException, status, Request
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is required")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# Definir roles del sistema
ROLES = ["super_admin", "company_admin", "worker"]
ROLE_HIERARCHY = {
    "super_admin": 3,
    "company_admin": 2, 
    "worker": 1
}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Crea un JWT token con los datos del usuario
    """
    try:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "iss": "road-service-api"
        })
        
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating token: {str(e)}"
        )

def verify_token_simple(token: str) -> Optional[dict]:
    """
    Verificación simple del token para middleware
    SIN dependencias de FastAPI - OPTIMIZADA PARA PERFORMANCE
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Validar campos requeridos
        if "sub" not in payload:
            return None
            
        # Validar expiración
        if "exp" in payload:
            expiration = datetime.fromtimestamp(payload["exp"])
            if datetime.utcnow() > expiration:
                return None
        
        return {
            "email": payload.get("sub"),
            "user_id": payload.get("user_id"),
            "company_id": payload.get("company_id"),
            "name": payload.get("name"),
            "role": payload.get("role", "worker")
        }
        
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    except Exception:
        return None

# =============================================================================
# FUNCIONES DE AUTORIZACIÓN POR ROLES - OPTIMIZADAS
# =============================================================================

def has_role(user: dict, required_role: str) -> bool:
    """
    Verifica si el usuario tiene al menos el rol requerido
    Basado en la jerarquía: super_admin > company_admin > worker
    """
    user_role = user.get("role", "worker")
    user_level = ROLE_HIERARCHY.get(user_role, 1)
    required_level = ROLE_HIERARCHY.get(required_role, 1)
    
    return user_level >= required_level

# =============================================================================
# DEPENDENCIAS PARA ENDPOINTS (usando request.state)
# =============================================================================

def get_current_user(request: Request):
    """
    Obtiene usuario actual del request state (ya verificado por middleware)
    """
    user = getattr(request.state, 'user', None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return user

def get_current_active_user(request: Request):
    """
    Dependency para validar que el usuario esté activo
    """
    return get_current_user(request)  # El middleware ya valida el usuario

def require_super_admin(request: Request):
    """
    Requiere rol de super_admin
    """
    user = get_current_user(request)
    if not has_role(user, "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return user

def require_company_admin(request: Request):
    """
    Requiere rol de company_admin o super_admin
    """
    user = get_current_user(request)
    if not has_role(user, "company_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company admin or higher role required"
        )
    return user

def require_worker(request: Request):
    """
    Para cualquier usuario autenticado (todos los roles)
    """
    return get_current_user(request)

def can_manage_users(request: Request):
    """
    Dependency para gestionar usuarios (solo company_admin y super_admin)
    """
    user = get_current_user(request)
    if not has_role(user, "company_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to manage users"
        )
    return user

def can_manage_companies(request: Request):
    """
    Dependency para gestionar empresas (solo super_admin)
    """
    user = get_current_user(request)
    if not has_role(user, "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin privileges required to manage companies"
        )
    return user