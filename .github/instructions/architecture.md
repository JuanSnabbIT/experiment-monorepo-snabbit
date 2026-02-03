````markdown
# Architecture - Monorepo ERP (Documento Exhaustivo)

Documento de referencia completo para agentes de IA. Contiene toda la información necesaria para entender la arquitectura, modelos, endpoints y flujos del sistema.

---

## 1. Estructura del Monorepo

```
monorepo_erp/
├── .github/
│   ├── copilot-instructions.md       # Punto de entrada para agentes
│   └── instructions/                 # Guías específicas por área
├── .vscode/
│   └── tasks.json                    # Tasks de desarrollo
├── backend/                          # Django + DRF + Celery + Channels
│   ├── sw_erp/                       # Proyecto Django principal
│   ├── core/                         # Modelos base, utilidades transversales
│   ├── cuentas/                      # Autenticación y usuarios
│   ├── empresas/                     # Empresas, sucursales, usuarios empresa
│   ├── items/                        # Catálogo de productos
│   ├── bodegas/                      # Inventario, compras, guías de salida
│   ├── cotizaciones/                 # Cotizaciones y presupuestos
│   ├── ordentrabajov2/               # Órdenes de trabajo (versión activa)
│   ├── rendiciones/                  # Rendición de gastos
│   ├── contratos/                    # Contratos empresa-cliente
│   ├── visitas/                      # Visitas de soporte
│   ├── recursos/                     # Equipos y software
│   ├── calendario/                   # Días calendario y feriados
│   ├── vacaciones/                   # Solicitudes de vacaciones
│   ├── bd_ciudades/                  # Regiones/provincias/comunas Chile
│   ├── ordentrabajo/                 # V1 DESACTIVADA - No usar
│   ├── retroalimentacion/            # DESACTIVADA temporalmente
│   ├── activos/                      # Gestión de activos (básico)
│   ├── manage.py
│   ├── req.txt                       # Dependencias Python
│   ├── Dockerfile / Dockerfile.optimized
│   └── db.sqlite3                    # BD desarrollo
├── frontend/                         # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/                    # Vistas por módulo
│   │   ├── components/               # Componentes reutilizables
│   │   ├── store/                    # Redux Toolkit + RTK Query
│   │   ├── services/                 # ApiService, BaseService
│   │   ├── interface/                # Tipos TypeScript
│   │   ├── hooks/                    # Custom hooks
│   │   ├── routes/                   # Definición de rutas
│   │   ├── utils/                    # Utilidades
│   │   └── config/                   # Configuración (pages.config.ts)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.cjs
│   └── Dockerfile / Dockerfile.optimized
├── dev/
│   ├── docs/                         # Documentación viva del proyecto
│   └── scripts/                      # Scripts de setup y utilidades
├── postman/                          # Colecciones Postman
├── build-and-push-backend.ps1
├── build-and-push-frontend.ps1
├── AGENTS.md                         # Reglas para agentes IA
└── README.md
```

---

## 2. Stack Tecnológico Completo

### Backend (Django 5.1.x)
| Componente | Librería | Uso |
|------------|----------|-----|
| Framework | Django 5.1.x | Framework principal |
| API REST | Django REST Framework | Serializers, ViewSets, routers |
| Auth | Djoser + SimpleJWT | Login, registro, JWT tokens |
| Async Tasks | Celery + Redis | Tareas de segundo plano |
| Realtime | Channels + Daphne | WebSockets (futuro) |
| Historial | django-simple-history | Auditoría de cambios |
| Filtros | django-filter | Filtrado en APIs |
| Nested Routes | drf-nested-routers | Endpoints anidados |
| Métricas | django-prometheus | Monitoreo |
| BD dev | SQLite | Desarrollo local |
| BD prod | PostgreSQL | Producción |

### Frontend (React 18 + TypeScript 5.x)
| Componente | Librería | Uso |
|------------|----------|-----|
| Framework | React 18 | UI Library |
| Build | Vite 5 | Bundler rápido |
| Estado | Redux Toolkit + RTK Query | Estado global y cache API |
| HTTP | Axios (via BaseService) | Peticiones HTTP |
| Estilos | TailwindCSS 3.4 | Utility-first CSS |
| Forms | Formik + Yup | Formularios y validación |
| Tablas | TanStack Table | Tablas avanzadas |
| Calendario | FullCalendar | Calendarios |
| PDF | @react-pdf/renderer | Generación PDF cliente |
| Alertas | SweetAlert2 | Confirmaciones |
| Toast | react-toastify | Notificaciones |
| Iconos | react-icons + HeroIcons | Iconografía |

---

## 3. Apps del Backend - Detalle Completo

### 3.1 core (Modelos Base y Transversales)
**Ubicación:** `backend/core/`

**Modelos:**
- `ModeloBase`: Clase abstracta con `fecha_creacion`, `fecha_modificacion`
- `ModeloBaseHistorico`: Extiende ModeloBase + `simple_history` para auditoría
- `PersonalizacionUsuario`: Tema, font_size, sucursal_principal, dashboard_preferences
- `Software`: Catálogo de software
- `AcuerdoConfidencialidadBase`: Plantillas de acuerdos
- `DescripcionGrupo`: Descripción de grupos de Django
- `PreguntaEnRetroalimentacion`: Preguntas para retroalimentación (polimórfico)

**Patrón Multi-tenancy:**
```python
# En cada ViewSet, filtrar por empresa del usuario:
def get_queryset(self):
    personalizacion = PersonalizacionUsuario.objects.filter(usuario=self.request.user).first()
    if not personalizacion or not personalizacion.sucursal_principal:
        return self.queryset.model.objects.none()
    return self.queryset.model.objects.filter(
        empresa=personalizacion.sucursal_principal.empresa
    )
```

---

### 3.2 cuentas (Autenticación)
**Ubicación:** `backend/cuentas/`

**Modelos:**
- `User`: Usuario custom (AbstractBaseUser)
  - `email` (USERNAME_FIELD)
  - `first_name`, `second_name`, `last_name`, `second_last_name`
  - `rut`, `celular`, `genero`, `fecha_nacimiento`
  - `direccion`, `region`, `provincia`, `comuna`
  - `is_active`, `is_staff`, `is_superuser`
- `InvitacionEmpresa`: Invitaciones para unirse a empresas
  - `token`, `activation_token`, `sucursal`
  - `expiration_date` (7 días por defecto)

**Endpoints Auth (bajo `/auth/`):**
- `POST /auth/jwt/create/` → Login (retorna access + refresh)
- `POST /auth/jwt/refresh/` → Refresh token
- `POST /auth/users/` → Registro
- `POST /auth/users/activation/` → Activación
- `POST /auth/users/reset_password/` → Reset password

---

### 3.3 empresas (Multi-empresa)
**Ubicación:** `backend/empresas/`

**Modelos:**
- `Empresa`: Empresa/cliente
  - `nombre`, `rut_empresa`, `direccion_principal`
  - `logo`, `firma_empresa`, `recargo`, `ppm`
  - `uuid` (único para enlaces públicos)
- `RelacionEmpresa`: Relación prestador-cliente entre empresas
- `SucursalEmpresa`: Sucursales de cada empresa
  - `nombre`, `direccion`, `telefono`, `email`
  - `region`, `provincia`, `comuna` (IDs de bd_ciudades)
- `UsuarioEmpresa`: Vincula User con Sucursal
  - `usuario` → `cuentas.User`
  - `sucursal` → `SucursalEmpresa`
  - `fecha_ingreso`, `fecha_contrato`, `cargo`, `estado`
  - `grupos` (ManyToMany con Django Groups)
  - Métodos: `tiene_derecho_a_vacaciones()`, `calcular_dias_vacaciones_acumulados()`

