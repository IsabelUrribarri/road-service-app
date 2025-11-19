import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Modal } from './ui/modal'
import { useToast } from './ui/toast'
import { Plus, Edit, Trash2, Car, Search, Filter, Download, TrendingUp, Settings } from 'lucide-react'
import { Vehicle } from '../types'

const VehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    unit_id: '',
    mechanic_name: '',
    model: '',
    total_miles: '',
    status: 'active'
  })

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8000/vehicles/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setVehicles(data)
      }
    } catch (error) {
      setVehicles([
        {
          id: '1',
          unit_id: 'VAN-001',
          mechanic_name: 'Carlos Rodríguez',
          model: 'Ford Transit 2021',
          total_miles: 12500,
          status: 'active',
          created_at: '2023-01-01'
        },
        {
          id: '2',
          unit_id: 'VAN-002',
          mechanic_name: 'María González',
          model: 'Mercedes Sprinter 2020',
          total_miles: 18900,
          status: 'active',
          created_at: '2023-01-01'
        },
        {
          id: '3',
          unit_id: 'TRUCK-001',
          mechanic_name: 'Roberto Silva',
          model: 'Ford F-150 2022',
          total_miles: 8900,
          status: 'maintenance',
          created_at: '2023-01-01'
        }
      ])
    }
  }

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.unit_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.mechanic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const vehicleData = {
        ...formData,
        total_miles: parseFloat(formData.total_miles)
      }

      if (editingVehicle) {
        setVehicles(prev => prev.map(v =>
          v.id === editingVehicle.id
            ? { ...v, ...vehicleData, total_miles: vehicleData.total_miles }
            : v
        ))
        addToast({
          title: 'Vehículo actualizado',
          description: `El vehículo ${vehicleData.unit_id} ha sido actualizado correctamente.`,
          variant: 'success'
        })
      } else {
        const newVehicle: Vehicle = {
          id: Date.now().toString(),
          ...vehicleData,
          total_miles: vehicleData.total_miles,
          created_at: new Date().toISOString()
        }
        setVehicles(prev => [...prev, newVehicle])
        addToast({
          title: 'Vehículo agregado',
          description: `El vehículo ${vehicleData.unit_id} ha sido agregado correctamente.`,
          variant: 'success'
        })
      }

      setIsModalOpen(false)
      resetForm()
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudo guardar el vehículo.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      unit_id: '',
      mechanic_name: '',
      model: '',
      total_miles: '',
      status: 'active'
    })
    setEditingVehicle(null)
  }

  const handleEdit = (vehicle: Vehicle) => {
    setFormData({
      unit_id: vehicle.unit_id,
      mechanic_name: vehicle.mechanic_name,
      model: vehicle.model,
      total_miles: vehicle.total_miles.toString(),
      status: vehicle.status
    })
    setEditingVehicle(vehicle)
    setIsModalOpen(true)
  }

  const handleDelete = (vehicleId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este vehículo?')) {
      setVehicles(prev => prev.filter(v => v.id !== vehicleId))
      addToast({
        title: 'Vehículo eliminado',
        description: 'El vehículo ha sido eliminado correctamente.',
        variant: 'success'
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Gestión de Vehículos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Administra tu flota vehicular y asigna mecánicos
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Vehículo</span>
          </Button>
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Total Vehículos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{vehicles.length}</p>
              </div>
              <Car className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">Vehículos Activos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {vehicles.filter(v => v.status === 'active').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">En Mantenimiento</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {vehicles.filter(v => v.status === 'maintenance').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-500/10 to-gray-600/5 border-gray-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Millas Totales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {vehicles.reduce((sum, v) => sum + v.total_miles, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar vehículos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="inactive">Inactivo</option>
            </select>
            <Button variant="outline" className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filtrar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            Lista de Vehículos ({filteredVehicles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">ID Unidad</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Mecánico</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Modelo</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Millas</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Estado</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <Car className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{vehicle.unit_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900 dark:text-white font-medium">{vehicle.mechanic_name}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900 dark:text-white">{vehicle.model}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900 dark:text-white font-medium">{vehicle.total_miles.toLocaleString()} millas</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${vehicle.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : vehicle.status === 'maintenance'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        {vehicle.status === 'active' ? 'Activo' : vehicle.status === 'maintenance' ? 'Mantenimiento' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(vehicle)}
                          className="flex items-center space-x-1 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Editar</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(vehicle.id)}
                          className="flex items-center space-x-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Eliminar</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredVehicles.length === 0 && (
              <div className="text-center py-12">
                <Car className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No se encontraron vehículos</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Intenta ajustar los filtros de búsqueda'
                    : 'Comienza agregando tu primer vehículo'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center space-x-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Agregar Primer Vehículo</span>
                </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal para agregar/editar vehículo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
title={editingVehicle ? 'Editar Vehículo' : 'Agregar Nuevo Vehículo'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                ID de Unidad *
              </label>
              <input
                type="text"
                required
                value={formData.unit_id}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_id: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Ej: VAN-001"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Nombre del Mecánico *
              </label>
              <input
                type="text"
                required
                value={formData.mechanic_name}
                onChange={(e) => setFormData(prev => ({ ...prev, mechanic_name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Ej: Carlos Rodríguez"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Modelo del Vehículo *
              </label>
              <input
                type="text"
                required
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Ej: Ford Transit 2021"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Millas Totales *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.total_miles}
                onChange={(e) => setFormData(prev => ({ ...prev, total_miles: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Ej: 12500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Estado del Vehículo
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="relative flex cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={formData.status === 'active'}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="sr-only"
                  />
                  <div className={`w-full p-4 border-2 rounded-xl text-center transition-all duration-200 ${formData.status === 'active'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                    }`}>
                    <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                    <span className="font-medium">Activo</span>
                  </div>
                </label>

                <label className="relative flex cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="maintenance"
                    checked={formData.status === 'maintenance'}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="sr-only"
                  />
                  <div className={`w-full p-4 border-2 rounded-xl text-center transition-all duration-200 ${formData.status === 'maintenance'
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                    }`}>
                    <div className="w-3 h-3 bg-orange-500 rounded-full mx-auto mb-2"></div>
                    <span className="font-medium">Mantenimiento</span>
                  </div>
                </label>

                <label className="relative flex cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={formData.status === 'inactive'}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="sr-only"
                  />
                  <div className={`w-full p-4 border-2 rounded-xl text-center transition-all duration-200 ${formData.status === 'inactive'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                    }`}>
                    <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-2"></div>
                    <span className="font-medium">Inactivo</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false)
                resetForm()
              }}
              className="px-6 py-2.5"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Guardando...</span>
                </div>
              ) : (
                editingVehicle ? 'Actualizar Vehículo' : 'Agregar Vehículo'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default VehiclesPage