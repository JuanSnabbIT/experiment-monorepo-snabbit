````markdown
# Frontend Guide - React + TypeScript + Redux (Documento Exhaustivo)

Guía completa de convenciones, módulos y patrones del frontend React.

---

## 1. Estructura de `src/`

```
src/
├── pages/              # Vistas por módulo de negocio
│   ├── Dashboard/
│   ├── Empresas/
│   ├── Clientes/
│   ├── Items/
│   ├── Bodegas/
│   │   ├── OrdenCompra/
│   │   ├── GuiaSalida/
│   │   ├── Compra/
│   │   ├── TomaInventario/
│   │   └── Devoluciones/
│   ├── Cotizaciones/
│   ├── OrdenTrabajo/
│   ├── Rendiciones/
│   ├── Contratos/
│   ├── Visitas/
│   ├── Recursos/
│   ├── Calendario/
│   ├── Facturacion/
│   ├── Core/
│   ├── InvitacionEmpresa/
│   ├── ResetPassword/
│   └── Login.page.tsx
├── components/         # Componentes reutilizables
│   ├── ui/             # Componentes UI base (Button, Modal, Card, etc.)
│   ├── form/           # Componentes de formulario
│   ├── modals/         # Modales específicos
│   ├── layouts/        # Layouts de página
│   ├── helper/         # Componentes auxiliares
│   └── icon/           # Iconos personalizados
├── store/              # Redux Toolkit
│   ├── slices/         # Slices por dominio
│   ├── hook.ts         # useAppDispatch, useAppSelector
│   ├── storeSetup.ts   # Configuración del store
│   ├── rootReducer.ts  # Combina reducers
│   └── index.ts        # Exportaciones
├── services/           # Servicios HTTP
│   ├── BaseService.ts  # Axios con interceptores
│   ├── ApiService.ts   # Wrapper de BaseService
│   └── RtkQueryService.ts  # Base RTK Query
├── interface/          # Tipos TypeScript (¡carpeta singular!)
├── hooks/              # Custom hooks
├── routes/             # Definición de rutas
├── utils/              # Utilidades
├── config/             # Configuración (pages.config.ts)
├── styles/             # Estilos globales
├── App.tsx
└── main.tsx
```

**⚠️ IMPORTANTE:** La carpeta de interfaces es `interface/` (singular), no `interfaces/`.

---

## 2. Módulos por Página

### 2.1 Dashboard
- Vista principal del usuario
- Widgets de resumen

### 2.2 Empresas
- Gestión de empresas propias
- Sucursales
- Usuarios de empresa

### 2.3 Clientes
- Detalle de clientes (empresas cliente)
- Usuarios del cliente

### 2.4 Items
- Catálogo de productos
- Proveedores
- Categorías
- Fabricantes

### 2.5 Bodegas
- **Bodegas** - CRUD de almacenes
- **Stock** - Stock por bodega
- **OrdenCompra** - Órdenes de compra a proveedores
- **GuiaSalida** - Guías de salida de inventario
- **Compra** - Compras rápidas
- **TomaInventario** - Inventarios físicos
- **Devoluciones** - Vouchers de devolución

### 2.6 Cotizaciones
- Creación y edición de cotizaciones
- Items de cotización
- Solicitantes y aprobación
- Seguimientos

### 2.7 OrdenTrabajo
- Órdenes de trabajo completas
- Soportes técnicos
- Servicios generales
- Historial de cambios
- Adjuntos
- Gastos operativos
- Cierre administrativo

### 2.8 Rendiciones
- Rendiciones de gastos
- Detalle de gastos
- Vinculación con OT

### 2.9 Contratos
- Contratos empresa-cliente
- Servicios contratados
- Licencias

### 2.10 Visitas
- Visitas de soporte
- Asistencia a usuarios
- Entregas de equipo

### 2.11 Recursos
- Equipos de cómputo
- Asignación de equipos
- Software instalado

### 2.12 Calendario
- Calendario de eventos
- Días feriados
- Solicitudes de vacaciones

### 2.13 Facturación
- Cierres administrativos
- Prefacturas

---

## 3. Store (Redux Toolkit)

### 3.1 Estructura de Slices

