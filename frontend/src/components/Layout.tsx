import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Link, useLocation } from 'react-router-dom'
import { ThemeToggle } from './ui/theme-toggle'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/', current: location.pathname === '/' },
    { name: 'Vehículos', href: '/vehicles', current: location.pathname === '/vehicles' },
    { name: 'Combustible', href: '/fuel', current: location.pathname === '/fuel' },
    { name: 'Mantenimiento', href: '/maintenance', current: location.pathname === '/maintenance' },
    { name: 'Inventario', href: '/inventory', current: location.pathname === '/inventory' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="bg-card/80 backdrop-blur-md border-b border-border/60 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Road Service Manager
                </h1>
              </div>
              {/* Desktop Navigation */}
              <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg mx-1 ${item.current
                        ? 'bg-primary/10 text-primary shadow-sm border border-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
                      }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="hidden sm:flex sm:items-center space-x-4 ml-12">
              <ThemeToggle />
              <div className="flex items-center space-x-3 bg-accent/50 rounded-lg px-3 py-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-foreground font-medium">Hola, {user?.name}</span>
              </div>
              <button
                onClick={logout}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-accent/50 border border-transparent hover:border-border"
              >
                Cerrar Sesión
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="sm:hidden flex items-center space-x-2">
              <ThemeToggle />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors border border-transparent"
              >
                <span className="sr-only">Abrir menú principal</span>
                {isMobileMenuOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden bg-card/95 backdrop-blur-md border-t border-border/60 animate-fade-in">
            <div className="pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block pl-4 pr-4 py-3 text-base font-medium transition-colors border-l-4 mx-2 rounded-r-lg ${item.current
                      ? 'bg-primary/10 text-primary border-primary shadow-sm'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`}
                >
                  {item.name}
                </Link>
              ))}

              <div className="pt-4 pb-3 border-t border-border/60 mx-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2 bg-accent/50 rounded-lg px-3 py-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="text-sm font-medium text-foreground">{user?.name}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout()
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full text-left text-sm text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors border border-transparent hover:border-border"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card/50 border-t border-border/60 mt-20">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              © 2025 Road Service Manager. Sistema de gestión profesional para compañías de road service.
            </p>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span className="flex items-center space-x-1 bg-green-500/10 px-2 py-1 rounded-full">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span className="text-green-700 dark:text-green-400 font-medium">Sistema en línea</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout