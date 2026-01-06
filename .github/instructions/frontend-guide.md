# 🎨 Frontend Guide – React 18 + TypeScript + Redux

Guía práctica para desarrollar componentes, hooks y lógica de estado en React.

---

## 📋 Estructura de `src/`

```
src/
├── components/           # Componentes reutilizables
│   ├── Button.tsx
│   ├── Modal.tsx
│   ├── Navbar.tsx
│   ├── Layout.tsx
│   └── ...
├── pages/                # Vistas/páginas (rutas principales)
│   ├── OrdenTrabajoPage.tsx
│   ├── DashboardPage.tsx
│   ├── LoginPage.tsx
│   └── ...
├── services/             # Servicios HTTP (usar ApiService, NO crear por módulo)
│   ├── ApiService.ts     # Servicio único para llamadas HTTP
│   ├── BaseService.ts    # Axios instance con interceptors
│   └── RtkQueryService.ts # RTK Query (si aplica)
├── store/                # Redux state management
│   ├── slices/           # Redux slices (features)
│   │   ├── auth.slice.ts
│   │   ├── ordenes.slice.ts
│   │   └── ...
│   ├── hooks.ts          # Hooks de Redux (dispatch, selector)
│   ├── index.ts          # Configuración del store
│   └── thunks.ts         # Thunks globales
├── hooks/                # Custom hooks
│   ├── useAuth.ts
│   ├── useOrdenTrabajo.ts
│   └── ...
├── interface/            # TypeScript interfaces
│   ├── IOrdenTrabajo.ts
│   ├── IUser.ts
│   └── ...
├── routes/               # Routing
│   ├── PrivateRoute.tsx
│   ├── index.tsx
│   └── asideRoutes.tsx
├── styles/               # Estilos globales
│   ├── globals.css
│   └── ...
├── utils/                # Funciones utilitarias
│   ├── formatters.ts
│   ├── validators.ts
│   └── ...
├── App.tsx
├── main.tsx
└── declaration.d.ts      # Declaraciones de tipos globales
```

---

## 🎯 Componentes React

### Patrón funcional + Hooks

```typescript
import { FC, useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchOrdenTrabajoThunk } from '@/store/slices/ordenes.slice';
import { IOrdenTrabajo } from '@/interfaces/IOrdenTrabajo';

interface Props {
  ordenId: number;
  onClose: () => void;
}

/**
 * Modal para mostrar detalles de una orden de trabajo.
 * 
 * Props:
 * - ordenId: ID de la OT a mostrar
 * - onClose: Callback cuando se cierra el modal
 */
export const OrdenTrabajoModal: FC<Props> = ({ ordenId, onClose }) => {
  // ============ State ============
  const dispatch = useAppDispatch();
  const { selectedOrden, loading, error } = useAppSelector(
    state => state.ordenes
  );
  
  // ============ Effects ============
  useEffect(() => {
    dispatch(fetchOrdenTrabajoThunk(ordenId));
  }, [ordenId, dispatch]);
  
  // ============ Handlers ============
  const handleClose = () => {
    onClose();
  };
  
  const handleMarcarCompleta = async () => {
    // Dispatch action para actualizar estado
    // dispatch(marcarOrdenCompletaThunk(ordenId));
  };
  
  // ============ Render ============
  if (loading) return <div className="spinner">Cargando...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!selectedOrden) return null;
  
  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>OT-{selectedOrden.numero}</h2>
          <button onClick={handleClose} className="btn-close">✕</button>
        </header>
        
        <main className="modal-body">
          <div className="form-group">
            <label>Descripción</label>
            <p>{selectedOrden.descripcion}</p>
          </div>
          
          <div className="form-group">
            <label>Estado</label>
            <p className={`status status-${selectedOrden.estado}`}>
              {selectedOrden.estado}
            </p>
          </div>
        </main>
        
        <footer className="modal-footer">
          <button onClick={handleMarcarCompleta} className="btn btn-primary">
            Marcar Completa
          </button>
          <button onClick={handleClose} className="btn btn-secondary">
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
};
```

