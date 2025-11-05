---
title: "Redux Toolkit y Thunks"
scope: "frontend"
status: "active"
last_updated: "2025-11-04"
---

# Redux Toolkit y Thunks

## Objetivo
Explicar cómo funciona Redux Toolkit en este proyecto, específicamente el patrón de thunks para operaciones asíncronas (llamadas HTTP). Destinado a desarrolladores que exploran el sistema y necesitan entender el flujo de datos.

---

## ¿Qué es Redux Toolkit?

Redux Toolkit es la biblioteca oficial para gestionar **estado global** en aplicaciones React. En este proyecto:

- **Estado global**: Datos compartidos entre múltiples componentes (empresas, usuarios, cotizaciones, etc.)
- **Store**: Contenedor centralizado donde vive todo el estado
- **Slices**: Módulos que separan el estado por dominio (empresaSlice, invitacionSlice, etc.)
- **Thunks**: Funciones asíncronas para llamadas HTTP (GET, POST, PUT, DELETE)

---

## Arquitectura de Redux en el Proyecto

```
frontend/src/
├── store/
│   ├── index.ts                 # Configuración del store principal
│   └── slices/
│       ├── empresa/
│       │   └── empresaSlice.ts  # Estado de empresas
│       ├── invitacion/
│       │   └── invitacionSlice.ts  # Estado de invitaciones
│       ├── cotizacion/
│       │   └── cotizacionSlice.ts  # Estado de cotizaciones
│       └── ...
```

---

## Anatomía de un Slice

### Estructura básica

**Archivo**: `frontend/src/store/slices/invitacion/invitacionSlice.ts`

```typescript
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import ApiService from "@/services/ApiService"
import { IInvitacionEmpresa } from "@/interface/invitacion.interface"

// 1️⃣ DEFINIR ESTADO
export interface InvitacionState {
    loading: boolean                    // ← Indica si hay petición en curso
    error: string | undefined           // ← Mensaje de error si falla
    listaInvitaciones: IInvitacionEmpresa[]  // ← Datos obtenidos
}

// 2️⃣ ESTADO INICIAL
const initialState: InvitacionState = {
    loading: false,
    error: undefined,
    listaInvitaciones: []
}

// 3️⃣ THUNK (Operación Asíncrona)
export const listaInvitacionesThunk = createAsyncThunk<
    IInvitacionEmpresa[],     // ← Tipo del dato que retorna (payload)
    undefined,                // ← Tipo del argumento (undefined = sin argumentos)
    {rejectValue: string}     // ← Tipo del error
>(
    'invitacion/listaInvitacionesThunk',  // ← Nombre único del thunk
    async (_, {rejectWithValue}) => {
        try {
            // 👉 Llamada HTTP
            const response = await ApiService.fetchData<IInvitacionEmpresa[]>({
                url: `/api/invitaciones-empresa/`,
                method: 'get'
            })
            return response.data  // ← Retorna datos al fulfilled
        } catch(error: any) {
            return rejectWithValue(error.response.data)  // ← Retorna error al rejected
        }
    }
)

// 4️⃣ SLICE (Reducer + Acciones)
const invitacionSlice = createSlice({
    name: 'invitacion/invitacionSlice',
    initialState,
    reducers: {},  // ← Acciones síncronas (ninguna en este caso)
    extraReducers(builder) {
        // 👉 Manejar estados del thunk
        builder
            .addCase(listaInvitacionesThunk.pending, (state) => {
                state.loading = true  // ← Petición en curso
            })
            .addCase(listaInvitacionesThunk.fulfilled, (state, action) => {
                state.loading = false
                state.listaInvitaciones = action.payload  // ← Guardar datos
            })
            .addCase(listaInvitacionesThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload  // ← Guardar error
            })
    },
})

export default invitacionSlice.reducer
```

---

## Ciclo de Vida de un Thunk

