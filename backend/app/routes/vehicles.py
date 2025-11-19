from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from ..models.vehicle import Vehicle, VehicleCreate, VehicleUpdate
from ..models.database import get_db
from ..auth.jwt_handler import get_current_active_user, require_company_admin
from ..manager import manager
import uuid
from datetime import datetime, date

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

@router.get("/", response_model=List[Vehicle])
async def get_vehicles(
    skip: int = 0, 
    limit: int = 100,
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden ver
):
    try:
        db = get_db()
        # Filtrar por compañía del usuario
        result = db.table("vehicles").select("*").eq("company_id", user["company_id"]).range(skip, skip + limit).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Vehicle)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden crear
):
    try:
        db = get_db()
        vehicle_id = str(uuid.uuid4())
        vehicle = {
            "id": vehicle_id,
            **vehicle_data.dict(),
            "company_id": user["company_id"],
            "created_at": datetime.now().isoformat()
        }
        result = db.table("vehicles").insert(vehicle)
        
        if result.data:
            new_vehicle = result.data[0]
            
            # Broadcast real-time a todos los clientes de la compañía
            await manager.broadcast_to_company({
                "type": "VEHICLE_CREATED",
                "data": new_vehicle,
                "timestamp": datetime.now().isoformat()
            }, user["company_id"])
            
            return new_vehicle
        else:
            raise HTTPException(status_code=400, detail="Error creating vehicle")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{vehicle_id}", response_model=Vehicle)
async def get_vehicle(
    vehicle_id: str,
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden ver
):
    try:
        db = get_db()
        # Verificar que el vehículo pertenezca a la compañía del usuario
        result = db.table("vehicles").select("*").eq("id", vehicle_id).eq("company_id", user["company_id"]).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(
    vehicle_id: str,
    vehicle_data: VehicleUpdate,
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden actualizar
):
    try:
        db = get_db()
        # Verificar que el vehículo pertenezca a la compañía del usuario
        check_result = db.table("vehicles").select("id").eq("id", vehicle_id).eq("company_id", user["company_id"]).execute()
        if not check_result.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        result = db.table("vehicles").update(vehicle_data.dict(exclude_unset=True)).eq("id", vehicle_id).execute()
        
        if result.data:
            updated_vehicle = result.data[0]
            
            # Broadcast real-time
            await manager.broadcast_to_company({
                "type": "VEHICLE_UPDATED",
                "data": updated_vehicle,
                "timestamp": datetime.now().isoformat()
            }, user["company_id"])
            
            return updated_vehicle
        else:
            raise HTTPException(status_code=404, detail="Vehicle not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: str,
    user: dict = Depends(require_company_admin)  # ✅ SOLO Company Admin y Super Admin pueden eliminar
):
    try:
        db = get_db()
        # Verificar que el vehículo pertenezca a la compañía del usuario
        check_result = db.table("vehicles").select("id").eq("id", vehicle_id).eq("company_id", user["company_id"]).execute()
        if not check_result.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        result = db.table("vehicles").delete().eq("id", vehicle_id).execute()
        
        if result.data:
            # Broadcast real-time
            await manager.broadcast_to_company({
                "type": "VEHICLE_DELETED",
                "data": {"id": vehicle_id},
                "timestamp": datetime.now().isoformat()
            }, user["company_id"])
            
            return {"message": "Vehicle deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Vehicle not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Ruta para obtener todos los vehículos de la compañía (solo company_admin y super_admin)
@router.get("/company/all")
async def get_all_company_vehicles(
    admin: dict = Depends(require_company_admin)  # ✅ SOLO Company Admin y Super Admin
):
    """
    Obtener todos los vehículos de la compañía - solo para company_admin y super_admin
    """
    try:
        db = get_db()
        result = db.table("vehicles").select("*").eq("company_id", admin["company_id"]).execute()
        return {"vehicles": result.data, "total": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))