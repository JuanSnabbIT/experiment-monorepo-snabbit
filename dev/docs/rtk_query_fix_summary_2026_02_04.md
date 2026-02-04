---
Responsable: GitHub Copilot
Email: -
Proxima_revision: 2026-05-04
Estado: ✅ COMPLETADO
---

# RTK Query Cache Fix Summary – módulo OT (2026-02-04)

## 🎯 Objetivo
Corregir problemas de sincronización de datos en el módulo de Órdenes de Trabajo causados por violación del patrón de RTK Query. El usuario reportaba que después de cerrar una rendición, el mensaje en el modal `CerrarOT` seguía indicando que la rendición no estaba cerrada hasta hacer recarga manual de página.

---

## 🔍 Raíz del Problema

### Anti-patrón detectado: Manual `refetch()` + HTTP manual
```tsx
// ❌ INCORRECTO - Lo que se encontró:
const response = await ApiService.fetchData({              // HTTP manual
    url: `/api/rendiciones/${id}/`,
    method: 'patch',
    data: JSON.stringify({ estado: '3' }),
});
if (response.data) {
    dispatch(detalleRendicionThunk(...));                   // Refetch manual
}

// ❌ INCORRECTO - Múltiples lugares:
const { data, refetch } = useGetDetalleOrdenTrabajoQuery(...);
await updateOrdenTrabajo(...).unwrap();
refetch();                                                   // Llamada manual
```

### Problema de caché
- Query `getRendicionDetalle` **no tenía `providesTags`** → No sabía qué invalidar
- Cuando rendición se actualizaba, el caché de OT no se invalidaba
- UI mostraba datos stale hasta reload manual

---

## ✅ Soluciones Aplicadas

### 1. RTK Query Mutation para Rendición
**Archivo:** `frontend/src/store/slices/ordenTrabajo/ordenTrabajoApi.ts`

```typescript
// ✅ NUEVO - Mutation RTK Query
updateRendicion: builder.mutation<
    { estado: string; [key: string]: unknown },
    { id: number | string; data: Record<string, unknown> }
>({
    query: ({ id, data }) => ({
        url: `/api/rendiciones/${id}/`,
        method: 'patch',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(data),
    }),
    invalidatesTags: (_result, _error, { id }) => [
        { type: 'Rendicion', id }
    ],
}),
```

**Ventaja:** RTK Query automáticamente:
- Invalida caché al actualizar
- Refetch query si está activa
- Sin race conditions ni duplicación

### 2. Query con `providesTags`
```typescript
getRendicionDetalle: builder.query<
    { estado?: string; estado_label?: string },
    number | string
>({
    query: (id) => ({
        url: `/api/rendiciones/${id}/`,
        method: 'get',
    }),
    providesTags: (_result, _error, id) => [
        { type: 'Rendicion', id }  // ✅ NUEVO
    ],
}),
```

**Ventaja:** Vincula query a tag → invalidación automática

### 3. Tag Registrado en RtkQueryService
**Archivo:** `frontend/src/services/RtkQueryService.ts`

```typescript
tagTypes: [
    ...
    'Rendicion',  // ✅ NUEVO
    ...
]
```

### 4. Componentes Refactorizados
Eliminado anti-patrón en 5 archivos:

| Archivo | Cambio |
|---------|--------|
| `CambiarEstadoRendicion.tsx` | Usa `useUpdateRendicionMutation` en lugar de `ApiService.fetchData` + `detalleRendicionThunk` |
| `CerrarOT.tsx` | Elimina captura de `refetch()` |
| `CompletarOT.tsx` | Elimina captura de `refetch()` |
| `CompletarVisitaDT.tsx` | Elimina captura de `refetch()` |
| `DetalleOT.tsx` | Elimina múltiples `refetch()` y useEffect manual |

---

## 📊 Antes vs Después

### Flujo Anterior (Buggy)
```
1. Usuario cierra rendición
   └─> Backend: estado = 4 (rendida)
   
2. Frontend: CambiarEstadoRendicion.tsx
   └─> ApiService.fetchData() [HTTP manual]
   └─> dispatch(detalleRendicionThunk()) [refetch manual Redux]
   └─> Estado local Redux se actualiza
   
3. Usuario navega a OT
   └─> Modal CerrarOT se abre
   └─> Query getRendicionDetalle se ejecuta
   └─> SIN providesTags → NO sabe que fue invalidada
   └─> Retorna cache viejo
   └─> Mensaje: "Rendición NO está rendida" ❌ (FALSO)
   
4. Usuario hace Ctrl+F5
   └─> Caché se borra globalmente
   └─> Query trae datos nuevos
   └─> Mensaje desaparece ✅
```

