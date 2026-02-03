# Arquitectura - Monorepo ERP

Documento técnico completo de la arquitectura del sistema ERP multi-empresa para servicios de TI.

---

## 1. Visión General

ERP diseñado para empresas prestadoras de servicios de TI con múltiples sucursales. Gestiona:
- Órdenes de trabajo (soporte técnico, servicios generales)
- Cotizaciones y presupuestos
- Inventario, compras y guías de movimiento
- Contratos con clientes y licencias
- Rendiciones de gastos
- Equipos y recursos
- Visitas de soporte
- Vacaciones y calendario empresarial

**Principio arquitectónico:** Multi-tenancy por empresa (aislamiento de datos obligatorio).

---

## 2. Stack Tecnológico

### Backend
| Componente | Tecnología | Versión |
|------------|-----------|---------|
| **Framework** | Django | 5.1.x |
| **API** | Django REST Framework | 3.15.x |
| **Auth** | Djoser + SimpleJWT | 5h acceso / 10h refresh |
| **Task Queue** | Celery + Redis | 5.2.x + Redis |
| **WebSocket** | Django Channels + Daphne | 4.x + 5.x |
| **DB** | SQLite (dev) / PostgreSQL (prod) | - |
| **Historiales** | django-simple-history | 3.x |

### Frontend
| Componente | Tecnología | Versión |
|------------|-----------|---------|
| **Framework** | React | 18.x |
| **Lenguaje** | TypeScript | 5.x |
| **Build** | Vite | 5.x |
| **Estado** | Redux Toolkit | 1.9.x |
| **API** | RTK Query | Integrado en RTK |
| **Validación** | Formik + Yup | - |
| **HTTP** | Axios | 1.x |
| **Estilos** | TailwindCSS | 3.x |

---

## 3. Estructura del Repositorio

```
monorepo_erp/
├── .github/
│   ├── copilot-instructions.md       # Punto de entrada para agentes
│   └── instructions/                 # Guías técnicas
│       ├── architecture.md           # ESTE ARCHIVO
│       ├── backend-guide.md          # Convenciones backend (ViewSets, permisos)
│       ├── frontend-guide.md         # Convenciones frontend (componentes, Redux)
│       ├── typescript.instructions.md # Estándares TypeScript/React
│       ├── rtk-query-best-practices.md # RTK Query (estado asincrónico)
│       ├── security.md               # JWT, permisos, multi-tenancy
│       ├── testing.md                # Tests unitarios e integración
│       ├── deployment.md             # Build y despliegue Docker
│       └── glossary.md               # Glosario de términos
│
├── backend/
│   ├── core/                         # Modelos base, multi-tenancy, utilidades
│   │   ├── models.py                 # PersonalizacionUsuario, ModeloBaseHistorico
│   │   ├── email.py                  # Tareas de email
│   │   └── tasks.py                  # Tareas Celery
│   │
│   ├── cuentas/                      # Autenticación y usuarios
│   │   ├── models.py                 # Usuario (User)
│   │   └── views.py                  # UserViewSet, activate_account (AllowAny)
│   │
│   ├── empresas/                     # Estructura multi-empresa
│   │   ├── models.py                 # Empresa, SucursalEmpresa, UsuarioEmpresa
│   │   └── views.py                  # EmpresaViewSet, UsuarioEmpresaViewSet
│   │
│   ├── items/                        # Catálogo de productos
│   │   ├── models.py                 # Categoria, Fabricante, Item, ItemEmpresa
│   │   └── views.py                  # CategoriaViewSet, ItemEmpresaViewset
│   │
│   ├── bodegas/                      # Inventario, compras, movimientos
│   │   ├── models.py                 # Bodega, StockItemEnBodega, OrdenCompra, GuiaSalida
│   │   ├── views.py                  # BodegaViewSet, OrdenCompraViewSet (IsAuthenticated)
│   │   ├── movimientos.py            # Funciones: registrar_entrada, registrar_salida
│   │   └── signals.py                # Auto-actualización de stock
│   │
│   ├── cotizaciones/                 # Presupuestos
│   │   ├── models.py                 # Cotizacion, ItemCotizacion, SolicitanteCotizacion
│   │   └── views.py                  # CotizacionViewSet
│   │
│   ├── ordentrabajov2/               # ⚠️ VERSIÓN ACTIVA - Órdenes de trabajo
│   │   ├── models.py                 # OrdenDeTrabajo, SoporteTecnico, ServicioEnOT
│   │   ├── views.py                  # OrdenDeTrabajoViewSet (IsAuthenticated)
│   │   └── estados_modelo.py         # Estados: pendiente, en_proceso, completada, cerrada, facturada
│   │
│   ├── ordentrabajo/                 # ❌ VERSIÓN ANTIGUA (DESACTIVADA)
│   │
│   ├── rendiciones/                  # Rendición de gastos
│   │   ├── models.py                 # Rendicion, ItemRendicion
│   │   └── views.py                  # RendicionViewSet
│   │
│   ├── contratos/                    # Contratos y licencias
│   │   ├── models.py                 # ContratoEmpresaCliente, Licencia, Servicio
│   │   ├── views.py                  # ContratoEmpresaClienteViewSet, LicenciaViewSet
│   │   └── funciones.py              # Generación de PDF de contratos
│   │
│   ├── visitas/                      # Visitas de soporte técnico
│   │   ├── models.py                 # VisitaSoporte, AsistenciaUsuario
│   │   └── views.py                  # VisitaSoporteViewSet (filtra por empresa)
│   │
│   ├── recursos/                     # Equipos y recursos
│   │   ├── models.py                 # Equipo, UsuarioEquipo, Software
│   │   ├── views.py                  # EquipoViewSet, SoftwareDeEmpresaViewSet
│   │   └── signals.py                # Sincronización de equipos
│   │
│   ├── calendario/                   # Calendario de días festivos
│   │   ├── models.py                 # DiasCalendario
│   │   └── views.py                  # DiasCalendarioViewSet
│   │
│   ├── vacaciones/                   # Gestión de vacaciones
│   │   ├── models.py                 # SolicitudVacaciones
│   │   └── views.py                  # SolicitudVacacionesViewSet
│   │
│   ├── retroalimentacion/            # Feedback público (sin autenticación)
│   │   ├── models.py                 # Retroalimentacion, RetroalimentacionAplicada
│   │   └── views.py                  # RetroalimentacionPorTokenView (AllowAny)
│   │
│   ├── sw_erp/                       # Configuración Django
│   │   ├── settings.py               # Incluye: REST_FRAMEWORK, DATABASES, CELERY
│   │   ├── urls.py                   # Rutas principales
│   │   └── celery.py                 # Config Celery + Redis
│   │
│   └── manage.py
│
├── frontend/
│   ├── src/
│   │   ├── pages/                    # Vistas por módulo
│   │   │   ├── cuentas/              # Login, registro
│   │   │   ├── empresas/             # Gestión empresas
│   │   │   ├── ordenes/              # Órdenes de trabajo
│   │   │   ├── cotizaciones/         # Cotizaciones
│   │   │   ├── bodegas/              # Inventario
│   │   │   └── ...
│   │   │
│   │   ├── components/               # Componentes UI reutilizables
│   │   │   ├── forms/                # FormularioOT, FormularioCotizacion, etc.
│   │   │   ├── tables/               # TablaOrdenes, TablaBodegas, etc.
│   │   │   └── ...
│   │   │
│   │   ├── store/
│   │   │   ├── slices/               # Redux por dominio
│   │   │   │   ├── ordenesTrabajo.ts # Estado de órdenes
│   │   │   │   ├── cotizaciones.ts   # Estado de cotizaciones
│   │   │   │   ├── bodegas.ts        # Estado de inventario
│   │   │   │   ├── empresas.ts       # Estado de empresa actual
│   │   │   │   └── auth.ts           # Estado de autenticación
│   │   │   └── index.ts              # Store configuration
│   │   │
│   │   ├── services/                 # Peticiones HTTP
│   │   │   ├── BaseService.ts        # Clase base con Axios + interceptores
│   │   │   ├── RtkQueryService.ts    # Endpoints RTK Query centralizados
│   │   │   └── ...
│   │   │
│   │   ├── interface/                # Tipos TypeScript
│   │   │   ├── index.ts              # Tipos de API
│   │   │   └── ...
│   │   │
│   │   ├── hooks/                    # Custom hooks
│   │   │   ├── useAuth.ts            # Autenticación
│   │   │   └── useEmpresa.ts         # Empresa actual
│   │   │
│   │   └── App.tsx
│   │
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.cjs
│   ├── package.json
│   └── nginx.conf                    # Configuración para producción
│
├── dev/
│   ├── docs/                         # Documentación viva del sistema
│   │   ├── analisis.md               # Análisis técnicos puntuales
│   │   ├── changelog.md              # Cambios de estado y releases
│   │   ├── flujos_operativos.md      # Flujos de negocio
│   │   ├── planificacion.md          # Planificación de features
│   │   ├── sistemas.md               # Documentación de sistemas integrados
│   │   └── notas.md                  # Notas generales
│   │
│   └── scripts/
│       └── setup/                    # Scripts de configuración inicial
│           ├── setup_superuser.py
│           ├── seed_base.py
│           └── reset_db.py
│
├── postman/                          # Colecciones Postman
│   ├── ordentrabajov2.postman_collection.json
│   └── OT-Cierre.postman_collection.json
│
└── README.md
```

---

## 4. Modelos Base

### 4.1 PersonalizacionUsuario (Multi-tenancy)

**Ubicación:** `backend/core/models.py`

```python
class PersonalizacionUsuario(models.Model):
    usuario = ForeignKey(User)                       # Usuario relacionado
    sucursal_principal = ForeignKey(SucursalEmpresa) # Sucursal del usuario
    # La empresa se obtiene vía: sucursal_principal.empresa
```

**Patrón obligatorio en ViewSets:**
```python
def get_queryset(self):
    user = self.request.user
    personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
    if personalizacion and personalizacion.sucursal_principal:
        return QuerySet.filter(empresa=personalizacion.sucursal_principal.empresa)
    return QuerySet.none()
```

**Riesgo crítico:** Si no se implementa este filtro, datos de diferentes empresas se mezclan.

### 4.2 ModeloBaseHistorico

**Ubicación:** `backend/core/models.py`

Clase abstracta que proporciona campos de auditoría:
- `created_at`: Timestamp de creación
- `updated_at`: Timestamp de última actualización
- `created_by`: Usuario que creó el registro
- `updated_by`: Usuario que actualizó

**Uso:** Hereda en modelos que necesitan auditoría.

### 4.3 Estados en Modelos

**OrdenDeTrabajo (ordentrabajov2):**
- `pendiente` → `en_proceso` → `completada` → `cerrada` → `facturada`

**Guía de Salida (bodegas):**
- `pendiente` → `confirmada` → `entregada` → `recibida`

---

## 5. Autenticación y Autorización

### 5.1 JWT (SimpleJWT + Djoser)

**Duración:**
- Access token: 5 horas
- Refresh token: 10 horas

**Endpoints:**
- `POST /api/auth/login` → `{ access, refresh }`
- `POST /api/auth/refresh` → `{ access }`
- `POST /api/auth/logout` → Invalida token en blacklist

**Configuración:** `backend/sw_erp/settings.py`

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(hours=10),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
```

### 5.2 Permisos en ViewSets

**⚠️ CRÍTICO:** `DEFAULT_PERMISSION_CLASSES = [AllowAny]` en settings.

**Cada ViewSet DEBE definir explícitamente:**

```python
from rest_framework.permissions import IsAuthenticated

class MiViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]  # ← OBLIGATORIO
    # ...
```

**Permisos disponibles:**
- `AllowAny`: Sin restricción (endpoints públicos: login, feedback, etc.)
- `IsAuthenticated`: Solo usuarios autenticados
- `IsAdminUser`: Solo staff/admin
- `IsAuthenticatedOrReadOnly`: Lectura pública, escritura autenticada

---

## 6. API REST - Estructura de Rutas

### Patrón de URLs

```
/api/
├── auth/
│   ├── login/
│   ├── refresh/
│   └── logout/
│
├── users/                            # UserViewSet
│   ├── GET    /api/users/             # Listar usuarios
│   ├── POST   /api/users/             # Crear usuario
│   └── PATCH  /api/users/{id}/        # Actualizar usuario
│
├── empresas/                         # EmpresaViewSet
│   ├── GET    /api/empresas/
│   └── nested:
│       └── /api/empresas/{empresa_pk}/sucursales/  # SucursalEmpresaViewSet
│
├── ordenes/                          # OrdenDeTrabajoViewSet
│   ├── GET    /api/ordenes/
│   ├── POST   /api/ordenes/
│   ├── PATCH  /api/ordenes/{id}/
│   └── nested:
│       └── /api/ordenes/{orden_pk}/servicios/  # ServicioEnOTViewSet
│
├── cotizaciones/                     # CotizacionViewSet
│   ├── GET    /api/cotizaciones/
│   └── public:
│       └── /api/public/cotizacion/{token}/  # Vista pública sin autenticación
│
├── bodegas/                          # BodegaViewSet
│   ├── GET    /api/bodegas/
│   └── nested:
│       └── /api/bodegas/{bodega_pk}/stock/  # StockItemEnBodegaViewSet
│
└── ...
```

### Ejemplo: Endpoint Anidado

**Modelo:**
```python
class Bodega(Model):
    nombre = CharField()
    empresa = ForeignKey(Empresa)

class StockItemEnBodega(Model):
    bodega = ForeignKey(Bodega)
    item = ForeignKey(Item)
    cantidad = IntegerField()
```

**URL:**
```python
# En router.register()
router.register(r'bodegas', BodegaViewSet)
router.register(r'bodega-stock', StockItemEnBodegaViewSet, basename='stock')
```

**Endpoint:**
```
GET /api/bodegas/                      # Todas las bodegas
GET /api/bodegas/1/                    # Bodega específica
GET /api/bodega-stock/?bodega_id=1     # Stock de bodega específica
```

---

## 7. Patrones de Implementación

### 7.1 QuerySet Filtering (Multi-tenancy)

**CORRECTO:**
```python
class MiViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if personalizacion and personalizacion.sucursal_principal:
            return MiModelo.objects.filter(
                empresa=personalizacion.sucursal_principal.empresa
            )
        return MiModelo.objects.none()  # Crítico: none() previene fuga de datos
```

**INCORRECTO (RIESGO CRÍTICO):**
```python
class MiViewSet(viewsets.ModelViewSet):
    queryset = MiModelo.objects.all()  # ← Expone datos de TODAS las empresas
```

### 7.2 Movimientos de Bodegas

**Ubicación:** `backend/bodegas/movimientos.py`

Proporciona funciones transaccionales para actualizar stock:
- `registrar_entrada(bodega, item, cantidad)`: Suma cantidad
- `registrar_salida(bodega, item, cantidad)`: Resta cantidad
- Validación automática de stock suficiente

**Uso:**
```python
from bodegas.movimientos import registrar_salida

registrar_salida(
    bodega=mi_bodega,
    item=mi_item,
    cantidad=5,
    motivo="Venta"
)
```

**⚠️ CRÍTICO:** `cantidad` es siempre DELTA (cambio), NO saldo absoluto.

### 7.3 Tareas Asincrónicas (Celery)

**Ubicación:** `backend/core/tasks.py`

```python
from celery import shared_task

@shared_task
def send_email_task(destinatarios, asunto, cuerpo):
    # Envía email sin bloquear la request HTTP
    pass
```

**Uso en ViewSet:**
```python
from core.tasks import send_email_task

def perform_create(self, serializer):
    instance = serializer.save()
    send_email_task.delay(
        destinatarios=[...],
        asunto="Nueva orden de trabajo",
        cuerpo="..."
    )
```

---

## 8. Frontend - Flujo de Datos

### 8.1 Redux + RTK Query

**Slice (Redux):** `frontend/src/store/slices/ordenesTrabajo.ts`

```typescript
import { createSlice } from '@reduxjs/toolkit';

const ordenesTrabajo = createSlice({
    name: 'ordenesTrabajo',
    initialState: {
        lista: [],
        filtro: {},
    },
    reducers: {
        setFiltro: (state, action) => {
            state.filtro = action.payload;
        },
    },
});

export default ordenesTrabajo.reducer;
```

**RTK Query (HTTP):** `frontend/src/services/RtkQueryService.ts`

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const rtkApi = createApi({
    reducerPath: 'rtkApi',
    baseQuery: fetchBaseQuery({
        baseUrl: 'http://localhost:8000/api',
        prepareHeaders: (headers, { getState }) => {
            const token = getState().auth.access;
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return headers;
        },
    }),
    endpoints: (builder) => ({
        getOrdenes: builder.query({
            query: () => '/ordenes/',
            invalidatesTags: ['Ordenes'],  // Invalidar cache cuando se modifique
        }),
        createOrden: builder.mutation({
            query: (data) => ({
                url: '/ordenes/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Ordenes'],  // Refetch automático
        }),
    }),
});

export const { useGetOrdenesQuery, useCreateOrdenMutation } = rtkApi;
```

