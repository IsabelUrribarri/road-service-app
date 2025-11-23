from datetime import datetime, timedelta
from typing import Optional
import jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from dotenv import load_dotenv
from ..models.database import get_db

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is required")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

security = HTTPBearer()

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
            "iat": datetime.utcnow(),  # Issued at
            "iss": "road-service-api"  # Issuer
        })
        
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating token: {str(e)}"
        )

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verifica y decodifica el JWT token, y valida el usuario en la base de datos
    """
    try:
        token = credentials.credentials
        
        # Decodificar el token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Validar campos requeridos
        if "sub" not in payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject"
            )
        
        # Buscar usuario en la base de datos
        db = get_db()
        user_result = db.table("users").select("*").eq("email", payload["sub"]).execute()
        
        if not user_result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        user = user_result.data[0]
        
        # Validar que el usuario esté activo
        if user.get("status") == "inactive":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive"
            )
        
        # Validar que el company_id del token coincida con el de la base de datos
        token_company_id = payload.get("company_id")
        db_company_id = user.get("company_id")
        
        if token_company_id != db_company_id:
            # Log de seguridad - posible token comprometido
            print(f"Security warning: Token company_id mismatch for user {user['email']}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token validation failed"
            )
        
        return {
            "email": user["email"],
            "user_id": user["id"],
            "company_id": user.get("company_id"),
            "name": user.get("name", ""),
            "role": user.get("role", "worker")  # Default a worker si no existe
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token verification error: {str(e)}"
        )

async def get_current_user(user: dict = Depends(verify_token)):
    """
    Dependency para obtener el usuario actual
    """
    return user

async def get_current_active_user(current_user: dict = Depends(get_current_user)):
    """
    Dependency para validar que el usuario esté activo
    """
    return current_user

# =============================================================================
# FUNCIONES DE AUTORIZACIÓN POR ROLES
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

async def require_role(required_role: str):
    """
    Dependency factory para requerir un rol específico
    """
    async def role_dependency(user: dict = Depends(get_current_user)):
        if not has_role(user, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role}"
            )
        return user
    return role_dependency

# CORRIGE las funciones al final del archivo:

# Dependencies específicos para cada rol
async def require_super_admin(user: dict = Depends(get_current_user)):
    """Solo para Super Admin"""
    print(f"🔍 [AUTH DEBUG] require_super_admin - Usuario: {user}")
    
    if not has_role(user, "super_admin"):
        print(f"❌ [AUTH DEBUG] Acceso denegado - Rol: {user.get('role')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires super admin privileges"
        )
    
    print("✅ [AUTH DEBUG] Acceso permitido para super_admin")
    return user

async def require_company_admin(user: dict = Depends(get_current_user)):
    """Para Company Admin y Super Admin"""
    if has_role(user, "company_admin"):
        return user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Company admin or higher role required"
    )

async def require_worker(user: dict = Depends(get_current_user)):
    """Para cualquier usuario autenticado (todos los roles)"""
    return user  # Todos los roles tienen al menos permisos de worker

# Dependencies para acciones específicas
async def can_manage_users(user: dict = Depends(get_current_user)):
    """
    Dependency para gestionar usuarios (solo company_admin y super_admin)
    """
    if has_role(user, "company_admin"):
        return user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Insufficient permissions to manage users"
    )

async def can_manage_companies(user: dict = Depends(get_current_user)):
    """
    Dependency para gestionar empresas (solo super_admin)
    """
    if not has_role(user, "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin privileges required to manage companies"
        )
    return user