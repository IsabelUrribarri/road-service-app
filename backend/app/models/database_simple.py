# app/models/database_simple.py
import os
import requests
from dotenv import load_dotenv
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

class SupabaseSimple:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json"
        }
        self.base_url = f"{self.url}/rest/v1"
    
    def health_check(self):
        """Verifica que la conexión funcione"""
        try:
            response = requests.get(
                f"{self.base_url}/users",
                headers=self.headers,
                params={"select": "id", "limit": "1"}
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    def query(self, table, method="GET", data=None, filters=None):
        """Ejecuta consultas a Supabase"""
        try:
            url = f"{self.base_url}/{table}"
            params = {}
            
            if filters:
                params.update(filters)
            
            if method.upper() == "GET":
                response = requests.get(url, headers=self.headers, params=params)
            elif method.upper() == "POST":
                response = requests.post(url, headers=self.headers, json=data, params=params)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=self.headers, json=data, params=params)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=self.headers, params=params)
            else:
                raise ValueError(f"Método no soportado: {method}")
            
            if response.status_code in [200, 201]:
                return {"data": response.json(), "error": None}
            else:
                return {"data": None, "error": response.text}
                
        except Exception as e:
            return {"data": None, "error": str(e)}
    
    # Métodos específicos para tu aplicación
    def get_vehicles(self, company_id=None):
        filters = {}
        if company_id:
            filters["company_id"] = f"eq.{company_id}"
        return self.query("vehicles", "GET", filters=filters)
    
    def get_users(self, company_id=None):
        filters = {}
        if company_id:
            filters["company_id"] = f"eq.{company_id}"
        return self.query("users", "GET", filters=filters)

# Instancia global
supabase_simple = SupabaseSimple()

# Funciones de conveniencia
def get_db():
    return supabase_simple

def health_check():
    return supabase_simple.health_check()