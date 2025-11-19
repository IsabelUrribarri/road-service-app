from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from ..models.inventory import Inventory, InventoryCreate, InventoryUpdate
from ..models.database import get_db
from ..auth.jwt_handler import get_current_active_user, require_company_admin
from ..manager import manager
import uuid
from datetime import datetime

router = APIRouter(prefix="/inventory", tags=["inventory"])

@router.get("/", response_model=List[Inventory])
async def get_inventory(
    vehicle_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden ver
):
    try:
        db = get_db()
        query = db.table("inventory").select("*").eq("company_id", user["company_id"])
        
        if vehicle_id:
            query = query.eq("vehicle_id", vehicle_id)
            
        result = query.range(skip, skip + limit).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Inventory)
async def create_inventory_item(
    inventory_data: InventoryCreate,
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden crear
):
    try:
        db = get_db()
        
        # Verificar que el vehículo pertenezca a la compañía
        if inventory_data.vehicle_id:
            vehicle_check = db.table("vehicles").select("id").eq("id", inventory_data.vehicle_id).eq("company_id", user["company_id"]).execute()
            if not vehicle_check.data:
                raise HTTPException(status_code=400, detail="Vehicle not found in your company")
        
        inventory_id = str(uuid.uuid4())
        
        # Determine status based on quantity
        status = "available" if inventory_data.quantity > inventory_data.min_quantity else "low_stock"
        
        inventory = {
            "id": inventory_id,
            **inventory_data.dict(),
            "status": status,
            "company_id": user["company_id"],
            "last_updated": datetime.now().isoformat()
        }
        
        result = db.table("inventory").insert(inventory)
        
        if result.data:
            new_item = result.data[0]
            
            # Broadcast real-time
            await manager.broadcast_to_company({
                "type": "INVENTORY_CREATED",
                "data": new_item,
                "timestamp": datetime.now().isoformat()
            }, user["company_id"])
            
            return new_item
        else:
            raise HTTPException(status_code=400, detail="Error creating inventory item")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{item_id}", response_model=Inventory)
async def get_inventory_item(
    item_id: str,
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden ver
):
    try:
        db = get_db()
        result = db.table("inventory").select("*").eq("id", item_id).eq("company_id", user["company_id"]).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{item_id}", response_model=Inventory)
async def update_inventory_item(
    item_id: str,
    inventory_data: InventoryUpdate,
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden actualizar
):
    try:
        db = get_db()
        
        # Verificar que el item pertenezca a la compañía
        check_result = db.table("inventory").select("*").eq("id", item_id).eq("company_id", user["company_id"]).execute()
        if not check_result.data:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        
        update_data = inventory_data.dict(exclude_unset=True)
        
        # If quantity is updated, determine new status
        if 'quantity' in update_data:
            current_item = check_result.data[0]
            min_quantity = update_data.get('min_quantity', current_item['min_quantity'])
            quantity = update_data['quantity']
            update_data['status'] = "available" if quantity > min_quantity else "low_stock"
            update_data['last_updated'] = datetime.now().isoformat()
        
        result = db.table("inventory").update(update_data).eq("id", item_id).execute()
        
        if result.data:
            updated_item = result.data[0]
            
            # Broadcast real-time
            await manager.broadcast_to_company({
                "type": "INVENTORY_UPDATED",
                "data": updated_item,
                "timestamp": datetime.now().isoformat()
            }, user["company_id"])
            
            return updated_item
        else:
            raise HTTPException(status_code=404, detail="Inventory item not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{item_id}")
async def delete_inventory_item(
    item_id: str,
    user: dict = Depends(require_company_admin)  # ✅ SOLO Company Admin y Super Admin pueden eliminar
):
    try:
        db = get_db()
        
        # Verificar que el item pertenezca a la compañía
        check_result = db.table("inventory").select("id").eq("id", item_id).eq("company_id", user["company_id"]).execute()
        if not check_result.data:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        
        result = db.table("inventory").delete().eq("id", item_id).execute()
        
        if result.data:
            # Broadcast real-time
            await manager.broadcast_to_company({
                "type": "INVENTORY_DELETED",
                "data": {"id": item_id},
                "timestamp": datetime.now().isoformat()
            }, user["company_id"])
            
            return {"message": "Inventory item deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Inventory item not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Ruta para alertas de inventario bajo
@router.get("/alerts/low-stock")
async def get_low_stock_alerts(
    user: dict = Depends(get_current_active_user)  # ✅ Todos los roles pueden ver alertas
):
    """
    Obtener items con stock bajo
    """
    try:
        db = get_db()
        result = db.table("inventory").select("*").eq("company_id", user["company_id"]).eq("status", "low_stock").execute()
        return {"low_stock_items": result.data, "count": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Ruta administrativa para reporte de inventario
@router.get("/admin/report")
async def get_inventory_report(
    admin: dict = Depends(require_company_admin)  # ✅ SOLO Company Admin y Super Admin
):
    """
    Reporte completo de inventario - solo para company_admin y super_admin
    """
    try:
        db = get_db()
        inventory = db.table("inventory").select("*").eq("company_id", admin["company_id"]).execute().data
        
        total_items = len(inventory)
        low_stock = len([item for item in inventory if item.get('status') == 'low_stock'])
        out_of_stock = len([item for item in inventory if item.get('quantity', 0) == 0])
        
        return {
            "company_id": admin["company_id"],
            "total_items": total_items,
            "low_stock_items": low_stock,
            "out_of_stock_items": out_of_stock,
            "inventory_value": sum(item.get('quantity', 0) for item in inventory),
            "alerts": low_stock + out_of_stock
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))