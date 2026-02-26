# Copilot Instructions — Monorepo ERP Snabbit

> Instrucciones maestras para GitHub Copilot.
> Para instrucciones específicas por alcance, consulta `.github/instructions/`.

---

## 1. Descripción del Proyecto

**Monorepo ERP para Snabbit** — sistema de gestión empresarial (ERP) multi-tenant orientado a empresas de servicios técnicos en Chile.

| Capa | Tecnología | Ubicación |
|---|---|---|
| Backend | Django 5.1 + DRF + Celery + Redis + Channels | `backend/` |
| Frontend | React 18 + TypeScript 5 + Vite + Tailwind CSS 3 | `frontend/` |
| DB producción | PostgreSQL (multi-database: ERP + comunas) | — |
| DB desarrollo | SQLite (default) + PostgreSQL (comunas) | `backend/db.sqlite3` |
| Cola de tareas | Celery + Redis (broker) + django-celery-beat | — |
| Websockets | Django Channels + Redis | — |
| Contenedores | Docker (Daphne ASGI) + K8s ready | `backend/Dockerfile` |
| Dev scripts | Python scripts en `dev/scripts/` | — |

---

## 2. Idioma y Convenciones de Nombres

### Regla general: el dominio de negocio se nombra en **español**

| Elemento | Convención | Ejemplo |
|---|---|---|
| Modelos Django | PascalCase español | `OrdenDeTrabajo`, `SoporteTecnico`, `Cotizacion` |
| Campos de modelo | snake_case español | `fecha_creacion`, `estado`, `creado_por`, `nombre` |
| URLs de API | kebab-case español | `/api/ordenes-de-trabajo/`, `/api/cotizaciones-empresa/` |
| Verbose names | Español con tildes | `"Cotización"`, `"Orden de Trabajo"` |
| Choices/estados | slug español | `('pendiente', 'Pendiente')`, `('en_proceso', 'En Proceso')` |
| Serializers | PascalCase español + sufijo `Serializer` | `CotizacionSerializer` |
| ViewSets | PascalCase español + sufijo `ViewSet` | `OrdenDeTrabajoViewSet` |
| Custom actions | kebab-case español en `url_path` | `url_path="cambiar-estado"` |
| Tareas Celery | snake_case español | `actualizar_contratos_vencidos` |
| Componentes React (dominio) | PascalCase español | `CotizacionesEmpresa`, `ListaOT`, `DetalleRendicion` |
| Componentes React (UI) | PascalCase inglés | `Button`, `Card`, `Modal`, `PageWrapper` |
| Interfaces TS | `I` + PascalCase español | `ICotizacion`, `IOrdenDeTrabajo`, `IUsuarioEmpresa` |
| Types TS (UI/tema) | `T` + PascalCase inglés | `TColors`, `TRounded`, `TPage` |
| Slices Redux | camelCase español | `cotizacionSlice`, `ordenTrabajoApi` |
| Thunks | camelCase español | `listaCotizacionesThunk`, `detalleOrdenTrabajoThunk` |
| Hooks | camelCase `use` + español/inglés según dominio | `useEstadoOT`, `useDarkMode` |
| Archivos interface | kebab-case español + `.interface.ts` | `cotizaciones.interface.ts` |
| Archivos type | kebab-case inglés + `.type.ts` | `colors.type.ts` |
| Archivos constantes | kebab-case + `.constant.ts` | `cotizacion.constant.ts` |
| Comentarios/docstrings | Español preferido, inglés aceptable | — |

### Excepciones aceptadas en inglés
- Campos heredados de Django: `is_active`, `is_staff`, `email`, `first_name`, `last_name`
- Términos técnicos universales: `stock`, `items`, `email`, `password`, `token`

---

## 3. Arquitectura Backend (Django + DRF)

### 3.1 Estructura de apps

Cada app Django sigue esta estructura estándar:

```
app_name/
├── __init__.py
├── admin.py
├── apps.py
├── estados_modelo.py    # Choices/estados como tuplas
├── filters.py           # FilterSets (django-filters)
├── functions.py          # Funciones auxiliares de la app
├── managers.py           # Custom managers (si aplica)
├── models.py
├── serializers.py
├── signals.py            # Solo si hay side-effects en save
├── tasks.py              # Tareas Celery (o tareas_2do_plano.py)
├── tests.py
├── urls.py
├── views.py
└── migrations/
```

