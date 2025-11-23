export type UserRole = 'super_admin' | 'company_admin' | 'worker';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company_id: string;
  status: UserStatus;
  created_at: string;
  last_login?: string;
  is_invited?: boolean;
  password_reset_required?: boolean;
}

export interface UserWithCompany extends User {
  company_name?: string;
}

export interface UserUpdate {
  name?: string;
  role?: UserRole;
  status?: UserStatus;
  company_id?: string;
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

export interface Company {
  id: string;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  created_at: string;
  updated_at?: string;
  created_by: string;
}
export interface UserWithCompany extends User {
  company?: Company;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  last_login?: string;
}

export interface CompanyStats {
  company_id: string;
  total_users: number;
  total_vehicles: number;
  total_fuel_records: number;
  total_maintenance: number;
  active_users: number;
  created_at: string;
}