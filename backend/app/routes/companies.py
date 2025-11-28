# backend/app/routes/companies.py
from fastapi import APIRouter, HTTPException, Depends, Request  # ← AGREGAR Request
from typing import List
from ..models.company import CompanyResponse, CompanyStats
from ..models.user import UserResponse
from ..models.database import get_db
from ..auth.jwt_handler import get_current_user, require_company_admin, require_super_admin
from datetime import datetime

router = APIRouter(prefix="/companies", tags=["companies"])

# =============================================================================
# RUTAS ACTUALIZADAS - ARQUITECTURA PROFESIONAL
# =============================================================================

@router.get("/my-company", response_model=CompanyResponse)
async def get_my_company(
    request: Request,  # ← AGREGAR ESTE PARÁMETRO
    user: dict = Depends(get_current_user)  # ← FUNCIONARÁ CON LA NUEVA ARQUITECTURA
):
    """
    Obtener información de la empresa del usuario actual
    """
    try:
        db = get_db()
        
        company_result = db.table("companies").select("*").eq("id", user["company_id"]).execute()
        if not company_result.data:
            raise HTTPException(status_code=404, detail="Company not found")
        
        return CompanyResponse(**company_result.data[0])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-company/users", response_model=List[UserResponse])
async def get_my_company_users(
    request: Request,  # ← AGREGAR ESTE PARÁMETRO
    user: dict = Depends(get_current_user)  # ← FUNCIONARÁ CON LA NUEVA ARQUITECTURA
):
    """
    Obtener todos los usuarios de la empresa actual
    """
    try:
        db = get_db()
        
        users_result = db.table("users").select("*").eq("company_id", user["company_id"]).order("created_at", desc=True).execute()
        return users_result.data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-company/stats")
async def get_my_company_stats(
    request: Request,  # ← AGREGAR ESTE PARÁMETRO
    admin: dict = Depends(require_company_admin)  # ← FUNCIONARÁ CON LA NUEVA ARQUITECTURA
):
    """
    Obtener estadísticas de la empresa actual (Solo Company Admin y Super Admin)
    """
    try:
        db = get_db()
        company_id = admin["company_id"]
        
        # Contar usuarios activos
        users_count = db.table("users").select("id", count="exact").eq("company_id", company_id).eq("status", "active").execute()
        
        # Contar vehículos
        vehicles_count = db.table("vehicles").select("id", count="exact").eq("company_id", company_id).execute()
        
        # Contar vehículos activos
        active_vehicles_count = db.table("vehicles").select("id", count="exact").eq("company_id", company_id).eq("status", "active").execute()
        
        # Contar registros de combustible del mes actual
        current_month = datetime.now().strftime("%Y-%m")
        fuel_records = db.table("fuel_records").select("*").eq("company_id", company_id).execute().data
        monthly_fuel = len([r for r in fuel_records if r.get('date', '').startswith(current_month)])
        
        # Contar mantenimientos pendientes
        pending_maintenance = db.table("maintenance").select("id", count="exact").eq("company_id", company_id).eq("status", "pending").execute()
        
        # Alertas de inventario bajo
        low_stock_count = db.table("inventory").select("id", count="exact").eq("company_id", company_id).eq("status", "low_stock").execute()
        
        return {
            "company_id": company_id,
            "total_users": users_count.count or 0,
            "total_vehicles": vehicles_count.count or 0,
            "active_vehicles": active_vehicles_count.count or 0,
            "monthly_fuel_records": monthly_fuel,
            "pending_maintenance": pending_maintenance.count or 0,
            "low_stock_alerts": low_stock_count.count or 0,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))