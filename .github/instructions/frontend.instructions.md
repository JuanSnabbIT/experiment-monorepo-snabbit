# Instrucciones Frontend — React + TypeScript + Tailwind

> Instrucciones específicas para trabajar en `frontend/`.
> Aplican cuando el alcance de la tarea es frontend.

---

## Checklist antes de modificar código

1. ¿El componente es funcional (arrow function)?
2. ¿Se usan `useAppDispatch`/`useAppSelector` (nunca hooks planos)?
3. ¿Los imports absolutos usan `@/`?
4. ¿Las interfaces usan `I` prefix y los types `T` prefix?
5. ¿Nueva feature? → preferir RTK Query sobre createAsyncThunk.
6. ¿Lazy loading para nuevas páginas?
7. ¿La ruta está registrada en `pages.config.ts`, `contentRoutes.tsx`, y opcionalmente `asideRoutes.tsx`?

---

## Crear un nuevo componente de dominio

```tsx
// pages/MiFeature/components/TablaMiFeature.tsx
import React from 'react';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAppSelector } from '@/store';
import type { IMiEntidad } from '@/interface/mi-feature.interface';

interface ITablaMiFeatureProps {
    datos: IMiEntidad[];
    onEditar: (id: number) => void;
}

const TablaMiFeature: React.FC<ITablaMiFeatureProps> = ({ datos, onEditar }) => {
    return (
        <Card>
            <CardHeader>
                <h3>Mi Feature</h3>
            </CardHeader>
            <CardBody>
                {/* Contenido con @tanstack/react-table */}
            </CardBody>
        </Card>
    );
};

export default TablaMiFeature;
```

---

## Crear una interfaz de dominio

Archivo: `src/interface/mi-feature.interface.ts`

```typescript
export interface IMiEntidad {
    id: number;
    nombre: string;
    estado: string;
    estado_label: string;
    empresa: number;
    empresa_nombre: string;
    fecha_creacion: string;
    fecha_modificacion: string;
}

export interface IMiEntidadCrear {
    nombre: string;
    estado?: string;
}
```

---

## Crear un type de UI

Archivo: `src/types/mi-componente.type.ts`

```typescript
export type TMiVariante = 'primario' | 'secundario' | 'outline';
export type TMiTamaño = 'sm' | 'md' | 'lg';
```

---

## Crear un slice RTK Query (preferido para features nuevas)

Archivo: `src/store/slices/miFeature/miFeatureApi.ts`

```typescript
import { rtkQueryService } from '@/services/RtkQueryService';
import type { IMiEntidad, IMiEntidadCrear } from '@/interface/mi-feature.interface';

const miFeatureApi = rtkQueryService.injectEndpoints({
    endpoints: (builder) => ({
        listaMiFeature: builder.query<IMiEntidad[], void>({
            query: () => ({ url: '/mi-feature/', method: 'GET' }),
            providesTags: ['MiFeature'],
        }),
        detalleMiFeature: builder.query<IMiEntidad, number>({
            query: (id) => ({ url: `/mi-feature/${id}/`, method: 'GET' }),
            providesTags: (_result, _err, id) => [{ type: 'MiFeature', id }],
        }),
        crearMiFeature: builder.mutation<IMiEntidad, IMiEntidadCrear>({
            query: (body) => ({ url: '/mi-feature/', method: 'POST', data: body }),
            invalidatesTags: ['MiFeature'],
        }),
        editarMiFeature: builder.mutation<IMiEntidad, { id: number; data: Partial<IMiEntidadCrear> }>({
            query: ({ id, data }) => ({ url: `/mi-feature/${id}/`, method: 'PATCH', data }),
            invalidatesTags: (_result, _err, { id }) => [{ type: 'MiFeature', id }, 'MiFeature'],
        }),
        eliminarMiFeature: builder.mutation<void, number>({
            query: (id) => ({ url: `/mi-feature/${id}/`, method: 'DELETE' }),
            invalidatesTags: ['MiFeature'],
        }),
        cambiarEstadoMiFeature: builder.mutation<IMiEntidad, { id: number; estado: string }>({
            query: ({ id, estado }) => ({
                url: `/mi-feature/${id}/cambiar-estado/`,
                method: 'POST',
                data: { estado },
            }),
            invalidatesTags: (_result, _err, { id }) => [{ type: 'MiFeature', id }, 'MiFeature'],
        }),
    }),
});

export const {
    useListaMiFeatureQuery,
    useDetalleMiFeatureQuery,
    useCrearMiFeatureMutation,
    useEditarMiFeatureMutation,
    useEliminarMiFeatureMutation,
    useCambiarEstadoMiFeatureMutation,
} = miFeatureApi;

export default miFeatureApi;
```

**Importante**: Registrar el tag `'MiFeature'` en `RtkQueryService.ts` → `tagTypes`.

---

## Crear un slice legacy (solo si extiende feature existente con thunks)

```typescript
// src/store/slices/miFeature/miFeatureSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import ApiService from '@/services/ApiService';
import type { IMiEntidad } from '@/interface/mi-feature.interface';

interface IMiFeatureState {
    listaMiFeature: IMiEntidad[];
    detalleMiFeature: IMiEntidad | null;
    loading: boolean;
    error: string | null;
}

const initialState: IMiFeatureState = {
    listaMiFeature: [],
    detalleMiFeature: null,
    loading: false,
    error: null,
};

export const listaMiFeatureThunk = createAsyncThunk(
    'miFeature/lista',
    async (_, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<IMiEntidad[]>({
                url: '/mi-feature/',
                method: 'get',
            });
            return response.data;
        } catch (error: unknown) {
            if (error instanceof Error) return rejectWithValue(error.message);
            return rejectWithValue('Error desconocido');
        }
    }
);

const miFeatureSlice = createSlice({
    name: 'miFeature',
    initialState,
    reducers: {
        limpiarDetalle: (state) => {
            state.detalleMiFeature = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(listaMiFeatureThunk.pending, (state) => { state.loading = true; })
            .addCase(listaMiFeatureThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaMiFeature = action.payload;
            })
            .addCase(listaMiFeatureThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { limpiarDetalle } = miFeatureSlice.actions;
export default miFeatureSlice.reducer;
```

