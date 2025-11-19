# Road Service Manager

Aplicación completa para gestión de compañías de road service con métricas de combustible, mantenimiento e inventario.

## Características

- ✅ Dashboard con métricas en tiempo real
- ✅ Gestión de vehículos y mecánicos
- ✅ Registro de combustible y cálculos automáticos
- ✅ Sistema de mantenimiento preventivo
- ✅ Control de inventario por unidad
- ✅ Autenticación JWT
- ✅ 100% Responsive (mobile/tablet/desktop)
- ✅ UI moderna con componentes shadcn/ui
- ✅ Gráficos con Recharts
- ✅ Notificaciones Toast
- ✅ Modales para formularios

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + Python
- **Base de datos**: Supabase (PostgreSQL)
- **Despliegue**: Vercel (Frontend) + Render (Backend)

## Configuración

### Backend

1. Crear cuenta en [Supabase](https://supabase.com)
2. Crear nuevo proyecto y ejecutar el SQL schema proporcionado
3. Configurar variables de entorno en `.env`:

```env
SUPABASE_URL=tu_url_de_supabase
SUPABASE_KEY=tu_clave_de_supabase

# Road Service Backend

Backend FastAPI para la aplicación de gestión de road service.

## Configuración

1. Crear archivo `.env` basado en `.env.example`
2. Configurar las variables de Supabase
3. Instalar dependencias: `pip install -r requirements.txt`
4. Ejecutar: `python main.py` o `./start.sh`

## Endpoints Principales

- `POST /auth/register` - Registro de usuarios
- `POST /auth/login` - Login de usuarios
- `GET /vehicles` - Listar vehículos
- `POST /vehicles` - Crear vehículo
- `GET /fuel` - Listar registros de combustible
- `POST /fuel` - Crear registro de combustible
- `GET /metrics` - Obtener métricas del dashboard

## Base de Datos

La aplicación usa Supabase (PostgreSQL). Ejecutar el schema SQL proporcionado en la carpeta `database/` para crear las tablas.