# Changelog Estratégico – Monorepo ERP

---
Responsable: -
Email: -
Proxima_revision: -
Estado: canonical
---

**Propósito único:** Timeline de entregas completadas, releases y cambios de estado del sistema en producción.

## 2026-01-15 — Reorganización: Front-matter + README de dev/docs

**Status:** ✅ COMPLETADO

Se añadió front-matter YAML a documentos canónicos, creado `dev/docs/README.md` con plantilla e índice, y marcado entradas migradas en `dev/docs/notas.md` con `✅ Migrado a <archivo>`.

Referencias: `dev/docs/README.md`, `dev/docs/analisis.md`, `dev/docs/notas.md`


**Qué va aquí:**
- Fechas y entregas de BLOQUEs/features completadas
- Cambios de estado significativos (releases, integraciones a main)
- Resumen ejecutivo de cambios por entrega
- Historial de versions/despliegues

**Qué NO va aquí:**
- ❌ Análisis técnico → usa `analisis.md`
- ❌ Roadmap o planes futuros → usa `planificacion.md`
- ❌ Notas de desarrollo diarias → usa `notas.md`

**Mantenimiento:**
- Agregar entrada al cerrar BLOQUE/feature (fecha + resumen)
- Mantener orden cronológico inverso (más reciente primero)
- Referenciar archivos de análisis para detalles técnicos
- Máximo 1-2 párrafos por entrega (o resumir en sub-bullets)

---

## 2026-01-06 — Refactor: Alineación de Instrucciones y Patrones Q1 2026

**Status:** ✅ COMPLETADO

### Resumen
Corrección de inconsistencias entre instrucciones documentadas y código actual, refuerzo de patrones de diseño críticos.

### Cambios Realizados

#### Instrucciones Corregidas

1. **frontend-guide.md**: Eliminada referencia a `OrdenTrabajoService.ts` en estructura de ejemplo (contradecía regla de NO crear servicios específicos por módulo).

2. **typescript.instructions.md**: Agregada sección "Manejo de Errores (CRÍTICO)" con:
   - Patrón obligatorio `unknown` + type guards (prohibido `any` en catch)
   - Helper `getErrorMessage()` para crear en `utils/errorHandlers.ts`
   - Ejemplos de código incorrecto vs correcto

3. **backend-guide.md**: Reforzada sección "Convención CRÍTICA: PersonalizacionUsuario":
   - Agregado ejemplo de antipatrón (filtrado solo por query_params)
   - Agregado ejemplo de patrón correcto (filtrar multi-tenant PRIMERO)
   - Nuevo checklist de validación para ViewSets

4. **copilot-instructions.md**: Agregada sección "Archivos a Limpiar del Backend":
   - Lista explícita de archivos residuales conocidos
   - Regla: notebooks en `jupyter_notebooks/`, no en raíz

### Violaciones Detectadas (Pendientes de Refactor)

**Backend (Alta Prioridad - Seguridad):**
- ~40% de ViewSets sin filtrado multi-tenant correcto
- 3 `@action url_path` con snake_case en lugar de kebab-case
- ~30% de respuestas de error usan `error` en lugar de `detail`

**Frontend (Media Prioridad):**
- 40+ usos de `any` en catch blocks de thunks

**Limpieza (Baja Prioridad):**
- 8+ archivos temporales en `backend/` (notebooks, xlsx, pdfs)

### Próximos Pasos
1. Crear `utils/errorHandlers.ts` en frontend
2. Refactorizar thunks para usar `getErrorMessage()`
3. Auditar y corregir ViewSets sin filtrado multi-tenant
4. Limpiar archivos residuales del backend

---

## 2026-01-05 — BLOQUE 6: Mejoras Sistema de Rendiciones

**Rama:** `feature/mejoras-rendiciones`  
**Status:** 🟢 FASES 1-4 y 6 COMPLETADAS | 🔴 FASE 5 PENDIENTE (PDF)

### Resumen
Rediseño del sistema de rendiciones: separar gastos reembolsables (técnico) vs facturables (cliente), limpiar categorías, política de viáticos por cliente, automatización OT → Rendición.

### Cambios Principales

**FASE 1 - Limpieza de Categorías:**
- Eliminadas 16 categorías (8 materiales + 8 duplicados) → quedan 18 operativas
- Categorías de materiales movidas conceptualmente a sistema Compras
- Sin breaking changes (categorías eliminadas no tenían gastos asociados)

**FASE 2 - Modelo y Política:**
- Empresa: +campo `politica_viaticos_default` ('I' Incluidos / 'F' Facturables)
- Rendicion: +FK `cliente`, +campo `politica_viaticos` (override opcional)
- 4 nuevas propiedades calculadas:
  - `total_reembolso_tecnico`: todo lo gastado
  - `total_facturable_cliente`: según política
  - `total_no_facturable`: diferencia
  - `politica_viaticos_efectiva`: heredada o override
- Migraciones aplicadas sin breaking changes

**FASE 3 - Serializers y Backend:**
- RendicionSerializer expone 5 nuevos campos (totales + política)
- perform_create() auto-hereda política desde cliente
- Backward compatible: campo `total` preservado como legacy

**FASE 4 - Frontend:**
- DetalleRendicion: Card "Totales y Política" con 3 totales + badge visual
- TypeScript: IRendicion +7 campos nuevos
- Grid responsive, descripciones contextuales
- Sin breaking changes en listados

**FASE 6 - Automatización:**
- Rendicion +campo OneToOne `orden_trabajo` → OrdenDeTrabajo
- OT completada → crea automáticamente Rendición con todos sus gastos
- Estado inicial: "En Espera de Aprobación"
- Idempotente, atómica (transaction.atomic), fallbacks seguros

### Archivos Modificados
- `backend/`: empresas/models, rendiciones/models+serializers+migrations, ordentrabajov2/views
- `frontend/`: rendicion.interface.ts, DetalleRendicion.tsx
- Scripts: 3 scripts de verificación en `dev/scripts/`

### Pendiente
- 🔴 FASE 5: Actualizar plantilla PDF para mostrar 3 totales + badge política

**Análisis detallado:** Ver [analisis.md#BLOQUE-6](analisis.md)

---

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