**Endpoints:**
- `GET/POST /api/empresas/`
- `GET/POST /api/empresas/{id}/sucursales-empresa/`
- `GET/POST /api/usuarios-empresa/`
- `GET/POST /api/relaciones-empresa/`

---

### 3.4 items (Catálogo de Productos)
**Ubicación:** `backend/items/`

**Modelos:**
- `Categoria`: Categorías de productos
- `Fabricante`: Fabricantes
- `ProveedorEmpresa`: Proveedores por empresa
  - `tipo_moneda`: "1"=USD, "2"=CLP, "3"=UF
  - `recargo_dolar`: Recargo sobre dólar observado
- `ItemEmpresa`: Productos del catálogo
  - `nombre`, `descripcion_corta`, `codigo_barras`
  - `fabricante`, `categoria`, `empresa`
  - `proveedores_empresa` (ManyToMany)
- `CampoAdicionalProveedor` / `CampoAdicionalItem`: Campos dinámicos
- `ImagenItem`: Imágenes del producto

**Endpoints:**
- `GET/POST /api/empresas/{id}/items-empresa/`
- `GET/POST /api/empresas/{id}/proveedores-empresa/`
- `GET/POST /api/empresas/{id}/proveedores-empresa/{id}/items/`

---

### 3.5 bodegas (Inventario y Logística)
**Ubicación:** `backend/bodegas/`

**Modelos principales:**
- `Bodega`: Almacenes por sucursal
- `StockItemEnBodega`: Stock de items (cantidad, cantidad_no_disponible, pmp)
- `OrdenCompra`: Órdenes de compra a proveedores
  - Estados: pendiente(-), enviada(E), recibida_parcial(RP), recibida(R), cancelada(C)
- `ItemEnOrdenCompra`: Items de la OC
- `ItemOrdenCompraEnStock`: Recepción de items con números de serie
- `Compra`: Compras rápidas (sin OC formal)
- `ItemEnCompra`: Items de compra rápida
- `GuiaSalida`: Salida de inventario
  - Estados: P(Pendiente), FR(Firmada), ET(En tránsito), A(Aprobada), D(Devuelta parcial)
  - `orden_trabajo` → vincula con OT
- `ItemsGuiaSalida`: Items de la guía (cantidad_rebajada, cantidad_devuelta, numero_serie)
- `MovimientoStock`: Registro de movimientos (INGRESO, REBAJE, DEVOLUCION, AJUSTE)
- `VoucherDevolucion`: Comprobante de devoluciones al completar OT
- `TomaInventario`, `ItemEnTomaInventario`, `EstadoTomaInventario`: Inventarios físicos

**Endpoints:**
- `GET/POST /api/bodegas/`
- `GET/POST /api/bodegas/{id}/stock-items-en-bodega/`
- `GET/POST /api/ordenes-compra/`
- `GET/POST /api/ordenes-compra/{id}/items-en-orden-compra/`
- `GET/POST /api/guia-salida/`
- `GET/POST /api/guia-salida/{id}/items-guia/`
- `GET/POST /api/compras/`
- `GET/POST /api/movimientos-stock/`
- `GET/POST /api/tomas-inventario/`
- `GET/POST /api/vouchers-devolucion/`

---

### 3.6 cotizaciones (Presupuestos)
**Ubicación:** `backend/cotizaciones/`

**Modelos:**
- `Cotizacion`: Presupuesto/cotización
  - `numero_cotizacion` (auto-incremental desde 800)
  - `empresa` (prestador), `cliente`
  - `estado`: pendiente, enviada, aprobada, rechazada, vencida, facturada
  - `tipo_moneda`: "1"=USD, "2"=CLP, "3"=UF
  - `dolar_observado`, `valor_uf`, `ppm`, `porcentaje_recargo`
  - `fecha_vencimiento` (2 semanas por defecto)
- `ItemCotizacion`: Líneas de la cotización
  - Propiedades calculadas: `precio_total_backend`, `recargo_iva_venta`, `ganancia`
- `SeguimientoCotizacion`: Historial de cambios
- `SolicitanteCotizacion`: Usuarios que deben aprobar (polimórfico: UsuarioEmpresa o SolicitanteExterno)
  - `token` para aprobación pública vía email
- `SolicitanteExterno`: Solicitantes sin cuenta
- `EnvioCorreoCotizacion`: Registro de envíos

**Endpoints:**
- `GET/POST /api/cotizaciones/`
- `GET/POST /api/cotizaciones/{id}/items/`
- `GET/POST /api/cotizaciones/{id}/seguimientos/`
- `GET/POST /api/cotizaciones/{id}/solicitantes-cotizacion/`
- **Públicos (sin auth):**
  - `GET /api/public/cotizacion/{token}/`
  - `POST /api/public/cotizacion/{token}/aprobar/`
  - `POST /api/public/cotizacion/{token}/rechazar/`

---

### 3.7 ordentrabajov2 (Órdenes de Trabajo - VERSIÓN ACTIVA)
**Ubicación:** `backend/ordentrabajov2/`

**⚠️ IMPORTANTE:** `ordentrabajo` (V1) está DESACTIVADA. Usar siempre `ordentrabajov2`.

**Modelos:**
- `OrdenDeTrabajo`: Orden de trabajo principal
  - `empresa` (prestador), `cliente`
  - `tipo_servicio`: general, soporte_r (reactivo), soporte_p (programado)
  - `estado`: pendiente, en_proceso, medianamente_completado, completado, no_realizado
  - `prioridad`: 1(Alta), 2(Media), 3(Baja)
  - `tecnico_responsable_ot`, `cliente_solicitante`
  - `firmas_ot` (JSON con firmas)
  - `cotizaciones` (ManyToMany)
- `SoporteTecnico`: Detalle de soporte técnico en OT
  - ⚠️ `guia_salida` DEPRECATED - las guías se vinculan a la OT directamente
- `ServicioEnOT`: Servicios generales en OT
- `UsuarioAsignadoSoporte`: Técnicos asignados a un soporte
- `HistorialCambiosOrden`: Auditoría manual de cambios
- `AdjuntoDeOrden`: Archivos adjuntos (informes, fotos, etc.)
- `GastoOperativoEnOt`: Gastos operativos durante la OT
- `CierreAdministrativoOT`: Prefactura para facturación
  - Estados: borrador, en_revision, aprobado, facturado, pagado
- `SeguimientoItemOT`: Seguimientos por servicio/soporte/orden

**Endpoints:**
- `GET/POST /api/ordenes-de-trabajo/`
- `GET /api/ordenes-de-trabajo/{id}/`
- `GET /api/ordenes-de-trabajo/{id}/pdf/`
- `GET/POST /api/ordenes-de-trabajo/{id}/soportes-tecnicos/`
- `GET/POST /api/ordenes-de-trabajo/{id}/servicios-generales/`
- `GET/POST /api/ordenes-de-trabajo/{id}/historial-cambios/`
- `GET/POST /api/ordenes-de-trabajo/{id}/archivos-adjuntos/`
- `GET/POST /api/ordenes-de-trabajo/{id}/gastos-operativos/`
- `GET/POST /api/ordenes-de-trabajo/{id}/cierre-administrativo/`
- `GET /api/ordenes-de-trabajo/{id}/insumos/`
- `GET /api/ordenes-de-trabajo/{id}/guias-disponibles/`
- `POST /api/ordenes-de-trabajo/{id}/vincular-guias/`
- `GET/POST /api/cierres-facturacion/` (top-level)

---

### 3.8 rendiciones (Gastos)
**Ubicación:** `backend/rendiciones/`

**Modelos:**
- `CategoriaGastoRendicion`: Categorías (viáticos, transporte, etc.)
- `Rendicion`: Rendición de gastos
  - `usuario` (quien rinde)
  - `cliente` (a quién se cobra)
  - `orden_trabajo` (OT asociada, si aplica)
  - `estado`: 0=Borrador, 1=Enviada, 2=Aprobada, 3=Rechazada
  - Props: `total_reembolso_tecnico`, `total_facturable_cliente`
- `DetalleGastoRendicion`: Detalle de gasto
- `ItemRendicion`: Vincula rendición con gastos (polimórfico: GastoOperativoEnOt, DetalleGastoRendicion, Compra)

**Endpoints:**
- `GET/POST /api/rendiciones/`
- `GET /api/rendiciones/{id}/`

---

### 3.9 contratos (Contratos Empresa-Cliente)
**Ubicación:** `backend/contratos/`

**Modelos:**
- `ContratoEmpresaCliente`: Contrato principal
  - `empresa_prestadora`, `empresa_cliente`
  - `tipo`: servicios, licencia, mixto
  - `estado`: borrador, vigente, renovacion, finalizado, cancelado
  - `fecha_inicio`, `fecha_fin`
- `Servicio`, `PlanServicio`: Servicios contratados
- `ContratoServicio`: Relación contrato-servicio (polimórfico)
- `Visita`, `ContratoVisita`: Visitas programadas
- `Licencia`, `ContratoLicencia`: Licencias de software
  - `tipo_modalidad`: p1y-a (anual anticipado), p1y-m (anual mensual), p1m-m (mensual)
  - Lógica de ventana de reducción de licencias
- `CondicionEspecial`, `ContratoCondicionEspecial`: Condiciones especiales
- `UsuarioVinculadoContrato`: Usuarios vinculados al contrato
- `UsuarioVinculadoLicencia`: Usuarios con licencia asignada
- `EnvioContratoFirmaUsuario`: Firmas del contrato
- `AcuerdoConfidencialidadContrato`: Acuerdos de confidencialidad

**Endpoints:**
- `GET/POST /api/contratos/`
- Nested routers para servicios, licencias, visitas, condiciones

---

### 3.10 visitas (Visitas de Soporte)
**Ubicación:** `backend/visitas/`

**Modelos:**
- `VisitaSoporte`: Visita de soporte a cliente
  - `empresa`, `cliente`
  - `estado`: pendiente, en_proceso, completada, cancelada
  - `guia_salida` (opcional)
- `AsistenciaUsuario`: Revisión de equipos de usuarios
- `EntregaDeEquipo`: Entregas de equipo durante visita

**Endpoints:**
- `GET/POST /api/visitas/`

---

### 3.11 recursos (Equipos y Software)
**Ubicación:** `backend/recursos/`

**Modelos:**
- `Equipo`: Equipos de cómputo
  - Especificaciones: tipo_equipo, marca, modelo, numero_serie
  - Procesador: tipo_procesador, generacion_procesador, id_procesador
  - RAM, sistema_operativo, tarjeta_grafica
  - `cliente` (a quién pertenece), `empresa_propietaria`
- `AlmacenamientoEquipo`: Discos del equipo
- `MonitorEquipo`: Monitores asociados
- `UsuarioEquipo`: Asignación de equipos a usuarios
- `FotoEquipo`: Fotos del equipo
- `SoftwareDeEmpresa`: Software de la empresa
- `SoftwareInstalado`: Software en equipos (polimórfico)

**Endpoints:**
- `GET/POST /api/equipos/`
- `GET/POST /api/usuarios-equipos/`

---

### 3.12 calendario y vacaciones
**Ubicación:** `backend/calendario/` y `backend/vacaciones/`

**Modelos:**
- `DiaCalendario`: Días calendario (feriados, irrenunciables)
- `SolicitudVacaciones`: Solicitudes de vacaciones
  - Estados: 1=Pendiente, 2=Aprobada, 3=Rechazada
  - `es_extraordinaria`: vacaciones extraordinarias
  - Lógica de días hábiles (excluye fines de semana y feriados)