---

## Registrar una nueva ruta

### 1. `src/config/pages.config.ts`

```typescript
// Dentro del objeto Pages:
miFeature: {
    id: 'miFeature',
    to: '/mi-feature',
    text: 'Mi Feature',
    icon: 'HeroClipboard',
    subPages: {
        listaMiFeature: {
            id: 'listaMiFeature',
            to: '/mi-feature',
            text: 'Lista',
            icon: 'HeroClipboard',
        },
        detalleMiFeature: {
            id: 'detalleMiFeature',
            to: '/mi-feature/:id',
            text: 'Detalle',
            icon: 'HeroClipboard',
        },
    },
},
```

### 2. `src/routes/contentRoutes.tsx`

```tsx
const ListaMiFeature = lazy(() => import('@/pages/MiFeature/ListaMiFeature'));
const DetalleMiFeature = lazy(() => import('@/pages/MiFeature/DetalleMiFeature'));

// En el array de rutas:
{
    path: Pages.miFeature.subPages.listaMiFeature.to,
    element: <ListaMiFeature />,
    authority: ['Administradores', 'Supervisores'],
},
{
    path: Pages.miFeature.subPages.detalleMiFeature.to,
    element: <DetalleMiFeature />,
    authority: ['Administradores', 'Supervisores'],
},
```

### 3. `src/routes/asideRoutes.tsx` (sidebar)

Agregar entrada al menú lateral si la feature lo requiere.

---

## Estructura de página feature

```
src/pages/MiFeature/
├── ListaMiFeature.tsx          # Listado principal
├── DetalleMiFeature.tsx        # Vista detalle
├── components/
│   ├── TablaMiFeature.tsx      # Tabla con @tanstack/react-table
│   ├── FormularioMiFeature.tsx # Formik form
│   ├── CardEstadoMiFeature.tsx # Cards de estado u otro UI
│   └── ...
└── modals/
    ├── ModalCrearMiFeature.tsx
    ├── ModalEditarMiFeature.tsx
    └── ...
```

---

## Patrones de estilo (Tailwind)

```tsx
// Dark mode: usar clases condicionales
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">

// Colores dinámicos: usar classNames
import classNames from 'classnames';
<span className={classNames(
    'px-2 py-1 rounded-md text-sm font-medium',
    estado === 'pendiente' && 'bg-yellow-100 text-yellow-800',
    estado === 'completado' && 'bg-green-100 text-green-800',
    estado === 'cancelado' && 'bg-red-100 text-red-800',
)}>
    {estado_label}
</span>
```

---

## Formularios (Formik + Yup)

```tsx
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Input from '@/components/form/Input';
import Validation from '@/components/form/Validation';

const validationSchema = Yup.object({
    nombre: Yup.string().required('El nombre es obligatorio'),
    descripcion: Yup.string().max(500, 'Máximo 500 caracteres'),
});

const formik = useFormik({
    initialValues: { nombre: '', descripcion: '' },
    validationSchema,
    onSubmit: (values) => {
        // dispatch o mutation
    },
});
```

---

## Hooks personalizados

- Hooks de dominio: `use` + verbo/sustantivo español (`useEstadoOT`, `useDescargarCotizacionPdf`)
- Hooks de UI: `use` + inglés (`useDarkMode`, `useDeviceScreen`)
- Colocar en `src/hooks/`

---

## Manejo de errores en thunks

Código nuevo debe tipar errores correctamente:

```typescript
} catch (error: unknown) {
    if (error instanceof Error) {
        return rejectWithValue(error.message);
    }
    return rejectWithValue('Error desconocido');
}
```

**Nunca** usar `error: any` en código nuevo.

---

## Notificaciones

- **Toast**: `react-toastify` para feedback rápido
- **Confirmación**: `sweetalert2` para acciones destructivas

```tsx
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

// Toast
toast.success('Operación exitosa');
toast.error('Error al procesar');

// Confirmación
const result = await Swal.fire({
    title: '¿Estás seguro?',
    text: 'Esta acción no se puede deshacer',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
});
if (result.isConfirmed) { /* ejecutar */ }
```

---

## Convenciones de archivos

| Tipo | Ubicación | Naming |
|---|---|---|
| Página | `src/pages/Feature/` | PascalCase español: `ListaCotizaciones.tsx` |
| Componente dominio | `src/pages/Feature/components/` | PascalCase español: `TablaCotizaciones.tsx` |
| Componente UI | `src/components/ui/` | PascalCase inglés: `Button.tsx` |
| Interface dominio | `src/interface/` | kebab-case español: `cotizaciones.interface.ts` |
| Type UI | `src/types/` | kebab-case inglés: `colors.type.ts` |
| Constante | `src/constants/` | kebab-case: `cotizacion.constant.ts` |
| Slice Redux | `src/store/slices/feature/` | camelCase español: `cotizacionSlice.ts` |
| API RTK Query | `src/store/slices/feature/` | camelCase español: `cotizacionApi.ts` |
| Hook | `src/hooks/` | camelCase: `useEstadoOT.ts` |
