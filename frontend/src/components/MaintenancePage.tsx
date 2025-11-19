import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Modal } from './ui/modal'
import { useToast } from './ui/toast'
import { Plus, Edit, Trash2, Wrench, Calendar, AlertTriangle, CheckCircle } from 'lucide-react'
import { Maintenance, Vehicle } from '../types'
import { formatCurrency, formatDate } from '../lib/utils'

const MaintenancePage: React.FC = () => {
  const [maintenanceRecords, setMaintenanceRecords] = useState<Maintenance[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Maintenance | null>(null)
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    vehicle_id: '',
    date: new Date().toISOString().split('T')[0],
    service_type: '',
    description: '',
    cost: '',
    next_service_date: ''
  })

  // Cargar datos
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    // Datos de ejemplo para desarrollo
    const sampleVehicles: Vehicle[] = [
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
    ]

    const sampleMaintenance: Maintenance[] = [
      {
        id: '1',
        vehicle_id: '1',
        date: '2024-01-15',
        service_type: 'Cambio de Aceite',
        description: 'Cambio de aceite sintético y filtro',
        cost: 85.00,
        next_service_date: '2024-04-15',
        created_at: '2024-01-15'
      },
      {
        id: '2',
        vehicle_id: '2',
        date: '2024-01-10',
        service_type: 'Rotación de Llantas',
        description: 'Rotación y balanceo de llantas',
        cost: 45.00,
        next_service_date: '2024-07-10',
        created_at: '2024-01-10'
      },
      {
        id: '3',
        vehicle_id: '1',
        date: '2024-01-05',
        service_type: 'Frenos',
        description: 'Cambio de pastillas de freno delanteras',
        cost: 120.00,
        next_service_date: '2024-07-05',
        created_at: '2024-01-05'
      }
    ]

    setVehicles(sampleVehicles)
    setMaintenanceRecords(sampleMaintenance)
  }

  // Cálculos de métricas
  const calculateMetrics = () => {
    const currentDate = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(currentDate.getDate() + 30)

    const upcomingMaintenance = maintenanceRecords.filter(record => {
      const nextServiceDate = new Date(record.next_service_date)
      return nextServiceDate <= thirtyDaysFromNow && nextServiceDate >= currentDate
    })

    const overdueMaintenance = maintenanceRecords.filter(record => {
      const nextServiceDate = new Date(record.next_service_date)
      return nextServiceDate < currentDate
    })

    const totalSpent = maintenanceRecords.reduce((sum, record) => sum + record.cost, 0)
    const monthlySpent = maintenanceRecords
      .filter(record => {
        const recordDate = new Date(record.date)
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear
      })
      .reduce((sum, record) => sum + record.cost, 0)

    return {
      totalSpent,
      monthlySpent,
      upcomingCount: upcomingMaintenance.length,
      overdueCount: overdueMaintenance.length,
      upcomingMaintenance,
      overdueMaintenance
    }
  }

  const metrics = calculateMetrics()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const maintenanceData = {
        ...formData,
        cost: parseFloat(formData.cost)
      }

      if (editingRecord) {
        // Editar registro existente
        setMaintenanceRecords(prev => prev.map(r => 
          r.id === editingRecord.id 
            ? { ...r, ...maintenanceData, cost: maintenanceData.cost }
            : r
        ))
        addToast({
          title: 'Mantenimiento actualizado',
          description: 'El registro de mantenimiento ha sido actualizado correctamente.',
          variant: 'success'
        })
      } else {
        // Agregar nuevo registro
        const newRecord: Maintenance = {
          id: Date.now().toString(),
          ...maintenanceData,
          cost: maintenanceData.cost,
          created_at: new Date().toISOString()
        }
        setMaintenanceRecords(prev => [...prev, newRecord])
        addToast({
          title: 'Mantenimiento agregado',
          description: 'El registro de mantenimiento ha sido agregado correctamente.',
          variant: 'success'
        })
      }

      setIsModalOpen(false)
      resetForm()
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudo guardar el registro.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      date: new Date().toISOString().split('T')[0],
      service_type: '',
      description: '',
      cost: '',
      next_service_date: ''
    })
    setEditingRecord(null)
  }

  const handleEdit = (record: Maintenance) => {
    setFormData({
      vehicle_id: record.vehicle_id,
      date: record.date,
      service_type: record.service_type,
      description: record.description,
      cost: record.cost.toString(),
      next_service_date: record.next_service_date
    })
    setEditingRecord(record)
    setIsModalOpen(true)
  }

  const handleDelete = (recordId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este registro?')) {
      setMaintenanceRecords(prev => prev.filter(r => r.id !== recordId))
      addToast({
        title: 'Registro eliminado',
        description: 'El registro de mantenimiento ha sido eliminado correctamente.',
        variant: 'success'
      })
    }
  }

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    return vehicle ? `${vehicle.unit_id} - ${vehicle.mechanic_name}` : 'Vehículo no encontrado'
  }

  const isUpcoming = (date: string) => {
    const serviceDate = new Date(date)
    const currentDate = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(currentDate.getDate() + 30)
    return serviceDate <= thirtyDaysFromNow && serviceDate >= currentDate
  }

  const isOverdue = (date: string) => {
    return new Date(date) < new Date()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Mantenimiento de Vehículos
          </h1>
          <p className="text-muted-foreground mt-2">
            Programa y realiza seguimiento del mantenimiento preventivo
          </p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Mantenimiento</span>
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Gasto Total</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(metrics.totalSpent)}
                </p>
              </div>
              <Wrench className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Gasto Este Mes</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(metrics.monthlySpent)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Próximos</p>
                <p className="text-2xl font-bold text-foreground">
                  {metrics.upcomingCount}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Vencidos</p>
                <p className="text-2xl font-bold text-foreground">
                  {metrics.overdueCount}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Mantenimientos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <span>Próximos Mantenimientos (30 días)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.upcomingMaintenance.map((record) => (
                <div
                  key={record.id}
                  className="p-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-foreground">{record.service_type}</p>
                      <p className="text-sm text-muted-foreground">{getVehicleName(record.vehicle_id)}</p>
                    </div>
                    <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                      {formatDate(record.next_service_date)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{record.description}</p>
                </div>
              ))}
              {metrics.upcomingMaintenance.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No hay mantenimientos programados para los próximos 30 días
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mantenimientos Vencidos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Mantenimientos Vencidos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.overdueMaintenance.map((record) => (
                <div
                  key={record.id}
                  className="p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-foreground">{record.service_type}</p>
                      <p className="text-sm text-muted-foreground">{getVehicleName(record.vehicle_id)}</p>
                    </div>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      {formatDate(record.next_service_date)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{record.description}</p>
                </div>
              ))}
              {metrics.overdueMaintenance.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No hay mantenimientos vencidos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Historial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Historial de Mantenimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Fecha</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Vehículo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Tipo de Servicio</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Descripción</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Costo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Próximo Servicio</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Estado</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceRecords.map((record) => (
                  <tr key={record.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                    <td className="py-3 px-4 text-foreground">{formatDate(record.date)}</td>
                    <td className="py-3 px-4 text-foreground">{getVehicleName(record.vehicle_id)}</td>
                    <td className="py-3 px-4 text-foreground font-medium">{record.service_type}</td>
                    <td className="py-3 px-4 text-foreground max-w-xs truncate">{record.description}</td>
                    <td className="py-3 px-4 text-foreground">{formatCurrency(record.cost)}</td>
                    <td className="py-3 px-4 text-foreground">{formatDate(record.next_service_date)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isOverdue(record.next_service_date)
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          : isUpcoming(record.next_service_date)
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {isOverdue(record.next_service_date) && 'Vencido'}
                        {isUpcoming(record.next_service_date) && 'Próximo'}
                        {!isOverdue(record.next_service_date) && !isUpcoming(record.next_service_date) && 'Al día'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(record)}
                          className="flex items-center space-x-1"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Editar</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
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

      {/* Modal para agregar/editar mantenimiento */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingRecord ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Vehículo *
              </label>
              <select
                required
                value={formData.vehicle_id}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_id: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Seleccionar vehículo</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.unit_id} - {vehicle.mechanic_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Fecha del Servicio *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Tipo de Servicio *
              </label>
              <select
                required
                value={formData.service_type}
                onChange={(e) => setFormData(prev => ({ ...prev, service_type: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Seleccionar tipo de servicio</option>
                <option value="Cambio de Aceite">Cambio de Aceite</option>
                <option value="Rotación de Llantas">Rotación de Llantas</option>
                <option value="Frenos">Frenos</option>
                <option value="Alineación">Alineación</option>
                <option value="Balanceo">Balanceo</option>
                <option value="Cambio de Filtros">Cambio de Filtros</option>
                <option value="Revisión General">Revisión General</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Descripción *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Describe los trabajos realizados..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Costo ($) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ej: 85.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Próximo Servicio *
              </label>
              <input
                type="date"
                required
                value={formData.next_service_date}
                onChange={(e) => setFormData(prev => ({ ...prev, next_service_date: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
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
              {loading ? 'Guardando...' : (editingRecord ? 'Actualizar' : 'Agregar')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default MaintenancePage