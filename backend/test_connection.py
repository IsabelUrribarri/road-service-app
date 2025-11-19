# test_connection.py
import sys
import os

# Añadir app/models al path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app', 'models'))

print("📁 Buscando database.py en app/models...")

try:
    from database import health_check, get_db
    print("✅ Módulo database importado correctamente")
    
except ImportError as e:
    print(f"❌ Error importando database: {e}")
    sys.exit(1)

def test_supabase_connection():
    print("\n🧪 Probando conexión a Supabase...")
    
    # Test health check
    if health_check():
        print("✅ Health check passed!")
    else:
        print("❌ Health check failed - verificando variables de entorno...")
        print("💡 Asegúrate de que tu .env tenga SUPABASE_URL y SUPABASE_KEY")
        return
    
    # Test real query
    try:
        db = get_db()
        
        # Probar consultas a todas las tablas
        tables = ['vehicles', 'users', 'fuel_records', 'maintenance', 'inventory']
        
        for table in tables:
            try:
                result = db.table(table).select("*").limit(1).execute()
                print(f"✅ {table}: {len(result.data)} registros")
            except Exception as e:
                print(f"⚠️  {table}: Error - {e}")
        
        print("\n🎉 ¡Conexión a Supabase funcionando correctamente!")
        
    except Exception as e:
        print(f"❌ Error en consulta: {e}")

if __name__ == "__main__":
    test_supabase_connection()