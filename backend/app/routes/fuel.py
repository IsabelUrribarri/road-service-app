from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from ..models.fuel import FuelRecord, FuelRecordCreate, FuelRecordUpdate
from ..models.database import get_db
from ..auth.jwt_handler import get_current_active_user, require_company_admin
from ..manager import manager
import uuid
from datetime import datetime

router = APIRouter(prefix="/fuel", tags=["fuel"])

@router.get("/", response_model=List[FuelRecord])
async def get_fuel_records(
    vehicle_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden ver
):
    try:
        db = get_db()
        query = db.table("fuel_records").select("*").eq("company_id", user["company_id"])
        
        if vehicle_id:
            # Verificar que el vehículo pertenezca a la compañía
            vehicle_check = db.table("vehicles").select("id").eq("id", vehicle_id).eq("company_id", user["company_id"]).execute()
            if not vehicle_check.data:
                raise HTTPException(status_code=400, detail="Vehicle not found in your company")
            query = query.eq("vehicle_id", vehicle_id)
            
        result = query.range(skip, skip + limit).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=FuelRecord)
async def create_fuel_record(
    fuel_data: FuelRecordCreate,
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden crear
):
    try:
        db = get_db()
        
        # Verificar que el vehículo pertenezca a la compañía
        vehicle_check = db.table("vehicles").select("id").eq("id", fuel_data.vehicle_id).eq("company_id", user["company_id"]).execute()
        if not vehicle_check.data:
            raise HTTPException(status_code=400, detail="Vehicle not found in your company")
        
        # Calculate consumption and total cost
        consumption = fuel_data.miles_driven / fuel_data.fuel_amount if fuel_data.fuel_amount > 0 else 0
        total_cost = fuel_data.fuel_amount * fuel_data.fuel_price
        
        record_id = str(uuid.uuid4())
        record = {
            "id": record_id,
            **fuel_data.dict(),
            "consumption": round(consumption, 2),
            "total_cost": round(total_cost, 2),
            "company_id": user["company_id"],
            "created_at": datetime.now().isoformat()
        }
        
        result = db.table("fuel_records").insert(record)
        
        if result.data:
            new_record = result.data[0]
            
            # Broadcast real-time
            await manager.broadcast_to_company({
                "type": "FUEL_RECORD_CREATED",
                "data": new_record,
                "timestamp": datetime.now().isoformat()
            }, user["company_id"])
            
            return new_record
        else:
            raise HTTPException(status_code=400, detail="Error creating fuel record")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{record_id}", response_model=FuelRecord)
async def get_fuel_record(
    record_id: str,
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden ver
):
    try:
        db = get_db()
        result = db.table("fuel_records").select("*").eq("id", record_id).eq("company_id", user["company_id"]).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Fuel record not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{record_id}", response_model=FuelRecord)
async def update_fuel_record(
    record_id: str,
    fuel_data: FuelRecordUpdate,
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden actualizar
):
    try:
        db = get_db()
        
        # Verificar que el registro pertenezca a la compañía
        check_result = db.table("fuel_records").select("*").eq("id", record_id).eq("company_id", user["company_id"]).execute()
        if not check_result.data:
            raise HTTPException(status_code=404, detail="Fuel record not found")
        
        # If updating fuel amount or miles, recalculate consumption
        update_data = fuel_data.dict(exclude_unset=True)
        if 'fuel_amount' in update_data or 'miles_driven' in update_data:
            current_record = check_result.data[0]
            fuel_amount = update_data.get('fuel_amount', current_record['fuel_amount'])
            miles_driven = update_data.get('miles_driven', current_record['miles_driven'])
            update_data['consumption'] = round(miles_driven / fuel_amount if fuel_amount > 0 else 0, 2)
            
            # Recalculate total cost if fuel_price or fuel_amount changed
            if 'fuel_price' in update_data or 'fuel_amount' in update_data:
                fuel_price = update_data.get('fuel_price', current_record['fuel_price'])
                update_data['total_cost'] = round(fuel_amount * fuel_price, 2)
        
        result = db.table("fuel_records").update(update_data).eq("id", record_id).execute()
        
        if result.data:
            updated_record = result.data[0]
            
            # Broadcast real-time
            await manager.broadcast_to_company({
                "type": "FUEL_RECORD_UPDATED",
                "data": updated_record,
                "timestamp": datetime.now().isoformat()
            }, user["company_id"])
            
            return updated_record
        else:
            raise HTTPException(status_code=404, detail="Fuel record not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{record_id}")
