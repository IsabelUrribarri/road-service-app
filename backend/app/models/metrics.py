from pydantic import BaseModel
from typing import List, Dict, Any
from .maintenance import Maintenance

class LowPerformanceVehicle(BaseModel):
    unit_id: str
    consumption: float
    status: str

class Metrics(BaseModel):
    average_consumption: float
    monthly_fuel_cost: float
    cost_per_mile: float
    monthly_miles: float
    low_performance_vehicles: List[LowPerformanceVehicle]
    upcoming_maintenance: List[Maintenance]