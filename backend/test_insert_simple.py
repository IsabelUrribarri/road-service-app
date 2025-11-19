# test_insert_simple.py
import sys
import os
import uuid

sys.path.append(os.path.join(os.path.dirname(__file__), 'app', 'models'))

from database import supabase

def test_simple_insert():
    print("🧪 Probando inserción simple...")
    
    # 1. Insertar usuario
    unique_id = str(uuid.uuid4())[:8]
    email = f"test{unique_id}@empresa.com"
    
    print(f"👤 Insertando usuario: {email}")
    user_result = supabase.table("users").insert({
        "email": email,
        "name": "Test User",
        "company_id": f"test_company_{unique_id}"
    })
    
    if user_result.error:
        print(f"❌ Error: {user_result.error}")
        return
    
    print(f"✅ Usuario insertado: {user_result.data}")
    
    # 2. Insertar vehículo
    print(f"🚗 Insertando vehículo...")
    vehicle_result = supabase.table("vehicles").insert({
        "unit_id": f"TEST-{unique_id}",
        "mechanic_name": "Test Mechanic",
        "model": "Test Model",
        "total_miles": 1000.0,
        "status": "active",
        "company_id": f"test_company_{unique_id}"
    })
    
    if vehicle_result.error:
        print(f"❌ Error: {vehicle_result.error}")
        return
    
    print(f"✅ Vehículo insertado: {vehicle_result.data}")
    
    # Verificar que tenemos IDs reales
    if user_result.data and len(user_result.data) > 0:
        user_id = user_result.data[0].get('id')
        print(f"📋 User ID: {user_id} (type: {type(user_id)})")
    
    if vehicle_result.data and len(vehicle_result.data) > 0:
        vehicle_id = vehicle_result.data[0].get('id')
        print(f"📋 Vehicle ID: {vehicle_id} (type: {type(vehicle_id)})")

if __name__ == "__main__":
    test_simple_insert()