---
title: "Arquitectura del Sistema ERP"
scope: "full-stack"
status: "active"
last_updated: "2025-11-05"
---

# 🏗️ Arquitectura del Sistema ERP

## Objetivo
Documentar la arquitectura completa del monorepo ERP, incluyendo estructura de carpetas, tecnologías, flujos de datos y decisiones de diseño.

---

## 📁 Estructura del Monorepo

```
monorepo_erp/
├── .git/                   # Control de versiones
├── .github/                # 📚 Documentación centralizada
│   ├── copilot-instructions.md
│   ├── ARQUITECTURA_SISTEMA.md (este archivo)
│   ├── INICIALIZACION.md
│   ├── EXPLORACION_EMPRESAS.md
│   ├── GUIA_EXPLORACION_SISTEMA.md
│   ├── REFERENCIA_RAPIDA_ENDPOINTS.md
│   └── instructions/
│       ├── backend/        # Instrucciones específicas de Django
│       ├── frontend/       # Instrucciones específicas de React
│       ├── backend-instructions.md      # Backend general
│       ├── frontend-instructions.md     # Frontend general
│       ├── redux-thunks.md
│       ├── store-structure.md
│       ├── standards.md
│       ├── security.md
│       ├── pr-flow.md
│       ├── ci-cd.md
│       ├── testing.md
│       ├── performance.md
│       ├── observability.md
│       ├── playbooks.md
│       ├── tasks.instructions.md
│       └── glossary.md
├── .vscode/                # Configuración de VS Code
│   └── tasks.json          # Tareas automatizadas
├── backend/                # 🐍 Django 5.1 Backend
│   ├── sw_erp/             # Proyecto principal
│   ├── activos/            # App: Gestión de activos (vehículos, equipos)
│   ├── bd_ciudades/        # App: Datos geográficos (regiones, comunas)
│   ├── bodegas/            # App: Inventario y movimientos de stock
│   ├── calendario/         # App: Eventos y calendario
│   ├── contratos/          # App: Contratos comerciales
│   ├── core/               # App: Funcionalidad transversal (emails, notificaciones)
│   ├── cotizaciones/       # App: Cotizaciones a clientes
│   ├── cuentas/            # App: Usuarios y autenticación
│   ├── empresas/           # App: Empresas cliente y sucursales
│   ├── items/              # App: Productos y servicios
│   ├── ordentrabajo/       # App: Órdenes de trabajo técnicas
│   ├── recursos/           # App: Recursos humanos y equipos
│   ├── rendiciones/        # App: Rendiciones de gastos
│   ├── retroalimentacion/  # App: Feedback de clientes
│   ├── vacaciones/         # App: Solicitudes de vacaciones
│   ├── visitas/            # App: Visitas técnicas/comerciales
│   ├── ENV/                # Entorno virtual Python (no versionado)
│   ├── manage.py           # CLI de Django
│   ├── req.txt             # Dependencias Python
│   ├── db.sqlite3          # Base de datos local (desarrollo)
│   ├── Dockerfile          # Imagen Docker backend
│   ├── *.ipynb             # Notebooks Jupyter de exploración
│   └── usuarios_*.xlsx     # Planillas para importación masiva
├── frontend/               # ⚛️ React + Vite Frontend
│   ├── src/
│   │   ├── assets/         # Recursos estáticos (imágenes, íconos)
│   │   ├── components/     # Componentes reutilizables
│   │   ├── config/         # Configuración (pages.config.ts)
│   │   ├── hooks/          # Hooks personalizados
│   │   ├── interface/      # TypeScript interfaces
│   │   ├── pages/          # Páginas/vistas principales
│   │   ├── routes/         # Definición de rutas
│   │   ├── services/       # Servicios HTTP (BaseService, ApiService)
│   │   ├── store/          # Redux Toolkit (slices, thunks)
│   │   ├── utils/          # Utilidades generales
│   │   ├── App.tsx         # Componente raíz
│   │   ├── main.tsx        # Entry point
│   │   └── index.css       # Estilos globales (Tailwind)
│   ├── public/             # Archivos públicos
│   ├── package.json        # Dependencias Node.js
│   ├── vite.config.ts      # Configuración Vite
│   ├── tsconfig.json       # Configuración TypeScript
│   ├── tailwind.config.cjs # Configuración TailwindCSS
│   ├── Dockerfile          # Imagen Docker frontend
│   └── nginx.conf          # Configuración Nginx (producción)
├── scripts/                # 🛠️ Scripts de utilidad
│   ├── setup/              # Inicialización del sistema
│   │   ├── setup_superuser.py      # Configura superusuario con empresa
│   │   ├── seed_data.py            # Pobla BD con datos de prueba
│   │   └── reset_db.py             # Resetea base de datos (⚠️ destructivo)
│   ├── development/        # Herramientas de desarrollo
│   │   ├── create_groups.py        # Crea/actualiza grupos de permisos
│   │   ├── check_personalizacion.py # Diagnóstico de personalización
│   │   ├── list_endpoints.py       # Lista todos los endpoints
│   │   └── reset_local_data.py     # Wrapper para reset_db
│   └── maintenance/        # Mantenimiento
│       └── backup_db.py            # Backup de base de datos
├── .gitignore              # Archivos ignorados por Git
└── README.md               # Documentación principal del proyecto
```

