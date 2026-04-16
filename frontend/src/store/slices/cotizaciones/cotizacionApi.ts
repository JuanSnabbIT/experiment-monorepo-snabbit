import {
    ICotizacion,
    IItemCotizacion,
    ISeguimientoCotizacion,
    ISolicitanteCotizacion,
} from '@/interface/cotizaciones.interface';
import RtkQueryService from '@/services/RtkQueryService';

export const cotizacionApi = RtkQueryService.injectEndpoints({
    endpoints: (builder) => ({
        getDetalleCotizacionPorNumero: builder.query<ICotizacion, string | number>({
            query: (numero) => ({
                url: `/api/cotizaciones/por-numero/${numero}/`,
                method: 'get',
            }),
            providesTags: (_result, _error, numero) => [
                { type: 'Cotizaciones' as const, id: `NUM_${numero}` },
            ],
        }),
        getItemsEnCotizacion: builder.query<IItemCotizacion[], number | string>({
            query: (id) => ({
                url: `/api/cotizaciones/${id}/items/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'CotizacionesItems' as const, id }],
        }),
        getSolicitantesCotizacion: builder.query<ISolicitanteCotizacion[], number | string>({
            query: (id) => ({
                url: `/api/cotizaciones/${id}/solicitantes-cotizacion/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [
                { type: 'CotizacionesSolicitantes' as const, id },
            ],
        }),
        getSeguimientoCotizacion: builder.query<ISeguimientoCotizacion[], number | string>({
            query: (id) => ({
                url: `/api/cotizaciones/${id}/seguimientos/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'CotizacionesSeguimiento' as any, id }],
        }),
        getUsuariosParaSolicitante: builder.query<any[], number | string>({
            query: (id) => ({
                // Usar el endpoint anidado existente que devuelve usuarios sin relacionar
                url: `/api/cotizaciones/${id}/solicitantes-cotizacion/sin-relacionar/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [
                { type: 'CotizacionesSolicitantes' as const, id: `DISPONIBLES_${id}` },
            ],
        }),
        createSolicitanteCotizacion: builder.mutation<
            ISolicitanteCotizacion,
            { cotizacion: number; usuario_id: number | string; content_type: number }
        >({
            query: (data) => ({
                url: `/api/solicitantes-cotizacion/`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, { cotizacion }) => [
                { type: 'CotizacionesSolicitantes' as const, id: cotizacion },
                { type: 'CotizacionesSolicitantes' as const, id: `DISPONIBLES_${cotizacion}` },
            ],
        }),
        deleteSolicitanteCotizacion: builder.mutation<
            void,
            { id: number; cotizacionId: number }
        >({
            query: ({ id }) => ({
                url: `/api/solicitantes-cotizacion/${id}/`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, { cotizacionId }) => [
                { type: 'CotizacionesSolicitantes' as const, id: cotizacionId },
                { type: 'CotizacionesSolicitantes' as const, id: `DISPONIBLES_${cotizacionId}` },
            ],
        }),
        createSolicitanteExterno: builder.mutation<
            { email: string; nombre: string; id: number },
            { nombre: string; email: string }
        >({
            query: (data) => ({
                url: `/api/solicitantes-externos/`,
                method: 'post',
                data,
            }),
        }),
        crearCopiaCotizacionRechazada: builder.mutation<ICotizacion, number>({
            query: (id) => ({
                url: `/api/cotizaciones/${id}/crear-copia-rechazada/`,
                method: 'post',
            }),
            invalidatesTags: ['Cotizaciones'],
        }),
        getTipoCambio: builder.query<
            {
                fecha: string;
                fecha_dolar: string | null;
                fecha_uf: string | null;
                dolar: number;
                uf: number;
            },
            string
        >({
            query: (fecha) => ({
                url: `/api/cotizaciones/tipo-cambio/?fecha=${fecha}`,
                method: 'get',
            }),
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetDetalleCotizacionPorNumeroQuery,
    useGetItemsEnCotizacionQuery,
    useGetSolicitantesCotizacionQuery,
    useGetSeguimientoCotizacionQuery,
    useGetUsuariosParaSolicitanteQuery,
    useCreateSolicitanteCotizacionMutation,
    useDeleteSolicitanteCotizacionMutation,
    useCreateSolicitanteExternoMutation,
    useCrearCopiaCotizacionRechazadaMutation,
    useGetTipoCambioQuery,
} = cotizacionApi;
