# test_models_compatibility.py
import sys
import os
import uuid

sys.path.append(os.path.join(os.path.dirname(__file__), 'app', 'models'))

from database import supabase

def test_models_compatibility():
    print("🧪 Probando compatibilidad con modelos...")
    
    # Test 1: Verificar que podemos acceder a todas las tablas
    tables = ["users", "vehicles", "fuel_records", "maintenance", "inventory"]
    
    for table in tables:
        try:
            result = supabase.table(table).select("*").limit(2).execute()
            if result.error:
                print(f"❌ {table}: Error - {result.error}")
            else:
                print(f"✅ {table}: OK - {len(result.data)} registros")
        except Exception as e:
            print(f"❌ {table}: Exception - {e}")
    
    # Test 2: Probar queries complejas
    print("\n🔍 Probando queries avanzadas...")
    
    # Query con filtros
    result = supabase.table("vehicles").select("*").eq("status", "active").limit(5).execute()
    print(f"✅ Vehículos activos: {len(result.data)}")
    
    # Query con selección específica
    result = supabase.table("fuel_records").select("fuel_amount, total_cost, miles_driven").limit(3).execute()
    print(f"✅ Campos específicos combustible: {len(result.data)}")
    
    # Test 3: Probar inserción (CORREGIDO - sin .execute() en insert)
    print("\n📝 Probando inserción...")
    unique_id = str(uuid.uuid4())[:8]
    test_data = {
        "unit_id": f"TEST-{unique_id}",
        "mechanic_name": "Test User",
        "model": "Test Model", 
        "total_miles": 1000.0,
        "status": "active",
        "company_id": f"test_company_{unique_id}"
    }
    
    # CORRECCIÓN: insert() ya ejecuta directamente, no necesita .execute()
    result = supabase.table("vehicles").insert(test_data)
    if result.error:
        print(f"❌ Inserción test: {result.error}")
    else:
        print(f"✅ Inserción test: OK - ID {result.data[0]['id']}")
        
        # Limpiar test (también sin .execute() en delete)
        delete_result = supabase.table("vehicles").eq("unit_id", f"TEST-{unique_id}").delete()
        print(f"✅ Cleanup test: {len(delete_result.data) if delete_result.data else 0} registros eliminados")

if __name__ == "__main__":
    test_models_compatibility()