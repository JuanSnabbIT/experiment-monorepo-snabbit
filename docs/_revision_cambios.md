# Revisión de Cambios Pendientes – Monorepo ERP

**Documento de trabajo temporal** para coordinar la auditoría de cambios no commiteados.  
**Ciclo de vida:** Este archivo se elimina cuando todos los cambios estén auditados y commiteados.

---

## Objetivo

1. Revisar sistemáticamente todos los cambios no commiteados.
2. Verificar consistencia arquitectónica (patrones, convenciones, estructura).
3. Limpiar código y residuos.
4. Commitear por bloques lógicos y ordenados.
5. Registrar cada bloque cerrado en `docs/changelog.md`.

---

## Estado General

|           Métrica         |   Valor   |
|---------------------------|------------|
| Fecha inicio revisión     | 2025-12-30 |
| Total archivos cambiados  | 162        |
| Líneas añadidas           | +34,620    |
| Líneas eliminadas         | -10,746    |
| Bloques principales       | 5          |
| Bloques completados       | 0/5        |

---

## Estructura de Bloques

Los cambios se organizan por **módulo funcional principal**. Cada bloque puede tener sub-bloques si es extenso.

| Bloque | Módulo | Complejidad | Estado |
|--------|--------|-------------|--------|
| 1 | Cotizaciones | 🟡 Media | 🔴 Pendiente |
| 2 | Compras | 🟡 Media | 🔴 Pendiente |
| 3 | Órdenes de Compra | 🟢 Baja | 🔴 Pendiente |
| 4 | Guías de Salida | 🟡 Media | 🔴 Pendiente |
| 5 | Órdenes de Trabajo | 🔴 Alta | 🔴 Pendiente |

---

# BLOQUE 1: COTIZACIONES

**Estado:** 🔴 Pendiente  
**Complejidad:** 🟡 Media

## Archivos Backend
| Archivo | Cambio | Líneas |
|---------|--------|--------|
| `backend/cotizaciones/models.py` | Modificado | +269 |
| `backend/cotizaciones/serializers.py` | Modificado | +16 |
| `backend/cotizaciones/views.py` | Modificado | +375 |
| `backend/cotizaciones/functions.py` | Modificado | +36 |

## Archivos Frontend
| Archivo | Cambio | Líneas |
|---------|--------|--------|
| `frontend/src/pages/Cotizaciones/CotizacionesEmpresa.tsx` | Modificado | +112 |
| `frontend/src/pages/Cotizaciones/components/DetalleCotizacion.tsx` | Modificado | +1907 |
| `frontend/src/pages/Cotizaciones/components/TablaImpuestos.tsx` | Modificado | +130 |
| `frontend/src/pages/Cotizaciones/components/TablaItemsTecnico.tsx` | Modificado | +70 |
| `frontend/src/pages/Cotizaciones/components/TablaVenta.tsx` | Modificado | +331 |
| `frontend/src/pages/Cotizaciones/modals/AprobarCotizacion.tsx` | Modificado | +381 |
| `frontend/src/pages/Cotizaciones/modals/CrearCotizacion.tsx` | Modificado | +27 |
| `frontend/src/pages/Cotizaciones/modals/CrearItemCotizacion.tsx` | Modificado | +78 |
| `frontend/src/pages/Cotizaciones/modals/CrearOCDeCotizacion.tsx` | Modificado | +169 |
| `frontend/src/pages/Cotizaciones/modals/EnviarCotizacion.tsx` | Modificado | +67 |
| `frontend/src/interface/cotizaciones.interface.ts` | Modificado | +6 |
| `frontend/src/store/slices/cotizaciones/cotizacionSlice.ts` | Modificado | +24 |

## Sub-bloques sugeridos (por feature/flujo funcional)

Cada sub-bloque agrupa cambios relacionados a una **funcionalidad completa** (backend + frontend cuando aplica):

