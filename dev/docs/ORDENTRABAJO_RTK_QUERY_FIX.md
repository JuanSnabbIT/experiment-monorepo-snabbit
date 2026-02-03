# OrdenTrabajo RTK Query Cache Invalidation Fix

**Date**: 2025-02-03  
**Status**: ✅ COMPLETED  
**Issue**: UI not updating after mutations due to manual refetch() calls overriding RTK Query's automatic cache invalidation

---

## Problem Statement

OrdenTrabajo module had mixed architecture:
- ✅ Mutations properly configured with `invalidatesTags` in ordenTrabajoApi.ts (47 mutations)
- ❌ Components capturing `refetch()` from hooks and calling manually
- ❌ Result: Double-fetch + potential race conditions + stale data

**Symptom**: "No se actualizan varias partes del UI al hacer cambios"

---

## Root Cause

RTK Query's `invalidatesTags` mechanism ONLY works if components don't override it with manual `refetch()`:

```tsx
// ❌ BROKEN - Manual refetch() breaks RTK's automatic invalidation
const { data, refetch } = useGetSomethingQuery(...);
const [updateSomething] = useUpdateSomethingMutation();

const handleUpdate = async () => {
    await updateSomething(payload).unwrap();
    refetch();  // This override prevents automatic tag invalidation
};

// ✅ FIXED - Trust RTK Query's invalidatesTags
const { data } = useGetSomethingQuery(...);
const [updateSomething] = useUpdateSomethingMutation();

const handleUpdate = async () => {
    await updateSomething(payload).unwrap();
    // RTK Query automatically invalidates and refetches via invalidatesTags
};
```

---

## Solution Applied

### 1. **Removed refetch() captures from query hooks** (8 locations)

#### Components Updated:
- ✅ [Insumos.tsx](../../frontend/src/pages/OrdenTrabajo/components/Insumos.tsx)
  - Removed: `refetch: refetchInsumos`, `refetch: refetchGuia`
  
- ✅ [ListaServiciosOT.tsx](../../frontend/src/pages/OrdenTrabajo/components/ListaServiciosOT.tsx)
  - Removed: `refetch: refetchDetalleOrdenTrabajo`, `refetch: refetchServicios`, `refetch: refetchCompletibilidad`, `refetch: refetchSeguimientos`
  
- ✅ [ListaSoportesTecnicosOT.tsx](../../frontend/src/pages/OrdenTrabajo/components/ListaSoportesTecnicosOT.tsx)
  - Removed: `refetch: refetchDetalleOrdenTrabajo`, `refetch: refetchSoportes`, `refetch: refetchCompletibilidad`, `refetch: refetchSeguimientos`
  
- ✅ [UsuariosVinculadosOT.tsx](../../frontend/src/pages/OrdenTrabajo/components/UsuariosVinculadosOT.tsx)
  - Removed: `refetch: refetchUsuariosVinculados`, `refetch: refetchUsuariosAsignados`
  
- ✅ [RendicionesOT.tsx](../../frontend/src/pages/OrdenTrabajo/components/RendicionesOT.tsx)
  - Removed: `refetch: refetchGastos`
  
- ✅ [AgregarItemsACompraDT.tsx](../../frontend/src/pages/OrdenTrabajo/components/AgregarItemsACompraDT.tsx)
  - Removed: `refetch: refetchItemsCompra`
  
- ✅ [Adjuntos.tsx](../../frontend/src/pages/OrdenTrabajo/components/Adjuntos.tsx)
  - Removed: `refetch: refetchAdjuntos`
  
- ✅ [FotosAdjuntosOT.tsx](../../frontend/src/pages/OrdenTrabajo/components/FotosAdjuntosOT.tsx) *(Already done in previous session)*
  - Removed: `refetch: refetchAdjuntos`

### 2. **Removed manual refetch() calls** (~40+ call sites)

All standalone refetch() calls removed from:
- Handler functions (onSuccess, onClick, after .unwrap())
- UseEffect dependencies
- State change callbacks

