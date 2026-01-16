---
Responsable: -
Email: -
Proxima_revision: -
Estado: canonical
---

# Planificación – Monorepo ERP

**Propósito único:** Roadmap vivo de épicas activas, próximos pasos e iniciativas planificadas.

**Qué va aquí:**
- Épicas activas con estado, fases y prioridad
- Próximas iniciativas (roadmap 2026)
- Dependencias entre épicas
- Technical debt con impacto estimado
- Métricas de entrega (commits, archivos, builds)

**Qué NO va aquí:**
- ❌ Trabajo ya completado → referencia a `changelog.md`
- ❌ Análisis detallado de problemas → usa `analisis.md`
- ❌ Notas operativas diarias → usa `notas.md`
- ❌ **No crear archivos nuevos para documentar épicas** → usa secciones aquí

- **Mantenimiento:**
- Actualizar estado de épicas cada semana
- Mover épicas completadas a `changelog.md`
- Mantener máximo 3-4 épicas activas simultáneamente
- Enlazar a análisis detallados en `analisis.md` cuando sea necesario

---

## Estructura por Módulos

- Organizar épicas y tareas por módulo: `ordentrabajov2`, `bodegas`, `rendiciones`, `cotizaciones`, `items`, `frontend`, `infra`.
- Para cada módulo listar: épicas activas, responsables (placeholder), dependencias, status y enlaces a `analisis.md`.

## Estado General

**BLOQUEs 1-5 (2025-12-31):** ✅ COMPLETADOS E IMPLEMENTADOS EN MAIN

- BLOQUE 1: Cotizaciones backend (`porcentaje_recargo`)
- BLOQUE 2: Bodegas + Compras + 3 data-leak fixes (CRÍTICO)
- BLOQUE 3: Órdenes Compra + UX improvements (Modal, Aside, priceFormat)
- BLOQUE 4: Guías Salida + filters
- BLOQUE 5: Órdenes Trabajo V2 + refactores frontend

---

## Épicas Activas (Roadmap 2026)

## Módulo: ordentrabajov2
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

## Épicas Completadas (Resumen — Ver [changelog.md](changelog.md))

- **BLOQUE 1:** Recargo a nivel cotización (porcentaje_recargo en Cotizacion)
- **BLOQUE 2:** Data-leak fixes (3 ViewSets) + Bodegas/Compras CRUD
- **BLOQUE 3:** UX improvements (Modal backdrop, Aside, priceFormat CLP)
- **BLOQUE 4:** Órdenes Compra + Guías Salida con filtros seguridad
- **BLOQUE 5:** Órdenes Trabajo V2 + refactores frontend (115 archivos)
- **BLOQUE 6:** Sistema de rendiciones rediseñado (política viáticos, automatización OT → Rendición)

---

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
- Consolidar `renderBadgeValue` como utility (si se usa en múltiples vistas)
- Revisar imagen deletion en `DetalleItemEmpresa` (¿usar `confirmAlert`?)
- Auditar todas las eliminaciones para confirmación consistente

**Estado:** DEFER ⏭️ | **Impacto:** Bajo | **Tiempo:** 2-4 horas

---

## Próximas Iniciativas (2026)

## Módulo: rendiciones
### A. BLOQUE 6: Mejoras Sistema de Rendiciones
**Estado:** 🟢 FASES 1-4 Y 6 COMPLETADAS | 🔴 FASE 5 PENDIENTE (PDF)  
**Pendiente:** Actualizar plantilla PDF para mostrar 3 totales + badges de política  
**Detalles:** Ver [analisis.md#BLOQUE-6](analisis.md) y [changelog.md#2026-01-05](changelog.md)

## Módulo: facturacion
### B. Sistema de Facturación Manual (Próximo)
**Objetivo:** Panel selección OTs → Contraste pactado vs ejecutado → Generación factura  
**Referencia:** Ver [analisis.md](analisis.md) (sección "Matching Manual para Facturación")  
**Timeline:** 1-2 semanas (MVP)

### C. Automatización Celery Tasks
**Objetivo:** Tareas automáticas (expiración cotizaciones, recordatorios OT, etc.)

---

## Mantenimiento del Archivo

- Mantener este archivo como fuente única de planes vigentes
- Al cerrar una iniciativa, mover el resultado a `changelog.md`
- No añadir análisis aquí: esos van en `analisis.md`
- No detallar procedimientos operativos: esos van en `flujos_operativos.md`

---

## Métricas de Entrega (BLOQUEs 1-5)
```
Commits:               50+
Archivos modificados:  115
Build frontend:       Success ✅
```

---