async def delete_fuel_record(
    record_id: str,
    user: dict = Depends(require_company_admin)  # ✅ SOLO Company Admin y Super Admin pueden eliminar
):
    try:
        db = get_db()
        
        # Verificar que el registro pertenezca a la compañía
        check_result = db.table("fuel_records").select("id").eq("id", record_id).eq("company_id", user["company_id"]).execute()
        if not check_result.data:
            raise HTTPException(status_code=404, detail="Fuel record not found")
        
        result = db.table("fuel_records").delete().eq("id", record_id).execute()
        
        if result.data:
            # Broadcast real-time
            await manager.broadcast_to_company({
                "type": "FUEL_RECORD_DELETED",
                "data": {"id": record_id},
                "timestamp": datetime.now().isoformat()
            }, user["company_id"])
            
            return {"message": "Fuel record deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Fuel record not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Ruta para análisis de combustible
@router.get("/analysis/consumption")
async def get_consumption_analysis(
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden ver análisis
):
    """
    Análisis de consumo de combustible
    """
    try:
        db = get_db()
        fuel_records = db.table("fuel_records").select("*").eq("company_id", user["company_id"]).execute().data
        
        if not fuel_records:
            return {"message": "No fuel records found for analysis"}
        
        # Calcular métricas de consumo
        total_fuel = sum(record['fuel_amount'] for record in fuel_records)
        total_miles = sum(record['miles_driven'] for record in fuel_records)
        total_cost = sum(record['total_cost'] for record in fuel_records)
        
        avg_consumption = total_miles / total_fuel if total_fuel > 0 else 0
        cost_per_mile = total_cost / total_miles if total_miles > 0 else 0
        
        # Consumo por vehículo
        vehicles_consumption = {}
        for record in fuel_records:
            vehicle_id = record['vehicle_id']
            if vehicle_id not in vehicles_consumption:
                vehicles_consumption[vehicle_id] = []
            vehicles_consumption[vehicle_id].append(record['consumption'])
        
        # Promedio por vehículo
        vehicle_avg = {}
        for vehicle_id, consumptions in vehicles_consumption.items():
            vehicle_avg[vehicle_id] = sum(consumptions) / len(consumptions)
        
        return {
            "total_fuel_used": round(total_fuel, 2),
            "total_miles_driven": round(total_miles, 2),
            "total_fuel_cost": round(total_cost, 2),
            "average_consumption": round(avg_consumption, 2),
            "cost_per_mile": round(cost_per_mile, 2),
            "vehicle_consumption": vehicle_avg
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Ruta administrativa para reportes
@router.get("/admin/monthly-report")
async def get_monthly_fuel_report(
    admin: dict = Depends(require_company_admin)  # ✅ SOLO Company Admin y Super Admin
):
    """
    Reporte mensual de combustible - solo para company_admin y super_admin
    """
    try:
        db = get_db()
        current_month = datetime.now().strftime("%Y-%m")
        
        fuel_records = db.table("fuel_records").select("*").eq("company_id", admin["company_id"]).execute().data
        
        # Filtrar por mes actual
        monthly_records = [r for r in fuel_records if r['date'].startswith(current_month)]
        
        monthly_fuel = sum(r['fuel_amount'] for r in monthly_records)
        monthly_cost = sum(r['total_cost'] for r in monthly_records)
        monthly_miles = sum(r['miles_driven'] for r in monthly_records)
        
        return {
            "month": current_month,
            "total_fuel_used": round(monthly_fuel, 2),
            "total_cost": round(monthly_cost, 2),
            "total_miles": round(monthly_miles, 2),
            "records_count": len(monthly_records),
            "average_consumption": round(monthly_miles / monthly_fuel if monthly_fuel > 0 else 0, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))