### 8.2 BaseService (Legacy)

**Ubicación:** `frontend/src/services/BaseService.ts`

Clase base para peticiones HTTP con Axios. **NOTA:** RTK Query es preferido en código nuevo.

```typescript
export class BaseService {
    protected client: AxiosInstance;

    constructor(baseURL: string) {
        this.client = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Interceptor para agregar token
        this.client.interceptors.request.use((config) => {
            const token = localStorage.getItem('access');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });
    }

    async get<T>(url: string, params?: object): Promise<T> {
        return this.client.get(url, { params }).then(r => r.data);
    }
}
```

### 8.3 Componentes

**Patrón:**
```typescript
// frontend/src/pages/ordenes/ListadoOrdenes.tsx
import { useGetOrdenesQuery } from '@/services/RtkQueryService';

export const ListadoOrdenes = () => {
    const { data: ordenes, isLoading } = useGetOrdenesQuery();

    if (isLoading) return <Spinner />;
    return (
        <div>
            {ordenes?.map(orden => (
                <div key={orden.id}>{orden.numero}</div>
            ))}
        </div>
    );
};
```

---

## 9. Flujos Operativos Principales

### 9.1 Creación de Orden de Trabajo

1. Usuario crea orden (POST `/api/ordenes/`) → `OrdenDeTrabajoViewSet.create()`
2. Estado inicial: `pendiente`
3. Si incluye `SoporteTecnico`, se vinculan servicios
4. Se pueden adjuntar guías (desde `bodegas.GuiaSalida`)
5. Workflow: pendiente → en_proceso → completada → cerrada → facturada

### 9.2 Cotización Pública

1. Cliente accede a `/api/public/cotizacion/{token}/` (sin autenticación)
2. Ve presupuesto con moneda (USD/CLP/UF)
3. Puede descargar PDF
4. ViewSet: `CotizacionViewSet` con action public

### 9.3 Movimiento de Inventario

1. Usuario solicita salida desde bodega
2. ViewSet `GuiaSalidaViewSet.create()` → registra salida
3. Internamente: `bodegas.movimientos.registrar_salida()`
4. Stock actualizado automáticamente via signal
5. Estados: pendiente → confirmada → entregada → recibida

---

## 10. Convenciones Obligatorias

### 10.1 Nombres de Modelos

- Singular en inglés si es término técnico: `Equipo`, `Software`
- PascalCase: `OrdenDeTrabajo`, `GuiaSalida`

### 10.2 ViewSets

- **Nombre:** `{Modelo}ViewSet` (e.g., `OrdenDeTrabajoViewSet`)
- **Atributos obligatorios:**
  - `queryset`: QuerySet inicial (se sobrescribe en `get_queryset()`)
  - `serializer_class`: Serializador principal
  - `permission_classes`: ⚠️ EXPLÍCITO, nunca omitir
  - `filterset_class`: Si tiene filtros complejos

### 10.3 Serializadores

- **Nombre:** `{Modelo}Serializer` (e.g., `OrdenDeTrabajoSerializer`)
- **Campos anidados:** Usar `SerializerMethodField` o nested serializers

---

## 11. Debugging y Monitoreo

### 11.1 Logs

**Django:** `python manage.py runserver --verbosity=3`

**Celery:** `celery -A sw_erp worker --loglevel=info`

### 11.2 Herramientas

- **API:** Postman (colecciones en `postman/`)
- **Frontend:** Redux DevTools + React DevTools
- **DB:** Django Admin (`/admin/`) o `dbshell`

---

## 12. Riesgos Conocidos

### 🔴 CRÍTICO

1. **Multi-tenancy:** Sin filtro por empresa = fuga de datos
2. **Permisos:** `DEFAULT_PERMISSION_CLASSES = [AllowAny]` sin override explícito = acceso público no intencional

### 🟡 ALTO

3. **Stock:** `cantidad` es delta, no saldo absoluto (evita bugs)
4. **JWT:** Token expira en 5h, refresh en 10h (validar en cliente)

### 🟢 MEDIO

5. Celery timeout configurado (validar en producción)
6. CORS debe ser restrictivo en producción

---

Última actualización: 2025-02-12
Responsable: Equipo técnico