---

## 🎯 Stack Tecnológico

### Backend (Django 5.1)

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Python** | 3.11+ | Lenguaje de programación |
| **Django** | 5.1 | Framework web |
| **Django REST Framework** | Latest | APIs REST |
| **Daphne** | Latest | Servidor ASGI (WebSockets) |
| **Channels** | Latest | WebSockets y tiempo real |
| **Celery** | Latest | Tareas asíncronas |
| **Redis** | Latest | Broker Celery + Caché + Channels |
| **SimpleJWT** | Latest | Autenticación JWT |
| **Djoser** | Latest | Auth endpoints (login, registro, reset password) |
| **django-cors-headers** | Latest | CORS para frontend |
| **django-celery-beat** | Latest | Tareas programadas |
| **django-extensions** | Latest | Utilidades de desarrollo |
| **django-simple-history** | Latest | Auditoría de cambios |
| **django-import-export** | Latest | Import/export de datos |
| **django-filter** | Latest | Filtros en APIs |
| **django-taggit** | Latest | Sistema de etiquetas |
| **django-prometheus** | Latest | Métricas de monitoreo |
| **SQLite** | - | Base de datos (desarrollo) |
| **PostgreSQL** | - | Base de datos (producción) |

### Frontend (React 18)

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | 18 | Biblioteca UI |
| **TypeScript** | Latest | Tipado estático |
| **Vite** | Latest | Build tool rápido |
| **Redux Toolkit** | Latest | Estado global |
| **React Router** | 6 | Navegación y rutas |
| **Axios** | Latest | Cliente HTTP |
| **TailwindCSS** | Latest | Framework de estilos |
| **Formik** | Latest | Manejo de formularios |
| **Yup** | Latest | Validación de esquemas |
| **React Query** | Latest (opcional) | Caché de queries |

### DevOps y Herramientas

| Tecnología | Propósito |
|------------|-----------|
| **Docker** | Contenedorización |
| **Nginx** | Servidor web frontend (producción) |
| **Git** | Control de versiones |
| **VS Code** | IDE principal |
| **Jupyter** | Notebooks de exploración |
| **Black** | Formateo de código Python |
| **Ruff** | Linter Python |
| **ESLint** | Linter TypeScript/React |
| **Prettier** | Formateo de código JS/TS |

---

## 🔄 Flujos de Datos

