import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Modal } from './ui/modal'
import { useToast } from './ui/toast'
import { Plus, Edit, Trash2, Fuel, TrendingUp, DollarSign, BarChart3 } from 'lucide-react'
import { FuelRecord, Vehicle } from '../types'
import { formatCurrency } from '../lib/utils'

const FuelPage: React.FC = () => {
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FuelRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    vehicle_id: '',
    date: new Date().toISOString().split('T')[0],
    fuel_amount: '',
    fuel_price: '',
    miles_driven: ''
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

    const sampleFuelRecords: FuelRecord[] = [
      {
        id: '1',
        vehicle_id: '1',
        date: '2024-01-15',
        fuel_amount: 45.0,
        fuel_price: 1.25,
        total_cost: 56.25,
        miles_driven: 320,
        consumption: 7.1,
        created_at: '2024-01-15'
      },
      {
        id: '2',
        vehicle_id: '2',
        date: '2024-01-14',
        fuel_amount: 38.0,
        fuel_price: 1.28,
        total_cost: 48.64,
        miles_driven: 310,
        consumption: 8.2,
        created_at: '2024-01-14'
      },
      {
        id: '3',
        vehicle_id: '1',
        date: '2024-01-10',
        fuel_amount: 42.0,
        fuel_price: 1.22,
        total_cost: 51.24,
        miles_driven: 300,
        consumption: 7.1,
        created_at: '2024-01-10'
      }
    ]

    setVehicles(sampleVehicles)
    setFuelRecords(sampleFuelRecords)
  }

  // Cálculos de métricas
  const calculateMetrics = () => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    const monthlyRecords = fuelRecords.filter(record => {
      const recordDate = new Date(record.date)
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear
    })

    const totalFuel = monthlyRecords.reduce((sum, record) => sum + record.fuel_amount, 0)
    const totalMiles = monthlyRecords.reduce((sum, record) => sum + record.miles_driven, 0)
    const totalCost = monthlyRecords.reduce((sum, record) => sum + record.total_cost, 0)

    const averageConsumption = totalMiles / totalFuel
    const costPerMile = totalCost / totalMiles

    // Consumo por vehículo
    const consumptionByVehicle = vehicles.map(vehicle => {
      const vehicleRecords = fuelRecords.filter(record => record.vehicle_id === vehicle.id)
      const vehicleTotalMiles = vehicleRecords.reduce((sum, record) => sum + record.miles_driven, 0)
      const vehicleTotalFuel = vehicleRecords.reduce((sum, record) => sum + record.fuel_amount, 0)
      const avgConsumption = vehicleTotalMiles / vehicleTotalFuel

      return {
        vehicle: vehicle.unit_id,
        consumption: avgConsumption || 0,
        status: avgConsumption < 7 ? 'low' : avgConsumption < 8 ? 'medium' : 'good'
      }
    })

    return {
      monthlyFuelCost: totalCost,
      monthlyMiles: totalMiles,
      averageConsumption: averageConsumption || 0,
      costPerMile: costPerMile || 0,
      totalRecords: fuelRecords.length,
      consumptionByVehicle
    }
  }

  const metrics = calculateMetrics()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const fuelAmount = parseFloat(formData.fuel_amount)
      const fuelPrice = parseFloat(formData.fuel_price)
      const milesDriven = parseFloat(formData.miles_driven)

      const totalCost = fuelAmount * fuelPrice
      const consumption = milesDriven / fuelAmount

      const recordData = {
        ...formData,
        fuel_amount: fuelAmount,
        fuel_price: fuelPrice,
        miles_driven: milesDriven,
        total_cost: totalCost,
        consumption: consumption
      }

      if (editingRecord) {
        // Editar registro existente
        setFuelRecords(prev => prev.map(r => 
          r.id === editingRecord.id 
            ? { ...r, ...recordData, total_cost: totalCost, consumption: consumption }
            : r
        ))
        addToast({
          title: 'Registro actualizado',
          description: 'El registro de combustible ha sido actualizado correctamente.',
          variant: 'success'
        })
      } else {
        // Agregar nuevo registro
        const newRecord: FuelRecord = {
          id: Date.now().toString(),
          ...recordData,
          total_cost: totalCost,
          consumption: consumption,
          created_at: new Date().toISOString()
        }
        setFuelRecords(prev => [...prev, newRecord])
        addToast({
          title: 'Registro agregado',
          description: 'El registro de combustible ha sido agregado correctamente.',
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
      fuel_amount: '',
      fuel_price: '',
      miles_driven: ''
    })
    setEditingRecord(null)
  }

  const handleEdit = (record: FuelRecord) => {
    setFormData({
      vehicle_id: record.vehicle_id,
      date: record.date,
      fuel_amount: record.fuel_amount.toString(),
      fuel_price: record.fuel_price.toString(),
      miles_driven: record.miles_driven.toString()
    })
    setEditingRecord(record)
    setIsModalOpen(true)
  }

  const handleDelete = (recordId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este registro?')) {
      setFuelRecords(prev => prev.filter(r => r.id !== recordId))
      addToast({
        title: 'Registro eliminado',
        description: 'El registro de combustible ha sido eliminado correctamente.',
        variant: 'success'
      })
    }
  }

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    return vehicle ? `${vehicle.unit_id} - ${vehicle.mechanic_name}` : 'Vehículo no encontrado'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Registros de Combustible
          </h1>
          <p className="text-muted-foreground mt-2">
            Controla el consumo de combustible y calcula métricas de eficiencia
          </p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva Recarga</span>
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Consumo Promedio</p>
                <p className="text-2xl font-bold text-foreground">
                  {metrics.averageConsumption.toFixed(1)} km/L
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Gasto Mensual</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(metrics.monthlyFuelCost)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Costo por Milla</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(metrics.costPerMile)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Millas Este Mes</p>
                <p className="text-2xl font-bold text-foreground">
                  {metrics.monthlyMiles.toLocaleString()}
                </p>
              </div>
              <Fuel className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consumo por Vehículo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Eficiencia por Vehículo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.consumptionByVehicle.map((item, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  item.status === 'good' 
                    ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400'
                    : item.status === 'medium'
                    ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{item.vehicle}</span>
                  <span className="text-lg font-bold">{item.consumption.toFixed(1)} km/L</span>
                </div>
                <div className="mt-2 text-sm">
                  {item.status === 'good' && '✅ Eficiente'}
                  {item.status === 'medium' && '⚠️ Normal'}
                  {item.status === 'low' && '❌ Bajo rendimiento'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Registros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Historial de Combustible</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Fecha</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Vehículo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Combustible (L)</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Precio/L</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Costo Total</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Millas Recorridas</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Consumo (km/L)</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {fuelRecords.map((record) => (
                  <tr key={record.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                    <td className="py-3 px-4 text-foreground">{record.date}</td>
                    <td className="py-3 px-4 text-foreground">{getVehicleName(record.vehicle_id)}</td>
                    <td className="py-3 px-4 text-foreground">{record.fuel_amount} L</td>
                    <td className="py-3 px-4 text-foreground">{formatCurrency(record.fuel_price)}</td>
                    <td className="py-3 px-4 text-foreground font-medium">{formatCurrency(record.total_cost)}</td>
                    <td className="py-3 px-4 text-foreground">{record.miles_driven} millas</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record.consumption >= 8 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : record.consumption >= 7
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {record.consumption.toFixed(1)} km/L
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

      {/* Modal para agregar/editar registro */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingRecord ? 'Editar Registro de Combustible' : 'Nueva Recarga de Combustible'}
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
                Fecha de Recarga *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Cantidad de Combustible (L) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.fuel_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, fuel_amount: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ej: 45.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Precio por Litro ($) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.fuel_price}
                onChange={(e) => setFormData(prev => ({ ...prev, fuel_price: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ej: 1.25"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Millas Recorridas *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.miles_driven}
                onChange={(e) => setFormData(prev => ({ ...prev, miles_driven: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ej: 320"
              />
            </div>

            {/* Cálculos automáticos */}
            {formData.fuel_amount && formData.fuel_price && formData.miles_driven && (
              <div className="md:col-span-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h4 className="font-medium text-foreground mb-2">Cálculos Automáticos</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Costo Total: </span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(parseFloat(formData.fuel_amount) * parseFloat(formData.fuel_price))}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Consumo: </span>
                    <span className="font-medium text-foreground">
                      {(parseFloat(formData.miles_driven) / parseFloat(formData.fuel_amount)).toFixed(1)} km/L
                    </span>
                  </div>
                </div>
              </div>
            )}
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

export default FuelPage