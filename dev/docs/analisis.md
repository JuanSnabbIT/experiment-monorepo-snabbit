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
---

## BLOQUE 6: Análisis de Rendiciones (En Progreso) – 2026-01-05

**Estado:** 🟢 FASES 1-3 COMPLETADAS | 🔵 FASE 4 EN CURSO

### Aclaraciones de Alcance (2026-01-05)

**⚠️ TERMINOLOGÍA CRÍTICA:**
- **"Rendición"** (módulo `rendiciones`): Documento administrativo que consolida todos los gastos de una o más OTs para reembolso y facturación
- **"Gastos en OT"** (modelo `RendicionEnOt` en `ordentrabajov2`): Gastos operativos registrados durante la ejecución de una OT específica
- **Confusión anterior:** Se usaba "rendición" en ambos contextos → ahora usamos "Gastos" en OT para distinguir

**FLUJO CORRECTO:**
1. Técnico ejecuta OT → registra **Gastos** (`RendicionEnOt`) y hace **Compras** durante el trabajo
2. OT pasa a estado "Completada" → **Sistema crea automáticamente Rendición** con todos los gastos y compras
3. Administración revisa **Rendición** → Aprueba/Rechaza → Procesa reembolso y facturación

**ARQUITECTURA ACTUAL (verificada 2026-01-05):**
- ✅ Modelo `RendicionEnOt` existe en `ordentrabajov2` (gastos operativos de la OT)
- ✅ Modelo `Compra` existe en `bodegas` (materiales/servicios facturables)
- ✅ Modelo `Rendicion` existe en `rendiciones` (documento consolidado)
- ✅ `ItemRendicion` usa GenericForeignKey para referenciar `RendicionEnOt`, `DetalleGastoRendicion`, `Compra`
- ❌ **NO existe creación automática** de Rendición al completar OT (FASE 6 pendiente)
- ❌ **NO existe FK** `Rendicion.orden_trabajo` (FASE 6 pendiente)
- ✅ Existe hook `_sincronizar_relaciones_completada()` en OT (actualiza Compras, no crea Rendición)

### Problema Identificado (Estado Actual)

**Situación Actual:**
- ❌ Sistema completamente manual: Usuario crea Rendición vacía, agrega gastos uno a uno
- ❌ Sin relación OT ↔ Rendición: No hay FK entre modelos, imposible saber si OT está rendida
- ✅ **RESUELTO (FASE 1):** Categorías limpiadas, solo operativas (18 categorías, materiales eliminados)
- ✅ **RESUELTO (FASE 2):** Política de viáticos implementada (reembolsable vs facturable)
- ❌ PDF incompleto: Solo muestra `DetalleGastoRendicion`, omite `RendicionEnOt` y `Compra` (FASE 5)
- ❌ Sin validación: Técnicamente se puede rendir 2+ veces el mismo gasto (FASE 6)
- ❌ Sin automatización: No se crea Rendición al completar OT (FASE 6)

### Conceptos Profesionales Aclarados

**Rendición de Gastos:** Documento que consolida TODOS los gastos de una OT, separados por propósito:

1. **Gastos Operativos (reembolsables al técnico):**
   - Pagador inicial: Técnico (de su bolsillo)
   - Pagador final: Depende de **política de viáticos**:
     - 'I' (Incluidos): Empresa asume, NO facturable
     - 'F' (Facturables): Se cobran al cliente
   - Ejemplos: Taxi, comida, hospedaje, peajes, llamadas
   - Modelos: `RendicionEnOt`, `DetalleGastoRendicion`

2. **Compras (SIEMPRE facturables al cliente):**
   - Dinero de empresa / técnico con fondo
   - Se cobran en factura al cliente
   - Incluyen: Materiales inesperados, consumibles
   - Modelo: `Compra` (siempre facturable, independiente de política)

**Política de Viáticos:** Define si gastos operativos se reembolsan internamente o se facturan al cliente
- `'I'` (Incluidos): Empresa asume gastos operativos (no se cobran)
- `'F'` (Facturables): Cliente paga gastos operativos (se cobran en factura)

### Solución Propuesta

**Arquitectura:**

```
Empresa (Cliente):
  └─ politica_viaticos_default: 'I' | 'F'
       ↓ (heredado a todas sus OTs/Rendiciones)

Rendición:
  ├─ cliente: FK a Empresa
  ├─ politica_viaticos: NULLABLE (override si es excepción)
  └─ politica_viaticos_efectiva: Propiedad (usa override o heredado)
       ↓
  total_reembolso_tecnico = SUMA(todos los gastos, siempre)
  total_facturable_cliente = SUMA(gastos operativos SI politica='F' + SIEMPRE Compras)
  total_no_facturable = total_reembolso - total_facturable
```

**Categorías:**
- ✅ SOLO operativos: Transporte, Alimentación, Hospedaje, Comunicaciones, Peajes, Servicios Admin
- ❌ ELIMINAR materiales: Esos van a `Compra`

**Cambios en Modelos:**
1. `Empresa.politica_viaticos_default`: CharField choices ('I'/'F'), default='I'
2. `Rendicion.cliente`: FK nullable (null=True, blank=True)
3. `Rendicion.politica_viaticos`: CharField choices nullable (null=True, blank=True)
4. `Rendicion` propiedades: `total_reembolso_tecnico`, `total_facturable_cliente`, `total_no_facturable`

**Flujos Modificados:**
1. Creación Rendición: Usuario selecciona cliente → hereda política automáticamente
2. Edición: Puede override política (solo si Borrador)
3. PDF: Separa gastos operativos vs materiales, muestra 3 totales
4. Serializers: Retornan política efectiva y 3 totales

**Validaciones Necesarias:**
- Política debe ser válida al guardar ('I' o 'F')
- Si cliente vacío, usar default 'I'
- Impedir cambio de cliente si Rendición ya tiene aprobaciones

**Opcional - Automatización (Fase 6):**
- Cuando OT pasa a "completada": Crear automáticamente Rendición con todos los gastos
- Estado inicial: "En Aprobación" (no Borrador)
- FK `Rendicion.orden_trabajo`: OneToOneField
- Validación: Una sola Rendición por OT

### Decisión de Implementación

**Opción elegida:** C (Híbrido - Cliente + Override en Rendición)
- Rationale: Balance entre simplicidad (cliente default) y flexibilidad (override por rendición)
- Previene error humano (olvido de marcar política)
- Permite excepciones (mismo cliente, política diferente por proyecto)

### Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|-----------|
| Data migration: Rendiciones existentes sin cliente | ALTO | Script post-migración: asignar cliente de usuario.sucursal.empresa |
| Limpieza de categorías: Referencias huérfanas | MEDIO | Revisar si CategoriaGastoRendicion se usa en otros modelos |
| Cambio en lógica de facturación: Facturas cliente | ALTO | Validar con negocio antes de implementar; documental cambio |
| Compras duplicadas en rendición | BAJO | Validación frontend: mostrar gasto ya rendido como "no disponible" |

### Documentación del Cambio (Antes/Después)

Será actualizada en `changelog.md` al completar cada fase:
- Qué se eliminó/agregó en modelos
- Cambios en serializers
- Cambios en cálculos
- Cambios en UX/PDF
- Impacto en facturas (si aplica)

---