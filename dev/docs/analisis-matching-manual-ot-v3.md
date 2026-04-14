---
Responsable: Fabián
Email: -
Proxima_revision: 2026-08-04
Estado: staging
---

# Análisis y Propuesta de Unificación UX/UI para Matching Manual OT V3

Fecha: 2026-04-14
Responsable: Análisis funcional

---

## Contexto y Objetivo

Actualmente, el proceso de generación de pre-facturas manuales sobre OTs en el módulo "Matching Manual OT V3" implica múltiples tarjetas (cards) de interacción secuencial:
- Seleccionar cliente
- Seleccionar OTs
- Contratos
- Fecha de prefactura y tipo de cambio

Esta fragmentación introduce fricción innecesaria, multiplica pantallas intermedias, y dificulta la validación rápida de conflictos.

**Objetivo:** Unificar los inputs y la información relevante de estas tarjetas en un flujo único, visualmente coherente y eficiente, manteniendo la claridad y anticipando posibles conflictos de datos (según auditoría V3).

## Hallazgos: Usabilidad y Auditoría V3

1. **Fricción por fragmentación:** Navegación múltiple, back/next y recargas; el usuario repite contexto.
2. **Confusión de estado:** No siempre es obvio en qué paso/fase está ni qué datos faltan.
3. **No anticipa conflictos:** Casos donde OTs seleccionadas no corresponden al cliente, o hay solapamientos de contratos, requieren recarga para mostrar error.
4. **Inputs redundantes:** Cliente y contratos rara vez cambian tras selección de OTs; pero se piden en formularios separados.
5. **Auditoría:** El flujo actual dificulta el rastreo de decisiones y la validación previa de reglas de negocio.

## Casos de Uso Críticos

- Selección de OTs que NO corresponden al cliente activo
- Cambios de contratos con OTs ya seleccionadas
- Cambio de fecha con variación significativa de tipo de cambio
- Validar que la combinación cliente+OTs+contrato es válida

## Propuesta de UX/UI

### 1. Componente Único ("Panel de Prefactura")

Se sugiere reemplazar las tarjetas fragmentadas por un **Panel unificado** tipo wizard vertical/simple con secciones claramente delimitadas en una sola pantalla:

#### Sección A: Cliente y Contrato
- Input autocomplete/selección de cliente
- Listado de contratos filtrados por cliente, visual compacto
- Al seleccionar cliente, refresca contratos y OTs disponibles

#### Sección B: Selección de OTs
- Checkbox/multiselect de OTs disponibles (ya filtradas por cliente/contrato)
- Al seleccionar OTs, visualiza resumen breve (id, título, monto, status)

#### Sección C: Fecha de Prefactura y Tipo de Cambio
- Input de fecha (date picker)
- Selector simple de tipo de cambio/preferencias
- Mostrar alerta si el tipo de cambio difiere significativamente de valor contrato

#### Sección D: Resumen y Validación
- Componente de resumen live con inputs actuales (cliente, contrato, OTs seleccionadas, fecha, tipo de cambio)
- Validaciones inline: incompatibilidades, OTs fuera de contrato, etc.
- Botón único "Generar Prefactura" habilitado solo si las validaciones pasan

### 2. Layout Sugerido
- Grid de 1-2 columnas (responsive)
- Secciones en tarjetas apiladas, no ocultas
- Validación y feedback immediate (sin reload entre pasos)

### 3. Manejo de Conflictos
- Alerta inmediata (badge o texto destacado) si hay error de compatibilidad
- No permitir avanzar/generar hasta resolver inconsistencias
- Tooltip descriptivos sobre posibles errores/conflictos

### 4. Estructura de Componentes (Referencia para Implementación)

```
PanelPrefacturaManualOT
├── ClienteContratoSelector
│   ├── AutocompleteCliente
│   └── ContratosPorClienteList
├── OTSelector
│   └── OTsDisponiblesList
├── FechaTipoCambioSelector
│   ├── DatePicker
│   └── SelectTipoCambio
├── ResumenValidacionLive
│   └── Muestra los datos seleccionados + validaciones
└── BotonGenerarPrefactura
```

- **Nota:** Cada subcomponente puede ser extraído en archivos separados para claridad, pero deben convivir en un solo panel visual (no wizard multipantalla).

## Justificación
- Se reduce la cantidad de pasos visibles a uno (multisección, no multipaso)
- El usuario puede ver y cambiar cualquier dato sin navegar hacia atrás
- Validación en tiempo real previene errores tontos
- Se anticipan potenciales conflictos de datos antes de guardar la prefactura

## Referencias y Ejemplos
- Documentación auditoría: `dev/docs/auditoria_retroalimentacion_ot_v3.md`
- Especificación modelo facturación: `dev/docs/analisis.md` sección Facturación
- Código actual: `frontend/src/pages/Facturacion/OTV3/MatchingManualOTV3.tsx`

## Próximos Pasos Sugeridos
- Validación UX con usuarios clave del área operación/facturación
- Implementar prototipo interactivo (puede ser Figma/MUI Storybook)
- Alinear naming de componentes y props para facilitar trazabilidad con backend
- Revisar flujos de validación backend para nuevos endpoints si aplica

---

**Este análisis debe ser revisado y validado antes de codificar.**