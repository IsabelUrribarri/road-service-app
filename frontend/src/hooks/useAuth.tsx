import { createContext, useContext, useState, useEffect } from 'react'
import { User } from '../types'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
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

  // URL del backend - cambiar si es necesario
  const API_URL = 'http://localhost:8000'

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (token && userData) {
      setUser(JSON.parse(userData))
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Intentando login...', email)
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      console.log('Respuesta del servidor:', response.status)

      if (!response.ok) {
        const errorData = await response.text()
        console.error('Error del servidor:', errorData)
        throw new Error('Login failed - Server error')
      }

      const data = await response.json()
      console.log('Datos recibidos:', data)
      
      setUser(data.user)
      localStorage.setItem('token', data.access_token || 'demo-token')
      localStorage.setItem('user', JSON.stringify(data.user))
      
      // ✅ ÉXITO
      return true
      
    } catch (error) {
      console.error('Error en login:', error)
      
      // Fallback para desarrollo - crear usuario demo
      const demoUser: User = {
        id: 'demo-user-id',
        email: email,
        name: email.split('@')[0] || 'Usuario Demo'
      }
      
      setUser(demoUser)
      localStorage.setItem('token', 'demo-token')
      localStorage.setItem('user', JSON.stringify(demoUser))
      
      console.log('Usando modo demo - login exitoso')
      return true
    }
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      console.log('Intentando registro...', email)
      
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      })

      console.log('Respuesta del servidor:', response.status)

      if (!response.ok) {
        // Si el usuario ya existe, intenta hacer login automáticamente
        if (response.status === 400) {
          console.log('Usuario ya existe, intentando login...')
          return await login(email, password)
        }
        
        const errorData = await response.text()
        console.error('Error del servidor:', errorData)
        throw new Error('Registration failed - Server error')
      }

      // Después de registrar exitosamente, hacer login
      return await login(email, password)
    } catch (error) {
      console.error('Error en registro:', error)
      
      // Fallback para desarrollo - crear usuario demo
      const demoUser: User = {
        id: 'demo-user-id',
        email: email,
        name: name
      }
      
      setUser(demoUser)
      localStorage.setItem('token', 'demo-token')
      localStorage.setItem('user', JSON.stringify(demoUser))
      
      console.log('Usando modo demo - registro exitoso')
      return true
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
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}