- **1.1: Creación de Cotizaciones**
  - Backend: models.py (campos nuevos), serializers.py
  - Backend: endpoints POST/validación
  - Frontend: `CrearCotizacion.tsx` (+27)
  - **Objetivo:** Formulario de creación con validaciones

  ### Commit aislado (Sub-bloque 1.1)

  - **Branch creado:** `feature/cotizaciones/creacion`
  - **Commit:** `b9d9e4b` — feat(cotizaciones): aislar Creación de Cotizaciones (Sub-bloque 1.1)
  - **Archivos incluidos:**
    - `backend/cotizaciones/models.py`
    - `backend/cotizaciones/serializers.py`
    - `frontend/src/pages/Cotizaciones/modals/CrearCotizacion.tsx`

  _Estado:_ Sub-bloque 1.1 validado y commiteado en branch aislado.

- **1.2: Detalle y Visualización**
  - Backend: endpoints GET detalle con relaciones
  - Frontend: `DetalleCotizacion.tsx` (+1907, mayor cambio)
  - Frontend: `TablaImpuestos.tsx` (+130), `TablaItemsTecnico.tsx` (+70), `TablaVenta.tsx` (+331)
  - **Objetivo:** Vista completa de cotización con tabs/secciones

  ### Commit aislado (Sub-bloque 1.2)

  - **Branch:** `feature/cotizaciones/creacion-main`
  - **Commit:** `c0415a0` — feat(cotizaciones): Sub-bloque 1.2 - Detalle y Visualización
  - **Archivos incluidos:**
    - `frontend/src/pages/Cotizaciones/components/DetalleCotizacion.tsx`
    - `frontend/src/pages/Cotizaciones/components/TablaImpuestos.tsx`
    - `frontend/src/pages/Cotizaciones/components/TablaVenta.tsx`
    - `frontend/src/pages/Cotizaciones/components/TablaItemsTecnico.tsx`
  - **Mejoras aplicadas:**
    - Refactor visualización multi-moneda (CLP/USD/UF)
    - Uso de `formatCurrency` centralizado
    - Simplificación de grids (eliminación de columnas redundantes)
    - Lógica de conversión de moneda coherente

  _Estado:_ Sub-bloque 1.2 validado y commiteado.

- **1.3: Gestión de Items en Cotización**
  - Backend: relación items, cálculos de precios
  - Backend: functions.py (+36, lógica de negocio)
  - Frontend: `CrearItemCotizacion.tsx` (+78)
  - **Objetivo:** Agregar/editar items con cálculos automáticos

- **1.4: Flujo de Aprobación y Envío**
  - Backend: cambios de estado, notificaciones
  - Backend: views.py (+375, endpoints de transición)
  - Frontend: `AprobarCotizacion.tsx` (+381)
  - Frontend: `EnviarCotizacion.tsx` (+67)
  - **Objetivo:** Estados (pendiente → enviada → aceptada/rechazada)

- **1.5: Creación de OC desde Cotización**
  - Backend: lógica de conversión cotización → OC
  - Frontend: `CrearOCDeCotizacion.tsx` (+169)
  - **Objetivo:** Generar Orden de Compra automática

- **1.6: Lista y Filtros**
  - Backend: querys optimizadas, filtros
  - Frontend: `CotizacionesEmpresa.tsx` (+112)
  - Frontend: slice (+24, thunks y paginación)
  - **Objetivo:** Listado con búsqueda y estados

## Checklist
- [ ] Backend: modelos coherentes con migraciones
- [ ] Backend: serializers con validación
- [ ] Backend: views con permisos
- [ ] Frontend: componentes tipados
- [ ] Frontend: slice actualizado
- [ ] Integración: flujo completo funcional

## Notas
_Pendiente de revisión detallada_

---

# BLOQUE 2: COMPRAS

**Estado:** 🔴 Pendiente  
**Complejidad:** 🟡 Media

