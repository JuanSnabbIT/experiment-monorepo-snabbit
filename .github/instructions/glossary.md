````markdown
# Glossary - Términos y Abreviaturas (Documento Exhaustivo)

Glosario completo de términos del dominio de negocio y técnicos del sistema ERP.

---

## 1. Términos del Dominio de Negocio

### Entidades Principales

| Término | Definición |
|---------|------------|
| **Empresa** | Entidad legal que usa el sistema. Puede ser prestadora de servicios o cliente. |
| **Sucursal** | División geográfica o administrativa de una empresa. |
| **UsuarioEmpresa** | Relación entre un usuario y una sucursal, incluye cargo, grupos y permisos. |
| **RelacionEmpresa** | Relación prestador-cliente entre dos empresas. |
| **Cliente** | Empresa a la que se le prestan servicios (es también un registro de Empresa). |

### Inventario (App: bodegas)

| Término | Definición |
|---------|------------|
| **Bodega** | Almacén físico o lógico de inventario asociado a una sucursal. |
| **Stock** | Cantidad de un ítem disponible en una bodega (StockItemEnBodega). |
| **PMP** | Precio Medio Ponderado - costo promedio del ítem en stock. |
| **OC / Orden de Compra** | Solicitud de compra a un proveedor. |
| **Guía de Salida** | Documento que autoriza la salida de items del inventario. |
| **Rebaje** | Reducción del stock al sacar items (vía guía de salida). |
| **Compra Rápida** | Compra sin OC formal, registro directo de ingreso. |
| **Toma de Inventario** | Conteo físico para verificar stock real vs sistema. |
| **Voucher de Devolución** | Comprobante de items devueltos al completar una OT. |
| **Movimiento de Stock** | Registro de entrada, salida, devolución o ajuste de inventario. |

### Cotizaciones (App: cotizaciones)

| Término | Definición |
|---------|------------|
| **Cotización** | Presupuesto o propuesta comercial a un cliente. |
| **ItemCotizacion** | Línea de producto/servicio en una cotización. |
| **Solicitante** | Persona que debe aprobar una cotización (interno o externo). |
| **Token de Aprobación** | Token único para que un solicitante apruebe/rechace vía URL pública. |
| **Tipo de Moneda** | "1"=USD, "2"=CLP, "3"=UF. |
| **Dólar Observado** | Tipo de cambio USD/CLP del Banco Central. |
| **Valor UF** | Unidad de Fomento, unidad de cuenta ajustada por inflación en Chile. |
| **PPM** | Pago Provisorio Mensual - impuesto anticipado en Chile. |
| **Recargo** | Porcentaje adicional sobre el precio de venta. |

### Órdenes de Trabajo (App: ordentrabajov2)

| Término | Definición |
|---------|------------|
| **OT / Orden de Trabajo** | Trabajo asignado a técnicos para un cliente. |
| **Soporte Técnico** | Tipo de trabajo: revisión de equipos, software, etc. |
| **Servicio General** | Tipo de trabajo: instalaciones, capacitaciones, etc. |
| **Soporte Reactivo** | Soporte iniciado por incidente del cliente (soporte_r). |
| **Soporte Programado** | Soporte planificado/preventivo (soporte_p). |
| **Técnico Responsable** | Usuario asignado como responsable principal de la OT. |
| **Cliente Solicitante** | Usuario del cliente que solicitó el trabajo. |
| **Cierre Administrativo** | Prefactura para facturación de la OT. |
| **Gasto Operativo** | Gasto incurrido durante la ejecución de la OT. |
| **Seguimiento** | Comentario, incidencia o actualización registrada en la OT. |
| **Adjunto** | Archivo adjunto a la OT (informes, fotos, contratos). |

### Rendiciones (App: rendiciones)

| Término | Definición |
|---------|------------|
| **Rendición** | Reporte de gastos de un usuario para reembolso. |
| **Detalle de Gasto** | Línea individual de gasto en una rendición. |
| **Reembolso Técnico** | Monto a reembolsar al técnico. |
| **Facturable a Cliente** | Monto que se puede facturar al cliente. |

### Contratos (App: contratos)

| Término | Definición |
|---------|------------|
| **Contrato** | Acuerdo formal entre prestador y cliente. |
| **Servicio Contratado** | Servicio incluido en un contrato. |
| **Plan de Servicio** | Tipo de plan para un servicio (básico, premium, etc.). |
| **Licencia** | Licencia de software incluida en contrato. |
| **Modalidad de Licencia** | p1y-a (anual anticipado), p1y-m (anual mensual), p1m-m (mensual). |
| **Ventana de Reducción** | Período para reducir licencias sin penalización. |
| **Condición Especial** | Cláusula especial del contrato. |

### Visitas (App: visitas)

| Término | Definición |
|---------|------------|
| **Visita de Soporte** | Visita presencial a un cliente. |
| **Asistencia a Usuario** | Revisión de equipo de un usuario durante visita. |
| **Entrega de Equipo** | Entrega de equipo nuevo durante visita. |

### Recursos (App: recursos)

| Término | Definición |
|---------|------------|
| **Equipo** | Computador, laptop, servidor u otro hardware. |
| **Usuario de Equipo** | Asignación de equipo a un usuario. |
| **Software Instalado** | Software registrado en un equipo. |
| **Especificaciones** | Datos técnicos del equipo (CPU, RAM, disco, etc.). |

### Calendario y Vacaciones

| Término | Definición |
|---------|------------|
| **Día Calendario** | Día feriado o irrenunciable. |
| **Feriado Irrenunciable** | Feriado donde no se puede trabajar legalmente. |
| **Solicitud de Vacaciones** | Petición de días libres de un usuario. |
| **Vacaciones Extraordinarias** | Días adicionales fuera del cálculo normal. |

---

## 2. Estados de Modelos

### Orden de Compra
| Código | Estado |
|--------|--------|
| `-` | Borrador |
| `0` | Pendiente de aprobación |
| `1` | Aprobada |
| `2` | Rechazada |
| `3` | Enviada al proveedor |
| `4` | Parcialmente recibida |
| `5` | Completada |
| `6` | Cancelada |
| `7` | Cerrada |

### Guía de Salida
| Código | Estado |
|--------|--------|
| `P` | Pendiente |
| `ER` | Espera firma técnico |
| `FR` | Firmada por técnico |
| `ET` | En Tránsito |
| `R` | Revertida |
| `PR` | Parcialmente Revertida |
| `E` | Entregada |
| `T` | Terminada |

### Orden de Trabajo
| Código | Estado |
|--------|--------|
| `pendiente` | Pendiente |
| `en_proceso` | En Proceso |
| `completada` | Completada |
| `cerrada` | Validada y Cerrada |
| `facturada` | En proceso Factura |
| `cancelada` | Cancelada |

### Detalle de Trabajo (Soporte/Servicio)
| Código | Estado |
|--------|--------|
| `pendiente` | Pendiente |
| `en_proceso` | En Proceso |
| `medianamente_completado` | Medianamente Completado |
| `completado` | Completado |
| `no_realizado` | No Realizado |

### Cierre Administrativo OT
| Código | Estado |
|--------|--------|
| `borrador` | Borrador |
| `en_revision` | En Revisión |
| `aprobado` | Aprobado |
| `facturado` | Facturado |
| `pagado` | Pagado |
| `anulado` | Anulado |

### Cotización
| Código | Estado |
|--------|--------|
| `pendiente` | Pendiente |
| `enviada` | Enviada |
| `aceptada` | Aceptada |
| `rechazada` | Rechazada |
| `expirada` | Expirada |

### Rendición
| Código | Estado |
|--------|--------|
| `0` | Borrador |
| `1` | Enviada |
| `2` | Aprobada |
| `3` | Rechazada |

### Solicitud de Vacaciones
| Código | Estado |
|--------|--------|
| `1` | Pendiente |
| `2` | Aprobada |
| `3` | Rechazada |

---

## 3. Términos Técnicos

### Backend

| Término | Definición |
|---------|------------|
| **Django** | Framework web Python. |
| **DRF** | Django REST Framework - extensión para APIs REST. |
| **ViewSet** | Clase que agrupa operaciones CRUD en DRF. |
| **Serializer** | Clase que serializa/deserializa datos en DRF. |
| **JWT** | JSON Web Token - sistema de autenticación stateless. |
| **SimpleJWT** | Librería de JWT para Django. |
| **Djoser** | Librería de autenticación para DRF (registro, activación, reset password). |
| **Celery** | Sistema de tareas asíncronas. |
| **Celery Beat** | Scheduler de tareas programadas. |
| **Redis** | Broker de mensajes para Celery. |
| **Channels** | WebSockets para Django. |
| **Daphne** | Servidor ASGI para Channels. |
| **django-simple-history** | Auditoría de cambios en modelos. |
| **django-filter** | Filtrado de querysets vía parámetros. |
| **drf-nested-routers** | Routers anidados para endpoints jerárquicos. |
| **Migración** | Cambio de esquema de base de datos. |
| **Signal** | Evento que dispara lógica en Django. |

### Frontend

| Término | Definición |
|---------|------------|
| **React** | Librería UI de JavaScript. |
| **TypeScript** | JavaScript con tipos estáticos. |
| **Vite** | Bundler y dev server rápido. |
| **Redux Toolkit** | Gestión de estado global. |
| **RTK Query** | Capa de cache y fetching de datos en Redux Toolkit. |
| **Slice** | Módulo de estado en Redux Toolkit. |
| **Tag (RTK Query)** | Identificador para invalidación de cache. |
| **invalidatesTags** | Mecanismo de revalidación automática en RTK Query. |
| **Axios** | Cliente HTTP. |
| **TailwindCSS** | Framework CSS utility-first. |
| **Formik** | Librería de formularios para React. |
| **Yup** | Librería de validación de esquemas. |
| **TanStack Table** | Librería de tablas headless. |
| **SweetAlert2** | Librería de modales/alertas. |
| **react-toastify** | Notificaciones toast. |
| **FullCalendar** | Componente de calendario. |

### DevOps

| Término | Definición |
|---------|------------|
| **Docker** | Contenedores de aplicación. |
| **Dockerfile.optimized** | Dockerfile multi-stage optimizado para producción. |
| **Nginx** | Servidor web/proxy reverso. |
| **PostgreSQL** | Base de datos relacional (producción). |
| **SQLite** | Base de datos archivo (desarrollo). |

---

## 4. Abreviaturas Comunes en el Código

| Abreviatura | Significado |
|-------------|-------------|
| `OT` | Orden de Trabajo |
| `OC` | Orden de Compra |
| `GS` | Guía de Salida |
| `PMP` | Precio Medio Ponderado |
| `PPM` | Pago Provisorio Mensual |
| `UF` | Unidad de Fomento |
| `CLP` | Peso Chileno |
| `USD` | Dólar Estadounidense |
| `RUT` | Rol Único Tributario (identificación fiscal Chile) |
| `pk` | Primary Key |
| `fk` | Foreign Key |
| `CRUD` | Create, Read, Update, Delete |
| `API` | Application Programming Interface |
| `JWT` | JSON Web Token |
| `HTTP` | HyperText Transfer Protocol |
| `REST` | Representational State Transfer |

---

## 5. Convenciones de Nombres

### Backend (Python/Django)
```python
# Modelos: PascalCase
class OrdenDeTrabajo(models.Model)

# Campos: snake_case
fecha_creacion = models.DateTimeField()

# ViewSets: PascalCase + ViewSet
class OrdenDeTrabajoViewSet(viewsets.ModelViewSet)

# Serializers: PascalCase + Serializer
class OrdenDeTrabajoSerializer(serializers.ModelSerializer)

# URLs: kebab-case
path('ordenes-de-trabajo/', ...)
```

### Frontend (TypeScript/React)
```typescript
// Componentes: PascalCase
const OrdenTrabajoDetalle = () => {}

// Interfaces: I + PascalCase
interface IOrdenDeTrabajo {}

// Hooks: camelCase con prefijo use
const useEstadoOT = () => {}

// Slices: camelCase + Slice
const ordenTrabajoSlice = createSlice({})

// Archivos: camelCase o PascalCase según contenido
ordenTrabajo.interface.ts
OrdenTrabajoDetalle.page.tsx
```

---

Última actualización: 2026-02-03
````
