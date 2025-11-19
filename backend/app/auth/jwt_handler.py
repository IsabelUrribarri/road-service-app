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
        
        # Validar que el usuario esté activo (si tienes campo de estado)
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
            "company_id": user.get("company_id", "default"),
            "name": user.get("name", ""),
            "role": user.get("role", "user")  # Para autorización futura
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
    # Aquí puedes agregar más validaciones de estado del usuario
    return current_user

# Funciones de autorización (para futuras características)
async def require_role(required_role: str, user: dict = Depends(get_current_user)):
    """
    Dependency para requerir un rol específico
    """
    user_role = user.get("role", "user")
    if user_role != required_role and user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    return user

async def require_admin(user: dict = Depends(get_current_user)):
    """
    Dependency para requerir rol de administrador
    """
    return await require_role("admin", user)