---
title: "Índice Local - Documentación Frontend"
scope: "frontend"
status: "active"
last_updated: "2025-11-05"
---

# Índice Local: Documentación Frontend

Este directorio contiene la documentación del frontend React con TypeScript.

## 📁 Estructura de Documentos

### Instrucciones Generales
- **[frontend-instructions.md](../frontend-instructions.md)** (~100 líneas)
  - Arquitectura y estructura (components/, pages/, services/, store/, routes/, hooks/)
  - Componentes funcionales con TypeScript
  - Estado global con Redux Toolkit
  - Servicios HTTP con BaseService.ts
  - Rutas con React Router y PrivateRoute
  - Estilos con TailwindCSS
  - Accesibilidad (a11y)
  - Comandos de desarrollo

### Documentación Detallada (3 documentos + 1 referencia arquitectura, ~1,500 líneas)

#### 1. Arquitectura Frontend (~900 líneas)
**[../../ARQUITECTURA_FRONTEND.md](../../ARQUITECTURA_FRONTEND.md)**

**Contenido**:
- **Estructura React detallada**: pages (5 categorías: core, operations, admin, support, settings), components de presentación reutilizables, organización por responsabilidad
- **14 Redux Slices documentados**: empresasSlice (listaEmpresas/detalleEmpresa/listaMisSucursales), cotizacionesSlice, contratosSlice, bodegasSlice, itemsSlice, ordenTrabajoSlice, recursosSlice, rendicionesSlice, visitasSlice, vacacionesSlice, calendarioSlice, activosSlice, ciudadesSlice, retroalimentacionSlice
- **BaseService.ts**: manejo JWT (access/refresh tokens, renovación automática), interceptores axios, base URL configuración
- **Routing**: React Router v6, roles y permisos con PrivateRoute, lazy loading con React.lazy + Suspense
- **Componentes comunes**: Button variants, Card layouts, Table con paginación, Modal, Form con validaciones
- **Convenciones de nombres**: PascalCase componentes, camelCase variables/funciones, UPPER_SNAKE_CASE constantes
- **Patterns de hooks**: useAuth, usePermissions, usePagination, useDebounce
- **Flujos de datos**: Login → JWT storage → API calls con interceptores → Redux thunks → UI updates
- **Cobertura**: 14/14 slices Redux (100%), estructura completa documentada

#### 2. Redux Toolkit y Thunks (~120 líneas)
**[../redux-thunks.md](../redux-thunks.md)**

**Contenido**:
- **¿Qué es Redux Toolkit?**: estado global, store, slices, thunks
- **Arquitectura**: ubicación slices (store/slices/), configuración store, rootReducer
- **Anatomía de un slice**: definir estado (interface), estado inicial, thunks (createAsyncThunk), slice (createSlice con extraReducers)
- **Ciclo de vida de un thunk**: dispatch → pending → HTTP request → fulfilled/rejected → estado actualizado → UI re-render
- **Uso en componentes**: useAppDispatch, useAppSelector, disparar thunks en useEffect o respuesta a usuario
- **Patrón común**: Crear + Recargar (POST API → dispatch(listaThunk()) para actualizar estado)
- **Thunks con parámetros**: tipado de argumentos, ejemplo detalleEmpresaThunk({id_empresa})
- **Caso de estudio**: Bug invitaciones (modal crea pero tabla vacía → faltaba dispatch en useEffect inicial)
- **Checklist de debugging**: importar correcto, disparar thunk, useEffect dependencies, selector correcto, backend retorna datos, fulfilled guarda datos, errores en consola

#### 3. Estructura del Store Redux (~150 líneas)
**[../store-structure.md](../store-structure.md)**

**Contenido**:
- **Ubicación del store**: store/ con index.ts, storeSetup.ts, rootReducer.ts, hook.ts, slices/
- **Índice completo de 14 slices**: tabla con nombre, ubicación, estado global, thunks principales
- **Caso específico: Invitaciones**: error común (buscar en empresaSlice cuando debería ser invitacionSlice), forma correcta (importar desde invitacionSlice, leer state.invitacion)
- **Reglas de nomenclatura**: slices (singular), estados (loading/error/lista.../detalle.../), thunks (lista.../detalle.../crear.../editar...Thunk)
- **Comparación thunks**: sin argumentos vs con argumentos (tipado, función async, dispatch)
- **Cómo encontrar el slice correcto**: buscar en código, revisar rootReducer.ts, revisar store/index.ts exports
- **Debugging**: checklist de verificación (import correcto, state correcto, dispatch thunk, backend retorna datos, fulfilled guarda datos)
- **Filtros backend**: ViewSet get_queryset() puede filtrar por usuario/sucursal → frontend recibe [] válido pero vacío
- **Mejores prácticas**: importar desde @/store centralizado, leer del slice correcto, disparar thunks en useEffect inicial, verificar respuestas en Network tab

#### Relación entre Documentos
```
ARQUITECTURA_FRONTEND.md (overview + 14 slices detallados)
        ↓
redux-thunks.md (cómo funcionan thunks, ciclo de vida, debugging)
        ↓
store-structure.md (índice slices, nomenclatura, cómo encontrar correcto)
        ↓
frontend-instructions.md (instrucciones generales, checklist desarrollo)
```

## 📊 Métricas de Cobertura

| Redux Slices | Documentación | Total Líneas |
|--------------|---------------|--------------|
| 14 de 14 (100%) | 4 docs | ~1,500 |