### Buenas Prácticas
✅ **Haz:**
- Tipos explícitos en Props (interface)
- Documentación clara en JSDoc
- Separar state, effects, handlers, render (comentarios)
- Usar hooks en orden (state → effects → handlers)
- Componentes pequeños y reutilizables
- Destructuring en Props

❌ **Evita:**
- Props genéricos (`any`)
- Lógica compleja dentro del render
- Renderizado condicional anidado (usa early return)
- Actualizar state en render (sin useEffect)
- Componentes monolíticos (+ 300 líneas)

---

## 🔗 Interfaces TypeScript (interfaces/)

```typescript
// IOrdenTrabajo.ts
export interface IOrdenTrabajo {
  id: number;
  numero: string;
  descripcion: string;
  estado: 'pendiente' | 'en_progreso' | 'completada';
  empresa_id: number;
  usuario_asignado_id: number | null;
  fecha_creacion: string; // ISO 8601
  fecha_actualizacion: string;
}

// Request/Response types
export interface IOrdenTrabajoRequest {
  numero: string;
  descripcion: string;
  usuario_asignado_id?: number;
}

export interface IOrdenTrabajoResponse {
  success: boolean;
  data: IOrdenTrabajo;
  error: string | null;
}

// Página (list response)
export interface IPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
```

### Convenciones
- Prefijo `I` para interfaces (ej: `IOrdenTrabajo`)
- Sufijo `Request` / `Response` para peticiones HTTP
- Sufijo `Paginated` para listas
- Usa `string` para fechas (ISO 8601)
- Null-safe types (`id | null`)

---

## 🛠️ Servicios HTTP (services/)

### BaseService.ts

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

class BaseService {
  private axiosInstance: AxiosInstance;
  
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Interceptor: inyecta JWT en requests
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Interceptor: refresh token si expira
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const refreshToken = localStorage.getItem('refresh_token');
            const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
              refresh: refreshToken,
            });
            
            localStorage.setItem('access_token', response.data.access);
            originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
            return this.axiosInstance(originalRequest);
          } catch {
            // Refresh falló → logout
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
          }
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  async fetchData<T>(
    config: AxiosRequestConfig
  ): Promise<{ data: T; status: number }> {
    const response = await this.axiosInstance(config);
    return {
      data: response.data,
      status: response.status,
    };
  }
}

export default new BaseService();
```

### Uso de ApiService en componentes (Patrón Preferido)

En lugar de crear servicios específicos por módulo, usar `ApiService` directamente:

```typescript
// En el componente o thunk
import ApiService from '@/services/ApiService';

// Listar entidades
const listarOrdenes = async (page = 1) => {
  const { data } = await ApiService.fetchData<IPaginatedResponse<IOrdenTrabajo>>({
    url: '/api/ordentrabajov2/',
    method: 'get',
    params: { page },
  });
  return data;
};

// Crear entidad
const crearOrden = async (payload: IOrdenTrabajoRequest) => {
  const { data } = await ApiService.fetchData<IOrdenTrabajo>({
    url: '/api/ordentrabajov2/',
    method: 'post',
    data: payload,
  });
  return data;
};

