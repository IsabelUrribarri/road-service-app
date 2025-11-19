from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from app.routes.invitations import router as invitations_router
from app.routes.admin import router as admin_router
from typing import Dict, List
from app.routes import (
    auth_router, 
    vehicles_router, 
    fuel_router, 
    maintenance_router, 
    inventory_router, 
    metrics_router
)
import json

import asyncio

app = FastAPI(
    title="Road Service API",
    description="API completa para gestión de compañías de road service con WebSockets",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Manager de conexiones WebSocket
class ConnectionManager:
    def __init__(self):
        # company_id -> lista de conexiones
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
            
            # Limpiar conexiones desconectadas
            for connection in disconnected:
                self.disconnect(connection, company_id)

manager = ConnectionManager()

# WebSocket endpoint para real-time
@app.websocket("/ws/{company_id}")
async def websocket_endpoint(websocket: WebSocket, company_id: str):
    await manager.connect(websocket, company_id)
    try:
        while True:
            # Mantener la conexión activa
            data = await websocket.receive_text()
            # Opcional: procesar mensajes del cliente
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})
            except:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, company_id)

# Include routers
app.include_router(auth_router)
app.include_router(vehicles_router)
app.include_router(fuel_router)
app.include_router(maintenance_router)
app.include_router(inventory_router)
app.include_router(metrics_router)
app.include_router(invitations_router)

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

# Endpoint para probar broadcast
@app.post("/broadcast/{company_id}")
async def broadcast_message(company_id: str, message: dict):
    await manager.broadcast_to_company(message, company_id)
    return {"status": "message_sent", "company_id": company_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)