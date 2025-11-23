# En la sección de imports:
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
from app.routes.invitations import router as invitations_router
from app.routes.admin import router as admin_router
from app.routes.users import router as users_router  # ✅ AGREGAR ESTA LÍNEA
from typing import Dict, List
from app.routes.setup import router as setup_router
from app.routes import (
    auth_router, 
    vehicles_router, 
    fuel_router, 
    maintenance_router, 
    inventory_router, 
    metrics_router
)
import json
import time

app = FastAPI(
    title="Road Service API",
    description="API completa para gestión de compañías de road service con WebSockets",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# LUEGO los otros middlewares...
# En main.py - REEMPLAZA el middleware de debug con esta versión:

# @app.middleware("http")
# async def debug_middleware(request: Request, call_next):
#     # ✅ IGNORAR peticiones OPTIONS (preflight de CORS)
#     if request.method == "OPTIONS":
#         return await call_next(request)
    
#     # ✅ Solo debug para login
#     if request.url.path == "/auth/login":
#         print(f"🎯 [MIDDLEWARE] Login request received: {request.method} {request.url}")
        
#         # Leer el body para debug
#         body_bytes = await request.body()
#         if body_bytes:
#             print(f"🎯 [MIDDLEWARE] Raw body: {body_bytes.decode()}")
        
#         # Necesitamos recrear el request para que pueda ser leído nuevamente
#         from starlette.requests import Request
#         async def receive():
#             return {'type': 'http.request', 'body': body_bytes}
        
#         request = Request(request.scope, receive)
    
#     response = await call_next(request)
#     return response


# Agrega esto después de los middlewares
# REEMPLAZA el options_handler con esta versión mejorada:
# @app.options("/{path:path}")
# async def options_handler(request: Request, path: str):
#     return JSONResponse(
#         status_code=200,
#         headers={
#             "Access-Control-Allow-Origin": "http://localhost:5173",
#             "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
#             "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Requested-With, Accept, Origin",
#             "Access-Control-Allow-Credentials": "true",
#             "Access-Control-Max-Age": "86400",  # Cache por 24 horas
#         }
#     )


# Endpoint de debug - DESPUÉS de los middlewares
@app.post("/debug-login")
async def debug_login(request: Request):
    print("🎯 [DEBUG] /debug-login endpoint hit!")
    
    try:
        body = await request.json()
        print(f"📦 [DEBUG] Raw JSON: {body}")
        
        email = body.get("email")
        password = body.get("password")
        
        return {
            "debug": True,
            "received_email": email,
            "received_password": password,
            "message": "Debug endpoint working"
        }
    except Exception as e:
        print(f"💥 [DEBUG] Error: {e}")
        return {"error": str(e)}

# El resto de tu código (WebSocket, routers, etc.) permanece igual...
# Manager de conexiones WebSocket
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, company_id: str):
        await websocket.accept()
        if company_id not in self.active_connections:
            self.active_connections[company_id] = []
        self.active_connections[company_id].append(websocket)
        print(f"Cliente conectado. Compañía: {company_id}, Total: {len(self.active_connections[company_id])}")

    def disconnect(self, websocket: WebSocket, company_id: str):
        if company_id in self.active_connections:
            self.active_connections[company_id].remove(websocket)
            if not self.active_connections[company_id]:
                del self.active_connections[company_id]
        print(f"Cliente desconectado. Compañía: {company_id}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast_to_company(self, message: dict, company_id: str):
        if company_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[company_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error enviando mensaje: {e}")
                    disconnected.append(connection)
            
            for connection in disconnected:
                self.disconnect(connection, company_id)

manager = ConnectionManager()

# WebSocket endpoint
@app.websocket("/ws/{company_id}")
async def websocket_endpoint(websocket: WebSocket, company_id: str):
    await manager.connect(websocket, company_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})
            except:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, company_id)

print("🔍 [DEBUG] Verificando routers...")
print(f"🔍 [DEBUG] Admin router: {admin_router}")
print(f"🔍 [DEBUG] Admin router prefix: {admin_router.prefix}")

# Incluir routers
app.include_router(admin_router)
print("✅ [DEBUG] Admin router incluido")

# Include routers
app.include_router(auth_router)
app.include_router(vehicles_router)
app.include_router(fuel_router)
app.include_router(maintenance_router)
app.include_router(inventory_router)
app.include_router(metrics_router)
app.include_router(admin_router)
app.include_router(invitations_router)
app.include_router(setup_router)
app.include_router(users_router)

@app.post("/direct-login")
async def direct_login(request: Request):
    """Login directo en main.py para debug"""
    print("🎯 [DEBUG] DIRECT-LOGIN ENDPOINT HIT!")
    
    try:
        body = await request.json()
        print(f"📦 [DEBUG] Raw body: {body}")
        
        email = body.get("email")
        password = body.get("password")
        
        # Usar la misma lógica de verificación que sabemos que funciona
        from app.routes.auth import verify_password
        
        # Hash conocido que SABEMOS que funciona
        KNOWN_HASH = "0545f8dc6e5f0043d72675bbde4a34356d4933b896920233f6b89f8d1a872afa:2664b27e0501bd9c9beae0a1adc9df66"
        
        if email == "urribarriisabel5@gmail.com":
            is_valid = verify_password(password, KNOWN_HASH)
            print(f"🔍 [DEBUG] Password valid: {is_valid}")
            
            if is_valid:
                return {"success": True, "message": "Direct login successful"}
            else:
                return {"success": False, "message": "Invalid password"}
        else:
            return {"success": False, "message": "User not found"}
            
    except Exception as e:
        print(f"💥 [DEBUG] ERROR: {e}")
        return {"error": str(e)}

@app.get("/")
async def root():
    return {
        "message": "Road Service API con WebSockets", 
        "version": "2.0.0",
        "docs": "/docs",
        "websocket": "/ws/{company_id}"
    }

@app.get("/health")
async def health_check():
    active_connections = sum(len(conns) for conns in manager.active_connections.values())
    return {
        "status": "healthy", 
        "timestamp": datetime.now().isoformat(),
        "active_websocket_connections": active_connections,
        "companies_connected": list(manager.active_connections.keys())
    }

@app.post("/broadcast/{company_id}")
async def broadcast_message(company_id: str, message: dict):
    await manager.broadcast_to_company(message, company_id)
    return {"status": "message_sent", "company_id": company_id}

# Comentado temporalmente
# def initialize_default_data():
#     try:
#         from scripts.init_database import init_default_user
#         init_default_user()
#     except Exception as e:
#         print(f"⚠️  No se pudo inicializar datos por defecto: {e}")
# initialize_default_data()

@app.post("/admin/initialize-default-user")
async def initialize_default_user_endpoint():
    try:
        from scripts.init_database import init_default_user
        init_default_user()
        return {"message": "Usuario por defecto inicializado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
    
# En main.py - después de la configuración de CORS
@app.get("/test-cors")
async def test_cors():
    """Endpoint de prueba para verificar CORS"""
    return {
        "message": "CORS test successful", 
        "timestamp": datetime.now().isoformat(),
        "cors": "enabled"
    }
    
    # AL FINAL de main.py - AGREGA este middleware
@app.middleware("http")
async def force_cors_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Forzar headers CORS en TODAS las respuestas
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-Requested-With, Accept, Origin"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response