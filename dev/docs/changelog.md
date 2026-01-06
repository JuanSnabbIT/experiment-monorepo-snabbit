# Changelog Estratégico – Monorepo ERP

Uso: Registrar cambios de estado relevantes del sistema (implementaciones completadas, entregas de bloques, releases). Actualizar al cerrar features o despliegues.

---

## 2026-01-05 — BLOQUE 6: Mejoras Sistema de Rendiciones (En Progreso)

**Rama:** `feature/mejoras-rendiciones` (en progreso)  
**Status:** 🟢 FASE 1 COMPLETADA | 🟢 FASE 2 COMPLETADA | 🟢 FASE 3 COMPLETADA | 🟢 FASE 4 COMPLETADA | � FASE 5 PENDIENTE | 🟢 FASE 6 COMPLETADA

### Resumen
Rediseño del sistema de rendiciones para:
- Separar conceptualmente gastos reembolsables (técnico) vs facturables (cliente)
- Limpiar categorías (solo operativos, materiales van a Compras)
- Introducir política de viáticos por cliente (heredable/override)
- Mejorar trazabilidad OT ↔ Rendición

### Cambios Implementados

#### ✅ FASE 1: Limpieza de Categorías (2026-01-05) - COMPLETADA

**Antes:**
- 34 categorías totales
- 8 categorías de materiales (Cables, Herramientas, Material Eléctrico, etc.)
- 8 duplicados (con/sin tildes, diferentes escrituras)
- Conceptos mezclados (operativos + materiales)

**Después:**
- 18 categorías SOLO operativas
- 0 categorías de materiales (eliminadas)
- 0 duplicados (consolidados)
- Conceptos separados (operativos en CategoriaGastoRendicion, materiales en Compra)

**Categorías Eliminadas (Materiales):**
- ID 13: Cables y Conectores
- ID 14: Herramientas
- ID 15: Material Eléctrico
- ID 16: Tornillería
- ID 17: Consumibles (cinta, pegamento, etc.)
- ID 28: Material Electrico (duplicado sin tilde)
- ID 29: Tornilleria (duplicado sin tilde)
- ID 30: Consumibles (duplicado)

**Duplicados Consolidados:**
- ID 25 "Arriendo de Vehiculo" → ID 6 "Arriendo de Vehículo" (con tilde)
- ID 24 "Transporte Publico" → ID 5 "Transporte Público" (con tildes)
- ID 26 "Desayuno / Almuerzo / Cena" → ID 7 "Desayuno" (separado)
- ID 27 "Colacion" → ID 10 "Colación" (con tilde)
- ID 33 "Capacitacion" → ID 20 "Capacitación" (con tilde)
- ID 32 "Internet Movil" → ID 19 "Internet Móvil" (con tilde)
- ID 31 "Llamadas Telefonicas" → ID 18 "Llamadas Telefónicas" (con tildes)
- ID 34 "Envio de Documentos" → ID 22 "Envío de Documentos" (con tilde)

**Categorías Finales (18 operativas):**
```
Transporte:
  - Combustible
  - Taxi/Uber
  - Transporte Público (Metro/Bus)
  - Arriendo de Vehículo

Alimentación:
  - Desayuno
  - Almuerzo
  - Cena
  - Colación

Alojamiento:
  - Hotel
  - Hostal

Peajes y Estacionamiento:
  - Peaje
  - Estacionamiento

Comunicaciones:
  - Llamadas Telefónicas
  - Internet Móvil

Servicios Administrativos:
  - Impresiones y Fotocopias
  - Envío de Documentos
  - Capacitación
  - Gastos Varios
```

**Archivos/Scripts Creados:**
- `dev/scripts/fase1_verificar_categorias.py` - Verificación de categorías y referencias
- `dev/scripts/fase1_limpiar_categorias.py` - Limpieza y consolidación automática

**Impacto:**
- Base de datos: 16 categorías eliminadas (8 materiales + 8 duplicados)
- Referencias migradas: 0 (ninguna categoría tenía gastos asociados)
- Sin breaking changes: Frontend funciona igual (categorías eliminadas no se usaban)

**Validación:**
- ✅ Sin referencias huérfanas
- ✅ Duplicados consolidados correctamente
- ✅ Solo categorías operativas permanecen

---

#### ✅ FASE 2: Modelo - Política de Viáticos (2026-01-05) - COMPLETADA

**Cambios en Modelo Empresa:**
- ➕ Campo `politica_viaticos_default` (CharField, choices: 'I'/'F', default='I')
- Política por defecto que hereda cada nueva rendición del cliente

**Cambios en Modelo Rendicion:**
- ➕ FK `cliente` → Empresa (null=True, on_delete=PROTECT)
- ➕ Campo `politica_viaticos` (CharField, null=True - override opcional)
- ➕ Propiedad `politica_viaticos_efectiva` → retorna override o default del cliente
- ➕ Propiedad `total_reembolso_tecnico` → suma de TODOS los gastos (operativos + compras)
- ➕ Propiedad `total_facturable_cliente` → según política:
  - Si 'F' (Facturables): solo gastos operativos + compras
  - Si 'I' (Incluidos): solo compras (empresa asume operativos)
- ➕ Propiedad `total_no_facturable` → diferencia entre reembolso y facturable
- ↔️ Propiedad `total_rendicion` → mantiene compatibilidad (retorna total_reembolso_tecnico)

**Migraciones:**
- `empresas/migrations/0002_add_politica_viaticos_default.py` - ✅ Aplicada
- `rendiciones/migrations/0003_add_cliente_and_politica_viaticos.py` - ✅ Aplicada

**Archivos/Scripts Creados:**
- `dev/scripts/fase2_verificar_modelos.py` - Verificación de nuevos campos y propiedades

**Impacto:**
- Base de datos: 3 nuevos campos agregados sin breaking changes
- Backend: 4 nuevas propiedades calculadas disponibles
- Frontend: Sin cambios aún (FASE 4)
- Compatibilidad: Total (cliente y politica_viaticos son null=True)

**Validación:**
- ✅ Migraciones aplicadas correctamente
- ✅ Empresa.politica_viaticos_default funciona (default='I')
- ✅ Propiedades calculadas disponibles
- ✅ Sin errores de importación
- ✅ Backward compatible (total_rendicion preservado)

---

#### ✅ FASE 3: Serializers y Backend (2026-01-05) - COMPLETADA

**Cambios en RendicionSerializer:**
- ➕ Campo `politica_viaticos_efectiva` (read_only, desde propiedad del modelo)
- ➕ Campo `total_reembolso_tecnico` (DecimalField read_only)
- ➕ Campo `total_facturable_cliente` (DecimalField read_only)
- ➕ Campo `total_no_facturable` (DecimalField read_only)
- ➕ Campos `cliente` y `politica_viaticos` expuestos automáticamente (fields="__all__")
- ↔️ Campo `total` preservado para compatibilidad (legacy)

**Cambios en RendicionViewSet:**
- ➕ Método `perform_create()`: Auto-herencia de política desde cliente
- Lógica: Si hay cliente y NO hay override, la propiedad `politica_viaticos_efectiva` usa el default del cliente
- Comentarios explicativos del comportamiento BLOQUE 6

**Archivos/Scripts Creados:**
- `dev/scripts/fase3_test_serializer.py` - Test de serialización con nuevos campos

**Test Ejecutado:**
```
Rendición con cliente + política 'I' (Incluidos):
- total_reembolso_tecnico: $31,000 ✓
- total_facturable_cliente: $0 ✓ (empresa asume operativos)
- total_no_facturable: $31,000 ✓
- politica_viaticos_efectiva: 'I' ✓ (heredado del cliente)
```

**Impacto:**
- API expone 5 nuevos campos en GET /rendiciones/
- Frontend puede consumir totales separados sin cálculo local
- Backward compatible: campo `total` sigue presente

**Validación:**
- ✅ Serializer expone todos los campos nuevos
- ✅ Propiedades calculadas se serializan correctamente
- ✅ perform_create() permite herencia de política

---

#### ✅ FASE 4: Frontend (2026-01-05) - COMPLETADA

**Cambios en Interfaces TypeScript:**
- ➕ Interface `IRendicion`: agregados 7 campos nuevos
  - `cliente: number | null`
  - `politica_viaticos: 'I' | 'F' | null`
  - `politica_viaticos_efectiva: 'I' | 'F'`
  - `total_reembolso_tecnico: number`
  - `total_facturable_cliente: number`
  - `total_no_facturable: number`
  - `total: number` marcado como legacy

**Cambios en DetalleRendicion.tsx:**
- ➕ Card "Totales y Política" reemplaza card "Total"
- ➕ Badge visual de política efectiva (azul=Incluidos, verde=Facturables)
- ➕ 3 totales con colores diferenciados:
  - Total Reembolso Técnico (azul): todo lo que gastó
  - Total Facturable Cliente (verde): se cobra en factura
  - Total No Facturable (ámbar): empresa asume
