import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Modal } from './ui/modal'
import { useToast } from './ui/toast'
import { Plus, Edit, Trash2, Package, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react'
import { Inventory, Vehicle } from '../types'

const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Inventory | null>(null)
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    vehicle_id: '',
    item_name: '',
    quantity: '',
    unit: '',
    min_quantity: ''
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
      }
    ]

    setVehicles(sampleVehicles)
    setInventory(sampleInventory)
  }

  // Cálculos de métricas
  const calculateMetrics = () => {
    const lowStockItems = inventory.filter(item => item.status === 'low')
    const availableItems = inventory.filter(item => item.status === 'available')
    const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0)
    const uniqueProducts = new Set(inventory.map(item => item.item_name)).size

    return {
      lowStockCount: lowStockItems.length,
      availableCount: availableItems.length,
      totalItems,
      uniqueProducts,
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

      // Determinar estado basado en cantidad
      const status = inventoryData.quantity > inventoryData.min_quantity ? 'available' : 'low'

      if (editingItem) {
        // Editar item existente
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
        // Agregar nuevo item
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Inventario por Unidad
          </h1>
          <p className="text-muted-foreground mt-2">
            Controla repuestos y materiales disponibles en cada vehículo
          </p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Agregar Item</span>
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Items</p>
                <p className="text-2xl font-bold text-foreground">
                  {metrics.totalItems}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Productos Únicos</p>
                <p className="text-2xl font-bold text-foreground">
                  {metrics.uniqueProducts}
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
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Stock Bajo</p>
                <p className="text-2xl font-bold text-foreground">
                  {metrics.lowStockCount}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Alertas</p>
                <p className="text-2xl font-bold text-foreground">
                  {metrics.lowStockCount}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Stock Bajo */}
      {metrics.lowStockItems.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Alertas de Stock Bajo</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-red-300 bg-white dark:border-red-700 dark:bg-red-900/30"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-foreground">{item.item_name}</p>
                      <p className="text-sm text-muted-foreground">{getVehicleName(item.vehicle_id)}</p>
                    </div>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Mínimo requerido: {item.min_quantity} {item.unit}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventario por Vehículo */}
      <div className="space-y-6">
        {vehicles.map(vehicle => {
          const vehicleItems = getItemsByVehicle(vehicle.id)
          if (vehicleItems.length === 0) return null

          return (
            <Card key={vehicle.id}>
              <CardHeader>
                <CardTitle className="text-foreground">
                  {vehicle.unit_id} - {vehicle.mechanic_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vehicleItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border ${
                        item.status === 'available'
                          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-foreground">{item.item_name}</h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === 'available'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {item.status === 'available' ? 'Disponible' : 'Stock Bajo'}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cantidad:</span>
                          <span className="font-medium text-foreground">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mínimo:</span>
                          <span className="font-medium text-foreground">
                            {item.min_quantity} {item.unit}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Última actualización:</span>
                          <span className="text-muted-foreground">{item.last_updated}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          className="flex-1"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
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

      {/* Modal para agregar/editar item */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingItem ? 'Editar Item' : 'Agregar Item al Inventario'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
              Nombre del Item *
            </label>
            <input
              type="text"
              required
              value={formData.item_name}
              onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Ej: Aceite Motor, Filtros Aire, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Cantidad Actual *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ej: 5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Unidad *
              </label>
              <select
                required
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
            <label className="block text-sm font-medium text-foreground mb-2">
              Cantidad Mínima *
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.min_quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, min_quantity: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Cantidad mínima antes de alerta"
            />
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
              {loading ? 'Guardando...' : (editingItem ? 'Actualizar' : 'Agregar')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default InventoryPage