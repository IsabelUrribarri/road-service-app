from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from ..models.inventory import Inventory, InventoryCreate, InventoryUpdate
from ..models.database import get_db
from ..auth.jwt_handler import verify_token
import uuid
from datetime import datetime

router = APIRouter(prefix="/inventory", tags=["inventory"])

@router.get("/", response_model=List[Inventory])
async def get_inventory(
    vehicle_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        query = db.table("inventory").select("*")
        
        if vehicle_id:
            query = query.eq("vehicle_id", vehicle_id)
            
        result = query.range(skip, skip + limit).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Inventory)
async def create_inventory_item(
    inventory_data: InventoryCreate,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        inventory_id = str(uuid.uuid4())
        
        # Determine status based on quantity
        status = "available" if inventory_data.quantity > inventory_data.min_quantity else "low"
        
        inventory = {
            "id": inventory_id,
            **inventory_data.dict(),
            "status": status,
            "last_updated": datetime.now().isoformat()
        }
        
        result = db.table("inventory").insert(inventory).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{item_id}", response_model=Inventory)
async def get_inventory_item(
    item_id: str,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        result = db.table("inventory").select("*").eq("id", item_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{item_id}", response_model=Inventory)
async def update_inventory_item(
    item_id: str,
    inventory_data: InventoryUpdate,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        
        update_data = inventory_data.dict(exclude_unset=True)
        
        # If quantity is updated, determine new status
        if 'quantity' in update_data:
            # Get current min_quantity to determine status
            current = db.table("inventory").select("*").eq("id", item_id).execute()
            if current.data:
                min_quantity = update_data.get('min_quantity', current.data[0]['min_quantity'])
                quantity = update_data['quantity']
                update_data['status'] = "available" if quantity > min_quantity else "low"
                update_data['last_updated'] = datetime.now().isoformat()
        
        result = db.table("inventory").update(update_data).eq("id", item_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{item_id}")
async def delete_inventory_item(
    item_id: str,
    user: dict = Depends(verify_token)
):
    try:
        db = get_db()
        result = db.table("inventory").delete().eq("id", item_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        return {"message": "Inventory item deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))