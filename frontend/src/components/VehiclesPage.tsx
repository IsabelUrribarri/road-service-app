import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Modal } from './ui/modal'
import { useToast } from './ui/toast'
import { Plus, Edit, Trash2, Car } from 'lucide-react'
import { Vehicle } from '../types'

const VehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    unit_id: '',
    mechanic_name: '',
    model: '',
    total_miles: '',
    status: 'active'
  })

  // Cargar vehículos
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
      // Datos de ejemplo para desarrollo
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
        }
      ])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const vehicleData = {
        ...formData,
        total_miles: parseFloat(formData.total_miles)
      }

      // Simular API call
      if (editingVehicle) {
        // Editar vehículo existente
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
        // Agregar nuevo vehículo
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Gestión de Vehículos
          </h1>
          <p className="text-muted-foreground mt-2">
            Administra la flota vehicular y asigna mecánicos
          </p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Agregar Vehículo</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Vehículos</p>
                <p className="text-2xl font-bold text-foreground">{vehicles.length}</p>
              </div>
              <Car className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-6">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Vehículos Activos</p>
              <p className="text-2xl font-bold text-foreground">
                {vehicles.filter(v => v.status === 'active').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-6">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">En Mantenimiento</p>
              <p className="text-2xl font-bold text-foreground">
                {vehicles.filter(v => v.status === 'maintenance').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Lista de Vehículos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">ID Unidad</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Mecánico</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Modelo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Millas</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Estado</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                    <td className="py-3 px-4 text-foreground font-medium">{vehicle.unit_id}</td>
                    <td className="py-3 px-4 text-foreground">{vehicle.mechanic_name}</td>
                    <td className="py-3 px-4 text-foreground">{vehicle.model}</td>
                    <td className="py-3 px-4 text-foreground">{vehicle.total_miles.toLocaleString()} millas</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        vehicle.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {vehicle.status === 'active' ? 'Activo' : 'Mantenimiento'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(vehicle)}
                          className="flex items-center space-x-1"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Editar</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(vehicle.id)}
                          className="flex items-center space-x-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                ID de Unidad *
              </label>
              <input
                type="text"
                required
                value={formData.unit_id}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_id: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ej: VAN-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nombre del Mecánico *
              </label>
              <input
                type="text"
                required
                value={formData.mechanic_name}
                onChange={(e) => setFormData(prev => ({ ...prev, mechanic_name: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ej: Carlos Rodríguez"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Modelo del Vehículo *
              </label>
              <input
                type="text"
                required
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ej: Ford Transit 2021"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Millas Totales *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.total_miles}
                onChange={(e) => setFormData(prev => ({ ...prev, total_miles: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ej: 12500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="active">Activo</option>
                <option value="maintenance">En Mantenimiento</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (editingVehicle ? 'Actualizar' : 'Agregar')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default VehiclesPage