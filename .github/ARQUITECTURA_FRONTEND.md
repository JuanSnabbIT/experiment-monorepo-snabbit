---
title: "Arquitectura Frontend - React + TypeScript + Redux"
scope: "frontend"
status: "active"
last_updated: "2025-01-05"
---

# 🎨 Arquitectura Frontend - React + TypeScript + Redux

## Objetivo
Documentar exhaustivamente la arquitectura del frontend React, incluyendo estructura de carpetas, stack tecnológico, Redux store, sistema de rutas, componentes, servicios HTTP y patrones de diseño implementados.

---

## 📁 Estructura de Carpetas Frontend

```
frontend/
├── public/                   # Assets estáticos servidos directamente
├── src/                      # Código fuente principal
│   ├── App/                  # Componente raíz de la aplicación
│   ├── assets/               # Recursos (imágenes, fuentes, etc.)
│   ├── components/           # Componentes reutilizables de UI
│   │   ├── Avatar.tsx
│   │   ├── Balance.tsx
│   │   ├── Calendar.tsx
│   │   ├── Chart.tsx
│   │   ├── LoaderDots.common.tsx
│   │   ├── MdViewer.tsx
│   │   ├── RichText.tsx
│   │   ├── Timeline.tsx
│   │   ├── WaveSurferPlayer.tsx
│   │   ├── form/             # Componentes de formularios (Formik)
│   │   ├── helper/           # Utilidades de ayuda para componentes
│   │   ├── icon/             # Sistema de íconos
│   │   ├── layouts/          # Layouts (Header, Sidebar, Footer)
│   │   ├── router/           # Componentes de routing (PrivateRoute, etc.)
│   │   ├── ui/               # Componentes UI base (Button, Input, Modal, etc.)
│   │   └── utils/            # Utilidades compartidas
│   ├── config/               # Archivos de configuración
│   │   └── pages.config.ts   # 🔐 Configuración de rutas y permisos
│   ├── constants/            # Constantes de la aplicación
│   ├── context/              # React Context API (si se usa)
│   ├── declaration.d.ts      # Declaraciones TypeScript globales
│   ├── hooks/                # Custom Hooks reutilizables
│   ├── i18n.ts               # Configuración de internacionalización
│   ├── index.tsx             # Punto de entrada de la aplicación
│   ├── interface/            # Interfaces y tipos TypeScript
│   ├── locales/              # Archivos de traducción (i18n)
│   ├── pages/                # 📄 Páginas principales (vistas)
│   │   ├── AceptarInvitacionEmpresa.tsx
│   │   ├── Login.page.tsx
│   │   ├── NotFound.page.tsx
│   │   ├── Profile.page.tsx
│   │   ├── SinPermisos.tsx
│   │   ├── Bodegas/          # Módulo Bodegas (inventario)
│   │   ├── Calendario/       # Módulo Calendario
│   │   ├── Clientes/         # Módulo Clientes
│   │   ├── Contratos/        # Módulo Contratos
│   │   ├── Core/             # Módulo Core (funcionalidades base)
│   │   ├── Cotizaciones/     # Módulo Cotizaciones
│   │   ├── Dashboard/        # Módulo Dashboard (home)
│   │   ├── Empresas/         # Módulo Empresas
│   │   ├── InvitacionEmpresa/ # Módulo Invitaciones
│   │   ├── Items/            # Módulo Items (productos/servicios)
│   │   ├── OrdenTrabajo/     # Módulo Órdenes de Trabajo
│   │   ├── Recursos/         # Módulo Recursos (empleados/equipos)
│   │   ├── Rendiciones/      # Módulo Rendiciones (gastos)
│   │   ├── ResetPassword/    # Módulo Reset Password
│   │   └── Visitas/          # Módulo Visitas técnicas
│   ├── react-app-env.d.ts    # Tipos de React App
│   ├── reportWebVitals.ts    # Performance monitoring
│   ├── routes/               # 🛣️ Configuración de rutas
│   │   ├── asideRoutes.tsx   # Rutas del sidebar
│   │   ├── contentRoutes.tsx # Rutas del contenido principal
│   │   ├── footerRoutes.tsx  # Rutas del footer
│   │   └── headerRoutes.tsx  # Rutas del header
│   ├── services/             # 🌐 Servicios HTTP
│   │   ├── ApiService.ts     # Servicio principal de API
│   │   ├── BaseService.ts    # Servicio base con JWT
│   │   └── RtkQueryService.ts # RTK Query (caché avanzado)
│   ├── setupTests.ts         # Configuración de tests (Jest)
│   ├── store/                # 🗄️ Redux Toolkit Store
│   │   ├── index.ts          # Configuración del store
│   │   ├── rootReducer.ts    # Combinador de reducers
│   │   ├── storeSetup.ts     # Setup con redux-persist
│   │   └── slices/           # Redux slices por dominio
│   │       ├── auth/         # Autenticación (login, logout, JWT)
│   │       ├── bodega/       # Estado de bodegas
│   │       ├── calendario/   # Estado de calendario
│   │       ├── contratos/    # Estado de contratos
│   │       ├── core/         # Estado core (permisos, config)
│   │       ├── cotizaciones/ # Estado de cotizaciones
│   │       ├── dashboard/    # Estado de dashboard
│   │       ├── empresa/      # Estado de empresas
│   │       ├── invitacion/   # Estado de invitaciones ⭐
│   │       ├── item/         # Estado de items
│   │       ├── ordenTrabajo/ # Estado de órdenes de trabajo
│   │       ├── recursos/     # Estado de recursos
│   │       ├── rendiciones/  # Estado de rendiciones
│   │       └── visita/       # Estado de visitas
│   ├── styles/               # Estilos globales (CSS/SCSS)
│   ├── templates/            # Plantillas reutilizables
│   ├── types/                # Tipos TypeScript adicionales
│   └── utils/                # Utilidades generales
├── .eslintrc.cjs             # Configuración ESLint
├── Dockerfile                # Imagen Docker del frontend
├── index.html                # HTML base
├── nginx.conf                # Configuración Nginx (producción)
├── package.json              # Dependencias y scripts npm
├── postcss.config.cjs        # Configuración PostCSS (TailwindCSS)
├── prettier.config.cjs       # Configuración Prettier
├── tailwind.config.cjs       # Configuración TailwindCSS
├── tsconfig.json             # Configuración TypeScript principal
├── tsconfig.eslint.json      # TypeScript para ESLint
├── tsconfig.node.json        # TypeScript para Vite/Node
└── vite.config.ts            # Configuración Vite

```

