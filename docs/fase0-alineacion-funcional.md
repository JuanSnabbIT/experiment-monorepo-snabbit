# Fase 0 — Alineación Funcional: Inventario y Flujos de Bodega
> Issue #41 | Dependencias: auditoría #37, consolidación #39

---

## 1. Matriz de Flujos

| Flujo | Actor principal | Modelos involucrados | Dispara stock | Auditable |
|-------|----------------|----------------------|---------------|-----------|
| **Recepción OC** | Bodeguero | `OrdenCompra` → `ItemEnOrdenCompra` → `ItemOrdenCompraEnStock` → `StockItemEnBodega` | ✅ ENTRADA | ✅ |
| **Recepción Compra Rápida** | Bodeguero | `Compra` → `ItemEnCompra` → `ItemOrdenCompraEnStock` → `StockItemEnBodega` | ✅ ENTRADA | ✅ |
| **Asignación a Guía de Salida** | Bodeguero / Técnico | `GuiaSalida` → `ItemsGuiaSalida` | ✅ SALIDA | ✅ |
| **Picking (reserva de serie)** | Sistema | `SerieItem.estado = reservada`, `cantidad_no_disponible` | parcial | ✅ |
| **Despacho / Entrega** | Técnico / Bodeguero | `GuiaSalida.estado = E`, `SerieItem.estado = despachada` | — (ya rebajado) | ✅ |
| **Devolución** | Técnico / Bodeguero | `ItemsGuiaSalida.cantidad_devuelta`, `MovimientoStock DEVOLUCION`, `VoucherDevolucion` | ✅ DEVOLUCION | ✅ |
| **Ajuste Manual** | Admin / Bodeguero | `MovimientoStock AJUSTE / AJUSTE_INVENTARIO` | ✅ AJUSTE | ✅ |
| **Conteo / Toma de Inventario** | Bodeguero | `TomaInventario` → `ItemEnTomaInventario` → `MovimientoStock AJUSTE_INVENTARIO` | ✅ condicional | ✅ |

---

## 2. Catálogo de Inconsistencias Detectadas

### 2.1 Dualidad de fuentes de verdad para series
- **Problema:** `SerieItem` (modelo relacional) y `ItemOrdenCompraEnStock.numeros_serie` (JSONField) coexisten. El JSON legacy puede desincronizarse.
- **Evidencia:** `bodegas/series.py` contiene funciones `_sync_json_*` para mantener paridad manual.
- **Riesgo:** Alta.

### 2.2 Señal `create_items_in_stock` dispara stock antes de recepción física
- **Problema:** La señal en `signals.py` crea `ItemOrdenCompraEnStock` cuando OC llega a estado `1` (Aprobada) o `3` (Enviada al proveedor), no cuando está `4` (Parcialmente recibida) o `5` (Completada).
- **Riesgo:** Media — stock puede inflarse antes de recepción física.

### 2.3 `StockItemEnBodega` OneToOne impide multi-bodega
- **Problema:** `StockItemEnBodega.item = OneToOneField(ItemEmpresa)`. Un ítem solo puede existir en una bodega.
- **Riesgo:** Alta — bloquea arquitectura multi-bodega.

### 2.4 `ItemsGuiaSalida.numero_serie` JSONField duplica dato de `SerieItem`
- **Problema:** Dos campos para el mismo dato: JSONField `numero_serie` en `ItemsGuiaSalida` y FK inverso `SerieItem.item_guia_salida`.
- **Riesgo:** Media.

### 2.5 Rollback de stock en estados intermedios de GuiaSalida
- **Problema:** La señal `devolver_stock_al_eliminar_item_guia` permite rollback en estados `ER` (Espera firma técnico) y `FR` (Firmada por técnico), pero bloquea en `ET/E/T`. Puede haber casos donde el ítem ya salió físicamente antes de `ET`.
- **Riesgo:** Media.

### 2.6 `estado_derivado` de OC Agrupada no es persistido
- **Problema:** Es una @property calculada en tiempo real. No hay señal que propague cambio de OC hija. Puede haber inconsistencias en vistas de listado.
- **Riesgo:** Baja (solo UI).

---

## 3. Reglas Funcionales de Negocio

### 3.1 Ítems SIN número de serie

| Evento | Regla |
|--------|-------|
| Recepción (OC / Compra) | Suma `cantidad` a `StockItemEnBodega.cantidad`. Registra `MovimientoStock ENTRADA`. |
| Asignación a Guía | Resta de `cantidad`, suma a `cantidad_no_disponible`. Registra `MovimientoStock SALIDA`. |
| Entrega confirmada | `GuiaSalida.estado = E`. Stock ya descontado. |
| Devolución | Suma `cantidad_devuelta` a `cantidad`. Registra `MovimientoStock DEVOLUCION`. |
| Ajuste manual | `MovimientoStock AJUSTE` con delta positivo o negativo. |
| Conteo | Si `cantidad_encontrada ≠ cantidad_original` → `AJUSTE_INVENTARIO`. |

### 3.2 Ítems CON número de serie

| Evento | Regla |
|--------|-------|
| Recepción | Crea `SerieItem(estado=disponible)` por cada número. Suma stock. |
| Reserva para Guía | `SerieItem.estado = reservada`. Vincula `item_guia_salida`. |
| Entrega / Despacho | `SerieItem.estado = despachada`. No se puede re-reservar. |
| Devolución | `SerieItem.estado = devuelta`. Retorno a `disponible` solo por flujo explícito. |
| Unicidad | `UniqueConstraint(serie, empresa)` — no puede haber dos series iguales por empresa. |

### 3.3 Transiciones de estado de GuiaSalida

```
P → ER → FR → ET → E → T    (flujo normal)
P → R                        (reversión antes de firma)
PR                           (parcialmente revertida)
```

- Rollback de stock permitido SOLO si estado NO es `ET`, `E`, `T`.
- `T` (Terminada) es terminal — no revertible.

---

## 4. Eventos Auditables

| Evento | Modelo | Disparador | Actor | Datos |
|--------|--------|-----------|-------|-------|
| Entrada de stock | `MovimientoStock` | tipo=ENTRADA | Bodeguero | cantidad, origen (OC/Compra), usuario |
| Salida de stock | `MovimientoStock` | tipo=SALIDA | Sistema | cantidad, guía, usuario |
| Devolución | `MovimientoStock` | tipo=DEVOLUCION | Técnico/Bodeguero | cantidad, guía origen, usuario |
| Ajuste manual | `MovimientoStock` | tipo=AJUSTE | Admin | delta, descripción, usuario |
| Ajuste de inventario | `MovimientoStock` | tipo=AJUSTE_INVENTARIO | Bodeguero | delta, toma inventario |
| Cambio de estado serie | `SerieItem` | campo estado | Sistema | estado anterior→nuevo, guía |
| Cambio de estado GuiaSalida | `ModeloBaseHistorico` | campo estado | Usuario/Sistema | estado anterior→nuevo |
| Recepción OC | `OrdenCompra` | estado 4/5 | Bodeguero | ítems recibidos, diferencias |
| Cierre de toma inventario | `EstadoTomaInventario` | estado=cerrado | Bodeguero | diferencias encontradas |

---

## 5. Precondiciones y Restricciones

1. **No se puede despachar** sin transición `ER → FR → ET`.
2. **No se puede reservar una serie** que ya esté `reservada` o `despachada`.
3. **No se puede ajustar stock** por debajo de cero (pendiente de validación explícita en código).
4. **OC en Borrador** no genera stock — solo a partir de estado `Aprobada (1)`.
5. **Consumo directo** (`OrdenCompra.consumo_directo = True`) — ítems no ingresan a bodega; flujo alternativo a documentar.
6. **Toma de inventario activa** — mientras está `en_proceso`, los ajustes manuales deben ser bloqueados o alertados.

---

## 6. Deuda Técnica Priorizada (para Fases siguientes)

| ID | Problema | Impacto | Fase sugerida |
|----|----------|---------|---------------|
| DT-01 | OneToOne `ItemEmpresa↔StockItemEnBodega` impide multi-bodega | Alta | Fase 1 |
| DT-02 | JSONField legacy `numeros_serie` en `ItemOrdenCompraEnStock` / `ItemsGuiaSalida` | Media | Fase 1 |
| DT-03 | Señal OC dispara stock en estado `Aprobada`, no `Completada/Recibida` | Media | Fase 1 |
| DT-04 | Devolución de series no tiene flujo documentado de retorno a `disponible` | Baja | Fase 2 |
| DT-05 | `estado_derivado` de OC Agrupada no persistido | Baja | Fase 3 |
