import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Car, Wrench, Fuel } from 'lucide-react'

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, login, register } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        await login(email, password)
        navigate('/')
      } else {
        await register(name, email, password)
        navigate('/')
      }
    } catch (error) {
      alert('Error: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium text-lg">Redirigiendo al dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-800 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"></div>

      {/* Floating Icons */}
      <div className="absolute top-20 left-20 text-blue-200 dark:text-blue-800 animate-float">
        <Car className="w-12 h-12" />
      </div>
      <div className="absolute bottom-20 right-20 text-indigo-200 dark:text-indigo-800 animate-float" style={{ animationDelay: '2s' }}>
        <Wrench className="w-10 h-10" />
      </div>
      <div className="absolute top-1/3 right-1/4 text-green-200 dark:text-green-800 animate-float" style={{ animationDelay: '4s' }}>
        <Fuel className="w-8 h-8" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Car className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Road Service
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Sistema de gestión profesional
          </p>
        </div>

        <Card className="w-full shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {isLogin ? 'Bienvenido de vuelta' : 'Crear cuenta'}
            </CardTitle>
            <p className="text-gray-500 dark:text-gray-400">
              {isLogin ? 'Ingresa a tu cuenta' : 'Comienza a gestionar tu flota'}
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Procesando...</span>
                  </div>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>

              <div className="text-center pt-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  ¿No tienes cuenta? El registro es por invitación.
                  <br />
                  Contacta al administrador de tu empresa.
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Login