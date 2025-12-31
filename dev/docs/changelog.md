# Changelog Estratégico – Monorepo ERP

Uso: Registrar cambios de estado relevantes del sistema (implementaciones completadas, entregas de bloques, releases). Actualizar al cerrar features o despliegues.

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
