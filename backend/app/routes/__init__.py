# backend/app/routes/__init__.py
from .auth import router as auth_router
from .vehicles import router as vehicles_router
from .fuel import router as fuel_router
from .maintenance import router as maintenance_router
from .inventory import router as inventory_router
from .metrics import router as metrics_router
from .admin import router as admin_router
from .users import router as users_router
from .companies import router as companies_router

__all__ = [
    'auth_router',
    'vehicles_router', 
    'fuel_router',
    'maintenance_router',
    'inventory_router',
    'metrics_router',
    'admin_router',
    'users_router',
    'companies_router'
]