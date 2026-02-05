import RtkQueryService from '@/services/RtkQueryService';
import type { IItemEnCompra } from '@/interface/bodega.interface';

export const bodegaApi = RtkQueryService.injectEndpoints({
    overrideExisting: false,
    endpoints: (builder) => ({
        getCompraItems: builder.query<IItemEnCompra[], number | string>({
            query: (compraId) => ({
                url: `/api/compras/${compraId}/items/`,
                method: 'get',
            }),
            providesTags: (_result, _error, compraId) => [
                { type: 'CompraItems', id: compraId },
            ],
        }),
    }),
});

export const { useGetCompraItemsQuery, useLazyGetCompraItemsQuery } = bodegaApi;