**Endpoints:**
- `GET/POST /api/dias-calendario/`
- `GET/POST /api/solicitudes-vacaciones/`

---

## 4. Frontend - Estructura Completa

### 4.1 Páginas por Módulo

```
frontend/src/pages/
├── Dashboard/                 # Home principal
├── Empresas/                  # Gestión de empresas y usuarios
├── Clientes/                  # Detalle de clientes
├── Items/                     # Catálogo (items, proveedores, categorías, fabricantes)
├── Bodegas/                   # Bodegas, stock, guías, OC, compras, inventario
│   ├── OrdenCompra/
│   ├── GuiaSalida/
│   ├── Compra/
│   ├── TomaInventario/
│   └── Devoluciones/
├── Cotizaciones/              # Cotizaciones
├── OrdenTrabajo/              # OT (detalle, lista, modales)
├── Rendiciones/               # Rendiciones de gastos
├── Contratos/                 # Contratos empresa-cliente
├── Visitas/                   # Visitas de soporte
├── Recursos/                  # Equipos y software
├── Calendario/                # Calendario, vacaciones
├── Facturacion/               # Facturación (cierres, facturas)
├── Core/                      # Administración (usuarios)
├── InvitacionEmpresa/         # Invitaciones
├── ResetPassword/             # Recuperación de contraseña
└── Login.page.tsx             # Login
```

### 4.2 Store (Redux Toolkit)

```
frontend/src/store/
├── index.ts                   # Exporta todo
├── storeSetup.ts              # Configuración del store
├── rootReducer.ts             # Combina reducers
├── hook.ts                    # useAppDispatch, useAppSelector
└── slices/
    ├── auth/                  # Autenticación
    ├── bodega/                # Bodegas y stock
    ├── calendario/            # Calendario
    ├── contratos/             # Contratos
    ├── core/                  # Core (temas, personalización)
    ├── cotizaciones/          # Cotizaciones
    ├── dashboard/             # Dashboard
    ├── empresa/               # Empresas
    ├── invitacion/            # Invitaciones
    ├── item/                  # Items
    ├── ordenTrabajo/          # OT (slice + API RTK Query)
    │   ├── ordenTrabajoSlice.ts
    │   ├── ordenTrabajoApi.ts  # RTK Query endpoints
    │   └── thunks.ts
    ├── recursos/              # Recursos
    ├── rendiciones/           # Rendiciones
    └── visita/                # Visitas
```

### 4.3 RTK Query - Patrón de Uso

**Archivo base:** `frontend/src/services/RtkQueryService.ts`

```typescript
// Definición de tags para invalidación automática
tagTypes: [
    'Cotizaciones', 'OrdenTrabajo', 'OrdenTrabajoList',
    'GuiaSalida', 'StockItems', 'Empresas', ...
]

// Inyección de endpoints en slices (ej: ordenTrabajoApi.ts)
export const ordenTrabajoApi = RtkQueryService.injectEndpoints({
    endpoints: (builder) => ({
        getOrdenesTrabajo: builder.query<IOrdenDeTrabajo[], void>({
            query: () => ({ url: '/api/ordenes-de-trabajo/', method: 'get' }),
            providesTags: ['OrdenTrabajoList'],
        }),
        updateOrdenTrabajo: builder.mutation({
            query: ({ id, data }) => ({ ... }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'OrdenTrabajo', id },
                'OrdenTrabajoList',
            ],
        }),
    }),
});
```

**Regla crítica:** NO usar `refetch()` manual. Confiar en `invalidatesTags` para revalidación automática.

### 4.4 Interfaces TypeScript

