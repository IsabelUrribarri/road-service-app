from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from ..models.maintenance import Maintenance, MaintenanceCreate, MaintenanceUpdate
from ..models.database import get_db
from ..auth.jwt_handler import get_current_active_user, require_company_admin
from ..manager import manager
import uuid
from datetime import datetime

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

@router.get("/", response_model=List[Maintenance])
async def get_maintenance(
    vehicle_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden ver
):
    try:
        db = get_db()
        query = db.table("maintenance").select("*").eq("company_id", user["company_id"])
        
        if vehicle_id:
            query = query.eq("vehicle_id", vehicle_id)
            
        result = query.range(skip, skip + limit).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Maintenance)
async def create_maintenance(
    maintenance_data: MaintenanceCreate,
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden crear
):
    try:
        db = get_db()
        
        # Verificar que el vehículo pertenezca a la compañía
        vehicle_check = db.table("vehicles").select("id").eq("id", maintenance_data.vehicle_id).eq("company_id", user["company_id"]).execute()
        if not vehicle_check.data:
            raise HTTPException(status_code=400, detail="Vehicle not found in your company")
        
        maintenance_id = str(uuid.uuid4())
        maintenance = {
            "id": maintenance_id,
            **maintenance_data.dict(),
            "company_id": user["company_id"],
            "created_at": datetime.now().isoformat()
        }
        result = db.table("maintenance").insert(maintenance)
        
        if result.data:
            new_maintenance = result.data[0]
            
            # Broadcast real-time
            await manager.broadcast_to_company({
                "type": "MAINTENANCE_CREATED",
                "data": new_maintenance,
                "timestamp": datetime.now().isoformat()
            }, user["company_id"])
            
            return new_maintenance
        else:
            raise HTTPException(status_code=400, detail="Error creating maintenance record")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{maintenance_id}", response_model=Maintenance)
async def get_maintenance_record(
    maintenance_id: str,
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden ver
):
    try:
        db = get_db()
        result = db.table("maintenance").select("*").eq("id", maintenance_id).eq("company_id", user["company_id"]).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Maintenance record not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{maintenance_id}", response_model=Maintenance)
async def update_maintenance(
    maintenance_id: str,
    maintenance_data: MaintenanceUpdate,
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden actualizar
):
    try:
        db = get_db()
        
        # Verificar que el registro pertenezca a la compañía
        check_result = db.table("maintenance").select("id").eq("id", maintenance_id).eq("company_id", user["company_id"]).execute()
        if not check_result.data:
            raise HTTPException(status_code=404, detail="Maintenance record not found")
        
        result = db.table("maintenance").update(maintenance_data.dict(exclude_unset=True)).eq("id", maintenance_id).execute()
        
        if result.data:
            updated_maintenance = result.data[0]
            
            # Broadcast real-time
            await manager.broadcast_to_company({
                "type": "MAINTENANCE_UPDATED",
                "data": updated_maintenance,
                "timestamp": datetime.now().isoformat()
            }, user["company_id"])
            
            return updated_maintenance
        else:
            raise HTTPException(status_code=404, detail="Maintenance record not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{maintenance_id}")
async def delete_maintenance(
    maintenance_id: str,
    user: dict = Depends(require_company_admin)  # ✅ SOLO Company Admin y Super Admin pueden eliminar
):
    try:
        db = get_db()
        
        # Verificar que el registro pertenezca a la compañía
        check_result = db.table("maintenance").select("id").eq("id", maintenance_id).eq("company_id", user["company_id"]).execute()
        if not check_result.data:
            raise HTTPException(status_code=404, detail="Maintenance record not found")
        
        result = db.table("maintenance").delete().eq("id", maintenance_id).execute()
        
        if result.data:
            # Broadcast real-time
            await manager.broadcast_to_company({
                "type": "MAINTENANCE_DELETED",
                "data": {"id": maintenance_id},
                "timestamp": datetime.now().isoformat()
            }, user["company_id"])
            
            return {"message": "Maintenance record deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Maintenance record not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Ruta para aprobación de mantenimientos (solo company_admin y super_admin)
@router.post("/{maintenance_id}/approve")
async def approve_maintenance(
    maintenance_id: str,
    user: dict = Depends(require_company_admin)  # ✅ SOLO Company Admin y Super Admin pueden aprobar
):
    """
    Aprobar mantenimiento - solo company_admin y super_admin
    """
    try:
        db = get_db()
        
        # Verificar que el registro pertenezca a la compañía
        check_result = db.table("maintenance").select("*").eq("id", maintenance_id).eq("company_id", user["company_id"]).execute()
        if not check_result.data:
            raise HTTPException(status_code=404, detail="Maintenance record not found")
        
        result = db.table("maintenance").update({
            "status": "approved",
            "approved_by": user["user_id"],
            "approved_at": datetime.now().isoformat()
        }).eq("id", maintenance_id).execute()
        
        if result.data:
            updated_maintenance = result.data[0]
            
            # Broadcast real-time
            await manager.broadcast_to_company({
                "type": "MAINTENANCE_APPROVED",
                "data": updated_maintenance,
                "timestamp": datetime.now().isoformat()
            }, user["company_id"])
            
            return {"message": "Maintenance approved successfully", "maintenance": updated_maintenance}
        else:
            raise HTTPException(status_code=404, detail="Maintenance record not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))