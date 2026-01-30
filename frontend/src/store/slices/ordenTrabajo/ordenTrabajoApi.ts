
import type {
    IAdjuntoDeOrden,
    ICheckCompletibilidad,
    IDetalleGastoRendicionOT,
    IDetalleOrdenDeTrabajo,
    IDetalleOrdenDeTrabajoCompra,
    IDetalleRetroalimentacionOT,
    IHistorialCambiosOrden,
    IHistorialSimple,
    IInsumo,
    IListaDetallesSeguimientosOT,
    IListaTrabajosFiltrado,
    IItemSerializado,
    IOrdenDeTrabajo,
    IRetroalimentacionOT,
    IRetroalimentacionSinPermisosOT,
    ISeguimientoItemOT,
    ISeguimientoOrden,
    IServicioEnOT,
    ISoporteTecnico,
    IUsuarioAsignadoSoporte,
    IUsuarioVinculado,
} from '@/interface/ordenTrabajo.interface';
import type {
    IBodega,
    ICompra,
    IItemEnCompra,
    IGuiaSalida,
    IItemGuiaSalida,
} from '@/interface/bodega.interface';
import type { IUsuarioEmpresa } from '@/interface/empresas.interface';
import type { IVisitaEnOT, IVisitaSoporte } from '@/interface/visitas.interface';
import RtkQueryService from '@/services/RtkQueryService';

