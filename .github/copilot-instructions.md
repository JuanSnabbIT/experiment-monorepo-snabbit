# Instrucciones para Asistencia de Código en ERP Monorepo

## Contexto del Proyecto

Este repositorio implementa un sistema ERP mediante una arquitectura monorepo que separa:

### Backend (`backend/`)
- Framework: Django 5.1 con ASGI para características en tiempo real
- Componentes clave:
  - Channels + Daphne: Manejo de WebSockets y conexiones persistentes
  - Celery: Procesamiento asíncrono y tareas programadas
  - DRF: API REST con autenticación JWT
- Base de datos: SQLite (desarrollo) / PostgreSQL (producción)

### Frontend (`frontend/`)
- Stack: React + Vite + TypeScript
- Estado: Redux Toolkit con thunks para llamadas API
- Autenticación: JWT con refresh tokens
- Variables de entorno: Prefijo `VITE_` (ej: `VITE_API_URL`)

## Estructura y Archivos Clave

### Backend
```
backend/
├── sw_erp/              # Núcleo del proyecto
│   ├── settings.py      # Configuración (lee de variables .env)
│   ├── celery.py       # Config. tareas asíncronas
│   └── asgi.py         # Config. WebSockets/tiempo real
├── */                  # Apps Django (bodegas, cuentas, etc.)
│   ├── models.py       # Modelos de datos
│   ├── views.py        # Vistas y ViewSets
│   ├── serializers.py  # Serialización API
│   └── tasks.py        # Tareas Celery
```

### Frontend
```
frontend/
├── src/
│   ├── services/       # Clientes API
│   ├── store/         # Estado Redux
│   └── components/    # Componentes React
```

## Guía de Razonamiento para Sugerencias

Al proponer código, considera:

1. **Contexto Completo**
   - Revisa `settings.py` para entender la configuración activa
   - Busca patrones similares en apps existentes
   - Considera impacto en tiempo real (Channels) y async (Celery)

2. **Arquitectura**
   - Backend: Sigue patrones DRF (ViewSets, Serializers)
   - Frontend: Usa slices Redux y servicios API tipados
   - Preserva la separación de responsabilidades

3. **Convenciones del Proyecto**
   - URLs API bajo `/api/`
   - Auth JWT en `/auth/jwt/`
   - Tareas Celery con decorador `@shared_task`
   - Endpoints WebSocket definidos en `consumers.py`

## Ejemplos de Implementación

### Backend: Nuevo Endpoint REST
```python
# miapp/serializers.py
from rest_framework import serializers
from .models import MiModelo

class MiModeloSerializer(serializers.ModelSerializer):
    class Meta:
        model = MiModelo
        fields = '__all__'

# miapp/views.py
from rest_framework import viewsets
from .models import MiModelo
from .serializers import MiModeloSerializer

class MiModeloViewSet(viewsets.ModelViewSet):
    queryset = MiModelo.objects.all()
    serializer_class = MiModeloSerializer
```

### Frontend: Llamadas API
```typescript
// services/miServicio.ts
import BaseService from './BaseService';

export const fetchData = async () => {
  return await BaseService.fetchData({
    url: '/api/mi-endpoint/',
    method: 'get'
  });
};
```

## Flujos de Desarrollo

### Backend Local
```bash
# Desde backend/
python -m venv venv
source venv/bin/activate  # o 'venv\Scripts\activate' en Windows
pip install -r req.txt
python manage.py migrate
python manage.py runserver
```

### Servicios Auxiliares
```bash
# Celery worker (tareas asíncronas)
celery -A sw_erp worker --loglevel=info

# Celery beat (tareas programadas)
celery -A sw_erp beat --loglevel=info

# Redis (requerido para Channels y Celery)
# Asegúrate que Redis esté corriendo en REDIS_HOST:REDIS_PORT
```

### Frontend Local
```bash
# Desde frontend/
npm install
npm run dev  # desarrollo
npm run build  # producción
```

## Prácticas a Seguir

1. **Configuración**
   - NO hardcodear secretos o URLs
   - Usar variables de entorno vía `os.getenv()`/`process.env`
   - Documentar nuevas variables en `.env.example`

2. **Seguridad**
   - Validar permisos en ViewSets
   - Sanitizar inputs en frontend
   - NO commitear archivos `.env` o secretos

3. **Calidad**
   - Escribir tests para nuevos endpoints
   - Validar WebSockets con `channels test`
   - Probar tareas Celery localmente

## Archivos de Referencia

Consulta estos archivos para entender patrones:

- API/Auth: `cuentas/views.py`, `BaseService.ts`
- WebSockets: `sw_erp/asgi.py`, cualquier `consumers.py`
- Tareas: `*/tasks.py`, `*/tareas_2do_plano.py`
- Frontend/API: `store/slices/*`, `services/*`