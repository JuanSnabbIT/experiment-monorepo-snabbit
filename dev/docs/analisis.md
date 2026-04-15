# Análisis de Consistencia de Número de Visitas en Matching Manual OT V3

## Objetivo
Verificar si el número de visitas incluidas/mostradas en **Matching Manual OT V3** corresponde al dato contractual que realmente usa hoy el sistema para el mes prefacturado, identificando puntos de desalineación y criterios de control para desarrollo y QA.

> **Nota de trazabilidad del documento:** el issue pedía “actualizar `dev/docs/analisis.md`”, pero en la rama base `main` ese archivo no existe actualmente. Por eso, en términos de Git, este cambio necesariamente aparece como creación del archivo. La recomendación de revisión sigue vigente: dejar explícita esta excepción en PR y mantener este archivo como ubicación estable para futuras actualizaciones.

---

## 1. Separación explícita: estado actual vs propuestas

Para evitar ambigüedad en validaciones de QA y desarrollo, este documento usa estas etiquetas:

- **Estado actual**: comportamiento vigente observado en el código del repositorio.
- **Riesgo / desalineación**: casos donde el dato mostrado puede no representar fielmente la intención contractual.
- **Propuesta / mejora futura**: cambios sugeridos que **no deben usarse como criterio de rechazo** si aún no existen en código.

---

## 2. Estado actual: flujo real y fuente efectiva de datos en OTV3

## 2.1 Resumen ejecutivo
En el flujo actual de **Matching Manual OT V3**, la fuente de verdad para `incluidas_mes` **no es `ContratoVisita`**. El cálculo vigente se hace sobre `ContratoItemComercial` y usa esta prioridad por item:

1. `ContratoItemComercial.num_visitas_mensuales`
2. `ContratoItemComercial.snapshot_num_visitas_mensuales`
3. `PlanServicio.num_visitas_mensuales` o `Servicio.num_visitas_mensuales` como fallback

Esto está implementado en:
- `backend/ordentrabajov3/helpers_prefactura.py::_resolve_visitas_mensuales_item`
- `backend/ordentrabajov3/helpers_prefactura.py::_build_visitas_v3`

Por lo tanto, para QA y para cualquier validación funcional de OTV3, **el contraste debe hacerse contra `items_comerciales` del contrato**, no contra `ContratoVisita`.

> **Estado actual:** `ContratoVisita` puede seguir siendo relevante para otros flujos o modelos históricos, pero con la lógica actual de OTV3 no participa en el cálculo mostrado en Matching Manual.

## 2.2 Flujo backend
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

Observaciones relevantes del **estado actual**:
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

Interpretación funcional del **estado actual**:
- Si el item comercial tiene un valor editable en `num_visitas_mensuales`, ese gana.
- Si ese valor es `null`, cae al snapshot congelado.
- Si ambos son `null`, cae al valor del plan/servicio referenciado.

> **Aclaración importante:** sugerir “usar siempre snapshot” sería una **propuesta futura**. **No describe el comportamiento actual** y por tanto QA no debe validarlo como regla vigente.

## 2.3 Cálculo de visitas ya confirmadas en el mes
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

Fuente real de “uso” en OTV3 (**estado actual**):
- `PrefacturaOTV3.resultado.visitas.marcadas_prefactura`
- Solo se consideran prefacturas en estado `por_facturar` o `facturado`
- Solo para el mismo mes de `fecha_prefactura`
- Solo para prefacturas vinculadas al contrato

Esto es importante porque `confirmadas_mes` **no sale de reportes facturados genéricos ni de OTs cerradas directamente**, sino del snapshot JSON persistido en prefacturas OTV3 activas del período.

## 2.4 OTs marcadas por defecto
Las visitas nuevas de la prefactura en edición se aproximan vía OTs presenciales:
- `backend/ordentrabajov3/helpers_prefactura.py::resolver_ots_marcadas_visitas`

Regla vigente:

```python
ots_v3.filter(tipo_servicio=TIPO_SERVICIO_SOPORTE_PRESENCIAL)
```

Eso alimenta el **estado actual** de la comparativa:
- `ots_marcadas_por_defecto`
- `marcadas_esta_prefactura = len(ots_marcadas_por_defecto)`
- `exceso = max(total_confirmadas + marcadas_esta_prefactura - total_incluidas, 0)`

## 2.5 Flujo frontend y visualización
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