```
1. DISPATCH (Componente)
   ↓
   dispatch(listaInvitacionesThunk())
   ↓
2. PENDING (Estado: loading = true)
   ↓
   Componente muestra spinner/loading
   ↓
3. HTTP REQUEST (ApiService → Backend)
   ↓
   GET /api/invitaciones-empresa/
   ↓
4a. SUCCESS → FULFILLED
   ↓
   state.listaInvitaciones = [...datos]
   state.loading = false
   ↓
   Componente renderiza datos

4b. ERROR → REJECTED
   ↓
   state.error = "mensaje de error"
   state.loading = false
   ↓
   Componente muestra error
```

---

## Uso en Componentes

### Paso 1: Importar hooks y thunk

```typescript
import { useAppDispatch, useAppSelector } from "@/store"
import { listaInvitacionesThunk } from "@/store/slices/invitacion/invitacionSlice"
```

### Paso 2: Obtener dispatch y estado

```typescript
function DetalleEmpresa() {
    const dispatch = useAppDispatch()  // ← Para disparar acciones
    const { listaInvitaciones, loading, error } = useAppSelector((state) => state.invitacion)  // ← Leer estado
    
    // ...
}
```

### Paso 3: Disparar thunk en useEffect (carga inicial)

```typescript
useEffect(() => {
    // 👉 Cargar datos al montar el componente
    dispatch(listaInvitacionesThunk())
}, [])  // ← Array vacío = solo al montar
```

### Paso 4: Disparar thunk en respuesta a acción del usuario

```typescript
const handleCrearInvitacion = async (values) => {
    // 1. Crear invitación via API
    await ApiService.fetchData({
        url: '/api/invitaciones-empresa/',
        method: 'POST',
        data: values
    })
    
    // 2. Recargar lista de invitaciones
    dispatch(listaInvitacionesThunk())  // ← Actualiza el estado global
}
```

### Paso 5: Renderizar datos del estado

```typescript
return (
    <div>
        {loading && <Spinner />}
        {error && <div>Error: {error}</div>}
        {listaInvitaciones.map(invitacion => (
            <div key={invitacion.id}>{invitacion.email}</div>
        ))}
    </div>
)
```

---

## Patrón Común: Crear + Recargar

Este proyecto usa un patrón específico:

```typescript
// ❌ ANTES (No funciona)
const handleCrear = async (values) => {
    await ApiService.post('/api/empresas/', values)
    // No recarga lista → estado desactualizado
}

// ✅ DESPUÉS (Funciona)
const handleCrear = async (values) => {
    await ApiService.post('/api/empresas/', values)
    dispatch(listaEmpresasThunk())  // ← Recarga lista desde API
}
```

**Razón**: El backend es la **única fuente de verdad**. Después de crear/editar/eliminar, recargar desde API garantiza consistencia.

---

## Thunks con Parámetros

Algunos thunks necesitan argumentos:

```typescript
// Definición
export const detalleEmpresaThunk = createAsyncThunk<
    IEmpresa,                      // ← Retorna objeto Empresa
    {id_empresa: string | number}, // ← Requiere ID como argumento
    {rejectValue: string}
>(
    'empresa/detalleEmpresaThunk',
    async ({id_empresa}, {rejectWithValue}) => {
        const response = await ApiService.fetchData({
            url: `/api/empresas/${id_empresa}/`,
            method: 'get'
        })
        return response.data
    }
)

// Uso
dispatch(detalleEmpresaThunk({id_empresa: '123'}))
```

---

## Comparación: Thunk con y sin Argumentos

| Aspecto | Sin Argumentos | Con Argumentos |
|---------|----------------|----------------|
| **Firma TypeScript** | `createAsyncThunk<ReturnType, undefined, ...>` | `createAsyncThunk<ReturnType, {param: Type}, ...>` |
| **Función async** | `async (_, {rejectWithValue})` | `async ({param}, {rejectWithValue})` |
| **Dispatch** | `dispatch(thunk())` | `dispatch(thunk({param: value}))` |
| **Ejemplo** | `listaInvitacionesThunk()` | `detalleEmpresaThunk({id_empresa: '123'})` |