export const ordenTrabajoApi = RtkQueryService.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        // ===== Orden de Trabajo =====
        getOrdenesTrabajo: builder.query<IOrdenDeTrabajo[], void>({
            query: () => ({
                url: '/api/ordenes-de-trabajo/',
                method: 'get',
            }),
            providesTags: ['OrdenTrabajoList'],
        }),
        getDetalleOrdenTrabajo: builder.query<IOrdenDeTrabajo, number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajo', id }],
        }),
        createOrdenTrabajo: builder.mutation<IOrdenDeTrabajo, Partial<IOrdenDeTrabajo>>({
            query: (data) => ({
                url: '/api/ordenes-de-trabajo/',
                method: 'post',
                data,
            }),
            invalidatesTags: ['OrdenTrabajoList'],
        }),
        updateOrdenTrabajo: builder.mutation<
            IOrdenDeTrabajo,
            { id: number | string; data: Partial<IOrdenDeTrabajo> }
        >({
            query: ({ id, data }) => ({
                url: `/api/ordenes-de-trabajo/${id}/`,
                method: 'patch',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'OrdenTrabajo', id },
                'OrdenTrabajoList',
            ],
        }),
        deleteOrdenTrabajo: builder.mutation<void, number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/`,
                method: 'delete',
            }),
            invalidatesTags: ['OrdenTrabajoList'],
        }),
        descargarOrdenTrabajoPdf: builder.mutation<BlobPart, number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/pdf/`,
                method: 'get',
                responseType: 'blob',
            }),
        }),

        // ===== Historial =====
        getHistorialCambios: builder.query<IHistorialCambiosOrden[], number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/historial-cambios/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajoHistorial', id }],
        }),
        createHistorialCambio: builder.mutation<
            IHistorialCambiosOrden,
            { id_orden: number | string; data: Record<string, unknown> }
        >({
            query: ({ id_orden, data }) => ({
                url: `/api/ordenes-de-trabajo/${id_orden}/historial-cambios/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { id_orden }) => [
                { type: 'OrdenTrabajoHistorial', id: id_orden },
            ],
        }),
        getHistorialSimple: builder.query<IHistorialSimple[], number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/history/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajoHistorial', id }],
        }),

        // ===== Adjuntos =====
        getAdjuntos: builder.query<IAdjuntoDeOrden[], number | string>({
            query: (ordenId) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/archivos-adjuntos/`,
                method: 'get',
            }),
            providesTags: (_result, _error, ordenId) => [
                { type: 'OrdenTrabajoAdjuntos', id: ordenId },
            ],
        }),
        getAdjuntoDetalle: builder.query<
            IAdjuntoDeOrden,
            { ordenId: number | string; adjuntoId: number | string }
        >({
            query: ({ ordenId, adjuntoId }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/archivos-adjuntos/${adjuntoId}/`,
                method: 'get',
            }),
            providesTags: (_result, _error, { adjuntoId }) => [
                { type: 'OrdenTrabajoAdjunto', id: adjuntoId },
            ],
        }),
        createAdjunto: builder.mutation<
            IAdjuntoDeOrden,
            { ordenId: number | string; data: FormData }
        >({
            query: ({ ordenId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/archivos-adjuntos/`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoAdjuntos', id: ordenId },
            ],
        }),
        createAdjuntosBulk: builder.mutation<
            IAdjuntoDeOrden[],
            { ordenId: number | string; data: { imagenes: string[]; descripcion: string } }
        >({
            query: ({ ordenId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/adjuntos/bulk/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoAdjuntos', id: ordenId },
            ],
        }),
        deleteAdjunto: builder.mutation<void, { ordenId: number | string; adjuntoId: number | string }>(
            {
                query: ({ ordenId, adjuntoId }) => ({
                    url: `/api/ordenes-de-trabajo/${ordenId}/archivos-adjuntos/${adjuntoId}/`,
                    method: 'delete',
                }),
                invalidatesTags: (_result, _error, { ordenId, adjuntoId }) => [
                    { type: 'OrdenTrabajoAdjuntos', id: ordenId },
                    { type: 'OrdenTrabajoAdjunto', id: adjuntoId },
                ],
            },
        ),
        // ===== Insumos y Guias =====
        getInsumosOrdenTrabajo: builder.query<IInsumo[], number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/insumos/?solo_con_guia=true`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajoInsumos', id }],
        }),
        getGuiasDisponibles: builder.query<IGuiaSalida[], number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/guias-disponibles/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajoGuiasDisponibles', id }],
        }),
        vincularGuiasOT: builder.mutation<
            void,
            { id: number | string; guias_ids: number[] }
        >({
            query: ({ id, guias_ids }) => ({
                url: `/api/ordenes-de-trabajo/${id}/vincular-guias/`,
                method: 'post',
                data: { guias_ids },
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'OrdenTrabajoInsumos', id },
                { type: 'OrdenTrabajo', id },
                { type: 'OrdenTrabajoGuiasDisponibles', id },
            ],
        }),

        // ===== Check completibilidad =====
        getCheckCompletibilidadOT: builder.query<ICheckCompletibilidad, number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/check-completabilidad/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajo', id }],
        }),

        // ===== Retroalimentaciones =====
        getRetroalimentacionesOT: builder.query<IRetroalimentacionOT[], number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/retroalimentaciones/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [
                { type: 'OrdenTrabajoRetroalimentaciones', id },
            ],
        }),
        getDetalleRetroalimentacionOT: builder.query<
            IDetalleRetroalimentacionOT,
            number | string
        >({
            query: (id) => ({
                url: `/api/retroalimentacion/${id}/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [
                { type: 'OrdenTrabajoRetroalimentaciones', id },
            ],
        }),
        getDetalleRetroalimentacionOTPublic: builder.query<
            IRetroalimentacionSinPermisosOT,
            string | undefined
        >({
            query: (uuid) => ({
                url: `/api/retroalimentacion/pub/${uuid}/`,
                method: 'get',
                isLoginRequest: true,
            }),
        }),
        bulkUpdateRetroalimentacionOT: builder.mutation<
            Record<string, unknown>,
            { items: { id: number; cantidad_estrellas: number; observaciones?: string }[] }
        >({
            query: (data) => ({
                url: `/api/retroalimentacion_aplicada/bulk_update/`,
                method: 'patch',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
                isLoginRequest: true,
            }),
        }),

        // ===== Usuarios vinculados / tecnicos =====
        getUsuariosVinculadosOT: builder.query<IUsuarioVinculado[], number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/usuarios-vinculados/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajoUsuarios', id }],
        }),
        getTecnicosPorEmpresa: builder.query<IUsuarioEmpresa[], number | string>({
            query: (id_empresa) => ({
                url: `/api/usuarios-empresa/empresa/${id_empresa}/tecnicos/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id_empresa) => [
                { type: 'OrdenTrabajoTecnicos', id: id_empresa },
            ],
        }),

        // ===== Detalle trabajo / visitas =====
        getDetalleTrabajo: builder.query<
            IDetalleOrdenDeTrabajo,
            { ordenId: number | string; detalleId: number | string }
        >({
            query: ({ ordenId, detalleId }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/detalles-trabajo/${detalleId}/`,
                method: 'get',
            }),
            providesTags: (_result, _error, { detalleId }) => [
                { type: 'OrdenTrabajoDetalleTrabajo', id: detalleId },
            ],
        }),
        actualizarDetalleTrabajo: builder.mutation<
            IDetalleOrdenDeTrabajo,
            { ordenId: number | string; detalleId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, detalleId, data }) => ({
                url: `/api/ordenes-trabajo/${ordenId}/detalles-trabajo/${detalleId}/`,
                method: 'patch',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { detalleId }) => [
                { type: 'OrdenTrabajoDetalleTrabajo', id: detalleId },
            ],
        }),
        eliminarDetalleTrabajo: builder.mutation<
            void,
            { ordenId: number | string; detalleId: number | string }
        >({
            query: ({ ordenId, detalleId }) => ({
                url: `/api/ordenes-trabajo/${ordenId}/detalles-trabajo/${detalleId}/`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, { detalleId, ordenId }) => [
                { type: 'OrdenTrabajoDetalleTrabajo', id: detalleId },
                { type: 'OrdenTrabajo', id: ordenId },
            ],
        }),
        iniciarDetalleTrabajo: builder.mutation<
            IDetalleOrdenDeTrabajo,
            { ordenId: number | string; detalleId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, detalleId, data }) => ({
                url: `/api/ordenes-trabajo/${ordenId}/detalles-trabajo/${detalleId}/iniciar-proceso/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { detalleId, ordenId }) => [
                { type: 'OrdenTrabajoDetalleTrabajo', id: detalleId },
                { type: 'OrdenTrabajo', id: ordenId },
            ],
        }),
        getDetalleConVisita: builder.query<
            IVisitaEnOT,
            { ordenId: number | string; detalleId: number | string | null | undefined }
        >({
            query: ({ ordenId, detalleId }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/detalles-trabajo/${detalleId}/detalles-con-visitas/`,
                method: 'get',
            }),
        }),
        asignarInsumoDetalle: builder.mutation<
            IDetalleOrdenDeTrabajo,
            { ordenId: number | string; detalleId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, detalleId, data }) => ({
                url: `/api/ordenes-trabajo/${ordenId}/detalles-trabajo/${detalleId}/asignar-insumo/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { detalleId, ordenId }) => [
                { type: 'OrdenTrabajoDetalleTrabajo', id: detalleId },
                { type: 'OrdenTrabajoInsumos', id: ordenId },
            ],
        }),
        getDetallesSinInsumo: builder.query<IDetalleOrdenDeTrabajo[], number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/detalles-trabajo/detalles-sin-insumo/`,
                method: 'get',
            }),
        }),
        getTrabajosDisponibles: builder.query<IListaTrabajosFiltrado, number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/soportes-tecnicos/trabajos-disponibles/`,
                method: 'get',
            }),
        }),
        asociarTrabajoDetalle: builder.mutation<
            IDetalleOrdenDeTrabajo,
            { ordenId: number | string; detalleId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, detalleId, data }) => ({
                url: `/api/ordenes-trabajo/${ordenId}/detalles-trabajo/${detalleId}/asociar-trabajo/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { detalleId }) => [
                { type: 'OrdenTrabajoDetalleTrabajo', id: detalleId },
            ],
        }),
        getDetallesSeguimientosOT: builder.query<IListaDetallesSeguimientosOT, number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/detalles-seguimientos-visitas/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [
                { type: 'OrdenTrabajoDetallesSeguimientosOT', id },
            ],
        }),

        // ===== Seguimientos =====
        getSeguimientosDetalle: builder.query<
            ISeguimientoOrden[],
            { ordenId: number | string; detalleId: number | string }
        >({
            query: ({ ordenId, detalleId }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/detalles-trabajo/${detalleId}/seguimientos/`,
                method: 'get',
            }),
            providesTags: (_result, _error, { detalleId }) => [
                { type: 'OrdenTrabajoSeguimientos', id: detalleId },
            ],
        }),
        crearSeguimientoDetalle: builder.mutation<
            ISeguimientoOrden,
            {
                ordenId: number | string;
                detalleId: number | string;
                data: Record<string, unknown>;
            }
        >({
            query: ({ ordenId, detalleId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/detalles-trabajo/${detalleId}/seguimientos/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { detalleId }) => [
                { type: 'OrdenTrabajoSeguimientos', id: detalleId },
            ],
        }),
        crearCompraDetalleTrabajo: builder.mutation<
            Record<string, unknown>,
            { ordenId: number | string; detalleId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, detalleId, data }) => ({
                url: `/api/ordenes-trabajo/${ordenId}/detalles-trabajo/${detalleId}/crear-compra/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { detalleId, ordenId }) => [
                { type: 'OrdenTrabajoDetalleTrabajo', id: detalleId },
                { type: 'OrdenTrabajoCompras', id: ordenId },
            ],
        }),
        completarCompraDetalleTrabajo: builder.mutation<
            Record<string, unknown>,
            { ordenId: number | string; detalleId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, detalleId, data }) => ({
                url: `/api/ordenes-trabajo/${ordenId}/detalles-trabajo/${detalleId}/completar-compra/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { detalleId, ordenId }) => [
                { type: 'OrdenTrabajoDetalleTrabajo', id: detalleId },
                { type: 'OrdenTrabajoCompras', id: ordenId },
                { type: 'OrdenTrabajo', id: ordenId },
            ],
        }),
        crearVisitaSoporte: builder.mutation<
            IVisitaSoporte,
            { data: Record<string, unknown> }
        >({
            query: ({ data }) => ({
                url: `/api/visitas-soporte/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
        }),
        getSeguimientosOT: builder.query<
            ISeguimientoItemOT[],
            {
                ordenId: number | string;
                tipo?: string | null;
                origen?: 'servicio' | 'soporte';
                limit?: number;
                offset?: number;
            }
        >({
            query: ({ ordenId, tipo, origen, limit, offset }) => {
                const params = new URLSearchParams();
                if (tipo) params.set('tipo', tipo);
                if (origen) params.set('origen', origen);
                if (limit) params.set('limit', String(limit));
                if (offset) params.set('offset', String(offset));
                const qs = params.toString();
                return {
                    url: qs
                        ? `/api/ordenes-de-trabajo/${ordenId}/seguimientos/?${qs}`
                        : `/api/ordenes-de-trabajo/${ordenId}/seguimientos/`,
                    method: 'get',
                };
            },
            providesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoSeguimientosOT', id: ordenId },
            ],
        }),
        crearSeguimientoOT: builder.mutation<
            ISeguimientoItemOT,
            { ordenId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/seguimientos/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoSeguimientosOT', id: ordenId },
            ],
        }),
        // ===== Servicios Generales =====
        getServiciosGenerales: builder.query<IServicioEnOT[], number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/servicios-generales/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajoServicios', id }],
        }),
        crearServicioGeneral: builder.mutation<
            IServicioEnOT,
            { ordenId: number | string; data: Partial<IServicioEnOT> }
        >({
            query: ({ ordenId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/servicios-generales/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoServicios', id: ordenId },
            ],
        }),
        actualizarServicioGeneral: builder.mutation<
            IServicioEnOT,
            { ordenId: number | string; servicioId: number | string; data: Partial<IServicioEnOT> }
        >({
            query: ({ ordenId, servicioId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/servicios-generales/${servicioId}/`,
                method: 'patch',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { ordenId, servicioId }) => [
                { type: 'OrdenTrabajoServicios', id: ordenId },
                { type: 'OrdenTrabajoDetalleTrabajo', id: servicioId },
            ],
        }),
        eliminarServicioGeneral: builder.mutation<void, { ordenId: number | string; servicioId: number | string }>(
            {
                query: ({ ordenId, servicioId }) => ({
                    url: `/api/ordenes-de-trabajo/${ordenId}/servicios-generales/${servicioId}/`,
                    method: 'delete',
                }),
                invalidatesTags: (_result, _error, { ordenId }) => [
                    { type: 'OrdenTrabajoServicios', id: ordenId },
                ],
            },
        ),
        cambiarEstadoServicioGeneral: builder.mutation<
            IServicioEnOT,
            { ordenId: number | string; servicioId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, servicioId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/servicios-generales/${servicioId}/cambiar-estado/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { ordenId, servicioId }) => [
                { type: 'OrdenTrabajoServicios', id: ordenId },
                { type: 'OrdenTrabajoDetalleTrabajo', id: servicioId },
            ],
        }),
        completarTrabajoServicio: builder.mutation<
            IServicioEnOT,
            { ordenId: number | string; servicioId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, servicioId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/servicios-generales/${servicioId}/completar-trabajo/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoServicios', id: ordenId },
            ],
        }),
        crearSeguimientoServicio: builder.mutation<
            ISeguimientoOrden,
            {
                ordenId: number | string;
                servicioId: number | string;
                data: Record<string, unknown>;
            }
        >({
            query: ({ ordenId, servicioId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/servicios-generales/${servicioId}/seguimientos/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { servicioId }) => [
                { type: 'OrdenTrabajoSeguimientos', id: servicioId },
            ],
        }),
        getSeguimientosServicio: builder.query<
            ISeguimientoOrden[],
            { ordenId: number | string; servicioId: number | string }
        >({
            query: ({ ordenId, servicioId }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/servicios-generales/${servicioId}/seguimientos/`,
                method: 'get',
            }),
            providesTags: (_result, _error, { servicioId }) => [
                { type: 'OrdenTrabajoSeguimientos', id: servicioId },
            ],
        }),
        asociarGuiaServicio: builder.mutation<
            void,
            { ordenId: number | string; servicioId: number | string; guiaId: number | string }
        >({
            query: ({ ordenId, servicioId, guiaId }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/servicios-generales/${servicioId}/asociar-guia/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ guia_salida: guiaId }),
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoServicios', id: ordenId },
                { type: 'OrdenTrabajoInsumos', id: ordenId },
            ],
        }),
        desasociarGuiaServicio: builder.mutation<
            void,
            { ordenId: number | string; servicioId: number | string }
        >({
            query: ({ ordenId, servicioId }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/servicios-generales/${servicioId}/desasociar-guia/`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoServicios', id: ordenId },
                { type: 'OrdenTrabajoInsumos', id: ordenId },
            ],
        }),
        // ===== Soportes Tecnicos =====
        getSoportesTecnicos: builder.query<ISoporteTecnico[], number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/soportes-tecnicos/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajoSoportes', id }],
        }),
        crearSoporteTecnico: builder.mutation<
            ISoporteTecnico,
            { ordenId: number | string; data: Partial<ISoporteTecnico> }
        >({
            query: ({ ordenId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoSoportes', id: ordenId },
            ],
        }),
        actualizarSoporteTecnico: builder.mutation<
            ISoporteTecnico,
            { ordenId: number | string; soporteId: number | string; data: Partial<ISoporteTecnico> }
        >({
            query: ({ ordenId, soporteId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/${soporteId}/`,
                method: 'patch',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { ordenId, soporteId }) => [
                { type: 'OrdenTrabajoSoportes', id: ordenId },
                { type: 'OrdenTrabajoDetalleTrabajo', id: soporteId },
            ],
        }),
        eliminarSoporteTecnico: builder.mutation<void, { ordenId: number | string; soporteId: number | string }>(
            {
                query: ({ ordenId, soporteId }) => ({
                    url: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/${soporteId}/`,
                    method: 'delete',
                }),
                invalidatesTags: (_result, _error, { ordenId }) => [
                    { type: 'OrdenTrabajoSoportes', id: ordenId },
                ],
            },
        ),
        cambiarEstadoSoporteTecnico: builder.mutation<
            ISoporteTecnico,
            { ordenId: number | string; soporteId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, soporteId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/${soporteId}/cambiar-estado/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { ordenId, soporteId }) => [
                { type: 'OrdenTrabajoSoportes', id: ordenId },
                { type: 'OrdenTrabajoDetalleTrabajo', id: soporteId },
            ],
        }),
        finalizarTrabajoSoporte: builder.mutation<
            ISoporteTecnico,
            { ordenId: number | string; soporteId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, soporteId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/${soporteId}/finalizar-trabajo/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoSoportes', id: ordenId },
            ],
        }),
        crearSeguimientoSoporte: builder.mutation<
            ISeguimientoOrden,
            { ordenId: number | string; soporteId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, soporteId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/${soporteId}/seguimientos/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { soporteId }) => [
                { type: 'OrdenTrabajoSeguimientos', id: soporteId },
            ],
        }),
        getSeguimientosSoporte: builder.query<
            ISeguimientoOrden[],
            { ordenId: number | string; soporteId: number | string }
        >({
            query: ({ ordenId, soporteId }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/${soporteId}/seguimientos/`,
                method: 'get',
            }),
            providesTags: (_result, _error, { soporteId }) => [
                { type: 'OrdenTrabajoSeguimientos', id: soporteId },
            ],
        }),
        desasociarGuiaSoporte: builder.mutation<
            void,
            { ordenId: number | string; soporteId: number | string }
        >({
            query: ({ ordenId, soporteId }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/${soporteId}/desasociar-guia/`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoSoportes', id: ordenId },
                { type: 'OrdenTrabajoInsumos', id: ordenId },
            ],
        }),
        // ===== Usuarios asignados a soporte =====
        getUsuariosAsignadosSoporte: builder.query<
            IUsuarioAsignadoSoporte[],
            { ordenId: number | string; soporteId: number | string }
        >({
            query: ({ ordenId, soporteId }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/${soporteId}/usuarios-asignados/`,
                method: 'get',
            }),
            providesTags: (_result, _error, { soporteId }) => [
                { type: 'OrdenTrabajoUsuarios', id: soporteId },
            ],
        }),
        crearUsuarioAsignadoSoporte: builder.mutation<
            IUsuarioAsignadoSoporte,
            { ordenId: number | string; soporteId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, soporteId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/${soporteId}/usuarios-asignados/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { soporteId }) => [
                { type: 'OrdenTrabajoUsuarios', id: soporteId },
            ],
        }),
        eliminarUsuarioAsignadoSoporte: builder.mutation<
            void,
            { ordenId: number | string; soporteId: number | string; usuarioId: number | string }
        >({
            query: ({ ordenId, soporteId, usuarioId }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/${soporteId}/usuarios-asignados/${usuarioId}/`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, { soporteId }) => [
                { type: 'OrdenTrabajoUsuarios', id: soporteId },
            ],
        }),
        actualizarUsuarioAsignadoSoporte: builder.mutation<
            IUsuarioAsignadoSoporte,
            { ordenId: number | string; soporteId: number | string; usuarioId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, soporteId, usuarioId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/${soporteId}/usuarios-asignados/${usuarioId}/`,
                method: 'patch',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { soporteId }) => [
                { type: 'OrdenTrabajoUsuarios', id: soporteId },
            ],
        }),
        firmarAsignacionUsuario: builder.mutation<
            IUsuarioAsignadoSoporte,
            { ordenId: number | string; soporteId: number | string; usuarioAsignadoId: number | string }
        >({
            query: ({ ordenId, soporteId, usuarioAsignadoId }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/${soporteId}/usuarios-asignados/${usuarioAsignadoId}/firmar-asignacion/`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, { soporteId }) => [
                { type: 'OrdenTrabajoUsuarios', id: soporteId },
            ],
        }),
        getUsuariosAsignadosPendientes: builder.query<
            { usuario_empresa_ids: number[] },
            { ordenId: number | string; soporteId: number | string }
        >({
            query: ({ ordenId, soporteId }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/usuarios-asignados-pendientes/?soporte_id=${soporteId}`,
                method: 'get',
            }),
        }),
        getItemsSerializados: builder.query<IItemSerializado[], number | string>({
            query: (ordenId) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/items-serializados/`,
                method: 'get',
            }),
        }),
        getRendicionDetalle: builder.query<
            { estado?: string; estado_label?: string },
            number | string
        >({
            query: (id) => ({
                url: `/api/rendiciones/${id}/`,
                method: 'get',
            }),
        }),

        // ===== Gastos operativos =====
        getGastosOperativosOT: builder.query<IDetalleGastoRendicionOT[], number | string>({
            query: (id) => ({
                url: `/api/ordenes-de-trabajo/${id}/gastos-operativos/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajoGastos', id }],
        }),
        crearGastoOperativoOT: builder.mutation<
            IDetalleGastoRendicionOT,
            { ordenId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/gastos-operativos/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoGastos', id: ordenId },
            ],
        }),
        deleteGastoOperativoOT: builder.mutation<
            void,
            { ordenId: number | string; gastoId: number | string }
        >({
            query: ({ ordenId, gastoId }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/gastos-operativos/${gastoId}/`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoGastos', id: ordenId },
            ],
        }),
        getGastosOperativosDisponibles: builder.query<IDetalleGastoRendicionOT[], void>({
            query: () => ({
                url: `/api/rendiciones/detalles-ot-libres/`,
                method: 'get',
            }),
        }),

        // ===== Compras en OT =====
        getComprasEnOT: builder.query<ICompra[], number | string>({
            query: (id) => ({
                url: `/api/compras/?orden_trabajo=${id}`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajoCompras', id }],
        }),
        getCompras: builder.query<ICompra[], void>({
            query: () => ({
                url: `/api/compras/`,
                method: 'get',
            }),
        }),
        vincularCompraOT: builder.mutation<
            ICompra,
            { compraId: number | string; ordenId: number | string }
        >({
            query: ({ compraId, ordenId }) => ({
                url: `/api/compras/${compraId}/`,
                method: 'patch',
                data: { orden_trabajo: ordenId },
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoCompras', id: ordenId },
            ],
        }),
        getItemsCompra: builder.query<IItemEnCompra[], number | string>({
            query: (compraId) => ({
                url: `/api/compras/${compraId}/items/`,
                method: 'get',
            }),
        }),
        getItemsCompraDetalle: builder.query<IItemEnCompra[], number | string>({
            query: (compraId) => ({
                url: `/api/compras/${compraId}/items-compras/`,
                method: 'get',
            }),
        }),
        getDetalleCompra: builder.query<ICompra, number | string>({
            query: (compraId) => ({
                url: `/api/compras/${compraId}/`,
                method: 'get',
            }),
        }),
        actualizarItemCompra: builder.mutation<
            IItemEnCompra,
            { compraId: number | string; itemId: number | string; data: Record<string, unknown> }
        >({
            query: ({ compraId, itemId, data }) => ({
                url: `/api/compras/${compraId}/items-compras/${itemId}/`,
                method: 'patch',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
        }),
        eliminarItemCompra: builder.mutation<
            void,
            { compraId: number | string; itemId: number | string }
        >({
            query: ({ compraId, itemId }) => ({
                url: `/api/compras/${compraId}/items-compras/${itemId}/`,
                method: 'delete',
            }),
        }),
        crearItemCompra: builder.mutation<
            IItemEnCompra,
            { compraId: number | string; data: Record<string, unknown> }
        >({
            query: ({ compraId, data }) => ({
                url: `/api/compras/${compraId}/items-compras/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
        }),
        crearItemEmpresaCompra: builder.mutation<
            IItemEnCompra,
            { compraId: number | string; data: Record<string, unknown> }
        >({
            query: ({ compraId, data }) => ({
                url: `/api/compras/${compraId}/items-compras/crear-item-empresa/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
        }),
        completarConCompras: builder.mutation<
            IOrdenDeTrabajo,
            { ordenId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/completar-con-compras/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajo', id: ordenId },
                { type: 'OrdenTrabajoCompras', id: ordenId },
            ],
        }),
        getCompraItemsCompra: builder.query<IItemEnCompra[], number | string>({
            query: (compraId) => ({
                url: `/api/compras/${compraId}/items-compras/`,
                method: 'get',
            }),
        }),
        getBodegas: builder.query<IBodega[], void>({
            query: () => ({
                url: `/api/bodegas/`,
                method: 'get',
            }),
        }),

        // ===== Guias de salida =====
        getDetalleGuiaSalida: builder.query<IGuiaSalida, number | string>({
            query: (id) => ({
                url: `/api/guia-salida/${id}/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'GuiaSalida', id }],
        }),
        getItemsGuiaSalida: builder.query<IItemGuiaSalida[], number | string>({
            query: (id) => ({
                url: `/api/guia-salida/${id}/items/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'GuiaSalidaItems', id }],
        }),
        comprobarGuiaSalida: builder.mutation<IGuiaSalida, number | string>({
            query: (id) => ({
                url: `/api/guia-salida/${id}/comprobar-guia/`,
                method: 'post',
            }),
            invalidatesTags: (result) => {
                const ordenId = result?.orden_trabajo ?? null;
                const tags: { type: string; id: number | string }[] = [];
                if (ordenId) {
                    tags.push({ type: 'OrdenTrabajoInsumos', id: ordenId });
                    tags.push({ type: 'OrdenTrabajo', id: ordenId });
                }
                if (result?.id) {
                    tags.push({ type: 'GuiaSalida', id: result.id });
                    tags.push({ type: 'GuiaSalidaItems', id: result.id });
                }
                return tags as any;
            
            },
        }),
        aprobarGuiaSalida: builder.mutation<
            IGuiaSalida,
            { id: number | string; data: Record<string, unknown> }
        >({
            query: ({ id, data }) => ({
                url: `/api/guia-salida/${id}/aprobar-guia/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (result) => {
                const ordenId = result?.orden_trabajo ?? null;
                const tags: { type: string; id: number | string }[] = [];
                if (ordenId) {
                    tags.push({ type: 'OrdenTrabajo', id: ordenId });
                    tags.push({ type: 'OrdenTrabajoInsumos', id: ordenId });
                }
                if (result?.id) {
                    tags.push({ type: 'GuiaSalida', id: result.id });
                    tags.push({ type: 'GuiaSalidaItems', id: result.id });
                }
                return tags as any;
            
            },
        }),
        confirmarRecepcionGuia: builder.mutation<
            IGuiaSalida,
            { id: number | string; data: Record<string, unknown> }
        >({
            query: ({ id, data }) => ({
                url: `/api/guia-salida/${id}/confirmar-recepcion/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (result) => {
                const ordenId = result?.orden_trabajo ?? null;
                const tags: { type: string; id: number | string }[] = [];
                if (ordenId) {
                    tags.push({ type: 'OrdenTrabajo', id: ordenId });
                    tags.push({ type: 'OrdenTrabajoInsumos', id: ordenId });
                }
                if (result?.id) {
                    tags.push({ type: 'GuiaSalida', id: result.id });
                    tags.push({ type: 'GuiaSalidaItems', id: result.id });
                }
                return tags as any;
            
            },
        }),
        devolverABodegaGuia: builder.mutation<
            IGuiaSalida,
            { id: number | string; data?: Record<string, unknown> }
        >({
            query: ({ id, data }) => ({
                url: `/api/guia-salida/${id}/devolver_a_bodega/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: data ? JSON.stringify(data) : undefined,
            }),
            invalidatesTags: (result) => {
                const ordenId = result?.orden_trabajo ?? null;
                const tags: { type: string; id: number | string }[] = [];
                if (ordenId) {
                    tags.push({ type: 'OrdenTrabajo', id: ordenId });
                    tags.push({ type: 'OrdenTrabajoInsumos', id: ordenId });
                }
                if (result?.id) {
                    tags.push({ type: 'GuiaSalida', id: result.id });
                    tags.push({ type: 'GuiaSalidaItems', id: result.id });
                }
                return tags as any;
            
            },
        }),
        updateGuiaSalida: builder.mutation<
            IGuiaSalida,
            {
                id: number | string;
                motivo?: string;
                recibido_por?: number;
                estado?: string;
                entregado_a?: string | number;
                firma_entrega?: string;
            }
        >({
            query: ({ id, ...body }) => ({
                url: `/api/guia-salida/${id}/`,
                method: 'patch',
                headers: { 'Content-Type': 'application/json' },
                data: body,
            }),
            invalidatesTags: (result) => {
                const ordenId = result?.orden_trabajo ?? null;
                const tags: { type: string; id: number | string }[] = [];
                if (ordenId) {
                    tags.push({ type: 'OrdenTrabajo', id: ordenId });
                    tags.push({ type: 'OrdenTrabajoInsumos', id: ordenId });
                }
                if (result?.id) {
                    tags.push({ type: 'GuiaSalida', id: result.id });
                    tags.push({ type: 'GuiaSalidaItems', id: result.id });
                }
                return tags as any;
            
            },
        }),

        // ===== Cotizaciones vinculadas =====
        getCotizacionesElegibles: builder.query<
            Array<Record<string, unknown>>,
            number | string
        >({
            query: (ordenId) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/cotizaciones-elegibles/`,
                method: 'get',
            }),
        }),
        vincularCotizacionesGenerarGuias: builder.mutation<
            void,
            { ordenId: number | string; data: Record<string, unknown> }
        >({
            query: ({ ordenId, data }) => ({
                url: `/api/ordenes-de-trabajo/${ordenId}/vincular-cotizaciones-generar-guias/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoInsumos', id: ordenId },
                { type: 'OrdenTrabajo', id: ordenId },
            ],
        }),

        // ===== Compras / devoluciones =====
        devolverCompraABodega: builder.mutation<
            void,
            { compraId: number | string; data: Record<string, unknown>; ordenId?: number | string }
        >({
            query: ({ compraId, data }) => ({
                url: `/api/compras/${compraId}/devolver-a-bodega/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { ordenId }) =>
                ordenId
                    ? [
                          { type: 'OrdenTrabajoCompras', id: ordenId },
                          { type: 'OrdenTrabajo', id: ordenId },
                      ]
                    : [],
        }),
        crearVoucherDevolucion: builder.mutation<
            Record<string, unknown>,
            { ordenId: number | string }
        >({
            query: ({ ordenId }) => ({
                url: `/api/vouchers-devolucion/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: { orden_trabajo: ordenId },
            }),
        }),
    }),
});

