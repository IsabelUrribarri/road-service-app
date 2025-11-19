# backend/app/routes/admin.py
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from ..models.company import CompanyCreate, CompanyUpdate, CompanyResponse, CompanyWithUsers, CompanyStats
from ..models.user import UserResponse, UserRole, UserStatus
from ..models.database import get_db
from ..auth.jwt_handler import require_super_admin, can_manage_companies
import uuid
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["admin"])

# =============================================================================
# RUTAS DE GESTIÓN DE EMPRESAS (Solo Super Admin)
# =============================================================================

@router.post("/companies", response_model=CompanyResponse)
async def create_company(
    company_data: CompanyCreate,
    admin: dict = Depends(require_super_admin)
):
    """
    Crear una nueva empresa (Solo Super Admin)
    """
    try:
        db = get_db()
        
        # Verificar si ya existe una empresa con ese nombre
        existing_company = db.table("companies").select("*").eq("name", company_data.name).execute()
        if existing_company.data:
            raise HTTPException(status_code=400, detail="Company with this name already exists")
        
        company_id = str(uuid.uuid4())
        company = {
            "id": company_id,
            **company_data.dict(),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        result = db.table("companies").insert(company).execute()
        
        if result.data:
            return CompanyResponse(**result.data[0])
        else:
            raise HTTPException(status_code=400, detail="Error creating company")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/companies", response_model=List[CompanyResponse])
async def get_all_companies(
    skip: int = 0,
    limit: int = 100,
    admin: dict = Depends(require_super_admin)
):
    """
    Obtener todas las empresas (Solo Super Admin)
    """
    try:
        db = get_db()
        result = db.table("companies").select("*").order("created_at", desc=True).range(skip, skip + limit).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/companies/{company_id}", response_model=CompanyWithUsers)
async def get_company_with_users(
    company_id: str,
    admin: dict = Depends(require_super_admin)
):
    """
    Obtener una empresa con todos sus usuarios (Solo Super Admin)
    """
    try:
        db = get_db()
        
        # Obtener la empresa
        company_result = db.table("companies").select("*").eq("id", company_id).execute()
        if not company_result.data:
            raise HTTPException(status_code=404, detail="Company not found")
        
        company = company_result.data[0]
        
        # Obtener usuarios de la empresa
        users_result = db.table("users").select("*").eq("company_id", company_id).execute()
        
        return CompanyWithUsers(
            **company,
            users=users_result.data
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/companies/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: str,
    company_data: CompanyUpdate,
    admin: dict = Depends(require_super_admin)
):
    """
    Actualizar una empresa (Solo Super Admin)
    """
    try:
        db = get_db()
        
        # Verificar que la empresa existe
        check_result = db.table("companies").select("id").eq("id", company_id).execute()
        if not check_result.data:
            raise HTTPException(status_code=404, detail="Company not found")
        
        update_data = company_data.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.now().isoformat()
        
        result = db.table("companies").update(update_data).eq("id", company_id).execute()
        
        if result.data:
            return CompanyResponse(**result.data[0])
        else:
            raise HTTPException(status_code=404, detail="Company not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/companies/{company_id}")
async def delete_company(
    company_id: str,
    admin: dict = Depends(require_super_admin)
):
    """
    Eliminar una empresa (Solo Super Admin)
    IMPORTANTE: Esto eliminará todos los datos asociados
    """
    try:
        db = get_db()
        
        # Verificar que la empresa existe
        check_result = db.table("companies").select("id").eq("id", company_id).execute()
        if not check_result.data:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Eliminar empresa (esto activará cascada si está configurado en la BD)
        result = db.table("companies").delete().eq("id", company_id).execute()
        
        if result.data:
            return {"message": "Company deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Company not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# RUTAS DE ESTADÍSTICAS GLOBALES (Solo Super Admin)
# =============================================================================

@router.get("/stats/overview")
async def get_global_stats(admin: dict = Depends(require_super_admin)):
    """
    Obtener estadísticas globales del sistema (Solo Super Admin)
    """
    try:
        db = get_db()
        
        # Contar empresas
        companies_count = db.table("companies").select("id", count="exact").execute()
        
        # Contar usuarios por rol
        users_count = db.table("users").select("role").execute()
        
        # Contar vehículos totales
        vehicles_count = db.table("vehicles").select("id", count="exact").execute()
        
        # Contar registros de combustible
        fuel_records_count = db.table("fuel_records").select("id", count="exact").execute()
        
        # Contar mantenimientos
        maintenance_count = db.table("maintenance").select("id", count="exact").execute()
        
        # Agrupar usuarios por rol
        role_counts = {}
        for user in users_count.data:
            role = user.get('role', 'worker')
            role_counts[role] = role_counts.get(role, 0) + 1
        
        return {
            "total_companies": companies_count.count or 0,
            "total_users": len(users_count.data),
            "total_vehicles": vehicles_count.count or 0,
            "total_fuel_records": fuel_records_count.count or 0,
            "total_maintenance": maintenance_count.count or 0,
            "users_by_role": role_counts,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/companies")
async def get_companies_stats(admin: dict = Depends(require_super_admin)):
    """
    Obtener estadísticas detalladas por empresa (Solo Super Admin)
    """
    try:
        db = get_db()
        
        # Obtener todas las empresas
        companies = db.table("companies").select("*").execute().data
        
        companies_stats = []
        
        for company in companies:
            company_id = company['id']
            
            # Contar usuarios de la empresa
            users_count = db.table("users").select("id", count="exact").eq("company_id", company_id).execute()
            
            # Contar vehículos de la empresa
            vehicles_count = db.table("vehicles").select("id", count="exact").eq("company_id", company_id).execute()
            
            # Contar registros de combustible de la empresa
            fuel_count = db.table("fuel_records").select("id", count="exact").eq("company_id", company_id).execute()
            
            companies_stats.append({
                "company_id": company_id,
                "company_name": company['name'],
                "status": company.get('status', 'active'),
                "total_users": users_count.count or 0,
                "total_vehicles": vehicles_count.count or 0,
                "total_fuel_records": fuel_count.count or 0,
                "created_at": company.get('created_at')
            })
        
        return {
            "companies": companies_stats,
            "total": len(companies_stats)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))