## Archivos Backend
| Archivo | Cambio | Líneas |
|---------|--------|--------|
| `backend/bodegas/models.py` | Modificado | +274 (compartido con otros módulos) |
| `backend/bodegas/serializers.py` | Modificado | +58 |
| `backend/bodegas/views.py` | Modificado | +1405 (compartido) |
| `backend/bodegas/functions.py` | Modificado | +423 |
| `backend/bodegas/movimientos.py` | Modificado | +120 |
| `backend/bodegas/signals.py` | Modificado | +69 |
| `backend/bodegas/estados_modelo.py` | Modificado | +60 |

## Archivos Frontend
| Archivo | Cambio | Líneas |
|---------|--------|--------|
| `frontend/src/pages/Bodegas/Compra/DetalleCompra.tsx` | Modificado | +985 |
| `frontend/src/pages/Bodegas/Compra/ListaCompra.tsx` | Modificado | +11 |
| `frontend/src/pages/Bodegas/Compra/components/TablaItemsCompra.tsx` | Modificado | +461 |
| `frontend/src/pages/Bodegas/Compra/modals/CrearCompra.tsx` | Modificado | +232 |
| `frontend/src/pages/Bodegas/Compra/modals/CrearItemEnCompra.tsx` | Modificado | +1271 |
| `frontend/src/interface/bodega.interface.ts` | Modificado | +443 |
| `frontend/src/store/slices/bodega/bodegaSlice.ts` | Modificado | +24 |
| `frontend/src/constants/bodegas.constant.ts` | Modificado | +48 |

## Sub-bloques sugeridos (por feature/flujo funcional)

Cada sub-bloque agrupa cambios relacionados a una **funcionalidad completa** (backend + frontend cuando aplica):

- **2.1: Estados y Ciclo de Vida de Compra**
  - Backend: `estados_modelo.py` (+60, estados nuevos)
  - Backend: `models.py` (+274, campo estado y validaciones)
  - Backend: `signals.py` (+69, transiciones automáticas)
  - **Objetivo:** Estados (borrador → completada) y reglas de transición

- **2.2: Movimientos de Stock e Integración con Bodega**
  - Backend: `movimientos.py` (+120, registrar entradas/salidas)
  - Backend: `functions.py` (+423, lógica de stock)
  - Backend: relación con `StockItemEnBodega`
  - **Objetivo:** Actualización automática de inventario al completar compra

- **2.3: Creación de Compras**
  - Backend: serializers.py (+58), validaciones
  - Backend: views.py (+1405, endpoint POST)
  - Frontend: `CrearCompra.tsx` (+232)
  - Frontend: constants (+48)
  - **Objetivo:** Formulario de compra con selección de proveedor y bodega

- **2.4: Gestión de Items en Compra**
  - Backend: modelo `ItemEnCompra`, cálculos
  - Frontend: `CrearItemEnCompra.tsx` (+1271, mayor cambio)
  - Frontend: `TablaItemsCompra.tsx` (+461)
  - **Objetivo:** Agregar/editar items, cantidades, precios

- **2.5: Detalle de Compra**
  - Backend: endpoint GET con items relacionados
  - Frontend: `DetalleCompra.tsx` (+985)
  - Frontend: visualización de estado, items, bodega
  - **Objetivo:** Vista completa de compra con acciones según estado

- **2.6: Lista y Filtros de Compras**
  - Backend: filtros por estado, proveedor, bodega
  - Frontend: `ListaCompra.tsx` (+11)
  - Frontend: slice (+24, paginación)
  - Frontend: interfaces (+443, tipos compartidos con guías/devoluciones)
  - **Objetivo:** Listado con búsqueda y estados

## Checklist
- [ ] Backend: estados de compra correctos
- [ ] Backend: movimientos de stock
- [ ] Frontend: flujo de creación
- [ ] Frontend: detalle funcional
- [ ] Integración: stock actualiza correctamente

## Notas
_Compartido con Guías de Salida y Devoluciones_

---

# BLOQUE 3: ÓRDENES DE COMPRA

**Estado:** 🔴 Pendiente  
**Complejidad:** 🟢 Baja