Luego el frontend recalcula en la sesión actual:
- `marcadas_prefactura`: OTs seleccionadas y marcadas como visita
- `proyectadas_mes = confirmadas_mes + otsMarcadasVisita.length`
- `exceso_prefactura`
- `total_exceso`

Conclusión práctica del **estado actual**:
- **`incluidas_mes` y `confirmadas_mes` vienen del backend**.
- **`marcadas_prefactura`, `proyectadas_mes` y `exceso_prefactura` se recalculan en frontend para la sesión actual**.
- Para validar la UI hay que contrastar tanto el payload backend como las reglas locales del componente.

---

## 3. Rutas de código, tablas y artefactos a auditar

## 3.1 Rutas exactas de código que conviene revisar
### Backend
- `backend/ordentrabajov3/views.py::PrefacturaOTV3ViewSet.comparativa`
- `backend/ordentrabajov3/helpers_prefactura.py::_build_visitas_v3`
- `backend/ordentrabajov3/helpers_prefactura.py::_resolve_visitas_mensuales_item`
- `backend/ordentrabajov3/helpers_prefactura.py::resolver_ots_marcadas_visitas`

### Frontend
- `frontend/src/store/slices/ordenTrabajoV3/ordenTrabajoV3Api.ts::getComparativaV3`
- `frontend/src/pages/Facturacion/OTV3/MatchingManualOTV3.tsx`
- `frontend/src/pages/Facturacion/OTV3/DetallePrefacturaOTV3.tsx`
- `frontend/src/interface/ordenTrabajoV3.interface.ts`

### Tests actuales que ya cubren parte de la lógica
- `backend/ordentrabajov3/tests/test_prefactura_otv3.py::test_comparativa_contrato_reporta_visitas_incluidas_mes`
- `backend/ordentrabajov3/tests/test_prefactura_otv3.py::test_comparativa_visitas_fallback_a_snapshot_num_visitas`

## 3.2 Modelos y campos backend relevantes
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

Dentro de `resultado.visitas`, lo que hoy aparece o se usa con mayor relevancia es:
- `incluidas_mes`
- `confirmadas_mes`
- `marcadas_prefactura` o `marcadas_esta_prefactura`
- `ots_marcadas_por_defecto`
- `exceso`
- `precio_unitario_exceso`
- `total_exceso`
- `por_contrato`

## 3.3 Tablas / consultas de referencia
A nivel SQL/ORM, el análisis operativo debe partir al menos de:
- `contratos_contratoitemcomercial`
- `contratos_planservicio`
- `contratos_servicio`
- `ordentrabajov3_prefacturaotv3`
- tabla M2M `PrefacturaOTV3 <-> contratos` (esperable: `ordentrabajov3_prefacturaotv3_contratos`)
- tabla M2M `PrefacturaOTV3 <-> ots` (esperable: `ordentrabajov3_prefacturaotv3_ots`)

Cruces mínimos que conviene verificar en DB:
- `contratos_contratoitemcomercial.contrato_id`
- `contratos_contratoitemcomercial.plan_version_id`
- `contratos_contratoitemcomercial.servicio_version_id`
- `ordentrabajov3_prefacturaotv3.resultado`
- `ordentrabajov3_prefacturaotv3.estado_cierre`
- `ordentrabajov3_prefacturaotv3.fecha_prefactura`

> Los nombres físicos de tablas intermedias M2M pueden variar según migración/DB, por lo que conviene confirmarlos en el ambiente antes de automatizar queries operativas.

---

## 4. Contraste entre lógica actual y dato contractual

## 4.1 Qué significa hoy “visitas incluidas” en OTV3
**Estado actual:** en OTV3, `incluidas_mes` significa:
- suma de visitas mensuales resueltas por cada `ContratoItemComercial` asociado al contrato seleccionado;
- con prioridad `num_visitas_mensuales > snapshot_num_visitas_mensuales > valor del plan/servicio`;
- sin filtro explícito de vigencia/actividad dentro del helper.

Por tanto, la pregunta correcta no es solo “¿coincide con lo firmado?”, sino:

> “¿coincide con el valor que hoy el sistema considera contractual según `ContratoItemComercial` para ese contrato y ese mes?”

## 4.2 Qué significa hoy “visitas usadas/confirmadas”
**Estado actual:** en OTV3, `confirmadas_mes` significa:
- suma de `resultado.visitas.marcadas_prefactura` en prefacturas del mismo mes ya cerradas como `por_facturar` o `facturado`.

No equivale exactamente a:
- OTs ejecutadas del mes,
- OTs facturadas fuera de OTV3,
- reportes técnicos cerrados,
- ni a `ContratoVisita.visitas_usadas` de otros flujos.

## 4.3 Riesgos de desalineación con la noción de contrato
La visualización será fiel al contrato **solo si**:
1. `ContratoItemComercial` representa correctamente el acuerdo comercial vigente.
2. `num_visitas_mensuales`/`snapshot_num_visitas_mensuales` están consistentes.
3. Los contratos seleccionados en Matching corresponden al contrato correcto de las OTs.
4. Las prefacturas previas del mismo mes reflejan correctamente `marcadas_prefactura`.

Si cualquiera de esos supuestos falla, puede existir consistencia “con el código” pero no necesariamente con la intención comercial real.

---

## 5. Escenarios y casos límite con ejemplos

## 5.1 Caso base: un contrato, un item, valor directo
**Entrada**
- Contrato A
- 1 `ContratoItemComercial` con `num_visitas_mensuales = 4`
- `snapshot_num_visitas_mensuales = null`
- Sin prefacturas previas del mes
- 2 OTs presenciales seleccionadas

**Esperado según estado actual**
- `incluidas_mes = 4`
- `confirmadas_mes = 0`
- `marcadas_prefactura = 2`
- `proyectadas_mes = 2`
- `exceso = 0`

## 5.2 Caso fallback a snapshot
**Entrada**
- Contrato A
- 1 item con `num_visitas_mensuales = null`
- `snapshot_num_visitas_mensuales = 3`
- plan/servicio sin valor adicional

**Esperado según estado actual**
- `incluidas_mes = 3`
- el valor visible depende del snapshot porque el campo editable está nulo

**Riesgo / desalineación**
- QA puede contrastar contra el plan actual y concluir erróneamente que está malo, cuando el sistema está usando snapshot.

## 5.3 Caso mixto: dos items, uno directo y uno por fallback
**Entrada**
- Item 1: `num_visitas_mensuales = 2`
- Item 2: `num_visitas_mensuales = null`, `snapshot_num_visitas_mensuales = 1`
- Prefacturas previas del mes con `resultado.visitas.marcadas_prefactura = 2`
- Nueva selección con 2 OTs presenciales

**Esperado según estado actual**
- `incluidas_mes = 3`
- `confirmadas_mes = 2`
- `proyectadas_mes = 4`
- `exceso = 1`

**Representación UI esperada**
- Incluidas: 3
- Confirmadas: 2
- En prefactura actual: 2
- Exceso: 1

## 5.4 Cambio contractual a mitad de mes
**Escenario**
- El mes parte con 2 visitas
- Luego el equipo cambia el plan a 4 visitas
- `ContratoItemComercial.num_visitas_mensuales` queda actualizado
- Una prefactura previa del mismo mes ya guardó `resultado.visitas` con una base anterior

**Riesgo / desalineación**
- Una comparativa nueva puede mostrar más incluidas que las que justificaron cierres previos.
- El mes queda “partido” entre reglas antiguas y nuevas.

**Cómo detectarlo**
- Comparar fecha de modificación del item vs fecha de prefacturas del mismo período.
- Revisar histórico (`historia`) del item comercial.

## 5.5 OTs reasignadas o contrato incorrecto en matching
**Escenario**
- OT pertenece operativamente a Cliente/Contrato A
- En matching se selecciona Contrato B

**Riesgo / desalineación**
- `incluidas_mes` se calcula con B, pero `confirmadas_mes` históricas pueden estar en A.
- El exceso puede parecer menor o mayor artificialmente.

**Detección**
- Check de integridad entre OT, contrato seleccionado y contratos ya asociados a prefacturas del período.

## 5.6 Items duplicados o legacy sin filtrar
**Escenario**
- El contrato conserva items antiguos y nuevos en `items_comerciales`
- El helper suma todo sin filtrar

**Riesgo / desalineación**
- `incluidas_mes` inflado
- validación funcional aparentemente correcta desde UI, pero incorrecta respecto al contrato vigente

---

## 6. Criterios claros de validación funcional y técnica

## 6.1 Validación funcional para QA
Para cada prueba, QA debe registrar:
- contrato seleccionado,
- mes de `fecha_prefactura`,
- items comerciales del contrato y sus valores de visitas,
- prefacturas previas del mismo mes,
- OTs presenciales marcadas en la sesión actual.

Checklist funcional mínimo sobre el **estado actual**:
1. `incluidas_mes` = suma backend de `_resolve_visitas_mensuales_item(item)` para todos los items del contrato.
2. `confirmadas_mes` = suma de `resultado.visitas.marcadas_prefactura` en prefacturas `por_facturar/facturado` del mismo mes y contrato.
3. `ots_marcadas_por_defecto` = IDs de OTs presenciales retornados por backend.
4. `marcadas_prefactura` en la sesión = cantidad de OTs presenciales marcadas por frontend.
5. `exceso` / `exceso_prefactura` = `max(confirmadas_mes + marcadas_prefactura - incluidas_mes, 0)` según corresponda al punto del flujo observado.
6. La UI no debe recalcular `incluidas_mes` desde una fuente distinta al payload backend.

## 6.2 Validación técnica backend
Se recomienda cubrir explícitamente:
- prioridad entre `num_visitas_mensuales`, `snapshot_num_visitas_mensuales` y plan,
- suma multi-item,
- suma multi-contrato,
- exclusión por estado de prefactura (`borrador` no cuenta),
- prefacturas de otro mes no cuentan,
- contrato incorrecto no debe contaminar `confirmadas_mes`,
- items legacy/duplicados generan alerta o al menos test de comportamiento documentado.

## 6.3 Validación técnica frontend
Debe probarse que:
- el componente respeta `comparativa.visitas_contrato` como fuente del resumen base,
- `incluidas_mes` soporta alias legacy `incluidas_total`,
- `proyectadas_mes` y `exceso_prefactura` se recalculan correctamente al marcar/desmarcar OTs,
- `DetallePrefacturaOTV3` interpreta bien `resultado.visitas` persistido.

---

## 7. Contrato API: qué existe hoy y qué se propone mejorar

## 7.1 Payload vigente observable en comparativa
**Estado actual**: la respuesta de `POST /api/v3/prefacturas-otv3/comparativa/` debería respetar al menos esta estructura funcional:

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

Campos mínimos que desarrollo y QA deberían tratar como vigentes hoy:
- `incluidas_mes`
- `incluidas_total` (alias/compatibilidad)
- `confirmadas_mes`
- `ots_marcadas_por_defecto`
- `marcadas_esta_prefactura`
- `exceso`
- `precio_unitario_exceso`
- `total_exceso`
- `por_contrato`

## 7.2 Payload persistido en `PrefacturaOTV3.resultado.visitas`
**Estado actual**: para pruebas de integración, como mínimo conviene verificar presencia y coherencia de:

```json
{
  "visitas": {
    "incluidas_mes": 3,
    "confirmadas_mes": 2,
    "marcadas_prefactura": 2,
    "proyectadas_mes": 4,
    "ots_marcadas": [101, 102],
    "exceso_prefactura": 1,
    "precio_unitario_exceso": 15000,
    "total_exceso": 15000
  }
}
```

## 7.3 Propuesta de mejora futura del contrato JSON
**Propuesta / mejora futura**: para trazabilidad y debugging sería útil evolucionar el payload persistido a algo como:

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

> **Aclaración obligatoria para QA/dev:** `origenes` y `campo_resuelto` **no forman parte del contrato vigente hoy**. Son una mejora propuesta y no deben exigirse como comportamiento actual.

---

## 8. Consultas SQL/ORM sugeridas para detectar discrepancias

## 8.1 Query de referencia para incluidas por contrato
### ORM equivalente al helper actual
Snippet orientativo para reproducir el comportamiento de `_resolve_visitas_mensuales_item` y `_build_visitas_v3` desde shell Django o test de soporte:

```python
from ordentrabajov3.helpers_prefactura import _resolve_visitas_mensuales_item
from contratos.models import ContratoEmpresaCliente

contrato = (
    ContratoEmpresaCliente.objects
    .prefetch_related(
        "items_comerciales",
        "items_comerciales__plan_version",
        "items_comerciales__servicio_version",
    )
    .get(pk=CONTRATO_ID)
)

incluidas_mes = sum(
    _resolve_visitas_mensuales_item(item)
    for item in contrato.items_comerciales.all()
)
```

### SQL de aproximación alta fidelidad
Ejemplo SQL orientativo, reproduciendo la prioridad actual `num_visitas_mensuales > snapshot_num_visitas_mensuales > plan/servicio`:

```sql
SELECT
  cic.contrato_id,
  SUM(
    COALESCE(
      cic.num_visitas_mensuales,
      cic.snapshot_num_visitas_mensuales,
      ps.num_visitas_mensuales,
      s.num_visitas_mensuales,
      0
    )
  ) AS incluidas_mes_calculadas
FROM contratos_contratoitemcomercial cic
LEFT JOIN contratos_planservicio ps
  ON ps.id = cic.plan_version_id
LEFT JOIN contratos_servicio s
  ON s.id = cic.servicio_version_id
GROUP BY cic.contrato_id;
```

Notas para desarrollo/QA:
- Si `tipo_origen = 'plan'`, el valor de `servicio_version_id` normalmente será `NULL`.
- Si `tipo_origen = 'servicio'`, el valor de `plan_version_id` normalmente será `NULL`.
- Este SQL reproduce mejor la lógica vigente que una suma basada solo en snapshot.

## 8.2 Query de confirmadas por mes/contrato
### ORM equivalente al helper actual
```python
from ordentrabajov3.models import PrefacturaOTV3

prefacturas_mes = PrefacturaOTV3.objects.filter(
    estado_cierre__in=["por_facturar", "facturado"],
    fecha_prefactura__year=ANIO,
    fecha_prefactura__month=MES,
    contratos=contrato,
).only("resultado")

confirmadas_mes = 0
for pf in prefacturas_mes:
    visitas = (pf.resultado or {}).get("visitas") or {}
    confirmadas_mes += int(visitas.get("marcadas_prefactura") or 0)
```

### SQL equivalente aproximado
Ejemplo orientativo, asumiendo PostgreSQL y tabla M2M confirmada:

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

Checks mínimos sobre esta consulta:
- no debe incluir prefacturas `borrador`;
- debe agrupar por período calendario de `fecha_prefactura`;
- debe sumar `marcadas_prefactura`, no `proyectadas_mes` ni `exceso_prefactura`.

## 8.3 Check automático diario recomendado
**Propuesta / mejora futura**: job diario con estas reglas:
- frecuencia: 1 vez al día, idealmente madrugada (por ejemplo 03:00 UTC o equivalente negocio)
- ventana: mes actual y mes anterior
- agrupación: por contrato y período
- condición base de alerta: diferencia distinta de 0

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

### Query consolidada sugerida para el job
```sql
WITH incluidas AS (
  SELECT
    cic.contrato_id,
    SUM(
      COALESCE(
        cic.num_visitas_mensuales,
        cic.snapshot_num_visitas_mensuales,
        ps.num_visitas_mensuales,
        s.num_visitas_mensuales,
        0
      )
    ) AS incluidas_mes_calculadas
  FROM contratos_contratoitemcomercial cic
  LEFT JOIN contratos_planservicio ps
    ON ps.id = cic.plan_version_id
  LEFT JOIN contratos_servicio s
    ON s.id = cic.servicio_version_id
  GROUP BY cic.contrato_id
),
confirmadas AS (
  SELECT
    pc.contratoempresacliente_id AS contrato_id,
    DATE_TRUNC('month', p.fecha_prefactura)::date AS periodo,
    SUM(COALESCE((p.resultado->'visitas'->>'marcadas_prefactura')::int, 0)) AS confirmadas_mes
  FROM ordentrabajov3_prefacturaotv3 p
  JOIN ordentrabajov3_prefacturaotv3_contratos pc
    ON pc.prefacturaotv3_id = p.id
  WHERE p.estado_cierre IN ('por_facturar', 'facturado')
  GROUP BY 1, 2
)
SELECT
  c.contrato_id,
  c.periodo,
  i.incluidas_mes_calculadas,
  c.confirmadas_mes,
  (c.confirmadas_mes - i.incluidas_mes_calculadas) AS diff_confirmadas_vs_incluidas
FROM confirmadas c
JOIN incluidas i
  ON i.contrato_id = c.contrato_id
WHERE (c.confirmadas_mes - i.incluidas_mes_calculadas) <> 0;
```

Lectura operacional del resultado:
- `diff_confirmadas_vs_incluidas > 0`: ya hay más visitas confirmadas que incluidas para ese contrato/mes.
- `diff_confirmadas_vs_incluidas < 0`: todavía hay remanente, pero conviene revisar si el valor persistido en prefacturas coincide con el vigente contractual.

## 8.4 Umbrales y alertas sugeridos
- **Severidad alta:** `diff != 0` en contratos facturados.
- **Severidad media:** `resultado.visitas` faltante o campos nulos en prefacturas `por_facturar`.
- **Severidad baja:** mismatch entre campos legacy (`incluidas_total`) y nuevos (`incluidas_mes`).

Salida sugerida:
- comentario automático en issue/ticket,
- log estructurado para observabilidad,
- o creación de incidencia si afecta contratos `facturado`.

---

## 9. Auditoría y trazabilidad

## 9.1 Qué existe hoy
**Estado actual:** `ContratoItemComercial` y `PrefacturaOTV3` heredan de `ModeloBaseHistorico`, por lo que ya cuentan con:
- `fecha_creacion`
- `fecha_modificacion`
- `historia` (simple-history)

Además `PrefacturaOTV3` guarda:
- `creado_por`
- `actualizado_por`
- `comentario`
- `resultado`

## 9.2 Metadatos de auditoría recomendados
**Propuesta / mejora futura:** cada cambio de visitas debería dejar al menos:
- `who`: usuario/usuario_empresa
- `when`: timestamp
- `reason`: motivo de cambio
- `old_value`
- `new_value`
- `source_field`: `num_visitas_mensuales`, `snapshot_num_visitas_mensuales` o plan/servicio
- `periodo_afectado`
- `contrato_id`
- `contrato_item_comercial_id`

## 9.3 Eventos que conviene auditar explícitamente
1. Cambio manual de `num_visitas_mensuales` en `ContratoItemComercial`.
2. Cambio de plan/servicio que altere el fallback.
3. Creación/edición/finalización de `PrefacturaOTV3` con `resultado.visitas`.
4. Reasignación de OTs entre contratos durante matching.
5. Correcciones posteriores a una prefactura ya `por_facturar` o `facturado`.

---

## 10. Resumen operativo y backlog recomendado

## 10.1 Conclusión principal
Hoy **Matching Manual OT V3 puede ser consistente con el código**, pero esa consistencia solo existe si la validación se hace contra la misma fuente que usa el sistema hoy:
- `ContratoItemComercial` para `incluidas_mes`
- `PrefacturaOTV3.resultado.visitas.marcadas_prefactura` del mismo mes para `confirmadas_mes`
- OTs presenciales seleccionadas para la proyección de la sesión actual

El mayor riesgo no es una fórmula aislada, sino la combinación de:
- múltiples campos posibles para visitas,
- cambios contractuales a mitad de mes,
- ausencia de filtro de items “vigentes” en el helper,
- y mezcla de cálculo backend con proyección frontend.

## 10.2 Acciones recomendadas
### Prioridad alta
1. **Dejar documentado en el PR y en este análisis** que OTV3 usa `ContratoItemComercial`, no `ContratoVisita`, como fuente actual.
2. **Agregar tests backend** para multi-item, multi-contrato, cambio de mes y exclusión de prefacturas `borrador`.
3. **Implementar o diseñar trazabilidad adicional en `resultado.visitas`** para identificar el origen por item.
4. **Implementar job diario de discrepancias** por contrato/mes.

### Prioridad media
5. Evaluar si `contrato.items_comerciales.all()` debe filtrar vigencia/estado o si se requiere normalizar datos legacy.
6. Definir contrato JSON estable entre backend y frontend para `visitas_contrato` y `resultado.visitas`.
7. Agregar chequeo preventivo cuando las OTs seleccionadas no correspondan al contrato usado para comparativa.

### Prioridad baja
8. Evaluar como cambio futuro si la prioridad correcta de negocio debiera ser `snapshot` antes que `num_visitas_mensuales`.
9. Exponer en UI un tooltip o detalle de origen de visitas por contrato/item para soporte y QA.

## 10.3 Backlog sugerido de tickets
- **DEV:** centralizar y tipar contrato JSON de `visitas_contrato` / `resultado.visitas`.
- **DEV:** agregar `origenes` y `campo_resuelto` al snapshot de visitas.
- **DEV:** job diario de validación de discrepancias contrato vs prefacturas.
- **DEV:** validación de integridad OT/contrato en comparativa y creación de prefactura.
- **QA:** matriz de pruebas con escenarios de fallback, cambio de mes, exceso y contratos múltiples.
- **QA:** casos de regresión sobre `MatchingManualOTV3` y `DetallePrefacturaOTV3`.

---

**Este análisis queda orientado a desarrollo y QA para validar, detectar y mejorar la consistencia de visitas contractuales en Matching Manual OT V3, distinguiendo claramente entre la lógica real hoy implementada y las mejoras sugeridas.**
