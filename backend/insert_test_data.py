# insert_test_data.py
import sys
import os
import uuid
import random

sys.path.append(os.path.join(os.path.dirname(__file__), 'app', 'models'))

from database import supabase

def insert_test_data():
    print("📝 Insertando datos de prueba...")
    
    company_id = "company_" + str(uuid.uuid4())[:8]
    print(f"🏢 Company ID: {company_id}")
    
    # Generar email único
    unique_id = str(uuid.uuid4())[:8]
    admin_email = f"admin{unique_id}@empresa.com"
    
    # 1. Insertar usuario
    print("\n👤 Insertando usuario...")
    user_result = supabase.table("users").insert({
        "email": admin_email,
        "name": "Administrador Principal",
        "company_id": company_id
    })
    
    if user_result.error:
        print(f"❌ Error insertando usuario: {user_result.error}")
        return
    else:
        user_id = user_result.data[0]["id"] if user_result.data else "N/A"
        print(f"✅ Usuario insertado - ID: {user_id}")
        print(f"📧 Email: {admin_email}")
    
    # 2. Insertar vehículos
    print("\n🚗 Insertando vehículos...")
    vehicles_data = [
        {
            "unit_id": f"VH-{unique_id}-001",
            "mechanic_name": "Carlos Rodríguez",
            "model": "Ford F-150",
            "total_miles": 12500.75,
            "status": "active",
            "company_id": company_id
        },
        {
            "unit_id": f"VH-{unique_id}-002", 
            "mechanic_name": "María González",
            "model": "Toyota Hilux",
            "total_miles": 18750.25,
            "status": "active",
            "company_id": company_id
        },
        {
            "unit_id": f"VH-{unique_id}-003",
            "mechanic_name": "José Martínez", 
            "model": "Chevrolet Silverado",
            "total_miles": 8950.50,
            "status": "maintenance",
            "company_id": company_id
        }
    ]
    
    vehicle_ids = []
    for vehicle in vehicles_data:
        result = supabase.table("vehicles").insert(vehicle)
        if result.error:
            print(f"❌ Error insertando vehículo {vehicle['unit_id']}: {result.error}")
        else:
            vehicle_id = result.data[0]["id"] if result.data else "N/A"
            vehicle_ids.append(vehicle_id)
            print(f"✅ Vehículo {vehicle['unit_id']} insertado - ID: {vehicle_id}")
    
    # 3. Insertar registros de combustible
    print("\n⛽ Insertando registros de combustible...")
    if vehicle_ids:
        fuel_records = [
            {
                "vehicle_id": vehicle_ids[0],
                "date": "2024-01-15",
                "fuel_amount": 45.50,
                "fuel_price": 3.75,
                "total_cost": 170.63,
                "miles_driven": 320.25,
                "consumption": 7.04,
                "company_id": company_id
            },
            {
                "vehicle_id": vehicle_ids[1],
                "date": "2024-01-14", 
                "fuel_amount": 38.25,
                "fuel_price": 3.80,
                "total_cost": 145.35,
                "miles_driven": 285.75,
                "consumption": 7.47,
                "company_id": company_id
            }
        ]
        
        for fuel in fuel_records:
            result = supabase.table("fuel_records").insert(fuel)
            if result.error:
                print(f"❌ Error insertando combustible: {result.error}")
            else:
                print(f"✅ Registro de combustible insertado para vehículo {fuel['vehicle_id']}")
    
    # 4. Insertar mantenimientos
    print("\n🔧 Insertando registros de mantenimiento...")
    if vehicle_ids:
        maintenance_records = [
            {
                "vehicle_id": vehicle_ids[2],
                "maintenance_type": "Cambio de aceite",
                "description": "Cambio de aceite y filtro completo",
                "cost": 120.50,
                "date": "2024-01-10",
                "next_maintenance_date": "2024-04-10",
                "status": "completed",
                "company_id": company_id
            },
            {
                "vehicle_id": vehicle_ids[0],
                "maintenance_type": "Rotación de llantas",
                "description": "Rotación y balanceo de llantas",
                "cost": 85.00,
                "date": "2024-01-12", 
                "next_maintenance_date": "2024-04-12",
                "status": "completed",
                "company_id": company_id
            }
        ]
        
        for maintenance in maintenance_records:
            result = supabase.table("maintenance").insert(maintenance)
            if result.error:
                print(f"❌ Error insertando mantenimiento: {result.error}")
            else:
                print(f"✅ Mantenimiento '{maintenance['maintenance_type']}' insertado")
    
    # 5. Insertar inventario
    print("\n📦 Insertando registros de inventario...")
    if vehicle_ids:
        inventory_items = [
            {
                "vehicle_id": vehicle_ids[0],
                "item_name": "Aceite motor 5W-30",
                "quantity": 12,
                "unit": "litros",
                "min_quantity": 5,
                "status": "available",
                "company_id": company_id
            },
            {
                "vehicle_id": vehicle_ids[1],
                "item_name": "Filtro de aire",
                "quantity": 3,
                "unit": "unidades", 
                "min_quantity": 2,
                "status": "available",
                "company_id": company_id
            },
            {
                "vehicle_id": vehicle_ids[2],
                "item_name": "Líquido de frenos",
                "quantity": 2,
                "unit": "litros",
                "min_quantity": 3,
                "status": "low_stock",
                "company_id": company_id
            }
        ]
        
        for item in inventory_items:
            result = supabase.table("inventory").insert(item)
            if result.error:
                print(f"❌ Error insertando inventario: {result.error}")
            else:
                print(f"✅ Item '{item['item_name']}' insertado")
    
    print(f"\n🎉 ¡Datos de prueba insertados exitosamente!")
    print(f"🏢 Company ID para pruebas: {company_id}")
    print(f"📧 Email admin: {admin_email}")
    
    # Verificar datos insertados
    print("\n🔍 Verificando datos insertados...")
    tables = ["users", "vehicles", "fuel_records", "maintenance", "inventory"]
    for table in tables:
        result = supabase.table(table).select("count", count="exact").execute()
        if not result.error:
            count = result.data[0] if result.data else 0
            print(f"📊 {table}: {count} registros")

if __name__ == "__main__":
    insert_test_data()