```
store/slices/
├── auth/                  # Autenticación y tokens
├── bodega/                # Bodegas, stock, OC, guías
├── calendario/            # Calendario
├── contratos/             # Contratos
├── core/                  # Personalización, temas
├── cotizaciones/          # Cotizaciones
├── dashboard/             # Dashboard
├── empresa/               # Empresas
├── invitacion/            # Invitaciones
├── item/                  # Items del catálogo
├── ordenTrabajo/          # OT (slice + RTK Query Api)
│   ├── ordenTrabajoSlice.ts
│   ├── ordenTrabajoApi.ts    # Endpoints RTK Query
│   └── thunks.ts             # Thunks async
├── recursos/              # Recursos
├── rendiciones/           # Rendiciones
└── visita/                # Visitas
```

### 3.2 Hook Tipado

```typescript
// store/hook.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './storeSetup';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

**Regla:** SIEMPRE usar `useAppDispatch` y `useAppSelector` en lugar de los hooks base de Redux.

---

## 4. RTK Query - Sistema de Cache

### 4.1 Servicio Base

```typescript
// services/RtkQueryService.ts
const RtkQueryService = createApi({
    reducerPath: 'rtkApi',
    baseQuery: axiosBaseQuery(),
    tagTypes: [
        'Cotizaciones', 'CotizacionesItems', 'CotizacionesSolicitantes',
        'OrdenCompra', 'OrdenCompraItems', 'OrdenCompraList',
        'GuiaSalida', 'GuiaSalidaItems', 'StockItems',
        'OrdenTrabajo', 'OrdenTrabajoList', 'OrdenTrabajoSoportes',
        'Empresas', 'UsuariosEmpresa', 'Clientes',
        // ... más tags
    ],
});
```

### 4.2 Inyección de Endpoints

```typescript
// store/slices/ordenTrabajo/ordenTrabajoApi.ts
export const ordenTrabajoApi = RtkQueryService.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        // Query (GET)
        getOrdenesTrabajo: builder.query<IOrdenDeTrabajo[], void>({
            query: () => ({
                url: '/api/ordenes-de-trabajo/',
                method: 'get',
            }),
            providesTags: ['OrdenTrabajoList'],
        }),
        
        // Query con parámetro
        getDetalleOrdenTrabajo: builder.query<IOrdenDeTrabajo, number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajo', id }],
        }),
        
        // Mutation (POST/PATCH/DELETE)
        updateOrdenTrabajo: builder.mutation<
            IOrdenDeTrabajo,
            { id: number | string; data: Partial<IOrdenDeTrabajo> }
        >({
            query: ({ id, data }) => ({
                url: `/api/ordenes-de-trabajo/${id}/`,
                method: 'patch',
                data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'OrdenTrabajo', id },
                'OrdenTrabajoList',
            ],
        }),
    }),
});

// Exportar hooks auto-generados
export const {
    useGetOrdenesTrabajoQuery,
    useGetDetalleOrdenTrabajoQuery,
    useUpdateOrdenTrabajoMutation,
} = ordenTrabajoApi;
```

### 4.3 Uso en Componentes

```typescript
// En componente
const { data, isLoading, error } = useGetOrdenesTrabajoQuery();
const [updateOT] = useUpdateOrdenTrabajoMutation();

// Actualizar
await updateOT({ id: 123, data: { estado: 'completada' } });
// La invalidación automática refrescará las listas
```

### 4.4 Reglas Críticas de RTK Query

**✅ CORRECTO:**
```typescript
// Confiar en invalidatesTags para revalidación
invalidatesTags: ['OrdenTrabajoList']
```

**❌ INCORRECTO:**
```typescript
// NO usar refetch() manual después de mutations
// NO importar queryClient ni usar invalidateQueries
```

---

## 5. Servicios HTTP

### 5.1 BaseService

```typescript
// services/BaseService.ts
const BaseService = axios.create({
    timeout: 60000,
    baseURL: process.env.VITE_API_URL,
});

// Interceptor de solicitud - inyecta JWT
BaseService.interceptors.request.use((config) => {
    const token = store.getState().auth.access;
    if (token) {
        config.headers['Authorization'] = 'Bearer ' + token;
    }
    return config;
});

