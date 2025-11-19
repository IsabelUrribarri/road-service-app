from fastapi import APIRouter, HTTPException, Depends
from ..models.metrics import Metrics
from ..models.database import get_db
from ..auth.jwt_handler import get_current_active_user, require_company_admin, require_super_admin
from datetime import datetime, timedelta

router = APIRouter(prefix="/metrics", tags=["metrics"])

@router.get("/", response_model=Metrics)
async def get_metrics(user: dict = Depends(get_current_active_user)):  # ✅ Todos los roles pueden ver
    try:
        db = get_db()
        company_id = user["company_id"]
        
        # Get all fuel records for the current month con filtro de compañía
        current_month = datetime.now().strftime("%Y-%m")
        fuel_records = db.table("fuel_records").select("*").eq("company_id", company_id).execute().data
        
        # Get all vehicles con filtro de compañía
        vehicles = db.table("vehicles").select("*").eq("company_id", company_id).execute().data
        
        # Get all maintenance records con filtro de compañía
        maintenance = db.table("maintenance").select("*").eq("company_id", company_id).execute().data
        
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
        upcoming = [m for m in maintenance if m.get('next_service_date') and m['next_service_date'] <= next_month]
        
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
async def get_vehicle_metrics(
    vehicle_id: str, 
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden ver
):
    try:
        db = get_db()
        company_id = user["company_id"]
        
        # Verificar que el vehículo pertenezca a la compañía del usuario
        vehicle_check = db.table("vehicles").select("id").eq("id", vehicle_id).eq("company_id", company_id).execute()
        if not vehicle_check.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        # Get fuel records for specific vehicle con filtro de compañía
        fuel_records = db.table("fuel_records").select("*").eq("vehicle_id", vehicle_id).eq("company_id", company_id).execute().data
        
        # Get vehicle info
        vehicle = db.table("vehicles").select("*").eq("id", vehicle_id).execute().data
        
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

# Métricas administrativas de la empresa
@router.get("/company/overview")
async def get_company_overview(
    admin: dict = Depends(require_company_admin)  # ✅ SOLO Company Admin y Super Admin
):
    """
    Métricas completas de la compañía - solo para company_admin y super_admin
    """
    try:
        db = get_db()
        company_id = admin["company_id"]
        
        # Obtener todos los datos de la compañía
        vehicles = db.table("vehicles").select("*").eq("company_id", company_id).execute().data
        fuel_records = db.table("fuel_records").select("*").eq("company_id", company_id).execute().data
        maintenance = db.table("maintenance").select("*").eq("company_id", company_id).execute().data
        users = db.table("users").select("*").eq("company_id", company_id).execute().data
        
        return {
            "company_id": company_id,
            "total_vehicles": len(vehicles),
            "total_users": len(users),
            "total_fuel_records": len(fuel_records),
            "total_maintenance": len(maintenance),
            "active_vehicles": len([v for v in vehicles if v.get('status') == 'active']),
            "in_maintenance": len([v for v in vehicles if v.get('status') == 'maintenance']),
            "users_by_role": {
                "super_admin": len([u for u in users if u.get('role') == 'super_admin']),
                "company_admin": len([u for u in users if u.get('role') == 'company_admin']),
                "worker": len([u for u in users if u.get('role') == 'worker'])
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Métricas globales del sistema (solo super_admin)
@router.get("/admin/global-overview")
async def get_global_overview(
    admin: dict = Depends(require_super_admin)  # ✅ SOLO Super Admin
):
    """
    Métricas globales del sistema - solo para super_admin
    """
    try:
        db = get_db()
        
        # Obtener estadísticas globales
        companies = db.table("companies").select("id", count="exact").execute()
        total_users = db.table("users").select("id", count="exact").execute()
        total_vehicles = db.table("vehicles").select("id", count="exact").execute()
        total_fuel_records = db.table("fuel_records").select("id", count="exact").execute()
        
        return {
            "total_companies": companies.count or 0,
            "total_users": total_users.count or 0,
            "total_vehicles": total_vehicles.count or 0,
            "total_fuel_records": total_fuel_records.count or 0,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))