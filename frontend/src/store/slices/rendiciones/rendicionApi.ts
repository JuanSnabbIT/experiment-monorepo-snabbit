import RtkQueryService from '@/services/RtkQueryService';
import type {
    ICategoriaGasto,
    ICompraRendicion,
    IRendicion,
    IItemRendicion,
} from '@/interface/rendicion.interface';

export const rendicionApi = RtkQueryService.injectEndpoints({
    overrideExisting: false,
    endpoints: (builder) => ({
        getRendiciones: builder.query<IRendicion[], void>({
            query: () => ({
                url: '/api/rendiciones/',
                method: 'get',
            }),
            providesTags: (result) =>
                result
                    ? [
                          { type: 'RendicionList', id: 'LIST' },
                          ...result.map((rendicion) => ({
                              type: 'Rendicion' as const,
                              id: rendicion.id,
                          })),
                      ]
                    : [{ type: 'RendicionList', id: 'LIST' }],
        }),
        getMisRendiciones: builder.query<IRendicion[], void>({
            query: () => ({
                url: '/api/rendiciones/mis-rendiciones/',
                method: 'get',
            }),
            providesTags: (result) =>
                result
                    ? [
                          { type: 'RendicionList', id: 'MIS' },
                          ...result.map((rendicion) => ({
                              type: 'Rendicion' as const,
                              id: rendicion.id,
                          })),
                      ]
                    : [{ type: 'RendicionList', id: 'MIS' }],
        }),
        getRendicionesSucursal: builder.query<IRendicion[], void>({
            query: () => ({
                url: '/api/rendiciones/rendiciones-sucursal/',
                method: 'get',
            }),
            providesTags: (result) =>
                result
                    ? [
                          { type: 'RendicionList', id: 'SUCURSAL' },
                          ...result.map((rendicion) => ({
                              type: 'Rendicion' as const,
                              id: rendicion.id,
                          })),
                      ]
                    : [{ type: 'RendicionList', id: 'SUCURSAL' }],
        }),
        getRendicion: builder.query<IRendicion, number | string>({
            query: (id) => ({
                url: `/api/rendiciones/${id}/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'Rendicion', id }],
        }),
        getRendicionItems: builder.query<IItemRendicion[], number | string>({
            query: (id) => ({
                url: `/api/rendiciones/${id}/items-rendicion/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'RendicionItems', id }],
        }),
        getCategoriasGasto: builder.query<ICategoriaGasto[], void>({
            query: () => ({
                url: '/api/categorias-gasto/',
                method: 'get',
            }),
            providesTags: [{ type: 'RendicionCategorias', id: 'LIST' }],
        }),
        getComprasDisponibles: builder.query<ICompraRendicion[], void>({
            query: () => ({
                url: '/api/rendiciones/compras-libres',
                method: 'get',
            }),
            providesTags: [{ type: 'RendicionComprasDisponibles', id: 'LIST' }],
        }),
        updateRendicion: builder.mutation<
            IRendicion,
            { id: number | string; data: Partial<IRendicion> }
        >({
            query: ({ id, data }) => ({
                url: `/api/rendiciones/${id}/`,
                method: 'patch',
                data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Rendicion', id },
                { type: 'RendicionItems', id },
                { type: 'RendicionList', id: 'LIST' },
                { type: 'RendicionList', id: 'MIS' },
                { type: 'RendicionList', id: 'SUCURSAL' },
            ],
        }),
        aprobarRendicion: builder.mutation<IRendicion, { id: number | string }>({
            query: ({ id }) => ({
                url: `/api/rendiciones/${id}/aprobar/`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Rendicion', id },
                { type: 'RendicionItems', id },
                { type: 'RendicionList', id: 'LIST' },
                { type: 'RendicionList', id: 'MIS' },
                { type: 'RendicionList', id: 'SUCURSAL' },
            ],
        }),
        rechazarRendicion: builder.mutation<
            IRendicion,
            { id: number | string; motivo_rechazo: string }
        >({
            query: ({ id, motivo_rechazo }) => ({
                url: `/api/rendiciones/${id}/rechazar/`,
                method: 'post',
                data: { motivo_rechazo },
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Rendicion', id },
                { type: 'RendicionItems', id },
                { type: 'RendicionList', id: 'LIST' },
                { type: 'RendicionList', id: 'MIS' },
                { type: 'RendicionList', id: 'SUCURSAL' },
            ],
        }),
        pagarRendicion: builder.mutation<IRendicion, { id: number | string }>({
            query: ({ id }) => ({
                url: `/api/rendiciones/${id}/pagar/`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Rendicion', id },
                { type: 'RendicionItems', id },
                { type: 'RendicionList', id: 'LIST' },
                { type: 'RendicionList', id: 'MIS' },
                { type: 'RendicionList', id: 'SUCURSAL' },
            ],
        }),
        createRendicionItem: builder.mutation<
            IItemRendicion,
            { rendicionId: number | string; data: Record<string, unknown> }
        >({
            query: ({ rendicionId, data }) => ({
                url: `/api/rendiciones/${rendicionId}/items-rendicion/crear-item/`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, { rendicionId }) => [
                { type: 'Rendicion', id: rendicionId },
                { type: 'RendicionItems', id: rendicionId },
                { type: 'RendicionComprasDisponibles', id: 'LIST' },
            ],
        }),
        deleteRendicionItem: builder.mutation<
            void,
            { rendicionId: number | string; itemId: number | string }
        >({
            query: ({ rendicionId, itemId }) => ({
                url: `/api/rendiciones/${rendicionId}/items-rendicion/${itemId}/`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, { rendicionId }) => [
                { type: 'Rendicion', id: rendicionId },
                { type: 'RendicionItems', id: rendicionId },
                { type: 'RendicionList', id: 'LIST' },
                { type: 'RendicionList', id: 'MIS' },
                { type: 'RendicionList', id: 'SUCURSAL' },
            ],
        }),
        deleteRendicion: builder.mutation<void, { id: number | string }>({
            query: ({ id }) => ({
                url: `/api/rendiciones/${id}/`,
                method: 'delete',
            }),
            invalidatesTags: [
                { type: 'RendicionList', id: 'LIST' },
                { type: 'RendicionList', id: 'MIS' },
                { type: 'RendicionList', id: 'SUCURSAL' },
            ],
        }),
    }),
});

export const {
    useGetRendicionesQuery,
    useGetMisRendicionesQuery,
    useGetRendicionesSucursalQuery,
    useGetRendicionQuery,
    useGetRendicionItemsQuery,
    useGetCategoriasGastoQuery,
    useGetComprasDisponiblesQuery,
    useUpdateRendicionMutation,
    useAprobarRendicionMutation,
    useRechazarRendicionMutation,
    usePagarRendicionMutation,
    useCreateRendicionItemMutation,
    useDeleteRendicionItemMutation,
    useDeleteRendicionMutation,
} = rendicionApi;
