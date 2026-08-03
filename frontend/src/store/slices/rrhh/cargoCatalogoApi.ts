import RtkQueryService from '@/services/RtkQueryService';

export interface ICargoCatalogo {
    id: number;
    empresa: number;
    nombre: string;
    activo: boolean;
    funciones_default: string;
    fecha_creacion: string;
    fecha_modificacion: string;
}

const BASE = '/api/rrhh/cargos-catalogo';

export const cargoCatalogoApi = RtkQueryService.injectEndpoints({
    overrideExisting: import.meta.env.DEV,
    endpoints: (builder) => ({
        getCargosCatalogo: builder.query<ICargoCatalogo[], void>({
            query: () => ({ url: `${BASE}/`, method: 'get' }),
            providesTags: [{ type: 'CargoCatalogo', id: 'LIST' }],
        }),

        createCargoCatalogo: builder.mutation<
            ICargoCatalogo,
            { nombre: string; empresa?: number; funciones_default?: string }
        >({
            query: (data) => ({ url: `${BASE}/`, method: 'post', data }),
            invalidatesTags: [{ type: 'CargoCatalogo', id: 'LIST' }],
        }),

        updateCargoCatalogo: builder.mutation<ICargoCatalogo, { id: number; funciones_default: string }>({
            query: ({ id, ...data }) => ({ url: `${BASE}/${id}/`, method: 'patch', data }),
            invalidatesTags: [{ type: 'CargoCatalogo', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetCargosCatalogoQuery,
    useCreateCargoCatalogoMutation,
    useUpdateCargoCatalogoMutation,
} = cargoCatalogoApi;
