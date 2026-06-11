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
        'Notificaciones',
        'NotificacionesNoLeidas',
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
        'Bodegas',
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
        'Rendicion',
        'RendicionItems',
        'RendicionList',
        'RendicionCategorias',
        'RendicionComprasDisponibles',
        'Compra',
        'CompraItems',
        'Empresas',
        'Empresa',
        'Sucursales',
        'Sucursal',
        'UsuariosEmpresa',
        'UsuarioEmpresa',
        'UsuarioActividades',
        'Clientes',
        'Cliente',
        'ClienteUsuarios',
        'UsuariosEmpresaYCliente',
        'Contratos',
        'Contrato',
        'ContratosDashboard',
        'ContratoServicios',
        'ContratoLicencias',
        'ContratoVisitas',
        'ContratoCondiciones',
        'ContratoUsuarios',
        'ContratoFirmas',
        'FacturasContrato',
        'FacturaContrato',
        'FacturasContratoResumen',
        'EquiposUsuario',
        'Servicios',
        'PlanesServicio',
        'CaracteristicasServicio',
        'PlantillasContrato',
        'EtiquetasPlantilla',
        'SeccionesContratoGeneradas',
        'ContratoCotizaciones',
        'ContratosActivosCliente',
        'CierreAdministrativoOT',
        'CierreAdministrativoOTList',
        // OT V3
        'OrdenTrabajoV3',
        'OrdenTrabajoV3List',
        'TareaOTV3',
        'AsignacionOTV3',
        'ChecklistOTV3',
        'SeguimientoOTV3',
        'GastoOTV3',
        'AdjuntoOTV3',
        'HistorialOTV3',
        'RetroalimentacionOTV3',
        'PrefacturasOTV3',
        'PrefacturaOTV3',
        'ContratoTrabajador',
        'ContratoTrabajadorList',
        'ContratoTrabajadorHistorial',
        'CargoCatalogo',
        'AfpCatalogo',
        'BancoCatalogo',
        'NacionalidadCatalogo',
        'AnexoContrato',
        'TurnoLaboral',
        'ConfiguracionLaboral',
        'GrupoTurno',
        // Plantillas Contrato V2 (Motor Slate)
        'PlantillaContratoV2',
        'PlantillaContratoV2List',
        'SeccionPlantillaV2',
        'BloqueTransversal',
        'EtiquetaPlantillaV2',
    ] as const,
    endpoints: () => ({}),
});

export default RtkQueryService;
