import React from 'react'
import { useAuth } from '../hooks/useAuth'

interface LayoutProps {
  children: React.ReactNode
}

const LayoutTest: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar simple */}
      <nav className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Road Service Manager</h1>
          <div className="flex items-center space-x-4">
            <span>Hola, {user?.name}</span>
            <button 
              onClick={logout}
              className="bg-blue-700 px-3 py-1 rounded hover:bg-blue-800"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Navegación simple */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-4 py-2">
            <a href="/" className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded">Dashboard</a>
            <a href="/vehicles" className="px-3 py-2 text-gray-600 hover:bg-gray-50 rounded">Vehículos</a>
            <a href="/fuel" className="px-3 py-2 text-gray-600 hover:bg-gray-50 rounded">Combustible</a>
            <a href="/maintenance" className="px-3 py-2 text-gray-600 hover:bg-gray-50 rounded">Mantenimiento</a>
            <a href="/inventory" className="px-3 py-2 text-gray-600 hover:bg-gray-50 rounded">Inventario</a>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

export default LayoutTest