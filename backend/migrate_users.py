# backend/migrate_users.py
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.database import get_db
import hashlib
import secrets

def hash_password(password: str) -> str:
    """Hash seguro para producción"""
    salt = secrets.token_hex(16)
    hashed_password = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return f"{hashed_password}:{salt}"

def migrate_existing_users():
    """Migrar usuarios existentes al nuevo sistema"""
    db = get_db()
    
    # Obtener todos los usuarios existentes
    users_result = db.table("users").select("*").execute()
    
    if not users_result.data:
        print("No hay usuarios para migrar")
        return
    
    for user in users_result.data:
        # Si el usuario no tiene role, asignar uno por defecto
        if not user.get('role'):
            # Si es el primer usuario, hacerlo super_admin, sino worker
            update_data = {
                "role": "worker",
                "status": "active"
            }
            
            # Si no tiene password, asignar una temporal
            if not user.get('hashed_password'):
                update_data["hashed_password"] = hash_password("TempPassword123!")
                update_data["password_reset_required"] = True
            
            # Actualizar usuario
            db.table("users").update(update_data).eq("id", user["id"]).execute()
            print(f"Usuario migrado: {user['email']} -> {update_data['role']}")
    
    print("Migración completada")

if __name__ == "__main__":
    migrate_existing_users()