### Flujo de una Request REST

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (React + Redux)                                    │
│                                                              │
│ 1. Usuario hace clic en "Ver Cotizaciones"                  │
│    ↓                                                         │
│ 2. Componente dispara thunk: fetchCotizaciones()            │
│    ↓                                                         │
│ 3. Thunk llama ApiService.fetchData({                       │
│       url: '/api/cotizaciones/',                            │
│       method: 'get'                                          │
│    })                                                        │
│    ↓                                                         │
│ 4. BaseService agrega header:                               │
│    Authorization: Bearer {JWT_TOKEN}                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
                      HTTP GET Request
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ BACKEND (Django + DRF)                                       │
│                                                              │
│ 5. Middleware CORS valida origen                            │
│    ↓                                                         │
│ 6. JWTAuthentication valida token                           │
│    - Extrae user_id del payload                             │
│    - Asigna request.user                                    │
│    ↓                                                         │
│ 7. IsAuthenticated verifica usuario autenticado             │
│    ↓                                                         │
│ 8. CotizacionViewSet.get_queryset():                        │
│    - Filtra por empresa del usuario                         │
│    - Aplica permisos adicionales                            │
│    ↓                                                         │
│ 9. Django ORM ejecuta query SQL:                            │
│    SELECT * FROM cotizaciones_cotizacion                    │
│    WHERE empresa_id = ...                                   │
│    ↓                                                         │
│ 10. CotizacionSerializer serializa datos                    │
│     - Modelos → JSON                                        │
│     - Incluye relaciones (empresa, items)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
                      HTTP Response (JSON)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (React + Redux)                                    │
│                                                              │
│ 11. Axios recibe respuesta                                  │
│     ↓                                                        │
│ 12. Thunk procesa datos:                                    │
│     - fulfilled: action.payload = datos                     │
│     - rejected: action.payload = error                      │
│     ↓                                                        │
│ 13. Redux reducer actualiza state:                          │
│     state.cotizacion.listaCotizaciones = datos              │
│     state.cotizacion.loading = false                        │
│     ↓                                                        │
│ 14. React re-renderiza componente:                          │
│     - useAppSelector lee state.cotizacion                   │
│     - Renderiza tabla con datos                             │
│     ↓                                                        │
│ 15. Usuario ve tabla de cotizaciones                        │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Autenticación (JWT)

```
1. Login
   ↓
   POST /auth/jwt/create
   { email, password }
   ↓
   Backend valida credenciales
   ↓
   Retorna { access, refresh }
   ↓
   Frontend guarda en localStorage
   ↓
2. Requests subsecuentes
   ↓
   Authorization: Bearer {access}
   ↓
3. Cuando access expira (5h)
   ↓
   POST /auth/jwt/refresh
   { refresh }
   ↓
   Backend retorna nuevo access
   ↓
   Frontend actualiza localStorage
```

### Flujo de Tareas Asíncronas (Celery)

```
1. Usuario solicita generar reporte PDF
   ↓
   Frontend: POST /api/reportes/generar
   ↓
   Backend: encola tarea Celery
   - generar_reporte_pdf.delay(params)
   ↓
   Retorna 202 Accepted + task_id
   ↓
   Frontend muestra "Procesando..."
   ↓
2. Celery Worker (proceso separado)
   ↓
   - Conecta a Redis (broker)
   - Toma tarea de la cola
   - Ejecuta generar_reporte_pdf()
   - Genera PDF con ReportLab
   - Guarda en media/reportes/
   - Marca tarea como completada
   ↓
3. Frontend polling o WebSocket
   ↓
   GET /api/reportes/status/{task_id}
   ↓
   Backend: { status: 'SUCCESS', result: '/media/reportes/...' }
   ↓
   Frontend descarga PDF
```

### Flujo de WebSocket (Channels)

```
1. Frontend abre WebSocket
   ↓
   ws://localhost:8000/ws/notificaciones/
   ↓
   Backend: NotificacionConsumer.connect()
   - Valida autenticación
   - Agrega a grupo "user_{user_id}"
   ↓
2. Evento en backend (ej: nueva OT asignada)
   ↓
   Backend: channel_layer.group_send(
     f"user_{tecnico_id}",
     { 'type': 'nueva_ot', 'data': {...} }
   )
   ↓
   NotificacionConsumer.nueva_ot(event)
   - Envía mensaje al cliente
   ↓
3. Frontend recibe mensaje
   ↓
   WebSocket.onmessage(event)
   ↓
   Muestra notificación en UI
```

---

## 🗂️ Organización de Apps Django

Cada app Django en `backend/` sigue esta estructura:

