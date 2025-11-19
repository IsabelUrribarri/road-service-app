import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Metrics, Vehicle, FuelRecord } from '../types'
import { formatCurrency } from '../lib/utils'
import { TrendingUp, TrendingDown, Car, Fuel, AlertTriangle, Settings, CheckCircle } from 'lucide-react'

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([])

  useEffect(() => {
    const mockMetrics: Metrics = {
      average_consumption: 8.5,
      monthly_fuel_cost: 1250.00,
      cost_per_mile: 0.35,
      monthly_miles: 1250,
      low_performance_vehicles: [
        { unit_id: 'VAN-001', consumption: 6.2, status: 'critical' },
        { unit_id: 'TRUCK-003', consumption: 7.1, status: 'low' }
      ],
      upcoming_maintenance: []
    }

    const mockVehicles: Vehicle[] = [
      { id: '1', unit_id: 'VAN-001', mechanic_name: 'Carlos Rodríguez', model: 'Ford Transit 2021', total_miles: 12500, status: 'active', created_at: '2023-01-01' },
      { id: '2', unit_id: 'VAN-002', mechanic_name: 'María González', model: 'Mercedes Sprinter 2020', total_miles: 18900, status: 'active', created_at: '2023-01-01' },
      { id: '3', unit_id: 'TRUCK-001', mechanic_name: 'Roberto Silva', model: 'Ford F-150 2022', total_miles: 8900, status: 'maintenance', created_at: '2023-01-01' }
    ]

    const mockFuelRecords: FuelRecord[] = [
      { id: '1', vehicle_id: '1', date: '2023-10-05', fuel_amount: 45, fuel_price: 1.25, total_cost: 56.25, miles_driven: 320, consumption: 7.1, created_at: '2023-10-05' },
      { id: '2', vehicle_id: '2', date: '2023-10-04', fuel_amount: 50, fuel_price: 1.30, total_cost: 65.00, miles_driven: 380, consumption: 7.6, created_at: '2023-10-04' },
      { id: '3', vehicle_id: '1', date: '2023-10-01', fuel_amount: 48, fuel_price: 1.20, total_cost: 57.60, miles_driven: 350, consumption: 7.3, created_at: '2023-10-01' }
    ]

    setMetrics(mockMetrics)
    setVehicles(mockVehicles)
    setFuelRecords(mockFuelRecords)
  }, [])

  const consumptionData = vehicles.map(vehicle => {
    const vehicleFuel = fuelRecords.filter(record => record.vehicle_id === vehicle.id)
    const avgConsumption = vehicleFuel.length > 0
      ? vehicleFuel.reduce((sum, record) => sum + record.consumption, 0) / vehicleFuel.length
      : 0

    return {
      name: vehicle.unit_id,
      consumption: avgConsumption,
      fill: vehicle.status === 'active' ? '#3b82f6' : '#f59e0b'
    }
  })

  const monthlyData = [
    { month: 'Ene', consumption: 8.2, cost: 1100 },
    { month: 'Feb', consumption: 8.5, cost: 1250 },
    { month: 'Mar', consumption: 8.1, cost: 1180 },
    { month: 'Abr', consumption: 8.7, cost: 1320 },
    { month: 'May', consumption: 8.9, cost: 1400 },
    { month: 'Jun', consumption: 8.5, cost: 1250 }
  ]

  const statusData = [
    { name: 'Activos', value: vehicles.filter(v => v.status === 'active').length, color: '#10b981' },
    { name: 'Mantenimiento', value: vehicles.filter(v => v.status === 'maintenance').length, color: '#f59e0b' },
    { name: 'Inactivos', value: vehicles.filter(v => v.status === 'inactive').length, color: '#ef4444' }
  ]

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard Principal</h1>
            <p className="text-blue-100 text-lg">Resumen completo de tu operación de road service</p>
          </div>
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
            <Car className="w-8 h-8" />
          </div>
        </div>
      </div> */}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">Consumo Promedio</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.average_consumption} km/L</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">+2.5%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Fuel className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-1">Gasto Mensual</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(metrics.monthly_fuel_cost)}</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600 dark:text-red-400">-1.2%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-1">Costo por Milla</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(metrics.cost_per_mile)}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">+0.8%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Car className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-1">Millas Este Mes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.monthly_miles.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">+15%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <Fuel className="w-5 h-5 mr-2 text-blue-500" />
              Consumo por Unidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={consumptionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar dataKey="consumption" radius={[4, 4, 0, 0]}>
                  {consumptionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
              Tendencia Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis yAxisId="left" stroke="#6b7280" />
                <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Line yAxisId="left" type="monotone" dataKey="consumption" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <Car className="w-5 h-5 mr-2 text-purple-500" />
              Estado de la Flota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-4 mt-4">
              {statusData.map((status, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{status.name}: {status.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
              Alertas de Rendimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.low_performance_vehicles.map((vehicle, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${vehicle.status === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
                      }`}></div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{vehicle.unit_id}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{vehicle.consumption} km/L</div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${vehicle.status === 'critical'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>
                    {vehicle.status === 'critical' ? 'Acción Requerida' : 'Revisar'}
                  </div>
                </div>
              ))}
              {metrics.low_performance_vehicles.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>¡Excelente! Todas las unidades tienen buen rendimiento</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard