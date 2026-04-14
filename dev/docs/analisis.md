# Análisis de Unificación de Cards - Matching Manual OT V3

## Estado Actual (cards actuales)

En la vista `MatchingManualOTV3` se emplean actualmente múltiples cards para organizar la información presentada al usuario durante el proceso de matching manual y prefacturación de OTs en la versión V3. Las cards actuales y sus funciones principales son:

### Cards principales:
1. **Seleccionar Cliente**: Formulario simple para escoger el cliente.
2. **Seleccionar OTs**: Selección múltiple de OTs elegibles del cliente.
3. **Contratos (opcional)**: Aparece solo si el cliente tiene contratos activos, permite seleccionar contratos asociados.
4. **Fecha prefactura y tipo de cambio**: Campos para seleccionar fecha, moneda y muestra los valores del tipo de cambio actuales.
5. **Comparativa pactado vs ejecutado**: Muestra botón para calcular/recalcular, el resultado comparativo y:
    - Cards laterales agrupadas por: **Contratos**, **Cotizaciones**, **Órdenes de Compra** (cada una con su propia card), solo si corresponde.
    - Tabla principal de items ejecutados.
6. **Visitas de contrato**: Resumen de visitas, funcionalidad para marcar OTs con visita, y fijar precio de exceso (solo cuando aplica).
7. **Resumen y comentario**: Totales, badges de OTs incluidas y campo de comentario final.

Las cards laterales de "Contratos", "Cotizaciones" y "Órdenes de Compra" aparecen solo si hay datos relevantes para mostrar.

## Propuesta de Unificación (layout final)

- Simplificar la estructura agrupando la información contextual/relevante en una sola card lateral en vez de tres (Contratos, Cotizaciones, Órdenes de Compra), bajo una sección única llamada, por ejemplo: **Resumen Asociados**.
- Dentro de esta card, incorporar tabs o secciones claras/colapsables para navegar entre Contratos, Cotizaciones y OCs (si aplica), pero presentando siempre una sola estructura visual lateral.
- Mantener las siguientes cards principales como pasos:
    1. Selección de cliente
    2. Selección de OTs
    3. Contratos activos (opcional)
    4. Fecha y moneda de prefactura
    5. Comparativa y matching manual
    6. Visitas de contrato
    7. Resumen y comentario
    (no se fusionan, pero se busca máxima claridad visual, dejando el bloque lateral de asociados unificado)

- Donde antes había cards separadas para Contratos/Cotizaciones/OCs, ahora hay sólo una card con estructura segmentada.

## Impacto esperado en UX

- Vista de comparativa más limpia, menos "ruido" visual por exceso de cajas laterales.
- Acceso rápido a información asociada sin desplazamientos ni saltos visuales.
- Menor fatiga visual, el usuario encuentra todo lo contextual a los items ejecutados agrupado en una sola zona.
- Mejor escalabilidad si en futuro agregan más tipos de asociados (solo se añade una sub-sección/tab, no una nueva card flotando).

## Riesgos / Consideraciones

- Si la información de un segmento es muy extensa, podría requerir scroll interno o colapsables bien ejecutados para no sobrecargar la card unificada.
- Validar que la unificación no ocasione pérdida de contexto para el usuario (los títulos y tabs deben ser muy claros).
- Se necesita asegurar el mismo nivel de detalle/resumen que hoy (respetar lo esencial de cada tipo de asociado).
- Posibles ajustes de responsive design para asegurar legibilidad en resoluciones chicas.

## Criterios de aceptación

- En la comparativa, solo existe una card lateral bajo el título "Resumen Asociados" (o nombre similar), con tabs/secciones colapsables para Contratos, Cotizaciones, OCs.
- La información de cada segmento sigue accesible pero no saturada ni repetida.
- El usuario puede navegar entre segmentos (tabs o colapsables) sin perder contexto sobre la tabla de items.
- No desaparecen pasos funcionales principales: cliente, OTs, contratos, fecha, moneda, visitas, resumen.
- Visualmente, el lateral unificado es más compacto y sencillo respecto al estado actual.
- No se pierde información relevante que antes estaba disponible en los tres cards.

## Plan de implementación

1. **Refactor del layout en MatchingManualOTV3**
   - Ubicación: `frontend/src/pages/Facturacion/OTV3/MatchingManualOTV3.tsx`
   - Reemplazar bloque de los tres cards laterales (Contratos/Cotizaciones/OCs) por una sola card lateral ("Resumen Asociados").
   - Dentro del nuevo card, crear tabs o sub-secciones (preferible tabs si el espacio lo permite, colapsables si no).
   
2. **Componente "Resumen Asociados"**
   - Crear componente separado si la lógica crece (`frontend/src/pages/Facturacion/OTV3/components/ResumenAsociados.tsx`).
   - Mover ahí la lógica de mapping y rendering de cada segmento (contratos, cotizaciones, OCs).
   
3. **Prop drilling/props**
   - Pasar los VMs ya existentes (`contractCardsVM`, `cotizacionCardsVM`, `ordenCompraCardsVM` y helpers) al nuevo componente.
   
4. **Estilos & UX/UI**
   - Ajustar estilos para que el card resultante sea compacto, accesible y claro visualmente.
   - Revisar responsive y posibles desbordes por volumen de datos.
   
5. **Testing visual/manual**
   - Validar junto a usuarios o equipo de UX que la unificación mantiene claridad y reduce saturación visual respecto a la vista previa.

**No se prevén cambios en backend ni en lógica de negocios, salvo pequeños ajustes en propiedades de visualización si fuera requerido.**
