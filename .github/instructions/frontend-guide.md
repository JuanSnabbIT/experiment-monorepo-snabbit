# Frontend Guide - Monorepo ERP

Guía de convenciones, patrones y estándares para desarrollo frontend en React + TypeScript.

---

## 1. Stack Frontend

| Herramienta | Versión | Propósito |
|-------------|---------|----------|
| React | 18.x | Framework UI |
| TypeScript | 5.x | Tipado estático |
| Vite | 5.x | Bundler y dev server |
| Redux Toolkit | 1.9.x | Estado global |
| RTK Query | Integrado | API queries y mutations |
| Axios | 1.x | HTTP client (legacy) |
| Formik + Yup | - | Formularios y validación |
| TailwindCSS | 3.x | Estilos utilidad |
| React Router | 6.x | Enrutamiento |

---

## 2. Estructura del Código

```
frontend/src/
├── pages/                    # Componentes de página (por módulo)
│   ├── cuentas/
│   │   ├── Login.tsx
│   │   ├── Registro.tsx
│   │   └── PerfilUsuario.tsx
│   ├── empresas/
│   │   ├── ListadoEmpresas.tsx
│   │   ├── CrearEmpresa.tsx
│   │   └── DetalleEmpresa.tsx
│   ├── ordenes/
│   │   ├── ListadoOrdenes.tsx
│   │   ├── CrearOrden.tsx
│   │   ├── DetalleOrden.tsx
│   │   └── EditarOrden.tsx
│   ├── cotizaciones/
│   ├── bodegas/
│   └── ...
│
├── components/               # Componentes reutilizables
│   ├── forms/                # Formularios
│   │   ├── FormularioOrden.tsx
│   │   ├── FormularioCotizacion.tsx
│   │   └── FormularioEmpresa.tsx
│   ├── tables/               # Tablas
│   │   ├── TablaOrdenes.tsx
│   │   ├── TablaBodegas.tsx
│   │   └── TablaGeneral.tsx
│   ├── modals/               # Modales
│   │   ├── ModalConfirmar.tsx
│   │   └── ModalDetalle.tsx
│   ├── buttons/              # Botones especializados
│   │   └── BotonAccion.tsx
│   ├── spinners/             # Indicadores de carga
│   │   └── Spinner.tsx
│   └── layouts/              # Layouts principales
│       ├── LayoutPrincipal.tsx
│       └── LayoutPublico.tsx
│
├── store/                    # Redux + RTK Query
│   ├── slices/               # Reducers por dominio
│   │   ├── ordenesTrabajo.ts
│   │   ├── cotizaciones.ts
│   │   ├── bodegas.ts
│   │   ├── empresas.ts
│   │   ├── auth.ts
│   │   └── usuarios.ts
│   ├── hooks.ts              # Hooks de Redux (useAppDispatch, useAppSelector)
│   └── index.ts              # Configuración del store
│
├── services/                 # Servicios HTTP
│   ├── BaseService.ts        # Clase base (Axios)
│   ├── RtkQueryService.ts    # RTK Query - API centralizada
│   ├── OrdeneService.ts      # (Legacy) Servicio específico órdenes
│   ├── CotizacionesService.ts # (Legacy) Servicio cotizaciones
│   └── ...
│
├── interface/                # Tipos TypeScript
│   ├── index.ts              # Tipos principales (OrdenDeTrabajo, Cotizacion, etc.)
│   └── api.ts                # Tipos de respuestas API
│
├── hooks/                    # Custom hooks
│   ├── useAuth.ts            # Contexto de autenticación
│   ├── useEmpresa.ts         # Empresa actual del usuario
│   ├── useFetch.ts           # Hook para fetch genérico
│   └── useForm.ts            # Wrapper de Formik
│
├── utils/                    # Funciones utilitarias
│   ├── formatters.ts         # Formateo de datos (fechas, moneda)
│   ├── validators.ts         # Validaciones
│   ├── constants.ts          # Constantes globales
│   └── helpers.ts            # Helpers varios
│
├── context/                  # React Context (si se usa)
│   └── AuthContext.tsx
│
├── assets/                   # Recursos estáticos
│   ├── images/
│   ├── icons/
│   └── styles/               # Estilos globales
│
├── App.tsx                   # Componente raíz
├── App.css                   # Estilos globales (TailwindCSS)
├── main.tsx                  # Entry point
└── index.css
```