// Eliminar entidad
const eliminarOrden = async (id: number) => {
  await ApiService.fetchData({
    url: `/api/ordentrabajov2/${id}/`,
    method: 'delete',
  });
};
```

### Buenas Prácticas
✅ **Haz:**
- Usar `ApiService.fetchData()` directamente en componentes/thunks
- Tipos genéricos `<T>` para responses
- Manejo de errores en componentes o slices
- JWT auto-refresh manejado por interceptor

❌ **Evita:**
- Crear `{Modulo}Service.ts` en `services/` (solo infraestructura ahí)
- Crear múltiples instancias de axios
- Lógica de negocio en servicios
- No tipar responses
- Hardcodear URLs

---

## 🔴 Redux (store/)

### Redux Slice (ordenes.slice.ts)

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import OrdenTrabajoService from '@/services/OrdenTrabajoService';
import { IOrdenTrabajo, IPaginatedResponse } from '@/interfaces';

// ============ Thunks ============

export const fetchOrdenTrabajoListThunk = createAsyncThunk<
  IPaginatedResponse<IOrdenTrabajo>,
  { page?: number; filters?: Record<string, any> },
  { rejectValue: string }
>(
  'ordenes/fetchList',
  async ({ page = 1, filters = {} }, { rejectWithValue }) => {
    try {
      return await OrdenTrabajoService.listar(page, filters);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Error al cargar OTs');
    }
  }
);

export const fetchOrdenTrabajoThunk = createAsyncThunk<
  IOrdenTrabajo,
  number,
  { rejectValue: string }
>(
  'ordenes/fetch',
  async (id, { rejectWithValue }) => {
    try {
      return await OrdenTrabajoService.obtener(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Error al cargar OT');
    }
  }
);

export const crearOrdenTrabajoThunk = createAsyncThunk<
  IOrdenTrabajo,
  { numero: string; descripcion: string },
  { rejectValue: string }
>(
  'ordenes/crear',
  async (payload, { rejectWithValue }) => {
    try {
      return await OrdenTrabajoService.crear(payload);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Error al crear OT');
    }
  }
);

// ============ Slice ============

interface OrdenesState {
  list: IOrdenTrabajo[];
  selectedOrden: IOrdenTrabajo | null;
  pagination: {
    count: number;
    next: string | null;
    previous: string | null;
  };
  loading: boolean;
  error: string | null;
}

const initialState: OrdenesState = {
  list: [],
  selectedOrden: null,
  pagination: {
    count: 0,
    next: null,
    previous: null,
  },
  loading: false,
  error: null,
};

export const ordenesSlice = createSlice({
  name: 'ordenes',
  initialState,
  reducers: {
    setSelectedOrden: (state, action: PayloadAction<IOrdenTrabajo | null>) => {
      state.selectedOrden = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchOrdenTrabajoListThunk
    builder
      .addCase(fetchOrdenTrabajoListThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrdenTrabajoListThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.results;
        state.pagination = {
          count: action.payload.count,
          next: action.payload.next,
          previous: action.payload.previous,
        };
      })
      .addCase(fetchOrdenTrabajoListThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Error desconocido';
      });
    
    // fetchOrdenTrabajoThunk
    builder
      .addCase(fetchOrdenTrabajoThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrdenTrabajoThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedOrden = action.payload;
      })
      .addCase(fetchOrdenTrabajoThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Error desconocido';
      });
    
    // crearOrdenTrabajoThunk
    builder
      .addCase(crearOrdenTrabajoThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(crearOrdenTrabajoThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.list.unshift(action.payload);
      })
      .addCase(crearOrdenTrabajoThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Error desconocido';
      });
  },
});

export const { setSelectedOrden, clearError } = ordenesSlice.actions;
export default ordenesSlice.reducer;
```

### Hooks Redux (hooks.ts)

```typescript
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### Store (index.ts)

```typescript
import { configureStore } from '@reduxjs/toolkit';
import ordenesReducer from './slices/ordenes.slice';
import authReducer from './slices/auth.slice';