---

## 🛠️ Stack Tecnológico Frontend

| Categoría | Tecnología | Versión | Propósito |
|-----------|-----------|---------|-----------|
| **Framework** | React | 18.3.1 | UI framework con Hooks |
| **Lenguaje** | TypeScript | 5.4.5 | Tipado estático |
| **Build Tool** | Vite | 5.2.13 | Bundler rápido (reemplazo de Webpack) |
| **Estado Global** | Redux Toolkit | 2.3.0 | Gestión de estado con slices y thunks |
| **Persistencia** | redux-persist | 6.0.0 | Persistir store en localStorage |
| **HTTP Client** | Axios | 1.7.2 | Llamadas API con interceptores JWT |
| **Routing** | React Router DOM | 6.23.1 | Navegación SPA |
| **Formularios** | Formik | 2.4.6 | Gestión de formularios |
| **Validación** | Yup | 1.4.0 | Esquemas de validación |
| **Estilos** | TailwindCSS | 3.4.4 | Utility-first CSS |
| **Animaciones** | Framer Motion | 11.18.2 | Animaciones declarativas |
| **Gráficos** | ApexCharts | 3.49.1 | Visualizaciones de datos |
| **Calendario** | FullCalendar | 6.1.14 | Calendario interactivo |
| **PDF** | @react-pdf/renderer | 4.1.5 | Generación de PDFs |
| **Tablas** | @tanstack/react-table | 8.17.3 | Tablas avanzadas |
| **i18n** | react-i18next | 14.1.2 | Internacionalización |
| **Testing** | Jest + RTL | 29.5.12 / 16.0.0 | Tests unitarios e integración |
| **Linting** | ESLint | 8.57.0 | Linter JavaScript/TypeScript |
| **Formateo** | Prettier | 3.3.1 | Formateo de código |
| **QR/Barcode** | @yudiel/react-qr-scanner | 2.2.1 | Escaneo de códigos |
| **Firma Digital** | react-signature-canvas | 1.0.6 | Captura de firmas |
| **Webcam** | react-webcam | 7.2.0 | Captura de fotos |

---

## 🗄️ Redux Store - Arquitectura de Estado

### Slices Disponibles (14 módulos)

