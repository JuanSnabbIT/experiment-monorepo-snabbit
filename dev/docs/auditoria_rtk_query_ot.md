---
Responsable: GitHub Copilot
Email: -
Proxima_revision: 2026-03-04
Estado: ✅ COMPLETADO - Aplicado 2026-02-04
---

# Auditoría: RTK Query Cache – Módulo de OT (2026-02-04)

## 🔴 Problemas Identificados

### Problema 1: Query `getRendicionDetalle` sin `providesTags`
**Ubicación:** `frontend/src/store/slices/ordenTrabajo/ordenTrabajoApi.ts:863-870`

**Descripción:**
```tsx
getRendicionDetalle: builder.query<
    { estado?: string; estado_label?: string },
    number | string
>({
    query: (id) => ({
        url: `/api/rendiciones/${id}/`,
        method: 'get',
    }),
    // ❌ NO tiene providesTags
}),
```

**Impacto:** Cuando una rendición se actualiza en el backend, RTK Query no invalida el caché de esta query. El componente `CerrarOT` sigue mostrando estado antiguo hasta recarga manual.

---

### Problema 2: Actualización de Rendición sin RTK Query Mutation
**Ubicación:** `frontend/src/pages/Rendiciones/modals/CambiarEstadoRendicion.tsx:102-112` (Rechazar) y `152-164` (Pagar)

**Descripción:**
```tsx
const response = await ApiService.fetchData({
    url: `/api/rendiciones/${detalleRendicion.id}/`,
    method: 'patch',
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ estado: '3' }),
});
if (response.data) {
    toast.success('Rendición rechazada', { autoClose: 1000 });
    setIsOpen(false);
    dispatch(
        detalleRendicionThunk({
            id_rendicion: detalleRendicion.id,
        }),
    );
}
```

**Impacto:**
- Se usa `ApiService.fetchData` (HTTP manual) en lugar de RTK Query mutation.
- Luego dispatchea `detalleRendicionThunk` (refetch manual con Redux thunk).
- Esto **viola el patrón de RTK Query** documentado en `.github/instructions/rtk-query-best-practices.md`.
- Crea condiciones de carrera y duplicación de requests.

---

### Problema 3: Manual `refetch()` en `CerrarOT`
**Ubicación:** `frontend/src/pages/OrdenTrabajo/modals/CerrarOT.tsx:24-27` (captura `refetch`) y `179` (llama manual)

**Descripción:**
```tsx
const { data: detalleOrdenTrabajo, refetch: refetchDetalle } = useGetDetalleOrdenTrabajoQuery(
    ordenId ?? 0,
    { skip: !ordenId },
);

// ... luego en el click handler:
await updateOrdenTrabajo({
    id: detalleOrdenTrabajo.id,
    data: { estado: 'cerrada' },
}).unwrap();
toast.success('Orden cerrada', { autoClose: 1000 });
refetchDetalle();  // ❌ ANTI-PATRÓN
```

**Impacto:** 
- `updateOrdenTrabajo` mutation ya tiene `invalidatesTags` que refresca automáticamente.
- El `refetchDetalle()` manual crea un request extra (doble fetch).
- Viola el patrón documentado.

---

### Problema 4: Instancias múltiples de anti-patrón en módulo OT
**Ubicación:** Múltiples archivos

```
- DetalleOT.tsx:114           → refetchDetalle() manual
- CompletarOT.tsx:287         → refetchDetalleOrdenTrabajo() manual  
- CompletarVisitaDT.tsx:158   → refetchDetalleOrdenTrabajo() manual
```

---

### Problema 5: Falta de invalidación cruzada entre OT y Rendición
**Descripción:** 
Cuando una rendición cambia de estado a "rendida" (estado=4), la OT asociada debe refrescarse porque el botón `CerrarOT` depende de `rendicionDetalle?.estado === 'rendida'`.

Sin `providesTags` en `getRendicionDetalle`, esta invalidación **no ocurre automáticamente**.

---

## ✅ Solución Requerida

### 1. Agregar `providesTags` a `getRendicionDetalle`
```tsx
getRendicionDetalle: builder.query<
    { estado?: string; estado_label?: string },
    number | string
>({
    query: (id) => ({
        url: `/api/rendiciones/${id}/`,
        method: 'get',
    }),
    providesTags: (_result, _error, id) => [{ type: 'Rendicion', id }],
}),
```

### 2. Crear RTK Query mutation para actualizar rendición
```tsx
updateRendicion: builder.mutation<
    { estado: string },
    { id: number | string; data: Record<string, unknown> }
>({
    query: ({ id, data }) => ({
        url: `/api/rendiciones/${id}/`,
        method: 'patch',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(data),
    }),
    invalidatesTags: (_result, _error, { id }) => [
        { type: 'Rendicion', id },
    ],
}),
```

