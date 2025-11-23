// frontend/src/hooks/useAuth.tsx
import { createContext, useContext, useState, useEffect } from 'react'
import { User } from '../types'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
  hasRole: (requiredRole: User['role']) => boolean
  isSuperAdmin: boolean
  isCompanyAdmin: boolean
  isWorker: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // ✅ URL del backend desde variable de entorno
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        if (!parsedUser.role) {
          parsedUser.role = 'worker'
        }
        setUser(parsedUser)
      } catch (error) {
        console.error('Error parsing user data:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const hasRole = (requiredRole: User['role']): boolean => {
    if (!user) return false
    
    const roleHierarchy = {
      'super_admin': 3,
      'company_admin': 2,
      'worker': 1
    }
    
    const userLevel = roleHierarchy[user.role] || 1
    const requiredLevel = roleHierarchy[requiredRole] || 1
    
    return userLevel >= requiredLevel
  }

  const isSuperAdmin = hasRole('super_admin')
  const isCompanyAdmin = hasRole('company_admin') || isSuperAdmin
  const isWorker = hasRole('worker') || isCompanyAdmin

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 Intentando login...', email)
      console.log('🌐 API URL:', API_URL)
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      console.log('📡 Respuesta del servidor:', response.status)

      if (!response.ok) {
        const errorData = await response.text()
        console.error('❌ Error del servidor:', errorData)
        throw new Error('Login failed - Server error')
      }

      const data = await response.json()
      console.log('✅ Datos recibidos:', data)
      
      const userData = {
        ...data.user,
        role: data.user.role || 'worker'
      }
      
      setUser(userData)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(userData))
      
      return true
      
    } catch (error) {
      console.error('❌ Error en login:', error)
      

      throw error
    }
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      console.log('📝 Intentando registro...', email)
      
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      })

      console.log('📡 Respuesta del servidor:', response.status)

      if (!response.ok) {
        if (response.status === 400) {
          console.log('👤 Usuario ya existe, intentando login...')
          return await login(email, password)
        }
        
        const errorData = await response.text()
        console.error('❌ Error del servidor:', errorData)
        throw new Error('Registration failed - Server error')
      }

      return await login(email, password)
    } catch (error) {
      console.error('❌ Error en registro:', error)
      
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    loading,
    hasRole,
    isSuperAdmin,
    isCompanyAdmin,
    isWorker
  }

  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}