## 🔍 Cómo Usar Esta Documentación

### Por Redux Slice
Todos los 14 slices están documentados en **[ARQUITECTURA_FRONTEND.md](../../ARQUITECTURA_FRONTEND.md)** sección 3:

1. **empresasSlice** (`state.empresa`): listaEmpresas, detalleEmpresa, listaMisSucursales
2. **cotizacionesSlice** (`state.cotizacion`): listaCotizaciones, estados, filtros
3. **contratosSlice** (`state.contrato`): listaContratos, licencias
4. **bodegasSlice** (`state.bodega`): listaBodegas, movimientos
5. **itemsSlice** (`state.item`): listaItems, precios
6. **ordenTrabajoSlice** (`state.ordenTrabajo`): listaOrdenes, recursos, estado
7. **recursosSlice** (`state.recursos`): listaRecursos
8. **rendicionesSlice** (`state.rendicion`): listaRendiciones
9. **visitasSlice** (`state.visita`): listaVisitas, checkin/checkout
10. **vacacionesSlice** (`state.vacaciones`): listaSolicitudes, días hábiles
11. **calendarioSlice** (`state.calendario`): listaEventos, recurrencia
12. **activosSlice** (`state.activos`): listaActivos, tracking
13. **ciudadesSlice** (`state.ciudades`): regiones/provincias/comunas
14. **retroalimentacionSlice** (`state.retroalimentacion`): listaRetroalimentacion, rating

### Por Tarea de Desarrollo

#### Agregar nuevo componente
1. Leer **[frontend-instructions.md](../frontend-instructions.md)** sección 2 (Componentes y tipado)
2. Consultar **[ARQUITECTURA_FRONTEND.md](../../ARQUITECTURA_FRONTEND.md)** sección 4 (Componentes comunes) para patterns
3. Seguir convenciones: PascalCase archivo, interface props con tipado, responsabilidad única

#### Consumir API en componente
1. Identificar slice correcto en **[store-structure.md](../store-structure.md)** tabla de índice
2. Leer **[redux-thunks.md](../redux-thunks.md)** para entender ciclo de vida
3. Importar thunk y useAppSelector desde `@/store`
4. Disparar thunk en `useEffect` inicial
5. Leer estado con `useAppSelector((state) => state.<slice>)`

#### Crear nuevo thunk
1. Estudiar ejemplo en **[redux-thunks.md](../redux-thunks.md)** sección "Anatomía de un slice"
2. Definir tipado: `createAsyncThunk<ReturnType, ArgumentType, {rejectValue: string}>`
3. Implementar función async con try/catch y `rejectWithValue`
4. Agregar casos en `extraReducers`: pending, fulfilled, rejected
5. Exportar thunk desde slice

#### Debugging de Redux
1. Usar checklist en **[redux-thunks.md](../redux-thunks.md)** sección "Checklist de Debugging"
2. Verificar slice correcto con **[store-structure.md](../store-structure.md)**
3. Revisar Network tab para confirmar backend retorna datos
4. Verificar filtros backend en ViewSet (ver sección "Filtros Backend" en store-structure.md)

### Por Problema Común

#### "Componente no muestra datos"
→ **[redux-thunks.md](../redux-thunks.md)** sección "Checklist de Debugging" + **[store-structure.md](../store-structure.md)** sección "Debugging: ¿Por qué no veo mis datos?"

#### "No sé dónde está el slice de X"
→ **[store-structure.md](../store-structure.md)** tabla "Índice Completo de Slices" + método 1/2/3 para encontrar

#### "JWT expira constantemente"
→ **[ARQUITECTURA_FRONTEND.md](../../ARQUITECTURA_FRONTEND.md)** sección "BaseService.ts" + configuración lifetimes en backend

#### "Error CORS"
→ **[frontend-instructions.md](../frontend-instructions.md)** + backend-instructions.md sección CORS

## 📚 Referencias Cruzadas

### Documentos Relacionados
- **[../../ARQUITECTURA_SISTEMA.md](../../ARQUITECTURA_SISTEMA.md)**: Arquitectura completa del monorepo
- **[../../INICIALIZACION.md](../../INICIALIZACION.md)**: Setup frontend (npm install, npm run dev)
- **[../../EXPLORACION_EMPRESAS.md](../../EXPLORACION_EMPRESAS.md)**: Caso de estudio bug Redux invitaciones
- **[../backend-instructions.md](../backend-instructions.md)**: Consumir APIs REST desde frontend
- **[../../INDICE_DOCUMENTACION.md](../../INDICE_DOCUMENTACION.md)**: Índice maestro con guías de lectura

### Navegación por Rol
- **Nuevo desarrollador**: Ver [INDICE_DOCUMENTACION.md](../../INDICE_DOCUMENTACION.md) sección "Guía de Lectura: Nuevo Desarrollador" → recomienda leer ARQUITECTURA_FRONTEND (1h) + redux-thunks (30m) + store-structure (30m)
- **Desarrollar nueva feature**: Fase 3 Implementation → frontend-instructions.md + redux-thunks.md + BaseService.ts patterns
- **Troubleshooting Redux**: [INDICE_DOCUMENTACION.md](../../INDICE_DOCUMENTACION.md) sección "Redux/Estado" → redux-thunks debugging + store-structure + EXPLORACION_EMPRESAS bug#2

---

**Última actualización**: 2025-11-05  
**Creado por**: Reorganización de documentación (Task 5, 80% progreso)