### 3.2 Modelos — Herencia obligatoria

**TODOS los modelos nuevos** deben heredar de una de estas dos clases base definidas en `core/models.py`:

```python
# Sin auditoría de historial
class ModeloBase(models.Model):
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True

# Con auditoría de historial (django-simple-history)
class ModeloBaseHistorico(models.Model):
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    historia = Historia(inherit=True)
    class Meta:
        abstract = True
```

- Usa `ModeloBaseHistorico` cuando el modelo requiera trazabilidad (contratos, órdenes, stock, cierres).
- `Historia` es el alias de `HistoricalRecords`: `from simple_history.models import HistoricalRecords as Historia`.
- **Nunca** heredes de `models.Model` directamente en modelos nuevos.

### 3.3 Modelo de Usuario

- Modelo custom: `cuentas.User` (definido en `AUTH_USER_MODEL`).
- Extiende `AbstractBaseUser + PermissionsMixin + ModeloBase`.
- `USERNAME_FIELD = 'email'`.
- Manager custom: `UserManager` con `create_user`/`create_superuser`.

### 3.4 Multi-tenancy (Empresa)

**El tenant es la `Empresa`**. La cadena de resolución es:

```
request.user → PersonalizacionUsuario → sucursal_principal → empresa
```

- **Cada `get_queryset()` DEBE filtrar por empresa** del usuario autenticado.
- No existe filtrado a nivel de manager/middleware — es responsabilidad de cada ViewSet.
- `PersonalizacionUsuario` se auto-crea vía signal `post_save` en `User`.

### 3.5 Estados (State Management)

- Los estados se definen en `estados_modelo.py` como tuplas de choices.
- **Convención para apps nuevas**: usar slugs descriptivos: `('pendiente', 'Pendiente')`, `('en_proceso', 'En Proceso')`.
- Las transiciones de estado se validan explícitamente en views (dict `transiciones_validas`), NO en signals.
- Importar con `from .estados_modelo import *` (convención del proyecto).

### 3.6 Serializers

- Un solo serializer por modelo (sin separación read/write).
- Enriquecer lectura con `SerializerMethodField` para:
  - Labels: `get_estado_label()` → `self.get_FOO_display()`
  - Nombres resueltos: `empresa_nombre`, `cliente_nombre`
  - Campos computados: `total_estimado`, `ganancia`
- Validación cruzada en `validate()`.
- Para relaciones polimórficas, usar `GenericForeignKey` + `content_type`.

### 3.7 Views

- **Patrón principal**: `ModelViewSet` con `@action` decorators.
- **Base**: `BaseWriteViewSet(viewsets.ModelViewSet)` con `permission_classes = [IsAuthenticated]`.
- Custom actions para operaciones de negocio:
  - Cambios de estado: `@action(detail=True, methods=["post"], url_path="cambiar-estado")`
  - Operaciones: `@action(detail=True, methods=["post"], url_path="enviar-cotizacion")`
  - Validaciones: `@action(detail=True, methods=["get"], url_path="check-completabilidad")`
- Manejar errores de Celery con try/except `OperationalError`/`CeleryError` → HTTP 503.

### 3.8 URLs

- Usar `DefaultRouter` (DRF) + `NestedDefaultRouter` (rest_framework_nested).
- Todas las URLs bajo prefijo `/api/` (definido en `sw_erp/urls.py`).
- Autenticación bajo `/auth/` (djoser).
- Nombrar rutas en kebab-case español: `ordenes-de-trabajo`, `cotizaciones-empresa`.

### 3.9 Signals

- Uso mínimo y controlado: solo para auto-crear perfiles/entidades relacionadas en `post_save`.
- **NO** usar signals para lógica de negocio ni transiciones de estado.

### 3.10 Tareas Celery