---

## 3. Convenciones de Nombres

### Componentes

**Patrón:** `PascalCase` + sufijo si es específico

```typescript
// ✅ CORRECTO
export const ListadoOrdenes = () => { ... }
export const FormularioCrearOrden = () => { ... }
export const TablaOrdenes = () => { ... }
export const BotonAccion = ({ onClick }) => { ... }

// ❌ INCORRECTO
export const listadoOrdenes = () => { ... }   // lowercase
export const FormularioOrdenCrear = () => { }  // sufijo al final
```

### Archivos

**Regla:**
- Componentes React: `PascalCase.tsx`
- Servicios/hooks: `camelCase.ts`
- Tipos: `camelCase.ts` (en `interface/`)
- Stores/slices: `camelCase.ts`

```
✅ CORRECTO:
- pages/ordenes/ListadoOrdenes.tsx
- services/RtkQueryService.ts
- store/slices/ordenesTrabajo.ts
- hooks/useAuth.ts

❌ INCORRECTO:
- pages/ordenes/listado_ordenes.tsx
- services/rtk-query-service.ts
- store/slices/ordenes-trabajo.ts
```

### Props y State

**Patrón:** `camelCase`

```typescript
interface ListadoOrdenesProps {
    filtroEstado?: string;
    onActualizar?: () => void;
    mostrarAcciones: boolean;
}

const ListadoOrdenes: React.FC<ListadoOrdenesProps> = ({
    filtroEstado,
    onActualizar,
    mostrarAcciones,
}) => {
    const [ordenesSeleccionadas, setOrdenesSeleccionadas] = useState([]);
    // ...
};
```

---

## 4. Redux Toolkit + RTK Query

### 4.1 Estructura de un Slice

**Ubicación:** `frontend/src/store/slices/ordenesTrabajo.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OrdenDeTrabajo } from '@/interface';

interface OrdenesState {
    lista: OrdenDeTrabajo[];
    filtro: {
        estado?: string;
        empresa?: number;
    };
    cargando: boolean;
}

const initialState: OrdenesState = {
    lista: [],
    filtro: {},
    cargando: false,
};

const ordenesTrabajo = createSlice({
    name: 'ordenesTrabajo',
    initialState,
    reducers: {
        setFiltro: (state, action: PayloadAction<OrdenesState['filtro']>) => {
            state.filtro = action.payload;
        },
        setCargando: (state, action: PayloadAction<boolean>) => {
            state.cargando = action.payload;
        },
        limpiar: (state) => {
            state.lista = [];
            state.filtro = {};
        },
    },
});

export const { setFiltro, setCargando, limpiar } = ordenesTrabajo.actions;
export default ordenesTrabajo.reducer;
```

**Uso en componente:**

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setFiltro } from '@/store/slices/ordenesTrabajo';