```
<app>/
├── __init__.py
├── admin.py              # Configuración Django Admin
├── apps.py               # Configuración de la app
├── models.py             # Modelos de datos (tablas DB)
├── serializers.py        # Serializers DRF (JSON ↔ Models)
├── views.py              # ViewSets y APIViews
├── urls.py               # Rutas de la app
├── filters.py            # Filtros personalizados (opcional)
├── tasks.py              # Tareas Celery (opcional)
├── signals.py            # Señales Django (opcional)
├── tests.py              # Tests unitarios
├── migrations/           # Migraciones de base de datos
└── __pycache__/          # Bytecode Python (no versionado)
```

### Responsabilidades por Capa

| Archivo | Responsabilidad |
|---------|-----------------|
| `models.py` | Definición de tablas, relaciones, validaciones de modelo |
| `serializers.py` | Transformación JSON ↔ Modelo, validaciones de entrada |
| `views.py` | Lógica de endpoints, permisos, respuestas HTTP |
| `urls.py` | Mapeo de rutas a vistas |
| `tasks.py` | Procesos en segundo plano (emails, reportes) |
| `signals.py` | Lógica reactiva (ej: enviar email al crear usuario) |
| `admin.py` | Interfaz de administración Django |

---

## 🎨 Organización de Frontend

```
src/
├── assets/               # Imágenes, íconos, fuentes
├── components/           # Componentes reutilizables
│   ├── Button.tsx
│   ├── Modal.tsx
│   ├── Table.tsx
│   └── ...
├── config/               # Configuración
│   └── pages.config.ts   # Permisos por ruta
├── hooks/                # Hooks personalizados
│   ├── useAuth.ts
│   ├── useDebounce.ts
│   └── ...
├── interface/            # TypeScript interfaces
│   ├── empresa.interface.ts
│   ├── cotizacion.interface.ts
│   └── ...
├── pages/                # Páginas/vistas
│   ├── Dashboard/
│   ├── Empresas/
│   ├── Cotizaciones/
│   └── ...
├── routes/               # Configuración de rutas
│   ├── AppRoutes.tsx
│   └── PrivateRoute.tsx
├── services/             # Servicios HTTP
│   ├── BaseService.ts    # Interceptores, JWT
│   ├── ApiService.ts     # Wrapper de BaseService
│   └── <domain>Service.ts
├── store/                # Redux Toolkit
│   ├── index.ts          # Store principal
│   ├── rootReducer.ts    # Combina reducers
│   ├── hook.ts           # useAppDispatch, useAppSelector
│   └── slices/
│       ├── auth/
│       ├── empresa/
│       ├── cotizacion/
│       └── ...
├── utils/                # Utilidades
│   ├── formatters.ts
│   ├── validators.ts
│   └── ...
├── App.tsx               # Componente raíz
├── main.tsx              # Entry point
└── index.css             # Estilos globales (Tailwind)
```

### Responsabilidades por Capa

| Carpeta | Responsabilidad |
|---------|-----------------|
| `components/` | UI reutilizable, sin lógica de negocio |
| `pages/` | Orquestación de componentes, lógica de página |
| `services/` | Llamadas HTTP, manejo de errores |
| `store/` | Estado global, operaciones asíncronas (thunks) |
| `hooks/` | Lógica reutilizable (side effects, estado local) |
| `interface/` | Tipado TypeScript (contratos de datos) |
| `utils/` | Funciones puras (formateo, validación) |

---

## 🔐 Arquitectura de Seguridad