| # | Slice | Ubicación | Estado Global | Thunks Principales | Responsabilidad |
|---|-------|-----------|---------------|-------------------|-----------------|
| 1 | **auth** | `slices/auth/authSlice.ts` | `state.auth` | `loginThunk`, `logoutThunk`, `getMeThunk`, `refreshTokenThunk` | Autenticación JWT, usuario actual, tokens |
| 2 | **bodega** | `slices/bodega/bodegaSlice.ts` | `state.bodega` | `listaBodegasThunk`, `detalleBodegaThunk`, `movimientosStockThunk` | Inventario, bodegas, movimientos de stock |
| 3 | **calendario** | `slices/calendario/calendarioSlice.ts` | `state.calendario` | `listaEventosThunk`, `crearEventoThunk`, `actualizarEventoThunk` | Eventos, citas, calendario |
| 4 | **contrato** | `slices/contratos/contratoSlice.ts` | `state.contrato` | `listaContratosThunk`, `detalleContratoThunk`, `crearContratoThunk` | Contratos con clientes |
| 5 | **core** | `slices/core/coreSlice.ts` | `state.core` | `listaPermisosThunk`, `configGeneralThunk` | Configuración global, permisos, constantes |
| 6 | **cotizacion** | `slices/cotizaciones/cotizacionSlice.ts` | `state.cotizacion` | `listaCotizacionesThunk`, `detalleCotizacionThunk`, `crearCotizacionThunk` | Cotizaciones, propuestas comerciales |
| 7 | **dashboard** | `slices/dashboard/dashboardSlice.ts` | `state.dashboard` | `estadisticasGeneralesThunk`, `graficosThunk` | Métricas, estadísticas, gráficos |
| 8 | **empresa** | `slices/empresa/empresaSlice.ts` | `state.empresa` | `listaEmpresasThunk`, `detalleEmpresaThunk`, `listaMisSucursalesThunk` | Empresas, sucursales, clientes |
| 9 | **invitacion** ⭐ | `slices/invitacion/invitacionSlice.ts` | `state.invitacion` | `listaInvitacionesThunk`, `listaInvitacionesFiltroThunk`, `aceptarInvitacionThunk` | Invitaciones de usuarios a empresas |
| 10 | **item** | `slices/item/itemSlice.ts` | `state.item` | `listaItemsThunk`, `detalleItemThunk`, `crearItemThunk` | Productos, servicios, catálogo |
| 11 | **ordenTrabajo** | `slices/ordenTrabajo/ordenTrabajoSlice.ts` | `state.ordenTrabajo` | `listaOrdenesTrabajoThunk`, `detalleOTThunk`, `crearOTThunk`, `asignarRecursosThunk` | Órdenes de trabajo técnicas |
| 12 | **recursos** | `slices/recursos/recursosSlice.ts` | `state.recursos` | `listaRecursosThunk`, `detalleRecursoThunk`, `disponibilidadThunk` | Empleados, equipos, asignaciones |
| 13 | **rendicion** | `slices/rendiciones/rendicionSlice.ts` | `state.rendicion` | `listaRendicionesThunk`, `detalleRendicionThunk`, `aprobarRendicionThunk` | Gastos, rendiciones, aprobaciones |
| 14 | **visita** | `slices/visita/visitasSlice.ts` | `state.visita` | `listaVisitasThunk`, `detalleVisitaThunk`, `crearVisitaThunk`, `registrarResultadoThunk` | Visitas técnicas/comerciales |

### Patrón de Slice Estándar

Todos los slices siguen esta estructura:

```typescript
// Ejemplo: invitacionSlice.ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import ApiService from "@/services/ApiService"
import { IInvitacionEmpresa } from "@/interface/invitacion.interface"

// 1️⃣ DEFINIR ESTADO
export interface InvitacionState {
    loading: boolean                    // Indica petición en curso
    error: string | undefined           // Mensaje de error
    listaInvitaciones: IInvitacionEmpresa[]  // Datos
}

// 2️⃣ ESTADO INICIAL
const initialState: InvitacionState = {
    loading: false,
    error: undefined,
    listaInvitaciones: []
}

// 3️⃣ THUNK (Operación Asíncrona HTTP)
export const listaInvitacionesThunk = createAsyncThunk<
    IInvitacionEmpresa[],     // Tipo del payload de retorno
    undefined,                // Tipo del argumento (undefined = sin argumentos)
    {rejectValue: string}     // Tipo del error
>(
    'invitacion/listaInvitacionesThunk',  // Nombre único
    async (_, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IInvitacionEmpresa[]>({
                url: `/api/invitaciones-empresa/`,
                method: 'get'
            })
            return response.data  // ← fulfilled
        } catch(error: any) {
            return rejectWithValue(error.response.data)  // ← rejected
        }
    }
)

// 4️⃣ SLICE (Reducer + Acciones)
const invitacionSlice = createSlice({
    name: 'invitacion/invitacionSlice',
    initialState,
    reducers: {},  // Acciones síncronas (si se necesitan)
    extraReducers(builder) {
        // Manejar estados del thunk (pending, fulfilled, rejected)
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

## 🛣️ Sistema de Rutas

### Estructura de Routing

El sistema de rutas está dividido en 4 archivos:

| Archivo | Propósito | Componentes |
|---------|-----------|-------------|
| `asideRoutes.tsx` | Navegación del sidebar (menú lateral) | Links a Dashboard, Empresas, Cotizaciones, Contratos, Bodegas, Items, OT, etc. |
| `headerRoutes.tsx` | Navegación del header (barra superior) | Perfil, notificaciones, búsqueda |
| `contentRoutes.tsx` | Rutas del contenido principal | Todas las páginas principales (Dashboard, listas, detalles) |
| `footerRoutes.tsx` | Navegación del footer | Links a documentación, políticas |

### Configuración de Permisos (`pages.config.ts`)

El sistema de permisos se centraliza en `src/config/pages.config.ts`:

```typescript
export const authPages = {
	loginPage: {
		id: 'loginPage',
		to: '/login',
		text: 'Login',
		icon: 'HeroArrowRightOnRectangle',
		authority: [],  // ← Sin restricciones (público)
	},
	profilePage: {
		id: 'profilePage',
		to: '/profile',
		text: 'Perfil',
		icon: 'HeroUser',
		authority: [],  // ← Requiere autenticación básica
	},
	aceptarInvitacionEmpresa: {
		id: 'aceptarInvitacionEmpresa',
		to: '/aceptar-invitacion/:token',
		text: 'Aceptar Invitacion a Empresa',
		icon: 'HeroUser',
		authority: [],  // ← Público (token en URL)
	},
	// ... más rutas de autenticación
};

