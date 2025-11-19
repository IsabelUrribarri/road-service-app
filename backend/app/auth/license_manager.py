# backend/app/auth/company_manager.py (OPCIONAL - si quieres mantener verificación de empresa)
from fastapi import HTTPException, Depends
from ..models.database import get_db
from .jwt_handler import get_current_user

class CompanyManager:
    async def verify_company_active(self, company_id: str):
        """Verificar que la empresa esté activa"""
        db = get_db()
        company = db.table("companies").select("status").eq("id", company_id).execute()
        
        if not company.data:
            raise HTTPException(status_code=404, detail="Company not found")
        
        if company.data[0].get("status") != "active":
            raise HTTPException(status_code=403, detail="Company account is not active")
        
        return True

company_manager = CompanyManager()

# Dependency para verificar empresa activa
async def require_active_company(user: dict = Depends(get_current_user)):
    """Verificar que la empresa del usuario esté activa"""
    await company_manager.verify_company_active(user["company_id"])
    return user