```
frontend/src/interface/
├── bodega.interface.ts        # IBodega, IGuiaSalida, IOrdenCompra, IStockItemEnBodega
├── calendario.interface.ts    # IDiaCalendario, ISolicitudVacaciones
├── contrato.interface.ts      # IContrato, IContratoServicio, IContratoLicencia
├── core.interface.ts          # IPersonalizacionUsuario, ISoftware
├── cotizaciones.interface.ts  # ICotizacion, IItemCotizacion, ISolicitante
├── empresas.interface.ts      # IEmpresa, IUsuarioEmpresa, ISucursalEmpresa
├── items.interface.ts         # IItemEmpresa, IProveedor, ICategoria
├── ordenTrabajo.interface.ts  # IOrdenDeTrabajo, ISoporteTecnico, IServicioEnOT
├── recursos.interface.ts      # IEquipo, IUsuarioEquipo, ISoftwareInstalado
├── rendicion.interface.ts     # IRendicion, IDetalleGasto
├── user.interface.ts          # IUser
└── visitas.interface.ts       # IVisitaSoporte, IAsistencia, IEntrega
```

### 4.5 Servicios HTTP

```typescript
// BaseService.ts - Inyecta JWT automáticamente
BaseService.interceptors.request.use((config) => {
    const token = store.getState().auth.access;
    if (token) config.headers['Authorization'] = 'Bearer ' + token;
    return config;
});

// ApiService.ts - Wrapper para llamadas HTTP
ApiService.fetchData<Response>({ url, method, data });

// RtkQueryService.ts - Base para RTK Query
```

---

## 5. Flujos de Negocio Principales

### 5.1 Flujo de Cotización
1. Crear cotización (`POST /api/cotizaciones/`)
2. Agregar items (`POST /api/cotizaciones/{id}/items/`)
3. Agregar solicitantes (`POST /api/cotizaciones/{id}/solicitantes-cotizacion/`)
4. Enviar por email (genera token para cada solicitante)
5. Solicitante accede a URL pública y aprueba/rechaza
6. Si todos aprueban → cotización aprobada
7. Se puede crear OC asociada

### 5.2 Flujo de Orden de Trabajo
1. Crear OT (`POST /api/ordenes-de-trabajo/`)
2. Agregar soportes o servicios
3. Asignar técnicos
4. Vincular guías de salida (si hay insumos)
5. Registrar gastos operativos
6. Marcar trabajos como completados
7. Crear cierre administrativo para facturación
8. Generar rendición automática

### 5.3 Flujo de Inventario (Guía de Salida)
1. Crear guía desde bodega
2. Agregar items del stock
3. Firmar guía (pasa a "Firmada")
4. Vincular a OT (pasa a "En tránsito" cuando OT inicia)
5. Al completar OT → devolver items no usados
6. Generar VoucherDevolucion

---

## 6. Configuración JWT

```python
# backend/sw_erp/settings.py
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=5),
    "REFRESH_TOKEN_LIFETIME": timedelta(hours=10),
    "ROTATE_REFRESH_TOKENS": True,
    "ALGORITHM": "HS256",
    "AUTH_HEADER_TYPES": ("Bearer",),
}
```

**Frontend:** BaseService maneja refresh automático en interceptor de respuesta.

---

## 7. Comandos de Desarrollo

```bash
# Backend
cd backend
python manage.py runserver 0.0.0.0:8000
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
celery -A sw_erp worker --loglevel=info --pool=solo
celery -A sw_erp beat --loglevel=info

# Frontend
cd frontend
npm run dev         # Servidor desarrollo
npm run build       # Build producción
npm run lint        # Verificar errores
npm run prettier:fix # Formatear código
```

**VS Code Tasks disponibles:**
- Backend: Runserver
- Backend: Celery Worker / Beat
- Backend: Make Migrations / Migrate
- Frontend: Dev Server
- Docker: Build+Push Backend/Frontend

---

## 8. Variables de Entorno

**Backend (.env):**
- `SECRET_KEY`, `DEBUG_ENABLE`
- `REDIS_HOST`, `REDIS_PORT`
- `POSTGRES_*` (producción)
- `FRONTEND_URL`, `HOSTAPIV2`

**Frontend (.env):**
- `VITE_API_URL` - URL del backend

---

Última actualización: 2026-02-03
````
