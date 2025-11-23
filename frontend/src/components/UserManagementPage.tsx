// frontend/src/components/UserManagementPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, UserWithCompany, UserStatus } from '../types';
import { apiService } from '../services/api';
import { RoleBadge } from './ui/role-badge';
import { 
  Users, Plus, Search, Edit, Trash2, Shield, 
  Mail, Calendar, User as UserIcon 
} from 'lucide-react';

const UserManagementPage: React.FC = () => {
  const { user: currentUser, isCompanyAdmin, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithCompany | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('📋 Obteniendo lista de usuarios...');
      const usersData = await apiService.getUsers();
      console.log('✅ Usuarios obtenidos:', usersData);
      setUsers(usersData);
    } catch (error: any) {
      console.error('❌ Error fetching users:', error);
      
      // Mostrar error específico
      if (error.message.includes('401') || error.message.includes('403')) {
        alert('Error de autenticación. Por favor, inicia sesión nuevamente.');
        return;
      }
      
      // Datos de ejemplo para desarrollo (solo si es error 404 u otro)
      if (error.message.includes('404')) {
        console.log('⚠️ Usando datos de demostración (backend no disponible)');
        const demoUsers: UserWithCompany[] = [
          {
            id: 'user-1',
            email: 'admin@empresa.com',
            name: 'Administrador Principal',
            role: 'company_admin',
            company_id: 'company-1',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            last_login: '2024-01-20T10:30:00Z'
          },
          {
            id: 'user-2',
            email: 'operador1@empresa.com',
            name: 'Juan Pérez',
            role: 'worker',
            company_id: 'company-1',
            status: 'active',
            created_at: '2024-01-05T00:00:00Z',
            last_login: '2024-01-19T15:45:00Z'
          }
        ];
        setUsers(demoUsers);
      } else {
        alert(`Error cargando usuarios: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && (isSuperAdmin || isCompanyAdmin)) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [currentUser, isSuperAdmin, isCompanyAdmin]);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInviteUser = async (userData: { name: string; email: string; role: User['role'] }) => {
  try {
    console.log('🔍 Debug - currentUser:', currentUser);
    console.log('🔍 Debug - company_id:', currentUser?.company_id);
    
    const inviteData = {
      ...userData,
      company_id: currentUser?.company_id
    };
    
    console.log('🔍 Debug - Datos de invitación:', inviteData);
    
    await apiService.inviteUser(inviteData);
    alert('✅ Usuario invitado exitosamente');
    setShowInviteModal(false);
    fetchUsers();
  } catch (error) {
    console.error('Error inviting user:', error);
    alert('❌ Error enviando invitación');
  }
};

  const handleEditUser = async (userId: string, userData: any) => {
    try {
      console.log('📝 Actualizando usuario:', userId, userData);
      
      // Preparar datos para la API - solo enviar campos permitidos
      const updateData = {
        name: userData.name,
        role: userData.role,
        status: userData.status
      };

      const updatedUser = await apiService.updateUser(userId, updateData);
      
      // Actualizar el estado local
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...updatedUser } : user
      ));
      
      setEditingUser(null);
      alert('✅ Usuario actualizado exitosamente');
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(`❌ Error actualizando usuario: ${error.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;

    try {
      await apiService.deleteUser(userId);
      setUsers(prev => prev.filter(user => user.id !== userId));
      alert('✅ Usuario eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('❌ Error eliminando usuario');
    }
  };

  // Permitir acceso a super_admin y company_admin
  if (!isCompanyAdmin && !isSuperAdmin) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Acceso Restringido
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            No tienes permisos para acceder a la gestión de usuarios.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <Users className="w-8 h-8 mr-3 text-blue-600" />
              Gestión de Usuarios
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Administra los usuarios de tu empresa
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-colors shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-5 h-5" />
            <span>Invitar Usuario</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{users.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Activos</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {users.filter(u => u.status === 'active').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Administradores</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {users.filter(u => u.role === 'company_admin' || u.role === 'super_admin').length}
              </p>
            </div>
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Operadores</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {users.filter(u => u.role === 'worker').length}
              </p>
            </div>
            <UserIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
        <div className="flex items-center space-x-4">
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
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Cargando usuarios...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Usuario</th>
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
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
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
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : user.status === 'inactive'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {user.status === 'active' ? 'Activo' : 
                         user.status === 'inactive' ? 'Inactivo' : 'Suspendido'}
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
                        <button 
                          onClick={() => setEditingUser(user)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {user.id !== currentUser?.id && (
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
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No se encontraron usuarios</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para invitar usuario */}
      {showInviteModal && (
        <InviteUserModal 
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInviteUser}
        />
      )}

      {/* Modal para editar usuario */}
      {editingUser && (
        <EditUserModal 
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleEditUser}
        />
      )}
    </div>
  );
};

// Modal para invitar usuario
const InviteUserModal: React.FC<{ 
  onClose: () => void; 
  onInvite: (userData: any) => void 
}> = ({ onClose, onInvite }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'worker' as User['role']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInvite(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-auto">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Invitar Nuevo Usuario
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre Completo
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="usuario@empresa.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rol
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="worker">Operador</option>
              <option value="company_admin">Administrador</option>
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
              Invitar Usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para editar usuario
const EditUserModal: React.FC<{ 
  user: UserWithCompany;
  onClose: () => void;
  onSave: (userId: string, userData: any) => void;
}> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    role: user.role,
    status: user.status as UserStatus
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📤 Enviando datos:', formData);
    onSave(user.id, formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-auto">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Editar Usuario
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre Completo
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
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
            />
            <p className="text-xs text-gray-500 mt-1">El email no se puede modificar</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rol
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="worker">Operador</option>
              <option value="company_admin">Administrador</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estado
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="suspended">Suspendido</option>
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

export default UserManagementPage;