export const store = configureStore({
  reducer: {
    ordenes: ordenesReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Uso en Componentes

```typescript
const dispatch = useAppDispatch();
const { list, loading } = useAppSelector(state => state.ordenes);

useEffect(() => {
  dispatch(fetchOrdenTrabajoListThunk({ page: 1 }));
}, [dispatch]);
```

---

## 🎣 Custom Hooks

```typescript
// useAuth.ts
import { useAppSelector } from '@/store/hooks';

export const useAuth = () => {
  const { user, isAuthenticated } = useAppSelector(state => state.auth);
  
  return {
    user,
    isAuthenticated,
    isLoading: !user && isAuthenticated,
  };
};

// useOrdenTrabajo.ts
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchOrdenTrabajoThunk } from '@/store/slices/ordenes.slice';
import { useEffect } from 'react';

export const useOrdenTrabajo = (id: number) => {
  const dispatch = useAppDispatch();
  const orden = useAppSelector(state => state.ordenes.selectedOrden);
  const loading = useAppSelector(state => state.ordenes.loading);
  
  useEffect(() => {
    if (id) {
      dispatch(fetchOrdenTrabajoThunk(id));
    }
  }, [id, dispatch]);
  
  return { orden, loading };
};
```

---

## 📍 Routing (routes/)

```typescript
// PrivateRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  children: React.ReactNode;
}

export const PrivateRoute = ({ children }: Props) => {
  const { isAuthenticated } = useAuth();
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// index.tsx
import { createBrowserRouter } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <PrivateRoute><DashboardPage /></PrivateRoute>,
  },
  // Más rutas...
]);
```

---

## 🎨 Estilos con TailwindCSS

```typescript
// Componente con TailwindCSS
<div className="flex flex-col gap-4 p-6">
  <h1 className="text-2xl font-bold text-gray-800">Órdenes de Trabajo</h1>
  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
    Nueva OT
  </button>
</div>
```

### Convenciones
- Utilizar utility classes (no CSS custom)
- `px-4 py-2` en lugar de custom spacing
- Responsive: `md:` (medium), `lg:` (large)
- Dark mode: `dark:bg-gray-800` si aplica
- Estados: `hover:`, `focus:`, `disabled:`

---

## ✅ Validación (utils/validators.ts)

```typescript
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePassword = (password: string): string | null => {
  if (password.length < 8) return 'Mínimo 8 caracteres';
  if (!/[A-Z]/.test(password)) return 'Debe incluir mayúscula';
  if (!/[0-9]/.test(password)) return 'Debe incluir número';
  return null;
};
```

---

## � Estructura de Módulos (Patrón Estándar)

Cada módulo en `pages/` debe seguir esta estructura consistente:

```
pages/{Modulo}/
├── components/                 # Sub-componentes del módulo
│   ├── Detalle{Entidad}.tsx   # Vista detalle
│   ├── Lista{Entidad}.tsx     # Tablas o listas
│   └── {Feature}OT.tsx        # Features específicas
│
├── modals/                     # Modales del módulo
│   ├── Crear{Entidad}.tsx     # Crear nueva entidad
│   ├── Editar{Entidad}.tsx    # Editar existente
│   ├── Eliminar{Entidad}.tsx  # Eliminar (si no usa ModalEliminar)
│   └── Agregar{Relacion}.tsx  # Agregar relaciones
│
├── Lista{Entidad}.tsx          # Vista principal lista
├── Detalle{Entidad}.tsx        # Vista detalle (si no está en components/)
└── {Entidad}Empresa.tsx        # Vista por empresa (si aplica)
```

### Ejemplos Reales:

```
OrdenTrabajo/
├── components/
│   ├── ListaSoportesTecnicosOT.tsx
│   ├── ListaServiciosOT.tsx
│   ├── DevolucionesOT.tsx
│   └── Adjuntos.tsx
├── modals/
│   ├── CrearOrdenOT.tsx
│   ├── CompletarOT.tsx
│   └── CrearSoporteTecnicoEnOT.tsx
├── DetalleOT.tsx
└── ListaOT.tsx

Cotizaciones/
├── components/
│   ├── DetalleCotizacion.tsx
│   └── SeguimientoCotizacion.tsx
├── modals/
│   ├── CrearCotizacion.tsx
│   ├── AprobarCotizacion.tsx
│   └── EnviarCotizacion.tsx
└── CotizacionesEmpresa.tsx
```

---

## 🛠️ Servicios HTTP (Patrón Obligatorio)

### ⚠️ Regla: NO crear servicios específicos por módulo

La carpeta `services/` es SOLO para infraestructura HTTP:
- ✅ `ApiService.ts` — Wrapper de axios con auth
- ✅ `BaseService.ts` — Configuración base
- ✅ `RtkQueryService.ts` — RTK Query config
- ❌ `{Modulo}Service.ts` — **NO CREAR**

### Patrón Correcto: Usar ApiService directamente

```typescript
// ✅ CORRECTO: En el componente o modal
import ApiService from '@/services/ApiService';

const handleDescargarPDF = async (id: number) => {
  const response = await ApiService.fetchData<Blob>({
    url: `/api/cotizaciones/${id}/descargar-pdf`,
    method: 'get',
    responseType: 'blob'
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `documento_${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
```

### Si la lógica es reutilizable: Crear helper en `utils/`

```typescript
// ✅ CORRECTO: utils/downloadHelpers.ts
export const descargarPDF = async (url: string, filename: string) => {
  const response = await ApiService.fetchData<Blob>({
    url,
    method: 'get',
    responseType: 'blob'
  });
  
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(blobUrl);
};
```

---

## 🚨 Alertas y Confirmaciones (Sistema Dual)

El proyecto usa **DOS sistemas complementarios**:

### 1. React-Toastify: Notificaciones (no-bloqueantes)

Para feedback de éxito, error o información después de una acción:

```typescript
import { toast } from 'react-toastify';

// Después de crear/actualizar
toast.success('Cotización creada', { autoClose: 1000 });

// Error de operación
toast.error('Error al guardar', { toastId: 'save-error' });

// Información general
toast.info('Ya existía un voucher');
```

### 2. SweetAlert2: Confirmaciones (bloqueantes)

Para decisiones que requieren acción del usuario **ANTES** de ejecutar:

```typescript
import { confirmAlert } from '@/utils/sweetAlert';

// Confirmación de eliminación
const ok = await confirmAlert({
  title: "Eliminar cotización",
  text: "¿Estás seguro de eliminar esta cotización?",
  confirmText: "Eliminar",
  cancelText: "Cancelar",
  icon: "warning",
  confirmColor: "#dc2626",
});

if (!ok) return;
// Proceder con eliminación...
```

### Cuándo usar cada uno:

| Acción | Sistema | Ejemplo |
|--------|---------|---------|
| Feedback post-acción | `toast` | "Guardado correctamente" |
| Errores de red/validación | `toast` | "Error al conectar" |
| Antes de eliminar | `confirmAlert` | "¿Eliminar registro?" |
| Acciones irreversibles | `confirmAlert` | "¿Cerrar OT definitivamente?" |
| Cambios críticos de estado | `confirmAlert` | "¿Aprobar cotización?" |

### Componente Reutilizable: ModalEliminar

Para eliminaciones estándar, usar el componente existente:

```typescript
import ModalEliminar from '@/pages/Items/Proveedor/modals/ModalEliminar';

<ModalEliminar
  mensaje="¿Estás seguro de eliminar esta cotización?"
  peticionUrl="/api/cotizaciones/123/"
  onDispatch={() => dispatch(listaCotizacionesThunk())}
  nombre="Cotización #805"
/>
```

### Eliminación con lógica personalizada:

```typescript
const handleEliminar = async (id: number) => {
  // 1. Confirmación
  const ok = await confirmAlert({
    title: "Confirmar eliminación",
    text: "Esta acción no se puede deshacer",
    confirmText: "Eliminar",
    cancelText: "Cancelar",
    icon: "warning",
    confirmColor: "#dc2626",
  });
  
  if (!ok) return;
  
  // 2. Petición HTTP
  try {
    await ApiService.fetchData({
      url: `/api/entidad/${id}/`,
      method: 'delete',
    });
    
    // 3. Toast de éxito
    toast.success("Eliminado correctamente", { autoClose: 1000 });
    
    // 4. Refresh de datos
    dispatch(listaEntidadesThunk());
    
  } catch (error: any) {
    // 5. Toast de error
    toast.error(error.response?.data || "Error al eliminar", {
      toastId: "delete-error"
    });
  }
};
```

---

## 📝 Nomenclatura de Archivos

### Convenciones por tipo:

```
Páginas principales:
- Lista{Entidad}.tsx          // ListaOT, ListaCotizaciones
- Detalle{Entidad}.tsx        // DetalleOT, DetalleCotizacion
- {Entidad}Empresa.tsx        // CotizacionesEmpresa

Components:
- Lista{Feature}OT.tsx        // ListaSoportesTecnicosOT
- {Feature}OT.tsx             // DevolucionesOT, RendicionesOT
- Detalle{Entidad}.tsx        // DetalleCotizacion (en components/)

Modals:
- Crear{Entidad}.tsx          // CrearCotizacion
- Editar{Entidad}.tsx         // EditarItemEnCotizacion
- Agregar{Relacion}.tsx       // AgregarSolicitanteCotizacion
- Completar{Entidad}.tsx      // CompletarOT
- Eliminar{Entidad}.tsx       // EliminarCompra (si no usa ModalEliminar)

Utils:
- {feature}Helpers.ts         // ordenTrabajoHelpers.ts
- {feature}.util.ts           // priceFormat.util.ts
- sweetAlert.ts               // Wrappers de SweetAlert2

Interfaces:
- {modulo}.interface.ts       // bodega.interface.ts
- I{Entidad}.ts               // IOrdenTrabajo.ts
```

---

## 🔄 Orden de Imports (Estándar)

```typescript
// 1. React y bibliotecas externas
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

// 2. Componentes UI del proyecto
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalHeader } from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';

// 3. Interfaces
import { ICotizacion, ICliente } from '@/interface';

// 4. Services
import ApiService from '@/services/ApiService';

// 5. Utils
import { confirmAlert } from '@/utils/sweetAlert';

// 6. Store (Redux)
import { listaCotizacionesThunk, useAppDispatch, useAppSelector } from '@/store';

// 7. Componentes locales del módulo
import ModalEliminar from './modals/ModalEliminar';
import DetalleCotizacion from './components/DetalleCotizacion';
```

---

## 🚫 Anti-Patrones a Evitar

### 1. Crear servicios específicos por módulo

```typescript
// ❌ INCORRECTO
// services/VoucherDevolucionService.ts
class VoucherDevolucionService { ... }

// ✅ CORRECTO
// Usar ApiService directamente en el componente
// O crear helper en utils/ si es reutilizable
```

### 2. Usar window.confirm()

```typescript
// ❌ INCORRECTO
if (window.confirm('¿Eliminar?')) { ... }

// ✅ CORRECTO
const ok = await confirmAlert({ title: 'Eliminar', text: '¿Estás seguro?' });
if (ok) { ... }
```

### 3. Mezclar toast y confirmAlert

```typescript
// ❌ INCORRECTO: Toast para pedir confirmación
toast.info('¿Seguro que desea eliminar?');

// ✅ CORRECTO: confirmAlert para confirmación, toast para feedback
const ok = await confirmAlert({ ... });
if (ok) {
  await eliminar();
  toast.success('Eliminado');
}
```

### 4. Componentes monolíticos

```typescript
// ❌ INCORRECTO: +500 líneas en un archivo
// DetalleOT.tsx con toda la lógica

// ✅ CORRECTO: Dividir en components/ y modals/
// DetalleOT.tsx (orquestador)
// components/ListaServiciosOT.tsx
// components/DevolucionesOT.tsx
// modals/CrearServicioEnOT.tsx
```

---

## 📌 Checklist: Nuevo Componente

1. ✅ Crear interface en `interface/`
2. ✅ Usar `ApiService` directamente (NO crear servicio específico)
3. ✅ Crear slice + thunks en `store/slices/` si necesita estado global
4. ✅ Estructura: `components/`, `modals/` según corresponda
5. ✅ Usar `confirmAlert` para acciones destructivas
6. ✅ Usar `toast` para feedback post-acción
7. ✅ Tipos explícitos (no `any`)
8. ✅ Seguir orden de imports estándar
9. ✅ Ejecutar: `npm run lint` + `npm run prettier:fix`
10. ✅ Verificar: `npm run build` (sin errores TypeScript)

---

## 📌 Checklist: Eliminación de Entidad

1. ✅ Usar `ModalEliminar` si es eliminación estándar
2. ✅ O usar `confirmAlert` + handler personalizado
3. ✅ Mostrar `toast.success` después de eliminar
4. ✅ Dispatch de thunk para refrescar lista
5. ✅ Manejar errores con `toast.error`

---

## 🔗 Referencias

- [React Documentation](https://react.dev)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [SweetAlert2 Documentation](https://sweetalert2.github.io/)
- [React-Toastify Documentation](https://fkhadra.github.io/react-toastify/)
- [typescript.instructions.md](./typescript.instructions.md) — Estándares TS

**Última actualización:** 2025-12-30

