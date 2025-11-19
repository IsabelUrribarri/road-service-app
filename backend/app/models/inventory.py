from pydantic import BaseModel
from typing import Optional

class Inventory(BaseModel):
    id: str
    vehicle_id: str
    item_name: str
    quantity: int
    unit: str
    last_updated: str
    status: str
    min_quantity: int

class InventoryCreate(BaseModel):
    vehicle_id: str
    item_name: str
    quantity: int
    unit: str
    min_quantity: int = 0

class InventoryUpdate(BaseModel):
    item_name: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    min_quantity: Optional[int] = None