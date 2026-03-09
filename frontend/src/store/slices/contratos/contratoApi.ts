import {
    ICondicionEspecial,
    IContratoCondicionEspecial,
    IContratoEmpresaCliente,
    IContratoLicencia,
    IContratoServicio,
    IContratoVinculadoPorUsuario,
    IContratoVisita,
    IFacturaContrato,
    IFacturaContratoResumen,
    ILicencia,
    ILicenciaVinculadaPorUsuario,
    IPlanServicio,
    IServicio,
    IUsuarioVinculadoLicencia,
    IVinculoContrato,
    IVisita
} from '@/interface/contrato.interface';
import { IUsuarioEmpresa } from '@/interface/empresas.interface';
import { IUsuarioEquipo } from '@/interface/recursos.interface';
import RtkQueryService from '@/services/RtkQueryService';

// ── Tipos auxiliares ──

export interface IHistorialLicencia {
    id: number;
    fecha: string;
    tipo: string;
    usuario: string | null;
    cambios: string;
    estado: string | null;
    cantidad: number | null;
}

// ── Tipos de respuesta para el dashboard ──

export interface IContratoMetricasDashboard {
    resumen: {
        total_contratos: number;
        contratos_activos: number;
        contratos_vencidos: number;
        firmas_pendientes: number;
        licencias_por_vencer: number;
    };
    por_estado: {
        borrador: number;
        activo: number;
        suspendido: number;
        finalizado: number;
    };
    contratos_por_vencer: {
        id: number;
        nombre: string;
        cliente: string;
        fecha_fin: string | null;
        dias_restantes: number | null;
    }[];
    licencias_por_vencer: {
        id: number;
        nombre: string;
        contrato: string;
        fecha_vencimiento: string | null;
        dias_restantes: number | null;
    }[];
    top_clientes: {
        id: number;
        nombre: string;
        total: number;
    }[];
}

// ── API RTK Query para Contratos ──