### Capas de Seguridad

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CORS (backend/sw_erp/settings.py)                        │
│    - Lista blanca de orígenes permitidos                    │
│    - CORS_ALLOWED_ORIGINS = ['http://localhost:5173', ...]  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. JWT Authentication                                        │
│    - Token firmado con SECRET_KEY                           │
│    - Access token (5h) + Refresh token (10h)                │
│    - Rotación automática de refresh tokens                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. DRF Permissions                                           │
│    - IsAuthenticated (por defecto)                          │
│    - Permisos personalizados por ViewSet                    │
│    - Filtros en get_queryset() por empresa/sucursal         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Django Groups & Permissions                              │
│    - Grupos: staff, superadmin, tecnico, bodeguero, etc.    │
│    - Permisos por modelo (add, change, delete, view)        │
│    - UsuarioEmpresa: usuario ↔ empresa + grupos             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Validaciones de Entrada                                  │
│    - Serializers DRF (backend)                              │
│    - Yup schemas (frontend)                                 │
│    - Sanitización de datos                                  │
└─────────────────────────────────────────────────────────────┘
```

### Modelo de Permisos

```
User (Django Auth)
├── is_superuser          # Superadmin completo
├── is_staff              # Acceso a Django Admin
├── groups (M2M)          # Grupos globales
│   ├── staff
│   ├── superadmin
│   └── multi-empresas
├── PersonalizacionUsuario (One-to-One)
│   ├── sucursal_principal   # Contexto operativo
│   ├── tema
│   └── font_size
└── UsuarioEmpresa (Many-to-Many via)
    ├── empresa (FK)
    ├── sucursal (FK)
    ├── grupos (M2M)      # Grupos específicos de empresa
    │   ├── tecnico
    │   ├── bodeguero
    │   └── representante_legal
    └── estado            # Activo/Inactivo
```

**Filtrado de datos**:
```python
# backend/<app>/views.py
class CotizacionViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        personalizacion = PersonalizacionUsuario.objects.filter(
            usuario=self.request.user
        ).first()
        
        if personalizacion and personalizacion.sucursal_principal:
            # Usuario ve solo datos de su sucursal
            return Cotizacion.objects.filter(
                sucursal=personalizacion.sucursal_principal
            )
        
        return Cotizacion.objects.none()
```

---

## 📊 Modelo de Datos (Relaciones Principales)

```
Empresa
├── rut_empresa
├── nombre
├── direccion_principal
├── sucursales → [SucursalEmpresa]
└── clientes (M2M a sí misma)

SucursalEmpresa
├── nombre
├── direccion
├── empresa (FK a Empresa)
├── es_casa_matriz
├── usuarios → [UsuarioEmpresa]
└── personalizaciones → [PersonalizacionUsuario]

User (Django Auth)
├── email (unique)
├── first_name, last_name
├── is_superuser, is_staff
├── UsuarioEmpresa (M2M via)
└── PersonalizacionUsuario (One-to-One)

UsuarioEmpresa
├── usuario (FK a User)
├── empresa (FK a Empresa)
├── sucursal (FK a SucursalEmpresa)
├── grupos (M2M a Group)
└── estado

Item
├── codigo
├── nombre
├── descripcion
├── tipo (producto/servicio)
├── categoria (FK a CategoriaItem)
├── fabricante (FK a Fabricante)
└── precio

StockItemEnBodega
├── item (FK a Item)
├── bodega (FK a Bodega)
├── cantidad
└── lote

Bodega
├── nombre
├── sucursal (FK a SucursalEmpresa)
├── encargado (FK a User)
└── stock → [StockItemEnBodega]

Cotizacion
├── numero
├── fecha
├── empresa (FK a Empresa)
├── sucursal (FK a SucursalEmpresa)
├── estado (borrador, enviada, aprobada, rechazada)
├── items → [ItemCotizacion]
└── contrato (FK a Contrato, nullable)

Contrato
├── numero
├── cotizacion (FK a Cotizacion, nullable)
├── empresa (FK a Empresa)
├── fecha_inicio, fecha_termino
├── estado (activo, vencido, renovado)
├── items → [ItemContrato]
└── ordenes_trabajo → [OrdenTrabajo]

OrdenTrabajo
├── numero
├── contrato (FK a Contrato)
├── tipo (instalacion, mantenimiento, reparacion)
├── fecha_programada
├── estado (pendiente, asignada, en_progreso, completada)
├── recursos_asignados → [AsignacionRecurso]
├── activos_usados → [AsignacionActivo]
└── movimientos_bodega → [MovimientoInventario]

Recurso
├── usuario (FK a User, nullable)
├── tipo (empleado, equipo)
├── especialidades (M2M a Especialidad)
└── asignaciones → [AsignacionRecurso]

Activo
├── codigo
├── nombre
├── tipo (vehiculo, equipo, herramienta)
├── estado (operativo, en_mantencion, fuera_servicio)
└── asignaciones → [AsignacionActivo]

