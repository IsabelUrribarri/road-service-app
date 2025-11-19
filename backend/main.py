from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from app.routes import (
    auth_router, 
    vehicles_router, 
    fuel_router, 
    maintenance_router, 
    inventory_router, 
    metrics_router
)

app = FastAPI(
    title="Road Service API",
    description="API completa para gestión de compañías de road service",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(vehicles_router)
app.include_router(fuel_router)
app.include_router(maintenance_router)
app.include_router(inventory_router)
app.include_router(metrics_router)

@app.get("/")
async def root():
    return {
        "message": "Road Service API", 
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)