# backend/app/routes/admin.py
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from ..models.company import CompanyCreate, CompanyUpdate, CompanyResponse, CompanyWithUsers, CompanyStats
from ..models.user import UserResponse, UserRole, UserStatus
from ..models.database import get_db
from ..auth.jwt_handler import require_super_admin, can_manage_companies
import uuid
from datetime import datetime
print("🔍 [ADMIN DEBUG] admin.py cargado correctamente")
router = APIRouter(prefix="/admin", tags=["admin"])

# =============================================================================
# RUTAS CORREGIDAS - TODAS USAN .execute() CONSISTENTEMENTE
# =============================================================================

# En admin.py - CORRIGE el endpoint de test
@router.get("/test-cors")
async def test_admin_cors():
    """Test específico para CORS en admin router - SIN AUTENTICACIÓN"""
    return {
        "message": "Admin router CORS test - SUCCESS", 
        "timestamp": datetime.now().isoformat(),
        "router": "admin",
        "status": "working"
    }

@router.get("/test-auth")
async def test_admin_auth(admin: dict = Depends(require_super_admin)):
    """Test con autenticación de super_admin"""
    return {
        "message": "Admin auth test - SUCCESS", 
        "timestamp": datetime.now().isoformat(),
        "user": admin,
        "authenticated": True
    }



