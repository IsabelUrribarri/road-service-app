# test_compatibility.py
import sys
import os

# Añadir app/models al path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app', 'models'))

print("🧪 Probando compatibilidad del nuevo database.py...")

try:
    from database import health_check, get_db, supabase
    print("✅ Módulo database importado correctamente")
    
    # Test health check
    if health_check():
        print("✅ Health check passed!")
    else:
        print("❌ Health check failed")
        
    # Test con la interfaz original (usando table() en lugar de from)
    print("\n📊 Probando interfaz con table()...")
    
    # Probando select (como antes)
    result = supabase.table("users").select("*").limit(1).execute()
    if result.error:
        print(f"⚠️  Select error: {result.error}")
    else:
        print(f"✅ Select: {len(result.data)} registros")
    
    # Probando eq filter
    result = supabase.table("vehicles").select("*").eq("status", "active").limit(1).execute()
    if result.error:
        print(f"⚠️  Filter error: {result.error}")
    else:
        print(f"✅ Filter: {len(result.data)} registros")
    
    # También probando from_table (nueva función)
    result = supabase.from_table("fuel_records").select("*").limit(1).execute()
    if result.error:
        print(f"⚠️  from_table error: {result.error}")
    else:
        print(f"✅ from_table: {len(result.data)} registros")
    
    print("\n🎉 ¡Nuevo database.py funcionando con interfaz compatible!")
    
except ImportError as e:
    print(f"❌ Error de importación: {e}")
except Exception as e:
    print(f"❌ Error general: {e}")