const ListadoOrdenes = () => {
    const dispatch = useAppDispatch();
    const { filtro } = useAppSelector((state) => state.ordenesTrabajo);

    const handleFiltroChange = (nuevoFiltro) => {
        dispatch(setFiltro(nuevoFiltro));
    };

    return <div>...</div>;
};
```

### 4.2 RTK Query - Centralización de APIs

**Ubicación:** `frontend/src/services/RtkQueryService.ts`

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { OrdenDeTrabajo, Cotizacion } from '@/interface';

export const rtkApi = createApi({
    reducerPath: 'rtkApi',
    baseQuery: fetchBaseQuery({
        baseUrl: 'http://localhost:8000/api',
        prepareHeaders: (headers, { getState }: any) => {
            const token = getState().auth?.access || localStorage.getItem('access');
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            return headers;
        },
    }),
    tagTypes: ['Ordenes', 'Cotizaciones', 'Bodegas', 'Usuarios'],
    endpoints: (builder) => ({
        // Queries (GET)
        getOrdenes: builder.query<OrdenDeTrabajo[], void>({
            query: () => '/ordenes/',
            invalidatesTags: ['Ordenes'],
        }),

        getOrdenById: builder.query<OrdenDeTrabajo, number>({
            query: (id) => `/ordenes/${id}/`,
            invalidatesTags: (_, __, id) => [{ type: 'Ordenes', id }],
        }),

        // Mutations (POST, PATCH, DELETE)
        createOrden: builder.mutation<
            OrdenDeTrabajo,
            Partial<OrdenDeTrabajo>
        >({
            query: (body) => ({
                url: '/ordenes/',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Ordenes'],
        }),

        updateOrden: builder.mutation<
            OrdenDeTrabajo,
            { id: number; data: Partial<OrdenDeTrabajo> }
        >({
            query: ({ id, data }) => ({
                url: `/ordenes/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_, __, { id }) => [
                { type: 'Ordenes', id },
                'Ordenes',
            ],
        }),

        deleteOrden: builder.mutation<void, number>({
            query: (id) => ({
                url: `/ordenes/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Ordenes'],
        }),
    }),
});

export const {
    useGetOrdenesQuery,
    useGetOrdenByIdQuery,
    useCreateOrdenMutation,
    useUpdateOrdenMutation,
    useDeleteOrdenMutation,
} = rtkApi;
```

**Uso en componentes:**

```typescript
const DetalleOrden: React.FC<{ ordenId: number }> = ({ ordenId }) => {
    const { data: orden, isLoading } = useGetOrdenByIdQuery(ordenId);
    const [updateOrden] = useUpdateOrdenMutation();

    const handleActualizar = async (nuevosDatos) => {
        await updateOrden({ id: ordenId, data: nuevosDatos }).unwrap();
        // RTK Query invalida automáticamente el cache
    };

    if (isLoading) return <Spinner />;
    return <div>{orden?.numero}</div>;
};
```

### 4.3 Diferencia Slice vs RTK Query

| Aspecto | Slice (Redux) | RTK Query |
|--------|---------------|-----------|
| **Caso de uso** | Estado local, lógica compleja | Queries HTTP, sincronización con API |
| **Automatización** | Manual | Automática (refetch, caché, invalidación) |
| **Cuando usar Slice** | Filtros, UI state, datos computados | - |
| **Cuando usar RTK Query** | Fetching, mutations, sincronización | - |

**REGLA IMPORTANTE:** NO usar Slice para almacenar datos de API. RTK Query maneja eso mejor.

---

## 5. Componentes React

### 5.1 Componentes Funcionales

**Patrón:**

```typescript
import React, { useState } from 'react';
import { useAppSelector } from '@/store/hooks';

interface MiComponenteProps {
    titulo: string;
    onGuardar?: (data: any) => void;
}

export const MiComponente: React.FC<MiComponenteProps> = ({
    titulo,
    onGuardar,
}) => {
    const [estado, setEstado] = useState('');
    const datos = useAppSelector((state) => state.miDato);

    const handleClick = () => {
        setEstado('nuevo');
        onGuardar?.({ estado });
    };

    return (
        <div>
            <h1>{titulo}</h1>
            <button onClick={handleClick}>Guardar</button>
        </div>
    );
};

export default MiComponente;
```

### 5.2 Componentes de Formulario

**Patrón con Formik:**

```typescript
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object().shape({
    nombre: Yup.string().required('Nombre es requerido'),
    email: Yup.string().email().required('Email es requerido'),
    estado: Yup.string().oneOf(['pendiente', 'completada']),
});

interface FormOrdenProps {
    onSubmit: (valores: any) => void;
    valorInicial?: any;
}

export const FormOrden: React.FC<FormOrdenProps> = ({
    onSubmit,
    valorInicial,
}) => {
    return (
        <Formik
            initialValues={valorInicial || { nombre: '', email: '', estado: '' }}
            validationSchema={validationSchema}
            onSubmit={onSubmit}
        >
            {({ isSubmitting }) => (
                <Form>
                    <div>
                        <label>Nombre:</label>
                        <Field name="nombre" type="text" />
                        <ErrorMessage name="nombre" component="div" />
                    </div>

                    <div>
                        <label>Email:</label>
                        <Field name="email" type="email" />
                        <ErrorMessage name="email" component="div" />
                    </div>

                    <button type="submit" disabled={isSubmitting}>
                        Guardar
                    </button>
                </Form>
            )}
        </Formik>
    );
};
```

### 5.3 Componentes de Tabla

**Patrón:**

```typescript
interface TablaOrdenesProps {
    datos: OrdenDeTrabajo[];
    onEditar?: (id: number) => void;
    onEliminar?: (id: number) => void;
    cargando?: boolean;
}

export const TablaOrdenes: React.FC<TablaOrdenesProps> = ({
    datos,
    onEditar,
    onEliminar,
    cargando,
}) => {
    if (cargando) return <Spinner />;

    return (
        <table className="w-full border-collapse">
            <thead>
                <tr className="bg-gray-100">
                    <th className="border p-2">ID</th>
                    <th className="border p-2">Estado</th>
                    <th className="border p-2">Acciones</th>
                </tr>
            </thead>
            <tbody>
                {datos.map((orden) => (
                    <tr key={orden.id}>
                        <td className="border p-2">{orden.id}</td>
                        <td className="border p-2">{orden.estado}</td>
                        <td className="border p-2">
                            <button
                                onClick={() => onEditar?.(orden.id)}
                                className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                            >
                                Editar
                            </button>
                            <button
                                onClick={() => onEliminar?.(orden.id)}
                                className="bg-red-500 text-white px-2 py-1 rounded"
                            >
                                Eliminar
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};
```

---

## 6. Custom Hooks

### 6.1 useAuth

**Ubicación:** `frontend/src/hooks/useAuth.ts`

```typescript
import { useAppSelector, useAppDispatch } from '@/store/hooks';

export const useAuth = () => {
    const dispatch = useAppDispatch();
    const { usuario, access, refresh } = useAppSelector((state) => state.auth);

    const logout = () => {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        dispatch(setUsuario(null));
    };

    const isAuthenticated = !!usuario;

    return {
        usuario,
        access,
        refresh,
        isAuthenticated,
        logout,
    };
};
```

**Uso:**

```typescript
const { isAuthenticated, logout } = useAuth();

if (!isAuthenticated) {
    return <Navigate to="/login" />;
}
```

### 6.2 useEmpresa

```typescript
export const useEmpresa = () => {
    const { empresa_actual } = useAppSelector((state) => state.empresas);
    return empresa_actual;
};
```

---

## 7. Servicios HTTP

### 7.1 BaseService (Legacy - Prefiere RTK Query)

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export abstract class BaseService {
    protected client: AxiosInstance;
    protected baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
        this.client = axios.create({ baseURL });

        // Interceptor de request (agregar token)
        this.client.interceptors.request.use((config) => {
            const token = localStorage.getItem('access');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        // Interceptor de response (refrescar token si expira)
        this.client.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 401) {
                    const refresh = localStorage.getItem('refresh');
                    try {
                        const { data } = await axios.post(
                            `${this.baseURL}/auth/refresh/`,
                            { refresh }
                        );
                        localStorage.setItem('access', data.access);
                        error.config.headers.Authorization = `Bearer ${data.access}`;
                        return this.client(error.config);
                    } catch {
                        // Redirigir a login
                        window.location.href = '/login';
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.get<T>(endpoint, config);
        return response.data;
    }

    async post<T>(endpoint: string, data: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.post<T>(endpoint, data, config);
        return response.data;
    }

    async patch<T>(endpoint: string, data: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.patch<T>(endpoint, data, config);
        return response.data;
    }

    async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.delete<T>(endpoint, config);
        return response.data;
    }
}
```

---

## 8. Tipos TypeScript

### 8.1 Estructura de Tipos

**Ubicación:** `frontend/src/interface/index.ts`

```typescript
// Modelos principales
export interface OrdenDeTrabajo {
    id: number;
    numero: string;
    estado: 'pendiente' | 'en_proceso' | 'completada' | 'cerrada' | 'facturada';
    empresa: number;
    usuario_asignado?: number;
    descripcion: string;
    fecha_creacion: string;
    fecha_actualizacion: string;
}

export interface Cotizacion {
    id: number;
    numero: string;
    cliente: string;
    moneda: '1' | '2' | '3'; // 1=USD, 2=CLP, 3=UF
    monto_total: number;
    estado: 'borrador' | 'enviada' | 'aceptada' | 'rechazada';
    token_publico?: string; // Para acceso sin auth
}

export interface ItemBodega {
    id: number;
    bodega: number;
    item: number;
    cantidad: number; // SIEMPRE es delta (cambio), no saldo
}

export interface Usuario {
    id: number;
    username: string;
    email: string;
    nombre_completo: string;
}

export interface Empresa {
    id: number;
    nombre: string;
    rut: string;
    ciudad: string;
}
```

---

## 9. TailwindCSS - Estilos

### 9.1 Clases Comunes

```typescript
// Colores
className="text-red-500"        // Rojo
className="bg-blue-100"         // Fondo azul claro
className="border-gray-300"     // Borde gris

// Flexbox
className="flex justify-between items-center"
className="flex flex-col gap-4"

// Grid
className="grid grid-cols-3 gap-4"

// Espaciado
className="p-4"                 // Padding
className="m-2"                 // Margin
className="mb-6"                // Margin-bottom

// Responsive
className="md:grid-cols-2 lg:grid-cols-3"

// Estados
className="hover:bg-gray-100 cursor-pointer"
className="disabled:opacity-50 disabled:cursor-not-allowed"
```

---

## 10. Testing

### 10.1 Setup

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest
```

### 10.2 Ejemplo Test

```typescript
// __tests__/ListadoOrdenes.test.tsx
import { render, screen } from '@testing-library/react';
import { ListadoOrdenes } from '@/pages/ordenes/ListadoOrdenes';

describe('ListadoOrdenes', () => {
    it('debería renderizar la tabla de órdenes', () => {
        render(<ListadoOrdenes />);
        expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('debería mostrar mensaje de carga', () => {
        render(<ListadoOrdenes />);
        expect(screen.getByText(/cargando/i)).toBeInTheDocument();
    });
});
```

---

## 11. Configuración Vite + Build

### 11.1 vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                rewrite: (path) => path,
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        target: 'esnext',
        outDir: 'dist',
        minify: 'terser',
    },
});
```

### 11.2 Build & Deploy

```bash
npm run build        # Genera dist/
npm run preview      # Previsualiza build
```

---

## 12. Convenciones de CSS/Tailwind

### JAMÁS hacer inline styles

❌ **INCORRECTO:**
```typescript
<div style={{ color: 'red', fontSize: '16px' }}>
    Texto
</div>
```

✅ **CORRECTO:**
```typescript
<div className="text-red-500 text-base">
    Texto
</div>
```

### Componentes con variantes

```typescript
interface BotonProps {
    variante?: 'primary' | 'secondary' | 'danger';
}

const Boton: React.FC<BotonProps> = ({ variante = 'primary' }) => {
    const colorMap = {
        primary: 'bg-blue-500 text-white',
        secondary: 'bg-gray-300 text-black',
        danger: 'bg-red-500 text-white',
    };

    return (
        <button className={`px-4 py-2 rounded ${colorMap[variante]}`}>
            Botón
        </button>
    );
};
```

---

## 13. Reglas Críticas

1. **TypeScript estricto:** `strict: true` en `tsconfig.json`
2. **RTK Query > BaseService:** Prefiere RTK Query para nuevas APIs
3. **Filtro por empresa:** Componentes que listan datos deben filtrar por `useEmpresa()`
4. **No propagar callbacks profundamente:** Max 2-3 niveles, luego usar Redux
5. **Componentes pequeños:** Max 300 líneas por archivo
6. **Nombres descriptivos:** `ListadoOrdenesActivas` > `Lista`
7. **Props tipadas:** Siempre definir `interface Props`

---

Última actualización: 2025-02-12
Responsable: Equipo frontend
