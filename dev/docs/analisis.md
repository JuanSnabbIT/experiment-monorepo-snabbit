# Análisis – Monorepo ERP

Fecha: 2025-12-31  
Propósito: Decisiones técnicas, hallazgos de bloques y resolución de vulnerabilidades (análisis activos e histórico de implementación).

## Uso y mantenimiento
- Registrar análisis técnicos: decisiones arquitectónicas, hallazgos críticos, resoluciones de seguridad.
- Mantener histórico de BLOQUEs implementados como referencia técnica.
- Al cerrar análisis en curso, documentar resultado final aquí.
- No duplicar información que ya esté en changelog (timestamps) o planificación (roadmap).

---

## Decisiones Técnicas Críticas

### Data-Leak Prevention (BLOQUE 2) – 2025-12-31 ✅ IMPLEMENTADO

**Vulnerabilidad Identificada:** 3 ViewSets retornaban `.all()` sin filtrar por empresa/sucursal

**Contexto:**
- `VoucherDevolucionViewSet`: Exposición completa de vouchers de devolución
- `ItemEnCompraViewSet`: Exposición completa de items de compra
- `ItemsGuiaSalidaViewSet`: Exposición completa de items de guías de salida

**Impacto:** Cross-company data leak – Usuarios podían acceder a datos de otras empresas/sucursales (vulnerabilidad ALTA)

**Solución Implementada:**
- Agregado filtro PersonalizacionUsuario en `get_queryset()` de cada ViewSet
- `VoucherDevolucion`: Filtra por `orden_trabajo__sucursal` + `empresa`
- `ItemEnCompra`: Filtra por `compra__sucursal`
- `ItemsGuiaSalida`: Filtra por `guia__bodega__sucursal` + `empresa`

**Cumplimiento de Estándares:** Alineado con regla backend: "SIEMPRE filtrar `get_queryset()` por PersonalizacionUsuario"

**Validación:** Commit `fabe48a` - Tests de sintaxis sin errores; requiere test unitario en producción

---

### Modal Backdrop Click Bug (BLOQUE 3) – 2025-12-31 ✅ IMPLEMENTADO

**Problema Identificado:** Modal cerraba al clickear en scrollbars
- `useEventListener('mousedown')` capturaba eventos de scrollbar
- Afectaba UX negativamente (cierre no deseado)

**Análisis:** Event propagation en listeners globales no diferenciaba backdrop vs scrollbar

**Solución Implementada:**
- Reemplazados listeners globales por handlers directos: `handleModalClick` y `handleStaticBackdropClick`
- Lógica: `event.target === event.currentTarget` (solo cierra si se clickea exactamente en el backdrop)
- Mejor performance: Eliminados listeners globales

**Impacto:** Sin breaking changes; solo corrección de UX

**Validación:** Commit `a94d9f7` - Manual testing requerido (no puede automatizarse completamente)

---

## Hallazgos de BLOQUEs Implementados

### BLOQUE 1: Cotizaciones Backend ✅

**Estado:** Validado existente en recovery
- Campo `porcentaje_recargo` en modelo `Cotizacion` (PositiveIntegerField, default=0)
- Histórico con `simple_history`
- 6 propiedades en `ItemCotizacion` actualizadas para usar `porcentaje_recargo or 0`

**Validación:** Tests de cotizaciones pasan sin errores

---

### BLOQUE 2: Bodegas + Compras ✅

**Estado:** 3 data-leak fixes + sistema completo de compras/devoluciones
- `VoucherDevolucion` + `MovimientoEnVoucher` modelos
- `Compra` + `ItemEnCompra` con estados borrador/completada
- Endpoints list/detalle/PDF/HTML

**Validaciones Realizadas:**
- Sintaxis Python: ✅ Sin errores
- Filtros PersonalizacionUsuario: ✅ Implementados
- Seguridad: ✅ Data-leak fixes aplicados

---

### BLOQUE 3: Órdenes Compra Frontend ✅

**Estado:** 3 refactores de UX
- Modal backdrop click: ✅ Corregido
- Aside flex layout: ✅ Mejorado (flex-1, overflow-y-auto)
- priceFormat CLP: ✅ Localizado es-CL sin decimales

**Validaciones Realizadas:**
- TypeScript compilation: ✅ Build success
- Linting: ✅ Sin warnings
- Manual testing (backdrop + layout + formato): Requerido

---

### BLOQUE 4: Guías de Salida ✅

**Estado:** Sistema completo con 3 data-leak filters (igual patrón que BLOQUE 2)
- `GuiaSalida` CRUD backend/frontend
- Filtros PersonalizacionUsuario: ✅ Implementados
- Endpoints: list/detalle/PDF/HTML

**Decisión:** Mismo patrón de seguridad que BLOQUE 2 → No requiere análisis adicional

---

### BLOQUE 5: Órdenes Trabajo V2 ✅

**Estado:** Sistema completo con refactores frontend
- `ordentrabajov2` app activada (reemplaza `ordentrabajo`)
- `ServicioEnOT` para servicios generales
- Refactores identificados en recovery:
  - `renderBadgeValue` helper (DetalleItemEmpresa)
  - `ModalEliminar` → `confirmAlert` pattern (SweetAlert2)
  - Imports consolidados

**Nota:** `renderBadgeValue` y `confirmAlert` ya existen en main (no requiere migración adicional)

**Decisión Technical Debt:** Refactores cosméticos deferred a próximo sprint (media prioridad)

---

## Análisis Activos

### Reemplazo OT V2 (2025-12-31)

**Estado:** En curso – Validación final requerida

**Completado:**
- App `ordentrabajov2` activada; `ordentrabajo` desactivada
- Djoser configurado: `SEND_ACTIVATION_EMAIL = False`
- Rutas frontend alineadas: `/cambio-contra/:uid/:token`
- Celery beat: Task de contratos → `contratos.tareas_2do_plano.actualizar_contratos_vencidos`
- Retroalimentacion apuntando a `ordentrabajov2` (modelos, utils, tasks)
- `manage.py check`: Sin errores

**Pendiente:**
- Revisar migraciones generadas (`bodegas`, `rendiciones`, `ordentrabajov2`)
- Ejecutar `migrate` en dev y validar
- Ajuste adicional en `retroalimentacion` para lógica V2 (si aplica)

**Riesgos:**
- Cambios en migraciones de `retroalimentacion` pueden requerir recrear BD en entornos con `0001_initial` preexistente

---

## Patrón Técnico: PersonalizacionUsuario Filtering

**Aplicado en BLOQUEs 2 y 4** – Prevención de data-leaks

```python
# Patrón estándar
def get_queryset(self):
    sucursal = self.request.user.personalizacionusuario.sucursal
    empresa = sucursal.empresa
    return super().get_queryset().filter(
        modelo__sucursal=sucursal,
        modelo__sucursal__empresa=empresa
    )
```

**Regla Aplicada:** Estándar del proyecto "SIEMPRE filtrar get_queryset() por PersonalizacionUsuario → empresa/sucursal"

**Cumplimiento:** 100% en BLOQUEs 2 y 4; revisión en otros módulos pendiente