## Archivos Frontend
| Archivo | Cambio | Líneas |
|---------|--------|--------|
| `frontend/src/pages/Bodegas/OrdenCompra/ListaOrdenesCompraV2.tsx` | Modificado | +140 |
| `frontend/src/pages/Bodegas/OrdenCompra/components/DetalleOrdenCompraV2.tsx` | Modificado | +1287 |
| `frontend/src/pages/Bodegas/OrdenCompra/components/OffCanvasAgregarItemsOrdenCompra.tsx` | Modificado | +51 |
| `frontend/src/pages/Bodegas/OrdenCompra/modals/AceptarORechazarOrdenCompra.tsx` | Modificado | +8 |
| `frontend/src/pages/Bodegas/OrdenCompra/modals/CrearOrdenCompra.tsx` | Modificado | +11 |
| `frontend/src/pages/Bodegas/OrdenCompra/modals/ModalEnviarProveedor.tsx` | Modificado | +7 |
| `frontend/src/pages/Bodegas/OrdenCompra/modals/ModalReenviarAlProveedor.tsx` | Modificado | +5 |
| `frontend/src/pages/Bodegas/OrdenCompra/modals/ModalVolverABorradorOC.tsx` | Modificado | +6 |
| `frontend/src/pages/Bodegas/OrdenCompra/modals/TerminarBorradorOC.tsx` | Modificado | +10 |

## Sub-bloques sugeridos (por feature/flujo funcional)

Cada sub-bloque agrupa cambios relacionados a una **funcionalidad completa** (backend + frontend cuando aplica):

- **3.1: Creación de OC desde Cotización**
  - Backend: endpoint de generación automática (compartido con Cotizaciones)
  - Frontend: `CrearOrdenCompra.tsx` (+11)
  - **Objetivo:** Generar OC a partir de cotización aprobada

- **3.2: Detalle y Gestión de Items**
  - Backend: relación items, actualización de cantidades
  - Frontend: `DetalleOrdenCompraV2.tsx` (+1287, mayor cambio)
  - Frontend: `OffCanvasAgregarItemsOrdenCompra.tsx` (+51)
  - **Objetivo:** Vista detallada con edición de items

- **3.3: Estados y Flujo de Aprobación**
  - Backend: estados (borrador → enviada → aceptada/rechazada)
  - Frontend: `AceptarORechazarOrdenCompra.tsx` (+8)
  - Frontend: `TerminarBorradorOC.tsx` (+10)
  - Frontend: `ModalVolverABorradorOC.tsx` (+6)
  - **Objetivo:** Transiciones de estado con validaciones

- **3.4: Envío a Proveedor**
  - Backend: generación de PDF, envío de email
  - Frontend: `ModalEnviarProveedor.tsx` (+7)
  - Frontend: `ModalReenviarAlProveedor.tsx` (+5)
  - **Objetivo:** Notificar proveedor y tracking

- **3.5: Lista de OC**
  - Backend: filtros por estado, proveedor
  - Frontend: `ListaOrdenesCompraV2.tsx` (+140)
  - **Objetivo:** Listado con estados y acciones rápidas

## Checklist
- [ ] Estados de OC correctos (borrador → enviada → aceptada/rechazada)
- [ ] Integración con Cotizaciones funciona
- [ ] Generación de PDF correcta
- [ ] Envío de emails funcional
- [ ] Detalle con edición de items

## Notas
_Menos cambios que otros bloques; revisar rápido_

---

# BLOQUE 4: GUÍAS DE SALIDA

**Estado:** 🔴 Pendiente  
**Complejidad:** 🟡 Media