const contratoApi = RtkQueryService.injectEndpoints({
    endpoints: (builder) => ({
        // ─── Contratos CRUD ───
        getContratos: builder.query<IContratoEmpresaCliente[], void>({
            query: () => ({ url: '/api/contratos/', method: 'get' }),
            providesTags: ['Contratos'],
        }),

        getContratosPorEmpresaCliente: builder.query<
            IContratoEmpresaCliente[],
            { empresaId: number | string; clienteId: number | string }
        >({
            query: ({ empresaId, clienteId }) => ({
                url: `/api/contratos/filtrar-por-empresa-cliente/${empresaId}/${clienteId}/`,
                method: 'get',
            }),
            providesTags: ['Contratos'],
        }),

        getDetalleContrato: builder.query<IContratoEmpresaCliente, number | string>({
            query: (id) => ({ url: `/api/contratos/${id}/`, method: 'get' }),
            providesTags: (_result, _error, id) => [{ type: 'Contrato', id: Number(id) }],
        }),

        createContrato: builder.mutation<
            IContratoEmpresaCliente,
            Partial<IContratoEmpresaCliente>
        >({
            query: (data) => ({ url: '/api/contratos/', method: 'post', data }),
            invalidatesTags: ['Contratos'],
        }),

        updateContrato: builder.mutation<
            IContratoEmpresaCliente,
            { id: number | string; data: Record<string, unknown> }
        >({
            query: ({ id, data }) => ({
                url: `/api/contratos/${id}/actualizar/`,
                method: 'put',
                data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Contrato', id: Number(id) },
                'Contratos',
                'ContratoServicios',
                'ContratoLicencias',
                'ContratoVisitas',
                'ContratoCondiciones',
                'ContratoUsuarios',
            ],
        }),

        // ─── Transiciones de estado ───
        cambiarEstadoContrato: builder.mutation<
            IContratoEmpresaCliente,
            { id: number | string; estado: string }
        >({
            query: ({ id, estado }) => ({
                url: `/api/contratos/${id}/cambiar-estado/`,
                method: 'post',
                data: { estado },
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Contrato', id: Number(id) },
                'Contratos',
                'ContratosDashboard',
            ],
        }),

        // ─── Renovar contrato ───
        renovarContrato: builder.mutation<
            IContratoEmpresaCliente,
            { id: number | string; nombre?: string; fecha_inicio?: string; fecha_fin?: string }
        >({
            query: ({ id, ...data }) => ({
                url: `/api/contratos/${id}/renovar/`,
                method: 'post',
                data,
            }),
            invalidatesTags: ['Contratos', 'ContratosDashboard'],
        }),

        // ─── Dashboard / Métricas ───
        getMetricasDashboard: builder.query<IContratoMetricasDashboard, void>({
            query: () => ({ url: '/api/contratos/metricas-dashboard/', method: 'get' }),
            providesTags: ['ContratosDashboard'],
        }),

        // ─── Servicios genéricos del contrato ───
        editarServiciosGenericos: builder.mutation<
            IContratoEmpresaCliente,
            { id: number | string; servicios_genericos: Record<string, unknown>[] }
        >({
            query: ({ id, servicios_genericos }) => ({
                url: `/api/contratos/${id}/editar-servicios-genericos/`,
                method: 'put',
                data: { servicios_genericos },
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Contrato', id: Number(id) },
                'ContratoServicios',
            ],
        }),

        // ─── Catálogos ───
        getServicios: builder.query<IServicio[], void>({
            query: () => ({ url: '/api/servicios/', method: 'get' }),
            providesTags: ['ContratoServicios'],
        }),

        getPlanesServicio: builder.query<IPlanServicio[], void>({
            query: () => ({ url: '/api/planes-servicio/', method: 'get' }),
            providesTags: ['ContratoServicios'],
        }),

        getVisitasCatalogo: builder.query<IVisita[], void>({
            query: () => ({ url: '/api/visitas/', method: 'get' }),
            providesTags: ['ContratoVisitas'],
        }),

        getLicenciasCatalogo: builder.query<ILicencia[], void>({
            query: () => ({ url: '/api/licencias/', method: 'get' }),
            providesTags: ['ContratoLicencias'],
        }),

        getCondicionesEspeciales: builder.query<ICondicionEspecial[], void>({
            query: () => ({ url: '/api/condiciones-especiales/', method: 'get' }),
            providesTags: ['ContratoCondiciones'],
        }),

        // ─── Licencias de contrato (nivel top) ───
        getContratoLicenciasVinculos: builder.query<
            IContratoLicencia[],
            { empresaId: number | string; clienteId: number | string }
        >({
            query: ({ empresaId, clienteId }) => ({
                url: `/api/contrato-licencias/lista-vinculos/${empresaId}/${clienteId}/`,
                method: 'get',
            }),
            providesTags: ['ContratoLicencias'],
        }),

        getDetalleContratoLicencia: builder.query<IContratoLicencia, number | string>({
            query: (id) => ({ url: `/api/contrato-licencias/${id}/`, method: 'get' }),
            providesTags: (_result, _error, id) => [
                { type: 'ContratoLicencias', id: Number(id) },
            ],
        }),

        // ─── Usuarios vinculados a licencia ───
        getUsuariosVinculadosLicencia: builder.query<IUsuarioVinculadoLicencia[], number | string>({
            query: (licenciaId) => ({
                url: `/api/contrato-licencias/${licenciaId}/usuarios-vinculados/`,
                method: 'get',
            }),
            providesTags: ['ContratoUsuarios'],
        }),

        getUsuariosDisponiblesLicencia: builder.query<
            IUsuarioEmpresa[],
            { licenciaId: number | string; empresaId: number | string }
        >({
            query: ({ licenciaId, empresaId }) => ({
                url: `/api/contrato-licencias/${licenciaId}/usuarios-vinculados/empresa/${empresaId}/usuarios-no-vinculados/`,
                method: 'get',
            }),
            providesTags: ['ContratoUsuarios'],
        }),

        // ─── Mutations: Usuarios vinculados a licencia ───
        createUsuarioVinculadoLicencia: builder.mutation<
            IUsuarioVinculadoLicencia,
            { licenciaId: number | string; data: Record<string, unknown> }
        >({
            query: ({ licenciaId, data }) => ({
                url: `/api/contrato-licencias/${licenciaId}/usuarios-vinculados/`,
                method: 'post',
                data,
            }),
            invalidatesTags: ['ContratoUsuarios', 'ContratoLicencias'],
        }),

        updateUsuarioVinculadoLicencia: builder.mutation<
            IUsuarioVinculadoLicencia,
            { licenciaId: number | string; usuarioId: number | string; data: Record<string, unknown> }
        >({
            query: ({ licenciaId, usuarioId, data }) => ({
                url: `/api/contrato-licencias/${licenciaId}/usuarios-vinculados/${usuarioId}/`,
                method: 'patch',
                data,
            }),
            invalidatesTags: ['ContratoUsuarios', 'ContratoLicencias'],
        }),

        deleteUsuarioVinculadoLicencia: builder.mutation<
            void,
            { licenciaId: number | string; usuarioId: number | string }
        >({
            query: ({ licenciaId, usuarioId }) => ({
                url: `/api/contrato-licencias/${licenciaId}/usuarios-vinculados/${usuarioId}/`,
                method: 'delete',
            }),
            invalidatesTags: ['ContratoUsuarios', 'ContratoLicencias'],
        }),

        // ─── Mutation: Cambiar estado de licencia ───
        cambiarEstadoContratoLicencia: builder.mutation<
            IContratoLicencia,
            { id: number | string; estado: string }
        >({
            query: ({ id, estado }) => ({
                url: `/api/contrato-licencias/${id}/cambiar-estado/`,
                method: 'post',
                data: { estado },
            }),
            invalidatesTags: ['ContratoLicencias'],
        }),

        // ─── Mutation: Crear licencia de catálogo ───
        createLicenciaCatalogo: builder.mutation<
            ILicencia,
            { nombre: string; proveedor?: string }
        >({
            query: (data) => ({
                url: '/api/licencias/',
                method: 'post',
                data,
            }),
            invalidatesTags: ['ContratoLicencias'],
        }),

        // ─── Mutation: Crear ContratoLicencia (nested bajo contrato) ───
        createContratoLicencia: builder.mutation<
            IContratoLicencia,
            { contratoId: number | string; data: Record<string, unknown> }
        >({
            query: ({ contratoId, data }) => ({
                url: `/api/contratos/${contratoId}/licencias/`,
                method: 'post',
                data,
            }),
            invalidatesTags: ['ContratoLicencias'],
        }),

        // ─── Query: Historial de cambios de una licencia ───
        getHistorialContratoLicencia: builder.query<
            IHistorialLicencia[],
            number | string
        >({
            query: (licenciaId) => ({
                url: `/api/contrato-licencias/${licenciaId}/historial/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'ContratoLicencias', id }],
        }),

        // ─── Confidencialidad ───
        getFirmasConfidencialidad: builder.query<unknown[], number | string>({
            query: (contratoId) => ({
                url: `/api/contratos/${contratoId}/firmas/`,
                method: 'get',
            }),
            providesTags: ['ContratoFirmas'],
        }),

        // ─── Relaciones anidadas del contrato (nested routes) ───
        getUsuariosVinculadosContrato: builder.query<IVinculoContrato[], number | string>({
            query: (contratoId) => ({
                url: `/api/contratos/${contratoId}/usuarios-vinculados/`,
                method: 'get',
            }),
            providesTags: ['ContratoUsuarios'],
        }),

        getContratoServicios: builder.query<IContratoServicio[], number | string>({
            query: (contratoId) => ({
                url: `/api/contratos/${contratoId}/servicios/`,
                method: 'get',
            }),
            providesTags: ['ContratoServicios'],
        }),

        getContratoVisitas: builder.query<IContratoVisita[], number | string>({
            query: (contratoId) => ({
                url: `/api/contratos/${contratoId}/visitas/`,
                method: 'get',
            }),
            providesTags: ['ContratoVisitas'],
        }),

        getContratoCondiciones: builder.query<IContratoCondicionEspecial[], number | string>({
            query: (contratoId) => ({
                url: `/api/contratos/${contratoId}/condiciones-especiales/`,
                method: 'get',
            }),
            providesTags: ['ContratoCondiciones'],
        }),

        getContratoLicencias: builder.query<IContratoLicencia[], number | string>({
            query: (contratoId) => ({
                url: `/api/contratos/${contratoId}/licencias/`,
                method: 'get',
            }),
            providesTags: ['ContratoLicencias'],
        }),

        deleteContrato: builder.mutation<void, number | string>({
            query: (id) => ({
                url: `/api/contratos/${id}/`,
                method: 'delete',
            }),
            invalidatesTags: ['Contratos', 'ContratosDashboard'],
        }),

        // ═══════════════════════════════════════════════════════
        //  Queries "por usuario" — Detalle Usuario Cliente
        // ═══════════════════════════════════════════════════════

        getLicenciasPorUsuarioEmpresa: builder.query<
            ILicenciaVinculadaPorUsuario[],
            number | string
        >({
            query: (usuarioEmpresaId) => ({
                url: `/api/contrato-licencias/por-usuario-empresa/${usuarioEmpresaId}/`,
                method: 'get',
            }),
            providesTags: ['ContratoLicencias'],
        }),

        getContratosPorUsuarioEmpresa: builder.query<
            IContratoVinculadoPorUsuario[],
            number | string
        >({
            query: (usuarioEmpresaId) => ({
                url: `/api/contratos/por-usuario-empresa/${usuarioEmpresaId}/`,
                method: 'get',
            }),
            providesTags: ['Contratos'],
        }),

        getEquiposPorUsuarioEmpresa: builder.query<
            IUsuarioEquipo[],
            number | string
        >({
            query: (usuarioEmpresaId) => ({
                url: `/api/usuarios-equipo/por-usuario-empresa/${usuarioEmpresaId}/`,
                method: 'get',
            }),
            providesTags: ['EquiposUsuario'],
        }),

        // ═══════════════════════════════════════════════════════
        //  Facturas de Contrato (Prefacturación)
        // ═══════════════════════════════════════════════════════

        getFacturasContrato: builder.query<
            IFacturaContrato[],
            { contrato?: number | string; cliente?: number | string; estado?: string; historico?: boolean } | void
        >({
            query: (params) => {
                const searchParams = new URLSearchParams();
                if (params) {
                    if (params.contrato) searchParams.set('contrato', String(params.contrato));
                    if (params.cliente) searchParams.set('cliente', String(params.cliente));
                    if (params.estado) searchParams.set('estado', params.estado);
                    if (params.historico) searchParams.set('historico', '1');
                }
                const qs = searchParams.toString();
                return { url: `/api/facturas-contrato/${qs ? `?${qs}` : ''}`, method: 'get' };
            },
            providesTags: ['FacturasContrato'],
        }),

        getDetalleFacturaContrato: builder.query<IFacturaContrato, number | string>({
            query: (id) => ({ url: `/api/facturas-contrato/${id}/`, method: 'get' }),
            providesTags: (_result, _error, id) => [{ type: 'FacturaContrato', id: Number(id) }],
        }),

        getResumenFacturasContrato: builder.query<IFacturaContratoResumen[], void>({
            query: () => ({ url: '/api/facturas-contrato/resumen/', method: 'get' }),
            providesTags: ['FacturasContratoResumen'],
        }),

        createFacturaContrato: builder.mutation<
            IFacturaContrato,
            Partial<IFacturaContrato>
        >({
            query: (data) => ({ url: '/api/facturas-contrato/', method: 'post', data }),
            invalidatesTags: ['FacturasContrato', 'FacturasContratoResumen'],
        }),

        updateFacturaContrato: builder.mutation<
            IFacturaContrato,
            { id: number | string; data: Partial<IFacturaContrato> }
        >({
            query: ({ id, data }) => ({
                url: `/api/facturas-contrato/${id}/`,
                method: 'PATCH',
                data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'FacturaContrato', id: Number(id) },
                'FacturasContrato',
                'FacturasContratoResumen',
            ],
        }),

        finalizarFacturaContrato: builder.mutation<IFacturaContrato, number | string>({
            query: (id) => ({
                url: `/api/facturas-contrato/${id}/finalizar/`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: 'FacturaContrato', id: Number(id) },
                'FacturasContrato',
                'FacturasContratoResumen',
            ],
        }),

        asociarDocumentoFactura: builder.mutation<
            IFacturaContrato,
            { id: number | string; documento: File }
        >({
            query: ({ id, documento }) => {
                const formData = new FormData();
                formData.append('documento', documento);
                return {
                    url: `/api/facturas-contrato/${id}/asociar-documento/`,
                    method: 'post',
                    data: formData,
                };
            },
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'FacturaContrato', id: Number(id) },
                'FacturasContrato',
            ],
        }),

        deleteFacturaContrato: builder.mutation<void, number | string>({
            query: (id) => ({
                url: `/api/facturas-contrato/${id}/`,
                method: 'delete',
            }),
            invalidatesTags: ['FacturasContrato', 'FacturasContratoResumen'],
        }),
    }),
});

export const {
    useGetContratosQuery,
    useGetContratosPorEmpresaClienteQuery,
    useGetDetalleContratoQuery,
    useCreateContratoMutation,
    useUpdateContratoMutation,
    useCambiarEstadoContratoMutation,
    useRenovarContratoMutation,
    useGetMetricasDashboardQuery,
    useEditarServiciosGenericosMutation,
    useGetServiciosQuery,
    useGetPlanesServicioQuery,
    useGetVisitasCatalogoQuery,
    useGetLicenciasCatalogoQuery,
    useGetCondicionesEspecialesQuery,
    useGetContratoLicenciasVinculosQuery,
    useGetDetalleContratoLicenciaQuery,
    useGetUsuariosVinculadosLicenciaQuery,
    useGetUsuariosDisponiblesLicenciaQuery,
    useCreateUsuarioVinculadoLicenciaMutation,
    useUpdateUsuarioVinculadoLicenciaMutation,
    useDeleteUsuarioVinculadoLicenciaMutation,
    useCambiarEstadoContratoLicenciaMutation,
    useCreateLicenciaCatalogoMutation,
    useCreateContratoLicenciaMutation,
    useGetHistorialContratoLicenciaQuery,
    useGetFirmasConfidencialidadQuery,
    // Relaciones anidadas del contrato
    useGetUsuariosVinculadosContratoQuery,
    useGetContratoServiciosQuery,
    useGetContratoVisitasQuery,
    useGetContratoCondicionesQuery,
    useGetContratoLicenciasQuery,
    useDeleteContratoMutation,
    // Queries por usuario
    useGetLicenciasPorUsuarioEmpresaQuery,
    useGetContratosPorUsuarioEmpresaQuery,
    useGetEquiposPorUsuarioEmpresaQuery,
    // Facturas de contrato
    useGetFacturasContratoQuery,
    useGetDetalleFacturaContratoQuery,
    useGetResumenFacturasContratoQuery,
    useCreateFacturaContratoMutation,
    useUpdateFacturaContratoMutation,
    useFinalizarFacturaContratoMutation,
    useAsociarDocumentoFacturaMutation,
    useDeleteFacturaContratoMutation,
} = contratoApi;

export default contratoApi;
