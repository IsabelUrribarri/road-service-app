import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Metrics, Vehicle, FuelRecord } from '../types'
import { formatCurrency } from '../lib/utils'

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([])

  useEffect(() => {
    // Simulate API calls
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
      { id: '2', unit_id: 'VAN-002', mechanic_name: 'María González', model: 'Mercedes Sprinter 2020', total_miles: 18900, status: 'active', created_at: '2023-01-01' }
    ]

    const mockFuelRecords: FuelRecord[] = [
      { id: '1', vehicle_id: '1', date: '2023-10-05', fuel_amount: 45, fuel_price: 1.25, total_cost: 56.25, miles_driven: 320, consumption: 7.1, created_at: '2023-10-05' }
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
      consumption: avgConsumption
    }
  })

  if (!metrics) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard de Métricas</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{metrics.average_consumption} km/L</div>
            <p className="text-sm text-muted-foreground">Consumo Promedio</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{formatCurrency(metrics.monthly_fuel_cost)}</div>
            <p className="text-sm text-muted-foreground">Gasto Mensual Combustible</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{formatCurrency(metrics.cost_per_mile)}</div>
            <p className="text-sm text-muted-foreground">Costo por Milla</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{metrics.monthly_miles.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Millas Este Mes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Consumo de Combustible por Unidad</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={consumptionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="consumption" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unidades con Bajo Rendimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.low_performance_vehicles.map((vehicle, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{vehicle.unit_id}</div>
                    <div className="text-sm text-muted-foreground">{vehicle.consumption} km/L</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    vehicle.status === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {vehicle.status === 'critical' ? 'Crítico' : 'Bajo'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard