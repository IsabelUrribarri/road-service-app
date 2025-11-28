# backend/main.py
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
from app.routes.invitations import router as invitations_router
from app.routes.admin import router as admin_router
from app.routes.users import router as users_router
from typing import Dict, List
from app.auth.jwt_handler import verify_token_simple  # ← FUNCIÓN OPTIMIZADA
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
import os

app = FastAPI(
    title="Road Service API",
    description="API completa para gestión de compañías de road service con WebSockets",
    version="2.0.0"
)

# CONFIGURACIÓN CORS PROFESIONAL - PRODUCCIÓN
CORS_ORIGINS = [
    "http://localhost:5173", 
    "http://localhost:3000",
    "http://127.0.0.1:5173", 
    "http://127.0.0.1:3000",
    "https://road-service-app.vercel.app",
    "https://*.vercel.app", 
]

# También aceptar desde variable de entorno
env_origins = os.getenv("CORS_ORIGINS", "")
if env_origins:
    CORS_ORIGINS.extend(env_origins.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Manager de conexiones WebSocket
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, company_id: str):
        await websocket.accept()
        if company_id not in self.active_connections:
            self.active_connections[company_id] = []
        self.active_connections[company_id].append(websocket)

    def disconnect(self, websocket: WebSocket, company_id: str):
        if company_id in self.active_connections:
            self.active_connections[company_id].remove(websocket)
            if not self.active_connections[company_id]:
                del self.active_connections[company_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast_to_company(self, message: dict, company_id: str):
        if company_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[company_id]:
                try:
                    await connection.send_json(message)
                except Exception:
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

# MIDDLEWARE DE AUTENTICACIÓN PROFESIONAL
@app.middleware("http")
async def authenticate_request(request: Request, call_next):
    # Lista de rutas públicas que no requieren autenticación
    public_routes = [
        "/", "/health", "/docs", "/openapi.json",
        "/auth/login", "/auth/register", "/auth/refresh",
        "/admin/initialize-default-user", "/setup/initialize-system"
    ]
    
    # No autenticar rutas públicas Y requests OPTIONS
    if request.url.path in public_routes or request.method == "OPTIONS":
        return await call_next(request)
    
    # Verificar token para rutas protegidas
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=401, 
            content={"detail": "Token missing or invalid"}
        )
    
    token = auth_header.replace("Bearer ", "")
    
    # 🔐 VERIFICACIÓN OPTIMIZADA
    user_data = verify_token_simple(token)
    if not user_data:
        return JSONResponse(
            status_code=401, 
            content={"detail": "Token verification failed"}
        )
    
    # Agregar user_data al request state para uso en endpoints
    request.state.user = user_data
    return await call_next(request)

# Incluir routers
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

# Endpoints básicos
@app.get("/")
async def root():
    return {
        "message": "Road Service API con WebSockets", 
        "version": "2.0.0",
        "docs": "/docs",
        "websocket": "/ws/{company_id}",
        "environment": "production"
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

@app.post("/admin/initialize-default-user")
async def initialize_default_user_endpoint():
    try:
        from scripts.init_database import init_default_user
        init_default_user()
        return {"message": "Usuario por defecto inicializado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# Middleware CORS adicional para producción
@app.middleware("http")
async def force_cors_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Forzar headers CORS en TODAS las respuestas
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-Requested-With, Accept, Origin"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)