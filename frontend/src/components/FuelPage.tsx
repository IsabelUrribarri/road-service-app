import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Modal } from './ui/modal'
import { useToast } from './ui/toast'
import { Plus, Edit, Trash2, Fuel, TrendingUp, DollarSign, BarChart3, Search, Filter, Download, Zap, Calendar } from 'lucide-react'
import { FuelRecord, Vehicle } from '../types'
import { formatCurrency } from '../lib/utils'

const FuelPage: React.FC = () => {
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FuelRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('all')
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    vehicle_id: '',
    date: new Date().toISOString().split('T')[0],
    fuel_amount: '',
    fuel_price: '',
    miles_driven: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
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
      },
      {
        id: '3',
        unit_id: 'TRUCK-001',
        mechanic_name: 'Roberto Silva',
        model: 'Ford F-150 2022',
        total_miles: 8900,
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
      },
      {
        id: '4',
        vehicle_id: '3',
        date: '2024-01-12',
        fuel_amount: 55.0,
        fuel_price: 1.30,
        total_cost: 71.50,
        miles_driven: 380,
        consumption: 6.9,
        created_at: '2024-01-12'
      }
    ]

    setVehicles(sampleVehicles)
    setFuelRecords(sampleFuelRecords)
  }

  const filteredRecords = fuelRecords.filter(record => {
    const vehicle = vehicles.find(v => v.id === record.vehicle_id)
    const matchesSearch = vehicle?.unit_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle?.mechanic_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesVehicle = vehicleFilter === 'all' || record.vehicle_id === vehicleFilter
    return matchesSearch && matchesVehicle
  })

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

    const consumptionByVehicle = vehicles.map(vehicle => {
      const vehicleRecords = fuelRecords.filter(record => record.vehicle_id === vehicle.id)
      const vehicleTotalMiles = vehicleRecords.reduce((sum, record) => sum + record.miles_driven, 0)
      const vehicleTotalFuel = vehicleRecords.reduce((sum, record) => sum + record.fuel_amount, 0)
      const avgConsumption = vehicleTotalFuel > 0 ? vehicleTotalMiles / vehicleTotalFuel : 0

      return {
        vehicle: vehicle.unit_id,
        consumption: avgConsumption,
        status: avgConsumption >= 8 ? 'good' : avgConsumption >= 7 ? 'medium' : 'low'
      }
    })

    return {
      monthlyFuelCost: totalCost,
      monthlyMiles: totalMiles,
      averageConsumption: averageConsumption || 0,
      costPerMile: costPerMile || 0,
      totalRecords: fuelRecords.length,
      consumptionByVehicle,
      totalFuel
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Gestión de Combustible
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Controla el consumo y optimiza la eficiencia de tu flota
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Recarga</span>
          </Button>
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">Consumo Promedio</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics.averageConsumption.toFixed(1)} km/L
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">+5.2%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-1">Gasto Mensual</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(metrics.monthlyFuelCost)}
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600 dark:text-red-400">+2.1%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-1">Costo por Milla</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(metrics.costPerMile)}
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">-1.8%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-1">Combustible Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics.totalFuel.toFixed(0)} L
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">+8.5%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Fuel className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar registros..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los vehículos</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.unit_id}
                </option>
              ))}
            </select>
            <Button variant="outline" className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filtrar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Consumo por Vehículo */}
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-xl font-semibold text-gray-900 dark:text-white">
            <Zap className="w-5 h-5 mr-2 text-yellow-500" />
            Eficiencia por Vehículo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.consumptionByVehicle.map((item, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                  item.status === 'good' 
                    ? 'bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:shadow-lg'
                    : item.status === 'medium'
                    ? 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 hover:shadow-lg'
                    : 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 hover:shadow-lg'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-900 dark:text-white">{item.vehicle}</span>
                  <span className={`text-lg font-bold ${
                    item.status === 'good' ? 'text-green-600 dark:text-green-400' :
                    item.status === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {item.consumption.toFixed(1)} km/L
                  </span>
                </div>
                <div className={`text-sm font-medium ${
                  item.status === 'good' ? 'text-green-700 dark:text-green-300' :
                  item.status === 'medium' ? 'text-yellow-700 dark:text-yellow-300' :
                  'text-red-700 dark:text-red-300'
                }`}>
                  {item.status === 'good' && '✅ Alto rendimiento'}
                  {item.status === 'medium' && '⚠️ Rendimiento normal'}
                  {item.status === 'low' && '❌ Bajo rendimiento'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Registros */}
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            Historial de Combustible ({filteredRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Fecha</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Vehículo</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Combustible</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Precio/L</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Costo Total</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Millas</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Consumo</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white font-medium">{record.date}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900 dark:text-white font-medium">{getVehicleName(record.vehicle_id)}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900 dark:text-white font-medium">{record.fuel_amount} L</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900 dark:text-white">{formatCurrency(record.fuel_price)}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{formatCurrency(record.total_cost)}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900 dark:text-white">{record.miles_driven} millas</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        record.consumption >= 8 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : record.consumption >= 7
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {record.consumption.toFixed(1)} km/L
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(record)}
                          className="flex items-center space-x-1 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Editar</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
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
            
            {filteredRecords.length === 0 && (
              <div className="text-center py-12">
                <Fuel className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No se encontraron registros</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {searchTerm || vehicleFilter !== 'all' 
                    ? 'Intenta ajustar los filtros de búsqueda' 
                    : 'Comienza agregando tu primer registro de combustible'
                  }
                </p>
                {!searchTerm && vehicleFilter === 'all' && (
                  <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Agregar Primer Registro</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingRecord ? 'Editar Registro de Combustible' : 'Nueva Recarga de Combustible'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Vehículo *
              </label>
              <select
                required
                value={formData.vehicle_id}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_id: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Fecha de Recarga *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Cantidad de Combustible (L) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.fuel_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, fuel_amount: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="45.0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Precio por Litro ($) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.fuel_price}
                onChange={(e) => setFormData(prev => ({ ...prev, fuel_price: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="1.25"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Millas Recorridas *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.miles_driven}
                onChange={(e) => setFormData(prev => ({ ...prev, miles_driven: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="320"
              />
            </div>

            {/* Cálculos automáticos */}
            {formData.fuel_amount && formData.fuel_price && formData.miles_driven && (
              <div className="md:col-span-2 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Cálculos Automáticos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Costo Total</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(parseFloat(formData.fuel_amount) * parseFloat(formData.fuel_price))}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Eficiencia</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {(parseFloat(formData.miles_driven) / parseFloat(formData.fuel_amount)).toFixed(1)} km/L
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                editingRecord ? 'Actualizar Registro' : 'Agregar Registro'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default FuelPage