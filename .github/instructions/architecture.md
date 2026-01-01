# 🏗️ Architecture – Monorepo ERP

Visión general de la arquitectura, estructura del monorepo y patrones de integración.

---

## 📁 Estructura del Monorepo

```
monorepo_erp/
├── .github/                     # 📚 Documentación y guías
│   ├── copilot-instructions.md  # 📌 Índice maestro para agentes AI
│   └── instructions/            # Guías específicas por tecnología
│       ├── architecture.md       # Esta guía
│       ├── backend-guide.md
│       ├── frontend-guide.md
│       ├── typescript.instructions.md
│       ├── security.md
│       ├── testing.md
│       ├── deployment.md
│       └── glossary.md
│
├── backend/                     # 🧠 Django + DRF + Celery + Channels
│   ├── sw_erp/                  # Proyecto raíz (settings, celery, asgi)
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   ├── celery.py
│   │   └── wsgi.py
│   │
│   ├── <apps>/                  # Cada app es un dominio de negocio
│   │   ├── models.py            # Modelos ORM
│   │   ├── serializers.py       # Serializers DRF
│   │   ├── views.py             # ViewSets y APIs
│   │   ├── urls.py              # Rutas específicas de la app
│   │   ├── tasks.py             # Celery tasks (si aplica)
│   │   ├── filters.py           # Django Filters
│   │   ├── admin.py             # Django Admin
│   │   ├── signals.py           # Django signals (pre/post save)
│   │   ├── migrations/          # DB migrations
│   │   └── tests.py             # Unit tests
│   │
│   ├── core/                    # App central (users, email, shared models)
│   ├── cuentas/                 # Usuarios y autenticación
│   ├── empresas/                # Gestión de empresas/sucursales
│   ├── bodegas/                 # Inventario y movimientos
│   ├── contratos/               # Contratos y servicios
│   ├── cotizaciones/            # Cotizaciones de vendedores
│   ├── ordentrabajov2/          # Órdenes de trabajo (versión 2)
│   ├── rendiciones/             # Gestión de gastos/rendiciones
│   ├── vacaciones/              # Gestión de vacaciones
│   ├── visitas/                 # Registro de visitas
│   ├── activos/                 # Gestión de activos fijos
│   ├── calendario/              # Calendario compartido
│   ├── bd_ciudades/             # Base de datos de ciudades
│   ├── recursos/                # Recursos humanos
│   ├── retroalimentacion/       # Feedback (legacy, en migración)
│   │
│   ├── manage.py
│   ├── req.txt                  # Dependencias Python
│   ├── Dockerfile               # Para contenedor
│   ├── entrypoint.sh            # Script de inicio
│   ├── db.sqlite3               # Base de datos local (desarrollo)
│   └── ENV/                     # Entorno virtual (no versionado)
│
├── frontend/                    # 🎨 React + TypeScript + Redux
│   ├── src/
│   │   ├── components/          # Componentes reutilizables
│   │   ├── pages/               # Páginas/vistas (rutas principales)
│   │   ├── services/            # Servicios HTTP (BaseService)
│   │   ├── store/               # Redux store (slices, thunks)
│   │   ├── hooks/               # Hooks personalizados
│   │   ├── routes/              # Configuración de rutas
│   │   ├── interface/           # TypeScript interfaces
│   │   ├── styles/              # Estilos globales
│   │   ├── utils/               # Funciones utilitarias
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── public/                  # Assets estáticos
│   ├── package.json             # Dependencias Node
│   ├── vite.config.ts           # Configuración Vite
│   ├── tsconfig.json            # Configuración TypeScript
│   ├── tailwind.config.cjs       # Configuración TailwindCSS
│   ├── .eslintrc.json           # Linter rules
│   ├── prettier.config.cjs       # Formatter config
│   ├── Dockerfile               # Para contenedor
│   ├── nginx.conf               # Configuración Nginx (producción)
│   └── node_modules/            # Dependencias (no versionadas)
│
├── dev/                         # 🛠️ Recursos de desarrollo
│   ├── docs/                    # 📖 Documentación técnica viva
│   │   ├── flujos_operativos.md
│   │   ├── CHANGELOG_*.md
│   │   └── ...
│   └── scripts/                 # Scripts de setup y mantenimiento
│       ├── setup/
│       │   ├── reset_db.py
│       │   ├── seed_data.py
│       │   ├── seed_completo.py
│       │   └── ...
│       ├── development/
│       │   └── reset_local_data.py
│       └── maintenance/
│
├── postman/                     # 📮 Colecciones Postman
│   └── ordentrabajov2.postman_collection.json
│
├── AGENTS.md                    # Guía para agentes AI
├── README.md                    # Setup rápido
├── docker-compose.yml           # Stack local (Django, Redis, DB, etc.)
└── workspace.code-workspace     # Workspace de VS Code
```

