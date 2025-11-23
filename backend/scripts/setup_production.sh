#!/bin/bash
# backend/scripts/setup_production.sh

#!/bin/bash
set -e

echo "🚀 SETUP PROFESIONAL - ROAD SERVICE APP"
echo "========================================"

# Configuración
API_URL="http://localhost:8000"
SETUP_TOKEN="roadservice-setup-$(date +%s)"

# 1. Configurar token temporal
echo "🔧 Configurando token de seguridad..."
export SETUP_TOKEN="$SETUP_TOKEN"

# 2. Verificar estado
echo "🔍 Verificando estado del sistema..."
curl -s "$API_URL/setup/status" | jq 'del(.setup_token_configured)'

# 3. Inicializar sistema
echo ""
echo "🎯 Inicializando sistema..."
response=$(curl -s -X POST "$API_URL/setup/initialize" \
  -H "Content-Type: application/json" \
  -d "{\"setup_token\": \"$SETUP_TOKEN\"}")

echo "$response" | jq .

# 4. Limpiar token
echo ""
echo "🧹 Limpiando token de seguridad..."
unset SETUP_TOKEN

echo ""
echo "✅ SETUP COMPLETADO"
echo "📧 Email: urribarriisabel5@gmail.com"
echo "🔐 Contraseña: [la que configuraste]"
echo ""
echo "⚠️  ACCIONES DE SEGURIDAD REQUERIDAS:"
echo "   1. Cambia la contraseña inmediatamente después del login"
echo "   2. Verifica que el endpoint /setup no sea accesible públicamente"
echo "   3. Monitorea los logs de acceso"