export const Pages = {
	empresa: {
		id: 'empresa',
		to: '/empresa',
		text: 'Empresa',
		icon: 'HeroBuildingOffice2',
		authority: [],  // ← Permisos de empresa
		subPages: {
			listaUsuariosEmpresa: {
				id: 'listaUsuariosEmpresa',
				to: '/empresa/lista-usuarios-empresa',
				text: 'Usuarios Empresa',
				icon: 'DuoGroup',
				authority: []  // ← Permisos específicos
			},
			// ... más subpáginas
		}
	},
	// ... más módulos (cotizacion, contrato, bodega, etc.)
};
```

### Rutas Principales Documentadas

| Módulo | Ruta Base | Rutas Secundarias | Permisos |
|--------|-----------|-------------------|----------|
| **Dashboard** | `/` | - | Autenticado |
| **Empresas** | `/empresa` | `/empresa/empresas` (lista)<br>`/empresas/:id` (detalle)<br>`/empresa/lista-usuarios-empresa`<br>`/empresa/detalle-usuario-empresa/:id`<br>`/empresa/detalle-cliente/:id`<br>`/empresa/contratos-cliente/:id` | Autenticado, `authority: []` |
| **Cotizaciones** | `/cotizacion` | `/cotizacion/lista-cotizaciones-empresa`<br>`/cotizacion/detalle-cotizacion/:numero` | Autenticado |
| **Contratos** | `/contrato` | `/contrato/lista-contratos`<br>`/contrato/detalle-contrato/:id`<br>`/pdf-contrato/:id/:uuid` (público) | Autenticado + Público (PDF) |
| **Bodegas** | `/bodega` | `/bodega/lista-bodegas`<br>`/bodega/detalle-bodega/:id`<br>`/bodega/movimientos` | Autenticado |
| **Items** | `/item` | `/item/lista-items`<br>`/item/detalle-item/:id` | Autenticado |
| **Órdenes Trabajo** | `/orden-trabajo` | `/orden-trabajo/lista-ot`<br>`/orden-trabajo/detalle-ot/:id`<br>`/retroalimentacion-orden-trabajo/:uuid` (público) | Autenticado + Público (retroalimentación) |
| **Recursos** | `/recursos` | `/recursos/lista-recursos`<br>`/recursos/detalle-recurso/:id` | Autenticado |
| **Rendiciones** | `/rendiciones` | `/rendiciones/lista-rendiciones`<br>`/rendiciones/detalle-rendicion/:id` | Autenticado |
| **Visitas** | `/visitas` | `/visitas/lista-visitas`<br>`/visitas/detalle-visita/:id` | Autenticado |
| **Calendario** | `/calendario` | - | Autenticado |
| **Perfil** | `/profile` | - | Autenticado |
| **Login** | `/login` | `/recuperar-contraseña`<br>`/cambio-contraseña/:uid/:token` | Público |
| **Invitaciones** | `/aceptar-invitacion/:token` | - | Público (token en URL) |
| **Firmar Contrato** | `/firmar-contrato/:uuid` | - | Público (UUID en URL) |

---

## 🌐 Servicios HTTP

### BaseService.ts - Gestión de JWT

El servicio base maneja:
- **JWT Access Token**: Token de corta duración (5h) para autenticación
- **JWT Refresh Token**: Token de larga duración (10h) para renovar access
- **Interceptores**: Automáticamente agrega `Authorization: Bearer <token>` a requests
- **Auto-refresh**: Renueva access token cuando expira (usando refresh token)
- **Logout automático**: Si refresh falla, redirige a login

Estructura:

```typescript
// BaseService.ts (simplificado)
import axios, { AxiosInstance } from 'axios';

class BaseService {
    private apiClient: AxiosInstance;