## Archivos Frontend
| Archivo | Cambio | Líneas |
|---------|--------|--------|
| `frontend/src/pages/Bodegas/GuiaSalida/DetalleGuiaSalidaBodega.tsx` | Modificado | +848 |
| `frontend/src/pages/Bodegas/GuiaSalida/ListaGuiaSalidaBodega.tsx` | Modificado | +59 |
| `frontend/src/pages/Bodegas/GuiaSalida/CrearItemsGuiaSalidaBodega.tsx` | Modificado | +110 |
| `frontend/src/pages/Bodegas/GuiaSalida/modals/AprobarGuiaSalida.tsx` | Modificado | +10 |
| `frontend/src/pages/Bodegas/GuiaSalida/modals/FirmarEntregarGuia.tsx` | Modificado | +3 |
| `frontend/src/pages/Bodegas/GuiaSalida/modals/VolverAPendienteGuiaSalida.tsx` | Modificado | +3 |
| `frontend/src/pages/Bodegas/modals/CrearGuiaSalidaEnDetalleBodega.tsx` | Modificado | +54 |

## Sub-bloques sugeridos (por feature/flujo funcional)

Cada sub-bloque agrupa cambios relacionados a una **funcionalidad completa** (backend + frontend cuando aplica):

- **4.1: Creación de Guía de Salida**
  - Backend: endpoint POST, validación de stock disponible (compartido con Compras en bodegas/)
  - Frontend: `CrearItemsGuiaSalidaBodega.tsx` (+110)
  - Frontend: `CrearGuiaSalidaEnDetalleBodega.tsx` (+54)
  - **Objetivo:** Crear guía con items desde bodega o desde detalle

- **4.2: Detalle de Guía**
  - Backend: endpoint GET con items y movimientos
  - Frontend: `DetalleGuiaSalidaBodega.tsx` (+848, mayor cambio)
  - **Objetivo:** Vista completa con items, cantidades, destino

- **4.3: Estados y Flujo de Aprobación**
  - Backend: estados (pendiente → aprobada → entregada)
  - Backend: movimientos de stock al aprobar (bodegas/movimientos.py)
  - Frontend: `AprobarGuiaSalida.tsx` (+10)
  - Frontend: `VolverAPendienteGuiaSalida.tsx` (+3)
  - **Objetivo:** Transiciones con actualización de inventario

- **4.4: Firma y Entrega**
  - Backend: registro de firma, fecha de entrega
  - Frontend: `FirmarEntregarGuia.tsx` (+3)
  - **Objetivo:** Confirmar recepción con firma digital/timestamp

- **4.5: Lista de Guías**
  - Backend: filtros por estado, bodega, destino
  - Frontend: `ListaGuiaSalidaBodega.tsx` (+59)
  - **Objetivo:** Listado con búsqueda y estados

## Checklist
- [ ] Validación de stock disponible al crear
- [ ] Estados de guía correctos (pendiente → aprobada → entregada)
- [ ] Movimientos de stock al aprobar
- [ ] Firma y entrega funcional
- [ ] Integración con OT (insumos)

## Notas
_Compartido backend con Compras (bodegas/models, movimientos, functions)_

---

# BLOQUE 5: ÓRDENES DE TRABAJO

**Estado:** 🔴 Pendiente  
**Complejidad:** 🔴 Alta (mayor cantidad de cambios)

## Archivos Backend
| Archivo | Cambio | Líneas |
|---------|--------|--------|
| `backend/ordentrabajo/models.py` | Modificado | +250 |
| `backend/ordentrabajo/views.py` | Modificado | +59 |
| `backend/ordentrabajov2/models.py` | Modificado | +340 |
| `backend/ordentrabajov2/serializers.py` | Modificado | +274 |
| `backend/ordentrabajov2/views.py` | Modificado | +670 |
| `backend/ordentrabajov2/urls.py` | Modificado | +15 |
| `backend/ordentrabajov2/admin.py` | Modificado | +168 |
| `backend/ordentrabajov2/signals.py` | Modificado | +4 |
| `backend/rendiciones/models.py` | Modificado | +59 |
| `backend/rendiciones/serializers.py` | Modificado | +47 |
| `backend/rendiciones/views.py` | Modificado | +186 |

