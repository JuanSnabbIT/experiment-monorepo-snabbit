import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { createApi } from '@reduxjs/toolkit/query/react';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import BaseService from './BaseService';

const axiosBaseQuery =
    (): BaseQueryFn<
        {
            url: string;
            method: AxiosRequestConfig['method'];
            data?: AxiosRequestConfig['data'];
            params?: AxiosRequestConfig['params'];
            headers?: AxiosRequestConfig['headers'];
            responseType?: AxiosRequestConfig['responseType'];
            isLoginRequest?: boolean;
        },
        unknown,
        unknown
    > =>
    async (request) => {
        try {
            // const response = BaseService(request)
            // return response
            const response = await BaseService(request);
            return { data: response.data };
        } catch (axiosError) {
            const err = axiosError as AxiosError;
            return {
                error: {
                    status: err.response?.status,
                    data: err.response?.data || err.message,
                },
            };
        }
    };

const RtkQueryService = createApi({
    reducerPath: 'rtkApi',
    baseQuery: axiosBaseQuery(),
    tagTypes: [
        'Cotizaciones',
        'CotizacionesItems',
        'CotizacionesSolicitantes',
        'CotizacionesSeguimiento',
        'OrdenCompra',
        'OrdenCompraItems',
        'OrdenCompraItemsStock',
        'OrdenCompraList',
        'MisOrdenesCompraList',
        'GuiaSalida',
        'GuiaSalidaItems',
        'StockItems',
        'OrdenTrabajo',
        'OrdenTrabajoList',
        'OrdenTrabajoAdjuntos',
        'OrdenTrabajoAdjunto',
        'OrdenTrabajoHistorial',
        'OrdenTrabajoSeguimientos',
        'OrdenTrabajoSeguimientosOT',
        'OrdenTrabajoDetallesSeguimientosOT',
        'OrdenTrabajoSoportes',
        'OrdenTrabajoServicios',
        'OrdenTrabajoInsumos',
        'OrdenTrabajoCompras',
        'OrdenTrabajoTecnicos',
        'OrdenTrabajoUsuarios',
        'OrdenTrabajoRetroalimentaciones',
        'OrdenTrabajoGastos',
        'OrdenTrabajoGuiasDisponibles',
        'OrdenTrabajoDetalleTrabajo',
    ] as const,
    endpoints: () => ({}),
});

export default RtkQueryService;