- Usar `@shared_task` decorator.
- Archivo: `tasks.py` (o `tareas_2do_plano.py` en apps legacy).
- Emails: centralizar vía `core.tasks.send_email_task`.
- Tareas programadas se registran en `sw_erp/celery.py` → `beat_schedule`.
- Siempre wrappear `.delay()` con try/except para manejar broker caído.

### 3.11 Dependencias clave del backend

| Paquete | Uso |
|---|---|
| `djangorestframework` | API REST |
| `djoser` + `simplejwt` | Autenticación JWT |
| `django-simple-history` | Auditoría de modelos |
| `django-filter` | Filtros en endpoints |
| `rest_framework_nested` | URLs anidadas |
| `django-cors-headers` | CORS |
| `celery` + `django-celery-beat` | Tareas asíncronas y programadas |
| `channels` + `daphne` | WebSockets + ASGI |
| `reportlab` | Generación de PDFs |
| `openpyxl` | Export Excel |
| `django-taggit` | Tags |
| `django-import-export` | Import/Export admin |
| `holidays` | Feriados chilenos |
| `django-prometheus` | Métricas |

---

## 4. Arquitectura Frontend (React + TypeScript)

### 4.1 Stack técnico

| Aspecto | Tecnología |
|---|---|
| Framework | React 18 (functional components exclusivamente) |
| Bundler | Vite 5 + SWC (`@vitejs/plugin-react-swc`) |
| Lenguaje | TypeScript 5 (strict mode) |
| Estilos | Tailwind CSS 3 (dark mode: `class` strategy) |
| Estado global | Redux Toolkit + RTK Query (migración en curso) |
| Formularios | Formik + Yup |
| Routing | react-router-dom v6 (lazy loading en todas las rutas) |
| HTTP | Axios (con interceptors JWT + refresh token semaphore) |
| Tablas | @tanstack/react-table v8 |
| Calendario | @fullcalendar |
| UI Template | "Fyr" (admin dashboard comercial basado en Tailwind) |
| Path alias | `@/*` → `./src/*` |

### 4.2 Estructura de carpetas del frontend

```
src/
├── App/                 # Componente raíz, AppInitializer, AppLoader
├── components/          # Componentes reutilizables
│   ├── form/            # Input, Select, SelectReact, Checkbox, Validation
│   ├── icon/            # Iconos SVG generados
│   ├── layouts/         # Aside, Header, Footer, PageWrapper, AuthorityCheck
│   ├── ui/              # Button, Card, Modal, Table, Badge, Alert, Dropdown
│   └── ...              # Avatar, Chart, Calendar, RichText, Timeline
├── config/              # pages.config.ts, theme.config.ts
├── constants/           # Constantes por dominio
├── context/             # ThemeContext (único activo)
├── hooks/               # Custom hooks (21+)
├── i18n.ts              # Configuración i18next
├── interface/           # Interfaces de dominio (I* prefix)
├── locales/             # Traducciones es/en/ar
├── pages/               # Páginas por feature (dominio)
│   ├── Cotizaciones/
│   ├── OrdenTrabajo/    # Feature más grande
│   ├── Bodegas/
│   ├── Contratos/
│   ├── Rendiciones/
│   └── ...
├── routes/              # contentRoutes, asideRoutes, headerRoutes
├── services/            # ApiService, BaseService, RtkQueryService
├── store/               # Redux store
│   ├── slices/          # Slices por dominio
│   ├── rootReducer.ts
│   ├── storeSetup.ts    # configureStore + redux-persist
│   └── hook.ts          # useAppDispatch, useAppSelector
├── styles/              # CSS globales
├── templates/           # Layouts del template Fyr
├── types/               # Types UI/tema (T* prefix)
└── utils/               # Utilidades generales
```

### 4.3 Patrón de comunicación con API

**Tres capas:**
1. `BaseService` — instancia Axios con interceptors (JWT, refresh semaphore, logout automático).
2. `ApiService` — wrapper con métodos `fetchData<T>()`.
3. `RtkQueryService` — `createApi` con `axiosBaseQuery` que usa `BaseService`.

**Migración en curso**: de `createAsyncThunk` (slices legacy) a RTK Query hooks (slices nuevos). Ambos patrones coexisten legítimamente.

