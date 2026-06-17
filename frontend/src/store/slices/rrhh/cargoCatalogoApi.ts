import RtkQueryService from '@/services/RtkQueryService';

export interface ICargoCatalogo {
    id: number;
    empresa: number;
    nombre: string;
    activo: boolean;
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

        createCargoCatalogo: builder.mutation<ICargoCatalogo, { nombre: string; empresa?: number }>({
            query: (data) => ({ url: `${BASE}/`, method: 'post', data }),
            invalidatesTags: [{ type: 'CargoCatalogo', id: 'LIST' }],
        }),
    }),
});

export const { useGetCargosCatalogoQuery, useCreateCargoCatalogoMutation } = cargoCatalogoApi;
