import {
    IItemEnOrdenCompra,
    IItemOrdenCompraEnStock,
    IOrdenCompra,
} from '@/interface/bodega.interface';
import RtkQueryService from '@/services/RtkQueryService';

export const ordenCompraApi = RtkQueryService.injectEndpoints({
    endpoints: (builder) => ({
        getDetalleOrdenCompra: builder.query<IOrdenCompra, string | number>({
            query: (id) => ({
                url: `/api/ordenes-compra/${id}`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenCompra' as const, id }],
        }),
        getItemsEnOrdenCompra: builder.query<IItemEnOrdenCompra[], number | string>({
            query: (id) => ({
                url: `/api/ordenes-compra/${id}/items-en-orden-compra/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenCompraItems' as const, id }],
        }),
        getItemsOrdenCompraEnStock: builder.query<IItemOrdenCompraEnStock[], number | string>({
            query: (id) => ({
                url: `/api/ordenes-compra/${id}/items-orden-compra-en-stock/por-orden/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenCompraItemsStock' as const, id }],
        }),
        getOrdenesCompraPorEmpresa: builder.query<
            IOrdenCompra[],
            { id_empresa: string | number; filtro?: string }
        >({
            query: ({ id_empresa, filtro }) => ({
                url: `/api/ordenes-compra/por-empresa/${id_empresa}/`,
                method: 'get',
                params: filtro ? new URLSearchParams(filtro) : undefined,
            }),
            providesTags: ['OrdenCompraList'],
        }),
        getMisOrdenesCompra: builder.query<IOrdenCompra[], void>({
            query: () => ({
                url: `/api/ordenes-compra/mis_ordenes/`,
                method: 'get',
            }),
            providesTags: ['MisOrdenesCompraList'],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetDetalleOrdenCompraQuery,
    useGetItemsEnOrdenCompraQuery,
    useGetItemsOrdenCompraEnStockQuery,
    useGetOrdenesCompraPorEmpresaQuery,
    useGetMisOrdenesCompraQuery,
} = ordenCompraApi;
