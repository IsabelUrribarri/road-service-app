# backend/models/database.py
import os
import requests
from dotenv import load_dotenv
from typing import Dict, Any, Optional, List
import logging
from fastapi import Request

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

class SupabaseClient:
    """
    Cliente profesional para Supabase con soporte JWT para RLS
    """
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        
        if not self.url or not self.key:
            logger.error("❌ SUPABASE_URL o SUPABASE_KEY no configurados en .env")
            raise ValueError("Supabase configuration missing")
        
        self.base_url = f"{self.url}/rest/v1"
        logger.info("✅ Supabase client initialized successfully")
    
    def get_headers(self, token: str = None) -> Dict[str, str]:
        """
        Obtener headers con o sin autenticación JWT
        """
        headers = {
            "apikey": self.key,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        # 🔐 CRÍTICO: Si hay token JWT, usarlo para RLS
        if token:
            headers["Authorization"] = f"Bearer {token}"
        else:
            # Sin JWT, usar API Key (solo para operaciones públicas)
            headers["Authorization"] = f"Bearer {self.key}"
            
        return headers
    
    def health_check(self) -> bool:
        """Verifica la conexión a la base de datos"""
        try:
            response = requests.get(
                f"{self.base_url}/users",
                headers=self.get_headers(),
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
    
    def table(self, table: str, token: str = None) -> 'TableQuery':
        """
        Obtener tabla con autenticación JWT opcional
        """
        return TableQuery(self, table, token)
    
    def rpc(self, function_name: str, params: Dict[str, Any] = None, token: str = None) -> 'RPCQuery':
        """
        Ejecutar RPC con autenticación JWT opcional
        """
        return RPCQuery(self, function_name, params or {}, token)

class TableQuery:
    def __init__(self, client: SupabaseClient, table: str, token: str = None):
        self.client = client
        self.table = table
        self.token = token  # 🔐 JWT para RLS
        self.params = {}
        self.method = "GET"
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
        self.method = "INSERT"
        self.data_to_send = data
        return self
    
    def update(self, data: Dict[str, Any]) -> 'TableQuery':
        self.method = "UPDATE"
        self.data_to_send = data
        return self
    
    def delete(self) -> 'TableQuery':
        self.method = "DELETE"
        return self
    
    def execute(self) -> Dict[str, Any]:
        """
        Ejecuta la consulta con autenticación JWT para RLS
        """
        try:
            # 🔐 USAR JWT SI ESTÁ DISPONIBLE
            headers = self.client.get_headers(self.token)
            
            url = f"{self.client.base_url}/{self.table}"
            
            if self.method == "GET":
                headers["Prefer"] = ""
                response = requests.get(url, headers=headers, params=self.params, timeout=10)
                
            elif self.method == "INSERT":
                headers["Prefer"] = "return=representation"
                response = requests.post(url, headers=headers, json=self.data_to_send, params=self.params, timeout=10)
                
            elif self.method == "UPDATE":
                headers["Prefer"] = "return=representation"
                response = requests.patch(url, headers=headers, json=self.data_to_send, params=self.params, timeout=10)
                
            elif self.method == "DELETE":
                headers["Prefer"] = ""
                response = requests.delete(url, headers=headers, params=self.params, timeout=10)
            
            # Procesar respuesta
            if response.status_code in [200, 201, 204]:
                result_data = response.json() if response.content else []
                return type('obj', (object,), {'data': result_data, 'error': None})()
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                logger.error(f"❌ Database error: {error_msg}")
                return type('obj', (object,), {'data': None, 'error': error_msg})()
                
        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            logger.error(f"❌ Database exception: {error_msg}")
            return type('obj', (object,), {'data': None, 'error': error_msg})()

class RPCQuery:
    def __init__(self, client: SupabaseClient, function_name: str, params: Dict[str, Any], token: str = None):
        self.client = client
        self.function_name = function_name
        self.params = params
        self.token = token
    
    def execute(self) -> Dict[str, Any]:
        """
        Ejecuta RPC con autenticación JWT
        """
        try:
            headers = self.client.get_headers(self.token)
            
            response = requests.post(
                f"{self.client.base_url}/rpc/{self.function_name}",
                headers=headers,
                json=self.params,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                result_data = response.json() if response.content else []
                return type('obj', (object,), {'data': result_data, 'error': None})()
            else:
                error_msg = f"RPC HTTP {response.status_code}: {response.text}"
                return type('obj', (object,), {'data': None, 'error': error_msg})()
                
        except Exception as e:
            error_msg = f"RPC request failed: {str(e)}"
            return type('obj', (object,), {'data': None, 'error': error_msg})()

# Cliente global
supabase = SupabaseClient()

def get_db():
    """Obtener cliente base (sin JWT)"""
    return supabase

def get_authenticated_db(token: str):
    """Obtener cliente autenticado con JWT para RLS"""
    return type('obj', (object,), {
        'table': lambda table: supabase.table(table, token),
        'rpc': lambda fn, params=None: supabase.rpc(fn, params, token)
    })()

def health_check() -> bool:
    return supabase.health_check()

# Placeholders para compatibilidad
class Base:
    pass

engine = None