### 4.4 Patrones de componentes de página

Cada feature sigue esta estructura:

```
pages/FeatureName/
├── ListaFeature.tsx          # Página de listado (react-table)
├── DetalleFeature.tsx        # Página de detalle
├── components/               # Componentes específicos del feature
│   ├── TablaFeature.tsx
│   ├── FormularioFeature.tsx
│   └── ...
└── modals/                   # Modales específicos
    ├── ModalCrearFeature.tsx
    └── ...
```

### 4.5 Control de acceso

- Rutas protegidas: `authority: string[]` en config de rutas (`pages.config.ts`).
- `AuthorityCheck` component wrappea cada ruta y verifica grupos del usuario.
- Hook: `useAuthority(roles)` para checks en componentes.
- Sin autorización ≠ array vacío (público), sino que redirige a `/sin-permisos`.

### 4.6 Estado global — Convenciones de Redux

- **Slices**: un archivo por entidad/feature (`cotizacionSlice.ts`).
- **RTK Query APIs**: un archivo `*Api.ts` por dominio (`cotizacionApi.ts`).
- **Typed hooks**: usar siempre `useAppDispatch` y `useAppSelector` (nunca `useDispatch`/`useSelector` planos).
- **Logout**: dispatch `LOGOUT` action → reset estado completo.
- **Persistencia**: `auth` y `core` persisten en localStorage (key: `core_ert`).

### 4.7 Dependencias clave del frontend

| Paquete | Uso |
|---|---|
| `@reduxjs/toolkit` | State management + RTK Query |
| `react-router-dom` v6 | Routing con lazy loading |
| `formik` + `yup` | Formularios y validación |
| `axios` | HTTP client |
| `@tanstack/react-table` v8 | Tablas de datos |
| `react-select` | Selects avanzados |
| `react-toastify` | Notificaciones toast |
| `sweetalert2` | Diálogos de confirmación |
| `@react-pdf/renderer` | Generación de PDFs client-side |
| `react-signature-canvas` | Captura de firmas |
| `framer-motion` | Animaciones |
| `@fullcalendar` | Calendario |
| `apexcharts` | Gráficos |
| `slate` | Editor rich text |
| `date-fns` + `dayjs` | Manipulación de fechas |
| `i18next` | Internacionalización |
| `@hello-pangea/dnd` | Drag and drop |

---

## 5. DevOps y Scripts

### 5.1 Docker

- **Backend**: `Dockerfile` con Python 3.12-slim. Entrypoint multi-modo: `web` (Daphne), `celery-worker`, `celery-beat`.
- **Frontend**: `Dockerfile` con build de Vite + nginx para servir.
- También existen `Dockerfile.optimized` para builds de producción.
- Build scripts: `build-and-push-backend.ps1`, `build-and-push-frontend.ps1`.

### 5.2 Scripts de desarrollo

| Script | Ubicación | Propósito |
|---|---|---|
| `setup_superuser.py` | `dev/scripts/setup/` | Crear superusuario |
| `seed_base.py` | `dev/scripts/setup/` | Seed de datos base |
| `reset_db.py` | `dev/scripts/setup/` | Reset completo de BD |
| `crear_datos_ordentrabajo.py` | `dev/scripts/setup/` | Datos de prueba para OT |

### 5.3 Servidor de desarrollo

- Backend: `python manage.py runserver 0.0.0.0:8000`
- Frontend: `npm run dev -- --port 5173`
- Celery Worker: `celery -A sw_erp worker --loglevel=info --pool=solo`
- Celery Beat: `celery -A sw_erp beat --loglevel=info`
- Todo orquestado desde VS Code Tasks (ver `.vscode/tasks.json`).

### 5.4 Variables de entorno

- Backend: `.env` en `backend/` (cargado con `python-dotenv`).
- Frontend: variables `VITE_*` (cargadas por Vite).
- **Nunca** hardcodear secretos. Usar siempre `os.getenv()` en backend y `import.meta.env.VITE_*` en frontend.

---

## 6. Base de datos

### Configuración multi-database
- `default`: BD principal del ERP (SQLite en dev, PostgreSQL en producción).
- `db_comunas`: BD de comunas/regiones de Chile (siempre PostgreSQL).

