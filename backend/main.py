# En la sección de imports:
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
from app.routes.invitations import router as invitations_router
from app.routes.admin import router as admin_router
from app.routes.users import router as users_router
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
import os

app = FastAPI(
    title="Road Service API",
    description="API completa para gestión de compañías de road service con WebSockets",
    version="2.0.0"
)

# CONFIGURACIÓN CORS PROFESIONAL - PRODUCCIÓN
# ===============================================
# ⚠️ ACTUALIZA ESTOS DOMINIOS CUANDO TENGAS TU DOMINIO EN VERCEL
CORS_ORIGINS = [
    "http://localhost:5173", 
    "http://localhost:3000",
    "http://127.0.0.1:5173", 
    "http://127.0.0.1:3000",
    # ↓↓↓ AGREGA TU DOMINIO DE VERCEL AQUÍ ↓↓↓
    "https://TU_DOMINIO_VERCEL_AQUI.vercel.app",
    "https://road-service-app.vercel.app",  # Ejemplo
    # ↑↑↑ ACTUALIZA CON TU DOMINIO REAL ↑↑↑
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

# ELIMINADO: Middleware de debug (no para producción)
# ELIMINADO: Endpoints de debug (/debug-login, /direct-login)

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

# WebSocket endpoint con timeout para producción
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
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)  # reload=False en producción