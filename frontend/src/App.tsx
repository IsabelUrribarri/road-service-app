import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './components/ui/toast'
import { ThemeProvider } from './contexts/ThemeContext'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Layout from './components/Layout'
import VehiclesPage from './components/VehiclesPage'
import FuelPage from './components/FuelPage'
import MaintenancePage from './components/MaintenancePage'
import InventoryPage from './components/InventoryPage'
import UserManagementPage from './components/UserManagementPage'
import SuperAdminDashboard from './components/AdminPanel/SuperAdminDashboard'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  
  return user ? <>{children}</> : <Navigate to="/login" />
}

// ✅ NUEVO: Ruta protegida por rol
const AdminRoute: React.FC<{ 
  children: React.ReactNode;
  requiredRole?: 'super_admin' | 'company_admin';
}> = ({ children, requiredRole = 'company_admin' }) => {
  const { user, loading, hasRole } = useAuth()
  
  if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  
  if (!user) return <Navigate to="/login" />
  
  if (!hasRole(requiredRole)) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚫</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Acceso Restringido
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              No tienes los permisos necesarios para acceder a esta sección.
            </p>
            <button 
              onClick={() => window.history.back()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Volver Atrás
            </button>
          </div>
        </div>
      </Layout>
    )
  }
  
  return <>{children}</>
}

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* ✅ RUTAS PRINCIPALES */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/vehicles" element={
          <ProtectedRoute>
            <Layout>
              <VehiclesPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/fuel" element={
          <ProtectedRoute>
            <Layout>
              <FuelPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/maintenance" element={
          <ProtectedRoute>
            <Layout>
              <MaintenancePage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/inventory" element={
          <ProtectedRoute>
            <Layout>
              <InventoryPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        {/* ✅ NUEVAS RUTAS DE ADMINISTRACIÓN */}
        
        {/* Gestión de Usuarios - Para Company Admin y Super Admin */}
        <Route path="/users" element={
          <AdminRoute requiredRole="company_admin">
            <Layout>
              <UserManagementPage />
            </Layout>
          </AdminRoute>
        } />
        
        {/* Panel de Super Admin - Solo para Super Admin */}
        <Route path="/admin" element={
          <AdminRoute requiredRole="super_admin">
            <Layout>
              <SuperAdminDashboard />
            </Layout>
          </AdminRoute>
        } />
        
        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="road-service-theme">
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App