### Migraciones
- Generar: `python manage.py makemigrations`
- Aplicar: `python manage.py migrate`
- **Nunca** modificar modelos sin generar y revisar migraciones.
- Scripts de limpieza: `eliminar_migraciones.ps1` / `.sh`.

---

## 7. Dominios de Negocio (Apps)

| App | Dominio | Estado |
|---|---|---|
| `core` | Modelos base, usuarios, personalización, emails, indicadores económicos | Activa |
| `cuentas` | Autenticación, User model, perfiles, grupos, invitaciones | Activa |
| `empresas` | Empresas, sucursales, relaciones empresa-cliente, clientes | Activa |
| `cotizaciones` | Cotizaciones, items cotización, seguimiento, envío, aprobación pública | Activa |
| `ordentrabajov2` | Órdenes de trabajo, soportes técnicos, servicios, gastos, cierres | Activa (v2) |
| `contratos` | Contratos empresa-cliente, servicios contratados, licencias | Activa |
| `bodegas` | Bodegas, stock, órdenes de compra, guías de salida, inventario | Activa |
| `items` | Catálogo de ítems, categorías, proveedores, fabricantes | Activa |
| `calendario` | Eventos de calendario | Activa |
| `recursos` | Equipos, software, recursos asignables | Activa |
| `vacaciones` | Gestión de vacaciones | Activa |
| `visitas` | Registro de visitas técnicas | Activa |
| `rendiciones` | Rendiciones de gastos | Activa |
| `retroalimentacion` | Encuestas y feedback (GenericFK polymorphic) | Activa |
| `ordentrabajo` | OT v1 — **DEPRECADA** (comentada en urls.py) | Deprecada |
| `bd_ciudades` | Regiones, provincias, comunas de Chile | Activa (read-only) |

---

## 8. Reglas de Calidad y Consistencia

### Backend
- Todo modelo hereda de `ModeloBase` o `ModeloBaseHistorico`.
- Todo ViewSet filtra por empresa del usuario autenticado.
- `on_delete`: `CASCADE` para ownership, `SET_NULL` para referencias opcionales, `PROTECT` para críticas.
- No usar signals para lógica de negocio.
- Wrappear `.delay()` de Celery con try/except.

### Frontend
- Solo functional components (arrow functions).
- Usar `useAppDispatch`/`useAppSelector` (nunca hooks planos de Redux).
- Path alias `@/` para imports absolutos.
- Lazy loading para todas las páginas.
- Interfaces con `I` prefix, types con `T` prefix.
- Nuevas features: preferir RTK Query sobre createAsyncThunk.

### General
- No introducir dependencias sin justificación.
- No hardcodear valores sensibles.
- Documentación exclusivamente en `dev/docs/` (ver reglas en `AGENTS.md`).
- Respetar la localización Chile: timezone `America/Santiago`, locale `es-ES`, monedas CLP/UF/USD.

---

## 9. Deuda Técnica Conocida (No Ampliar)

Estos puntos existen en el código y NO deben replicarse en código nuevo:

1. **Modelos sin `ModeloBase`**: `Fabricante`, `ImagenItem`, algunos modelos legacy heredan de `models.Model`. Código nuevo DEBE usar `ModeloBase`.
2. **Estados inconsistentes**: Apps antiguas usan numéricos (`'1'`, `'2'`); apps nuevas usan slugs (`'pendiente'`). Código nuevo DEBE usar slugs.
3. **Wildcard imports**: `from .models import *` es convención actual pero no ideal. Aceptado por consistencia.
4. **Thunks legacy**: Coexisten con RTK Query. NO migrar thunks existentes salvo refactor explícito.
5. **`error: any`** en catches de thunks. Código nuevo debe tipar errores.
6. **Archivos gigantes**: Algunos slices/APIs superan 1000 líneas. Código nuevo debe mantener archivos < 500 líneas.
7. **`TESTING = True`** en settings.py controla la BD. No es un flag de test real.

---

*Última actualización: 2025-02-26*
*Referencia: AGENTS.md (reglas de comportamiento de agentes)*
