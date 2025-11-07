---
title: "Estructura del Store Redux"
scope: "frontend"
status: "active"
last_updated: "2025-11-04"
---

# Estructura del Store Redux

## Objetivo
Documentar la organización completa del store Redux en el proyecto, incluyendo todos los slices, sus ubicaciones y cómo acceder a ellos. Guía de referencia rápida para evitar confusiones sobre dónde está cada estado.

---

## 📁 Ubicación del Store

```
frontend/src/store/
├── index.ts              # Punto de entrada, exports centralizados
├── storeSetup.ts         # Configuración del store Redux
├── rootReducer.ts        # Combina todos los reducers
├── hook.ts               # useAppDispatch, useAppSelector
└── slices/               # 🎯 Todos los slices del sistema
    ├── auth/
    │   └── authSlice.ts
    ├── bodega/
    │   └── bodegaSlice.ts
    ├── calendario/
    │   └── calendarioSlice.ts
    ├── contratos/
    │   └── contratoSlice.ts
    ├── core/
    │   └── coreSlice.ts
    ├── cotizaciones/
    │   └── cotizacionSlice.ts
    ├── dashboard/
    │   └── dashboardSlice.ts
    ├── empresa/
    │   └── empresaSlice.ts
    ├── invitacion/         # ⭐ SLICE DE INVITACIONES
    │   └── invitacionSlice.ts
    ├── item/
    │   └── itemSlice.ts
    ├── ordenTrabajo/
    │   └── ordenTrabajoSlice.ts
    ├── recursos/
    │   └── recursosSlice.ts
    ├── rendiciones/
    │   └── rendicionSlice.ts
    └── visita/
        └── visitasSlice.ts
```

---

## 📊 Índice Completo de Slices

| # | Slice | Ubicación | Estado Global | Thunks Principales |
|---|-------|-----------|---------------|-------------------|
| 1 | **auth** | `slices/auth/authSlice.ts` | `state.auth` | `loginThunk`, `logoutThunk`, `getMeThunk` |
| 2 | **bodega** | `slices/bodega/bodegaSlice.ts` | `state.bodega` | `listaBodegasThunk`, `detalleBodegaThunk` |
| 3 | **calendario** | `slices/calendario/calendarioSlice.ts` | `state.calendario` | `listaEventosThunk` |
| 4 | **contrato** | `slices/contratos/contratoSlice.ts` | `state.contrato` | `listaContratosThunk`, `detalleContratoThunk` |
| 5 | **core** | `slices/core/coreSlice.ts` | `state.core` | - |
| 6 | **cotizacion** | `slices/cotizaciones/cotizacionSlice.ts` | `state.cotizacion` | `listaCotizacionesThunk` |
| 7 | **dashboard** | `slices/dashboard/dashboardSlice.ts` | `state.dashboard` | - |
| 8 | **empresa** | `slices/empresa/empresaSlice.ts` | `state.empresa` | `listaEmpresasThunk`, `detalleEmpresaThunk`, `listaMisSucursalesThunk` |
| 9 | **invitacion** ⭐ | `slices/invitacion/invitacionSlice.ts` | `state.invitacion` | `listaInvitacionesThunk`, `listaInvitacionesFiltroThunk` |
| 10 | **item** | `slices/item/itemSlice.ts` | `state.item` | `listaItemsThunk` |
| 11 | **ordenTrabajo** | `slices/ordenTrabajo/ordenTrabajoSlice.ts` | `state.ordenTrabajo` | `listaOrdenesTrabajoThunk` |
| 12 | **recursos** | `slices/recursos/recursosSlice.ts` | `state.recursos` | `listaRecursosThunk` |
| 13 | **rendicion** | `slices/rendiciones/rendicionSlice.ts` | `state.rendicion` | `listaRendicionesThunk` |
| 14 | **visita** | `slices/visita/visitasSlice.ts` | `state.visita` | `listaVisitasThunk` |

---

## 🔍 Caso Específico: Invitaciones

### ❌ Error Común

```typescript
// ❌ INCORRECTO - Buscar invitaciones en empresaSlice
import { listaInvitacionesThunk } from '@/store/slices/empresa/empresaSlice'
const { listaInvitaciones } = useAppSelector((state) => state.empresa)
```

**Por qué falla**: `empresaSlice` NO contiene datos de invitaciones.

### ✅ Forma Correcta

```typescript
// ✅ CORRECTO - Importar desde invitacionSlice
import { listaInvitacionesThunk } from '@/store/slices/invitacion/invitacionSlice'
// O mejor aún, desde el index centralizado:
import { listaInvitacionesThunk } from '@/store'

// Leer del slice correcto
const { listaInvitaciones, loading, error } = useAppSelector((state) => state.invitacion)
```

---

## 📝 Reglas de Nomenclatura

