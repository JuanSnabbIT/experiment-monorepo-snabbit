# Auditoría flujo de ítems en bodega y series de ítems

Issue: #37  
Fecha: 2026-04-20  
Alcance revisado: `backend/bodegas`, integración con `items`, `ordentrabajov2`, `recursos`

## Resumen ejecutivo

El módulo de bodega sí tiene un flujo funcional para **recepción**, **reserva/salida por guía**, **devoluciones** y **ajustes/inventario**, además de una migración en curso para pasar de series en JSON a un modelo relacional (`SerieItem`).

Pero la auditoría muestra varios riesgos estructurales:

1. **El stock está modelado como `OneToOne` entre item y stock**, lo que en la práctica impide que un mismo ítem exista en más de una bodega a la vez.
2. **No existe un flujo explícito de traslado entre bodegas**. Solo hay referencias a `bodega_temporal` durante recepción, pero no una transferencia formal origen → destino con trazabilidad propia.
3. **La serialización está en transición y opera en dual-write** (`SerieItem` + JSON legacy), lo que mantiene compatibilidad pero deja riesgo de divergencia.
4. **Hay operaciones de stock con semántica inconsistente**, especialmente en ajuste manual, donde el código parece sobrescribir saldo en vez de aplicar delta.
5. **La salida de stock ocurre al agregar a la guía**, no al aprobar/entregar la guía. Luego la aprobación solo libera `cantidad_no_disponible`. Esto puede ser válido como diseño, pero hoy mezcla “reserva” con “salida efectiva” y complica la trazabilidad conceptual.

## 1. Modelo actual de bodega

## Entidades principales

### `Bodega`
Representa una bodega asociada a una sucursal.

### `StockItemEnBodega`
Representa el stock de un ítem en una bodega.
Campos clave:
- `bodega`
- `item`
- `cantidad`
- `cantidad_no_disponible`
- `pmp`

### `MovimientoStock`
Bitácora de movimientos. Registra:
- `tipo_movimiento`
- `cantidad`
- `descripcion`
- `usuario`
- `origen` genérico (`ItemOrdenCompraEnStock`, `ItemsGuiaSalida`, `ItemEnTomaInventario`)

### `GuiaSalida` / `ItemsGuiaSalida`
Canal principal para reservar y despachar stock hacia cliente/OT.

### `ItemOrdenCompraEnStock`
Puente entre recepción de compra/OC y stock disponible. También mantiene `numeros_serie` legacy en JSON.

### `SerieItem`
Modelo nuevo de series, con estados:
- `disponible`
- `reservada`
- `despachada`
- `devuelta`

## Observación estructural crítica

En `StockItemEnBodega`, el campo `item` está definido como:

```python
item = models.OneToOneField("items.ItemEmpresa", on_delete=models.CASCADE)
```

Esto significa que **un `ItemEmpresa` solo puede tener un `StockItemEnBodega` en todo el sistema**, no uno por bodega.

### Impacto
- Impide stock distribuido real por múltiples bodegas.
- El código compensa esto con validaciones tipo “si existe en otra bodega, error”.
- Muchos flujos están diseñados alrededor de esta restricción, no de una verdadera multibodega.

### Riesgo
Muy alto. Es probablemente la principal limitación funcional del módulo.

### Recomendación
Migrar a unicidad compuesta `(bodega, item)` en vez de `OneToOneField`.

---

## 2. Flujo actual de ingreso a bodega

## Orígenes de ingreso detectados

### A. Recepción desde Orden de Compra
Vías principales:
- `OrdenCompraViewSet.completar_orden_compra`
- `recepcionar_oc_y_crear_guia()`

### Flujo
1. Se obtiene o crea `ItemOrdenCompraEnStock` para cada `ItemEnOrdenCompra` mediante signal.
2. Durante la recepción se define una `bodega_temporal` por ítem.
3. Se obtiene o crea `StockItemEnBodega`.
4. Se vincula `ItemOrdenCompraEnStock.stock_item`.
5. Se registra `registrar_entrada(...)`.
6. En algunos casos además se genera guía de salida desde la OC.

### Hallazgos
- Hay soporte para recepción parcial y completa.
- La trazabilidad de ingreso queda en `MovimientoStock(tipo='ENTRADA')` con origen `ItemOrdenCompraEnStock`.
- El sistema exige una sola bodega de recepción para `completar_y_crear_guia`.

### Riesgos
- La recepción depende de que exista `ItemOrdenCompraEnStock`; si no está, falla.
- `bodega_temporal` actúa más como “destino de recepción” que como ubicación transitoria real.
- No hay una abstracción formal de “recepción de mercadería” separada de compra/OC.

### B. Compra directa
En `CompraViewSet.completar_compra` se crea/obtiene stock y se registra `ENTRADA`.

### Riesgo
Hay duplicidad conceptual entre ingreso por compra y por orden de compra, con lógicas parecidas pero separadas.

---

## 3. Flujo actual de salida / consumo / reserva

## Salida mediante guía de salida

Punto principal: `GuiaSalidaViewSet.agregar_item`

### Flujo real
1. Se selecciona `stock_item`.
2. Se valida cantidad disponible (`stock_item.cantidad`).
3. Se crea `ItemsGuiaSalida`.
4. Se incrementa `cantidad_no_disponible`.
5. Se llama `registrar_salida(...)`.
6. `registrar_salida` reduce inmediatamente `stock_item.cantidad`.

### Consecuencia importante
La “salida” contable del stock ocurre **al agregar a la guía**, no al aprobar o entregar.

### Después, en `aprobar_guia`
- Se valida que la guía tenga items.
- Se valida que los serializados tengan serie asignada.
- Solo se reduce `cantidad_no_disponible`.
- **No se vuelve a registrar salida**, porque ya fue registrada antes.

### Lectura funcional
Hoy el sistema trata “agregar a guía” como una salida efectiva del stock y usa `cantidad_no_disponible` como reserva/compromiso mientras la guía aún no se firma.

### Riesgos
- Conceptualmente mezcla dos eventos distintos: reservar y despachar.
- Si una guía queda pendiente mucho tiempo, el stock ya desapareció de `cantidad`, aunque todavía no exista entrega confirmada.
- Obliga a usar devoluciones/signal para “deshacer” una guía pendiente.

### Recomendación
Definir explícitamente uno de estos modelos:

#### Opción recomendada
- **Reserva** al agregar a guía: solo aumenta `cantidad_no_disponible`.
- **Salida efectiva** al aprobar/entregar: recién ahí baja `cantidad` y se registra `SALIDA`.

#### Opción alternativa
Mantener el diseño actual, pero renombrar/explicar mejor el concepto: “agregar a guía” equivale a “egreso comprometido” y no solo a borrador.

---

## 4. Flujo de devolución

## Devolución desde guía
Detectado en:
- `devolver_items`
- `confirmar_recepcion`
- signal `pre_delete` de `ItemsGuiaSalida`
- devolución desde `recursos/views.py`

### Comportamiento
- La devolución usa `registrar_devolucion(...)`, que suma nuevamente a `stock_item.cantidad`.
- Si había serie, se libera mediante `liberar_serie(...)`.
- Para equipos, además puede eliminar o desvincular `Equipo`.

### Fortalezas
- Hay bastante esfuerzo por mantener trazabilidad con movimiento y liberación de serie.
- La eliminación de guía pendiente tiene tests explícitos y signal dedicado.

### Riesgos
- Parte de la reversión está en views y parte en signals, lo que reparte reglas críticas entre varios puntos.
- Si en el futuro alguien elimina o modifica `ItemsGuiaSalida` por otro camino, depende de que el signal siga siendo suficiente.

### Recomendación
Centralizar la reversión de guía/item guía en un servicio transaccional explícito y dejar el signal solo como red de seguridad, no como regla principal.

---

## 5. Flujo de ajustes e inventario

## Toma de inventario
Existe un flujo de toma con:
- `TomaInventario`
- `ItemEnTomaInventario`
- `EstadoTomaInventario`
- `registrar_ajuste_inventario`

Esto da una base razonable para ajustes por conteo físico.

## Ajuste manual
En `MovimientoStockViewSet.crear_ajuste` se documenta:
- “La cantidad puede ser positiva o negativa”
- “Registra un movimiento tipo AJUSTE sobre un stock existente”

Pero el código hace:

```python
StockItemEnBodega.objects.filter(pk=stock_item.pk).update(cantidad=qty_change)
```

Eso **no aplica un delta**, sino que fija el saldo al valor de `qty_change`.

### Riesgo
Muy alto. Si el endpoint se usa pensando que `cantidad=+5` suma 5, en realidad deja el stock en 5.

### Recomendación
Corregir la semántica de inmediato:
- o el endpoint recibe `cantidad_delta` y aplica `F("cantidad") + delta`
- o recibe `nuevo_saldo` y se renombra/documenta así

Hoy la documentación y la implementación están desalineadas.

---

## 6. Flujo de traslado entre bodegas

## Hallazgo principal
No se encontró un flujo formal de traslado entre bodegas con:
- documento o entidad de traslado,
- movimiento doble salida/entrada,
- estado de tránsito,
- validación de recepción en destino,
- trazabilidad de series por traslado.

Lo más cercano es:
- `bodega_temporal` en `ItemOrdenCompraEnStock`
- validaciones para elegir una bodega de recepción

### Conclusión
**Actualmente no parece existir un traslado de bodega propiamente tal.**

### Riesgo
- Si negocio espera multibodega, hoy no hay un circuito claro para mover stock entre ubicaciones.
- Esto además está limitado por el `OneToOneField` de stock.

### Recomendación
Crear un flujo explícito de traslado con:
- cabecera de traslado
- detalle por ítem/serie
- salida en origen
- recepción en destino
- estado en tránsito
- historial de series trasladadas

---

## 7. Estado actual del manejo de series

## Modelo actual
La serialización está en transición:
- **SSOT declarada:** `SerieItem`
- **Legacy mantenido:** `ItemOrdenCompraEnStock.numeros_serie` (JSON)

`bodegas/series.py` centraliza la operación y hace dual-write.

## Capacidades observadas
- agregar serie a stock
- eliminar serie disponible
- reservar serie para un `ItemsGuiaSalida`
- liberar serie
- listar series disponibles
- fallback legacy si la serie existe solo en JSON

## Flujo típico de serie
1. La serie existe o se crea en stock.
2. Si el item va a guía serializada, se reserva para `ItemsGuiaSalida`.
3. El `item_guia.numero_serie` guarda JSON simple con serie/modelo/object_id.
4. Si se revierte o devuelve, la serie se libera.

## Fortalezas
- Existe un modelo relacional correcto (`SerieItem`).
- Hay tests para muchas regresiones de series.
- Se agregaron locks (`select_for_update`) en puntos sensibles.

## Riesgos e inconsistencias

### 7.1. Dual-write prolongado
Mantener `SerieItem` y JSON legacy sincronizados aumenta riesgo de divergencia.

### 7.2. Estados no completamente usados
El ciclo documentado de `SerieItem` habla de `despachada` y `devuelta`, pero en el código revisado domina sobre todo:
- `disponible`
- `reservada`
- `devuelta`

No quedó claro un punto único donde una serie pase formalmente a `despachada` al confirmar entrega.

### 7.3. Auto-creación de series desde guía
En `actualizar_serie`, si la serie no existe en stock, se crea automáticamente:

```python
if not serie_existe_en_stock(stock_item, serie):
    agregar_serie_a_stock(qs_oc.first(), serie)
```

### Riesgo
Esto permite que una serie “nazca” durante el despacho aunque no haya sido recepcionada/inventariada previamente.

### Recomendación
Restringirlo o auditarlo mejor. Idealmente:
- permitirlo solo con permiso especial,
- o registrarlo como excepción controlada,
- o exigir alta de serie previa en recepción.

### 7.4. Fuente de serialización implícita
No vi un flag fuerte en `ItemEmpresa` como `requiere_serie` o `es_serializable`.
La detección actual es práctica: “si el stock tiene series disponibles, el item se trata como serializable”.

### Riesgo
La serialización depende del estado del stock, no de una regla maestra del producto.

### Recomendación
Agregar atributo explícito en catálogo de ítems:
- serializable sí/no
- loteable sí/no
- equipo sí/no

---

## 8. Lotes

## Hallazgo
No se detectó un modelo formal de lotes. El alcance pedido menciona “series/lotes”, pero el código revisado implementa claramente **series**, no un sistema de lotes.

### Conclusión
- Hay manejo de números de serie.
- No hay un manejo formal equivalente para lotes, vencimientos o partidas.

### Recomendación
Si negocio necesita lotes, eso hoy sería una capacidad faltante, no solo documentación pendiente.

---

## 9. Riesgos de integridad y trazabilidad detectados

## Riesgo 1, multibodega bloqueada por diseño
**Severidad: alta**  
`StockItemEnBodega.item` como `OneToOneField` impide stock del mismo ítem en más de una bodega.

## Riesgo 2, ajuste manual con posible bug semántico
**Severidad: alta**  
`crear_ajuste` parece sobrescribir saldo en vez de aplicar delta.

## Riesgo 3, ausencia de traslado formal
**Severidad: alta**  
No hay flujo explícito de traslado entre bodegas.

## Riesgo 4, dual-write de series
**Severidad: media-alta**  
Convivencia `SerieItem` + JSON legacy puede divergir.

## Riesgo 5, salida de stock anticipada en guía pendiente
**Severidad: media-alta**  
La salida se registra al agregar el item a la guía, antes de aprobación/entrega.

## Riesgo 6, serialización inferida por stock y no por catálogo
**Severidad: media**  
No hay una política maestra por tipo de ítem.

## Riesgo 7, creación tardía de series en despacho
**Severidad: media**  
Permite introducir series no recepcionadas previamente.

## Riesgo 8, lógica crítica dispersa entre views, functions y signals
**Severidad: media**  
Dificulta mantener consistencia y auditar fácilmente.

---

## 10. Recomendaciones concretas

## Prioridad 1
1. **Rediseñar `StockItemEnBodega` para soportar `(bodega, item)`**.
2. **Corregir `crear_ajuste`** para que la semántica coincida con su API.
3. **Definir explícitamente cuándo ocurre la salida real de stock**: al reservar o al entregar.

## Prioridad 2
4. **Diseñar flujo formal de traslado entre bodegas** con trazabilidad y soporte para series.
5. **Declarar serialización a nivel de catálogo de ítem**, no inferirla solo por series existentes.
6. **Endurecer alta de series** para que idealmente ocurra en recepción, no en despacho.

## Prioridad 3
7. **Retirar progresivamente el JSON legacy `numeros_serie`** y dejar `SerieItem` como única fuente de verdad.
8. **Concentrar reglas críticas de stock/series en un servicio de dominio** y reducir dependencia de lógica repartida en views/signals.
9. **Agregar auditoría funcional de lotes** si el negocio realmente requiere lote/vencimiento, porque hoy no aparece implementado.

---

## 11. Resumen corto por entregable solicitado

## Resumen del flujo actual de bodega
- Ingreso principal por compra y orden de compra.
- El stock se registra en `StockItemEnBodega` y movimientos en `MovimientoStock`.
- Las guías de salida son el mecanismo principal de reserva/salida.
- Las devoluciones reingresan stock y pueden liberar series.
- Hay toma de inventario y ajuste manual.
- No se detectó traslado formal entre bodegas.

## Resumen del flujo de series/números de serie
- Las series se manejan principalmente con `SerieItem`.
- Persiste compatibilidad con JSON legacy en `ItemOrdenCompraEnStock.numeros_serie`.
- Las series se pueden agregar, reservar, liberar y listar.
- La guía serializada usa `ItemsGuiaSalida.numero_serie` como referencia puntual.
- Existe riesgo porque aún conviven modelo relacional y JSON.

## Lista de riesgos, inconsistencias o dudas
- Stock de un item parece restringido a una sola bodega por diseño.
- Ajuste manual con semántica dudosa o incorrecta.
- No hay traslado formal entre bodegas.
- Reserva y salida están mezcladas en guía.
- No hay política explícita de serialización por item.
- Las series pueden crearse al despachar.
- No se observó soporte formal de lotes.

## Recomendaciones concretas
- Habilitar stock por `(bodega, item)`.
- Corregir ajuste manual.
- Separar reserva de despacho efectivo.
- Implementar traslado formal.
- Consolidar `SerieItem` como SSOT única.
- Agregar flag de serialización en catálogo.
- Evaluar implementación formal de lotes si el negocio lo necesita.
