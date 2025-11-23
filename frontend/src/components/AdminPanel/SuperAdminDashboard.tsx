// frontend/src/components/AdminPanel/SuperAdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Company, CompanyStats } from '../../types';
import { apiService } from '../../services/api';
import {
    Building, Users, Car, Fuel, Wrench, Package,
    Plus, TrendingUp, Activity, Shield, Edit, Trash2
} from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
    const { user, isSuperAdmin } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [stats, setStats] = useState<CompanyStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const companiesData = await apiService.getCompanies();
            setCompanies(companiesData);
        } catch (error) {
            console.error('Error fetching companies:', error);
            // Datos de ejemplo para desarrollo
            const demoCompanies: Company[] = [
                {
                    id: 'company-1',
                    name: 'Transportes Pérez',
                    contact_email: 'contacto@transportesperez.com',
                    contact_phone: '+1234567890',
                    address: 'Av. Principal 123, Ciudad',
                    status: 'active',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-20T00:00:00Z',
                    created_by: 'super-admin-1'
                }
            ];
            setCompanies(demoCompanies);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCompany = async (companyData: any) => {
        try {
            const newCompany = await apiService.createCompany(companyData);
            setCompanies(prev => [...prev, newCompany]);
            setShowAddCompanyModal(false);
            alert('✅ Empresa creada exitosamente');
        } catch (error) {
            console.error('Error creating company:', error);
            alert('❌ Error creando empresa');
        }
    };

    const handleEditCompany = async (companyId: string, companyData: any) => {
        try {
            const updatedCompany = await apiService.updateCompany(companyId, companyData);
            setCompanies(prev => prev.map(company =>
                company.id === companyId ? updatedCompany : company
            ));
            setEditingCompany(null);
            alert('✅ Empresa actualizada exitosamente');
        } catch (error) {
            console.error('Error updating company:', error);
            alert('❌ Error actualizando empresa');
        }
    };

    const handleDeleteCompany = async (companyId: string) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar esta empresa? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await apiService.deleteCompany(companyId);
            setCompanies(prev => prev.filter(company => company.id !== companyId));
            alert('✅ Empresa eliminada exitosamente');
        } catch (error) {
            console.error('Error deleting company:', error);
            alert('❌ Error eliminando empresa');
        }
    };

    if (!isSuperAdmin) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Acceso Restringido
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Solo los Super Administradores pueden acceder a esta sección.
                    </p>
                </div>
            </div>
        );
    }

    const getCompanyStats = (companyId: string) => {
        return stats.find(stat => stat.company_id === companyId);
    };

    const getStatusColor = (status: Company['status']) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'trial': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
            case 'suspended': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: Company['status']) => {
        switch (status) {
            case 'active': return 'Activa';
            case 'trial': return 'Prueba';
            case 'inactive': return 'Inactiva';
            case 'suspended': return 'Suspendida';
            default: return status;
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                            <Shield className="w-8 h-8 mr-3 text-purple-600" />
                            Panel de Super Admin
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                            Gestión global del sistema y todas las empresas
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddCompanyModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-colors shadow-lg shadow-purple-500/25"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Nueva Empresa</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Empresas</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{companies.length}</p>
                        </div>
                        <Building className="w-8 h-8 text-purple-600" />
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Empresas Activas</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                                {companies.filter(c => c.status === 'active').length}
                            </p>
                        </div>
                        <Activity className="w-8 h-8 text-green-600" />
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En Prueba</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                                {companies.filter(c => c.status === 'trial').length}
                            </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-blue-600" />
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Usuarios</p>
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                                {stats.reduce((total, stat) => total + stat.total_users, 0)}
                            </p>
                        </div>
                        <Users className="w-8 h-8 text-orange-600" />
                    </div>
                </div>
            </div>

            {/* Companies List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Empresas Registradas</h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">Cargando empresas...</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {companies.map((company) => {
                            const companyStats = getCompanyStats(company.id);

                            return (
                                <div key={company.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                                {company.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {company.name}
                                                </h3>
                                                <div className="flex items-center space-x-4 mt-1">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(company.status)}`}>
                                                        {getStatusText(company.status)}
                                                    </span>
                                                    {company.contact_email && (
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                                            {company.contact_email}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-6">
                                            {/* Stats */}
                                            {companyStats && (
                                                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                                                    <div className="flex items-center space-x-1">
                                                        <Users className="w-4 h-4" />
                                                        <span>{companyStats.total_users} users</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Car className="w-4 h-4" />
                                                        <span>{companyStats.total_vehicles} veh</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Fuel className="w-4 h-4" />
                                                        <span>{companyStats.total_fuel_records} fuel</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => setEditingCompany(company)}
                                                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCompany(company.id)}
                                                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal para añadir empresa */}
            {showAddCompanyModal && (
                <AddCompanyModal
                    onClose={() => setShowAddCompanyModal(false)}
                    onAddCompany={handleAddCompany}
                />
            )}

            {/* Modal para editar empresa */}
            {editingCompany && (
                <EditCompanyModal
                    company={editingCompany}
                    onClose={() => setEditingCompany(null)}
                    onSave={handleEditCompany}
                />
            )}
        </div>
    );
};

// Modal para añadir empresa
const AddCompanyModal: React.FC<{
    onClose: () => void;
    onAddCompany: (companyData: any) => void
}> = ({ onClose, onAddCompany }) => {
    const [formData, setFormData] = useState({
        name: '',
        contact_email: '',
        phone: '',
        address: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddCompany(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-auto">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Crear Nueva Empresa
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nombre de la Empresa *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Mi Empresa S.A."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email de Contacto
                        </label>
                        <input
                            type="email"
                            value={formData.contact_email}
                            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="contacto@empresa.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Teléfono
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="+1 234 567 8900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Dirección
                        </label>
                        <textarea
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Dirección completa de la empresa"
                            rows={3}
                        />
                    </div>
                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Crear Empresa
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Modal para editar empresa
const EditCompanyModal: React.FC<{
    company: Company;
    onClose: () => void;
    onSave: (companyId: string, companyData: any) => void;
}> = ({ company, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: company.name,
        contact_email: company.contact_email || '',
        phone: company.contact_phone || '',
        address: company.address || '',
        status: company.status
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(company.id, formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-auto">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Editar Empresa
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nombre de la Empresa *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email de Contacto
                        </label>
                        <input
                            type="email"
                            value={formData.contact_email}
                            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Teléfono
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Dirección
                        </label>
                        <textarea
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Estado
                        </label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as Company['status'] })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="active">Activa</option>
                            <option value="trial">Prueba</option>
                            <option value="inactive">Inactiva</option>
                            <option value="suspended">Suspendida</option>
                        </select>
                    </div>
                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;