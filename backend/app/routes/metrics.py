from fastapi import APIRouter, HTTPException, Depends
from ..models.metrics import Metrics
from ..models.database import get_db
from ..auth.jwt_handler import verify_token
from datetime import datetime, timedelta

router = APIRouter(prefix="/metrics", tags=["metrics"])

@router.get("/", response_model=Metrics)
async def get_metrics(user: dict = Depends(verify_token)):
    try:
        db = get_db()
        
        # Get all fuel records for the current month
        current_month = datetime.now().strftime("%Y-%m")
        fuel_records = db.table("fuel_records").select("*").execute().data
        
        # Get all vehicles
        vehicles = db.table("vehicles").select("*").execute().data
        
        # Get all maintenance records
        maintenance = db.table("maintenance").select("*").execute().data
        
        # Calculate metrics
        if fuel_records:
            total_fuel = sum(record['fuel_amount'] for record in fuel_records)
            total_miles = sum(record['miles_driven'] for record in fuel_records)
            total_cost = sum(record['total_cost'] for record in fuel_records)
            
            average_consumption = total_miles / total_fuel if total_fuel > 0 else 0
            cost_per_mile = total_cost / total_miles if total_miles > 0 else 0
        else:
            average_consumption = 0
            cost_per_mile = 0
            total_cost = 0
            total_miles = 0
        
        # Get low performance vehicles (consumption < 7 km/L)
        low_performance = []
        
        for vehicle in vehicles:
            vehicle_fuel = [r for r in fuel_records if r['vehicle_id'] == vehicle['id']]
            if vehicle_fuel:
                avg_consumption = sum(r['consumption'] for r in vehicle_fuel) / len(vehicle_fuel)
                if avg_consumption < 7:
                    low_performance.append({
                        'unit_id': vehicle['unit_id'],
                        'consumption': round(avg_consumption, 1),
                        'status': 'critical' if avg_consumption < 6 else 'low'
                    })
        
        # Get upcoming maintenance (next 30 days)
        next_month = (datetime.now() + timedelta(days=30)).isoformat()
        upcoming = [m for m in maintenance if m['next_service_date'] <= next_month]
        
        return Metrics(
            average_consumption=round(average_consumption, 1),
            monthly_fuel_cost=round(total_cost, 2),
            cost_per_mile=round(cost_per_mile, 2),
            monthly_miles=round(total_miles, 0),
            low_performance_vehicles=low_performance,
            upcoming_maintenance=upcoming
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vehicle/{vehicle_id}")
async def get_vehicle_metrics(vehicle_id: str, user: dict = Depends(verify_token)):
    try:
        db = get_db()
        
        # Get fuel records for specific vehicle
        fuel_records = db.table("fuel_records").select("*").eq("vehicle_id", vehicle_id).execute().data
        
        # Get vehicle info
        vehicle = db.table("vehicles").select("*").eq("id", vehicle_id).execute().data
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        # Calculate vehicle-specific metrics
        if fuel_records:
            total_fuel = sum(record['fuel_amount'] for record in fuel_records)
            total_miles = sum(record['miles_driven'] for record in fuel_records)
            total_cost = sum(record['total_cost'] for record in fuel_records)
            
            avg_consumption = total_miles / total_fuel if total_fuel > 0 else 0
            cost_per_mile = total_cost / total_miles if total_miles > 0 else 0
            
            # Last 5 records for trend analysis
            recent_records = sorted(fuel_records, key=lambda x: x['date'], reverse=True)[:5]
        else:
            avg_consumption = 0
            cost_per_mile = 0
            total_cost = 0
            recent_records = []
        
        return {
            "vehicle": vehicle[0],
            "average_consumption": round(avg_consumption, 1),
            "total_fuel_cost": round(total_cost, 2),
            "cost_per_mile": round(cost_per_mile, 2),
            "total_miles": round(total_miles, 0),
            "recent_records": recent_records
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))