### Flujo Nuevo (Correcto)
```
1. Usuario cierra rendición
   └─> Frontend: CambiarEstadoRendicion.tsx
   └─> useUpdateRendicionMutation() [RTK Query]
   └─> invalidatesTags: [{ type: 'Rendicion', id }]
   
2. RTK Query automáticamente:
   └─> Invalida caché de Rendicion{id}
   └─> Si getRendicionDetalle está activa → refetch automático
   └─> providesTags lo identifica
   
3. Usuario navega a OT
   └─> Modal CerrarOT se abre
   └─> Query getRendicionDetalle se ejecuta
   └─> Caché limpio + providesTags presente
   └─> Trae datos FRESCOS desde backend
   └─> Mensaje desaparece SIN necesidad de reload ✅
   
✅ Una sola request de actualización
✅ Una sola request de lectura posterior
✅ Consistencia garantizada
```

---

## 🧪 Validación

### Build
```bash
✅ npm run build
  - Compilación exitosa
  - Sin errores TypeScript
  - Sin errores critical
```

### Linting
```bash
✅ npm run lint
  - 0 errores nuevos
  - 2 warnings pre-existentes (no relacionados)
```

### Cambios de Archivos
```
✅ frontend/src/store/slices/ordenTrabajo/ordenTrabajoApi.ts
   - +1 query modificada (getRendicionDetalle)
   - +1 mutation nueva (updateRendicion)
   - +1 hook exportada (useUpdateRendicionMutation)

✅ frontend/src/services/RtkQueryService.ts
   - +1 tag en tagTypes ('Rendicion')

✅ frontend/src/pages/Rendiciones/modals/CambiarEstadoRendicion.tsx
   - Reemplazado: ApiService.fetchData → useUpdateRendicionMutation
   - Reemplazado: detalleRendicionThunk → invalidación automática

✅ frontend/src/pages/OrdenTrabajo/modals/CerrarOT.tsx
   - Eliminado: refetch: refetchDetalle

✅ frontend/src/pages/OrdenTrabajo/modals/CompletarOT.tsx
   - Eliminado: refetch: refetchDetalleOrdenTrabajo

✅ frontend/src/pages/OrdenTrabajo/modals/CompletarVisitaDT.tsx
   - Eliminado: refetch: refetchDetalleOrdenTrabajo

✅ frontend/src/pages/OrdenTrabajo/DetalleOT.tsx
   - Eliminado: múltiples refetch()
   - Eliminado: useEffect manual

✅ dev/docs/auditoria_rtk_query_ot.md
   - Documentación completa del problema y solución
```

---

## 📋 Checklist de RTK Query

| Item | Status |
|------|--------|
| ¿Query tiene `providesTags`? | ✅ Sí |
| ¿Mutation tiene `invalidatesTags`? | ✅ Sí |
| ¿Se captura `refetch()` manualmente? | ✅ No |
| ¿Se llama `refetch()` en handlers? | ✅ No |
| ¿Se usa `ApiService.fetchData` + dispatch thunk? | ✅ No |
| ¿Tags están registrados en RtkQueryService? | ✅ Sí |
| ¿Build + Lint OK? | ✅ Sí |

---

## 🔗 Referencias
- `.github/instructions/rtk-query-best-practices.md` – Documentación oficial del patrón
- `.github/instructions/frontend-guide.md` – Convenciones RTK Query
- `dev/docs/auditoria_rtk_query_ot.md` – Análisis detallado

---

## 📝 Notas para el Equipo

1. **Patrón es crítico:** RTK Query `invalidatesTags` es **la fuente única de verdad** para invalidación de caché. No hay excepciones (salvo botones de refresh explícito).

2. **Testing manual recomendado:**
   - Cerrar rendición en `/Rendiciones`
   - Ir a `/OrdenTrabajo/{id}` y abrir modal `CerrarOT`
   - Verificar que el mensaje desaparece sin reload

3. **Similar a:** Análisis anterior en `dev/docs/analisis.md` ("RTK Query — Fix de Invalidación de Cache")

---

**Completado:** 2026-02-04  
**Próxima revisión:** 2026-05-04  
**Impacto:** Crítico - Corrige flujo de cierre de OT
