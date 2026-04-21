# Fase 1, Modelo canónico de inventario y ciclo de vida de series
> Issue #42 | Plan de referencia: issue #40 | Depende de: issue #41

---

## 1. Propósito del documento

Este documento define el **modelo canónico funcional y técnico** para inventario, stock y series en ERP Snabbit.

Su objetivo es dejar una base explícita antes de introducir validaciones, migraciones y reglas de trazabilidad más estrictas.

El documento reemplaza el enfoque previo de “alineación funcional” de Fase 0 como artefacto principal de este PR.

En esta fase se documenta:

- la unidad canónica de stock,
- la unidad canónica de serie,
- la relación entre bodega, ubicación e ítem,
- el ciclo de vida propuesto de series,
- los mapeos desde estados legacy actuales,
- las transiciones permitidas y prohibidas,
- la definición de unicidad,
- la deuda de esquema detectada en el código actual,
- y los contratos de datos mínimos para implementar validaciones en fases posteriores.

---

## 2. Alcance

Este documento cubre el dominio inventario en los módulos y artefactos actualmente observables del repositorio:

- `backend/bodegas/models.py`
- `backend/bodegas/series.py`
- `backend/bodegas/signals.py`
- `backend/bodegas/movimientos.py`
- `backend/ordentrabajo/views.py`
- `backend/ordentrabajov2/functions.py`
- `backend/ordentrabajov3/views.py`
- `backend/recursos/tests.py`
- `backend/bodegas/tests.py`

No implementa todavía la migración completa del modelo. Define la propuesta canónica que debe guiar esa implementación.

---

## 3. Resumen ejecutivo

### 3.1 Hallazgos más importantes del estado actual

1. **La entidad física de stock ya existe**, pero está incompleta para multi-bodega y para trazabilidad más fina.
2. **La entidad de serie ya existe** en `SerieItem`, pero su modelo de estados actual es más corto que el requerido por el issue.
3. **Conviven fuentes duplicadas de verdad** para series:
   - `SerieItem`
   - `ItemOrdenCompraEnStock.numeros_serie` como JSON legacy
   - `ItemsGuiaSalida.numero_serie` como snapshot operativo
4. **El stock actual se modela por bodega e ítem**, pero no por ubicación interna.
5. **`StockItemEnBodega.item` es `OneToOneField`**, lo que impide representar un mismo ítem en múltiples bodegas de la misma empresa.
6. **Las salidas reservan y rebajan stock al mismo tiempo**, lo que mezcla “reserva lógica” con “salida física” en varios flujos.
7. **Los estados actuales de serie (`disponible`, `reservada`, `despachada`, `devuelta`) no distinguen claramente tránsito, venta y bloqueo operativo**.

### 3.2 Decisión canónica propuesta

Se propone que el modelo canónico de Fase 1 quede así:

- **Stock canónico**: por `empresa + bodega + ubicación + item`.
- **Serie canónica**: registro individual por número de serie, asociado a un contexto de stock y a una empresa.
- **Estados canónicos de serie**:
  - `available`
  - `reserved`
  - `in_transit`
  - `sold`
  - `returned`
  - `blocked`
- **Unicidad canónica de serie**: única por `empresa + serie`, con posibilidad de normalización del valor para evitar duplicados por formato.
- **Fuente de verdad primaria para series**: `SerieItem` o su evolución, nunca el JSON legacy.
- **JSON legacy**: compatibilidad transitoria, no contrato canónico.

### 3.3 Mapeo recomendado con terminología actual en español

Como el código actual usa nombres en español, se recomienda documentar y eventualmente implementar un alias semántico:

- `available` ↔ `disponible`
- `reserved` ↔ `reservada`
- `in_transit` ↔ `en_transito`
- `sold` ↔ `vendida`
- `returned` ↔ `devuelta`
- `blocked` ↔ `bloqueada`

Durante transición técnica, el contrato de negocio debe hablar en la nomenclatura canónica del issue, aunque el código legacy todavía use `despachada` o `disponible`.

---

## 4. Estado actual observado en código

## 4.1 Modelo de bodega

En `backend/bodegas/models.py` existe:

- `Bodega`
- vinculada a `SucursalEmpresa`
- y, por extensión, a `Empresa`

Esto permite identificar el contenedor operativo principal del stock, pero no resuelve ubicación interna.

### Observación

La bodega ya cumple como dimensión logística principal.

### Limitación

No existe un modelo explícito de `UbicacionBodega`, `Rack`, `Pasillo`, `Zona`, `Bin` o equivalente.

### Conclusión

El estado actual soporta stock por bodega, no por ubicación dentro de la bodega.

---

## 4.2 Modelo de stock actual

En `backend/bodegas/models.py`, `StockItemEnBodega` hoy contiene:

- `bodega`
- `item`
- `cantidad`
- `cantidad_no_disponible`
- `pmp`

### Lectura funcional actual

- `cantidad` representa existencias contables disponibles en ese registro.
- `cantidad_no_disponible` representa unidades reservadas o inmovilizadas operativamente.
- el stock se identifica hoy, en la práctica, por la pareja `bodega + item`.

### Problema estructural

`item = models.OneToOneField("items.ItemEmpresa", ...)`

Esto significa que un `ItemEmpresa` solo puede tener **un** `StockItemEnBodega` en toda la base.

### Implicancia

El modelo actual contradice un escenario normal de ERP donde el mismo ítem puede existir simultáneamente en:

- bodega central,
- bodega regional,
- bodega cliente,
- bodega temporal,
- bodega de devolución,
- bodega de tránsito,
- o múltiples ubicaciones dentro de una misma red.

### Conclusión

El `OneToOneField` actual debe considerarse **deuda técnica crítica** y no parte del modelo canónico.

---

## 4.3 Modelo de serie actual

En `backend/bodegas/models.py`, `SerieItem` actualmente contiene:

- `serie`
- `stock_item`
- `item_orden_compra_en_stock`
- `item_guia_salida`
- `empresa`
- `estado`

Con choices actuales:

- `disponible`
- `reservada`
- `despachada`
- `devuelta`

### Fortalezas del modelo actual

1. Ya existe un registro relacional por serie.
2. Ya existe unicidad por `serie + empresa`.
3. Ya existe vínculo a stock.
4. Ya existe vínculo a compra/ingreso origen.
5. Ya existe vínculo a guía de salida cuando la serie está asignada.

### Debilidades del modelo actual

1. No distingue tránsito versus venta/entrega final.
2. No distingue bloqueo operativo de un estado normal del flujo.
3. Usa `despachada`, que mezcla “salió de bodega” con “fue vendida/entregada”.
4. No expresa con claridad si una `devuelta` vuelve a estar disponible o aún requiere inspección.

---

## 4.4 JSON legacy de series en ingreso

`ItemOrdenCompraEnStock.numeros_serie` persiste series como JSON.

Además, `backend/bodegas/series.py` tiene helpers explícitos para sincronizar ese JSON con `SerieItem`:

- `_sync_json_agregar`
- `_sync_json_eliminar`
- `_sync_json_reservar`
- `_sync_json_liberar`
- `_sync_json_liberar_por_item_guia`

### Interpretación

El propio código reconoce que:

- `SerieItem` es la fuente de verdad deseada,
- pero todavía se mantiene dual-write por compatibilidad.

### Riesgo

Toda escritura dual introduce riesgo de divergencia.

### Decisión canónica

El JSON debe quedar fuera del modelo canónico y mantenerse, como máximo, como capa transitoria de backward compatibility.

---

## 4.5 JSON legacy de series en salida

`ItemsGuiaSalida.numero_serie` también persiste una estructura JSON.

Ese dato hoy funciona como snapshot operativo para la guía.

### Lectura funcional

Ese JSON puede seguir siendo útil como evidencia o snapshot del momento de despacho.

### Precaución

No debe interpretarse como la fuente de verdad del ciclo de vida completo de la serie.

### Decisión canónica

La fuente de verdad del estado de una serie debe ser la entidad de serie, no el JSON incrustado en la guía.

---

## 4.6 Señales y momento de creación de stock

En `backend/bodegas/signals.py`, `create_items_in_stock` crea `ItemOrdenCompraEnStock` cuando `OrdenCompra.estado in ("1", "3")`, es decir:

- aprobada
- enviada al proveedor

### Problema

Eso ocurre antes de la recepción física real.

### Impacto conceptual

Se mezclan dos conceptos distintos:

- **compromiso de compra / abastecimiento esperado**
- **stock efectivamente ingresado**

### Decisión canónica

El modelo canónico debe separar:

- documento de compra,
- línea de compra,
- recepción de compra,
- disponibilidad real en stock.

Una compra aprobada no equivale a stock disponible.

---

## 4.7 Reversión de stock al eliminar ítems de guía

En `devolver_stock_al_eliminar_item_guia`, la reversión se permite si la guía no está en:

- `ET`
- `E`
- `T`

### Lectura funcional

La guía tiene su propio estado de proceso.

### Problema

Ese estado de guía no siempre mapea 1:1 con el estado logístico real de cada serie individual.

### Ejemplo

Una guía en `FR` puede tener una serie ya físicamente separada o incluso cargada, pero todavía no en `ET`.

### Decisión canónica

El estado de la serie debe ser la referencia primaria para reglas de re-reserva, bloqueo y devolución.

La guía sigue siendo importante, pero no debe absorber toda la semántica logística.

---

## 4.8 Evidencia de uso de `despachada` y `devuelta`

`backend/recursos/tests.py` usa explícitamente:

- `estado="despachada"`
- luego espera `estado == "devuelta"`

Eso confirma que el dominio actual ya usa una semántica de retorno desde despacho a devolución, pero todavía sin distinguir:

- tránsito,
- entrega final,
- reingreso disponible,
- bloqueo por revisión.

---

## 5. Problema que resuelve el modelo canónico

