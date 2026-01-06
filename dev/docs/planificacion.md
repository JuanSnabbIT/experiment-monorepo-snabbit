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

### BLOQUE 6: Mejoras Sistema de Rendiciones (En Planificación)

**Objetivo:** Rediseñar rendiciones para separar gastos reembolsables vs facturables, automatizar creación, y mejorar trazabilidad OT ↔ Rendición.

**Contexto:**
- Actualmente: Sistema de rendiciones es MANUAL (usuario crea rendición vacía y agrega gastos)
- Problema: No hay relación OT → Rendición, no hay automación, categorías mezclan conceptos
- Solución propuesta: Política de viáticos por cliente, automática al completar OT

**Estado:** En diseño arquitectónico

**Fases planificadas:**

#### Fase 1: Limpieza de Categorías ✅ COMPLETADA (2026-01-05)
- **Qué:** Eliminar categorías de materiales de `CategoriaGastoRendicion` (deben ser Compras)
- **Resultados:**
  - ✅ 8 categorías de materiales eliminadas (Cables, Herramientas, Material Eléctrico, etc.)
  - ✅ 8 duplicados consolidados (sin tildes → con tildes correctas)
  - ✅ 18 categorías operativas finales (Transporte, Alimentación, Hospedaje, etc.)
  - ✅ 0 referencias huérfanas (ninguna categoría tenía gastos asociados)
- **Archivos afectados:** Base de datos (16 categorías eliminadas)
- **Scripts creados:**
  - `dev/scripts/fase1_verificar_categorias.py`
- **Estado:** ✅ COMPLETADA

#### Fase 2: Modelo - Agregar Política de Viáticos (SEMANA 1-2)
  - `Empresa`: Agregar `politica_viaticos_default` ('I'=Incluidos / 'F'=Facturables)
  - `Rendicion`: Agregar FK a `cliente` + `politica_viaticos` (override nullable)
  - `Rendicion`: Propiedades calculadas: `total_reembolso_tecnico`, `total_facturable_cliente`, `total_no_facturable`
- **Estado:** NO INICIADO

#### Fase 3: Serializers y Lógica Backend (SEMANA 2)
- **Qué:** Actualizar serializers y vistas para soportar nuevos campos y cálculos
- **Cambios:**
  - `RendicionSerializer`: Agregar campos nuevos y propiedades calculadas

#### Fase 4: Frontend - Creación y Edición (SEMANA 2-3)
- **Qué:** Permitir al usuario seleccionar cliente (hereda política) y opcionalmente hacer override
  - `CrearRendicion.tsx`: Agregar campo Cliente (selector)
  - `DetalleRendicion.tsx`: Mostrar 3 totales separados (reembolso, facturable, no facturable)
  - Mostrar política efectiva (heredada o override)
  - Permitir edición de política_viaticos (solo si rendición en estado Borrador)
- **Estado:** NO INICIADO

  - Mostrar los 3 totales en resumen final
- **Estado:** NO INICIADO

- **Qué:** Cuando OT pasa a `completada`, crear automáticamente Rendición con todos los gastos
- **Cambios:**
  - Signal o método en `OrdenDeTrabajoViewSet.cambiar_estado()`: Crear Rendición automáticamente
  - Agregar FK `Rendicion.orden_trabajo` (OneToOneField)
  - Estado rendición inicial: 'En Aprobación' (no Borrador)
- **Validaciones:** 

**⚠️ ACLARACIÓN DE ALCANCE (2026-01-05):**
- **Objetivo Final:** Sistema automático que crea Rendiciones al completar OTs con Gastos/Compras
- **Terminología:** "Gastos en OT" (`RendicionEnOt`) ≠ "Rendición" (documento consolidado del módulo `rendiciones`)

**Fases:**

### ✅ FASE 1: Limpieza de Categorías (COMPLETADA 2026-01-05)
- Eliminar categorías de materiales (8 categorías)
- Dejar solo categorías operativas (18 categorías finales)
- Scripts: `fase1_verificar_categorias.py`, `fase1_limpiar_categorias.py`
- `Empresa.politica_viaticos_default`: campo con choices 'I'/'F'
- `Rendicion.cliente`: FK a Empresa
- `Rendicion.politica_viaticos`: override opcional
- Migraciones: `empresas/0002`, `rendiciones/0003`

- Agregar campos: `cliente`, `politica_viaticos`, `politica_viaticos_efectiva`
- Agregar campos calculados: `total_reembolso_tecnico`, `total_facturable_cliente`, `total_no_facturable`
- Modificar `RendicionViewSet.perform_create()` para auto-heredar política del cliente

### 🔵 FASE 4: Frontend (EN CURSO)
- Modificar `DetalleRendicion.tsx`: mostrar 3 totales + badge de política efectiva
- Modificar listados: exponer política/totales en tablas admin
- **NO crear modal CrearRendicion**: Rendiciones se crean automáticamente (FASE 6)
- Estado: EN INICIO
- Mostrar los 3 totales en PDF
- Agregar nota explicativa de política
- Estado: PENDIENTE

### 🔴 FASE 6: Automatización (CRÍTICA - NO OPCIONAL)
**⚠️ PRIORIDAD ALTA - Define flujo profesional correcto**
- Cliente auto-asignado desde `OT.cotizacion.cliente`
- Estado: **PENDIENTE (siguiente prioridad después FASE 4)**
**Dependencias:** Ninguna (BLOQUEs 1-5 completos)  
**Impacto:** CRÍTICO (define flujo operativo completo OT → Rendición automática)  
**Prioridad:** ALTA  
**Timeline:** Q1 2026  
**Timeline:** Q2 2026


### D. Automatización Celery Tasks
**Objetivo:** Tareas automáticas (expiración cotizaciones, recordatorios OT, etc.)  

- Mantener este archivo como fuente única de planes vigentes
- Al cerrar una iniciativa, mover el resultado a `changelog.md` (como se hizo con BLOQUEs 1-5)
- No añadir análisis aquí: esos van en `analisis.md`
- No detallar procedimientos operativos: esos van en `flujos_operativos.md`

---

## Métricas de Entrega (BLOQUEs 1-5)
```
Commits:               50+
Archivos modificados:  115
Build frontend:       Success ✅
```
