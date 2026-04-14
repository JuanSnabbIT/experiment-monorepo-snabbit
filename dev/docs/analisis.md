# Análisis de Consistencia de Número de Visitas en Matching Manual OT V3

## Objetivo
Verificar si el número de visitas incluidas/mostradas en **Matching Manual OT V3** corresponde al dato contractual que realmente usa hoy el sistema para el mes prefacturado, identificando puntos de desalineación y criterios de control para desarrollo y QA.

---

## 1. Flujo actual y fuente real de datos en OTV3

## 1.1 Resumen ejecutivo
En el flujo actual de **Matching Manual OT V3** la fuente de verdad para `incluidas_mes` **no es `ContratoVisita`**. El cálculo vigente se hace sobre `ContratoItemComercial` y usa esta prioridad por item:

1. `ContratoItemComercial.num_visitas_mensuales`
2. `ContratoItemComercial.snapshot_num_visitas_mensuales`
3. `PlanServicio.num_visitas_mensuales` o `Servicio.num_visitas_mensuales` como fallback

Esto está implementado en:
- `backend/ordentrabajov3/helpers_prefactura.py::_resolve_visitas_mensuales_item`
- `backend/ordentrabajov3/helpers_prefactura.py::_build_visitas_v3`

Por lo tanto, para QA y para cualquier validación funcional de OTV3, **el contraste debe hacerse contra `items_comerciales` del contrato**, no contra `ContratoVisita`.

> `ContratoVisita` puede seguir siendo relevante para otros flujos o modelos históricos, pero con la lógica actual de OTV3 no participa en el cálculo mostrado en Matching Manual.

## 1.2 Flujo backend
### Endpoint y armado de comparativa
El frontend consulta:
- `POST /api/v3/prefacturas-otv3/comparativa/`

Implementación:
- `backend/ordentrabajov3/views.py::PrefacturaOTV3ViewSet.comparativa`

Ese endpoint devuelve, entre otros:
- `visitas_contrato`
- `ots_marcadas_visitas`
- `meta_monedas`

Cuando hay contratos seleccionados, el endpoint llama a:
- `_build_visitas_v3(contratos, ots, fecha_prefactura)`

### Cálculo de visitas incluidas
En `backend/ordentrabajov3/helpers_prefactura.py::_build_visitas_v3`:

```python
incluidas_mes = sum(
    _resolve_visitas_mensuales_item(item)
    for item in contrato.items_comerciales.all()
)
```

Observaciones relevantes:
- Suma todos los `items_comerciales` del contrato retornados por `contrato.items_comerciales.all()`.
- **No hay filtro explícito por “activo”, vigencia, tipo de item o estado comercial** en este punto.
- Si un contrato tiene items obsoletos, duplicados o no vigentes pero aún asociados, pueden contaminar `incluidas_mes`.

### Prioridad real de campos por item
En `_resolve_visitas_mensuales_item`:

```python
candidatos = [
    item.num_visitas_mensuales,
    item.snapshot_num_visitas_mensuales,
    referencia.num_visitas_mensuales if referencia else None,
]
```

Interpretación funcional actual:
- Si el item comercial tiene un valor editable en `num_visitas_mensuales`, ese gana.
- Si ese valor es `null`, cae al snapshot congelado.
- Si ambos son `null`, cae al valor del plan/servicio referenciado.

Esto significa que la recomendación futura de “usar siempre snapshot” **no describe el comportamiento actual**; sería un cambio de negocio/código, no una descripción del estado vigente.

## 1.3 Cálculo de visitas ya confirmadas en el mes
El mismo helper calcula `confirmadas_mes` usando prefacturas activas del mes:

```python
prefacturas_mes = PrefacturaOTV3.objects.filter(
    estado_cierre__in=["por_facturar", "facturado"],
    fecha_prefactura__year=fecha_prefactura.year,
    fecha_prefactura__month=fecha_prefactura.month,
    contratos=contrato,
).only("resultado")

confirmadas_mes += int(visitas.get("marcadas_prefactura") or 0)
```