El issue #42 pide una base previa a validaciones y trazabilidad.

Eso exige resolver cuatro ambigüedades actuales.

### 5.1 Qué significa “tener stock”

Hoy puede significar:

- estar en una OC aprobada,
- existir en `ItemOrdenCompraEnStock`,
- tener `cantidad` en `StockItemEnBodega`,
- o tener una serie creada.

El modelo canónico debe unificar esa interpretación.

### 5.2 Qué significa “serie disponible”

Hoy depende de:

- `SerieItem.estado`,
- el JSON legacy,
- y, en algunos flujos, el estado de la guía.

### 5.3 Qué significa “despachada”

Hoy puede significar:

- reservada para salida,
- físicamente fuera de bodega,
- entregada al técnico,
- entregada al cliente,
- o consumida definitivamente.

### 5.4 Qué significa “devuelta”

Hoy no queda claro si una serie devuelta:

- vuelve a stock utilizable,
- queda pendiente de inspección,
- queda bloqueada,
- o solo registra un hecho histórico.

---

## 6. Modelo canónico propuesto

## 6.1 Principios

1. **Una cosa física, un registro lógico estable.**
2. **Una serie individual no puede depender de un JSON mutable para su verdad principal.**
3. **Reserva no es lo mismo que salida física.**
4. **Salida física no es lo mismo que venta o consumo definitivo.**
5. **Devolución no implica disponibilidad automática.**
6. **Bloqueo debe ser explícito y auditable.**
7. **Las reglas de stock agregado y las reglas de serie individual deben ser consistentes entre sí.**

---

## 6.2 Entidades canónicas

### 6.2.1 Empresa

Contexto de unicidad y tenancy.

### 6.2.2 Bodega

Contenedor logístico principal.

### 6.2.3 Ubicación

Subdivisión interna de una bodega.

Puede ser:

- rack,
- pasillo,
- nivel,
- zona,
- staging,
- cuarentena,
- devolución,
- picking,
- despacho.

### 6.2.4 Ítem

SKU o producto empresarial (`ItemEmpresa`).

### 6.2.5 Stock

Cantidad agregada de un ítem en una ubicación logística determinada.

### 6.2.6 Serie

Unidad individual trazable de un ítem serializado.

---

## 6.3 Clave canónica de stock

La identidad canónica de stock debe ser:

- `empresa_id`
- `bodega_id`
- `ubicacion_id` o `NULL` si aún no se desglosa ubicación
- `item_id`

### Regla

Debe existir a lo sumo un registro de stock por esa combinación.

### Consecuencia

`StockItemEnBodega.item` no puede seguir siendo `OneToOneField` en el modelo objetivo.

### Forma recomendada

`ForeignKey(item)` + `UniqueConstraint(empresa/bodega/ubicacion/item)` o derivado equivalente.

---

## 6.4 Clave canónica de serie

La identidad canónica de una serie debe ser:

- `empresa_id`
- `serie_normalizada`

### Nota

`serie` visible puede conservar formato original.

### Recomendación

Agregar un campo derivado o política de normalización:

- trim de espacios,
- upper-case o política de casefold según negocio,
- remoción opcional de separadores si el negocio así lo decide.

### Decisión base de esta fase

Mientras no exista una política explícita distinta, la unicidad de negocio se mantiene en `empresa + serie`.

---

## 6.5 Modelo canónico de stock agregado

Cada registro de stock debe poder responder, como mínimo, estas preguntas:

- ¿cuántas unidades físicas hay?
- ¿cuántas están disponibles para promesa?
- ¿cuántas están reservadas?
- ¿cuántas están en tránsito interno o externo?
- ¿cuántas están bloqueadas?
- ¿cuántas corresponden a series individuales trazables?

### Propuesta mínima compatible

Mantener temporalmente:

- `cantidad`
- `cantidad_no_disponible`

Pero reinterpretar canónicamente:

- `cantidad_total_fisica`
- `cantidad_disponible`
- `cantidad_reservada`
- `cantidad_bloqueada`
- `cantidad_en_transito`

### Observación

El esquema actual no soporta bien esta descomposición. Por eso esta fase documenta el contrato objetivo, aunque no se implemente por completo todavía.

---

## 6.6 Modelo canónico de serie individual

Una serie debe contener o poder derivar:

- número de serie,
- empresa,
- ítem,
- stock o ubicación actual,
- documento de ingreso origen,
- documento de salida actual o más reciente,
- estado canónico,
- timestamp de último cambio de estado,
- actor o proceso que gatilló la transición,
- motivo cuando aplique,
- flags o atributos de bloqueo/inspección.

---

## 7. Estados canónicos de serie

## 7.1 Lista oficial

Los estados canónicos exigidos por el issue quedan definidos así:

1. `available`
2. `reserved`
3. `in_transit`
4. `sold`
5. `returned`
6. `blocked`

---

## 7.2 Semántica precisa por estado

### 7.2.1 `available`

La serie:

- existe físicamente en inventario,
- está en custodia del sistema o de una bodega válida,
- puede prometerse o asignarse a una salida,
- no está inmovilizada por incidente,
- no está ya comprometida a otra operación activa.

### 7.2.2 `reserved`

La serie:

- fue apartada para una operación específica,
- todavía no se considera entregada ni en tránsito definitivo,
- no puede ser reasignada a otra guía,
- sigue bajo control logístico del inventario de origen.

### 7.2.3 `in_transit`

La serie:

- ya salió del punto de stock disponible,
- está siendo transportada o transferida,
- todavía no debe considerarse consumida o vendida definitivamente,
- puede terminar en entrega, devolución, recepción en otra bodega o incidente.

### 7.2.4 `sold`

La serie:

- ya fue entregada y consumida comercial u operacionalmente,
- no puede volver a prometerse sin un flujo de retorno explícito,
- representa una salida definitiva del inventario utilizable.

### 7.2.5 `returned`

La serie:

- regresó desde un flujo externo o de cliente,
- ya no está en `sold` o `in_transit`,
- pero todavía no se considera automáticamente `available`.

### 7.2.6 `blocked`

La serie:

- existe y puede estar físicamente en bodega o recuperada,
- pero fue inmovilizada por motivo explícito,
- por ejemplo daño, diagnóstico, discrepancia documental, cuarentena, investigación o incompatibilidad.

---

## 7.3 Por qué `blocked` debe ser estado y no solo flag

Se evaluaron dos lecturas:

- bloqueo como atributo ortogonal,
- bloqueo como estado del flujo.

### Recomendación de esta fase

Tratar `blocked` como **estado canónico visible**.

### Justificación

1. El issue lo pide como estado explícito.
2. Facilita reglas de transición claras.
3. Simplifica validaciones de negocio.
4. Permite reportes directos sin combinar lógica adicional.

### Matiz técnico

Aunque el contrato funcional lo trate como estado, el modelo físico puede conservar metadata adicional:

- `blocked_reason`
- `blocked_at`
- `blocked_by`
- `blocked_context`

---

## 8. Mapeo entre estado actual y canónico

## 8.1 Mapeo base

| Estado actual | Estado canónico propuesto | Observación |
|---|---|---|
| `disponible` | `available` | Mapeo directo |
| `reservada` | `reserved` | Mapeo directo |
| `despachada` | `in_transit` o `sold` | Requiere desambiguación por evento de negocio |
| `devuelta` | `returned` | Mapeo directo semántico |

---

## 8.2 Regla crítica para `despachada`

`despachada` no debe migrarse ciegamente a un único estado canónico sin contexto.

### Casos posibles

- si la guía representa salida a técnico o traslado, `despachada` suele equivaler a `in_transit`
- si el flujo ya confirma entrega final o consumo, `despachada` puede equivaler a `sold`

### Decisión de Fase 1

Documentar `despachada` como **estado legacy ambiguo**.

### Regla recomendada

Hasta que exista data suficiente para desambiguar automáticamente:

- `despachada` debe mapearse por defecto a `in_transit`
- y solo pasar a `sold` mediante evento explícito de confirmación de entrega o cierre comercial

Esto reduce el riesgo de marcar como definitiva una salida que aún podría revertirse o devolverse.

---

## 8.3 Regla para `devuelta`

`devuelta` no debe implicar `available` automático.

### Razón

Una devolución puede requerir:

- inspección técnica,
- validación de accesorios,
- diagnóstico,
- reconciliación documental,
- o clasificación de merma/daño.

### Decisión

`returned` es un estado intermedio con salida posible a:

- `available`
- `blocked`

según evaluación posterior.

---

## 9. Transiciones permitidas

## 9.1 Tabla oficial de transiciones permitidas

| Desde | Hacia | Permitida | Justificación |
|---|---|---|---|
| `available` | `reserved` | Sí | Asignación a guía, OT, pedido o retiro |
| `available` | `blocked` | Sí | Hallazgo de daño, discrepancia o cuarentena |
| `reserved` | `available` | Sí | Liberación de reserva antes de salida física |
| `reserved` | `in_transit` | Sí | Salida física efectiva |
| `reserved` | `blocked` | Sí | Incidente detectado antes del despacho |
| `in_transit` | `sold` | Sí | Confirmación de entrega o consumo definitivo |
| `in_transit` | `returned` | Sí | Retorno desde técnico, cliente o transferencia fallida |
| `in_transit` | `blocked` | Sí | Incidente documentado durante traslado |
| `sold` | `returned` | Sí | Flujo de devolución postventa o reingreso excepcional |
| `returned` | `available` | Sí | Reingreso aprobado tras inspección |
| `returned` | `blocked` | Sí | Reingreso con observación o daño |
| `blocked` | `available` | Sí | Desbloqueo aprobado |
| `blocked` | `returned` | Sí | Reclasificación de un bloqueo detectado en devolución |

---

## 9.2 Transiciones prohibidas principales

