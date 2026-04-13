import type { ICotizacion } from '@/interface/cotizaciones.interface';
import type {
    IAdjuntoOTV3,
    IAsignacionTecnicoOTV3,
    ICheckAvanceOTV3,
    IChecklistItemOTV3,
    IComparativaV3Params,
    IComparativaV3Result,
    ICreatePrefacturaV3Payload,
    IGastoOTV3,
    IGuiaSalidaResumenOTV3,
    IHistorialEstadoOTV3,
    IMetricasDashboardOTV3,
    IOrdenCompraResumenOTV3,
    IOrdenDeTrabajoV3,
    IOrdenDeTrabajoV3List,
    IOrdenDeTrabajoV3Write,
    IPrefacturaOTV3,
    ISeguimientoOTV3,
    IStockItemParaGuiaRapida,
    ITareaOTV3,
    ITareaOTV3Write,
    TEstadoOTV3,
    TEstadoPrefacturaOTV3,
    TEstadoTareaOTV3,
    TTipoSeguimientoOTV3,
} from '@/interface/ordenTrabajoV3.interface';
import type { IEquipo } from '@/interface/recursos.interface';
import RtkQueryService from '@/services/RtkQueryService';

const BASE = '/api/v3';

const ordenTrabajoV3Api = RtkQueryService.injectEndpoints({
    endpoints: (builder) => ({
        // ---- ORDENES ----
        getOrdenesV3: builder.query<IOrdenDeTrabajoV3List[], { estado?: TEstadoOTV3; modalidad?: string } | void>({
            query: (params) => ({
                url: `${BASE}/ordenes/`,
                method: 'get',
                params: params || {},
            }),
            providesTags: ['OrdenTrabajoV3List'],
        }),

        getDetalleOrdenV3: builder.query<IOrdenDeTrabajoV3, number | string>({
            query: (id) => ({ url: `${BASE}/ordenes/${id}/`, method: 'get' }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajoV3', id }],
        }),

        createOrdenV3: builder.mutation<IOrdenDeTrabajoV3, IOrdenDeTrabajoV3Write>({
            query: (data) => ({ url: `${BASE}/ordenes/`, method: 'post', data }),
            invalidatesTags: ['OrdenTrabajoV3List'],
        }),

        updateOrdenV3: builder.mutation<IOrdenDeTrabajoV3, { id: number; data: Partial<IOrdenDeTrabajoV3Write> }>({
            query: ({ id, data }) => ({ url: `${BASE}/ordenes/${id}/`, method: 'patch', data }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'OrdenTrabajoV3', id },
                'OrdenTrabajoV3List',
            ],
        }),

        crearSolicitanteProspectoOTV3: builder.mutation<
            IOrdenDeTrabajoV3,
            {
                id: number | string;
                clienteId: number;
                data: { email: string; first_name: string; last_name: string; celular?: string | null };
            }
        >({
            query: ({ id, data }) => ({
                url: `${BASE}/ordenes/${id}/crear-solicitante-prospecto/`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, { id, clienteId }) => [
                { type: 'OrdenTrabajoV3', id },
                { type: 'OrdenTrabajoV3', id: String(id) },
                'OrdenTrabajoV3List',
                { type: 'ClienteUsuarios' as const, id: clienteId },
            ],
        }),

        deleteOrdenV3: builder.mutation<void, number>({
            query: (id) => ({ url: `${BASE}/ordenes/${id}/`, method: 'delete' }),
            invalidatesTags: ['OrdenTrabajoV3List'],
        }),

        cambiarEstadoV3: builder.mutation<IOrdenDeTrabajoV3, { id: number; estado: TEstadoOTV3; comentario?: string }>({
            query: ({ id, ...body }) => ({
                url: `${BASE}/ordenes/${id}/cambiar-estado/`,
                method: 'post',
                data: body,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'OrdenTrabajoV3', id },
                'OrdenTrabajoV3List',
                { type: 'HistorialOTV3', id },
            ],
        }),

        getCheckAvanceV3: builder.query<ICheckAvanceOTV3, number | string>({
            query: (id) => ({ url: `${BASE}/ordenes/${id}/check-avance/`, method: 'get' }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajoV3', id }],
        }),

        solicitarRetroalimentacionV3: builder.mutation<{ detail: string }, number>({
            query: (id) => ({
                url: `${BASE}/ordenes/${id}/solicitar-retroalimentacion/`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: 'OrdenTrabajoV3', id },
                { type: 'RetroalimentacionOTV3', id },
            ],
        }),

        getMetricasDashboardV3: builder.query<IMetricasDashboardOTV3, void>({
            query: () => ({ url: `${BASE}/ordenes/metricas-dashboard/`, method: 'get' }),
        }),

        // ---- PREFACTURAS OT V3 ----
        getPrefacturasOTV3: builder.query<
            IPrefacturaOTV3[],
            { estado?: TEstadoPrefacturaOTV3; cliente?: number } | void
        >({
            query: (params) => ({
                url: `${BASE}/prefacturas-otv3/`,
                method: 'get',
                params: params || {},
            }),
            providesTags: ['PrefacturasOTV3'],
        }),

        getPrefacturaOTV3: builder.query<IPrefacturaOTV3, number | string>({
            query: (id) => ({ url: `${BASE}/prefacturas-otv3/${id}/`, method: 'get' }),
            providesTags: (_result, _error, id) => [{ type: 'PrefacturaOTV3', id }],
        }),

        getOtsElegiblesV3: builder.query<IOrdenDeTrabajoV3[], { cliente_id: number }>({
            query: (params) => ({ url: `${BASE}/prefacturas-otv3/ots-elegibles/`, method: 'get', params }),
            providesTags: ['PrefacturasOTV3'],
        }),

        getComparativaV3: builder.mutation<IComparativaV3Result, IComparativaV3Params>({
            query: (data) => ({ url: `${BASE}/prefacturas-otv3/comparativa/`, method: 'post', data }),
        }),

        createPrefacturaOTV3: builder.mutation<IPrefacturaOTV3, ICreatePrefacturaV3Payload>({
            query: (data) => ({ url: `${BASE}/prefacturas-otv3/`, method: 'post', data }),
            invalidatesTags: (result) => {
                const tags: any[] = ['PrefacturasOTV3'];
                if (result?.ots) {
                    result.ots.forEach((otId) => tags.push({ type: 'OrdenTrabajoV3', id: otId }));
                }
                return tags;
            },
        }),

        updatePrefacturaOTV3: builder.mutation<
            IPrefacturaOTV3,
            { id: number; data: Partial<Pick<IPrefacturaOTV3, 'resultado' | 'fecha_prefactura'>> }
        >({
            query: ({ id, data }) => ({ url: `${BASE}/prefacturas-otv3/${id}/`, method: 'patch', data }),
            invalidatesTags: (_result, _error, { id }) => [
                'PrefacturasOTV3',
                { type: 'PrefacturaOTV3', id },
            ],
        }),

        finalizarPrefacturaOTV3: builder.mutation<IPrefacturaOTV3, number | string>({
            query: (id) => ({ url: `${BASE}/prefacturas-otv3/${id}/finalizar/`, method: 'post' }),
            invalidatesTags: (_result, _error, id) => [
                'PrefacturasOTV3',
                { type: 'PrefacturaOTV3', id: Number(id) },
            ],
        }),

        asociarDocumentoPrefacturaOTV3: builder.mutation<
            IPrefacturaOTV3,
            { id: number | string; documento: File; ot_id?: number }
        >({
            query: ({ id, documento }) => {
                const formData = new FormData();
                formData.append('documento', documento);
                return {
                    url: `${BASE}/prefacturas-otv3/${id}/asociar-documento/`,
                    method: 'post',
                    data: formData,
                };
            },
            invalidatesTags: (_result, _error, { id, ot_id }) => [
                'PrefacturasOTV3',
                { type: 'PrefacturaOTV3', id: Number(id) },
                ...(ot_id ? [{ type: 'OrdenTrabajoV3' as const, id: ot_id }] : []),
            ],
        }),

        // ---- TAREAS ----
        getTareasV3: builder.query<ITareaOTV3[], number | string>({
            query: (ordenId) => ({ url: `${BASE}/ordenes/${ordenId}/tareas/`, method: 'get' }),
            providesTags: (_result, _error, ordenId) => [{ type: 'TareaOTV3', id: ordenId }],
        }),

        createTareaV3: builder.mutation<ITareaOTV3, { ordenId: number; data: ITareaOTV3Write }>({
            query: ({ ordenId, data }) => ({
                url: `${BASE}/ordenes/${ordenId}/tareas/`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'TareaOTV3', id: ordenId },
                { type: 'OrdenTrabajoV3', id: ordenId },
            ],
        }),

        updateTareaV3: builder.mutation<ITareaOTV3, { ordenId: number; tareaId: number; data: Partial<ITareaOTV3Write> }>({
            query: ({ ordenId, tareaId, data }) => ({
                url: `${BASE}/ordenes/${ordenId}/tareas/${tareaId}/`,
                method: 'patch',
                data,
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'TareaOTV3', id: ordenId },
                { type: 'OrdenTrabajoV3', id: ordenId },
            ],
        }),

        deleteTareaV3: builder.mutation<void, { ordenId: number; tareaId: number }>({
            query: ({ ordenId, tareaId }) => ({
                url: `${BASE}/ordenes/${ordenId}/tareas/${tareaId}/`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'TareaOTV3', id: ordenId },
                { type: 'OrdenTrabajoV3', id: ordenId },
            ],
        }),

        cambiarEstadoTareaV3: builder.mutation<ITareaOTV3, { ordenId: number; tareaId: number; estado: TEstadoTareaOTV3; notas_ejecucion?: string }>({
            query: ({ ordenId, tareaId, estado, notas_ejecucion }) => ({
                url: `${BASE}/ordenes/${ordenId}/tareas/${tareaId}/cambiar-estado/`,
                method: 'post',
                data: { estado, ...(notas_ejecucion !== undefined && { notas_ejecucion }) },
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'TareaOTV3', id: ordenId },
                { type: 'OrdenTrabajoV3', id: ordenId },
            ],
        }),

        completarTareaConFirmaV3: builder.mutation<
            ITareaOTV3,
            {
                ordenId: number;
                tareaId: number;
                notas_ejecucion?: string;
                firma_datos?: { nombre: string; firma_base64: string };
                asignaciones_equipos?: Array<{ equipo_id: number }>;
                cantidad_asignada?: number;
            }
        >({
            query: ({ ordenId, tareaId, ...body }) => ({
                url: `${BASE}/ordenes/${ordenId}/tareas/${tareaId}/completar-con-firma/`,
                method: 'post',
                data: body,
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'TareaOTV3', id: ordenId },
                { type: 'OrdenTrabajoV3', id: ordenId },
            ],
        }),

        // ---- ASIGNACIONES ----
        getAsignacionesV3: builder.query<IAsignacionTecnicoOTV3[], number | string>({
            query: (ordenId) => ({ url: `${BASE}/ordenes/${ordenId}/asignaciones/`, method: 'get' }),
            providesTags: (_result, _error, ordenId) => [{ type: 'AsignacionOTV3', id: ordenId }],
        }),

        createAsignacionV3: builder.mutation<IAsignacionTecnicoOTV3, { ordenId: number; tecnico: number; rol: string }>({
            query: ({ ordenId, ...data }) => ({
                url: `${BASE}/ordenes/${ordenId}/asignaciones/`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'AsignacionOTV3', id: ordenId },
                { type: 'OrdenTrabajoV3', id: ordenId },
            ],
        }),

        deleteAsignacionV3: builder.mutation<void, { ordenId: number; asignacionId: number }>({
            query: ({ ordenId, asignacionId }) => ({
                url: `${BASE}/ordenes/${ordenId}/asignaciones/${asignacionId}/`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'AsignacionOTV3', id: ordenId },
                { type: 'OrdenTrabajoV3', id: ordenId },
            ],
        }),

        // ---- CHECKLIST ----
        getChecklistV3: builder.query<IChecklistItemOTV3[], { ordenId: number; tareaId: number }>({
            query: ({ ordenId, tareaId }) => ({
                url: `${BASE}/ordenes/${ordenId}/tareas/${tareaId}/checklist/`,
                method: 'get',
            }),
            providesTags: (_result, _error, { tareaId }) => [{ type: 'ChecklistOTV3', id: tareaId }],
        }),

        createChecklistItemV3: builder.mutation<
            IChecklistItemOTV3,
            { ordenId: number; tareaId: number; tipo: string; descripcion: string }
        >({
            query: ({ ordenId, tareaId, ...data }) => ({
                url: `${BASE}/ordenes/${ordenId}/tareas/${tareaId}/checklist/`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, { tareaId, ordenId }) => [
                { type: 'ChecklistOTV3', id: tareaId },
                { type: 'TareaOTV3', id: ordenId },
            ],
        }),

        toggleChecklistItemV3: builder.mutation<IChecklistItemOTV3, { ordenId: number; tareaId: number; itemId: number }>({
            query: ({ ordenId, tareaId, itemId }) => ({
                url: `${BASE}/ordenes/${ordenId}/tareas/${tareaId}/checklist/${itemId}/toggle/`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, { tareaId, ordenId }) => [
                { type: 'ChecklistOTV3', id: tareaId },
                { type: 'TareaOTV3', id: ordenId },
            ],
        }),

        deleteChecklistItemV3: builder.mutation<void, { ordenId: number; tareaId: number; itemId: number }>({
            query: ({ ordenId, tareaId, itemId }) => ({
                url: `${BASE}/ordenes/${ordenId}/tareas/${tareaId}/checklist/${itemId}/`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, { tareaId, ordenId }) => [
                { type: 'ChecklistOTV3', id: tareaId },
                { type: 'TareaOTV3', id: ordenId },
            ],
        }),

        // ---- SEGUIMIENTOS ----
        getSeguimientosV3: builder.query<ISeguimientoOTV3[], number | string>({
            query: (ordenId) => ({ url: `${BASE}/ordenes/${ordenId}/seguimientos/`, method: 'get' }),
            providesTags: (_result, _error, ordenId) => [{ type: 'SeguimientoOTV3', id: ordenId }],
        }),

        createSeguimientoV3: builder.mutation<
            ISeguimientoOTV3,
            {
                ordenId: number;
                tipo: TTipoSeguimientoOTV3;
                contenido: string;
                tarea?: number | null;
            }
        >({
            query: ({ ordenId, ...data }) => ({
                url: `${BASE}/ordenes/${ordenId}/seguimientos/`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'SeguimientoOTV3', id: ordenId },
                { type: 'OrdenTrabajoV3', id: ordenId },
            ],
        }),

        // ---- GASTOS ----
        getGastosV3: builder.query<IGastoOTV3[], number | string>({
            query: (ordenId) => ({ url: `${BASE}/ordenes/${ordenId}/gastos/`, method: 'get' }),
            providesTags: (_result, _error, ordenId) => [{ type: 'GastoOTV3', id: ordenId }],
        }),

        createGastoV3: builder.mutation<IGastoOTV3, { ordenId: number; categoria?: number | null; detalle: string; cantidad: number; monto_unitario: number; tarea?: number | null }>({
            query: ({ ordenId, ...data }) => ({
                url: `${BASE}/ordenes/${ordenId}/gastos/`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'GastoOTV3', id: ordenId },
                { type: 'OrdenTrabajoV3', id: ordenId },
            ],
        }),

        deleteGastoV3: builder.mutation<void, { ordenId: number; gastoId: number }>({
            query: ({ ordenId, gastoId }) => ({
                url: `${BASE}/ordenes/${ordenId}/gastos/${gastoId}/`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'GastoOTV3', id: ordenId },
                { type: 'OrdenTrabajoV3', id: ordenId },
            ],
        }),

        // ---- ADJUNTOS ----
        getAdjuntosV3: builder.query<IAdjuntoOTV3[], number | string>({
            query: (ordenId) => ({ url: `${BASE}/ordenes/${ordenId}/adjuntos/`, method: 'get' }),
            providesTags: (_result, _error, ordenId) => [{ type: 'AdjuntoOTV3', id: ordenId }],
        }),

        createAdjuntoV3: builder.mutation<IAdjuntoOTV3, { ordenId: number; formData: FormData }>({
            query: ({ ordenId, formData }) => ({
                url: `${BASE}/ordenes/${ordenId}/adjuntos/`,
                method: 'post',
                data: formData,
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'AdjuntoOTV3', id: ordenId },
                { type: 'OrdenTrabajoV3', id: ordenId },
            ],
        }),

        createAdjuntosBulkV3: builder.mutation<IAdjuntoOTV3[], { ordenId: number; formData: FormData }>({
            query: ({ ordenId, formData }) => ({
                url: `${BASE}/ordenes/${ordenId}/adjuntos/bulk/`,
                method: 'post',
                data: formData,
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'AdjuntoOTV3', id: ordenId },
                { type: 'OrdenTrabajoV3', id: ordenId },
            ],
        }),

        deleteAdjuntoV3: builder.mutation<void, { ordenId: number; adjuntoId: number }>({
            query: ({ ordenId, adjuntoId }) => ({
                url: `${BASE}/ordenes/${ordenId}/adjuntos/${adjuntoId}/`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'AdjuntoOTV3', id: ordenId },
                { type: 'OrdenTrabajoV3', id: ordenId },
            ],
        }),

        // ---- HISTORIAL ----
        getHistorialV3: builder.query<IHistorialEstadoOTV3[], number | string>({
            query: (ordenId) => ({ url: `${BASE}/ordenes/${ordenId}/historial/`, method: 'get' }),
            providesTags: (_result, _error, id) => [{ type: 'HistorialOTV3', id }],
        }),

        // ---- GUIAS DE SALIDA ----
        getGuiasDisponiblesV3: builder.query<IGuiaSalidaResumenOTV3[], number | string>({
            query: (ordenId) => ({ url: `${BASE}/ordenes/${ordenId}/guias-disponibles/`, method: 'get' }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajoV3', id }, 'GuiaSalida'],
        }),

        vincularGuiaV3: builder.mutation<IOrdenDeTrabajoV3, { ordenId: number; guia_id: number }>({
            query: ({ ordenId, guia_id }) => ({
                url: `${BASE}/ordenes/${ordenId}/vincular-guia/`,
                method: 'post',
                data: { guia_id },
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoV3', id: ordenId },
                'GuiaSalida',
            ],
        }),

        desvincularGuiaV3: builder.mutation<IOrdenDeTrabajoV3, { ordenId: number; guia_id: number }>({
            query: ({ ordenId, guia_id }) => ({
                url: `${BASE}/ordenes/${ordenId}/desvincular-guia/`,
                method: 'post',
                data: { guia_id },
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoV3', id: ordenId },
                'GuiaSalida',
            ],
        }),

        // ---- ORDENES DE COMPRA ----
        getOrdenesCompraDisponiblesV3: builder.query<IOrdenCompraResumenOTV3[], number | string>({
            query: (ordenId) => ({ url: `${BASE}/ordenes/${ordenId}/ordenes-compra-disponibles/`, method: 'get' }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajoV3', id }, 'OrdenCompra'],
        }),

        vincularOrdenCompraV3: builder.mutation<IOrdenDeTrabajoV3, { ordenId: number; orden_compra_id: number }>({
            query: ({ ordenId, orden_compra_id }) => ({
                url: `${BASE}/ordenes/${ordenId}/vincular-orden-compra/`,
                method: 'post',
                data: { orden_compra_id },
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoV3', id: ordenId },
                'OrdenCompra',
            ],
        }),

        desvincularOrdenCompraV3: builder.mutation<IOrdenDeTrabajoV3, { ordenId: number; orden_compra_id: number }>({
            query: ({ ordenId, orden_compra_id }) => ({
                url: `${BASE}/ordenes/${ordenId}/desvincular-orden-compra/`,
                method: 'post',
                data: { orden_compra_id },
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoV3', id: ordenId },
                'OrdenCompra',
            ],
        }),

        // ---- COTIZACIONES ----
        getCotizacionesDisponiblesV3: builder.query<ICotizacion[], number | string>({
            query: (ordenId) => ({ url: `${BASE}/ordenes/${ordenId}/cotizaciones-disponibles/`, method: 'get' }),
            providesTags: (_result, _error, id) => [{ type: 'OrdenTrabajoV3', id }, 'Cotizaciones'],
        }),

        vincularCotizacionV3: builder.mutation<IOrdenDeTrabajoV3, { ordenId: number; cotizacion_id: number }>({
            query: ({ ordenId, cotizacion_id }) => ({
                url: `${BASE}/ordenes/${ordenId}/vincular-cotizacion/`,
                method: 'post',
                data: { cotizacion_id },
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoV3', id: ordenId },
                'Cotizaciones',
            ],
        }),

        desvincularCotizacionV3: builder.mutation<IOrdenDeTrabajoV3, { ordenId: number; cotizacion_id: number }>({
            query: ({ ordenId, cotizacion_id }) => ({
                url: `${BASE}/ordenes/${ordenId}/desvincular-cotizacion/`,
                method: 'post',
                data: { cotizacion_id },
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoV3', id: ordenId },
                'Cotizaciones',
            ],
        }),

        crearTareasEntregaGuiaV3: builder.mutation<
            { tareas_creadas: number; errores: unknown[]; orden: IOrdenDeTrabajoV3 },
            { ordenId: number; asignaciones: { item_guia_id: number; usuario_receptor_id: number }[] }
        >({
            query: ({ ordenId, asignaciones }) => ({
                url: `${BASE}/ordenes/${ordenId}/crear-tareas-entrega-guia/`,
                method: 'post',
                data: asignaciones,
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoV3', id: ordenId },
            ],
        }),

        // ---- GUIA RAPIDA ----
        getEquiposParaEntregaV3: builder.query<IEquipo[], { ordenId: number; tareaId?: number }>({
            query: ({ ordenId, tareaId }) => ({
                url: `${BASE}/ordenes/${ordenId}/equipos-disponibles/${tareaId != null ? `?tarea_id=${tareaId}` : ''}`,
                method: 'get',
            }),
            providesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoV3', id: ordenId },
                'UsuariosEmpresa',
            ],
        }),
        getStockParaGuiaRapidaV3: builder.query<
            IStockItemParaGuiaRapida[],
            {
                ordenId: number;
                bodega_id: number;
                cotizacion_id?: number;
                orden_compra_id?: number;
                incluir_sin_stock?: boolean;
            }
        >({
            query: ({ ordenId, bodega_id, cotizacion_id, orden_compra_id, incluir_sin_stock }) => ({
                url: `${BASE}/ordenes/${ordenId}/stock-para-guia-rapida/`,
                method: 'get',
                params: {
                    bodega_id,
                    ...(cotizacion_id !== undefined && { cotizacion_id }),
                    ...(orden_compra_id !== undefined && { orden_compra_id }),
                    ...(incluir_sin_stock ? { incluir_sin_stock: 1 } : {}),
                },
            }),
        }),

        crearGuiaRapidaV3: builder.mutation<
            IOrdenDeTrabajoV3,
            {
                ordenId: number;
                bodega_id: number;
                motivo?: string;
                cotizacion_id?: number;
                items: { stock_item_id: number; cantidad_rebajada: number; numero_serie?: string }[];
                ingresos_externos?: {
                    item_id: number;
                    cantidad: number;
                    precio?: number;
                    es_serializado?: boolean;
                    numero_serie?: string;
                }[];
            }
        >({
            query: ({ ordenId, ...body }) => ({
                url: `${BASE}/ordenes/${ordenId}/crear-guia-rapida/`,
                method: 'post',
                data: body,
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoV3', id: ordenId },
                'GuiaSalida',
                'StockItems',
            ],
        }),

        aprobarGuiaV3: builder.mutation<
            void,
            { ordenId: number; guiaId: number; firma_recibido_por: string; firma_base64?: string; recibido_por?: number }
        >({
            query: ({ guiaId, ordenId: _ordenId, ...body }) => ({
                url: `/api/guia-salida/${guiaId}/aprobar-guia/`,
                method: 'post',
                data: body,
            }),
            invalidatesTags: (_result, _error, { ordenId }) => [
                { type: 'OrdenTrabajoV3', id: ordenId },
                'GuiaSalida',
                'StockItems',
            ],
        }),
    }),
});

export const {
    useGetOrdenesV3Query,
    useGetDetalleOrdenV3Query,
    useCreateOrdenV3Mutation,
    useUpdateOrdenV3Mutation,
    useCrearSolicitanteProspectoOTV3Mutation,
    useDeleteOrdenV3Mutation,
    useCambiarEstadoV3Mutation,
    useGetCheckAvanceV3Query,
    useGetMetricasDashboardV3Query,
    useGetPrefacturasOTV3Query,
    useGetPrefacturaOTV3Query,
    useGetOtsElegiblesV3Query,
    useGetComparativaV3Mutation,
    useCreatePrefacturaOTV3Mutation,
    useUpdatePrefacturaOTV3Mutation,
    useFinalizarPrefacturaOTV3Mutation,
    useAsociarDocumentoPrefacturaOTV3Mutation,
    useGetTareasV3Query,
    useCreateTareaV3Mutation,
    useUpdateTareaV3Mutation,
    useDeleteTareaV3Mutation,
    useCambiarEstadoTareaV3Mutation,
    useCompletarTareaConFirmaV3Mutation,
    useGetAsignacionesV3Query,
    useCreateAsignacionV3Mutation,
    useDeleteAsignacionV3Mutation,
    useGetChecklistV3Query,
    useCreateChecklistItemV3Mutation,
    useToggleChecklistItemV3Mutation,
    useDeleteChecklistItemV3Mutation,
    useGetSeguimientosV3Query,
    useCreateSeguimientoV3Mutation,
    useGetGastosV3Query,
    useCreateGastoV3Mutation,
    useDeleteGastoV3Mutation,
    useGetAdjuntosV3Query,
    useCreateAdjuntoV3Mutation,
    useCreateAdjuntosBulkV3Mutation,
    useDeleteAdjuntoV3Mutation,
    useGetHistorialV3Query,
    useGetGuiasDisponiblesV3Query,
    useVincularGuiaV3Mutation,
    useDesvincularGuiaV3Mutation,
    useGetOrdenesCompraDisponiblesV3Query,
    useVincularOrdenCompraV3Mutation,
    useDesvincularOrdenCompraV3Mutation,
    useGetStockParaGuiaRapidaV3Query,
    useGetEquiposParaEntregaV3Query,
    useCrearGuiaRapidaV3Mutation,
    useGetCotizacionesDisponiblesV3Query,
    useVincularCotizacionV3Mutation,
    useDesvincularCotizacionV3Mutation,
    useCrearTareasEntregaGuiaV3Mutation,
    useAprobarGuiaV3Mutation,
    useSolicitarRetroalimentacionV3Mutation,
} = ordenTrabajoV3Api;

export default ordenTrabajoV3Api;