Rendicion
├── numero
├── orden_trabajo (FK a OrdenTrabajo, nullable)
├── tipo (gasto, ingreso)
├── monto
├── fecha
├── comprobante (archivo)
└── estado (pendiente, aprobada, rechazada)

Vacacion
├── usuario (FK a User)
├── fecha_inicio, fecha_termino
├── dias_solicitados
├── motivo
└── estado (pendiente, aprobada, rechazada)

Visita
├── numero
├── empresa (FK a Empresa)
├── tipo (tecnica, comercial)
├── fecha
├── responsable (FK a User)
├── ubicacion_gps
└── notas
```

---

## 🔄 Decisiones de Diseño

### 1. Monorepo vs Multirepo
**Decisión**: Monorepo  
**Razón**:
- Backend y frontend altamente acoplados (mismo dominio de negocio)
- Documentación centralizada en `.github/`
- Facilita refactorizaciones que tocan ambos lados
- Versionado sincronizado

### 2. Django ORM vs SQLAlchemy
**Decisión**: Django ORM  
**Razón**:
- Integración nativa con Django
- Migraciones automáticas
- Admin panel gratuito
- Suficiente para complejidad actual

### 3. Redux Toolkit vs Context API
**Decisión**: Redux Toolkit  
**Razón**:
- Estado global complejo (auth, empresas, cotizaciones, etc.)
- DevTools para debugging
- Thunks para operaciones asíncronas
- Escalabilidad

### 4. JWT vs Session-based Auth
**Decisión**: JWT  
**Razón**:
- Stateless (backend no guarda sesiones)
- Escalable a múltiples servidores
- Compatible con mobile (futuro)
- Refresh token para seguridad

### 5. Celery vs Django-Q
**Decisión**: Celery  
**Razón**:
- Más maduro y estable
- Mejor para tareas programadas (django-celery-beat)
- Integración con Redis (ya usado para Channels)
- Escalable a múltiples workers

### 6. TailwindCSS vs Material-UI
**Decisión**: TailwindCSS  
**Razón**:
- Diseño personalizado (no look-and-feel genérico)
- Menor bundle size
- Flexibilidad total
- Curva de aprendizaje aceptable

### 7. SQLite vs PostgreSQL (desarrollo)
**Decisión**: SQLite en desarrollo, PostgreSQL en producción  
**Razón**:
- SQLite: cero configuración, rápido para dev local
- PostgreSQL: funcionalidades avanzadas en producción
- Django ORM abstrae diferencias

---

## 📈 Escalabilidad

### Horizontalmente Escalable
- **Backend**: Stateless (JWT), puede escalarse a múltiples instancias detrás de load balancer
- **Frontend**: Archivos estáticos, servibles desde CDN
- **Celery Workers**: Pueden escalarse independientemente

### Bottlenecks Potenciales
1. **Base de datos**: SQLite no es adecuado para producción → migrar a PostgreSQL
2. **Redis**: Punto único de falla → considerar Redis Cluster
3. **Media files**: Almacenar en S3/MinIO en producción

### Optimizaciones Implementadas
- Paginación en APIs (50 items por página)
- `select_related`/`prefetch_related` en queries complejas
- Caché de queries costosas en Redis
- Lazy loading de componentes React
- Code splitting en frontend (Vite)

---

## 🧪 Testing

### Backend
- **Unit tests**: `python manage.py test`
- **Coverage**: `coverage run --source='.' manage.py test`
- **Fixtures**: Archivos JSON en `<app>/fixtures/`

### Frontend
- **Unit tests**: Jest + React Testing Library
- **E2E**: (Pendiente) Cypress o Playwright
- **Mocks HTTP**: msw (Mock Service Worker)

### Objetivo de Cobertura
- **Módulos críticos**: >= 70%
- **Módulos auxiliares**: >= 50%

---

## 📚 Referencias

- [Inicialización del Sistema](./INICIALIZACION.md)
- [Backend Instructions](./instructions/backend-instructions.md)
- [Frontend Instructions](./instructions/frontend-instructions.md)
- [Security](./instructions/security.md)
- [Performance](./instructions/performance.md)

---

**Última actualización**: 2025-11-05  
**Mantenido por**: Equipo de desarrollo ERP
