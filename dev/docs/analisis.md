# Análisis de Consistencia de Número de Visitas en Matching Manual OT V3

## Objetivo
Verificar si el número de visitas incluidas/mostradas en el módulo **Matching Manual OT V3** corresponde fielmente a lo definido contractualmente para el cliente y mes relevante.

---

## 1. Flujo y Fuente de Datos para Visitas en Matching Manual OT V3

### a. Definición Contractual
- Las **visitas presenciales mensuales** incluidas en un contrato pueden definirse:
  - Directamente en el contrato (`ContratoEmpresaCliente`) mediante vínculos a `Visita` a través de `ContratoVisita` (frecuencia y cantidad).
  - A través de **planes de servicio** (`PlanServicio`, campo `num_visitas_mensuales`), los cuales se heredan al crear `ContratoItemComercial`.
  - El snapshot del número de visitas se guarda en los campos `num_visitas_mensuales` y `snapshot_num_visitas_mensuales` dentro de `ContratoItemComercial`.

### b. Consumo en Matching Manual OT V3
- El módulo **MatchingManualOTV3** se alimenta de órdenes de trabajo (OT) y contratos asociados (`contrato` de la OT).
- Los datos de visitas disponibles del contrato pueden recuperarse desde:
  - Los objetos `ContratoVisita` y directamente desde los items comerciales del contrato (`ContratoItemComercial`), usando los campos de visitas mensuales.
  - La visualización en el frontend depende de la integración entre la OT y la relación contractual.

### c. Mes/Periodo
- Es importante considerar el período temporal: las visitas son _mensuales_, y la información debe cruzarse respecto al mes de consulta/facturación.

---

## 2. Contraste de Lógica y Visualización vs Contrato
- Validar que el número mostrado como “incluido” en el módulo de Matching OT V3, por cliente y contrato seleccionado, **corresponde a la suma de las visitas mensuales incluidas contractualmente** para ese mes.
  - En contratos con planes/servicios que incluyen visitas (`num_visitas_mensuales` ≠ null): sumar lo definido para todos los items comerciales activos en el contrato (campo `num_visitas_mensuales`).
  - Si se usan `ContratoVisita` vinculados, sumar las cantidades para el tipo/frecuencia "mensual" correspondientes.
- La lógica back y front debe distinguir claramente:
  - Visitas incluidas (contractuales)
  - Visitas usadas (ya asignadas en reportes OT facturados)
  - Visitas remanentes
  - Visitas adicionales (si las hay)
- La visualización debe consultar al backend y mostrar el desglose exacto contractualmente (ideal: asociar tooltip/origen del dato).

---

## 3. Discrepancias, Riesgos y Detección
- **Fuentes múltiples** de “definición de visitas incluidas” (por plan, por vínculo directo) pueden provocar inconsistencias si no se centraliza/controla bien.
- El uso de snapshots con `snapshot_num_visitas_mensuales` evita desalineaciones por cambios futuros, pero puede desactualizarse en flujos manuales.
- La información de visitas puede “desalinearse” si:
  - Se modifican contratos/planes tras la creación del item comercial pero no se actualizan snapshots.
  - Se asocian OTs a contratos diferentes a los que les corresponden según facturación.
  - No hay una validación cruzada entre el cálculo de visitas incluidas y las visitas efectivamente usadas cada mes.
- Se deben implementar **checks** automáticos para detectar:
  - Cambios contractuales que no reflejan en visitas incluidas.
  - Discrepancias entre visitas usadas (OTs) y visitas incluidas contractualmente en backend/facturación.

---

## 4. Criterios de Validación y Trazabilidad

### a. Validación Funcional
- Al desplegar las visitas incluidas del contrato en Matching Manual OT V3 debe verificarse:
  - Que la suma por mes y cliente coincide con los ítems comerciales y/o vínculos explícitos (según corresponda por modelo de datos).
  - Que nunca se muestren más (ni menos) de las incluidas realmente para el mes consultado.

### b. Validación Técnica (QA/desarrollo)
- Agregar pruebas automáticas/unitarias para el backend que calculen las visitas incluidas por contrato comparando los distintos métodos (items comerciales vs vínculos directos).
- Pruebas de integración para verificar que el frontend recibe y representa correctamente el total calculado por el backend.

### c. Trazabilidad
- Cada visita “incluida” que muestra el frontend debe poder trazar su origen al contrato (ID, plan, item comercial, snapshot, periodo).
- Registrar y auditar cualquier cambio en el número de visitas incluidas, especialmente ante aprobaciones/cambios de contrato.

---

## Resumen y Recomendaciones
- Centralizar la lógica de recuento de visitas incluidas en el backend, facilitando API clara para el frontend.
- Usar siempre el snapshot (`snapshot_num_visitas_mensuales`) para facturación, evitando cambios retroactivos indeseados.
- Implementar comprobaciones automáticas y reportes de desalineación para asegurar consistencia.
- Documentar en QA/developer playbooks los criterios anteriores para labor de control.

---

**Este análisis orienta tanto al desarrollo como a QA sobre cómo controlar y mejorar la consistencia de visitas contractuales y facturadas en Matching Manual OT V3.**
