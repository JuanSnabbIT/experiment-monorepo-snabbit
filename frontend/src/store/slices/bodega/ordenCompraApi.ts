import {
    ICambiarEstadoOCResponse,
    ICotizacionAprobadaParaOC,
    IItemEnOrdenCompra,
    IItemOrdenCompraEnStock,
    IOrdenCompra,
    IOrdenCompraAgrupada,
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

        // ── OC Agrupada ──────────────────────────────────────────────────────
        getOCsAgrupadasPorEmpresa: builder.query<
            IOrdenCompraAgrupada[],
            { id_empresa: string | number; oc_cliente?: string | number }
        >({
            query: ({ id_empresa, oc_cliente }) => ({
                url: `/api/oc-agrupadas/por-empresa/${id_empresa}/`,
                method: 'get',
                params: oc_cliente ? { oc_cliente } : undefined,
            }),
            providesTags: ['OrdenCompraList'],
        }),
        getDetalleOCAgrupada: builder.query<IOrdenCompraAgrupada, string | number>({
            query: (id) => ({
                url: `/api/oc-agrupadas/${id}/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenCompra' as const, id: `agrupada-${id}` }],
        }),
        crearOCAgrupada: builder.mutation<
            IOrdenCompraAgrupada,
            {
                oc_empresa: number;
                oc_cliente: number;
                cotizaciones_ids: number[];
                observaciones?: string;
            }
        >({
            query: (body) => ({
                url: `/api/oc-agrupadas/crear/`,
                method: 'post',
                data: body,
            }),
            invalidatesTags: ['OrdenCompraList', 'MisOrdenesCompraList'],
        }),

        cambiarEstadoOrdenCompra: builder.mutation<
            ICambiarEstadoOCResponse,
            { id: number; estado: string; observacion?: string }
        >({
            query: ({ id, estado, observacion }) => ({
                url: `/api/ordenes-compra/${id}/cambiar-estado/`,
                method: 'post',
                data: { estado, ...(observacion ? { observacion } : {}) },
            }),
            invalidatesTags: (result, _error, { id }) => [
                { type: 'OrdenCompra' as const, id },
                'OrdenCompraList',
                ...(result?.oca_id
                    ? [{ type: 'OrdenCompra' as const, id: `agrupada-${result.oca_id}` }]
                    : []),
            ],
        }),

        completarOrdenCompra: builder.mutation<
            { message: string; estado: string },
            { id: number; estado: string; items?: { item_oc_id: number; cantidad: number }[]; oca_id?: number | null }
        >({
            query: ({ id, estado, items }) => ({
                url: `/api/ordenes-compra/${id}/completar_orden_compra/`,
                method: 'post',
                data: { estado, ...(items ? { items } : {}) },
            }),
            invalidatesTags: (_result, _error, { id, oca_id }) => [
                { type: 'OrdenCompra' as const, id },
                'OrdenCompraList',
                'MisOrdenesCompraList',
                ...(oca_id ? [{ type: 'OrdenCompra' as const, id: `agrupada-${oca_id}` }] : []),
            ],
        }),

        completarYCrearGuia: builder.mutation<
            { message: string; estado: string; guia_id: number },
            { id: number; estado: string; items?: { item_oc_id: number; cantidad: number }[]; oca_id?: number | null }
        >({
            query: ({ id, estado, items }) => ({
                url: `/api/ordenes-compra/${id}/completar-y-crear-guia/`,
                method: 'post',
                data: { estado, ...(items ? { items } : {}) },
            }),
            invalidatesTags: (_result, _error, { id, oca_id }) => [
                { type: 'OrdenCompra' as const, id },
                'OrdenCompraList',
                'MisOrdenesCompraList',
                ...(oca_id ? [{ type: 'OrdenCompra' as const, id: `agrupada-${oca_id}` }] : []),
            ],
        }),

        recepcionarConsumoDirecto: builder.mutation<
            ICambiarEstadoOCResponse,
            { id: number; oca_id?: number | null }
        >({
            query: ({ id }) => ({
                url: `/api/ordenes-compra/${id}/recepcionar-consumo-directo/`,
                method: 'post',
                data: {},
            }),
            invalidatesTags: (result, _error, { id, oca_id }) => [
                { type: 'OrdenCompra' as const, id },
                'OrdenCompraList',
                'MisOrdenesCompraList',
                ...(oca_id
                    ? [{ type: 'OrdenCompra' as const, id: `agrupada-${oca_id}` }]
                    : result?.oca_id
                    ? [{ type: 'OrdenCompra' as const, id: `agrupada-${result.oca_id}` }]
                    : []),
            ],
        }),

        // ── Cotizaciones aprobadas para OC ───────────────────────────────────
        getCotizacionesAprobadasParaOC: builder.query<
            ICotizacionAprobadaParaOC[],
            { cliente_id: string | number }
        >({
            query: ({ cliente_id }) => ({
                url: `/api/cotizaciones/aprobadas-para-oc/`,
                method: 'get',
                params: { cliente_id },
            }),
            providesTags: ['Cotizaciones'],
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
    useGetOCsAgrupadasPorEmpresaQuery,
    useGetDetalleOCAgrupadaQuery,
    useCrearOCAgrupadaMutation,
    useCambiarEstadoOrdenCompraMutation,
    useCompletarOrdenCompraMutation,
    useCompletarYCrearGuiaMutation,
    useRecepcionarConsumoDirectoMutation,
    useGetCotizacionesAprobadasParaOCQuery,
} = ordenCompraApi;