### Nombres de Slices

- **Singular**: `empresa`, `invitacion`, `contrato`, `item`
- **Plural cuando es natural**: `cotizaciones`, `rendiciones`, `recursos`, `visita` (puede variar)

### Nombres de Estados

```typescript
interface <Entidad>State {
    loading: boolean
    error: string | undefined
    lista<Entidades>: <TipoEntidad>[]        // Lista completa
    detalle<Entidad>: <TipoEntidad> | null   // Detalle individual
    // Otros campos específicos...
}
```

**Ejemplos**:
```typescript
// InvitacionState
{
    loading: boolean
    error: string | undefined
    listaInvitaciones: IInvitacionEmpresa[]
}

// EmpresaState
{
    loading: boolean
    error: string | undefined
    listaEmpresas: IEmpresa[]
    detalleEmpresa: IEmpresa | null
    listaMisSucursales: ISucursalEmpresa[]
}
```

### Nombres de Thunks

| Patrón | Ejemplo | Descripción |
|--------|---------|-------------|
| `lista<Entidades>Thunk` | `listaInvitacionesThunk` | Obtener lista completa |
| `lista<Entidades>FiltroThunk` | `listaInvitacionesFiltroThunk` | Obtener lista filtrada |
| `detalle<Entidad>Thunk` | `detalleEmpresaThunk` | Obtener detalle individual |
| `crear<Entidad>Thunk` | `crearInvitacionThunk` (raro) | Crear registro |
| `editar<Entidad>Thunk` | `editarEmpresaThunk` (raro) | Editar registro |
| `eliminar<Entidad>Thunk` | `eliminarInvitacionThunk` (raro) | Eliminar registro |

---

## 🎯 Cómo Encontrar el Slice Correcto

### Método 1: Buscar en el código

```bash
# Buscar por nombre de entidad
grep -r "invitacionSlice" frontend/src/store/slices/

# Buscar por thunk específico
grep -r "listaInvitacionesThunk" frontend/src/
```

### Método 2: Revisar rootReducer.ts

**Archivo**: `frontend/src/store/rootReducer.ts`

```typescript
// Este archivo mapea TODOS los slices del sistema
const staticReducers = {
    auth,
    bodega,
    calendario,
    contrato,
    core,
    cotizacion,
    dashboard,
    empresa,
    invitacion,   // ← Aquí está el slice de invitaciones
    item,
    ordenTrabajo,
    recursos,
    rendicion,
    visita,
    [RtkQueryService.reducerPath]: RtkQueryService.reducer,
}
```

### Método 3: Revisar index.ts

**Archivo**: `frontend/src/store/index.ts`

```typescript
// Todos los exports centralizados
export * from './slices/auth/authSlice'
export * from './slices/bodega/bodegaSlice'
export * from './slices/calendario/calendarioSlice'
export * from './slices/core/coreSlice'
export * from './slices/dashboard/dashboardSlice'
export * from './slices/empresa/empresaSlice'
export * from './slices/invitacion/invitacionSlice'  // ← AQUÍ
export * from './slices/item/itemSlice'
// ...
```

**Uso**: Importar siempre desde `@/store` (no desde rutas específicas)

```typescript
// ✅ CORRECTO
import { listaInvitacionesThunk, useAppSelector } from '@/store'

// ❌ EVITAR (más verboso, propenso a errores)
import { listaInvitacionesThunk } from '@/store/slices/invitacion/invitacionSlice'
import { useAppSelector } from '@/store/hook'
```

---

## 🔧 Debugging: ¿Por qué no veo mis datos?

### Checklist de Verificación

1. **¿Importé desde el slice correcto?**
   ```typescript
   // Verificar que el import sea del slice correcto
   import { listaInvitacionesThunk } from '@/store'
   ```

2. **¿Leo del state correcto?**
   ```typescript
   // ❌ INCORRECTO
   const { listaInvitaciones } = useAppSelector((state) => state.empresa)
   
   // ✅ CORRECTO
   const { listaInvitaciones } = useAppSelector((state) => state.invitacion)
   ```

3. **¿Disparo el thunk?**
   ```typescript
   useEffect(() => {
       dispatch(listaInvitacionesThunk())  // ← Debe estar presente
   }, [])
   ```

4. **¿El backend retorna datos?**
   - Abrir DevTools → Network tab
   - Buscar request a `/api/invitaciones-empresa/`
   - Verificar respuesta JSON

5. **¿El backend filtra los datos?**
   - Revisar `get_queryset()` en el ViewSet backend
   - Puede estar filtrando por usuario, empresa, sucursal, etc.
   - Ver sección "Filtros Backend" más abajo

---

## ⚠️ Filtros Backend (Importante)

### Problema Común

