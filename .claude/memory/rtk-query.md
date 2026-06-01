---
name: rtk-query
description: Tags, invalidación, anti-patrón refetch(), deuda técnica, 75+ tags registrados
lastUpdated: 2026-06-01
relatedFiles:
  - frontend/src/services/RtkQueryService.ts
  - .github/instructions/rtk-query-best-practices.md
---

# RTK Query — Manejo de Cache

## La Regla de Oro

✅ **Usar `invalidatesTags` en mutations** — RTK refetch automáticamente
❌ **NUNCA `refetch()` manual post-mutation** — Rompe el cache

## Patrón Correcto

```tsx
// Query con providesTags
const { data } = useGetOTQuery(id);

// Mutation con invalidatesTags
const [updateOT] = useUpdateOTMutation();

const handleUpdate = async () => {
    await updateOT({ id, data }).unwrap();
    // RTK invalida automáticamente los tags
    // Los queries con esos tags refetch solos
};
```

## Patrón Incorrecto

```tsx
// ❌ MALO - rompe el cache inteligente
const { data, refetch } = useGetOTQuery(id);
const [updateOT] = useUpdateOTMutation();

const handleUpdate = async () => {
    await updateOT({ id, data }).unwrap();
    refetch(); // ❌ PROHIBIDO - por qué?
    // 1. RTK ya debería refetch via tags
    // 2. Fuerza refetch innecesario
    // 3. Ignora la estrategia de cache
};
```

## Excepciones Permitidas

Solo `refetch()` si:
1. ✅ Botón "Actualizar" explícito solicitado por usuario
2. ✅ Polling con lógica compleja (ej: aprobación de cotización pública)
3. ✅ Documentar **POR QUÉ** con comentario

```tsx
// ✅ Excepción válida: refresh manual explícito
const { data, refetch } = useGetCotizacion(id);

return (
    <Button onClick={() => refetch()} icon='HeroArrowPath'>
        Actualizar Cotización
    </Button>
);
```

## 75+ Tags Registrados

En `RtkQueryService.ts`, tags disponibles (actualizado 2026-06-01):

**Órdenes de Trabajo V3:**
- `OrdenTrabajoV3`, `OrdenTrabajoV3List`
- `TareaOTV3`, `AsignacionOTV3`, `ChecklistOTV3`
- `SeguimientoOTV3`, `GastoOTV3`, `AdjuntoOTV3`
- `HistorialOTV3`, `RetroalimentacionOTV3`
- `PrefacturasOTV3`, `PrefacturaOTV3`

**Contratos:**
- `Contratos`, `Contrato`, `ContratosActivosCliente`
- `ContratoTrabajador`, `ContratoTrabajadorList`, `ContratoTrabajadorHistorial`
- `ContratoServicios`, `ContratoLicencias`, `ContratoVisitas`
- `ContratoCondiciones`, `ContratoUsuarios`, `ContratoFirmas`
- `FacturasContrato`, `FacturaContrato`, `FacturasContratoResumen`

**Cotizaciones:**
- `Cotizaciones`, `CotizacionesItems`, `CotizacionesSolicitantes`, `CotizacionesSeguimiento`

**Bodegas:**
- `OrdenCompra`, `OrdenCompraItems`, `OrdenCompraList`, `MisOrdenesCompraList`
- `GuiaSalida`, `GuiaSalidaItems`, `StockItems`, `Bodegas`
- `Compra`, `CompraItems`

**Rendiciones:**
- `Rendicion`, `RendicionItems`, `RendicionList`, `RendicionCategorias`

**Empresas/Usuarios:**
- `Empresas`, `Empresa`, `Sucursales`, `Sucursal`
- `UsuariosEmpresa`, `UsuarioEmpresa`, `UsuarioActividades`
- `Clientes`, `Cliente`, `ClienteUsuarios`

**Otros:**
- `Notificaciones`, `NotificacionesNoLeidas`
- `CierreAdministrativoOT`, `CierreAdministrativoOTList`
- `Servicios`, `PlanesServicio`, `CaracteristicasServicio`
- `PlantillasContrato`, `PlantillaContratoV2`

## Deuda Técnica Documentada

Archivos con `refetch()` manual (requieren migración):

| Archivo | Usos | Prioridad |
|---------|------|-----------|
| `pages/Cotizaciones/components/DetalleCotizacion.tsx` | 9 | Media |
| `pages/OrdenTrabajo/ListaOT.tsx` | 1 | Alta |
| `pages/Bodegas/OrdenCompra/ListaMisOrdenesdeCompra.tsx` | 1 | Alta |
| `pages/Bodegas/OrdenCompra/ListaOrdenesCompraV2.tsx` | 1 | Alta |

**Plan de migración:** Revisar cada caso, reemplazar `refetch()` por `invalidatesTags` en mutation correspondiente.

## Checklist para Nuevos Endpoints

- [ ] Query tiene `providesTags`?
- [ ] Mutation tiene `invalidatesTags`?
- [ ] Tags están registrados en `RtkQueryService.ts`?
- [ ] NO hay `refetch()` post-mutation?
- [ ] Tests verifican invalidación?