## Archivos Frontend – Páginas principales
| Archivo | Cambio | Líneas |
|---------|--------|--------|
| `frontend/src/pages/OrdenTrabajo/DetalleOT.tsx` | Modificado | +1465 |
| `frontend/src/pages/OrdenTrabajo/ListaOT.tsx` | Modificado | +405 |

## Archivos Frontend – Componentes
| Archivo | Cambio | Líneas |
|---------|--------|--------|
| `frontend/src/pages/OrdenTrabajo/components/ComprasEnOT.tsx` | Modificado | +362 |
| `frontend/src/pages/OrdenTrabajo/components/Insumos.tsx` | Modificado | +44 |
| `frontend/src/pages/OrdenTrabajo/components/ListaDetalleTrabajoOT.tsx` | Eliminado | -995 |
| `frontend/src/pages/OrdenTrabajo/components/ListaServiciosOT.tsx` | Nuevo | +1339 |
| `frontend/src/pages/OrdenTrabajo/components/ListaSoportesTecnicosOT.tsx` | Nuevo | +1399 |
| `frontend/src/pages/OrdenTrabajo/components/RendicionesOT.tsx` | Modificado | +348 |
| `frontend/src/pages/OrdenTrabajo/components/UsuariosVinculadosOT.tsx` | Modificado | +466 |

## Archivos Frontend – Modales
| Archivo | Cambio | Líneas |
|---------|--------|--------|
| `frontend/src/pages/OrdenTrabajo/modals/CompletarOT.tsx` | Modificado | +731 |
| `frontend/src/pages/OrdenTrabajo/modals/CompletarCompraDT.tsx` | Modificado | +126 |
| `frontend/src/pages/OrdenTrabajo/modals/CrearCompraRapidaEnOT.tsx` | Nuevo | +866 |
| `frontend/src/pages/OrdenTrabajo/modals/CrearComprasEnOT.tsx` | Modificado | +174 |
| `frontend/src/pages/OrdenTrabajo/modals/CrearDetalleTrabajoOT.tsx` | Eliminado | -181 |
| `frontend/src/pages/OrdenTrabajo/modals/CrearOrdenOT.tsx` | Modificado | +712 |
| `frontend/src/pages/OrdenTrabajo/modals/CrearProspectoModal.tsx` | Nuevo | +368 |
| `frontend/src/pages/OrdenTrabajo/modals/CrearRendicionesOT.tsx` | Modificado | +387 |
| `frontend/src/pages/OrdenTrabajo/modals/CrearServicioEnOT.tsx` | Nuevo | +230 |
| `frontend/src/pages/OrdenTrabajo/modals/CrearSoporteTecnicoEnOT.tsx` | Nuevo | +295 |
| `frontend/src/pages/OrdenTrabajo/modals/CrearUsuarioAsignadoOT.tsx` | Modificado | +874 |
| `frontend/src/pages/OrdenTrabajo/modals/ListaUsuarioEquipoOT.tsx` | Nuevo | +477 |
| `frontend/src/pages/OrdenTrabajo/modals/RegistrarItemsComprasOT.tsx` | Nuevo | +399 |
| `frontend/src/pages/OrdenTrabajo/modals/VincularCompraEnOT.tsx` | Nuevo | +166 |
| `frontend/src/pages/OrdenTrabajo/modals/VincularCotizacion.tsx` | Nuevo | +197 |

## Archivos Frontend – Store y tipos
| Archivo | Cambio | Líneas |
|---------|--------|--------|
| `frontend/src/store/slices/ordenTrabajo/ordenTrabajoSlice.ts` | Modificado | +1939 |
| `frontend/src/interface/ordenTrabajo.interface.ts` | Modificado | +527 |
| `frontend/src/constants/ordentrabajo.constant.ts` | Modificado | +38 |
| `frontend/src/utils/ordenTrabajoHelpers.ts` | Nuevo | +94 |

## Sub-bloques sugeridos (por feature/flujo funcional)

