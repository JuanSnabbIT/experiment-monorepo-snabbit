# Revisi├│n de Cambios Pendientes ÔÇô Monorepo ERP

**Documento de trabajo temporal** para coordinar la auditor├¡a de cambios no commiteados.  
**Ciclo de vida:** Este archivo se elimina cuando todos los cambios est├®n auditados y commiteados.

---

## Objetivo

1. Revisar sistem├íticamente todos los cambios no commiteados.
2. Verificar consistencia arquitect├│nica (patrones, convenciones, estructura).
3. Limpiar c├│digo y residuos.
4. Commitear por bloques l├│gicos y ordenados.
5. Registrar cada bloque cerrado en `docs/changelog.md`.

---

## Estado General

|           M├®trica         |   Valor   |
|---------------------------|------------|
| Fecha inicio revisi├│n     | 2025-12-30 |
| Total archivos cambiados  | 162        |
| L├¡neas a├▒adidas           | +34,620    |
| L├¡neas eliminadas         | -10,746    |
| Bloques principales       | 5          |
| Bloques completados       | 0/5        |

---

## Estructura de Bloques

Los cambios se organizan por **m├│dulo funcional principal**. Cada bloque puede tener sub-bloques si es extenso.

| Bloque | M├│dulo | Complejidad | Estado |
|--------|--------|-------------|--------|
| 1 | Cotizaciones | ­ƒƒí Media | ­ƒö┤ Pendiente |
| 2 | Compras | ­ƒƒí Media | ­ƒö┤ Pendiente |
| 3 | ├ôrdenes de Compra | ­ƒƒó Baja | ­ƒö┤ Pendiente |
| 4 | Gu├¡as de Salida | ­ƒƒí Media | ­ƒö┤ Pendiente |
| 5 | ├ôrdenes de Trabajo | ­ƒö┤ Alta | ­ƒö┤ Pendiente |

---

# BLOQUE 1: COTIZACIONES

**Estado:** ­ƒö┤ Pendiente  
**Complejidad:** ­ƒƒí Media

## Archivos Backend
| Archivo | Cambio | L├¡neas |
|---------|--------|--------|
| `backend/cotizaciones/models.py` | Modificado | +269 |
| `backend/cotizaciones/serializers.py` | Modificado | +16 |
| `backend/cotizaciones/views.py` | Modificado | +375 |
| `backend/cotizaciones/functions.py` | Modificado | +36 |

## Archivos Frontend
| Archivo | Cambio | L├¡neas |
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

- **1.1: Creaci├│n de Cotizaciones**
  - Backend: models.py (campos nuevos), serializers.py
  - Backend: endpoints POST/validaci├│n
  - Frontend: `CrearCotizacion.tsx` (+27)
  - **Objetivo:** Formulario de creaci├│n con validaciones

  ### Commit aislado (Sub-bloque 1.1)

  - **Branch creado:** `feature/cotizaciones/creacion`
  - **Commit:** `b9d9e4b` ÔÇö feat(cotizaciones): aislar Creaci├│n de Cotizaciones (Sub-bloque 1.1)
  - **Archivos incluidos:**
    - `backend/cotizaciones/models.py`
    - `backend/cotizaciones/serializers.py`
    - `frontend/src/pages/Cotizaciones/modals/CrearCotizacion.tsx`

  _Estado:_ Sub-bloque 1.1 validado y commiteado en branch aislado.

- **1.2: Detalle y Visualizaci├│n**
  - Backend: endpoints GET detalle con relaciones
  - Frontend: `DetalleCotizacion.tsx` (+1907, mayor cambio)
  - Frontend: `TablaImpuestos.tsx` (+130), `TablaItemsTecnico.tsx` (+70), `TablaVenta.tsx` (+331)
  - **Objetivo:** Vista completa de cotizaci├│n con tabs/secciones

  ### Commit aislado (Sub-bloque 1.2)

  - **Branch:** `feature/cotizaciones/creacion-main`
  - **Commit:** `c0415a0` ÔÇö feat(cotizaciones): Sub-bloque 1.2 - Detalle y Visualizaci├│n
  - **Archivos incluidos:**
    - `frontend/src/pages/Cotizaciones/components/DetalleCotizacion.tsx`
    - `frontend/src/pages/Cotizaciones/components/TablaImpuestos.tsx`
    - `frontend/src/pages/Cotizaciones/components/TablaVenta.tsx`
    - `frontend/src/pages/Cotizaciones/components/TablaItemsTecnico.tsx`
  - **Mejoras aplicadas:**
    - Refactor visualizaci├│n multi-moneda (CLP/USD/UF)
    - Uso de `formatCurrency` centralizado
    - Simplificaci├│n de grids (eliminaci├│n de columnas redundantes)
    - L├│gica de conversi├│n de moneda coherente

  _Estado:_ Sub-bloque 1.2 validado y commiteado.

- **1.3: Gesti├│n de Items en Cotizaci├│n**
  - Backend: relaci├│n items, c├ílculos de precios
  - Backend: functions.py (+36, l├│gica de negocio)
  - Frontend: `CrearItemCotizacion.tsx` (+78)
  - **Objetivo:** Agregar/editar items con c├ílculos autom├íticos


  ### Commit aislado (Sub-bloque 1.3)

  - **Branch creado:** feature/cotizaciones/creacion-main
  - **Commit:** c2344d8 Ôåô feat(cotizaciones): Sub-bloque 1.3 - Gesti├│n de Items
  - **Archivos incluidos:**
    - backend/cotizaciones/functions.py
    - frontend/src/pages/Cotizaciones/modals/CrearItemCotizacion.tsx

  _Estado:_ Sub-bloque 1.3 validado y commiteado en branch aislado
- **1.4: Flujo de Aprobaci├│n y Env├¡o**
  - Backend: cambios de estado, notificaciones
  - Backend: views.py (+375, endpoints de transici├│n)
  - Frontend: `AprobarCotizacion.tsx` (+381)
  - Frontend: `EnviarCotizacion.tsx` (+67)
  - **Objetivo:** Estados (pendiente ÔåÆ enviada ÔåÆ aceptada/rechazada)

- **1.5: Creaci├│n de OC desde Cotizaci├│n**
  - Backend: l├│gica de conversi├│n cotizaci├│n ÔåÆ OC
  - Frontend: `CrearOCDeCotizacion.tsx` (+169)
  - **Objetivo:** Generar Orden de Compra autom├ítica


  ### Commit aislado (Sub-bloque 1.4)

  - **Branch creado:** feature/cotizaciones/creacion-main
  - **Commit:** 1fc37fe -- feat(cotizaciones): Sub-bloque 1.4 - Flujo de Aprobación y Envío
  - **Archivos incluidos:**
    - backend/cotizaciones/views.py
    - frontend/src/pages/Cotizaciones/modals/AprobarCotizacion.tsx
    - frontend/src/pages/Cotizaciones/modals/EnviarCotizacion.tsx

  _Estado:_ Sub-bloque 1.4 validado y commiteado en branch aislado
- **1.6: Lista y Filtros**
  - Backend: querys optimizadas, filtros
  - Frontend: `CotizacionesEmpresa.tsx` (+112)
  - Frontend: slice (+24, thunks y paginaci├│n)
  - **Objetivo:** Listado con b├║squeda y estados

## Checklist
- [ ] Backend: modelos coherentes con migraciones
- [ ] Backend: serializers con validaci├│n
- [ ] Backend: views con permisos
- [ ] Frontend: componentes tipados
- [ ] Frontend: slice actualizado
- [ ] Integraci├│n: flujo completo funcional

## Notas
_Pendiente de revisi├│n detallada_

---

# BLOQUE 2: COMPRAS

**Estado:** ­ƒö┤ Pendiente  
**Complejidad:** ­ƒƒí Media

## Archivos Backend
| Archivo | Cambio | L├¡neas |
|---------|--------|--------|
| `backend/bodegas/models.py` | Modificado | +274 (compartido con otros m├│dulos) |
| `backend/bodegas/serializers.py` | Modificado | +58 |
| `backend/bodegas/views.py` | Modificado | +1405 (compartido) |
| `backend/bodegas/functions.py` | Modificado | +423 |
| `backend/bodegas/movimientos.py` | Modificado | +120 |
| `backend/bodegas/signals.py` | Modificado | +69 |
| `backend/bodegas/estados_modelo.py` | Modificado | +60 |

## Archivos Frontend
| Archivo | Cambio | L├¡neas |
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
  - Backend: `signals.py` (+69, transiciones autom├íticas)
  - **Objetivo:** Estados (borrador ÔåÆ completada) y reglas de transici├│n

- **2.2: Movimientos de Stock e Integraci├│n con Bodega**
  - Backend: `movimientos.py` (+120, registrar entradas/salidas)
  - Backend: `functions.py` (+423, l├│gica de stock)
  - Backend: relaci├│n con `StockItemEnBodega`
  - **Objetivo:** Actualizaci├│n autom├ítica de inventario al completar compra

- **2.3: Creaci├│n de Compras**
  - Backend: serializers.py (+58), validaciones
  - Backend: views.py (+1405, endpoint POST)
  - Frontend: `CrearCompra.tsx` (+232)
  - Frontend: constants (+48)
  - **Objetivo:** Formulario de compra con selecci├│n de proveedor y bodega

- **2.4: Gesti├│n de Items en Compra**
  - Backend: modelo `ItemEnCompra`, c├ílculos
  - Frontend: `CrearItemEnCompra.tsx` (+1271, mayor cambio)
  - Frontend: `TablaItemsCompra.tsx` (+461)
  - **Objetivo:** Agregar/editar items, cantidades, precios

- **2.5: Detalle de Compra**
  - Backend: endpoint GET con items relacionados
  - Frontend: `DetalleCompra.tsx` (+985)
  - Frontend: visualizaci├│n de estado, items, bodega
  - **Objetivo:** Vista completa de compra con acciones seg├║n estado

- **2.6: Lista y Filtros de Compras**
  - Backend: filtros por estado, proveedor, bodega
  - Frontend: `ListaCompra.tsx` (+11)
  - Frontend: slice (+24, paginaci├│n)
  - Frontend: interfaces (+443, tipos compartidos con gu├¡as/devoluciones)
  - **Objetivo:** Listado con b├║squeda y estados

## Checklist
- [ ] Backend: estados de compra correctos
- [ ] Backend: movimientos de stock
- [ ] Frontend: flujo de creaci├│n
- [ ] Frontend: detalle funcional
- [ ] Integraci├│n: stock actualiza correctamente

## Notas
_Compartido con Gu├¡as de Salida y Devoluciones_

---

# BLOQUE 3: ├ôRDENES DE COMPRA

**Estado:** ­ƒö┤ Pendiente  
**Complejidad:** ­ƒƒó Baja

## Archivos Frontend
| Archivo | Cambio | L├¡neas |
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

- **3.1: Creaci├│n de OC desde Cotizaci├│n**
  - Backend: endpoint de generaci├│n autom├ítica (compartido con Cotizaciones)
  - Frontend: `CrearOrdenCompra.tsx` (+11)
  - **Objetivo:** Generar OC a partir de cotizaci├│n aprobada

- **3.2: Detalle y Gesti├│n de Items**
  - Backend: relaci├│n items, actualizaci├│n de cantidades
  - Frontend: `DetalleOrdenCompraV2.tsx` (+1287, mayor cambio)
  - Frontend: `OffCanvasAgregarItemsOrdenCompra.tsx` (+51)
  - **Objetivo:** Vista detallada con edici├│n de items

- **3.3: Estados y Flujo de Aprobaci├│n**
  - Backend: estados (borrador ÔåÆ enviada ÔåÆ aceptada/rechazada)
  - Frontend: `AceptarORechazarOrdenCompra.tsx` (+8)
  - Frontend: `TerminarBorradorOC.tsx` (+10)
  - Frontend: `ModalVolverABorradorOC.tsx` (+6)
  - **Objetivo:** Transiciones de estado con validaciones

- **3.4: Env├¡o a Proveedor**
  - Backend: generaci├│n de PDF, env├¡o de email
  - Frontend: `ModalEnviarProveedor.tsx` (+7)
  - Frontend: `ModalReenviarAlProveedor.tsx` (+5)
  - **Objetivo:** Notificar proveedor y tracking

- **3.5: Lista de OC**
  - Backend: filtros por estado, proveedor
  - Frontend: `ListaOrdenesCompraV2.tsx` (+140)
  - **Objetivo:** Listado con estados y acciones r├ípidas

## Checklist
- [ ] Estados de OC correctos (borrador ÔåÆ enviada ÔåÆ aceptada/rechazada)
- [ ] Integraci├│n con Cotizaciones funciona
- [ ] Generaci├│n de PDF correcta
- [ ] Env├¡o de emails funcional
- [ ] Detalle con edici├│n de items

## Notas
_Menos cambios que otros bloques; revisar r├ípido_

---

# BLOQUE 4: GU├ìAS DE SALIDA

**Estado:** ­ƒö┤ Pendiente  
**Complejidad:** ­ƒƒí Media

## Archivos Frontend
| Archivo | Cambio | L├¡neas |
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

- **4.1: Creaci├│n de Gu├¡a de Salida**
  - Backend: endpoint POST, validaci├│n de stock disponible (compartido con Compras en bodegas/)
  - Frontend: `CrearItemsGuiaSalidaBodega.tsx` (+110)
  - Frontend: `CrearGuiaSalidaEnDetalleBodega.tsx` (+54)
  - **Objetivo:** Crear gu├¡a con items desde bodega o desde detalle

- **4.2: Detalle de Gu├¡a**
  - Backend: endpoint GET con items y movimientos
  - Frontend: `DetalleGuiaSalidaBodega.tsx` (+848, mayor cambio)
  - **Objetivo:** Vista completa con items, cantidades, destino

- **4.3: Estados y Flujo de Aprobaci├│n**
  - Backend: estados (pendiente ÔåÆ aprobada ÔåÆ entregada)
  - Backend: movimientos de stock al aprobar (bodegas/movimientos.py)
  - Frontend: `AprobarGuiaSalida.tsx` (+10)
  - Frontend: `VolverAPendienteGuiaSalida.tsx` (+3)
  - **Objetivo:** Transiciones con actualizaci├│n de inventario

- **4.4: Firma y Entrega**
  - Backend: registro de firma, fecha de entrega
  - Frontend: `FirmarEntregarGuia.tsx` (+3)
  - **Objetivo:** Confirmar recepci├│n con firma digital/timestamp

- **4.5: Lista de Gu├¡as**
  - Backend: filtros por estado, bodega, destino
  - Frontend: `ListaGuiaSalidaBodega.tsx` (+59)
  - **Objetivo:** Listado con b├║squeda y estados

## Checklist
- [ ] Validaci├│n de stock disponible al crear
- [ ] Estados de gu├¡a correctos (pendiente ÔåÆ aprobada ÔåÆ entregada)
- [ ] Movimientos de stock al aprobar
- [ ] Firma y entrega funcional
- [ ] Integraci├│n con OT (insumos)

## Notas
_Compartido backend con Compras (bodegas/models, movimientos, functions)_

---

# BLOQUE 5: ├ôRDENES DE TRABAJO

**Estado:** ­ƒö┤ Pendiente  
**Complejidad:** ­ƒö┤ Alta (mayor cantidad de cambios)

## Archivos Backend
| Archivo | Cambio | L├¡neas |
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

## Archivos Frontend ÔÇô P├íginas principales
| Archivo | Cambio | L├¡neas |
|---------|--------|--------|
| `frontend/src/pages/OrdenTrabajo/DetalleOT.tsx` | Modificado | +1465 |
| `frontend/src/pages/OrdenTrabajo/ListaOT.tsx` | Modificado | +405 |

## Archivos Frontend ÔÇô Componentes
| Archivo | Cambio | L├¡neas |
|---------|--------|--------|
| `frontend/src/pages/OrdenTrabajo/components/ComprasEnOT.tsx` | Modificado | +362 |
| `frontend/src/pages/OrdenTrabajo/components/Insumos.tsx` | Modificado | +44 |
| `frontend/src/pages/OrdenTrabajo/components/ListaDetalleTrabajoOT.tsx` | Eliminado | -995 |
| `frontend/src/pages/OrdenTrabajo/components/ListaServiciosOT.tsx` | Nuevo | +1339 |
| `frontend/src/pages/OrdenTrabajo/components/ListaSoportesTecnicosOT.tsx` | Nuevo | +1399 |
| `frontend/src/pages/OrdenTrabajo/components/RendicionesOT.tsx` | Modificado | +348 |
| `frontend/src/pages/OrdenTrabajo/components/UsuariosVinculadosOT.tsx` | Modificado | +466 |

## Archivos Frontend ÔÇô Modales
| Archivo | Cambio | L├¡neas |
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

## Archivos Frontend ÔÇô Store y tipos
| Archivo | Cambio | L├¡neas |
|---------|--------|--------|
| `frontend/src/store/slices/ordenTrabajo/ordenTrabajoSlice.ts` | Modificado | +1939 |
| `frontend/src/interface/ordenTrabajo.interface.ts` | Modificado | +527 |
| `frontend/src/constants/ordentrabajo.constant.ts` | Modificado | +38 |
| `frontend/src/utils/ordenTrabajoHelpers.ts` | Nuevo | +94 |

## Sub-bloques sugeridos (por feature/flujo funcional)

Cada sub-bloque agrupa cambios relacionados a una **funcionalidad completa** (backend + frontend cuando aplica):

- **5.1: Separaci├│n Servicios Generales vs Soportes T├®cnicos**
  - Backend: modelos `ServicioEnOT`, `SoporteTecnico` (ordentrabajov2/models.py)
  - Backend: serializers y endpoints espec├¡ficos
  - Frontend: `ListaServiciosOT.tsx` (nuevo), `ListaSoportesTecnicosOT.tsx` (nuevo)
  - Frontend: eliminaci├│n de `ListaDetalleTrabajoOT.tsx`
  - **Objetivo:** Separar flujos antes unificados en DetalleTrabajo

- **5.2: Creaci├│n de Servicios y Soportes**
  - Backend: endpoints POST para servicios/soportes
  - Frontend: `CrearServicioEnOT.tsx` (nuevo), `CrearSoporteTecnicoEnOT.tsx` (nuevo)
  - Frontend: eliminaci├│n de `CrearDetalleTrabajoOT.tsx`
  - **Objetivo:** Modales espec├¡ficos por tipo de trabajo

- **5.3: Usuarios y Equipos T├®cnicos**
  - Backend: modelo `UsuarioAsignadoSoporte` M2M
  - Backend: endpoints de asignaci├│n
  - Frontend: `UsuariosVinculadosOT.tsx`, `ListaUsuarioEquipoOT.tsx` (nuevo)
  - Frontend: `CrearUsuarioAsignadoOT.tsx` (modificado +874)
  - **Objetivo:** Gesti├│n de equipos t├®cnicos por OT

- **5.4: Vinculaci├│n con Compras y Cotizaciones**
  - Backend: relaciones GenericForeignKey o FK espec├¡ficas
  - Backend: endpoints de vinculaci├│n
  - Frontend: `VincularCompraEnOT.tsx` (nuevo), `VincularCotizacion.tsx` (nuevo)
  - Frontend: `ComprasEnOT.tsx` (modificado +362)
  - **Objetivo:** Conectar OT con compras y cotizaciones existentes

- **5.5: Compras R├ípidas desde OT**
  - Backend: l├│gica de creaci├│n r├ípida (si aplica)
  - Frontend: `CrearCompraRapidaEnOT.tsx` (nuevo +866)
  - Frontend: `RegistrarItemsComprasOT.tsx` (nuevo +399)
  - **Objetivo:** Crear compras directamente desde contexto de OT

- **5.6: Sistema de Rendiciones en OT**
  - Backend: modelo `RendicionEnOt` (rendiciones/models.py +59)
  - Backend: serializers y views de rendiciones (+47, +186)
  - Frontend: `RendicionesOT.tsx` (modificado +348)
  - Frontend: `CrearRendicionesOT.tsx` (modificado +387)
  - **Objetivo:** Gastos/rendiciones directamente en OT

- **5.7: Creaci├│n y Edici├│n de OT**
  - Backend: modelo `OrdenDeTrabajo` en OTv2 (+340)
  - Backend: campos nuevos (tipo_servicio, tecnico_responsable, etc.)
  - Frontend: `CrearOrdenOT.tsx` (modificado +712)
  - Frontend: `CrearProspectoModal.tsx` (nuevo +368)
  - **Objetivo:** Formulario de creaci├│n con campos nuevos

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

- **5.10: Insumos y Gu├¡as de Salida en OT**
  - Backend: relaci├│n con GuiaSalida
  - Frontend: `Insumos.tsx` (modificado +44)
  - **Objetivo:** Gesti├│n de materiales usados en OT

## Checklist
- [ ] OTv1 vs OTv2: separaci├│n clara
- [ ] Modelos con migraciones
- [ ] Serializers coherentes
- [ ] Views con permisos
- [ ] Componentes eliminados vs nuevos
- [ ] Modales tipados
- [ ] Slice sin c├│digo muerto
- [ ] Flujo completo funcional

## Notas
_Bloque m├ís extenso. Requiere revisi├│n en sub-bloques._

---

# OTROS CAMBIOS (Auxiliares)

Archivos que no pertenecen a los 5 bloques principales pero deben revisarse:

## Configuraci├│n y Setup
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
- M├║ltiples scripts de setup y desarrollo

## Documentaci├│n (ya consolidada)
- Los docs antiguos fueron eliminados y consolidados

---

## Proceso por Bloque

Para cada bloque, seguir este flujo:

1. **Inventariar** ÔÇö Listar archivos exactos y l├¡neas clave
2. **Revisar** ÔÇö Verificar consistencia, limpiar c├│digo, corregir issues
3. **Validar** ÔÇö Ejecutar linters, verificar que compila
4. **Acordar** ÔÇö Confirmar que el bloque est├í listo
5. **Commitear** ÔÇö Crear commit at├│mico con mensaje descriptivo
6. **Registrar** ÔÇö A├▒adir entrada en `docs/changelog.md`
7. **Marcar** ÔÇö Actualizar estado del bloque a Ô£à Completado

---

## Consistencia Arquitect├│nica (Checklist Global)

Al revisar cada bloque, verificar contra estos est├índares:

### Frontend
- [ ] Componentes funcionales con hooks
- [ ] Props tipadas con interfaces (prefijo `I`)
- [ ] State/Effects/Handlers/Render separados con comentarios
- [ ] Servicios usan `ApiService.fetchData<T>()`
- [ ] Thunks siguen patr├│n `createAsyncThunk` con `rejectWithValue`
- [ ] No `any` sin justificaci├│n
- [ ] TailwindCSS para estilos

### Backend
- [ ] Modelos con `HistoricalRecords` si requieren auditor├¡a
- [ ] Serializers con validaci├│n en `validate_*`
- [ ] ViewSets con permisos expl├¡citos
- [ ] Filtros en `filters.py`
- [ ] URLs con router DRF

---

## Pr├│ximo Paso

**Bloque a revisar:** Bloque 1 (Sistema de Devoluciones)

**Acci├│n inmediata:** Revisar `VoucherDevolucionService.ts` y validar consistencia con otros servicios.

---

## Historial de Sesiones

| Fecha | Bloque | Acci├│n | Resultado |
|-------|--------|--------|-----------|
| 2025-12-30 | ÔÇö | Creaci├│n documento | Inventario inicial |

---

_├Ültima actualizaci├│n: 2025-12-30_
