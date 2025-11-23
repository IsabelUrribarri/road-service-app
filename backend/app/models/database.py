# backend/models/database.py
import os
import requests
from dotenv import load_dotenv
from typing import Dict, Any, Optional, List
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

class SupabaseClient:
    """
    Cliente simple y robusto para Supabase usando requests
    """
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        
        if not self.url or not self.key:
            logger.error("❌ SUPABASE_URL o SUPABASE_KEY no configurados en .env")
            raise ValueError("Supabase configuration missing")
        
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"  # IMPORTANTE: Para que devuelva los datos insertados
        }
        self.base_url = f"{self.url}/rest/v1"
        logger.info("✅ Supabase client initialized successfully")
    
    def health_check(self) -> bool:
        """
        Verifica la conexión a la base de datos
        """
        try:
            response = requests.get(
                f"{self.base_url}/users",
                headers=self.headers,
                params={"select": "id", "limit": "1"},
                timeout=10
            )
            if response.status_code == 200:
                logger.info("✅ Database health check passed")
                return True
            else:
                logger.error(f"❌ Health check failed with status: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"❌ Database health check failed: {str(e)}")
            return False
    
    def from_table(self, table: str) -> 'TableQuery':
        """
        Simula la interfaz del cliente original de Supabase
        Usamos from_table en lugar de from (palabra reservada)
        """
        return TableQuery(self, table)
    
    def table(self, table: str) -> 'TableQuery':
        """
        Alternativa para compatibilidad
        """
        return TableQuery(self, table)

class TableQuery:
    def __init__(self, client: SupabaseClient, table: str):
        self.client = client
        self.table = table
        self.params = {}
        self.method = "GET"  # Por defecto
        self.data_to_send = None
    
    def select(self, columns: str = "*", count: Optional[str] = None) -> 'TableQuery':
        self.params["select"] = columns
        if count:
            self.params["count"] = count
        return self
    
    def eq(self, column: str, value: Any) -> 'TableQuery':
        self.params[column] = f"eq.{value}"
        return self
    
    def limit(self, n: int) -> 'TableQuery':
        self.params["limit"] = str(n)
        return self
    
    def insert(self, data: Dict[str, Any]) -> 'TableQuery':
        """Prepara inserción, pero no ejecuta aún"""
        self.method = "INSERT"
        self.data_to_send = data
        return self
    
    def update(self, data: Dict[str, Any]) -> 'TableQuery':
        """Prepara actualización, pero no ejecuta aún"""
        self.method = "UPDATE"
        self.data_to_send = data
        return self
    
    def delete(self) -> 'TableQuery':
        """Prepara eliminación, pero no ejecuta aún"""
        self.method = "DELETE"
        return self
    
    def execute(self) -> Dict[str, Any]:
        """
        Ejecuta la consulta según el método configurado
        """
        try:
            headers = {
                "apikey": self.client.key,
                "Authorization": f"Bearer {self.client.key}",
                "Content-Type": "application/json",
            }
            
            if self.method == "GET":
                headers["Prefer"] = ""
                response = requests.get(
                    f"{self.client.base_url}/{self.table}",
                    headers=headers,
                    params=self.params,
                    timeout=10
                )
                
            elif self.method == "INSERT":
                headers["Prefer"] = "return=representation"
                response = requests.post(
                    f"{self.client.base_url}/{self.table}",
                    headers=headers,
                    json=self.data_to_send,
                    params=self.params,
                    timeout=10
                )
                
            elif self.method == "UPDATE":
                headers["Prefer"] = "return=representation"
                response = requests.patch(
                    f"{self.client.base_url}/{self.table}",
                    headers=headers,
                    json=self.data_to_send,
                    params=self.params,
                    timeout=10
                )
                
            elif self.method == "DELETE":
                headers["Prefer"] = ""
                response = requests.delete(
                    f"{self.client.base_url}/{self.table}",
                    headers=headers,
                    params=self.params,
                    timeout=10
                )
            
            # Procesar respuesta
            if response.status_code in [200, 201, 204]:
                result_data = response.json() if response.content else []
                return type('obj', (object,), {'data': result_data, 'error': None})()
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                return type('obj', (object,), {'data': None, 'error': error_msg})()
                
        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            return type('obj', (object,), {'data': None, 'error': error_msg})()
# Cliente global de Supabase
supabase = SupabaseClient()

def get_db():
    """
    Obtiene el cliente de Supabase para la base de datos
    """
    return supabase

def health_check() -> bool:
    """
    Verifica la conexión a la base de datos
    """
    return supabase.health_check()

# Base class for SQLModel (mantener para compatibilidad)
class Base:
    pass

# Engine placeholder for SQLModel (mantener para compatibilidad)
engine = None