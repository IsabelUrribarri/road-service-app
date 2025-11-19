from fastapi import APIRouter, HTTPException
from ..models.user import UserCreate, UserLogin
from ..models.database import get_db
from ..auth.jwt_handler import create_access_token
import uuid
from datetime import datetime, timedelta

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register")
async def register(user_data: UserCreate):
    try:
        db = get_db()
        
        # Check if user exists
        existing_user = db.table("users").select("*").eq("email", user_data.email).execute()
        if existing_user.data:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Create user
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "created_at": datetime.now().isoformat()
        }
        
        result = db.table("users").insert(user).execute()
        
        # Create access token
        access_token = create_access_token(
            data={"sub": user_data.email},
            expires_delta=timedelta(days=30)  # 30 days for demo
        )
        
        return {
            "message": "User created successfully", 
            "user": result.data[0],
            "access_token": access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
async def login(login_data: UserLogin):
    try:
        db = get_db()
        
        # Find user
        user_result = db.table("users").select("*").eq("email", login_data.email).execute()
        
        if not user_result.data:
            # Auto-create user for demo purposes
            user_id = str(uuid.uuid4())
            new_user = {
                "id": user_id,
                "email": login_data.email,
                "name": login_data.email.split('@')[0],
                "created_at": datetime.now().isoformat()
            }
            user_result = db.table("users").insert(new_user).execute()
        
        user = user_result.data[0]
        
        # Create access token
        access_token = create_access_token(
            data={"sub": login_data.email},
            expires_delta=timedelta(days=30)
        )
        
        return {
            "message": "Login successful",
            "user": user,
            "access_token": access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))