---

## Caso de Estudio: Bug de Invitaciones

### Problema

Al crear una invitación:
1. Backend guarda correctamente ✅
2. Modal muestra "Invitacion creada" ✅
3. Tabla sigue vacía ❌

### Causa Raíz

**Modal de creación** (`CrearInvitacionEmpresaDesdeDetalleEmpresa.tsx`):
```typescript
onSubmit: async (values) => {
    await ApiService.post('/api/invitaciones-empresa/', values)
    dispatch(listaInvitacionesThunk())  // ← Recarga lista
    setIsOpen(false)
}
```

**Componente padre** (`DetalleEmpresa.tsx`):
```typescript
useEffect(() => {
    dispatch(detalleEmpresaThunk({id_empresa: id}))
    dispatch(listaMisSucursalesThunk({id_empresa: id}))
    // ❌ FALTA: dispatch(listaInvitacionesThunk())
}, [id])
```

**Flujo problemático**:
1. Usuario visita `/empresa/detalle/123`
2. `useEffect` carga empresa y sucursales
3. Pero NO carga invitaciones → `listaInvitaciones = []`
4. Usuario crea invitación → Modal llama `listaInvitacionesThunk()` → Ahora sí aparece
5. Usuario recarga página → Vuelve al paso 2 → Invitaciones desaparecen

### Solución

```typescript
useEffect(() => {
    dispatch(detalleEmpresaThunk({id_empresa: id}))
    dispatch(listaMisSucursalesThunk({id_empresa: id}))
    dispatch(listaInvitacionesThunk())  // ✅ Agregado
}, [id])
```

**Lección**: Siempre cargar datos en el `useEffect` inicial si se van a mostrar en la UI.

---

## Checklist de Debugging para Thunks

Cuando un componente no muestra datos:

- [ ] ¿El thunk está importado?
- [ ] ¿Se dispara el thunk en `useEffect`?
- [ ] ¿El `useEffect` tiene las dependencias correctas?
- [ ] ¿El selector lee el slice correcto? (`state.invitacion` vs `state.empresa`)
- [ ] ¿El backend retorna datos? (verificar en Network tab)
- [ ] ¿El `fulfilled` guarda los datos en el campo correcto del estado?
- [ ] ¿Hay errores en consola del navegador?

---

## Convenciones del Proyecto

### Nomenclatura de Thunks

| Patrón | Ejemplo | Descripción |
|--------|---------|-------------|
| `lista<Entidad>Thunk` | `listaEmpresasThunk` | Obtener lista completa |
| `lista<Entidad>FiltroThunk` | `listaInvitacionesFiltroThunk` | Obtener lista filtrada |
| `detalle<Entidad>Thunk` | `detalleEmpresaThunk` | Obtener detalle de un registro |
| `crear<Entidad>Thunk` | `crearEmpresaThunk` (raro) | Crear registro |
| `editar<Entidad>Thunk` | `editarEmpresaThunk` (raro) | Editar registro |

**Nota**: Crear/editar/eliminar suelen hacerse con `ApiService` directo en el componente, seguido de `dispatch(listaThunk())`.

### Estructura de Slices

```
state.<slice>.<campo>
  ↓      ↓       ↓
state.invitacion.listaInvitaciones
state.empresa.detalleEmpresa
state.cotizacion.listaCotizaciones
```

---

## Referencias Cruzadas

- [Frontend (React)](./frontend-instructions.md): componentes, hooks, estado local
- [Estructura del Store](./store-structure.md): índice completo de slices, ubicaciones, relaciones
- [Backend (Django)](./backend-instructions.md): APIs REST, serializers
- [Testing](./testing.md): testing de thunks con msw

---

**Última actualización**: 2025-11-04  
**Aprendido durante**: Exploración del módulo Empresas (bug de invitaciones)
