# backend/scripts/quick_setup.py
import requests
import os

def quick_setup():
    """Setup rápido para desarrollo"""
    
    # Configuración
    API_URL = "http://localhost:8000"
    SETUP_TOKEN = "dev-setup-2024"
    
    # Configurar token
    os.environ['SETUP_TOKEN'] = SETUP_TOKEN
    
    try:
        print("🚀 INICIALIZACIÓN RÁPIDA")
        print("=" * 50)
        
        # Verificar estado
        status = requests.get(f"{API_URL}/setup/status").json()
        print("📊 Estado actual:", status)
        
        if status['is_initialized']:
            print("✅ El sistema ya está inicializado")
            return
        
        # Inicializar
        response = requests.post(
            f"{API_URL}/setup/initialize",
            json={"setup_token": SETUP_TOKEN}
        )
        
        if response.status_code == 200:
            result = response.json()
            print("🎉 SISTEMA INICIALIZADO EXITOSAMENTE")
            print(f"📧 Email: {result['admin_email']}")
            print("🔐 Contraseña: [configurada en el código]")
            print("⚠️  " + result['security_warning'])
        else:
            print(f"❌ Error: {response.text}")
            
    finally:
        # Limpiar
        if 'SETUP_TOKEN' in os.environ:
            del os.environ['SETUP_TOKEN']

if __name__ == "__main__":
    quick_setup()