```
Frontend: dispatch(listaInvitacionesThunk())
   ↓
Backend: GET /api/invitaciones-empresa/
   ↓
ViewSet: get_queryset() filtra por usuario/sucursal
   ↓
Frontend recibe: [] (array vacío)
```

**Causa**: Backend aplica filtros en `get_queryset()` que pueden devolver queryset vacío.

### Ejemplo Real: InvitacionEmpresaViewSet

**Código**: `backend/cuentas/views.py`

```python
class InvitacionEmpresaViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        # Filtra por sucursal principal del usuario
        personalizacion = PersonalizacionUsuario.objects.filter(
            usuario=self.request.user
        ).first()
        
        if personalizacion and personalizacion.sucursal_principal:
            return InvitacionEmpresa.objects.filter(
                sucursal=personalizacion.sucursal_principal
            )
        
        # ⚠️ Si no hay PersonalizacionUsuario → queryset vacío
        return InvitacionEmpresa.objects.none()
```

### Solución

1. **Verificar filtros backend**: Revisar `get_queryset()` del ViewSet
2. **Configurar datos necesarios**: Crear `PersonalizacionUsuario`, asignar sucursal, etc.
3. **Agregar parámetros**: Modificar thunk para pasar filtros explícitos

---

## 📚 Relación entre Slices

### Slices Independientes

| Slice | Depende de | Notas |
|-------|------------|-------|
| `auth` | - | Base, otros slices usan `state.auth.user` |
| `invitacion` | - | **NO depende de empresaSlice** |
| `bodega` | - | Independiente |
| `item` | - | Independiente |

### Slices que Comparten Datos

| Slice | Comparte con | Cómo |
|-------|--------------|------|
| `empresa` | `invitacion` | Invitaciones pertenecen a sucursales de empresa, pero **no están en empresaSlice** |
| `contrato` | `empresa` | Contratos tienen FK a Empresa |
| `ordenTrabajo` | `contrato`, `recursos` | OT derivan de contratos y asignan recursos |

**Importante**: Aunque haya relación de negocio, cada entidad tiene su propio slice.

---

## 🎓 Mejores Prácticas

### 1. Importar desde index centralizado

```typescript
// ✅ CORRECTO
import { 
    listaInvitacionesThunk, 
    listaEmpresasThunk,
    useAppSelector,
    useAppDispatch 
} from '@/store'
```

### 2. Leer del slice correcto

```typescript
// Para invitaciones
const { listaInvitaciones } = useAppSelector((state) => state.invitacion)

// Para empresas
const { listaEmpresas } = useAppSelector((state) => state.empresa)

// Para sucursales (están en empresaSlice)
const { listaMisSucursales } = useAppSelector((state) => state.empresa)
```

### 3. Disparar thunks en useEffect inicial

```typescript
useEffect(() => {
    // Cargar todos los datos necesarios al montar
    dispatch(detalleEmpresaThunk({id_empresa: id}))
    dispatch(listaMisSucursalesThunk({id_empresa: id}))
    dispatch(listaInvitacionesThunk())  // ← No olvidar
}, [id])
```

### 4. Verificar respuestas en Network tab

Siempre validar que el backend retorne los datos esperados antes de culpar al Redux.

---

## 📖 Referencias Cruzadas

- [Redux Toolkit y Thunks](./redux-thunks.md): Detalles sobre cómo funcionan los thunks
- [Frontend (React)](./frontend/general.md): Guía general del frontend
- [Backend (Django)](./backend/general.md): ViewSets y `get_queryset()`

---

**Última actualización**: 2025-11-04  
**Creado por**: Análisis durante exploración del módulo Empresas (bug de invitaciones)

---

## 🔍 Apéndice: Comando para Listar Todos los Slices

```bash
# Desde la raíz del proyecto
find frontend/src/store/slices -name "*Slice.ts" -type f
```

Resultado:
```
frontend/src/store/slices/auth/authSlice.ts
frontend/src/store/slices/bodega/bodegaSlice.ts
frontend/src/store/slices/calendario/calendarioSlice.ts
frontend/src/store/slices/contratos/contratoSlice.ts
frontend/src/store/slices/core/coreSlice.ts
frontend/src/store/slices/cotizaciones/cotizacionSlice.ts
frontend/src/store/slices/dashboard/dashboardSlice.ts
frontend/src/store/slices/empresa/empresaSlice.ts
frontend/src/store/slices/invitacion/invitacionSlice.ts  # ⭐
frontend/src/store/slices/item/itemSlice.ts
frontend/src/store/slices/ordenTrabajo/ordenTrabajoSlice.ts
frontend/src/store/slices/recursos/recursosSlice.ts
frontend/src/store/slices/rendiciones/rendicionSlice.ts
frontend/src/store/slices/visita/visitasSlice.ts
```