- ➕ Descripción contextual bajo cada total
- ➕ Grid responsive (1 col móvil, 2 tablet, 3 desktop)

**Archivos Modificados:**
- `frontend/src/interface/rendicion.interface.ts`
- `frontend/src/pages/Rendiciones/components/DetalleRendicion.tsx`

**Impacto:**
- UI muestra claramente qué se reembolsa, qué se factura y qué asume la empresa
- Política visual inmediata (sin necesidad de leer números)
- Backward compatible: listados existentes funcionan sin cambios

**Validación:**
- ✅ TypeScript compilation passed (0 errors)
- ✅ Interfaces actualizadas correctamente
- ✅ Componente DetalleRendicion con 3 totales
- ✅ Listados (Admin, Mis Rendiciones) sin breaking changes

---

#### ✅ FASE 6: Automatización OT → Rendición (2026-01-05) - COMPLETADA

**Objetivo:** Crear automáticamente Rendición con todos sus gastos cuando OT pase a estado "completada"

**Cambios en Modelo Rendicion:**
- ➕ Campo `orden_trabajo` OneToOneField → OrdenDeTrabajo
  - Nullable: permite rendiciones manuales sin OT
  - Related name: `rendicion_asociada` (acceso desde OT)
  - on_delete: SET_NULL (rendición queda huérfana si se borra OT)
- Nueva migración: `rendiciones/0004_rendicion_orden_trabajo.py`

**Cambios en Serializer:**
- ➕ Campo `orden_trabajo` expuesto como read_only en RendicionSerializer

**Cambios en Lógica de OT:**
- ♻️ Extendido `_sincronizar_relaciones_completada()` en `ordentrabajov2/views.py`:
  - **Validaciones previas:**
    * Verifica idempotencia: no duplica si ya existe `rendicion_asociada`
    * Valida que OT tenga gastos (`RendicionEnOt`) o compras con items
    * Asigna usuario: `tecnico_responsable_ot` (fallback: `cliente_solicitante`)
    * Early exit seguro si no hay usuario asignado
  - **Creación atómica (transaction.atomic()):**
    * Crea Rendicion con estado "1" (En Espera de Aprobación)
    * Cliente heredado desde `OT.cliente`
    * Fecha: fecha de cierre (timezone.now().date())
    * Vincula `orden_trabajo` → OT
  - **Auto-asociación de gastos:**
    * Crea ItemRendicion para cada `RendicionEnOt` de la OT
    * Crea ItemRendicion para cada `Compra` con items asociada a OT
    * Content types correctos: ordentrabajov2.rendicionenot + bodegas.compra

**Flujo Completo:**
1. OT pasa a estado "completada" (vía `cambiar_estado` o `update`)
2. Se dispara `_sincronizar_relaciones_completada(orden)`
3. Sistema verifica gastos/compras existentes
4. Crea Rendición automática con estado "En Espera de Aprobación"
5. Asocia TODOS los gastos operativos y compras como ItemRendicion
6. Usuario puede revisar/aprobar/editar en módulo rendiciones

**Archivos Modificados:**
- `backend/rendiciones/models.py` (+13 líneas campo orden_trabajo)
- `backend/rendiciones/serializers.py` (+1 línea exposición campo)
- `backend/ordentrabajov2/views.py` (+68 líneas lógica automatización)
- Nueva migración: `rendiciones/migrations/0004_rendicion_orden_trabajo.py`

**Garantías Implementadas:**
- ✅ Idempotencia: no duplica rendiciones (verifica `rendicion_asociada`)
- ✅ Atomicidad: `transaction.atomic()` rollback automático si falla
- ✅ Fallback seguro: usuario = técnico responsable OR cliente solicitante
- ✅ Early exit: no crea si no hay gastos ni compras
- ✅ Early exit: no crea si no hay usuario asignado

**Validación:**
- ✅ Migración aplicada correctamente
- ✅ 0 errores Pylance en 3 archivos backend
- ✅ Estado inicial correcto: "En Espera de Aprobación" (no borrador)
- ✅ Vinculación bidireccional: OT.rendicion_asociada ↔ Rendicion.orden_trabajo


### Fases Pendientes