@router.post("/companies/", response_model=CompanyResponse)
async def create_company(
    company_data: CompanyCreate,  # ✅ Ahora sin created_by
    admin: dict = Depends(require_super_admin)
):
    """
    Crear una nueva empresa (Solo Super Admin)
    """
    try:
        db = get_db()
        
        print(f"🔍 Debug - Creando compañía: {company_data.dict()}")
        
        # Verificar si ya existe una empresa con ese nombre
        existing_company = db.table("companies").select("*").eq("name", company_data.name).execute()
        if existing_company.data:
            raise HTTPException(status_code=400, detail="Company with this name already exists")
        
        company_id = str(uuid.uuid4())
        company = {
            "id": company_id,
            "name": company_data.name,
            "contact_email": company_data.contact_email,
            "contact_phone": company_data.contact_phone,
            "address": company_data.address,
            "status": "active",
            "created_by": admin["user_id"],  # ✅ Asignar automáticamente desde el admin
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        print(f"🔍 Debug - Insertando compañía: {company}")
        result = db.table("companies").insert(company).execute()
        print(f"🔍 Debug - Resultado: {result.data}, Error: {result.error}")
        
        if result.data:
            return CompanyResponse(**result.data[0])
        else:
            error_msg = str(result.error) if result.error else "Unknown error"
            raise HTTPException(status_code=400, detail=f"Error creating company: {error_msg}")
            
    except Exception as e:
        print(f"❌ Error en create_company: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/companies/", response_model=List[CompanyResponse])
async def get_all_companies(
    skip: int = 0,
    limit: int = 100,
    admin: dict = Depends(require_super_admin)
):
    """
    Obtener todas las empresas (Solo Super Admin)
    """
    try:
        print("🔍 [ADMIN DEBUG] Entrando a get_all_companies")
        print(f"🔍 [ADMIN DEBUG] Usuario autenticado: {admin}")
        
        db = get_db()
        print("🔍 [ADMIN DEBUG] Conexión a BD obtenida")
        
        # ✅ CORREGIDO: Manejar compañías con created_by = None
        result = db.table("companies").select("*").execute()
        print(f"🔍 [ADMIN DEBUG] Query ejecutada: {len(result.data)} compañías")
        
        if result.data:
            companies = []
            for company in result.data:
                # ✅ Asegurar que created_by tenga valor válido
                if company.get('created_by') is None:
                    company['created_by'] = "system"  # Valor por defecto
                companies.append(company)
            
            companies.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            paginated_companies = companies[skip:skip + limit]
            print(f"🔍 [ADMIN DEBUG] Retornando {len(paginated_companies)} compañías")
            return paginated_companies
        
        print("🔍 [ADMIN DEBUG] No hay compañías, retornando lista vacía")
        return []
        
    except Exception as e:
        print(f"❌ [ADMIN DEBUG] ERROR en get_all_companies: {e}")
        import traceback
        print(f"❌ [ADMIN DEBUG] Traceback completo: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/companies/{company_id}", response_model=CompanyWithUsers)
async def get_company_with_users(
    company_id: str,
    admin: dict = Depends(require_super_admin)
):
    """
    Obtener una empresa con todos sus usuarios (Solo Super Admin)
    """
    try:
        db = get_db()
        
        # Obtener la empresa
        company_result = db.table("companies").select("*").eq("id", company_id).execute()
        if not company_result.data:
            raise HTTPException(status_code=404, detail="Company not found")
        
        company = company_result.data[0]
        
        # Obtener usuarios de la empresa
        users_result = db.table("users").select("*").eq("company_id", company_id).execute()
        
        return CompanyWithUsers(
            **company,
            users=users_result.data or []
        )
        
    except Exception as e:
        print(f"❌ Error en get_company_with_users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/companies/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: str,
    company_data: CompanyUpdate,
    admin: dict = Depends(require_super_admin)
):
    try:
        db = get_db()
        
        # Verificar que la empresa existe
        check_result = db.table("companies").select("*").eq("id", company_id).execute()
        if not check_result.data:
            raise HTTPException(status_code=404, detail="Company not found")
        
        update_data = company_data.dict(exclude_unset=True, exclude_none=True)
        update_data["updated_at"] = datetime.now().isoformat()
        
        # ACTUALIZAR usando .update() correctamente
        result = db.table("companies").update(update_data).eq("id", company_id).execute()
        
        if result.data:
            # Obtener la compañía actualizada
            updated_company = db.table("companies").select("*").eq("id", company_id).execute()
            return CompanyResponse(**updated_company.data[0])
        else:
            raise HTTPException(status_code=400, detail="Error updating company")
            
    except Exception as e:
        print(f"❌ Error en update_company: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/companies/{company_id}")
async def delete_company(
    company_id: str,
    admin: dict = Depends(require_super_admin)
):
    """
    Eliminar una empresa (Solo Super Admin)
    """
    try:
        db = get_db()
        
        # Verificar que la empresa existe
        check_result = db.table("companies").select("id").eq("id", company_id).execute()
        if not check_result.data:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Verificar que no hay usuarios en esta empresa
        users_result = db.table("users").select("*").eq("company_id", company_id).execute()
        if users_result.data:
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete company with active users. Please reassign or delete users first."
            )
        
        # ✅ CORREGIDO: Usar .execute() para DELETE
        result = db.table("companies").delete().eq("id", company_id).execute()
        
        if result.data is not None:
            return {"message": "Company deleted successfully"}
        else:
            error_msg = result.error.message if result.error else "Unknown error"
            raise HTTPException(status_code=400, detail=f"Error deleting company: {error_msg}")
            
    except Exception as e:
        print(f"❌ Error en delete_company: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    # En admin.py - agrega esto al final
@router.get("/test-admin-cors")
async def test_admin_cors():
    """Test específico para verificar CORS en el router de admin"""
    return {
        "message": "Admin CORS test successful", 
        "timestamp": datetime.now().isoformat(),
        "router": "admin"
    }
    
# En admin.py - AGREGA este endpoint que usa la estructura EXACTA de tu BD
@router.post("/create-company-now")
async def create_company_now(
    request: dict,
    admin: dict = Depends(require_super_admin)
):
    """Crea compañía usando la estructura EXACTA de tu BD"""
    try:
        db = get_db()
        
        company_id = str(uuid.uuid4())
        company = {
            "id": company_id,
            "name": request.get("name", "Sin nombre"),
            "contact_email": request.get("contact_email"),
            "contact_phone": request.get("contact_phone"),  # ✅ CORRECTO según tu BD
            "address": request.get("address"),
            "status": "active",
            "created_by": admin["user_id"],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        print(f"🔍 Insertando compañía con estructura EXACTA: {company}")
        result = db.table("companies").insert(company).execute()
        
        if result.data:
            return {"success": True, "company": result.data[0]}
        else:
            return {"success": False, "error": str(result.error)}
            
    except Exception as e:
        return {"success": False, "error": str(e)}