Cada sub-bloque agrupa cambios relacionados a una **funcionalidad completa** (backend + frontend cuando aplica):

- **5.1: Separación Servicios Generales vs Soportes Técnicos**
  - Backend: modelos `ServicioEnOT`, `SoporteTecnico` (ordentrabajov2/models.py)
  - Backend: serializers y endpoints específicos
  - Frontend: `ListaServiciosOT.tsx` (nuevo), `ListaSoportesTecnicosOT.tsx` (nuevo)
  - Frontend: eliminación de `ListaDetalleTrabajoOT.tsx`
  - **Objetivo:** Separar flujos antes unificados en DetalleTrabajo

- **5.2: Creación de Servicios y Soportes**
  - Backend: endpoints POST para servicios/soportes
  - Frontend: `CrearServicioEnOT.tsx` (nuevo), `CrearSoporteTecnicoEnOT.tsx` (nuevo)
  - Frontend: eliminación de `CrearDetalleTrabajoOT.tsx`
  - **Objetivo:** Modales específicos por tipo de trabajo

- **5.3: Usuarios y Equipos Técnicos**
  - Backend: modelo `UsuarioAsignadoSoporte` M2M
  - Backend: endpoints de asignación
  - Frontend: `UsuariosVinculadosOT.tsx`, `ListaUsuarioEquipoOT.tsx` (nuevo)
  - Frontend: `CrearUsuarioAsignadoOT.tsx` (modificado +874)
  - **Objetivo:** Gestión de equipos técnicos por OT

- **5.4: Vinculación con Compras y Cotizaciones**
  - Backend: relaciones GenericForeignKey o FK específicas
  - Backend: endpoints de vinculación
  - Frontend: `VincularCompraEnOT.tsx` (nuevo), `VincularCotizacion.tsx` (nuevo)
  - Frontend: `ComprasEnOT.tsx` (modificado +362)
  - **Objetivo:** Conectar OT con compras y cotizaciones existentes

- **5.5: Compras Rápidas desde OT**
  - Backend: lógica de creación rápida (si aplica)
  - Frontend: `CrearCompraRapidaEnOT.tsx` (nuevo +866)
  - Frontend: `RegistrarItemsComprasOT.tsx` (nuevo +399)
  - **Objetivo:** Crear compras directamente desde contexto de OT

- **5.6: Sistema de Rendiciones en OT**
  - Backend: modelo `RendicionEnOt` (rendiciones/models.py +59)
  - Backend: serializers y views de rendiciones (+47, +186)
  - Frontend: `RendicionesOT.tsx` (modificado +348)
  - Frontend: `CrearRendicionesOT.tsx` (modificado +387)
  - **Objetivo:** Gastos/rendiciones directamente en OT

- **5.7: Creación y Edición de OT**
  - Backend: modelo `OrdenDeTrabajo` en OTv2 (+340)
  - Backend: campos nuevos (tipo_servicio, tecnico_responsable, etc.)
  - Frontend: `CrearOrdenOT.tsx` (modificado +712)
  - Frontend: `CrearProspectoModal.tsx` (nuevo +368)
  - **Objetivo:** Formulario de creación con campos nuevos

- **5.8: Detalle, Lista y Cierre de OT**
  - Backend: endpoints de detalle y cierre
  - Backend: `CierreAdministrativoOT` (si existe)
  - Frontend: `DetalleOT.tsx` (modificado +1465)
  - Frontend: `ListaOT.tsx` (modificado +405)
  - Frontend: `CompletarOT.tsx` (modificado +731)
  - **Objetivo:** Vistas principales y flujo de cierre

- **5.9: Store, Interfaces y Helpers**
  - Frontend: `ordenTrabajoSlice.ts` (modificado +1939)
  - Frontend: `ordenTrabajo.interface.ts` (modificado +527)
  - Frontend: `ordentrabajo.constant.ts` (modificado +38)
  - Frontend: `ordenTrabajoHelpers.ts` (nuevo +94)
  - **Objetivo:** Estado global y tipos coherentes

