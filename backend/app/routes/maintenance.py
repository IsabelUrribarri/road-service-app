from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from ..models.maintenance import Maintenance, MaintenanceCreate, MaintenanceUpdate
from ..models.database import get_db
from ..auth.jwt_handler import verify_token
import uuid
from datetime import datetime

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

@router.get("/", response_model=List[Maintenance])
async def get_maintenance(
    vehicle_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        query = db.table("maintenance").select("*")
        
        if vehicle_id:
            query = query.eq("vehicle_id", vehicle_id)
            
        result = query.range(skip, skip + limit).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Maintenance)
async def create_maintenance(
    maintenance_data: MaintenanceCreate,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        maintenance_id = str(uuid.uuid4())
        maintenance = {
            "id": maintenance_id,
            **maintenance_data.dict(),
            "created_at": datetime.now().isoformat()
        }
        result = db.table("maintenance").insert(maintenance).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{maintenance_id}", response_model=Maintenance)
async def get_maintenance_record(
    maintenance_id: str,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        result = db.table("maintenance").select("*").eq("id", maintenance_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Maintenance record not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{maintenance_id}", response_model=Maintenance)
async def update_maintenance(
    maintenance_id: str,
    maintenance_data: MaintenanceUpdate,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        result = db.table("maintenance").update(maintenance_data.dict(exclude_unset=True)).eq("id", maintenance_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Maintenance record not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{maintenance_id}")
async def delete_maintenance(
    maintenance_id: str,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        result = db.table("maintenance").delete().eq("id", maintenance_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Maintenance record not found")
        return {"message": "Maintenance record deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))