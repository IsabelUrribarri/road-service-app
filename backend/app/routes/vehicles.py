from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from ..models.vehicle import Vehicle, VehicleCreate, VehicleUpdate
from ..models.database import get_db
from ..auth.jwt_handler import verify_token
import uuid
from datetime import datetime, date

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

@router.get("/", response_model=List[Vehicle])
async def get_vehicles(
    skip: int = 0, 
    limit: int = 100,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        result = db.table("vehicles").select("*").range(skip, skip + limit).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Vehicle)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        vehicle_id = str(uuid.uuid4())
        vehicle = {
            "id": vehicle_id,
            **vehicle_data.dict(),
            "created_at": datetime.now().isoformat()
        }
        result = db.table("vehicles").insert(vehicle).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{vehicle_id}", response_model=Vehicle)
async def get_vehicle(
    vehicle_id: str,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        result = db.table("vehicles").select("*").eq("id", vehicle_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(
    vehicle_id: str,
    vehicle_data: VehicleUpdate,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        result = db.table("vehicles").update(vehicle_data.dict(exclude_unset=True)).eq("id", vehicle_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: str,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        result = db.table("vehicles").delete().eq("id", vehicle_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        return {"message": "Vehicle deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))