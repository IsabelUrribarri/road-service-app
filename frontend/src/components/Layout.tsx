import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Link, useLocation } from 'react-router-dom'
import { ThemeToggle } from './ui/theme-toggle'
import { Car, LogOut, Menu, X, Shield, Wrench, Fuel, Package } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/', current: location.pathname === '/', icon: Shield },
    { name: 'Vehículos', href: '/vehicles', current: location.pathname === '/vehicles', icon: Car },
    { name: 'Combustible', href: '/fuel', current: location.pathname === '/fuel', icon: Fuel },
    { name: 'Mantenimiento', href: '/maintenance', current: location.pathname === '/maintenance', icon: Wrench },
    { name: 'Inventario', href: '/inventory', current: location.pathname === '/inventory', icon: Package },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-gray-800 text-foreground">
      {/* Navigation - Mejorada */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-700/60 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo y Brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Car className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Road Service
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">Professional Manager</p>
                  </div>
                </div>
              </div>
              
              {/* Desktop Navigation - Mejorada */}
              <div className="hidden sm:ml-10 sm:flex sm:space-x-1">
                {navigation.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-4 py-2.5 text-sm font-semibold transition-all duration-200 rounded-xl mx-1 ${
                        item.current
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                      }`}
                    >
                      {typeof IconComponent === 'string' ? (
                        <span className="mr-2">{IconComponent}</span>
                      ) : (
                        <IconComponent className="w-4 h-4 mr-2" />
                      )}
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* User Section - Mejorada */}
            <div className="hidden sm:flex sm:items-center space-x-4 ml-16">
              <ThemeToggle />
              <div className="flex items-center space-x-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl px-4 py-2 border border-green-200 dark:border-green-800 shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Hola, <span className="font-semibold">{user?.name}</span>
                </span>
              </div>
              <button
                onClick={logout}
                className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-800"
              >
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            </div>

            {/* Mobile menu button - Mejorado */}
            <div className="sm:hidden flex items-center space-x-3">
              <ThemeToggle />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 border border-gray-200 dark:border-gray-700"
              >
                <span className="sr-only">Abrir menú principal</span>
                {isMobileMenuOpen ? (
                  <X className="block h-5 w-5" />
                ) : (
                  <Menu className="block h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu - Mejorado */}
        {isMobileMenuOpen && (
          <div className="sm:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/60 dark:border-gray-700/60 animate-fade-in">
            <div className="pt-2 pb-4 space-y-1">
              {navigation.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center pl-4 pr-4 py-3 text-base font-medium transition-all duration-200 mx-2 rounded-xl ${
                      item.current
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {typeof IconComponent === 'string' ? (
                      <span className="mr-3 text-lg">{IconComponent}</span>
                    ) : (
                      <IconComponent className="w-5 h-5 mr-3" />
                    )}
                    {item.name}
                  </Link>
                )
              })}
              
              {/* User Info Mobile - Mejorado */}
              <div className="pt-4 pb-3 border-t border-gray-200/60 dark:border-gray-700/60 mx-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl px-4 py-3 w-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      <div className="font-semibold">{user?.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Usuario activo</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout()
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex items-center space-x-2 w-full text-left text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-3 px-4 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      {/* Footer - Mejorado */}
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