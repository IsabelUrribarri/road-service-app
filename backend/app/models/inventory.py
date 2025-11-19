from pydantic import BaseModel
from typing import Optional

class InventoryBase(BaseModel):
    vehicle_id: str
    item_name: str
    quantity: int
    unit: str
    min_quantity: int
    company_id: str  # ← NUEVO: Para filtrado por compañía

class InventoryCreate(InventoryBase):
    # status se calcula automáticamente basado en quantity vs min_quantity
    pass

class InventoryUpdate(BaseModel):
    item_name: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    min_quantity: Optional[int] = None
    # company_id no se puede actualizar

class Inventory(InventoryBase):
    id: str
    status: str  # "available" o "low" - calculado automáticamente
    last_updated: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True