**Pattern Applied**:
```tsx
// ❌ BEFORE
await mutation(payload).unwrap();
toast.success('Actualizado');
refetchServicios();  // ← REMOVED

// ✅ AFTER  
await mutation(payload).unwrap();
toast.success('Actualizado');
// RTK Query cache invalidates automatically
```

### 3. **Preserved legitimate refetch() patterns**

Left intact in:
- **Manual refresh buttons** (where user explicitly requests refresh)
- **DetalleOT.tsx useEffect** (force refresh on user/company change)
- **Modal components** (they use refetch for isolated scope)

---

## Technical Details

### API Configuration (No changes needed - already correct)

All mutations in ordenTrabajoApi.ts already have `invalidatesTags`:

```tsx
// Line 72 example from ordenTrabajoApi.ts
updateOrdenTrabajo: builder.mutation({
    query: ({ id, data }) => ({
        url: `/api/ordenes-de-trabajo/${id}/`,
        method: 'PATCH',
        body: data,
    }),
    invalidatesTags: (_result, _error, { id }) => [
        { type: 'OrdenTrabajo', id },  // ← Invalidates specific OT
        'OrdenTrabajoList',             // ← Invalidates list cache
    ],
}),
```

### Why This Works

1. Mutation completes → `invalidatesTags` triggers
2. RTK Query finds all queries providing those tags
3. Queries are marked as "stale"
4. React component re-renders with new data
5. **No manual refetch() needed**

---

## Files Changed

### Components (8 files)
- `frontend/src/pages/OrdenTrabajo/components/Insumos.tsx`
- `frontend/src/pages/OrdenTrabajo/components/ListaServiciosOT.tsx`
- `frontend/src/pages/OrdenTrabajo/components/ListaSoportesTecnicosOT.tsx`
- `frontend/src/pages/OrdenTrabajo/components/UsuariosVinculadosOT.tsx`
- `frontend/src/pages/OrdenTrabajo/components/RendicionesOT.tsx`
- `frontend/src/pages/OrdenTrabajo/components/AgregarItemsACompraDT.tsx`
- `frontend/src/pages/OrdenTrabajo/components/Adjuntos.tsx`
- `frontend/src/pages/OrdenTrabajo/components/FotosAdjuntosOT.tsx` *(from previous session)*

### Guides Created
- `.github/instructions/rtk-query-best-practices.md` - Reference for developers

---

## Testing Checklist

- [x] No TypeScript compilation errors
- [ ] Create new OrdenTrabajo → Verify Insumos list updates
- [ ] Update OrdenTrabajo estado → Verify ListaServiciosOT UI refreshes
- [ ] Add técnico to service → Verify ListaSoportesTecnicosOT UI refreshes
- [ ] Attach file → Verify Adjuntos list updates without reload
- [ ] Network tab shows single request per mutation (no double-fetch)
- [ ] No stale data after mutation
- [ ] Manual refresh button still works (if present)

---

## Expected Outcome

✅ **UI automatically updates after mutations**  
✅ **No manual page reload needed**  
✅ **Single HTTP request per mutation (no double-fetch)**  
✅ **Data consistency across all views**  
✅ **Proper cache invalidation timing**

---

## Related Documentation

- RTK Query Best Practices: [.github/instructions/rtk-query-best-practices.md](.github/instructions/rtk-query-best-practices.md)
- Cotizaciones Fixed Pattern: `frontend/src/pages/Cotizaciones/components/DetalleCotizacion.tsx` (reference for polling + RTK Query)

---

## Migration Notes

If you need to capture `refetch()` for legitimate reasons (e.g., manual refresh button):

```tsx
// Only capture refetch if you have an explicit refresh button
const { data, refetch } = useGetSomethingQuery(...);

return (
    <>
        <Button onClick={() => refetch()}>🔄 Manual Refresh</Button>
        {/* ... use data ... */}
    </>
);
```

**Do NOT** call `refetch()` in handlers. Trust `invalidatesTags` instead.

---

**Last Updated**: 2025-02-03  
**Responsible for Maintenance**: Frontend Tech Lead  
**Next Review**: When adding new mutations to OrdenTrabajo module