- **5.10: Insumos y Guías de Salida en OT**
  - Backend: relación con GuiaSalida
  - Frontend: `Insumos.tsx` (modificado +44)
  - **Objetivo:** Gestión de materiales usados en OT

## Checklist
- [ ] OTv1 vs OTv2: separación clara
- [ ] Modelos con migraciones
- [ ] Serializers coherentes
- [ ] Views con permisos
- [ ] Componentes eliminados vs nuevos
- [ ] Modales tipados
- [ ] Slice sin código muerto
- [ ] Flujo completo funcional

## Notas
_Bloque más extenso. Requiere revisión en sub-bloques._

---

# OTROS CAMBIOS (Auxiliares)

Archivos que no pertenecen a los 5 bloques principales pero deben revisarse:

## Configuración y Setup
- `backend/sw_erp/urls.py` (+50)
- `docker-compose.yml` (+31)
- `workspace.code-workspace` (+20)
- `.copilotignore` (+105)
- `AGENTS.md` (+160)

## Items y Proveedores
- `backend/items/models.py` (+2)
- `backend/items/serializers.py` (+8)
- `backend/items/views.py` (+219)
- `frontend/src/pages/Items/DetalleItemEmpresa.tsx` (+200)
- `frontend/src/pages/Items/Proveedor/*` (varios)

## Empresas y Cuentas
- `backend/empresas/admin.py` (+474)
- `backend/empresas/views.py` (+136)
- `backend/cuentas/views.py` (+29)
- `frontend/src/pages/Clientes/DetalleCliente.tsx` (+99)

## Core y Utilidades
- `backend/core/indicators.py` (+29)
- `backend/core/tasks.py` (+19)
- `frontend/src/utils/currency.ts` (+25)
- `frontend/src/styles/index.css` (+34)
- `frontend/src/components/ui/Modal.tsx` (+70)
- `frontend/src/components/layouts/Aside/Aside.tsx` (+5)

## Scripts (monorepo/)
- Múltiples scripts de setup y desarrollo

## Documentación (ya consolidada)
- Los docs antiguos fueron eliminados y consolidados

---

## Proceso por Bloque

Para cada bloque, seguir este flujo:

1. **Inventariar** — Listar archivos exactos y líneas clave
2. **Revisar** — Verificar consistencia, limpiar código, corregir issues
3. **Validar** — Ejecutar linters, verificar que compila
4. **Acordar** — Confirmar que el bloque está listo
5. **Commitear** — Crear commit atómico con mensaje descriptivo
6. **Registrar** — Añadir entrada en `docs/changelog.md`
7. **Marcar** — Actualizar estado del bloque a ✅ Completado

---

## Consistencia Arquitectónica (Checklist Global)

Al revisar cada bloque, verificar contra estos estándares:

### Frontend
- [ ] Componentes funcionales con hooks
- [ ] Props tipadas con interfaces (prefijo `I`)
- [ ] State/Effects/Handlers/Render separados con comentarios
- [ ] Servicios usan `ApiService.fetchData<T>()`
- [ ] Thunks siguen patrón `createAsyncThunk` con `rejectWithValue`
- [ ] No `any` sin justificación
- [ ] TailwindCSS para estilos

### Backend
- [ ] Modelos con `HistoricalRecords` si requieren auditoría
- [ ] Serializers con validación en `validate_*`
- [ ] ViewSets con permisos explícitos
- [ ] Filtros en `filters.py`
- [ ] URLs con router DRF

---

## Próximo Paso

**Bloque a revisar:** Bloque 1 (Sistema de Devoluciones)

**Acción inmediata:** Revisar `VoucherDevolucionService.ts` y validar consistencia con otros servicios.

---

## Historial de Sesiones

| Fecha | Bloque | Acción | Resultado |
|-------|--------|--------|-----------|
| 2025-12-30 | — | Creación documento | Inventario inicial |

---

_Última actualización: 2025-12-30_
