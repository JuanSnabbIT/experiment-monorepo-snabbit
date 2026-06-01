---
name: ordenes-trabajo
description: Versiones de OT (V1/V2/V3), estados, transiciones, URLs, migraciones
lastUpdated: 2026-06-01
relatedFiles:
  - backend/ordentrabajo/ (V1 - desactivada)
  - backend/ordentrabajov2/ (V2 - deprecada)
  - backend/ordentrabajov3/ (V3 - activa)
  - .github/copilot-instructions.md
---

# Órdenes de Trabajo: Versiones

## Matriz de Versiones

| Versión | Estado | Carpeta | URL Backend | URL Frontend | Código |
|---------|--------|---------|------------|-------------|--------|
| **V1** | ❌ DESACTIVADA | `backend/ordentrabajo/` | `/api/ordenes/` | `/orden-trabajo/` | Histórico, NO usar |
| **V2** | ⚠️ DEPRECADA | `backend/ordentrabajov2/` | `/api/ordenes-de-trabajo/` | `/orden-trabajo-v2/` | Existe, pero NO crear nuevas |
| **V3** | ✅ ACTIVA | `backend/ordentrabajov3/` | `/api/v3/ordenes/` | `/orden-trabajo-v3/` | **SIEMPRE usar para nuevas OT** |

## Estados OT V3 (ACTIVA)

Flujo de estado en `ordentrabajov3/models.py`:

```
borrador 
  ↓
preparacion 
  ↓
en_ejecucion 
  ↓
retroalimentacion 
  ↓
por_facturar 
  ↓
facturada
```

## Transiciones Importantes

- **De borrador a preparacion:** Validar datos mínimos
- **De en_ejecucion a retroalimentacion:** Solicitar feedback del cliente
- **De por_facturar a facturada:** Generar factura, no volver atrás

## Modelos V3

- `OrdenDeTrabajoV3` — Contrato principal
- `TareaOTV3` — Tareas dentro de la OT
- `AsignacionOTV3` — Técnicos asignados
- `SeguimientoOTV3` — Comentarios y eventos
- `GastoOTV3` — Gastos asociados
- `AdjuntoOTV3` — Documentos
- `RetroalimentacionOTV3` — Feedback del cliente

## Multi-tenancy

✅ **Verificado:** `OrdenDeTrabajoViewSet.get_queryset()` filtra por empresa correctamente.

## Migraciones

Si tocas modelos de OT:
```bash
python manage.py makemigrations ordentrabajov3
python manage.py migrate
```

## Frontend

- Nueva OT: `frontend/src/pages/Contratos/CrearContratoDelCliente.tsx`
- Detalle OT: `frontend/src/pages/Contratos/DetalleContrato.tsx`
- Lista OT: `frontend/src/pages/RRHH/ListaContratosTrabajador.tsx`

## RTK Query Tags (CRÍTICO)

```typescript
// En RtkQueryService.ts:
'OrdenTrabajoV3',
'OrdenTrabajoV3List',
'TareaOTV3',
'AsignacionOTV3',
'ChecklistOTV3',
'SeguimientoOTV3',
'GastoOTV3',
'AdjuntoOTV3',
'HistorialOTV3',
'RetroalimentacionOTV3',
'PrefacturasOTV3',
'PrefacturaOTV3',
```

Todas las mutations que afecten OT V3 DEBEN invalidar los tags correspondientes.

## Cuándo Usar Esto

- Si ve referencia a "órdenes de trabajo", "OT", "orden laboral"
- Si trabajando en nueva funcionalidad OT → verificar que usa V3
- Si migrando datos V2 → consolidar estrategia con equipo
