# RTK Query Best Practices - ERP Monorepo

## 🚫 Anti-Pattern: Manual refetch()

**NEVER do this:**

```tsx
const { data, refetch } = useGetSomethingQuery(id);
const [updateSomething] = useUpdateSomethingMutation();

const handleUpdate = async () => {
    await updateSomething(payload).unwrap();
    refetch(); // ❌ WRONG - breaks RTK Query cache invalidation
};
```

## ✅ Correct Pattern: Trust invalidatesTags

**DO THIS:**

```tsx
const { data } = useGetSomethingQuery(id);
const [updateSomething] = useUpdateSomethingMutation();

const handleUpdate = async () => {
    await updateSomething(payload).unwrap();
    // ✅ RTK Query's invalidatesTags automatically refetches
};
```

## Rules

1. **Always include `providesTags` in queries**
   - Identifies what data this query provides
   - Example: `{ type: 'OrdenTrabajo', id }`

2. **Always include `invalidatesTags` in mutations**
   - Tells RTK Query which cached data is now stale
   - Example: `invalidatesTags: (_result, _error, { id }) => [{ type: 'OrdenTrabajo', id }]`

3. **Never capture `refetch` from hooks UNLESS:**
   - Manual refresh button needed (user explicitly requested it)
   - Complex polling logic required
   - Document WHY with a comment

4. **Components should use hooks directly**
   - `const { data } = useGetSomethingQuery(...)`
   - Not: `const { data, refetch } = ...` then call `refetch()` later

## Benefits

- ✅ Automatic cache invalidation
- ✅ No race conditions between manual and automatic refetch
- ✅ Cleaner component code
- ✅ Predictable data flow

## Exceptions

Only capture `refetch` if you have an explicit refresh button:

```tsx
const { data, refetch } = useGetSomethingQuery(id);

return (
    <>
        <Button onClick={() => refetch()}>🔄 Manual Refresh</Button>
        {/* Use data */}
    </>
);
```

## Related Files

- `frontend/src/store/slices/ordenTrabajo/ordenTrabajoApi.ts` - All mutations have `invalidatesTags`
- `frontend/src/pages/OrdenTrabajo/DetalleOT.tsx` - Correct pattern (removed manual refetch)
- `frontend/src/pages/Cotizaciones/components/DetalleCotizacion.tsx` - Correct pattern (polling with auto-cleanup)

---

**Last Updated**: 2026-02-03  
**Applies To**: All RTK Query endpoints in the monorepo
