import { ICotizacion, IItemCotizacion, ISeguimientoCotizacion, ISolicitanteCotizacion } from '@/interface/cotizaciones.interface';
import RtkQueryService from '@/services/RtkQueryService';

export const cotizacionApi = RtkQueryService.injectEndpoints({
	endpoints: (builder) => ({
		getDetalleCotizacionPorNumero: builder.query<ICotizacion, string | number>({
			query: (numero) => ({
				url: `/api/cotizaciones/por-numero/${numero}/`,
				method: 'get',
			}),
			providesTags: (_result, _error, numero) => [{ type: 'Cotizaciones' as const, id: `NUM_${numero}` }],
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
			providesTags: (_result, _error, id) => [{ type: 'CotizacionesSolicitantes' as const, id }],
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
				url: `/api/cotizaciones/${id}/usuarios-para-solicitante/`,
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
} = cotizacionApi;
