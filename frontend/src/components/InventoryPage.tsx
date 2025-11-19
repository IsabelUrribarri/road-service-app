import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Modal } from './ui/modal'
import { useToast } from './ui/toast'
import { Plus, Edit, Trash2, Package, AlertTriangle, CheckCircle, TrendingDown, Search, Filter, Download, Truck, RefreshCw } from 'lucide-react'
import { Inventory, Vehicle } from '../types'

const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Inventory | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    vehicle_id: '',
    item_name: '',
    quantity: '',
    unit: '',
    min_quantity: ''
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

    const sampleInventory: Inventory[] = [
      {
        id: '1',
        vehicle_id: '1',
        item_name: 'Aceite Motor',
        quantity: 3,
        unit: 'Litros',
        last_updated: '2024-01-15',
        status: 'available',
        min_quantity: 2
      },
      {
        id: '2',
        vehicle_id: '1',
        item_name: 'Filtros Aire',
        quantity: 2,
        unit: 'Unidades',
        last_updated: '2024-01-15',
        status: 'available',
        min_quantity: 2
      },
      {
        id: '3',
        vehicle_id: '2',
        item_name: 'Líquido Frenos',
        quantity: 1,
        unit: 'Litros',
        last_updated: '2024-01-14',
        status: 'low',
        min_quantity: 2
      },
      {
        id: '4',
        vehicle_id: '2',
        item_name: 'Bujías',
        quantity: 6,
        unit: 'Unidades',
        last_updated: '2024-01-10',
        status: 'available',
        min_quantity: 4
      },
      {
        id: '5',
        vehicle_id: '3',
        item_name: 'Aceite Transmisión',
        quantity: 1,
        unit: 'Litros',
        last_updated: '2024-01-12',
        status: 'low',
        min_quantity: 2
      },
      {
        id: '6',
        vehicle_id: '3',
        item_name: 'Filtro Combustible',
        quantity: 3,
        unit: 'Unidades',
        last_updated: '2024-01-11',
        status: 'available',
        min_quantity: 2
      }
    ]

    setVehicles(sampleVehicles)
    setInventory(sampleInventory)
  }

  const filteredInventory = inventory.filter(item => {
    const vehicle = vehicles.find(v => v.id === item.vehicle_id)
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle?.unit_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesVehicle = vehicleFilter === 'all' || item.vehicle_id === vehicleFilter
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    return matchesSearch && matchesVehicle && matchesStatus
  })

  const calculateMetrics = () => {
    const lowStockItems = inventory.filter(item => item.status === 'low')
    const availableItems = inventory.filter(item => item.status === 'available')
    const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0)
    const uniqueProducts = new Set(inventory.map(item => item.item_name)).size
    const totalValue = inventory.reduce((sum, item) => {
      // Valor estimado basado en cantidad (esto podría venir de una API real)
      const baseValue = item.unit === 'Litros' ? 15 : item.unit === 'Unidades' ? 8 : 10
      return sum + (item.quantity * baseValue)
    }, 0)

    return {
      lowStockCount: lowStockItems.length,
      availableCount: availableItems.length,
      totalItems,
      uniqueProducts,
      totalValue,
      lowStockItems
    }
  }

  const metrics = calculateMetrics()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const inventoryData = {
        ...formData,
        quantity: parseInt(formData.quantity),
        min_quantity: parseInt(formData.min_quantity)
      }

      const status = inventoryData.quantity > inventoryData.min_quantity ? 'available' : 'low'

      if (editingItem) {
        setInventory(prev => prev.map(item => 
          item.id === editingItem.id 
            ? { 
                ...item, 
                ...inventoryData, 
                quantity: inventoryData.quantity,
                min_quantity: inventoryData.min_quantity,
                status,
                last_updated: new Date().toISOString().split('T')[0]
              }
            : item
        ))
        addToast({
          title: 'Item actualizado',
          description: 'El item del inventario ha sido actualizado correctamente.',
          variant: 'success'
        })
      } else {
        const newItem: Inventory = {
          id: Date.now().toString(),
          ...inventoryData,
          quantity: inventoryData.quantity,
          min_quantity: inventoryData.min_quantity,
          status,
          last_updated: new Date().toISOString().split('T')[0]
        }
        setInventory(prev => [...prev, newItem])
        addToast({
          title: 'Item agregado',
          description: 'El item ha sido agregado al inventario correctamente.',
          variant: 'success'
        })
      }

      setIsModalOpen(false)
      resetForm()
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudo guardar el item.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      item_name: '',
      quantity: '',
      unit: '',
      min_quantity: ''
    })
    setEditingItem(null)
  }

  const handleEdit = (item: Inventory) => {
    setFormData({
      vehicle_id: item.vehicle_id,
      item_name: item.item_name,
      quantity: item.quantity.toString(),
      unit: item.unit,
      min_quantity: item.min_quantity.toString()
    })
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleDelete = (itemId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este item?')) {
      setInventory(prev => prev.filter(item => item.id !== itemId))
      addToast({
        title: 'Item eliminado',
        description: 'El item ha sido eliminado del inventario correctamente.',
        variant: 'success'
      })
    }
  }

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    return vehicle ? `${vehicle.unit_id} - ${vehicle.mechanic_name}` : 'Vehículo no encontrado'
  }

  const getItemsByVehicle = (vehicleId: string) => {
    return inventory.filter(item => item.vehicle_id === vehicleId)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Gestión de Inventario
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Controla repuestos y materiales de tu flota vehicular
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Item</span>
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
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">Total Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics.totalItems}
                </p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">+12%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-1">Productos Únicos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics.uniqueProducts}
                </p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">+3</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-1">Stock Bajo</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics.lowStockCount}
                </p>
                <div className="flex items-center mt-1">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600 dark:text-red-400">+2</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-1">Valor Estimado</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${metrics.totalValue}
                </p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">+8%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
                placeholder="Buscar items..."
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="available">Disponible</option>
              <option value="low">Stock Bajo</option>
            </select>
            <Button variant="outline" className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filtrar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Stock Bajo */}
      {metrics.lowStockItems.length > 0 && (
        <Card className="border-red-200 bg-gradient-to-br from-red-500/10 to-red-600/5 dark:border-red-800 dark:bg-red-900/20 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Alertas de Stock Bajo - Requiere Atención</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border-2 border-red-300 bg-white dark:border-red-700 dark:bg-red-900/30 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{item.item_name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{getVehicleName(item.vehicle_id)}</p>
                    </div>
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      Mínimo: {item.min_quantity} {item.unit}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleEdit(item)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Reabastecer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventario por Vehículo */}
      <div className="space-y-6">
        {vehicles.map(vehicle => {
          const vehicleItems = getItemsByVehicle(vehicle.id).filter(item => 
            filteredInventory.some(filteredItem => filteredItem.id === item.id)
          )
          
          if (vehicleItems.length === 0) return null

          return (
            <Card key={vehicle.id} className="hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl font-semibold text-gray-900 dark:text-white">
                  <Truck className="w-5 h-5 mr-2 text-blue-500" />
                  {vehicle.unit_id} - {vehicle.mechanic_name}
                  <span className="ml-auto text-sm font-normal text-gray-500 dark:text-gray-400">
                    {vehicleItems.length} items
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vehicleItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                        item.status === 'available'
                          ? 'bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:shadow-lg'
                          : 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 hover:shadow-lg'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{item.item_name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.unit}</p>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          item.status === 'available'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {item.status === 'available' ? '✅ Disponible' : '⚠️ Stock Bajo'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Cantidad:</span>
                          <span className={`font-bold text-lg ${
                            item.status === 'available' 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {item.quantity}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Mínimo:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {item.min_quantity}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Actualizado:</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">{item.last_updated}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredInventory.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No se encontraron items</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchTerm || vehicleFilter !== 'all' || statusFilter !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda' 
                : 'Comienza agregando tu primer item al inventario'
              }
            </p>
            {!searchTerm && vehicleFilter === 'all' && statusFilter === 'all' && (
              <Button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-2 mx-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar Primer Item</span>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingItem ? 'Editar Item' : 'Agregar Item al Inventario'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
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
              Nombre del Item *
            </label>
            <input
              type="text"
              required
              value={formData.item_name}
              onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Aceite Motor, Filtros Aire, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Cantidad Actual *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Unidad *
              </label>
              <select
                required
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Seleccionar unidad</option>
                <option value="Litros">Litros</option>
                <option value="Unidades">Unidades</option>
                <option value="Kilogramos">Kilogramos</option>
                <option value="Metros">Metros</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Cantidad Mínima *
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.min_quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, min_quantity: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Cantidad mínima antes de alerta"
            />
          </div>

          {/* Estado calculado */}
          {formData.quantity && formData.min_quantity && (
            <div className={`p-4 rounded-xl border-2 ${
              parseInt(formData.quantity) > parseInt(formData.min_quantity)
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">Estado del Item:</span>
                <span className={`font-bold ${
                  parseInt(formData.quantity) > parseInt(formData.min_quantity)
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {parseInt(formData.quantity) > parseInt(formData.min_quantity) ? '✅ Disponible' : '⚠️ Stock Bajo'}
                </span>
              </div>
            </div>
          )}

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
                editingItem ? 'Actualizar Item' : 'Agregar Item'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default InventoryPage