Fuente real de “uso” en OTV3:
- `PrefacturaOTV3.resultado.visitas.marcadas_prefactura`
- Solo se consideran prefacturas en estado `por_facturar` o `facturado`
- Solo para el mismo mes de `fecha_prefactura`
- Solo para prefacturas vinculadas al contrato

Esto es importante porque `confirmadas_mes` **no sale de reportes facturados genéricos ni de OTs cerradas directamente**, sino del snapshot JSON persistido en prefacturas OTV3 activas del período.

## 1.4 OTs marcadas por defecto
Las visitas nuevas de la prefactura en edición se aproximan vía OTs presenciales:
- `backend/ordentrabajov3/helpers_prefactura.py::resolver_ots_marcadas_visitas`

Regla actual:

```python
ots_v3.filter(tipo_servicio=TIPO_SERVICIO_SOPORTE_PRESENCIAL)
```

Eso alimenta:
- `ots_marcadas_por_defecto`
- `marcadas_esta_prefactura = len(ots_marcadas_por_defecto)`
- `exceso = max(total_confirmadas + marcadas_esta_prefactura - total_incluidas, 0)`

## 1.5 Flujo frontend y visualización
El frontend consume la comparativa en:
- `frontend/src/store/slices/ordenTrabajoV3/ordenTrabajoV3Api.ts::getComparativaV3`
- URL: `${BASE}/prefacturas-otv3/comparativa/`

Y la presenta en:
- `frontend/src/pages/Facturacion/OTV3/MatchingManualOTV3.tsx`

Mapeo principal actual:

```ts
const vc = comparativa?.visitas_contrato;
return {
  periodo: vc?.periodo ?? periodo,
  incluidas_mes: Number(vc?.incluidas_mes ?? vc?.incluidas_total ?? 0),
  confirmadas_mes: Number(vc?.confirmadas_mes ?? 0),
};
```

Luego el frontend calcula:
- `marcadas_prefactura`: OTs seleccionadas y marcadas como visita
- `proyectadas_mes = confirmadas_mes + otsMarcadasVisita.length`
- `exceso_prefactura`
- `total_exceso`

Conclusión práctica:
- **`incluidas_mes` y `confirmadas_mes` vienen del backend**.
- **`marcadas_prefactura`, `proyectadas_mes` y `exceso_prefactura` se recalculan en frontend para la sesión actual**.
- Para validar la UI hay que contrastar tanto el payload backend como las reglas locales del componente.

---

## 2. Tablas, campos y rutas de código a auditar

## 2.1 Modelos/campos backend relevantes
### Contrato
- `backend/contratos/models.py::ContratoItemComercial`
- Campos relevantes:
  - `contrato_id`
  - `tipo_origen`
  - `plan_version_id`
  - `servicio_version_id`
  - `num_visitas_mensuales`
  - `snapshot_num_visitas_mensuales`
  - `fecha_creacion`
  - `fecha_modificacion`
  - `historia` (simple-history por `ModeloBaseHistorico`)

### Prefactura
- `backend/ordentrabajov3/models.py::PrefacturaOTV3`
- Campos relevantes:
  - `fecha_prefactura`
  - `estado_cierre`
  - `resultado` (JSON)
  - `creado_por`
  - `actualizado_por`
  - `fecha_creacion`
  - `fecha_modificacion`
  - `historia`

Dentro de `resultado.visitas` hoy interesa como mínimo:
- `incluidas_mes`
- `confirmadas_mes`
- `marcadas_prefactura` o `marcadas_esta_prefactura`
- `ots_marcadas_por_defecto`
- `exceso`
- `precio_unitario_exceso`
- `total_exceso`
- `por_contrato`

## 2.2 Tablas/consultas de referencia
A nivel SQL/ORM, el análisis operativo debe partir al menos de:
- `contratos_contratoitemcomercial`
- `ordentrabajov3_prefacturaotv3`
- tabla M2M `PrefacturaOTV3 <-> contratos`
- tabla M2M `PrefacturaOTV3 <-> ots`

> Los nombres físicos de tablas intermedias M2M pueden variar según migración/DB, por lo que conviene confirmarlos en el ambiente antes de automatizar queries operativas.

## 2.3 Rutas exactas de código que conviene revisar
### Backend
- `backend/ordentrabajov3/views.py::PrefacturaOTV3ViewSet.comparativa`
- `backend/ordentrabajov3/helpers_prefactura.py::_build_visitas_v3`
- `backend/ordentrabajov3/helpers_prefactura.py::_resolve_visitas_mensuales_item`
- `backend/ordentrabajov3/helpers_prefactura.py::resolver_ots_marcadas_visitas`
- `backend/ordentrabajov3/views.py::create` (persistencia de `resultado`)

### Frontend
- `frontend/src/store/slices/ordenTrabajoV3/ordenTrabajoV3Api.ts::getComparativaV3`
- `frontend/src/pages/Facturacion/OTV3/MatchingManualOTV3.tsx`
- `frontend/src/pages/Facturacion/OTV3/DetallePrefacturaOTV3.tsx`
- `frontend/src/interface/ordenTrabajoV3.interface.ts`

### Tests actuales que ya cubren parte de la lógica
- `backend/ordentrabajov3/tests/test_prefactura_otv3.py::test_comparativa_contrato_reporta_visitas_incluidas_mes`
- `backend/ordentrabajov3/tests/test_prefactura_otv3.py::test_comparativa_visitas_fallback_a_snapshot_num_visitas`

---

## 3. Contraste entre lógica actual y dato contractual

## 3.1 Qué significa hoy “visitas incluidas” en OTV3
En OTV3, `incluidas_mes` significa:
- suma de visitas mensuales resueltas por cada `ContratoItemComercial` asociado al contrato seleccionado;
- con prioridad `num_visitas_mensuales > snapshot_num_visitas_mensuales > valor del plan/servicio`;
- sin filtro explícito de vigencia/actividad dentro del helper.

Por tanto, la pregunta correcta no es solo “¿coincide con lo firmado?”, sino:

> “¿coincide con el valor que hoy el sistema considera contractual según `ContratoItemComercial` para ese contrato y ese mes?”

## 3.2 Qué significa hoy “visitas usadas/confirmadas”
En OTV3, `confirmadas_mes` significa:
- suma de `resultado.visitas.marcadas_prefactura` en prefacturas del mismo mes ya cerradas como `por_facturar` o `facturado`.

No equivale exactamente a:
- OTs ejecutadas del mes,
- OTs facturadas fuera de OTV3,
- reportes técnicos cerrados,
- ni a `ContratoVisita.visitas_usadas` si existiera otro flujo.

## 3.3 Dónde puede romper la fidelidad con contrato
La visualización será fiel al contrato **solo si**:
1. `ContratoItemComercial` representa correctamente el acuerdo comercial vigente.
2. `num_visitas_mensuales`/`snapshot_num_visitas_mensuales` están consistentes.
3. Los contratos seleccionados en Matching corresponden al contrato correcto de las OTs.
4. Las prefacturas previas del mismo mes reflejan correctamente `marcadas_prefactura`.

---

## 4. Escenarios y casos límite con ejemplos

## 4.1 Caso base: un contrato, un item, valor directo
**Entrada**
- Contrato A
- 1 `ContratoItemComercial` con `num_visitas_mensuales = 4`
- `snapshot_num_visitas_mensuales = null`
- Sin prefacturas previas del mes
- 2 OTs presenciales seleccionadas

**Esperado**
- `incluidas_mes = 4`
- `confirmadas_mes = 0`
- `marcadas_prefactura = 2`
- `proyectadas_mes = 2`
- `exceso = 0`

## 4.2 Caso fallback a snapshot
**Entrada**
- Contrato A
- 1 item con `num_visitas_mensuales = null`
- `snapshot_num_visitas_mensuales = 3`
- plan/servicio sin valor adicional

**Esperado**
- `incluidas_mes = 3`
- el valor visible depende del snapshot porque el campo editable está nulo

**Riesgo**
- QA puede contrastar contra el plan actual y concluir erróneamente que está malo, cuando el sistema está usando snapshot.

## 4.3 Caso mixto: dos items, uno directo y uno por fallback
**Entrada**
- Item 1: `num_visitas_mensuales = 2`
- Item 2: `num_visitas_mensuales = null`, `snapshot_num_visitas_mensuales = 1`
- Prefacturas previas del mes con `marcadas_prefactura = 2`
- Nueva selección con 2 OTs presenciales

**Esperado**
- `incluidas_mes = 3`
- `confirmadas_mes = 2`
- `proyectadas_mes = 4`
- `exceso = 1`

**Representación UI esperada**
- Incluidas: 3
- Confirmadas: 2
- En prefactura actual: 2
- Exceso: 1

## 4.4 Cambio contractual a mitad de mes
**Escenario**
- El mes parte con 2 visitas
- Luego el equipo cambia el plan a 4 visitas
- El `ContratoItemComercial.num_visitas_mensuales` queda actualizado, pero la prefactura previa del mismo mes ya guardó `resultado.visitas` con otra base

**Riesgo**
- La comparativa nueva puede mostrar más incluidas que las que justificaron cierres previos.
- El mes queda “partido” entre reglas antiguas y nuevas.

**Cómo detectarlo**
- Comparar fecha de modificación del item vs fecha de prefacturas del mismo período.
- Revisar histórico (`historia`) del item comercial.

## 4.5 OTs reasignadas o contrato incorrecto en matching
**Escenario**
- OT pertenece operativamente a Cliente/Contrato A
- En matching se selecciona Contrato B

**Riesgo**
- `incluidas_mes` se calcula con B, pero `marcadas_prefactura` de meses anteriores pueden estar en A.
- El exceso puede parecer menor o mayor artificialmente.

**Detección**
- Check de integridad entre `ot.contrato_id`, `prefactura.contratos` y contratos enviados a comparativa.

## 4.6 Items duplicados o legacy sin filtrar
**Escenario**
- Contrato conserva items antiguos y nuevos en `items_comerciales`
- El helper suma todo sin filtrar

**Riesgo**
- `incluidas_mes` inflado
- validación funcional aparentemente correcta desde UI, pero incorrecta respecto al contrato vigente

---

## 5. Criterios claros de validación funcional y técnica

## 5.1 Validación funcional para QA
Para cada prueba, QA debe registrar:
- contrato seleccionado,
- mes de `fecha_prefactura`,
- items comerciales del contrato y sus valores de visitas,
- prefacturas previas del mismo mes,
- OTs presenciales marcadas en la sesión actual.

Checklist funcional mínimo:
1. `incluidas_mes` = suma backend de `_resolve_visitas_mensuales_item(item)` para todos los items del contrato.
2. `confirmadas_mes` = suma de `resultado.visitas.marcadas_prefactura` en prefacturas `por_facturar/facturado` del mismo mes y contrato.
3. `marcadas_prefactura` = cantidad de OTs presenciales seleccionadas en la sesión.
4. `exceso` = `max(confirmadas_mes + marcadas_prefactura - incluidas_mes, 0)`.
5. La UI no debe recalcular `incluidas_mes` desde fuentes distintas al payload del backend.

## 5.2 Validación técnica backend
Se recomienda cubrir explícitamente:
- prioridad entre `num_visitas_mensuales`, `snapshot_num_visitas_mensuales` y plan,
- suma multi-item,
- suma multi-contrato,
- exclusión por estado de prefactura (`borrador` no cuenta),
- prefacturas de otro mes no cuentan,
- contrato incorrecto no debe contaminar `confirmadas_mes`,
- items legacy/duplicados generan alerta o al menos test de comportamiento documentado.

## 5.3 Validación técnica frontend
Debe probarse que:
- el componente respeta `comparativa.visitas_contrato` como fuente del resumen base,
- `incluidas_mes` soporta alias legacy `incluidas_total`,
- `proyectadas_mes` y `exceso_prefactura` se recalculan correctamente al marcar/desmarcar OTs,
- `DetallePrefacturaOTV3` interpreta bien `resultado.visitas` persistido.

---

## 6. Contrato API esperado entre backend y frontend

## 6.1 Payload mínimo de comparativa
Respuesta esperada de `POST /api/v3/prefacturas-otv3/comparativa/`:

```json
{
  "visitas_contrato": {
    "periodo": "2026-04",
    "incluidas_mes": 3,
    "incluidas_total": 3,
    "confirmadas_mes": 2,
    "ots_marcadas_por_defecto": [101, 102],
    "marcadas_esta_prefactura": 2,
    "exceso": 1,
    "precio_unitario_exceso": 15000,
    "total_exceso": 15000,
    "por_contrato": [
      {
        "contrato_id": 55,
        "contrato_nombre": "Contrato Cliente X",
        "incluidas_mes": 3,
        "confirmadas_mes": 2
      }
    ]
  }
}
```

## 6.2 Payload mínimo persistido en `PrefacturaOTV3.resultado.visitas`
Para trazabilidad y pruebas de integración conviene exigir, como piso:

```json
{
  "visitas": {
    "periodo": "2026-04",
    "incluidas_mes": 3,
    "confirmadas_mes": 2,
    "marcadas_prefactura": 2,
    "proyectadas_mes": 4,
    "ots_marcadas": [101, 102],
    "exceso_prefactura": 1,
    "precio_unitario_exceso": 15000,
    "total_exceso": 15000,
    "origenes": [
      {
        "tipo": "contrato_item_comercial",
        "id": 9001,
        "valor": 2,
        "campo_resuelto": "num_visitas_mensuales"
      },
      {
        "tipo": "contrato_item_comercial",
        "id": 9002,
        "valor": 1,
        "campo_resuelto": "snapshot_num_visitas_mensuales"
      }
    ]
  }
}
```

`origenes` aún no existe como contrato estricto en código, pero es un buen objetivo para trazabilidad y debugging.

---

## 7. Consultas SQL/ORM sugeridas para detectar discrepancias

## 7.1 Query de referencia para incluidas por contrato
Ejemplo SQL orientativo:

```sql
SELECT
  c.contrato_id,
  SUM(
    COALESCE(c.num_visitas_mensuales, c.snapshot_num_visitas_mensuales, 0)
  ) AS incluidas_mes_calculadas
FROM contratos_contratoitemcomercial c
GROUP BY c.contrato_id;
```

Si se quiere reproducir fielmente el fallback a plan/servicio, el check SQL debe extenderse con `JOIN` a esas tablas; si no, el control será aproximado.

## 7.2 Query de confirmadas por mes/contrato
Ejemplo orientativo, asumiendo acceso a JSON en PostgreSQL y tabla M2M confirmada:

```sql
SELECT
  pc.contratoempresacliente_id AS contrato_id,
  DATE_TRUNC('month', p.fecha_prefactura) AS periodo,
  SUM(COALESCE((p.resultado->'visitas'->>'marcadas_prefactura')::int, 0)) AS confirmadas_mes
FROM ordentrabajov3_prefacturaotv3 p
JOIN ordentrabajov3_prefacturaotv3_contratos pc
  ON pc.prefacturaotv3_id = p.id
WHERE p.estado_cierre IN ('por_facturar', 'facturado')
GROUP BY 1, 2;
```

## 7.3 Check automático diario recomendado
Job diario:
- frecuencia: 1 vez al día, idealmente madrugada
- ventana: mes actual y mes anterior
- agrupación: por contrato y período
- condición de alerta: diferencia distinta de 0

Regla base:

```text
diff = incluidas_mes_calculadas - incluidas_mes_snapshot_o_payload_esperado
alertar si diff != 0
```

Checks recomendados:
1. Diferencia entre suma actual de items comerciales y último valor persistido en prefacturas del mes.
2. Prefacturas con `resultado.visitas` incompleto.
3. Contratos con items comerciales duplicados o todos nulos en visitas.
4. Prefacturas con `marcadas_prefactura > 0` pero sin OTs presenciales asociadas.
5. Prefacturas con `exceso > 0` y `precio_unitario_exceso = 0`.

## 7.4 Umbrales y alertas
- **Severidad alta:** `diff != 0` en contratos facturados.
- **Severidad media:** `resultado.visitas` faltante o campos nulos en prefacturas `por_facturar`.
- **Severidad baja:** mismatch entre campos legacy (`incluidas_total`) y nuevos (`incluidas_mes`).

Salida sugerida:
- comentario automático en issue/ticket,
- log estructurado para observabilidad,
- o creación de incidencia si afecta contratos `facturado`.

---

## 8. Auditoría y trazabilidad

## 8.1 Qué existe hoy
Tanto `ContratoItemComercial` como `PrefacturaOTV3` heredan de `ModeloBaseHistorico`, por lo que ya cuentan con:
- `fecha_creacion`
- `fecha_modificacion`
- `historia` (simple-history)

Además `PrefacturaOTV3` guarda:
- `creado_por`
- `actualizado_por`
- `comentario`
- `resultado`

## 8.2 Metadatos de auditoría recomendados
Como mínimo, cada cambio de visitas debería dejar:
- `who`: usuario/usuario_empresa
- `when`: timestamp
- `reason`: motivo de cambio
- `old_value`
- `new_value`
- `source_field`: `num_visitas_mensuales`, `snapshot_num_visitas_mensuales` o plan/servicio
- `periodo_afectado`
- `contrato_id`
- `contrato_item_comercial_id`

## 8.3 Eventos que conviene auditar explícitamente
1. Cambio manual de `num_visitas_mensuales` en `ContratoItemComercial`.
2. Cambio de plan/servicio que altere el fallback.
3. Creación/edición/finalización de `PrefacturaOTV3` con `resultado.visitas`.
4. Reasignación de OTs entre contratos durante matching.
5. Correcciones posteriores a una prefactura ya `por_facturar` o `facturado`.

---

## 9. Resumen operativo

## 9.1 Conclusión principal
Hoy **Matching Manual OT V3 sí puede ser consistente**, pero solo si la validación se hace contra la misma fuente que usa el código: `ContratoItemComercial` + `PrefacturaOTV3.resultado.visitas` del mes.

El mayor riesgo no es un error de fórmula simple, sino la coexistencia de:
- múltiples campos posibles para visitas,
- cambios contractuales a mitad de mes,
- ausencia de filtro de items “vigentes” en el helper,
- y mezcla de cálculo backend con proyección frontend.

## 9.2 Acciones recomendadas
### Prioridad alta
1. **Documentar como contrato vigente** que OTV3 usa `ContratoItemComercial`, no `ContratoVisita`.
2. **Agregar tests backend** para multi-item, multi-contrato, cambio de mes y exclusión de prefacturas `borrador`.
3. **Persistir mejor trazabilidad en `resultado.visitas`**, idealmente incluyendo `origenes` y campo resuelto por item.
4. **Implementar job diario de discrepancias** por contrato/mes.

### Prioridad media
5. Evaluar si `contrato.items_comerciales.all()` debe filtrar vigencia/estado o si se requiere normalizar datos legacy.
6. Definir contrato JSON estable entre backend y frontend para `visitas_contrato` y `resultado.visitas`.
7. Agregar chequeo preventivo cuando las OTs seleccionadas no correspondan al contrato usado para comparativa.

### Prioridad baja
8. Evaluar como cambio futuro si la prioridad correcta de negocio debiera ser `snapshot` antes que `num_visitas_mensuales`.
9. Exponer en UI tooltip o detalle de origen de visitas por contrato/item para soporte y QA.

## 9.3 Backlog sugerido de tickets
- **DEV:** centralizar y tipar contrato JSON de `visitas_contrato` / `resultado.visitas`.
- **DEV:** agregar `origenes` y `campo_resuelto` al snapshot de visitas.
- **DEV:** job diario de validación de discrepancias contrato vs prefacturas.
- **DEV:** validación de integridad OT/contrato en comparativa y creación de prefactura.
- **QA:** matriz de pruebas con escenarios de fallback, cambio de mes, exceso y contratos múltiples.
- **QA:** casos de regresión sobre `MatchingManualOTV3` y `DetallePrefacturaOTV3`.

---

**Este análisis queda orientado a desarrollo y QA para validar, detectar y mejorar la consistencia de visitas contractuales en Matching Manual OT V3, usando la lógica real hoy implementada en el repositorio.**