    constructor() {
        this.apiClient = axios.create({
            baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
        });

        // Interceptor: agregar JWT a requests
        this.apiClient.interceptors.request.use((config) => {
            const token = localStorage.getItem('access_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        // Interceptor: renovar token si expira (401)
        this.apiClient.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 401) {
                    // Intentar refresh
                    const refreshToken = localStorage.getItem('refresh_token');
                    if (refreshToken) {
                        const newToken = await this.refreshAccessToken(refreshToken);
                        if (newToken) {
                            // Reintentar request con nuevo token
                            error.config.headers.Authorization = `Bearer ${newToken}`;
                            return this.apiClient.request(error.config);
                        }
                    }
                    // Si falla, logout
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }
        );
    }

    async refreshAccessToken(refreshToken: string): Promise<string | null> {
        try {
            const response = await axios.post('/auth/jwt/refresh', { refresh: refreshToken });
            const newAccessToken = response.data.access;
            localStorage.setItem('access_token', newAccessToken);
            return newAccessToken;
        } catch {
            return null;
        }
    }

    get(url: string) { return this.apiClient.get(url); }
    post(url: string, data: any) { return this.apiClient.post(url, data); }
    put(url: string, data: any) { return this.apiClient.put(url, data); }
    delete(url: string) { return this.apiClient.delete(url); }
}

export default new BaseService();
```

### ApiService.ts - Servicio Principal

Wrapper sobre BaseService con métodos tipados:

```typescript
// ApiService.ts (simplificado)
import BaseService from './BaseService';

interface FetchDataParams {
    url: string;
    method: 'get' | 'post' | 'put' | 'delete';
    data?: any;
    params?: any;
}

class ApiService {
    async fetchData<T>(params: FetchDataParams): Promise<{ data: T }> {
        const { url, method, data, params: queryParams } = params;
        
        switch (method) {
            case 'get':
                return BaseService.get(url);
            case 'post':
                return BaseService.post(url, data);
            case 'put':
                return BaseService.put(url, data);
            case 'delete':
                return BaseService.delete(url);
        }
    }
}

export default new ApiService();
```

### RtkQueryService.ts - Caché Avanzado (Opcional)

RTK Query para caché automático y sincronización:

```typescript
// RtkQueryService.ts (simplificado)
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const rtkQueryService = createApi({
    reducerPath: 'rtkQuery',
    baseQuery: fetchBaseQuery({
        baseUrl: import.meta.env.VITE_API_URL,
        prepareHeaders: (headers) => {
            const token = localStorage.getItem('access_token');
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            return headers;
        }
    }),
    endpoints: (builder) => ({
        // Ejemplo: endpoint de empresas con caché
        getEmpresas: builder.query<IEmpresa[], void>({
            query: () => '/api/empresas/',
            keepUnusedDataFor: 300, // Caché por 5 minutos
        }),
    }),
});
```

---

## 🎨 Componentes de UI

### Estructura de Componentes

```
src/components/
├── ui/                    # Componentes UI base reutilizables
│   ├── Button.tsx         # Botones (primarios, secundarios, ghost, danger)
│   ├── Input.tsx          # Inputs de texto con validación Formik
│   ├── Select.tsx         # Selects (react-select)
│   ├── Modal.tsx          # Modales (framer-motion)
│   ├── Alert.tsx          # Alertas (success, error, warning, info)
│   ├── Badge.tsx          # Badges (estados, categorías)
│   ├── Card.tsx           # Cards (contenedores visuales)
│   ├── Table.tsx          # Tablas (@tanstack/react-table)
│   ├── Pagination.tsx     # Paginación de listas
│   ├── Spinner.tsx        # Spinners de carga
│   └── Tooltip.tsx        # Tooltips (react-popper)
├── form/                  # Componentes de formularios Formik
│   ├── FormikInput.tsx    # Input con Formik + Yup
│   ├── FormikSelect.tsx   # Select con Formik + Yup
│   ├── FormikTextarea.tsx # Textarea con Formik + Yup
│   ├── FormikCheckbox.tsx # Checkbox con Formik + Yup
│   └── FormikDatePicker.tsx # Date picker con Formik
├── layouts/               # Layouts de la aplicación
│   ├── Header.tsx         # Header con navegación y perfil
│   ├── Sidebar.tsx        # Sidebar con menú navegable
│   ├── Footer.tsx         # Footer con links
│   └── MainLayout.tsx     # Layout principal (Header + Sidebar + Content)
├── router/                # Componentes de routing
│   └── PrivateRoute.tsx   # HOC para rutas privadas (valida JWT)
├── icon/                  # Sistema de íconos
│   └── svg-icons/         # Íconos SVG compilados
├── helper/                # Componentes helper
│   ├── ErrorBoundary.tsx  # Captura errores React
│   └── LoadingFallback.tsx # Fallback de lazy loading
└── utils/                 # Utilidades de componentes
    ├── classNames.ts      # Merge de clases CSS
    └── formatters.ts      # Formateo de datos (fecha, moneda, etc.)
```

### Convenciones de Componentes

1. **Nomenclatura**: PascalCase (`ProductoCard.tsx`, `LoginPage.tsx`)
2. **Props Interface**: Definir `interface ComponentNameProps { ... }`
3. **TypeScript estricto**: Evitar `any`, usar tipos explícitos
4. **Memoización**: Usar `React.memo` en componentes pesados
5. **Hooks personalizados**: Extraer lógica compleja a `hooks/`

Ejemplo de componente bien estructurado:

```typescript
// ProductoCard.tsx
import React from 'react';
import { IProducto } from '@/interface/producto.interface';
import Button from '@/components/ui/Button';

interface ProductoCardProps {
    producto: IProducto;
    onEdit: (id: number) => void;
    onDelete: (id: number) => void;
}

const ProductoCard: React.FC<ProductoCardProps> = React.memo(({ producto, onEdit, onDelete }) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-xl font-bold">{producto.nombre}</h3>
            <p className="text-gray-600">{producto.codigo}</p>
            <p className="text-lg font-semibold">${producto.precio}</p>
            <div className="flex gap-2 mt-4">
                <Button onClick={() => onEdit(producto.id)}>Editar</Button>
                <Button variant="danger" onClick={() => onDelete(producto.id)}>Eliminar</Button>
            </div>
        </div>
    );
});

ProductoCard.displayName = 'ProductoCard';
export default ProductoCard;
```

---

## 📄 Páginas (Pages)

### Módulos de Páginas

Cada módulo tiene su carpeta en `src/pages/<Modulo>/`:

```
pages/
├── Dashboard/
│   ├── Dashboard.page.tsx           # Vista principal del dashboard
│   └── components/
│       ├── EstadisticasCard.tsx     # Cards de métricas
│       ├── GraficoVentas.tsx        # Gráfico ApexCharts
│       └── UltimasActividades.tsx   # Listado de actividades recientes
├── Empresas/
│   ├── ListaEmpresas.page.tsx       # Lista paginada de empresas
│   ├── DetalleEmpresa.page.tsx      # Detalle de empresa con tabs
│   ├── CrearEmpresa.page.tsx        # Formulario Formik de creación
│   └── modals/
│       ├── CrearEmpresa.tsx         # Modal de creación
│       ├── EditarEmpresa.tsx        # Modal de edición
│       └── CrearSucursal.tsx        # Modal de sucursal
├── Cotizaciones/
│   ├── ListaCotizaciones.page.tsx   # Lista con filtros
│   ├── DetalleCotizacion.page.tsx   # Detalle + PDF preview
│   ├── CrearCotizacion.page.tsx     # Wizard multi-paso
│   └── components/
│       ├── ItemCotizacion.tsx       # Item de cotización (producto + cantidad)
│       └── ResumenCotizacion.tsx    # Resumen con totales
├── Contratos/
│   ├── ListaContratos.page.tsx      # Lista con estados (activo, vencido, etc.)
│   ├── DetalleContrato.page.tsx     # Detalle + documentos adjuntos
│   └── FirmarContrato.page.tsx      # Firma digital con canvas
├── Bodegas/
│   ├── ListaBodegas.page.tsx        # Lista de bodegas
│   ├── DetalleBodega.page.tsx       # Stock por producto + movimientos
│   └── components/
│       ├── MovimientoStock.tsx      # Tabla de movimientos
│       └── RegistrarMovimiento.tsx  # Modal para entrada/salida
├── Items/
│   ├── ListaItems.page.tsx          # Catálogo de productos/servicios
│   ├── DetalleItem.page.tsx         # Ficha técnica + stock
│   └── CrearItem.page.tsx           # Formulario con categorías/fabricantes
├── OrdenTrabajo/
│   ├── ListaOrdenesTrabajo.page.tsx # Lista con estados (pendiente, en curso, completada)
│   ├── DetalleOrdenTrabajo.page.tsx # Detalle + recursos asignados + timeline
│   ├── CrearOrdenTrabajo.page.tsx   # Formulario con selector de contrato
│   └── components/
│       ├── AsignarRecursos.tsx      # Modal de asignación de empleados/equipos
│       └── RegistrarAvance.tsx      # Modal de reporte de progreso
├── Recursos/
│   ├── ListaRecursos.page.tsx       # Lista de empleados/equipos
│   ├── DetalleRecurso.page.tsx      # Perfil + habilidades + disponibilidad
│   └── CrearRecurso.page.tsx        # Formulario con foto + skills
├── Rendiciones/
│   ├── ListaRendiciones.page.tsx    # Lista con estados (pendiente, aprobada, rechazada)
│   ├── DetalleRendicion.page.tsx    # Detalle + comprobantes adjuntos
│   └── CrearRendicion.page.tsx      # Formulario con subida de archivos
├── Visitas/
│   ├── ListaVisitas.page.tsx        # Calendario de visitas
│   ├── DetalleVisita.page.tsx       # Detalle + resultado + fotos
│   └── CrearVisita.page.tsx         # Formulario con mapa de ubicación
├── Calendario/
│   └── Calendario.page.tsx          # FullCalendar con eventos de OT, visitas, vacaciones
├── Login.page.tsx                   # Formulario de login con Formik + JWT
├── Profile.page.tsx                 # Perfil de usuario + cambiar contraseña
├── ResetPassword/
│   ├── SolicitarReset.page.tsx      # Formulario para solicitar reset
│   └── ConfirmarNuevaPass.page.tsx  # Formulario con token de URL
├── AceptarInvitacionEmpresa.tsx     # Formulario de aceptación con token
└── NotFound.page.tsx                # 404
```

### Patrón de Página Típico

```typescript
// ListaEmpresas.page.tsx (ejemplo)
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hook';
import { listaEmpresasThunk } from '@/store/slices/empresa/empresaSlice';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import CrearEmpresaModal from './modals/CrearEmpresa';

const ListaEmpresasPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const { listaEmpresas, loading, error } = useAppSelector((state) => state.empresa);
    const [modalCrearOpen, setModalCrearOpen] = React.useState(false);

    // 1️⃣ Cargar datos al montar componente
    useEffect(() => {
        dispatch(listaEmpresasThunk());
    }, [dispatch]);

    // 2️⃣ Manejar creación
    const handleCrearEmpresa = () => {
        setModalCrearOpen(true);
    };

    const handleEmpresaCreada = () => {
        setModalCrearOpen(false);
        dispatch(listaEmpresasThunk()); // ← Recargar lista
    };

    // 3️⃣ Renderizar
    if (loading) return <Spinner />;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Empresas</h1>
                <Button onClick={handleCrearEmpresa}>Crear Empresa</Button>
            </div>

            <Table
                data={listaEmpresas}
                columns={[
                    { header: 'RUT', accessorKey: 'rut_empresa' },
                    { header: 'Nombre', accessorKey: 'nombre' },
                    { header: 'Dirección', accessorKey: 'direccion_principal' },
                ]}
            />

            <CrearEmpresaModal
                isOpen={modalCrearOpen}
                onClose={() => setModalCrearOpen(false)}
                onSuccess={handleEmpresaCreada}
            />
        </div>
    );
};

export default ListaEmpresasPage;
```

---

## 🎯 Flujos de Datos Principales

### 1. Autenticación JWT

```
Usuario → Formulario Login (Formik)
   ↓
dispatch(loginThunk({ email, password }))
   ↓
POST /auth/jwt/create { email, password }
   ↓
Backend retorna { access, refresh }
   ↓
localStorage.setItem('access_token', access)
localStorage.setItem('refresh_token', refresh)
   ↓
Redirigir a /dashboard
   ↓
Todos los requests incluyen: Authorization: Bearer <access>
```

### 2. Listar Datos (GET)

```
Página monta → useEffect()
   ↓
dispatch(listaEmpresasThunk())
   ↓
GET /api/empresas/ (con JWT en headers)
   ↓
Backend retorna [{ id: 1, nombre: 'Empresa A' }, ...]
   ↓
state.empresa.listaEmpresas = [...datos]
   ↓
Componente re-renderiza con datos
```

### 3. Crear Registro (POST)

```
Usuario llena formulario → onSubmit
   ↓
dispatch(crearEmpresaThunk({ nombre, rut, ... }))
   ↓
POST /api/empresas/ { nombre, rut, ... }
   ↓
Backend crea y retorna { id: 123, nombre: 'Nueva Empresa' }
   ↓
Toast de éxito
   ↓
dispatch(listaEmpresasThunk())  // ← Recargar lista
```

### 4. Refresh Token Automático

```
Request → GET /api/productos/
   ↓
Backend retorna 401 Unauthorized (token expirado)
   ↓
Interceptor detecta 401
   ↓
POST /auth/jwt/refresh { refresh: <refresh_token> }
   ↓
Backend retorna { access: <nuevo_access_token> }
   ↓
localStorage.setItem('access_token', nuevo_access_token)
   ↓
Reintentar request original con nuevo token
   ↓
Request exitoso → 200 OK
```

---

## 🧩 Patrones de Diseño Implementados

### 1. Container/Presentation Pattern

- **Container Components** (pages): Lógica, dispatch thunks, estado
- **Presentation Components** (components): Solo UI, reciben props

### 2. Custom Hooks

Extraer lógica reutilizable:

```typescript
// hooks/useAuth.ts
import { useAppSelector } from '@/store/hook';

export const useAuth = () => {
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    
    return {
        user,
        isAuthenticated,
        isAdmin: user?.is_superuser || false,
    };
};

// Uso en componente:
const { user, isAuthenticated, isAdmin } = useAuth();
```

### 3. Higher-Order Components (HOC)

```typescript
// components/router/PrivateRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }
    
    return <>{children}</>;
};
```

### 4. Render Props (Formik)

```typescript
<Formik
    initialValues={{ email: '', password: '' }}
    validationSchema={loginSchema}
    onSubmit={handleLogin}
>
    {({ values, errors, handleChange, handleSubmit }) => (
        <form onSubmit={handleSubmit}>
            <Input
                name="email"
                value={values.email}
                onChange={handleChange}
                error={errors.email}
            />
            {/* ... */}
        </form>
    )}
