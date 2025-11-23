# backend/scripts/init_database.py
import hashlib
import secrets
import uuid
from datetime import datetime

def hash_password(password: str) -> str:
    """Mismo algoritmo que usa tu auth.py"""
    salt = secrets.token_hex(16)
    hashed_password = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return f"{hashed_password}:{salt}"

def init_default_user():
    """Inicializa el usuario por defecto para desarrollo y producción"""
    
    # Configuración del usuario por defecto
    DEFAULT_USER = {
        "id": "95dba2b9-4183-46d4-94dc-fa7094697156",  # Mismo ID que ya tienes
        "email": "urribarriisabel5@gmail.com",
        "name": "Super Administrador",
        "company_id": "b761fd8f-75ee-4352-83e1-01cc461ebd0d",  # ID de tu company
        "role": "super_admin",
        "status": "active",
        "password": "Kellyta.2017"  # La contraseña que quieres usar
    }
    
    try:
        from app.models.database import get_db
        db = get_db()
        
        # Verificar si el usuario ya existe
        existing_user = db.table("users").select("*").eq("email", DEFAULT_USER["email"]).execute()
        
        if existing_user.data:
            # Usuario existe, actualizar contraseña si es necesario
            user = existing_user.data[0]
            print(f"✅ Usuario encontrado: {user['email']}")
            
            # Actualizar contraseña al valor correcto
            db.table("users").update({
                "hashed_password": hash_password(DEFAULT_USER["password"]),
                "status": "active",
                "role": "super_admin",
                "updated_at": datetime.now().isoformat()
            }).eq("id", user["id"]).execute()
            
            print("🔑 Contraseña actualizada correctamente")
            
        else:
            # Crear usuario nuevo
            user_data = {
                "id": DEFAULT_USER["id"],
                "email": DEFAULT_USER["email"],
                "name": DEFAULT_USER["name"],
                "company_id": DEFAULT_USER["company_id"],
                "role": DEFAULT_USER["role"],
                "status": DEFAULT_USER["status"],
                "hashed_password": hash_password(DEFAULT_USER["password"]),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            db.table("users").insert(user_data).execute()
            print("✅ Usuario creado correctamente")
        
        print(f"🎯 Usuario listo: {DEFAULT_USER['email']}")
        print(f"🔑 Contraseña: {DEFAULT_USER['password']}")
        print("📍 Puedes usar estas credenciales en desarrollo y producción")
        
    except Exception as e:
        print(f"❌ Error inicializando usuario: {str(e)}")

if __name__ == "__main__":
    init_default_user()