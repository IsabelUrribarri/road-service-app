import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Link, useLocation } from 'react-router-dom'
import { ThemeToggle } from './ui/theme-toggle'
import { RoleBadge } from './ui/role-badge'
import { 
  Car, LogOut, Menu, X, Shield, Wrench, Fuel, Package, 
  Users, Building, MoreVertical
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isSuperAdmin, isCompanyAdmin } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false)
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/', current: location.pathname === '/', icon: Shield },
    { name: 'Vehículos', href: '/vehicles', current: location.pathname.startsWith('/vehicles'), icon: Car },
    { name: 'Combustible', href: '/fuel', current: location.pathname.startsWith('/fuel'), icon: Fuel },
    { name: 'Mantenimiento', href: '/maintenance', current: location.pathname.startsWith('/maintenance'), icon: Wrench },
    { name: 'Inventario', href: '/inventory', current: location.pathname.startsWith('/inventory'), icon: Package },
  ]

  const adminNavigation = [
    ...(isCompanyAdmin ? [
      { name: 'Usuarios', href: '/users', current: location.pathname.startsWith('/users'), icon: Users }
    ] : []),
    ...(isSuperAdmin ? [
      { name: 'Empresas', href: '/admin', current: location.pathname.startsWith('/admin'), icon: Building }
    ] : [])
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-gray-800 text-foreground">
      {/* Navigation - CON BORDES REDONDEADOS */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-700/60 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4">
          <div className="flex justify-between h-16">
            {/* Logo y Brand - CON BORDES REDONDEADOS */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Car className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Road Service
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">Professional Manager</p>
                  </div>
                </div>
              </div>
              
              {/* Desktop Navigation - CON BORDES REDONDEADOS */}
              <div className="hidden sm:ml-4 sm:flex sm:space-x-0">
                {navigation.map((item) => {
                  const IconComponent = item.icon;
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-2 py-1.5 text-xs font-medium transition-all duration-200 rounded-lg mx-0.5 ${
                        item.current
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <IconComponent className="w-3 h-3 mr-1" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* User Section - CON BORDES REDONDEADOS */}
            <div className="hidden sm:flex sm:items-center space-x-1">
              <ThemeToggle />
              
              {/* User Info - CON BORDES REDONDEADOS */}
              <div className="flex items-center space-x-1 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg px-1.5 py-0.5 border border-green-200 dark:border-green-800">
                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-700 dark:text-gray-200 whitespace-nowrap">
                  <span className="font-medium">{user?.name}</span>
                </span>
                {user && <RoleBadge role={user.role} />}
              </div>

              {/* Menú Hamburguesa para Admin - CON BORDES REDONDEADOS Y ABRE HACIA ABAJO */}
              {adminNavigation.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                    className="flex items-center space-x-1 px-1.5 py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200"
                  >
                    <MoreVertical className="w-3 h-3" />
                    <span>Admin</span>
                  </button>

                  {/* Dropdown Menu Admin - SE ABRE HACIA ABAJO */}
                  {isAdminMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                      {adminNavigation.map((item) => {
                        const IconComponent = item.icon;
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setIsAdminMenuOpen(false)}
                            className={`flex items-center px-2 py-1.5 text-xs transition-colors rounded-lg mx-1 ${
                              item.current
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <IconComponent className="w-3 h-3 mr-1.5" />
                            {item.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={logout}
                className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors px-1.5 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-800"
              >
                <LogOut className="w-3 h-3" />
                <span>Salir</span>
              </button>
            </div>

            {/* Mobile menu button - CON BORDES REDONDEADOS */}
            <div className="sm:hidden flex items-center space-x-1">
              <ThemeToggle />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 border border-gray-200 dark:border-gray-700"
              >
                <span className="sr-only">Abrir menú principal</span>
                {isMobileMenuOpen ? (
                  <X className="block h-4 w-4" />
                ) : (
                  <Menu className="block h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu - CON BORDES REDONDEADOS */}
        {isMobileMenuOpen && (
          <div className="sm:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/60 dark:border-gray-700/60">
            <div className="pt-1 pb-2 space-y-0">
              {/* Navegación Principal Mobile - CON BORDES REDONDEADOS */}
              {navigation.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-2 py-1.5 text-xs font-medium transition-all duration-200 mx-1 rounded-lg ${
                      item.current
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <IconComponent className="w-3 h-3 mr-2" />
                    {item.name}
                  </Link>
                )
              })}

              {/* Separador Admin en Mobile */}
              {adminNavigation.length > 0 && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 mx-2 my-1"></div>
                  <div className="px-2 py-0.5">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Admin
                    </span>
                  </div>
                  {adminNavigation.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center px-2 py-1.5 text-xs font-medium transition-all duration-200 mx-1 rounded-lg ${
                          item.current
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <IconComponent className="w-3 h-3 mr-2" />
                        {item.name}
                      </Link>
                    )
                  })}
                </>
              )}
              
              {/* User Info Mobile - CON BORDES REDONDEADOS */}
              <div className="pt-2 pb-1 border-t border-gray-200/60 dark:border-gray-700/60 mx-2">
                <div className="flex items-center space-x-1.5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg px-2 py-1.5 mb-1">
                  <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-200">
                    <div className="font-semibold">{user?.name}</div>
                    <div className="flex items-center space-x-1 mt-0.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Activo</span>
                      {user && <RoleBadge role={user.role} />}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout()
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex items-center space-x-1 w-full text-left text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-1.5 px-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-2 sm:px-3 lg:px-4">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      {/* Footer - RESTAURADO AL ORIGINAL */}
      <footer className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/60 dark:border-gray-700/60 mt-20">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start space-x-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Car className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Road Service Manager
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                Sistema de gestión profesional para compañías de road service. 
                Optimiza tu flota vehicular con herramientas avanzadas.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-6">
              <div className="flex items-center space-x-4 text-sm">
                <span className="flex items-center space-x-2 bg-green-500/10 px-3 py-2 rounded-full border border-green-200 dark:border-green-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-700 dark:text-green-400 font-semibold">Sistema en línea</span>
                </span>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span className="text-gray-600 dark:text-gray-300 font-medium">
                  v2.1.0
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200/60 dark:border-gray-700/60">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              © 2025 Road Service Manager. Todos los derechos reservados. 
              <span className="block sm:inline"> Desarrollado para optimizar tu operación vehicular.</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout