from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from ..models.fuel import FuelRecord, FuelRecordCreate, FuelRecordUpdate
from ..models.database import get_db
from ..auth.jwt_handler import verify_token
import uuid
from datetime import datetime

router = APIRouter(prefix="/fuel", tags=["fuel"])

@router.get("/", response_model=List[FuelRecord])
async def get_fuel_records(
    vehicle_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        query = db.table("fuel_records").select("*")
        
        if vehicle_id:
            query = query.eq("vehicle_id", vehicle_id)
            
        result = query.range(skip, skip + limit).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=FuelRecord)
async def create_fuel_record(
    fuel_data: FuelRecordCreate,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        
        # Calculate consumption and total cost
        consumption = fuel_data.miles_driven / fuel_data.fuel_amount if fuel_data.fuel_amount > 0 else 0
        total_cost = fuel_data.fuel_amount * fuel_data.fuel_price
        
        record_id = str(uuid.uuid4())
        record = {
            "id": record_id,
            **fuel_data.dict(),
            "consumption": consumption,
            "total_cost": total_cost,
            "created_at": datetime.now().isoformat()
        }
        
        result = db.table("fuel_records").insert(record).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{record_id}", response_model=FuelRecord)
async def get_fuel_record(
    record_id: str,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        result = db.table("fuel_records").select("*").eq("id", record_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Fuel record not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{record_id}", response_model=FuelRecord)
async def update_fuel_record(
    record_id: str,
    fuel_data: FuelRecordUpdate,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        
        # If updating fuel amount or miles, recalculate consumption
        update_data = fuel_data.dict(exclude_unset=True)
        if 'fuel_amount' in update_data or 'miles_driven' in update_data:
            # Get current record to calculate new consumption
            current = db.table("fuel_records").select("*").eq("id", record_id).execute()
            if current.data:
                current_record = current.data[0]
                fuel_amount = update_data.get('fuel_amount', current_record['fuel_amount'])
                miles_driven = update_data.get('miles_driven', current_record['miles_driven'])
                update_data['consumption'] = miles_driven / fuel_amount if fuel_amount > 0 else 0
        
        result = db.table("fuel_records").update(update_data).eq("id", record_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Fuel record not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{record_id}")
async def delete_fuel_record(
    record_id: str,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        result = db.table("fuel_records").delete().eq("id", record_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Fuel record not found")
        return {"message": "Fuel record deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))