---

## 🧩 Componentes Principales

### Backend (Django 5.1)

**Stack:**
- Django 5.1.3 + Django REST Framework
- Python: 3.10+ (recomendado 3.12, verificar en Dockerfile o entorno)
- PostgreSQL (producción) / SQLite (desarrollo)
- Celery 5.x + Redis (task queue + cache)
- Django Channels 4.x (WebSockets — configurado pero no activo actualmente)
- SimpleJWT (autenticación sin estado)
- Djoser (endpoints de auth)
- django-simple-history (auditoría)
- django-import-export (importación/exportación datos)

**Características:**
- ✅ RBAC (Role-Based Access Control) con grupos
- ✅ Multi-tenancy (Empresa → Sucursal → Usuarios)
- ✅ Auditoría de cambios (simple_history)
- ✅ Background jobs (Celery + Beat scheduler)
- ⚙️ WebSocket preparado (Channels + Daphne) pero no activo en desarrollo
- ✅ Email asincrónico (core.tasks.send_email_task)

**Autenticación:**
- JWT con refresh tokens (5 horas access, 10 horas refresh)
- Endpoints Djoser para login/logout/register
- JWT automático en headers Authorization: Bearer <token>

---

### Frontend (React 18 + TypeScript + Redux)

**Stack:**
- React 18.3.1 + Vite 5.2.13 (bundler)
- TypeScript 5.4.5 (strict mode)
- Redux Toolkit 2.3.0 (state management)
- React Router v6.23.1 (routing)
- TailwindCSS 3.4.4 (styling)
- Axios 1.7.2 + BaseService (HTTP client con JWT interceptors)
- TanStack Table 8.17.3 (data tables)
- SweetAlert2 11.14.0 (confirmaciones)
- React-Toastify 10.0.5 (notificaciones)
- ESLint + Prettier (quality)

**Características:**
- ✅ Componentes funcionales con hooks
- ✅ Redux slices con thunks async
- ✅ HTTP service con JWT auto-refresh
- ✅ Typesafe Redux dispatch
- ✅ Responsive design (mobile-first)
- ✅ Protected routes (requieren autenticación)

---

## 🔄 Flujo de Datos

### Autenticación (Backend → Frontend)

```
1. Usuario hace POST /api/token/
   ├─ Backend valida credenciales
   └─ Devuelve { access, refresh }

2. Frontend almacena access token
   └─ BaseService lo inyecta en Authorization header

3. Peticiones HTTP automáticas
   ├─ Incluyen Bearer token
   └─ Si expira → refresh automático (BaseService)

4. Logout
   └─ Frontend limpia store + redirige a login
```

### Async Tasks (Backend)

```
1. View recibe POST (ej: generar PDF)
   ├─ Crea Celery task
   └─ Devuelve 200 + task_id al frontend

2. Task se ejecuta en background (worker Celery)
   ├─ Procesa lógica pesada
   ├─ Actualiza estado en BD
   └─ Notifica al frontend (si hay WebSocket activo)

3. Frontend consulta estado
   └─ GET /api/task/{task_id}/status
```

### Multi-tenancy (Empresa)

```
1. Usuario pertenece a UsuarioEmpresa (N-N)
   ├─ usuario_id
   ├─ empresa_id
   ├─ grupos (roles específicos por empresa)
   └─ es_admin_empresa (booleano)

2. Cada consulta debe filtrar por empresa actual
   ├─ Backend: request.user.empresa_activa (si está definida)
   └─ Frontend: store.empresas.empresa_seleccionada

3. Permisos se validan por grupo + empresa
   └─ UsuarioEmpresa.grupos.filter(name='Admin')
```

---

## 🔐 Patrones de Seguridad

### JWT (Backend)
- **Algoritmo:** HS256 (HMAC)
- **Duración:** Access 5h, Refresh 10h
- **Refrescamiento:** Automático (cliente) / Manual (manual refresh endpoint)
- **Revocar:** Blacklist de tokens (django-simplejwt con TOKEN_BLACKLIST_APP)

### CORS (Backend)
- Configurado en `settings.py`: `CORS_ORIGIN_ALLOW_ALL = True` (permisivo en dev)
- Para producción: especificar dominios exactos

