#!/bin/bash

# Script de inicio PROFESIONAL para producción
echo "🚀 Iniciando Road Service API - Producción"

# Instalar dependencias
pip install -r requirements.txt

# Inicializar base de datos si es necesario
echo "🔧 Verificando configuración inicial..."
python -c "
from scripts.init_database import init_default_user
init_default_user()
" || echo "⚠️  Error en inicialización, continuando..."

# Iniciar servidor FastAPI - PRODUCCIÓN (sin reload)
echo "🌐 Iniciando servidor FastAPI..."
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2