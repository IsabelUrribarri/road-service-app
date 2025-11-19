# backend/create_super_admin_secure.py
import sys
import os
import getpass  # ✅ Para input seguro de password
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models.database import get_db
import uuid
import hashlib
import secrets
from datetime import datetime

def hash_password(password: str) -> str:
    """Hash seguro para producción"""
    salt = secrets.token_hex(16)
    hashed_password = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000  # 100k iteraciones
    ).hex()
    return f"{hashed_password}:{salt}"

def create_super_admin():
    db = get_db()
    
    # ✅ Input seguro - no se muestra en pantalla
    print("🔐 CREACIÓN SEGURA DE SUPER ADMIN")
    print("=" * 40)
    
    email = input("📧 Email del Super Admin: ")
    name = input("👤 Nombre completo: ")
    
    # ✅ Password no visible
    password = getpass.getpass("🔑 Password (no se mostrará): ")
    confirm_password = getpass.getpass("🔑 Confirmar password: ")
    
    if password != confirm_password:
        print("❌ Los passwords no coinciden")
        return
    
    if len(password) < 8:
        print("❌ El password debe tener al menos 8 caracteres")
        return
    
    super_admin_data = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": name,
        "company_id": "system_admin",
        "role": "super_admin",
        "status": "active",
        "hashed_password": hash_password(password),  # ✅ Hash seguro
        "created_at": datetime.now().isoformat(),
        "last_login": None,
        "email_verified": True
    }
    
    try:
        # ✅ Verificar si ya existe
        existing = db.table("users").select("*").eq("email", email).execute()
        
        if existing.data:
            print("❌ Ya existe un usuario con ese email")
            return
        
        # ✅ Crear Super Admin
        result = db.table("users").insert(super_admin_data).execute()
        
        if result.data:
            print("\n" + "=" * 50)
            print("✅ SUPER ADMIN CREADO EXITOSAMENTE!")
            print("=" * 50)
            print(f"📧 Email: {email}")
            print(f"👤 Nombre: {name}")
            print(f"🔐 Rol: Super Administrador")
            print(f"🏢 Company ID: system_admin")
            print("\n⚠️  GUARDA ESTA INFORMACIÓN EN UN LUGAR SEGURO")
            print("🔒 El password fue hasheado y no se almacenó en texto plano")
            print("\n🚀 Ahora puedes:")
            print("   1. Login en http://localhost:5173")
            print("   2. Ir a /admin para crear empresas")
            print("   3. Cambiar tu password después del primer login")
        else:
            print("❌ Error creando Super Admin")
            
    except Exception as e:
        print(f"❌ Error de base de datos: {str(e)}")

def cleanup_script():
    """✅ Limpiar rastros del script"""
    import os
    script_name = os.path.basename(__file__)
    print(f"\n🧹 Recomendación: Elimina este archivo después de usarlo")
    print(f"   Comando: rm {script_name}")

if __name__ == "__main__":
    create_super_admin()
    cleanup_script()