// frontend/src/components/AdminPanel/UserManagement.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserWithCompany, Company } from '../../types';
import { RoleBadge } from '../ui/role-badge';
import { 
  Users, Search, Edit, Trash2, Shield, 
  Mail, Building, Calendar, Filter
} from 'lucide-react';

const UserManagement: React.FC = () => {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithCompany[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        const [usersResponse, companiesResponse] = await Promise.all([
          fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('/api/companies', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (usersResponse.ok && companiesResponse.ok) {
          const usersData = await usersResponse.json();
          const companiesData = await companiesResponse.json();
          setUsers(usersData);
          setCompanies(companiesData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = selectedCompany === 'all' || user.company_id === selectedCompany;
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    
    return matchesSearch && matchesCompany && matchesRole;
  });

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setUsers(prev => prev.filter(user => user.id !== userId));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Users className="w-8 h-8 mr-3 text-purple-600" />
            Gestión Global de Usuarios
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Administra todos los usuarios del sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{users.length}</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Super Admins</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {users.filter(u => u.role === 'super_admin').length}
              </p>
            </div>
            <Shield className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Company Admins</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {users.filter(u => u.role === 'company_admin').length}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Operadores</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {users.filter(u => u.role === 'worker').length}
              </p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6 space-y-4 lg:space-y-0">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar usuarios por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas las empresas</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="company_admin">Company Admin</option>
                <option value="worker">Operador</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Cargando usuarios...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Usuario</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Empresa</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Rol</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Estado</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Último Acceso</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                            <Mail className="w-3 h-3" />
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {user.company?.name || 'Sistema'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {user.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(user.last_login || user.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        {user.id !== currentUser?.id && user.role !== 'super_admin' && (
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;