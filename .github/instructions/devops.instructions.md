# Instrucciones DevOps y Testing

> Instrucciones específicas para Docker, CI/CD, scripts y testing.
> Aplican cuando el alcance es infraestructura, despliegue o testing.

---

## Docker

### Backend

- **Dockerfile**: `backend/Dockerfile` — Python 3.12-slim.
- **Entrypoint multi-modo**: `web` (Daphne ASGI), `celery-worker`, `celery-beat`.
- **Optimizado**: `backend/Dockerfile.optimized` para producción.
- **Build**: `build-and-push-backend.ps1` desde la raíz del monorepo.

```bash
# Desarrollo local (sin Docker)
cd backend
python manage.py runserver 0.0.0.0:8000

# Docker
docker build -t erpsnabbit-backend backend/
docker run -p 8000:8000 erpsnabbit-backend              # web
docker run erpsnabbit-backend celery-worker               # worker
docker run erpsnabbit-backend celery-beat                  # beat
```

### Frontend

- **Dockerfile**: `frontend/Dockerfile` — Build Vite + nginx.
- **Build**: `build-and-push-frontend.ps1` desde la raíz.

---

## Variables de Entorno

### Backend (`backend/.env`)

Variables requeridas:
```
SECRET_KEY=
POSTGRES_DB_COMUNAS=
POSTGRES_DB_ERP_PRODUC=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_HOST=
POSTGRES_PORT=
REDIS_HOST=
REDIS_PORT=
HOSTAPIV2=
LOCALHOST_IP=
HOSTCORREO=
CORREO_APPWEB=
PASSWORDCORREO=
FRONTEND_URL=
APIV1URLHTTP_LOCALHOST=
APIV1URLHTTPS=
```

### Frontend

Variables `VITE_*` cargadas por Vite:
```
VITE_API_URL=http://localhost:8000
```

---

## Base de Datos

### Multi-database

| Key | Dev | Prod |
|---|---|---|
| `default` | SQLite (`db.sqlite3`) | PostgreSQL |
| `db_comunas` | PostgreSQL (siempre) | PostgreSQL |

### Migraciones

```bash
cd backend
python manage.py makemigrations    # Generar
python manage.py migrate           # Aplicar
```

- VS Code Tasks disponibles: "Backend: Make Migrations", "Backend: Migrate", "Backend: Migrations (Make + Migrate)".
- **NUNCA** eliminar archivos de migración sin usar los scripts dedicados (`eliminar_migraciones.ps1` / `.sh`).
- **NUNCA** modificar manualmente migraciones generadas por Django.

### Reset completo (desarrollo)

```bash
python dev/scripts/setup/reset_db.py
python dev/scripts/setup/setup_superuser.py
python dev/scripts/setup/seed_base.py
```

---

## Celery

### Configuración

- Broker: Redis (`redis://{REDIS_HOST}:{REDIS_PORT}/0`)
- Backend: Redis
- Scheduler: `django-celery-beat` (DatabaseScheduler)
- Timezone: `America/Santiago`

### Tareas programadas (Beat)

| Tarea | Horario |
|---|---|
| `actualizar_contratos_vencidos` | Diario 08:00 |
| `expirar_cotizaciones_vencidas` | Diario 00:00 |
| `refrescar_tipo_cambio_proyecciones` | Diario 06:00 |

Definidas en `sw_erp/celery.py` → `beat_schedule`.

### Desarrollo local

```bash
# Worker
celery -A sw_erp worker --loglevel=info --pool=solo --concurrency=1

# Beat
celery -A sw_erp beat --loglevel=info
```

---

## Scripts de Desarrollo

| Script | Ruta | Propósito |
|---|---|---|
| `reset_db.py` | `dev/scripts/setup/` | Elimina BD SQLite y recrea con migraciones |
| `setup_superuser.py` | `dev/scripts/setup/` | Crea superusuario de desarrollo |
| `seed_base.py` | `dev/scripts/setup/` | Datos base (monedas, categorías, etc.) |
| `crear_datos_ordentrabajo.py` | `dev/scripts/setup/` | Datos de prueba para OT |
| `check_seed.py` | `dev/scripts/setup/` | Verifica estado del seed |

**Reglas para crear scripts:**
- Scripts de setup/mantenimiento → `dev/scripts/`
- **NUNCA** crear scripts sueltos en `backend/` o `frontend/`
- Si creas un script temporal para debug, **elimínalo inmediatamente** después de usarlo

---

## VS Code Tasks

Todas las tareas están definidas en `.vscode/tasks.json`:

| Task | Acción |
|---|---|
| **Dev: Start All** | Inicia Backend + Celery + Frontend |
| **Dev: Start Backend** | Runserver + Worker + Beat |
| **Backend: Runserver** | `manage.py runserver 0.0.0.0:8000` |
| **Backend: Celery Worker** | Worker con pool solo |
| **Backend: Celery Beat** | Beat scheduler |
| **Frontend: Dev Server** | `npm run dev -- --port 5173` |
| **Backend: Migrations** | makemigrations + migrate secuencial |
| **Backend: Reset DB** | Reset completo de BD |
| **Backend: Seed Base** | Carga datos base |
| **Docker: Build+Push** | Build y push a registry |

---

## Kubernetes

- El backend está preparado para K8s (detección de `KUBERNETES_SERVICE_HOST` en settings).
- Redis service name por defecto: `redis`.
- El entrypoint auto-detecta si está en K8s para ajustar Redis host.

---

## Monitoreo

- `django-prometheus` activo: métricas expuestas en `/metrics/`.
- Endpoint definido en `sw_erp/urls.py`.

---

## Testing

### Backend
- Framework: `django.test.TestCase` + `rest_framework.test.APITestCase`.
- Ejecutar: `python manage.py test`
- Archivo: `tests.py` dentro de cada app.

### Frontend
- Dependencias instaladas: `@testing-library/react`, `@testing-library/jest-dom`.
- **No hay tests implementados actualmente** — infraestructura existe pero no se usa.
- Si se crean tests: colocar en `__tests__/` dentro de cada feature o junto al componente.

---

## Checklist de despliegue

1. ¿Migraciones generadas y aplicadas?
2. ¿Variables de entorno configuradas en el target?
3. ¿`TESTING = False` para producción? (controla la BD)
4. ¿Build de frontend con `VITE_API_URL` correcto?
5. ¿Redis accesible para Celery y Channels?
6. ¿`collectstatic` ejecutado (automático en entrypoint)?
