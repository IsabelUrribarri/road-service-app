export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Vehicle {
  id: string;
  unit_id: string;
  mechanic_name: string;
  model: string;
  total_miles: number;
  status: string;
  created_at: string;
}

export interface FuelRecord {
  id: string;
  vehicle_id: string;
  date: string;
  fuel_amount: number;
  fuel_price: number;
  total_cost: number;
  miles_driven: number;
  consumption: number;
  created_at: string;
}

export interface Maintenance {
  id: string;
  vehicle_id: string;
  date: string;
  service_type: string;
  description: string;
  cost: number;
  next_service_date: string;
  created_at: string;
}

export interface Inventory {
  id: string;
  vehicle_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  last_updated: string;
  status: string;
  min_quantity: number;
}

export interface Metrics {
  average_consumption: number;
  monthly_fuel_cost: number;
  cost_per_mile: number;
  monthly_miles: number;
  low_performance_vehicles: Array<{
    unit_id: string;
    consumption: number;
    status: string;
  }>;
  upcoming_maintenance: Maintenance[];
}