### 3. Usar mutation en `CambiarEstadoRendicion`
Reemplazar `ApiService.fetchData` + `detalleRendicionThunk` con:
```tsx
const [updateRendicion] = useUpdateRendicionMutation();

// En handler:
await updateRendicion({
    id: detalleRendicion.id,
    data: { estado: '3' },
}).unwrap();
toast.success('Rendición rechazada', { autoClose: 1000 });
setIsOpen(false);
```

### 4. Eliminar `refetch()` manual en `CerrarOT` y otros
Cambiar:
```tsx
const { data: detalleOrdenTrabajo, refetch: refetchDetalle } = useGetDetalleOrdenTrabajoQuery(...)
// ... 
refetchDetalle(); // ❌ Eliminar
```

A:
```tsx
const { data: detalleOrdenTrabajo } = useGetDetalleOrdenTrabajoQuery(...)
// No capturar refetch. RTK Query invalidará automáticamente.
```

---

## 📊 Impacto en el Flujo "Validada y Cerrada"

### Antes (Comportamiento Actual - Buggy)
1. Usuario cierra rendición en `/Rendiciones`
2. Backend actualiza `estado_rendicion = 4` (rendida)
3. Frontend actualiza estado con `detalleRendicionThunk` (refetch manual)
4. Usuario va a `/OrdenTrabajo/{id}` y abre modal `CerrarOT`
5. Modal muestra estado antiguo de rendición (por falta de `providesTags`)
6. Mensaje: "La rendición NO está rendida" ❌ (Falso)
7. Usuario hace reload manual 🔄
8. Ahora sí muestra estado correcto

### Después (Comportamiento Esperado - Fixed)
1. Usuario cierra rendición en `/Rendiciones`
2. Backend actualiza `estado_rendicion = 4` (rendida)
3. Frontend usa mutation RTK Query
4. RTK Query invalida automáticamente `{ type: 'Rendicion', id }` via `invalidatesTags`
5. Usuario va a `/OrdenTrabajo/{id}` y abre modal `CerrarOT`
6. Modal consulta `useGetRendicionDetalleQuery` con caché limpio
7. Se obtiene estado CORRECTO desde backend
8. Mensaje desaparece, botón se habilita ✅
9. **Sin necesidad de reload manual**

---

## 🔗 Referencias
- `.github/instructions/rtk-query-best-practices.md` (documentación oficial)
- `.dev/docs/analisis.md` (análisis previo del problema)
- **Patrón correcto:** Confiar en `invalidatesTags` como fuente única de refresco

---

**Estado:** ✅ APLICADO Y VALIDADO - 2026-02-04
**Acción:** Todas las correcciones completadas
**Riesgo:** CRÍTICO – Afecta UX en flujo de cierre de OT
**Build Status:** ✅ ÉXITO - npm run build sin errores
**Lint Status:** ✅ ÉXITO - npm run lint sin errores nuevos

---

## 🔧 Cambios Aplicados

### 1. ✅ `ordenTrabajoApi.ts`
- Agregado `providesTags: [{ type: 'Rendicion', id }]` a query `getRendicionDetalle`
- Creada nueva mutation `updateRendicion` con `invalidatesTags`
- Exportada nueva hook `useUpdateRendicionMutation`

### 2. ✅ `RtkQueryService.ts`
- Agregado tag `'Rendicion'` al array de `tagTypes`

### 3. ✅ `CambiarEstadoRendicion.tsx`
- Eliminado: `ApiService.fetchData` (HTTP manual)
- Eliminado: `detalleRendicionThunk` (refetch manual)
- Implementado: `useUpdateRendicionMutation` (RTK Query)
- Resultado: Cambios de estado ahora usan el patrón correcto

### 4. ✅ `CerrarOT.tsx`
- Eliminado: captura de `refetch: refetchDetalle`
- Eliminado: llamada manual a `refetchDetalle()`
- Efecto: RTK Query invalida automáticamente via `invalidatesTags`

### 5. ✅ `CompletarOT.tsx`
- Eliminado: captura de `refetch: refetchDetalleOrdenTrabajo`
- Eliminado: llamada manual a `refetchDetalleOrdenTrabajo()`

### 6. ✅ `CompletarVisitaDT.tsx`
- Eliminado: captura de `refetch: refetchDetalleOrdenTrabajo`
- Eliminado: llamada manual a `refetchDetalleOrdenTrabajo()`

### 7. ✅ `DetalleOT.tsx`
- Eliminado: captura de múltiples `refetch()` (refetchDetalle, refetchHistorial, refetchHistorialSimple)
- Eliminado: useEffect que llamaba manualmente los refetch()
- Simplificado: Solo usan las queries, confiando en RTK Query

---

**Estado:** ✅ COMPLETADO  
**Acción:** Aplicar correcciones en 5 archivos principales
**Riesgo:** CRÍTICO – Afecta UX en flujo de cierre de OT
