---
title: "Índice Local - Documentación Backend"
scope: "backend"
status: "active"
last_updated: "2025-11-05"
---

# Índice Local: Documentación Backend

Este directorio contiene la documentación detallada de todas las apps Django del backend.

## 📁 Estructura de Documentos

### Instrucciones Generales
- **[backend-instructions.md](../backend-instructions.md)** (~150 líneas)
  - Arquitectura y estructura de apps
  - Modelos y managers personalizados
  - Serializers y validaciones
  - ViewSets y permisos
  - Autenticación JWT (Djoser + SimpleJWT)
  - Celery (tareas asíncronas)
  - Channels (WebSockets tiempo real)
  - Comandos de desarrollo
  - Referencias cruzadas

### Documentación Detallada por Apps (5 documentos, ~19,000 líneas)

#### 1. core + cuentas (~2,400 líneas)
**[core-cuentas.md](./core-cuentas.md)**

**Apps documentadas**: `core` (2 models), `cuentas` (2 models + signals)

**Contenido**:
- **core**: BaseModel abstracto con timestamps, PersonalizacionUsuario con tema/font_size/sucursal_principal
- **cuentas**: User model con email-based auth, InvitacionEmpresa con tokens UUID + state machine
- Relaciones clave: PersonalizacionUsuario.sucursal_principal → SucursalEmpresa (crítico para permisos)
- Signals: post_save User crea PersonalizacionUsuario automáticamente
- Patrones: Abstract model inheritance, UUID tokens con expiration_date, is_expired() method

#### 2. empresas + cotizaciones (~2,500 líneas)
**[empresas-cotizaciones.md](./empresas-cotizaciones.md)**

**Apps documentadas**: `empresas` (4 models), `cotizaciones` (4 models + signals)

**Contenido**:
- **empresas**: Empresa con RUT validation, SucursalEmpresa con es_casa_matriz flag, UsuarioEmpresa M2M to groups, RelacionEmpresa self-referencing
- **cotizaciones**: Cotizacion con multicurrency support, ItemCotizacion con unit pricing, EstadoCotizacion enum, consecutive folio generation
- Relaciones clave: UsuarioEmpresa.grupos M2M a Group, Cotizacion.sucursal FK a SucursalEmpresa
- Signals: post_save Cotizacion genera folio consecutivo por empresa
- Patrones: Self-referencing M2M (RelacionEmpresa), enum choices (EstadoCotizacion), consecutive ID generation

#### 3. contratos + bodegas + items (~4,500 líneas)
**[contratos-bodegas-items.md](./contratos-bodegas-items.md)**

**Apps documentadas**: `contratos` (5 models + 3 signals), `bodegas` (3 models), `items` (5 models)

**Contenido**:
- **contratos**: Contrato UUID PK, LicenciaContrato windowing logic (fecha_inicio/fecha_termino), ArchivoContrato MEDIA_ROOT, ItemContrato cantidad/precio_unitario/subtotal, folio generation + 2 signals auto-manage totals
- **bodegas**: Bodega, MovimientoBodega tipos (entrada/salida/ajuste/transferencia), GuiaDespacho with folio
- **items**: Item SKU, Categoria, Fabricante, PrecioItem history (fecha_desde), stock calculation con aggregations usando PMP (Precio Medio Ponderado)
- Relaciones clave: Contrato.licencias → LicenciaContrato (1-to-many), MovimientoBodega.bodega_origen/bodega_destino para transferencias
- Signals: Contrato post_save genera folio, 2 signals ItemContrato actualizan totales automáticamente
- Patrones: UUID PK, windowing (validity periods), auto-calculation signals, PMP method para stock valuation

#### 4. ordentrabajo + recursos + rendiciones + visitas (~6,000 líneas)
**[ordentrabajo-recursos-rendiciones-visitas.md](./ordentrabajo-recursos-rendiciones-visitas.md)**

**Apps documentadas**: `ordentrabajo` (4 models + 3 signals), `recursos` (1 model), `rendiciones` (2 models), `visitas` (2 models)

**Contenido**:
- **ordentrabajo**: OrdenTrabajo folio+UUID, EstadoOT enum 7 states, ItemOT con XOR constraint CheckConstraint (item OR item_cotizacion), RecursoOT GenericFK a User/Recurso, 3 signals (folio generation, fecha_termino >= fecha_inicio validation, auto-assign recursos)
- **recursos**: Recurso model para técnicos de campo
- **rendiciones**: RendicionGasto GenericFK a OrdenTrabajo/other models, ArchivosRendicion para comprobantes
- **visitas**: VisitaTerreno GenericFK, checkin/checkout timestamps, photo uploads, FormularioVisita JSON field para custom forms
- Relaciones clave: RecursoOT GenericFK permite asignar User o Recurso model, RendicionGasto GenericFK a múltiples modelos
- Signals: OrdenTrabajo post_save genera folio, pre_save valida fechas, post_save auto-asigna recursos
- Patrones: GenericFK (6 usos totales), XOR constraints CheckConstraint, folio + UUID combined keys, JSON fields para flexibilidad

#### 5. vacaciones + calendario + activos + retroalimentacion (~3,500 líneas)
**[vacaciones-calendario-activos-retroalimentacion.md](./vacaciones-calendario-activos-retroalimentacion.md)**

**Apps documentadas**: `vacaciones` (2 models), `calendario` (1 model), `activos` (3 models), `bd_ciudades` (3 models), `retroalimentacion` (1 model)

**Contenido**:
- **vacaciones**: SolicitudVacaciones con dias_habiles calculation (ley chilena), estado enum 4 states (pendiente/aprobada/rechazada/cancelada), HistorialVacaciones audit trail
- **calendario**: EventoCalendario con tipo enum 6 types, recurrence patterns, invitees M2M a User
- **activos**: Activo para equipment tracking, MantenimientoActivo scheduled maintenance, AsignacionActivo a users/locations
- **bd_ciudades**: Region/Provincia/Comuna Chilean geography hierarchy
- **retroalimentacion**: Retroalimentacion UUID PK, GenericFK a múltiples modelos, rating 1-5, estado enum
- Relaciones clave: EventoCalendario.invitados M2M a User, Retroalimentacion GenericFK permite feedback en múltiples contextos
- Patrones: Enum states con descripción, audit trails (HistorialVacaciones), hierarchical data (bd_ciudades), recurrence patterns (EventoCalendario)

## 📊 Métricas de Cobertura

| Apps Documentadas | Modelos | Signals | GenericFK | Total Líneas |
|-------------------|---------|---------|-----------|--------------|
| 15 de 15 (100%)   | 95      | 6       | 6         | ~19,000      |

## 🔍 Cómo Usar Esta Documentación

### Buscar por App Django
1. Revisa la tabla arriba para identificar qué documento contiene tu app
2. Cada documento cubre 2-5 apps relacionadas por dominio de negocio
3. Usa Ctrl+F dentro del documento para buscar modelos específicos

### Buscar por Modelo
- **core**: BaseModel, PersonalizacionUsuario → [core-cuentas.md](./core-cuentas.md)
- **cuentas**: User, InvitacionEmpresa → [core-cuentas.md](./core-cuentas.md)
- **empresas**: Empresa, SucursalEmpresa, UsuarioEmpresa, RelacionEmpresa → [empresas-cotizaciones.md](./empresas-cotizaciones.md)
- **cotizaciones**: Cotizacion, ItemCotizacion → [empresas-cotizaciones.md](./empresas-cotizaciones.md)
- **contratos**: Contrato, LicenciaContrato, ArchivoContrato, ItemContrato → [contratos-bodegas-items.md](./contratos-bodegas-items.md)
- **bodegas**: Bodega, MovimientoBodega, GuiaDespacho → [contratos-bodegas-items.md](./contratos-bodegas-items.md)
- **items**: Item, Categoria, Fabricante, PrecioItem → [contratos-bodegas-items.md](./contratos-bodegas-items.md)
- **ordentrabajo**: OrdenTrabajo, ItemOT, RecursoOT → [ordentrabajo-recursos-rendiciones-visitas.md](./ordentrabajo-recursos-rendiciones-visitas.md)
- **recursos**: Recurso → [ordentrabajo-recursos-rendiciones-visitas.md](./ordentrabajo-recursos-rendiciones-visitas.md)
- **rendiciones**: RendicionGasto, ArchivosRendicion → [ordentrabajo-recursos-rendiciones-visitas.md](./ordentrabajo-recursos-rendiciones-visitas.md)
- **visitas**: VisitaTerreno, FormularioVisita → [ordentrabajo-recursos-rendiciones-visitas.md](./ordentrabajo-recursos-rendiciones-visitas.md)
- **vacaciones**: SolicitudVacaciones, HistorialVacaciones → [vacaciones-calendario-activos-retroalimentacion.md](./vacaciones-calendario-activos-retroalimentacion.md)
- **calendario**: EventoCalendario → [vacaciones-calendario-activos-retroalimentacion.md](./vacaciones-calendario-activos-retroalimentacion.md)
- **activos**: Activo, MantenimientoActivo, AsignacionActivo → [vacaciones-calendario-activos-retroalimentacion.md](./vacaciones-calendario-activos-retroalimentacion.md)
- **bd_ciudades**: Region, Provincia, Comuna → [vacaciones-calendario-activos-retroalimentacion.md](./vacaciones-calendario-activos-retroalimentacion.md)
- **retroalimentacion**: Retroalimentacion → [vacaciones-calendario-activos-retroalimentacion.md](./vacaciones-calendario-activos-retroalimentacion.md)

