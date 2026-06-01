# Auditoria Funcional: Bodegas (Inventario, Compras, Guias)

**Fecha:** 2026-04-15 | **Modulo:** bodegas | **Estado:** EN REVISION

---

## 1. Modelos y Estados

| Modelo | Campo estado | Valores posibles |
|--------|-------------|------------------|
| `OrdenCompra` | `estado` | `"-"` borrador / `"0"` pendiente_aprobacion / `"1"` aprobada / `"2"` rechazada / `"3"` enviada / `"4"` parcialmente_recibida / `"5"` completada / `"6"` cancelada / `"7"` cerrada |
| `GuiaSalida` | `estado` | `"P"` pendiente_firma / `"ER"` en_ruta / `"FR"` firma_requerida / `"ET"` entregado_tecnico / `"E"` entregado / `"T"` terminada |
| `Compra` | `estado` | `"B"` borrador / `"P"` pendiente / `"R"` rendida / `"C"` cancelada / `"F"` facturada |
| `SerieItem` | `estado` | `"disponible"` / `"reservada"` / `"despachada"` / `"devuelta"` |
| `TomaInventario` | `estado` | `"pendiente"` / `"en_proceso"` / `"revision"` / `"aprobado"` / `"cerrado"` |
| `OrdenCompraAgrupada` | derivado | Agrupa OCs por cliente/prospecto |

### Mapa de transicion de OrdenCompra

```
"-" (Borrador)
  └→ "0" (Pendiente aprobacion)
       ├→ "1" (Aprobada)  ← permite crear guias y registrar stock
       └→ "2" (Rechazada) → "0" o "6"
            "1" (Aprobada)
              └→ "3" (Enviada a proveedor)
                   └→ "4" (Parcialmente recibida)  ← permite multiples recepciones
                        └→ "5" (Completada)
                             └→ "7" (Cerrada)  ← final administrativo

Desde cualquier estado (excepto "7" cerrada):
  → "6" (Cancelada)  ← final sin efecto en stock
```

### Mapa de transicion de GuiaSalida

```
"P" (Pendiente firma)
  └→ "ER" (En ruta, salida del almacen)
       └→ "FR" (Firma requerida en cliente)
            └→ "ET" (Entregado al tecnico)  ← auto si OT v2 pasa a en_proceso
                 └→ "E" (Entregado al cliente con firma)
                      └→ "T" (Terminada)  ← cierre final
```

---

## 2. Flujos

### Flujo 1: Orden de Compra (desde aprobacion hasta recepcion)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/ordenes-compra/` crea OC en estado `"-"` (borrador) | Implementado | | |
| 2 | `POST /api/ordenes-compra/{id}/cambiar-estado/` gestiona transiciones administrativas | Implementado con validacion de `_TRANSICIONES_VALIDAS_OC` | | |
| 3 | `POST /api/ordenes-compra/{id}/pasar-enviado-proveedor/` transiciona `"1" → "3"` y envia email al proveedor | Implementado | | |
| 4 | `POST /api/ordenes-compra/{id}/completar-orden-compra/` recibe items y registra stock | Implementado con `registrar_entrada()` | | |
| 5 | Recepcion parcial: estado queda en `"4"` (parcial). Permite multiples recepciones hasta completar | Implementado | | |
| 6 | Recepcion completa: estado → `"5"` (completada) | Implementado | | |
| 7 | Multi-tenancy: `get_queryset()` filtra por empresa via `sucursal_principal` | Implementado en `OrdenCompraViewSet` | | |
| 8 | Signal al guardar OC en estado `"1"` o `"3"`: crea `ItemOrdenCompraEnStock` (reserva anticipada) | Implementado en `bodegas/signals.py` | | |

### Flujo 2: Completar OC y crear Guia simultaneamente

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/ordenes-compra/{id}/completar-y-crear-guia/` en una sola operacion atomica: recepciona OC + crea GuiaSalida + crea SoporteTecnico en OT v2 | Implementado | | |
| 2 | Operacion es transaccion atomica: si falla cualquier paso → rollback total | Implementado con `transaction.atomic()` | | |
| 3 | `GuiaSalida` creada empieza en estado `"P"` (pendiente firma) | Implementado | | |
| 4 | Los items de la OC se refleja en `ItemsGuiaSalida` con cantidad_rebajada | Implementado | | |

### Flujo 3: Gestion de GuiaSalida (despacho y entrega)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/guias-salida/` crea guia en estado `"P"` con items referenciados | Implementado | | |
| 2 | `POST /api/guias-salida/{id}/aprobar-guia/` valida que todas las series esten asignadas antes de aprobar | Implementado con validacion de series | | |
| 3 | Guia avanza por estados: `P → ER → FR → ET → E → T` | Implementado en `cambiar-estado` de guia | | |
| 4 | Auto-transicion `FR → ET`: cuando OT v2 vinculada pasa a estado `en_proceso`, guias en `FR` avanzan automaticamente a `ET` | Implementado en signal de OT v2 | | |
| 5 | Al eliminar `ItemsGuiaSalida` si guia NO esta en estado `ET`, `E` o `T`: revierte stock y libera series | Implementado en signal `post_delete` | | |
| 6 | `cantidad_rebajada` en `ItemsGuiaSalida` puede ser menor a cantidad original (despacho parcial) | Implementado | | |

### Flujo 4: Movimientos de Stock (CRITICO: DELTA no saldo)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `registrar_entrada(stock_item, cantidad, usuario, origen)`: SUMA cantidad al saldo. Crea `MovimientoStock` tipo ENTRADA | Implementado en `bodegas/movimientos.py` | | |
| 2 | `registrar_salida(stock_item, cantidad, usuario, origen)`: RESTA cantidad del saldo. Crea `MovimientoStock` tipo SALIDA | Implementado en `bodegas/movimientos.py` | | |
| 3 | `registrar_devolucion(stock_item, cantidad, usuario, origen)`: SUMA cantidad (devuelve). Crea `MovimientoStock` tipo DEVOLUCION | Implementado en `bodegas/movimientos.py` | | |
| 4 | **`cantidad` es siempre DELTA (incremento/decremento), nunca el saldo total** | Documentado y validado en `movimientos.py` | | |
| 5 | Saldo disponible = `StockItemEnBodega.cantidad - cantidad_no_disponible` | Calculado en modelo | | |
| 6 | Al crear GuiaSalida: `cantidad_no_disponible += items_reservados` (reserva antes de despacho) | Implementado | | |
| 7 | Si GuiaSalida se elimina antes de `ET`: `cantidad_no_disponible` se revierte | Implementado en signal `post_delete` | | |
| 8 | `MovimientoStock` usa GenericForeignKey para referenciar cualquier origen (OC, Guia, etc.) | Implementado como auditoria completa | | |

### Flujo 5: Series numeradas (items serializados)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `SerieItem` es unico por empresa: `numero_serie` + `empresa` (unique_together) | Implementado en modelo | | |
| 2 | Series pasan por estados: `disponible → reservada → despachada → devuelta` | Implementado | | |
| 3 | Al crear GuiaSalida con item serializado: serie queda en `reservada` | Implementado | | |
| 4 | Al confirmar entrega de guia: serie queda en `despachada` | Implementado | | |
| 5 | Si se cancela la guia antes de `ET`: serie vuelve a `disponible` | Implementado en signal de eliminacion | | |
| 6 | Series se validan antes de crear la guia (no permite usar serie no disponible) | Implementado en `crear-guia-rapida` de OTV3 y en bodegas | | |

### Flujo 6: Compras rapidas (Compra sin OC formal)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `Compra` permite registrar gastos directos sin pasar por OC formal | Implementado | | |
| 2 | Vinculada a OT o a usuario directamente | Implementado via FK | | |
| 3 | Al aprobar rendicion: `Compra.estado` → `"R"` (rendida) | Implementado en `rendiciones/views.py` | | |
| 4 | Si rendicion se rechaza: `Compra.estado` → `"C"` (cancelada) | Implementado | | |

### Flujo 7: Toma de inventario

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/tomas-inventario/` crea toma en estado `pendiente` | Implementado | | |
| 2 | Flujo: `pendiente → en_proceso → revision → aprobado → cerrado` | Implementado | | |
| 3 | En estado `revision`: se puede contrastar conteo fisico vs saldo sistema | Implementado | | |
| 4 | Al aprobar: ajustes de inventario se aplican via `registrar_ajuste_inventario()` | Implementado (si existe la funcion) | | |

---

## 3. Reglas de Negocio

| # | Regla | Implementada en | OK | Observacion |
|---|-------|----------------|----|-----------  |
| 1 | `cantidad` en movimientos es DELTA (no saldo): ERROR CRITICO si se passa saldo | `bodegas/movimientos.py` documentado | | |
| 2 | `"cantidad"` disponible = `cantidad - cantidad_no_disponible` (nunca usar `cantidad` directamente) | `StockItemEnBodega` modelo | | |
| 3 | Series asignadas a guia deben estar en estado `disponible` para ser usadas | Validacion en `aprobar-guia` y `crear-guia-rapida` | | |
| 4 | OC no puede avanzar de estados sin pasar por aprobacion (`"0"` → `"1"`) | `_TRANSICIONES_VALIDAS_OC` | | |
| 5 | Eliminacion de `ItemsGuiaSalida` (guia no entregada) → revierte stock + libera series | Signal `post_delete` | | |
| 6 | OC en estado `"6"` (cancelada) o `"7"` (cerrada): no permite mas operaciones | `_TRANSICIONES_VALIDAS_OC` | | |
| 7 | Multi-tenancy: queries filtran por empresa via `sucursal_principal` | `get_queryset()` en ViewSets de bodegas | | |
| 8 | `GuiaSalida` transicion `FR → ET` es automatica cuando OT v2 pasa a `en_proceso` | Signal de OT v2 | | |

---

## 4. Side-effects (signals, Celery, auto-transiciones)

| Evento disparador | Efecto automatico | Ubicacion |
|------------------|-------------------|-----------|
| Guardar `OrdenCompra` en estado `"1"` o `"3"` | Crea `ItemOrdenCompraEnStock` (reserva anticipada de stock) | `bodegas/signals.py` |
| Eliminar `ItemsGuiaSalida` (guia en estado < `ET`) | Revierte stock + `cantidad_no_disponible` + libera series | Signal `post_delete` en bodegas |
| OT v2 pasa a estado `en_proceso` | Guias en estado `FR` vinculadas avanzan automaticamente a `ET` | Signal de `ordentrabajov2` |
| Aprobar rendicion | `Compra` asociada → estado `"R"` (rendida) | `rendiciones/views.py` |
| Rechazar rendicion | `Compra` asociada → estado `"C"` (cancelada) | `rendiciones/views.py` |

---

## 5. Endpoints principales

| Metodo | URL | Descripcion | Auth |
|--------|-----|-------------|------|
| GET | `/api/ordenes-compra/` | Lista OC del usuario | JWT |
| POST | `/api/ordenes-compra/` | Crear OC | JWT |
| GET | `/api/ordenes-compra/{id}/` | Detalle de OC | JWT |
| POST | `/api/ordenes-compra/{id}/cambiar-estado/` | Transiciones administrativas | JWT |
| POST | `/api/ordenes-compra/{id}/pasar-enviado-proveedor/` | OC `"1" → "3"` + email proveedor | JWT |
| POST | `/api/ordenes-compra/{id}/completar-orden-compra/` | Recepcionar items + registrar stock | JWT |
| POST | `/api/ordenes-compra/{id}/completar-y-crear-guia/` | Recepcionar + crear guia (atomico) | JWT |
| GET | `/api/guias-salida/` | Lista guias | JWT |
| POST | `/api/guias-salida/` | Crear guia manualmente | JWT |
| POST | `/api/guias-salida/{id}/aprobar-guia/` | Aprobar guia (valida series) | JWT |
| POST | `/api/guias-salida/{id}/cambiar-estado/` | Transicionar estado de guia | JWT |
| GET | `/api/stock/` | Consulta de stock por bodega/item | JWT |
| POST | `/api/tomas-inventario/` | Crear toma de inventario | JWT |
| GET | `/api/compras/` | Lista compras rapidas | JWT |
| POST | `/api/compras/` | Crear compra rapida | JWT |

---

## 6. Checklist general del modulo Bodegas

### Ordenes de Compra
- [ ] OC empieza en estado `"-"` (borrador)
- [ ] Transicion a `"0"` (pendiente aprobacion) funciona
- [ ] Aprobar OC (`"0" → "1"`) registra reserva anticipada de stock
- [ ] Enviar a proveedor (`"1" → "3"`) envia email correctamente
- [ ] Recepcion parcial mantiene estado `"4"` y permite multiples recepciones
- [ ] Recepcion completa avanza a `"5"` y registra stock con `registrar_entrada()`
- [ ] `completar-y-crear-guia` es atomico (rollback si falla)

### Movimientos de stock
- [ ] `registrar_entrada()` suma, `registrar_salida()` resta (DELTA no saldo)
- [ ] `cantidad_no_disponible` se reserva al crear GuiaSalida
- [ ] `cantidad_no_disponible` se revierte al eliminar items de guia no entregada
- [ ] `MovimientoStock` registra cada operacion con tipo y origen correcto

### Series numeradas
- [ ] Serie solo puede usarse si estado = `disponible`
- [ ] Al crear guia con serie: pasa a `reservada`
- [ ] Al confirmar entrega: pasa a `despachada`
- [ ] Al cancelar guia antes de entregar: vuelve a `disponible`

### GuiaSalida
- [ ] GuiaSalida empieza en `"P"` (pendiente firma)
- [ ] `aprobar-guia` valida que todas las series esten asignadas
- [ ] Auto-transicion `FR → ET` cuando OT v2 pasa a `en_proceso`
- [ ] Eliminar `ItemsGuiaSalida` (antes de `ET`) revierte stock correctamente

---

*Ultima revision:* ___________  *Revisado por:* ___________