// Interceptor de respuesta - maneja refresh token
BaseService.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Intentar refresh
            const refreshToken = store.getState().auth.refresh;
            const response = await axios.post('/auth/jwt/refresh', { refresh: refreshToken });
            store.dispatch(GUARDAR_TOKEN(response.data.access));
            // Reintentar request original
            return BaseService(originalRequest);
        }
        return Promise.reject(error);
    }
);
```

### 5.2 ApiService

```typescript
// services/ApiService.ts
const ApiService = {
    fetchData: <T>(config: AxiosRequestConfig): Promise<T> => {
        return BaseService(config).then(response => response.data);
    }
};
```

**Regla:** Usar `ApiService.fetchData()` para llamadas HTTP directas (fuera de RTK Query).

---

## 6. Interfaces TypeScript

### 6.1 Archivos de Interfaces

```
interface/
├── bodega.interface.ts        # IBodega, IGuiaSalida, IOrdenCompra, IStockItemEnBodega
├── calendario.interface.ts    # IDiaCalendario, ISolicitudVacaciones
├── contrato.interface.ts      # IContrato, IContratoServicio, IContratoLicencia
├── core.interface.ts          # IPersonalizacionUsuario, ISoftware
├── cotizaciones.interface.ts  # ICotizacion, IItemCotizacion, ISolicitante
├── empresas.interface.ts      # IEmpresa, IUsuarioEmpresa, ISucursalEmpresa
├── items.interface.ts         # IItemEmpresa, IProveedor, ICategoria
├── ordenTrabajo.interface.ts  # IOrdenDeTrabajo, ISoporteTecnico, IServicioEnOT
├── recursos.interface.ts      # IEquipo, IUsuarioEquipo, ISoftwareInstalado
├── rendicion.interface.ts     # IRendicion, IDetalleGasto
├── user.interface.ts          # IUser
└── visitas.interface.ts       # IVisitaSoporte, IAsistencia, IEntrega
```

### 6.2 Patrón de Nomenclatura

```typescript
// Prefijo I para interfaces
interface IOrdenDeTrabajo {
    id: number;
    estado: string;
    // ...
}

// Sin prefijo para tipos simples
type EstadoOT = 'pendiente' | 'en_proceso' | 'completada';
```

---

## 7. Hooks Personalizados

### 7.1 Hooks Disponibles

```
hooks/
├── useAppDispatch/Selector    # En store/hook.ts (Redux tipado)
├── useAsideStatus.ts          # Estado del sidebar
├── useAuthority.ts            # Permisos del usuario
├── useAxiosFunction.ts        # Llamadas HTTP con estado
├── useDarkMode.ts             # Modo oscuro
├── useDescargarCotizacionPdf.ts  # Descarga PDF cotización
├── useDeviceScreen.ts         # Detección de pantalla
├── useEstadoOT.ts             # Estados de OT
├── useFontSize.ts             # Tamaño de fuente
├── useLocalStorage.ts         # Persistencia local
├── useSaveBtn.ts              # Estado de botón guardar
└── ...
```

### 7.2 Ejemplo de Hook

```typescript
// hooks/useEstadoOT.ts
export const useEstadoOT = (estado: string) => {
    const colores = {
        pendiente: 'yellow',
        en_proceso: 'blue',
        completada: 'green',
        // ...
    };
    return colores[estado] || 'gray';
};
```

---

## 8. Componentes UI

### 8.1 Componentes Base

```
components/ui/
├── Alert.tsx          # Alertas
├── Badge.tsx          # Badges
├── Button.tsx         # Botones
├── ButtonGroup.tsx    # Grupos de botones
├── Card.tsx           # Cards
├── Dropdown.tsx       # Dropdowns
├── Modal.tsx          # Modales
├── OffCanvas.tsx      # Panel lateral
├── Progress.tsx       # Barras de progreso
├── Table.tsx          # Tablas
└── Tooltip.tsx        # Tooltips
```

### 8.2 Componentes de Formulario

```
components/form/
├── Input.tsx          # Inputs
├── Select.tsx         # Selects
├── Checkbox.tsx       # Checkboxes
├── Radio.tsx          # Radios
├── Textarea.tsx       # Textareas
├── DatePicker.tsx     # Selector de fecha
└── ...
```

---

## 9. Rutas

### 9.1 Estructura de Rutas

```
routes/
├── asideRoutes.tsx    # Rutas del sidebar
├── contentRoutes.tsx  # Rutas principales (contenido)
├── headerRoutes.tsx   # Rutas del header
└── footerRoutes.tsx   # Rutas del footer
```

### 9.2 Configuración de Páginas

```typescript
// config/pages.config.ts
export const authPages = {
    loginPage: { id: 'login', to: '/login' },
    // ...
};