</Formik>
```

---

## 🔒 Seguridad Frontend

### Implementaciones de Seguridad

1. **JWT en localStorage**: Tokens almacenados localmente (considerar httpOnly cookies en producción)
2. **Refresh automático**: Renovación transparente de tokens expirados
3. **Rutas privadas**: PrivateRoute valida autenticación antes de renderizar
4. **CORS**: Configurado en backend (CORS_ALLOWED_ORIGINS)
5. **XSS Protection**: React escapa outputs por defecto; evitar `dangerouslySetInnerHTML`
6. **CSRF**: No necesario en API REST con JWT (no usa cookies de sesión)

### Validaciones Frontend

- **Formik + Yup**: Validación de formularios antes de enviar
- **Tipos TypeScript**: Validación de tipos en tiempo de compilación
- **Mensajes de error**: User-friendly sin exponer detalles técnicos

---

## 📊 Performance Frontend

### Optimizaciones Implementadas

1. **Lazy Loading de Rutas**:
```typescript
const Dashboard = React.lazy(() => import('./pages/Dashboard/Dashboard.page'));
const Empresas = React.lazy(() => import('./pages/Empresas/ListaEmpresas.page'));
```

2. **Memoización de Componentes**:
```typescript
const ProductoCard = React.memo(({ producto }) => { ... });
```

3. **useMemo para Cálculos Pesados**:
```typescript
const total = useMemo(() => 
    items.reduce((sum, item) => sum + item.precio * item.cantidad, 0),
    [items]
);
```

4. **useCallback para Funciones**:
```typescript
const handleClick = useCallback(() => {
    // ...
}, [dependencies]);
```

5. **Code Splitting**: Vite divide automáticamente el bundle por rutas

6. **TailwindCSS Purge**: Solo clases usadas en producción

---

## 🧪 Testing Frontend

### Stack de Testing

- **Framework**: Jest
- **React Testing**: @testing-library/react
- **User Simulation**: @testing-library/user-event
- **Assertions**: @testing-library/jest-dom
- **Mocks HTTP**: msw (Mock Service Worker)

### Ejemplo de Test

```typescript
// ProductoCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ProductoCard from './ProductoCard';

describe('ProductoCard', () => {
    const mockProducto = {
        id: 1,
        nombre: 'Widget',
        codigo: 'W001',
        precio: 100,
    };

    test('renderiza nombre y precio', () => {
        render(<ProductoCard producto={mockProducto} onEdit={() => {}} onDelete={() => {}} />);
        expect(screen.getByText('Widget')).toBeInTheDocument();
        expect(screen.getByText('$100')).toBeInTheDocument();
    });

    test('llama onEdit al hacer clic en editar', () => {
        const handleEdit = jest.fn();
        render(<ProductoCard producto={mockProducto} onEdit={handleEdit} onDelete={() => {}} />);
        fireEvent.click(screen.getByText('Editar'));
        expect(handleEdit).toHaveBeenCalledWith(1);
    });
});
```

---

## 🎨 TailwindCSS - Sistema de Diseño

### Configuración Tailwind

```javascript
// tailwind.config.cjs
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1E40AF',
        secondary: '#64748B',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/line-clamp'),
  ],
};
```

### Clases Utilitarias Comunes

| Utilidad | Clases | Propósito |
|----------|--------|-----------|
| **Layout** | `flex`, `grid`, `container`, `mx-auto` | Estructuras flexibles/grid |
| **Spacing** | `p-4`, `m-2`, `space-x-4`, `gap-2` | Padding/margin/spacing |
| **Tipografía** | `text-xl`, `font-bold`, `text-gray-600` | Tamaños/pesos/colores de texto |
| **Colores** | `bg-primary`, `text-white`, `border-gray-300` | Fondos/textos/bordes |
| **Sombras** | `shadow-md`, `shadow-lg` | Elevación visual |
| **Bordes** | `rounded-lg`, `border`, `border-2` | Esquinas/bordes |
| **Responsive** | `sm:`, `md:`, `lg:`, `xl:`, `2xl:` | Breakpoints responsive |
| **Hover/Focus** | `hover:bg-blue-700`, `focus:ring-2` | Estados interactivos |

---

## 📚 Referencias Cruzadas

- **[ARQUITECTURA_SISTEMA.md](./ARQUITECTURA_SISTEMA.md)**: Visión general del monorepo completo
- **[CONFIGURACION_DESARROLLO.md](./CONFIGURACION_DESARROLLO.md)**: Setup de VS Code y workflows
- **[instructions/frontend-instructions.md](./instructions/frontend-instructions.md)**: Guía de desarrollo frontend
- **[instructions/redux-thunks.md](./instructions/redux-thunks.md)**: Detalles sobre Redux y thunks
- **[instructions/store-structure.md](./instructions/store-structure.md)**: Índice de slices completo

---

**Última actualización**: 2025-01-05  
**Documentado por**: Análisis exhaustivo del frontend React + TypeScript + Redux
