// frontend/src/services/api.ts

// Usar URL base según el entorno
const getApiUrl = () => {
  // En desarrollo, usa localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000';
  }
  // En producción, usa la URL de la variable de entorno o relativa
  return import.meta.env.VITE_API_URL || '';
};

class ApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    console.log('🔐 Token:', token); // Agrega logging
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async request(endpoint: string, options: RequestInit = {}) {
    try {
      const baseUrl = getApiUrl();
      const url = `${baseUrl}${endpoint}`;
      
      console.log(`🔄 Haciendo request a: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetail = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorDetail = errorJson.detail || errorText;
        } catch {
          // Si no es JSON, usar el texto original
        }
        throw new Error(`HTTP ${response.status}: ${errorDetail}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ API Error at ${endpoint}:`, error);
      throw error;
    }
  }

  // =============================================================================
  // AUTH ENDPOINTS
  // =============================================================================

  async login(credentials: { email: string; password: string }) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: { name: string; email: string; password: string; company_id?: string }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async refreshToken() {
    return this.request('/auth/refresh');
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // =============================================================================
  // USER MANAGEMENT ENDPOINTS
  // =============================================================================

  async getUsers() {
    return this.request('/users/');  // ✅ Barra final para listar
  }

  async getUser(userId: string) {
    return this.request(`/users/${userId}`);  // ✅ Sin barra final para rutas con parámetros
  }

  async inviteUser(userData: any) {
    return this.request('/users/invite', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: string, userData: any) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: string) {
    return this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async resetUserPassword(userId: string) {
    return this.request(`/users/${userId}/reset-password`, {
      method: 'POST',
    });
  }

  // =============================================================================
  // COMPANY MANAGEMENT ENDPOINTS
  // =============================================================================

  async getCompanies() {
    return this.request('/admin/companies/');  // ✅ Barra final para listar
  }

  async getCompany(companyId: string) {
    return this.request(`/admin/companies/${companyId}`);
  }

  async createCompany(companyData: any) {
    return this.request('/admin/companies/', {  // ✅ Barra final para crear
      method: 'POST',
      body: JSON.stringify(companyData),
    });
  }

  async updateCompany(companyId: string, companyData: any) {
    return this.request(`/admin/companies/${companyId}`, {
      method: 'PUT',
      body: JSON.stringify(companyData),
    });
  }

  async deleteCompany(companyId: string) {
    return this.request(`/admin/companies/${companyId}`, {
      method: 'DELETE',
    });
  }

  // =============================================================================
  // VEHICLE MANAGEMENT ENDPOINTS
  // =============================================================================

  async getVehicles() {
    return this.request('/vehicles/');
  }

  async getVehicle(vehicleId: string) {
    return this.request(`/vehicles/${vehicleId}`);
  }

  async createVehicle(vehicleData: any) {
    return this.request('/vehicles/', {
      method: 'POST',
      body: JSON.stringify(vehicleData),
    });
  }

  async updateVehicle(vehicleId: string, vehicleData: any) {
    return this.request(`/vehicles/${vehicleId}`, {
      method: 'PUT',
      body: JSON.stringify(vehicleData),
    });
  }

  async deleteVehicle(vehicleId: string) {
    return this.request(`/vehicles/${vehicleId}`, {
      method: 'DELETE',
    });
  }

  // =============================================================================
  // MAINTENANCE ENDPOINTS
  // =============================================================================

  async getMaintenanceRecords() {
    return this.request('/maintenance/');
  }

  async getMaintenanceRecord(recordId: string) {
    return this.request(`/maintenance/${recordId}`);
  }

  async createMaintenanceRecord(maintenanceData: any) {
    return this.request('/maintenance/', {
      method: 'POST',
      body: JSON.stringify(maintenanceData),
    });
  }

  async updateMaintenanceRecord(recordId: string, maintenanceData: any) {
    return this.request(`/maintenance/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(maintenanceData),
    });
  }

  async deleteMaintenanceRecord(recordId: string) {
    return this.request(`/maintenance/${recordId}`, {
      method: 'DELETE',
    });
  }

  // =============================================================================
  // FUEL ENDPOINTS
  // =============================================================================

  async getFuelRecords() {
    return this.request('/fuel/');
  }

  async getFuelRecord(recordId: string) {
    return this.request(`/fuel/${recordId}`);
  }

  async createFuelRecord(fuelData: any) {
    return this.request('/fuel/', {
      method: 'POST',
      body: JSON.stringify(fuelData),
    });
  }

  async updateFuelRecord(recordId: string, fuelData: any) {
    return this.request(`/fuel/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(fuelData),
    });
  }

  async deleteFuelRecord(recordId: string) {
    return this.request(`/fuel/${recordId}`, {
      method: 'DELETE',
    });
  }

  // =============================================================================
  // INVENTORY ENDPOINTS
  // =============================================================================

  async getInventory() {
    return this.request('/inventory/');
  }

  async getInventoryItem(itemId: string) {
    return this.request(`/inventory/${itemId}`);
  }

  async createInventoryItem(inventoryData: any) {
    return this.request('/inventory/', {
      method: 'POST',
      body: JSON.stringify(inventoryData),
    });
  }

  async updateInventoryItem(itemId: string, inventoryData: any) {
    return this.request(`/inventory/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(inventoryData),
    });
  }

  async deleteInventoryItem(itemId: string) {
    return this.request(`/inventory/${itemId}`, {
      method: 'DELETE',
    });
  }

  // =============================================================================
  // METRICS & DASHBOARD ENDPOINTS
  // =============================================================================

  async getDashboardMetrics() {
    return this.request('/metrics/dashboard');
  }

  async getCompanyMetrics(companyId?: string) {
    const endpoint = companyId ? `/metrics/company/${companyId}` : '/metrics/company';
    return this.request(endpoint);
  }

  async getVehicleMetrics(vehicleId: string) {
    return this.request(`/metrics/vehicle/${vehicleId}`);
  }

  // =============================================================================
  // INVITATION ENDPOINTS
  // =============================================================================

  async getInvitations() {
    return this.request('/invitations/');
  }

  async getInvitation(invitationId: string) {
    return this.request(`/invitations/${invitationId}`);
  }

  async createInvitation(invitationData: any) {
    return this.request('/invitations/', {
      method: 'POST',
      body: JSON.stringify(invitationData),
    });
  }

  async deleteInvitation(invitationId: string) {
    return this.request(`/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  }

  async acceptInvitation(invitationId: string, userData: any) {
    return this.request(`/invitations/${invitationId}/accept`, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }
}

export const apiService = new ApiService();