export const appPages = {
    dashboard: { id: 'dashboard', to: '/' },
    empresas: { id: 'empresas', to: '/empresas' },
    ordenesTrabajo: { id: 'ordenes-trabajo', to: '/ordenes-trabajo' },
    // ...
};
```

---

## 10. Alertas y Notificaciones

### 10.1 Confirmaciones (SweetAlert2)

```typescript
import { confirmAlert } from '@/utils/sweetAlert';

const handleDelete = async () => {
    const result = await confirmAlert({
        title: '¿Eliminar registro?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        confirmButtonText: 'Eliminar',
    });
    
    if (result.isConfirmed) {
        await deleteItem(id);
    }
};
```

### 10.2 Toast (react-toastify)

```typescript
import { toast } from 'react-toastify';

// Éxito
toast.success('Registro guardado correctamente');

// Error
toast.error('Error al guardar');

// Advertencia
toast.warning('Hay campos sin completar');

// Info
toast.info('Procesando...');
```

**Regla:**
- `confirmAlert` → Confirmaciones pre-acción (eliminar, cancelar)
- `toast` → Feedback post-acción (guardado, error)

---

## 11. Formularios (Formik + Yup)

### 11.1 Patrón Básico

```typescript
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object({
    nombre: Yup.string().required('El nombre es requerido'),
    email: Yup.string().email('Email inválido').required('El email es requerido'),
});

const MiFormulario = () => (
    <Formik
        initialValues={{ nombre: '', email: '' }}
        validationSchema={validationSchema}
        onSubmit={async (values) => {
            await guardarDatos(values);
        }}
    >
        {({ isSubmitting }) => (
            <Form>
                <Field name="nombre" />
                <ErrorMessage name="nombre" />
                
                <Field name="email" type="email" />
                <ErrorMessage name="email" />
                
                <button type="submit" disabled={isSubmitting}>
                    Guardar
                </button>
            </Form>
        )}
    </Formik>
);
```

---

## 12. Tablas (TanStack Table)

### 12.1 Patrón Básico

```typescript
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';

const columns = [
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'estado', header: 'Estado' },
];

const MiTabla = ({ data }) => {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });
    
    return (
        <table>
            <thead>
                {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                            <th key={header.id}>
                                {flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                        ))}
                    </tr>
                ))}
            </thead>
            <tbody>
                {table.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                        {row.getVisibleCells().map(cell => (
                            <td key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};
```

---

## 13. Convenciones de Código

### 13.1 Nomenclatura de Archivos

```
# Páginas
NombreModulo.page.tsx
DetalleModulo.page.tsx

# Componentes
NombreComponente.tsx

# Hooks
useNombreHook.ts

# Interfaces
nombreModulo.interface.ts

# Slices
nombreSlice.ts
nombreApi.ts (RTK Query)
```

### 13.2 Imports

```typescript
// Orden: React, librerías externas, alias (@/), relativos
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAppSelector } from '@/store/hook';
import { IOrdenDeTrabajo } from '@/interface/ordenTrabajo.interface';
import { MiComponente } from './MiComponente';
```

### 13.3 Alias de Paths

```typescript
// Configurado en tsconfig.json y vite.config.ts
import { algo } from '@/components/algo';  // src/components/algo
```

---

## 14. Validaciones Locales

```bash
# Lint
npm run lint

# Build (verificar errores de TypeScript)
npm run build

# Formatear código
npm run prettier:fix
```

---

## 15. Variables de Entorno

```bash
# .env
VITE_API_URL=http://localhost:8000
```

**Acceso en código:**
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
// O via process.env.VITE_API_URL (configurado en vite.config.ts)
```

---

Última actualización: 2026-02-03
````