| Desde | Hacia | Prohibida | Motivo |
|---|---|---|---|
| `available` | `sold` | Sí | Omite reserva y salida física |
| `available` | `returned` | Sí | No puede devolverse algo no salido |
| `reserved` | `sold` | Sí | Debe existir salida física o confirmación intermedia |
| `sold` | `available` | Sí | Debe pasar por retorno explícito |
| `sold` | `reserved` | Sí | Re-reserva sin retorno rompe trazabilidad |
| `returned` | `sold` | Sí | Requiere nueva salida, no salto directo |
| `blocked` | `sold` | Sí | Debe desbloquearse y recorrer flujo válido |
| `blocked` | `reserved` | Sí | Debe resolverse el bloqueo primero |
| `in_transit` | `available` | Sí | Si volvió, debe registrarse como `returned` |

---

## 9.3 Regla de diseño para transiciones

Toda transición debe registrar:

- estado anterior,
- estado nuevo,
- timestamp,
- actor o proceso,
- documento o referencia causal,
- motivo libre si aplica,
- observación estructurada opcional.

---

## 10. Modelo de stock por bodega, ubicación e ítem

## 10.1 Definición funcional

La unidad canónica de stock es la disponibilidad de un `item` en una `ubicación` dentro de una `bodega` para una `empresa`.

---

## 10.2 Dimensiones mínimas

### Empresa

Aísla tenants y unicidad.

### Bodega

Define el recinto o almacén.

### Ubicación

Permite distinguir:

- picking,
- recepción,
- despacho,
- cuarentena,
- devolución,
- rack interno,
- bodega cliente,
- staging de técnico.

### Ítem

Define el SKU o producto.

---

## 10.3 Reglas canónicas del stock agregado

1. Un mismo ítem puede existir en muchas bodegas.
2. Un mismo ítem puede existir en muchas ubicaciones de una misma bodega.
3. Una serie individual debe poder mapearse a un stock agregado compatible.
4. El stock serializado no debe contradecir el conteo agregado.
5. La suma de series utilizables debe ser consistente con el stock disponible del ítem serializado.

---

## 10.4 Lectura recomendada para ítems serializados

Para ítems serializados, el stock agregado debe derivarse o reconciliarse con el universo de series.

### Regla recomendada

- `cantidad_total_fisica` = número de series físicamente presentes en ese contexto
- `cantidad_disponible` = número de series en `available`
- `cantidad_reservada` = número de series en `reserved`
- `cantidad_en_transito` = número de series en `in_transit`
- `cantidad_bloqueada` = número de series en `blocked`
- `cantidad_retorno` = número de series en `returned`

### Nota

Si el sistema mantiene ambas representaciones, debe haber controles de reconciliación.

---

## 10.5 Lectura recomendada para ítems no serializados

Para ítems no serializados, el stock agregado sigue siendo la representación principal.

En ese caso:

- `available` y `reserved` se representan por cantidades,
- no por series individuales.

---

## 11. Contrato canónico de serie

## 11.1 Campos mínimos esperados

A nivel funcional, cada serie debe disponer de:

- `id`
- `empresa_id`
- `item_id`
- `stock_context_id`
- `serie`
- `serie_normalizada`
- `estado`
- `origen_tipo`
- `origen_id`
- `documento_salida_actual_tipo`
- `documento_salida_actual_id`
- `motivo_estado`
- `bloqueada_por_id`
- `fecha_estado`
- `created_at`
- `updated_at`

---

## 11.2 Contrato mínimo JSON de lectura recomendado

```json
{
  "id": 123,
  "empresa_id": 10,
  "item_id": 55,
  "stock_context": {
    "bodega_id": 3,
    "ubicacion_id": null
  },
  "serie": "SN-ABC-001",
  "serie_normalizada": "SN-ABC-001",
  "estado": "available",
  "origen": {
    "tipo": "item_orden_compra_en_stock",
    "id": 900
  },
  "documento_actual": {
    "tipo": null,
    "id": null
  },
  "motivo_estado": null,
  "blocked_reason": null,
  "fecha_estado": "2026-04-20T00:00:00Z"
}
```

---

## 11.3 Contrato mínimo JSON de transición recomendado

```json
{
  "serie_id": 123,
  "from": "reserved",
  "to": "in_transit",
  "trigger": "confirmacion_salida",
  "actor_id": 77,
  "documento": {
    "tipo": "item_guia_salida",
    "id": 456
  },
  "motivo": "Despacho hacia cliente",
  "metadata": {
    "guia_id": 98
  }
}
```

---

## 12. Reglas de negocio del ciclo de vida

## 12.1 Recepción

### Para item serializado

- al recibir físicamente, se crea la serie,
- el estado inicial debe ser `available`,
- no `reserved`,
- no `in_transit`,
- no `sold`.

### Para item no serializado

- aumenta stock agregado disponible.

---

## 12.2 Reserva

La reserva:

- separa la serie o cantidad para un flujo específico,
- impide doble promesa,
- pero no equivale todavía a entrega final.

### Regla

No se puede reservar una serie si está en:

- `reserved`
- `in_transit`
- `sold`
- `returned`
- `blocked`

Solo se puede reservar desde `available`.

---

## 12.3 Salida física

Cuando la serie deja la disponibilidad de la bodega origen, debe pasar a `in_transit`.

### Regla

La transición a `in_transit` requiere referencia documental o de proceso.

Ejemplos válidos:

- guía de salida,
- transferencia,
- entrega a técnico,
- retiro por logística.

---

## 12.4 Confirmación final

Una serie pasa a `sold` solo cuando el negocio confirma que la salida es definitiva.

### Ejemplos

- entrega al cliente confirmada,
- consumo definitivo en OT,
- cierre comercial sin retorno esperado.

---

## 12.5 Devolución

Una serie pasa a `returned` cuando vuelve desde:

- cliente,
- técnico,
- traslado fallido,
- préstamo,
- operación reversada.

### Regla

`returned` no habilita reventa o reuso automático.

---

## 12.6 Bloqueo

Una serie pasa a `blocked` cuando hay una razón explícita de inmovilización.

### Motivos típicos

- daño físico,
- inconsistencia documental,
- serie ilegible,
- investigación de pérdida,
- cuarentena,
- incompatibilidad técnica,
- auditoría pendiente.

---

## 13. Reglas de transición permitidas y prohibidas, en forma normativa

## 13.1 Normas permitidas

### Norma P1

`available -> reserved` es válida si existe una referencia operativa activa.

### Norma P2

`reserved -> available` es válida solo si la reserva fue liberada antes de la salida efectiva.

### Norma P3

`reserved -> in_transit` es válida cuando la serie abandona la disponibilidad del stock origen.

### Norma P4

`in_transit -> sold` es válida solo con confirmación de entrega o consumo definitivo.

### Norma P5

`in_transit -> returned` es válida cuando hay reingreso desde el flujo externo.

### Norma P6

`sold -> returned` es válida solo con un flujo formal de devolución.

### Norma P7

`returned -> available` es válida solo después de inspección y aprobación.

### Norma P8

`available -> blocked`, `reserved -> blocked`, `in_transit -> blocked` y `returned -> blocked` son válidas con motivo explícito.

### Norma P9

`blocked -> available` es válida solo cuando se resuelve el motivo de bloqueo.

---

## 13.2 Normas prohibidas

### Norma X1

`available -> sold` está prohibida.

### Norma X2

`reserved -> sold` está prohibida.

### Norma X3

`sold -> available` está prohibida.

### Norma X4

`blocked -> reserved` está prohibida.

### Norma X5

`returned -> sold` está prohibida.

### Norma X6

`in_transit -> available` está prohibida.

### Norma X7

Cualquier transición a sí mismo como “evento de negocio” está prohibida salvo que se registre como no-op técnico explícito y no cuente como transición.

---

## 14. Definición de unicidad por contexto de negocio

## 14.1 Regla principal

La serie debe ser única por empresa.

### Forma actual observada

Ya existe `UniqueConstraint(fields=["serie", "empresa"], name="uniq_serie_por_empresa")`.

### Decisión

Esa definición se mantiene como base canónica de Fase 1.

---

## 14.2 Qué significa “por contexto de negocio”

En este sistema, el contexto de negocio relevante no es la bodega sino la empresa tenant.

### Por qué

Una misma empresa puede mover la serie entre bodegas sin que deje de ser el mismo activo físico.

Si la unicidad fuese por bodega:

- permitiría duplicados imposibles dentro de una misma empresa,
- complicaría transferencias,
- y rompería trazabilidad transversal.

---

## 14.3 Consideración multi-empresa

Dos empresas distintas sí podrían, en teoría, tener la misma serie textual.

### Ejemplo

- empresa A registra una serie heredada del fabricante
- empresa B también la registra en otro tenant

### Decisión

La unicidad canónica es por tenant, no global del sistema.

---

## 14.4 Riesgo de formato

La unicidad actual puede no cubrir variantes como:

- `abc-123`
- `ABC-123`
- ` ABC-123 `

### Recomendación

Agregar normalización antes de validar o persistir.

---

## 15. Ajustes de esquema recomendados

## 15.1 Ajuste A, stock multi-bodega real

### Actual

`StockItemEnBodega.item = OneToOneField`

### Propuesto

`ForeignKey(item)`

### Restricción nueva sugerida

`UniqueConstraint(bodega, ubicacion, item)` o variante equivalente.

### Impacto

Habilita multi-bodega y futura multi-ubicación.

---

## 15.2 Ajuste B, ubicación explícita

### Actual

No existe entidad de ubicación.

### Propuesto

Crear `UbicacionBodega` o modelo equivalente.

### Campos mínimos sugeridos

- `bodega_id`
- `codigo`
- `nombre`
- `tipo`
- `activa`

---

## 15.3 Ajuste C, serie con estados canónicos completos

### Actual

Choices:

- `disponible`
- `reservada`
- `despachada`
- `devuelta`

### Propuesto

Choices canónicos en capa de dominio:

- `available`
- `reserved`
- `in_transit`
- `sold`
- `returned`
- `blocked`

### Alternativa de transición suave

Mantener etiquetas internas en español, pero exponer y documentar equivalencia estable con el contrato canónico.

---

## 15.4 Ajuste D, metadata de bloqueo

Agregar campos o estructura equivalente:

- `blocked_reason`
- `blocked_by`
- `blocked_at`
- `blocked_notes`

---

## 15.5 Ajuste E, historial de transiciones

Agregar una entidad de historial o aprovechar simple-history con semántica explícita.

### Recomendación funcional

Debe existir un registro consultable de transiciones de serie, no solo el último estado.

---

## 15.6 Ajuste F, eliminación progresiva de JSON legacy

### Actual

- `ItemOrdenCompraEnStock.numeros_serie`
- `ItemsGuiaSalida.numero_serie`

### Propuesta

- mantener solo lectura o snapshot temporal,
- migrar escrituras a entidad relacional,
- planear retiro del dual-write.

---

## 16. Contratos de datos mínimos necesarios

## 16.1 Para consulta de stock por ítem

El backend debería poder exponer:

- empresa
- bodega
- ubicación
- item
- cantidad total
- cantidad disponible
- cantidad reservada
- cantidad en tránsito
- cantidad bloqueada
- cantidad retornada
- serializado sí/no

---

## 16.2 Para consulta de series por stock

El backend debería poder exponer:

- serie
- estado
- item
- bodega
- ubicación
- documento origen
- documento salida actual
- fecha último cambio
- motivo

---

## 16.3 Para transición de estado

El backend debe exigir:

- serie o series afectadas,
- estado origen esperado cuando se requiera control optimista,
- estado destino,
- actor,
- motivo,
- documento de soporte.

---

## 17. Relación entre stock agregado y series

## 17.1 Regla de consistencia fuerte

Si un ítem es serializado, el conteo agregado no puede contradecir la cardinalidad de series por estado.

### Ejemplo

Si hay 10 series del ítem en una bodega y:

- 6 están `available`
- 2 `reserved`
- 1 `blocked`
- 1 `returned`

Entonces el agregado debe poder reconciliar eso.

---

## 17.2 Regla de consistencia operativa

Una serie `available` debe pertenecer a un contexto de stock que la soporte como disponible.

Una serie `in_transit` no debería seguir contándose como disponible en la bodega de origen.

---

## 18. Reglas específicas para guía de salida

## 18.1 Reserva en guía

Cuando un `ItemsGuiaSalida` individualiza una serie:

- la serie debería entrar a `reserved`,
- no directamente a `sold`.

Eso ya es parcialmente consistente con el modelo actual.

---

## 18.2 Confirmación de salida

El momento en que hoy se registra `SALIDA` en movimiento debe revisarse conceptualmente.

### Riesgo actual

En varios flujos se descuenta stock al agregar el ítem a la guía, no al confirmar salida física.

### Recomendación

Separar al menos a nivel de dominio:

- reserva,
- salida efectiva,
- entrega final.

---

## 18.3 Estado de guía versus estado de serie

La guía puede seguir teniendo sus estados propios:

- `P`
- `ER`
- `FR`
- `ET`
- `E`
- `T`
- `R`
- `PR`

Pero esos estados no reemplazan el ciclo individual de la serie.

### Regla

La serie debe poder estar en un estado canónico derivado por evento, no solo por el estado macro de la guía.

---

## 19. Reglas específicas para devolución

## 19.1 Retorno desde `in_transit`

Si una serie vuelve antes de concretar venta o entrega final:

- `in_transit -> returned`

## 19.2 Retorno desde `sold`

Si existe postventa, garantía o reversa:

- `sold -> returned`

## 19.3 Reingreso disponible

Si la serie pasa inspección:

- `returned -> available`

## 19.4 Reingreso observado

Si la serie vuelve con daño o inconsistencia:

- `returned -> blocked`

---

## 20. Casos de uso de referencia

## 20.1 Compra y recepción normal

1. se aprueba OC
2. no se considera stock disponible aún
3. se recibe físicamente el ítem
4. se crea stock agregado en bodega/ubicación
5. si es serializado, se crea `SerieItem`
6. estado inicial `available`

---

## 20.2 Reserva para técnico

1. existe serie `available`
2. se asigna a guía
3. estado `reserved`
4. si la guía se cancela antes de salida, vuelve a `available`

---

## 20.3 Despacho a cliente o técnico

1. serie `reserved`
2. se confirma salida física
3. estado `in_transit`
4. el stock de origen deja de considerarla disponible

---

## 20.4 Entrega final confirmada

1. serie `in_transit`
2. se confirma entrega definitiva
3. estado `sold`

---

## 20.5 Devolución del cliente

1. serie `sold`
2. se recibe de vuelta
3. estado `returned`
4. se inspecciona
5. pasa a `available` o `blocked`

---

## 20.6 Incidente en despacho

1. serie `reserved`
2. se detecta daño antes de embarque
3. estado `blocked`
4. no puede re-reservarse hasta resolución

---

## 21. Decisiones explícitas de Fase 1

## 21.1 Decisión D1

La fuente de verdad canónica para series es la entidad relacional, no el JSON legacy.

## 21.2 Decisión D2

La unicidad de serie es por empresa.

## 21.3 Decisión D3

`despachada` queda clasificada como estado legacy ambiguo y no como nombre canónico futuro.

## 21.4 Decisión D4

El flujo canónico distingue reserva, tránsito y venta.

## 21.5 Decisión D5

`returned` no implica `available` automático.

## 21.6 Decisión D6

`blocked` es un estado canónico explícito.

## 21.7 Decisión D7

El stock canónico debe evolucionar de `bodega + item` a `bodega + ubicación + item`, con contexto de empresa.

---

## 22. Riesgos de implementación si no se adopta este modelo

1. doble reserva de series,
2. descuentos prematuros de stock,
3. confusión entre entrega parcial y venta final,
4. devoluciones sin reingreso controlado,
5. bloqueo informal no auditable,
6. divergencia entre JSON legacy y modelo relacional,
7. imposibilidad de soportar multi-bodega real,
8. reportes inconsistentes entre stock agregado y stock serializado.

---

## 23. Recomendaciones para fases siguientes

## 23.1 Fase 2, endurecimiento de dominio

- introducir transiciones validadas en código,
- rechazar transiciones ilegales,
- registrar historial de cambios.

## 23.2 Fase 3, ajuste de esquema

- remover `OneToOneField` en stock,
- agregar ubicación,
- agregar metadata de bloqueo,
- desactivar dual-write progresivamente.

## 23.3 Fase 4, reconciliación y migración

- migrar `despachada` según evidencia,
- reconciliar series y cantidades,
- auditar datos corruptos o duplicados.

---

## 24. Criterios de aceptación documentales de este issue

Este documento cumple el objetivo del issue #42 si deja definidos de forma inequívoca:

- modelo funcional/técnico de stock por bodega, ubicación e ítem,
- estados canónicos de serie,
- reglas de transición permitidas y prohibidas,
- definición de unicidad por contexto de negocio,
- ajustes de esquema o contratos requeridos.

---

## 25. Checklist de cobertura contra feedback del review

### Feedback 1, ubicación del documento

Cumplido al ubicar este artefacto en `dev/docs/`.

### Feedback 2, cobertura insuficiente

Cumplido con un documento de alcance amplio y detallado, superior al mínimo pedido en review.

### Feedback 3, desalineación con issue

Cumplido porque este documento trata explícitamente Fase 1, no Fase 0.

### Feedback 4, terminología legacy `despachada`

Cumplido al dejar `despachada` como estado legacy ambiguo y mapearlo a `in_transit` o `sold` según contexto, con recomendación por defecto hacia `in_transit`.

### Feedback 5, reglas y precondiciones desactualizadas

Cumplido al redefinir las reglas prohibidas y permitidas usando el modelo canónico completo.

---

## 26. Apéndice A, inventario de entidades actuales relevantes

- `Bodega`
- `StockItemEnBodega`
- `ItemOrdenCompraEnStock`
- `SerieItem`
- `GuiaSalida`
- `ItemsGuiaSalida`
- `MovimientoStock`
- `TomaInventario`
- `ItemEnTomaInventario`
- `VoucherDevolucion`

---

## 27. Apéndice B, mapeo sugerido de nombres si se mantiene español en código

| Contrato canónico | Nombre interno sugerido en español |
|---|---|
| `available` | `disponible` |
| `reserved` | `reservada` |
| `in_transit` | `en_transito` |
| `sold` | `vendida` |
| `returned` | `devuelta` |
| `blocked` | `bloqueada` |

---

## 28. Apéndice C, definición resumida para implementadores

### Stock

Stock es la cantidad de un ítem en una ubicación de una bodega para una empresa.

### Serie

Serie es la unidad individual trazable de un ítem serializado.

### Reserva

Reserva aparta, pero no entrega.

### Tránsito

Tránsito implica salida física, pero no cierre definitivo.

### Venta

Venta implica salida definitiva del inventario utilizable.

### Devolución

Devolución implica reingreso, pero no disponibilidad automática.

### Bloqueo

Bloqueo implica inmovilización explícita y auditable.

---

## 29. Conclusión final

El código actual ya tiene piezas útiles para llegar al modelo pedido por el issue #42, especialmente `SerieItem`, `MovimientoStock` y la trazabilidad entre guía e ingreso.

Pero el dominio todavía mezcla:

- stock esperado con stock recibido,
- reserva con salida física,
- despacho con venta,
- devolución con disponibilidad,
- y entidad relacional con JSON legacy.

El modelo canónico de esta Fase 1 resuelve esa ambigüedad definiendo un vocabulario único y reglas explícitas.

La recomendación final es usar este documento como **contrato de referencia** para migraciones, validaciones y auditoría de series en las fases siguientes.