#### 🔴 FASE 5: PDF (PENDIENTE)
- Update TypeScript interfaces: +nuevos campos en `Rendicion`
- Update `CrearRendicion.tsx`: +selector de cliente
- Update `DetalleRendicion.tsx`: +mostrar 3 totales separados + badge política
- Estado: NO INICIADO

#### FASE 5-6: Pendientes (ver [planificacion.md](planificacion.md))

---

## 2025-12-31 — Implementación y Merge: BLOQUEs 1-5 a Main

**Rama:** `integration/revision-bloques-1-5` → `main` (Fast-forward merge)  
**Commits:** 50+, 115 archivos modificados, 22,838 insertions, 6,215 deletions  
**Status:** ✅ COMPLETADO Y VALIDADO

### BLOQUE 1: Cotizaciones Backend
- Campo `porcentaje_recargo` en modelo (PositiveIntegerField, default=0)
- Histórico con `simple_history`
- 6 propiedades en `ItemCotizacion` actualizadas
- Estado: Funcional y verificado

### BLOQUE 2: Bodegas + Compras + Data-Leak Fixes
- 3 CRITICAL data-leak security fixes (PersonalizacionUsuario filtering):
  - `VoucherDevolucionViewSet`: Filter by empresa/sucursal
  - `ItemEnCompraViewSet`: Filter by sucursal
  - `ItemsGuiaSalidaViewSet`: Filter by empresa/sucursal
- `VoucherDevolucion` + `MovimientoEnVoucher` sistema de devoluciones
- `Compra` + `ItemEnCompra` con estados borrador/completada
- Endpoints: list/detalle/PDF/HTML
- Commit: `fabe48a` (security-critical)

### BLOQUE 3: Órdenes Compra Frontend + UX Improvements
- Modal backdrop click bug fix (event.target === event.currentTarget)
- Aside flex layout improvement (flex-1, overflow-y-auto)
- priceFormat CLP localization (es-CL, $123.456 format)
- Commit: `a94d9f7`

### BLOQUE 4: Guías de Salida
- `GuiaSalida` CRUD backend/frontend
- 3 PersonalizacionUsuario filters (mismo patrón BLOQUEs 2)
- Endpoints: list/detalle/PDF/HTML
- Estado: Completo

### BLOQUE 5: Órdenes Trabajo V2
- `ordentrabajov2` app (reemplaza `ordentrabajo`)
- `ServicioEnOT` para servicios generales
- Frontend refactores: `renderBadgeValue`, `confirmAlert` pattern
- Estado: Completo con extensiones frontend

### Validaciones Completadas
- Backend tests: ✅ Cotizaciones, Bodegas sin errores
- Frontend build: ✅ `npm run build` SUCCESS
- TypeScript compilation: ✅ 29 errors resueltos
- Security review: ✅ Data-leak fixes verified
- Git history: ✅ 50+ commits atomizados

---

## 2025-12-30 — Consolidación de Documentación Técnica

- Reemplazo de archivos dispersos por 5 documentos vivos:
  - `analisis.md` - Decisiones técnicas y hallazgos
  - `changelog.md` - Timeline y entregas (este archivo)
  - `flujos_operativos.md` - Procesos y QA
  - `planificacion.md` - Roadmap y próximos pasos
  - `sistemas.md` - Arquitectura y módulos

---

## 2025-12-28 — Sistema de Devoluciones

- Backend: `VoucherDevolucion` + `MovimientoEnVoucher` (bodegas), endpoints list/detalle/PDF/HTML
- Frontend: interfaces, servicio HTTP, slice de bodega, componentes en OT y Bodegas
- Estado: Implementado y en uso

---

## 2025-12-20 — Incorporación OTv2 y Cambios Mayores

- Backend: app `ordentrabajov2` añadida; ajustes en OTv1, cotizaciones, bodegas, items, contratos, empresas, rendiciones, recursos, cuentas, core, settings/urls
- Frontend: múltiples pantallas nuevas/ajustadas (OT, cotizaciones, bodegas, items, empresas, contratos, dashboard), slices y constantes ampliadas
- Estado: Desplegado en main; revisión de compatibilidad en producción completada

---

## 2025-11 — Evolución OT V2 (Servicios y Tipos)

- Formulario OT incluye `tipo_servicio`; vistas separadas por tipo de servicio
- Preparación para campos `tipo_trabajo` y asignaciones específicas
- Backend: validación de campos en modelo/serializers
- Estado: Parcialmente implementado; transición a OTv2 completada