export const {
    useGetOrdenesTrabajoQuery,
    useGetDetalleOrdenTrabajoQuery,
    useCreateOrdenTrabajoMutation,
    useUpdateOrdenTrabajoMutation,
    useDeleteOrdenTrabajoMutation,
    useDescargarOrdenTrabajoPdfMutation,
    useGetHistorialCambiosQuery,
    useCreateHistorialCambioMutation,
    useGetHistorialSimpleQuery,
    useGetAdjuntosQuery,
    useGetAdjuntoDetalleQuery,
    useCreateAdjuntoMutation,
    useCreateAdjuntosBulkMutation,
    useDeleteAdjuntoMutation,
    useGetInsumosOrdenTrabajoQuery,
    useGetGuiasDisponiblesQuery,
    useVincularGuiasOTMutation,
    useGetCheckCompletibilidadOTQuery,
    useGetRetroalimentacionesOTQuery,
    useGetDetalleRetroalimentacionOTQuery,
    useGetDetalleRetroalimentacionOTPublicQuery,
    useBulkUpdateRetroalimentacionOTMutation,
    useGetUsuariosVinculadosOTQuery,
    useGetTecnicosPorEmpresaQuery,
    useGetDetalleTrabajoQuery,
    useActualizarDetalleTrabajoMutation,
    useIniciarDetalleTrabajoMutation,
    useEliminarDetalleTrabajoMutation,
    useAsignarInsumoDetalleMutation,
    useGetDetalleConVisitaQuery,
    useGetDetallesSinInsumoQuery,
    useGetTrabajosDisponiblesQuery,
    useAsociarTrabajoDetalleMutation,
    useGetDetallesSeguimientosOTQuery,
    useGetSeguimientosDetalleQuery,
    useCrearSeguimientoDetalleMutation,
    useCrearCompraDetalleTrabajoMutation,
    useCompletarCompraDetalleTrabajoMutation,
    useCrearVisitaSoporteMutation,
    useGetSeguimientosOTQuery,
    useCrearSeguimientoOTMutation,
    useGetServiciosGeneralesQuery,
    useCrearServicioGeneralMutation,
    useActualizarServicioGeneralMutation,
    useEliminarServicioGeneralMutation,
    useCambiarEstadoServicioGeneralMutation,
    useCompletarTrabajoServicioMutation,
    useCrearSeguimientoServicioMutation,
    useGetSeguimientosServicioQuery,
    useAsociarGuiaServicioMutation,
    useDesasociarGuiaServicioMutation,
    useGetSoportesTecnicosQuery,
    useCrearSoporteTecnicoMutation,
    useActualizarSoporteTecnicoMutation,
    useEliminarSoporteTecnicoMutation,
    useCambiarEstadoSoporteTecnicoMutation,
    useFinalizarTrabajoSoporteMutation,
    useCrearSeguimientoSoporteMutation,
    useGetSeguimientosSoporteQuery,
    useDesasociarGuiaSoporteMutation,
    useGetUsuariosAsignadosSoporteQuery,
    useCrearUsuarioAsignadoSoporteMutation,
    useEliminarUsuarioAsignadoSoporteMutation,
    useActualizarUsuarioAsignadoSoporteMutation,
    useFirmarAsignacionUsuarioMutation,
    useGetUsuariosAsignadosPendientesQuery,
    useGetItemsSerializadosQuery,
    useGetRendicionDetalleQuery,
    useGetGastosOperativosOTQuery,
    useCrearGastoOperativoOTMutation,
    useDeleteGastoOperativoOTMutation,
    useGetGastosOperativosDisponiblesQuery,
    useGetComprasEnOTQuery,
    useGetComprasQuery,
    useGetItemsCompraQuery,
    useLazyGetItemsCompraQuery,
    useGetItemsCompraDetalleQuery,
    useLazyGetItemsCompraDetalleQuery,
    useGetDetalleCompraQuery,
    useActualizarItemCompraMutation,
    useEliminarItemCompraMutation,
    useCrearItemCompraMutation,
    useCrearItemEmpresaCompraMutation,
    useVincularCompraOTMutation,
    useCompletarConComprasMutation,
    useGetCompraItemsCompraQuery,
    useGetBodegasQuery,
    useGetDetalleGuiaSalidaQuery,
    useGetItemsGuiaSalidaQuery,
    useComprobarGuiaSalidaMutation,
    useAprobarGuiaSalidaMutation,
    useConfirmarRecepcionGuiaMutation,
    useDevolverABodegaGuiaMutation,
    useUpdateGuiaSalidaMutation,
    useGetCotizacionesElegiblesQuery,
    useVincularCotizacionesGenerarGuiasMutation,
    useDevolverCompraABodegaMutation,
    useCrearVoucherDevolucionMutation,
} = ordenTrabajoApi;
