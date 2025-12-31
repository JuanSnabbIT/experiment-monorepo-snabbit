# Planificación – Monorepo ERP

Fecha: 2025-12-31  
Propósito: Roadmap vivo de épicas activas y próximos pasos post-BLOQUE 5.

---

## Estado General

**BLOQUEs 1-5 (2025-12-31):** ✅ COMPLETADOS E IMPLEMENTADOS EN MAIN

- BLOQUE 1: Cotizaciones backend (`porcentaje_recargo`)
- BLOQUE 2: Bodegas + Compras + 3 data-leak fixes (CRÍTICO)
- BLOQUE 3: Órdenes Compra + UX improvements (Modal, Aside, priceFormat)
- BLOQUE 4: Guías Salida + filters
- BLOQUE 5: Órdenes Trabajo V2 + refactores frontend

---

## Épicas Activas (Roadmap 2026)

### 1. Integración Items ↔ Servicios Generales (OT V2)

**Objetivo:** Vincular `ServicioEnOT` con Guía de Salida para reutilizar lógica de bodegas

**Pasos propuestos:**
- Agregar FK/OneToOne a `GuiaSalida` en `ServicioEnOT`
- Crear flujos de creación/edición de servicios con guías asociadas
- Endpoints para gestionar insumos (reserva, ingreso, devolución)
- Trazabilidad de stock a nivel servicio

**Estado:** En diseño  
**Impacto:** Permite entregas parciales/múltiples guías por OT (mejora de Caso 2)  
**Dependencias:** BLOQUEs 4-5 completados

---

### 2. Historia 1.2 — Recargo a Nivel de Cotización (Completado)

**Objetivo:** Mover `porcentaje_recargo` de items a la cotización; copiar desde cliente al crear

**Implementación (BLOQUE 1):**
- ✅ Campo `porcentaje_recargo` en modelo `Cotizacion` (PositiveIntegerField, default=0)
- ✅ Recargo editable por cotización, no por item
- ✅ UI muestra recargo de cotización
- ✅ 6 propiedades en `ItemCotizacion` actualizadas

**Estado:** ✅ COMPLETADA

---

### 3. Seguridad Data-Leak Prevention (Completado)

**Objetivo:** Prevenir cross-company/sucursal data exposure

**Implementación (BLOQUE 2):**
- ✅ 3 data-leak fixes en `bodegas/views.py`
  - `VoucherDevolucionViewSet`: Filter by empresa/sucursal
  - `ItemEnCompraViewSet`: Filter by sucursal
  - `ItemsGuiaSalidaViewSet`: Filter by empresa/sucursal
- ✅ Cumple estándar: "SIEMPRE filtrar get_queryset() por PersonalizacionUsuario"
- ✅ Commit `fabe48a` (security-critical)

**Estado:** ✅ COMPLETADA Y VALIDADA

---

### 4. UX Improvements (Completado)

**Objetivo:** Corregir bugs y mejorar experiencia de usuario

**Implementación (BLOQUE 3):**
- ✅ Modal backdrop click bug (event.target === event.currentTarget)
- ✅ Aside flex layout improvement (flex-1, overflow-y-auto)
- ✅ priceFormat CLP localization (es-CL, sin decimales)
- ✅ Commit `a94d9f7`

**Estado:** ✅ COMPLETADA

---

### 5. Órdenes de Compra + Guías de Salida (Completado)

**Objetivo:** Flujo completo desde OC a entrega

**Implementación (BLOQUEs 3-4):**
- ✅ `OrdenCompra` CRUD (estados -/0/1/2/3/4/5)
- ✅ `GuiaSalida` CRUD con reserva de stock
- ✅ Integración con OT (creación automática 1:1, propuesto: múltiples)
- ✅ Endpoints: list/detalle/PDF/HTML
- ✅ 3 data-leak filters (BLOQUE 4)

**Estado:** ✅ COMPLETADA

---

### 6. Órdenes Trabajo V2 (Completado)

**Objetivo:** Reemplazo completo de OT V1 con servicios generales

**Implementación (BLOQUE 5):**
- ✅ App `ordentrabajov2` activada (reemplaza `ordentrabajo`)
- ✅ `ServicioEnOT` para servicios generales
- ✅ Frontend refactores: `renderBadgeValue`, `ModalEliminar` → `confirmAlert`
- ✅ Imports consolidados
- ✅ 115 archivos modificados, 22,838 insertions

**Estado:** ✅ COMPLETADA

---

## Technical Debt (Próximo Sprint - Media Prioridad)

### Refactores Cosméticos BLOQUE 5

**Items:**
- Consolidar `renderBadgeValue` como utility (si se usa en múltiples vistas)
- Revisar imagen deletion en `DetalleItemEmpresa` (¿usar `confirmAlert`?)
- Auditar todas las eliminaciones para confirmación consistente

**Estado:** DEFER ⏭️  
**Impacto:** Bajo (no afecta funcionalidad)  
**Tiempo estimado:** 2-4 horas

---

## Próximas Iniciativas (2026)

### A. Integración Items ↔ GuiaSalida (Épica 1)
**Prioridad:** ALTA  
**Timeline:** Q1 2026  
**Bloqueantes:** Ninguno (BLOQUEs 1-5 completos)

### B. Reportería y Analytics
**Objetivo:** Dashboard de vendido, costos, márgenes por cotización/OC/OT  
**Prioridad:** MEDIA  
**Timeline:** Q2 2026

### C. API v2 + Mobile App Support
**Objetivo:** Endpoints de lectura/escritura optimizados para mobile  
**Prioridad:** BAJA  
**Timeline:** Q3 2026

### D. Automatización Celery Tasks
**Objetivo:** Tareas automáticas (expiración cotizaciones, recordatorios OT, etc.)  
**Prioridad:** MEDIA  
**Timeline:** Q2 2026

---

## Reglas de Mantenimiento

- Mantener este archivo como fuente única de planes vigentes
- Al cerrar una iniciativa, mover el resultado a `changelog.md` (como se hizo con BLOQUEs 1-5)
- No añadir análisis aquí: esos van en `analisis.md`
- No detallar procedimientos operativos: esos van en `flujos_operativos.md`

---

## Métricas de Entrega (BLOQUEs 1-5)

```
Commits:               50+
Archivos modificados:  115
Insertions:           22,838
Deletions:             6,215
Vulnerabilidades:         3 (data-leaks, todas corregidas)
Tests:                Todos pasando ✅
Build frontend:       Success ✅
Documentation:        Consolidada en 5 archivos vivos
```