### CSRF (Backend)
- CSRF Token necesario para formularios tradicionales
- CORS handles REST APIs (JSON bodies)
- Frontend debe incluir en headers si usa forms

### Validación (Backend)
- DRF Serializers hacen validación de datos
- Permisos DRF en nivel de ViewSet (`IsAuthenticated`, custom)

---

## 📊 Modelos Principales

### Core Domain

```python
# cuentas/models.py
User
  ├── email (unique, usado como username)
  ├── password (hashed)
  ├── is_active
  ├── groups (M2M → Group)
  └── ...

# empresas/models.py
Empresa
  ├── nombre
  ├── rut
  ├── logo
  └── ...

SucursalEmpresa
  ├── empresa (FK)
  ├── nombre
  ├── direccion
  └── ...

UsuarioEmpresa
  ├── usuario (FK)
  ├── empresa (FK)
  ├── grupos (M2M → Group)
  └── es_admin_empresa
```

### Ejemplo: Bodegas (Inventory)

```python
# bodegas/models.py
Bodega
  ├── empresa (FK)
  ├── sucursal (FK)
  ├── nombre
  └── ...

MovimientoBodega
  ├── bodega (FK)
  ├── item (FK)
  ├── cantidad
  ├── tipo (entrada, salida, ajuste)
  └── fecha_movimiento
```

---

## 🚀 Endpoints Principales

### Autenticación (Djoser)
```
POST   /api/token/                      # Login
POST   /api/token/refresh/              # Refresh token
POST   /api/users/                      # Registrar
POST   /api/users/set_password/         # Cambiar contraseña
GET    /api/users/me/                   # Datos usuario actual
```

### Usuarios
```
GET    /api/usuarios/                   # Listar usuarios
POST   /api/usuarios/                   # Crear usuario
GET    /api/usuarios/{id}/              # Detalle
PATCH  /api/usuarios/{id}/              # Actualizar
DELETE /api/usuarios/{id}/              # Eliminar
```

### Órdenes de Trabajo (V2)
```
GET    /api/ordentrabajov2/             # Listar OTs
POST   /api/ordentrabajov2/             # Crear OT
GET    /api/ordentrabajov2/{id}/        # Detalle
PATCH  /api/ordentrabajov2/{id}/        # Actualizar
POST   /api/ordentrabajov2/{id}/cierre/ # Cierre de OT
```

> 📌 Consulta [Postman collections](../../postman/) para endpoints completos.

---

## 🧪 Testing Strategy

### Backend (Pytest)
- Tests por app (`app/tests.py` o `app/tests/`)
- Fixtures de BD (factory_boy)
- Fixtures de usuarios (autenticados + sin autenticar)
- Tests de modelos, serializers, views

### Frontend (Jest + React Testing Library)
- Componentes aislados (unit tests)
- Hooks personalizados
- Redux slices y thunks

**Ejecución:**
```bash
# Backend
python manage.py test

# Frontend
npm run test
```

---

## 🐳 Docker & Deployment

### Development (docker-compose.yml)
```yaml
services:
  web:          # Django runserver
  db:           # PostgreSQL
  redis:        # Cache + broker Celery
  celery:       # Worker
  celery-beat:  # Scheduler
```

### Production
- **Backend:** Daphne (ASGI) + Gunicorn (WSGI fallback)
- **Frontend:** Nginx (reverse proxy + static serve)
- **DB:** PostgreSQL con backups
- **Cache:** Redis cluster
- **Monitoring:** Prometheus + Grafana (configurado)

> Consulta [deployment.md](./deployment.md) para instrucciones de deploy.

---

## 📌 Convenciones Globales

### Naming
- **Modelos Django:** `PascalCase` (ej: `OrdenTrabajo`)
- **Atributos Django:** `snake_case` (ej: `fecha_creacion`)
- **Componentes React:** `PascalCase` (ej: `OrdenTrabajoModal`)
- **Funciones React:** `camelCase` (ej: `fetchOrdenData`)

### Commits
```
feat(backend): agregar nueva API de órdenes
fix(frontend): corregir padding en modal
refactor(backend): simplificar lógica de validación
docs: actualizar README
```

### API Responses
```json
{
  "success": true,
  "data": {...},
  "error": null
}
```

---

## 🔗 Referencias

- [AGENTS.md](../../AGENTS.md) — Principios generales
- [copilot-instructions.md](../copilot-instructions.md) — Índice completo
- [backend-guide.md](./backend-guide.md) — Guía Django
- [frontend-guide.md](./frontend-guide.md) — Guía React
- [README.md](../../README.md) — Setup rápido

**Última actualización:** 2025-12-28