### Buscar por Patrón Técnico
- **Signals**: [core-cuentas.md](./core-cuentas.md) (post_save User), [empresas-cotizaciones.md](./empresas-cotizaciones.md) (folio generation), [contratos-bodegas-items.md](./contratos-bodegas-items.md) (auto-calculate totals), [ordentrabajo-recursos-rendiciones-visitas.md](./ordentrabajo-recursos-rendiciones-visitas.md) (folio + validation + auto-assign)
- **GenericFK**: [ordentrabajo-recursos-rendiciones-visitas.md](./ordentrabajo-recursos-rendiciones-visitas.md) (RecursoOT, RendicionGasto, VisitaTerreno), [vacaciones-calendario-activos-retroalimentacion.md](./vacaciones-calendario-activos-retroalimentacion.md) (Retroalimentacion)
- **UUID Primary Keys**: [contratos-bodegas-items.md](./contratos-bodegas-items.md) (Contrato), [ordentrabajo-recursos-rendiciones-visitas.md](./ordentrabajo-recursos-rendiciones-visitas.md) (OrdenTrabajo), [vacaciones-calendario-activos-retroalimentacion.md](./vacaciones-calendario-activos-retroalimentacion.md) (Retroalimentacion), [core-cuentas.md](./core-cuentas.md) (InvitacionEmpresa activation_token)
- **Enum Choices**: [empresas-cotizaciones.md](./empresas-cotizaciones.md) (EstadoCotizacion), [ordentrabajo-recursos-rendiciones-visitas.md](./ordentrabajo-recursos-rendiciones-visitas.md) (EstadoOT), [vacaciones-calendario-activos-retroalimentacion.md](./vacaciones-calendario-activos-retroalimentacion.md) (estados vacaciones/retroalimentacion/eventos)
- **Windowing/Validity Periods**: [contratos-bodegas-items.md](./contratos-bodegas-items.md) (LicenciaContrato fecha_inicio/fecha_termino), [contratos-bodegas-items.md](./contratos-bodegas-items.md) (PrecioItem fecha_desde)

## 📚 Referencias Cruzadas

### Documentos Relacionados
- **[backend-instructions.md](../backend-instructions.md)**: Instrucciones generales (estructura, serializers, vistas, permisos)
- **[../../ARQUITECTURA_SISTEMA.md](../../ARQUITECTURA_SISTEMA.md)**: Arquitectura completa del monorepo
- **[../../INICIALIZACION.md](../../INICIALIZACION.md)**: Setup y scripts de inicialización
- **[../../INDICE_DOCUMENTACION.md](../../INDICE_DOCUMENTACION.md)**: Índice maestro con guías de lectura

### Navegación por Rol
- **Nuevo desarrollador**: Ver [INDICE_DOCUMENTACION.md](../../INDICE_DOCUMENTACION.md) sección "Guía de Lectura: Nuevo Desarrollador" → recomienda leer core-cuentas.md como primer paso backend
- **Desarrollar nueva feature**: Buscar modelos relevantes en este README → leer documento correspondiente → consultar backend-instructions.md para patrones
- **Troubleshooting**: Ver [INDICE_DOCUMENTACION.md](../../INDICE_DOCUMENTACION.md) sección "Guía de Lectura: Troubleshooting" → categorías de problemas con rutas de navegación

---

**Última actualización**: 2025-11-05  
**Creado por**: Reorganización de documentación (Task 5, 80% progreso)
