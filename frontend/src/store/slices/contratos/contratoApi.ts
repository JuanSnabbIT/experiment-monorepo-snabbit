import { IBodega } from '@/interface/bodega.interface';
import {
    IAlcanceComercialPayload,
    ICaracteristicaServicio,
    ICondicionEspecial,
    IContratoAprobacionEstado,
    IContratoBorradorPayload,
    IContratoCondicionEspecial,
    IContratoCuotaPago,
    IContratoEmpresaCliente,
    IContratoFirmaEstado,
    IContratoFirmaPreview,
    IContratoHistorialEvento,
    IContratoLicencia,
    IContratoMatching,
    IContratoResumenPublico,
    IContratoServicio,
    IContratoVinculadoPorUsuario,
    IContratoVisita,
    ICorreoPersonaLicenciataria,
    ICotizacionVinculadaResumen,
    IFacturaContrato,
    IFacturaContratoResumen,
    ILicencia,
    ILicenciaVinculadaPorUsuario,
    IPlanServicio,
    IResumenComercialContrato,
    IServicio,
    IUsuarioVinculadoLicencia,
    IVinculoContrato,
    IVisita,
    IVolverContratoBorradorResponse
} from '@/interface/contrato.interface';
import {
    IDesvincularEquipoRequest,
    IDesvincularEquipoResponse,
    IUsuarioEquipo,
} from '@/interface/recursos.interface';
import RtkQueryService from '@/services/RtkQueryService';

// ── Tipos auxiliares ──

export interface IHistorialLicencia {
    id: number | string;
    fecha: string;
    tipo: string;
    usuario: string | null;
    cambios: string;
    estado: string | null;
    cantidad: number | null;
    origen: 'licencia' | 'vinculo_usuario';
    detalle: string;
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
        empresa_cliente: number;
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

interface IServicioCatalogoPayload {
    nombre: string;
    descripcion?: string;
    categoria: string;
    alcance_config?: Array<{
        caracteristica_id: number;
        modo: 'incluye' | 'no_incluye';
        orden?: number;
    }>;
    caracteristicas_ids?: number[];
    precio?: number | string;
    tipo_moneda?: string;
    veces_por_mes_default?: number;
    clausulas_especiales?: string | null;
}

interface IPlanServicioCatalogoPayload {
    nombre: string;
    descripcion?: string;
    servicios_ids?: number[];
    precio?: number | string;
    tipo_moneda?: string;
    veces_por_mes_default?: number;
    clausulas_especiales?: string | null;
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
        getPreviewFirmaContrato: builder.query<IContratoFirmaPreview, number | string>({
            query: (id) => ({ url: `/api/contratos/${id}/preview-firma/`, method: 'get' }),
            providesTags: (_result, _error, id) => [{ type: 'Contrato', id: Number(id) }],
        }),
        getHistorialContrato: builder.query<
            IContratoHistorialEvento[],
            { id: number | string; soloCliente?: boolean }
        >({
            query: ({ id, soloCliente = true }) => ({
                url: `/api/contratos/${id}/historial/`,
                method: 'get',
                params: { solo_cliente: soloCliente },
            }),
            providesTags: (_result, _error, { id }) => [{ type: 'Contrato', id: Number(id) }],
        }),

        createContrato: builder.mutation<
            IContratoEmpresaCliente,
            Partial<IContratoEmpresaCliente>
        >({
            query: (data) => ({ url: '/api/contratos/', method: 'post', data }),
            invalidatesTags: ['Contratos'],
        }),

        createContratoCompleto: builder.mutation<IContratoEmpresaCliente, IContratoBorradorPayload>({
            query: (data) => ({
                url: '/api/contratos/crear-completo/',
                method: 'post',
                data,
            }),
            invalidatesTags: [
                'Contratos',
                'ContratoServicios',
                'ContratoLicencias',
                'ContratoVisitas',
                'ContratoCondiciones',
                'ContratoUsuarios',
                'SeccionesContratoGeneradas',
            ],
        }),

        patchContrato: builder.mutation<
            IContratoEmpresaCliente,
            { id: number | string; data: Partial<IContratoEmpresaCliente> }
        >({
            query: ({ id, data }) => ({
                url: `/api/contratos/${id}/`,
                method: 'PATCH',
                data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Contrato', id: Number(id) },
                'Contratos',
            ],
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

        enviarAprobacionContrato: builder.mutation<IContratoAprobacionEstado, number | string>({
            query: (id) => ({
                url: `/api/contratos/${id}/enviar-aprobacion/`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: 'Contrato', id: Number(id) },
                'Contratos',
            ],
        }),

        updateContratoBorrador: builder.mutation<
            IContratoEmpresaCliente,
            { id: number | string; data: IContratoBorradorPayload }
        >({
            query: ({ id, data }) => ({
                url: `/api/contratos/${id}/actualizar-borrador/`,
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

        getResumenComercialContrato: builder.query<IResumenComercialContrato, number | string>({
            query: (id) => ({
                url: `/api/contratos/${id}/resumen-comercial/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'Contrato', id: Number(id) }],
        }),

        reenviarAprobacionContrato: builder.mutation<{ detail: string }, number | string>({
            query: (id) => ({
                url: `/api/contratos/${id}/reenviar-aprobacion/`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: 'Contrato', id: Number(id) },
                'Contratos',
            ],
        }),

        volverContratoABorrador: builder.mutation<IVolverContratoBorradorResponse, number | string>({
            query: (id) => ({
                url: `/api/contratos/${id}/volver-a-borrador/`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: 'Contrato', id: Number(id) },
                'Contratos',
                'ContratoServicios',
                'ContratoLicencias',
                'ContratoVisitas',
                'ContratoCondiciones',
                'ContratoUsuarios',
            ],
        }),

        enviarAFirmaContrato: builder.mutation<IContratoFirmaEstado, number | string>({
            query: (id) => ({
                url: `/api/contratos/${id}/enviar-firma/`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: 'Contrato', id: Number(id) },
                'Contratos',
                'ContratoFirmas',
                'ContratoUsuarios',
            ],
        }),

        reenviarAFirmaContrato: builder.mutation<{ detail: string }, number | string>({
            query: (id) => ({
                url: `/api/contratos/${id}/reenviar-firma/`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: 'Contrato', id: Number(id) },
                'Contratos',
                'ContratoFirmas',
                'ContratoUsuarios',
            ],
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

        editarAlcanceComercial: builder.mutation<
            IContratoEmpresaCliente,
            { id: number | string; alcance_comercial: IAlcanceComercialPayload }
        >({
            query: ({ id, alcance_comercial }) => ({
                url: `/api/contratos/${id}/editar-alcance-comercial/`,
                method: 'put',
                data: { alcance_comercial },
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Contrato', id: Number(id) },
                'ContratoServicios',
            ],
        }),

        // ─── Catálogos ───
        getServicios: builder.query<IServicio[], void>({
            query: () => ({ url: '/api/servicios/', method: 'get' }),
            providesTags: ['Servicios', 'ContratoServicios'],
        }),

        getPlanesServicio: builder.query<IPlanServicio[], void>({
            query: () => ({ url: '/api/planes-servicio/', method: 'get' }),
            providesTags: ['PlanesServicio', 'ContratoServicios'],
        }),

        getPlanServicio: builder.query<IPlanServicio, number | string>({
            query: (id) => ({ url: `/api/planes-servicio/${id}/`, method: 'get' }),
            providesTags: (_result, _error, id) => [{ type: 'PlanesServicio', id: Number(id) }],
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

        updateCantidadContratoLicencia: builder.mutation<
            IContratoLicencia,
            { id: number | string; cantidad: number }
        >({
            query: ({ id, cantidad }) => ({
                url: `/api/contrato-licencias/${id}/`,
                method: 'patch',
                data: { cantidad },
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'ContratoLicencias', id: Number(id) },
                'ContratoLicencias',
                'ContratoUsuarios',
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
            ICorreoPersonaLicenciataria[],
            { licenciaId: number | string; empresaId: number | string }
        >({
            query: ({ licenciaId, empresaId }) => ({
                url: `/api/contrato-licencias/${licenciaId}/usuarios-vinculados/empresa/${empresaId}/correos-disponibles/`,
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
            {
                nombre: string;
                numero_parte?: string;
                proveedor?: string;
                descripcion?: string;
                modalidad_base?: 'P1M' | 'P1Y' | 'PAGO_UNICO';
                modalidad_anual_forma_pago?: 'PAGO_UNICO' | 'PAGO_MENSUAL' | null;
                precio_partner?: number;
                precio_venta?: number;
                moneda?: string;
                activo?: boolean;
            }
        >({
            query: (data) => ({
                url: '/api/licencias/',
                method: 'post',
                data,
            }),
            invalidatesTags: ['ContratoLicencias'],
        }),

        updateLicenciaCatalogo: builder.mutation<
            ILicencia,
            {
                id: number | string;
                data: {
                    nombre?: string;
                    numero_parte?: string;
                    proveedor?: string;
                    descripcion?: string;
                    modalidad_base?: 'P1M' | 'P1Y' | 'PAGO_UNICO';
                    modalidad_anual_forma_pago?: 'PAGO_UNICO' | 'PAGO_MENSUAL' | null;
                    precio_partner?: number;
                    precio_venta?: number;
                    moneda?: string;
                    activo?: boolean;
                };
            }
        >({
            query: ({ id, data }) => ({
                url: `/api/licencias/${id}/`,
                method: 'patch',
                data,
            }),
            invalidatesTags: ['ContratoLicencias'],
        }),

        deleteLicenciaCatalogo: builder.mutation<void, number | string>({
            query: (id) => ({
                url: `/api/licencias/${id}/`,
                method: 'delete',
            }),
            invalidatesTags: ['ContratoLicencias'],
        }),

        getLicencia: builder.query<ILicencia, number | string>({
            query: (id) => ({ url: `/api/licencias/${id}/`, method: 'get' }),
            providesTags: (_result, _error, id) => [{ type: 'ContratoLicencias', id: Number(id) }],
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

        // ─── Firma de contrato ───
        enviarFirmaContrato: builder.mutation<
            unknown,
            { contratoId: number; usuarioVinculadoId: number }
        >({
            query: ({ contratoId, usuarioVinculadoId }) => ({
                url: `/api/contratos/${contratoId}/usuarios-vinculados/${usuarioVinculadoId}/envio-firma/`,
                method: 'post',
                data: { usuario: usuarioVinculadoId },
            }),
            invalidatesTags: (result, _error, { contratoId }) =>
                result
                    ? [
                          { type: 'Contrato', id: contratoId },
                          'ContratoFirmas',
                          'ContratoUsuarios',
                      ]
                    : [],
        }),

        reenviarFirmaContrato: builder.mutation<
            unknown,
            { contratoId: number; usuarioVinculadoId: number; envioId: number }
        >({
            query: ({ contratoId, usuarioVinculadoId, envioId }) => ({
                url: `/api/contratos/${contratoId}/usuarios-vinculados/${usuarioVinculadoId}/envio-firma/${envioId}/reenviar/`,
                method: 'post',
            }),
            invalidatesTags: (result, _error, { contratoId }) =>
                result
                    ? [
                          { type: 'Contrato', id: contratoId },
                          'ContratoFirmas',
                          'ContratoUsuarios',
                      ]
                    : [],
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

        getBodegasPorEmpresaCliente: builder.query<IBodega[], number | string>({
            query: (empresaClienteId) => ({
                url: `/api/bodegas/por-empresa/${empresaClienteId}/`,
                method: 'get',
            }),
            providesTags: (result, _error, empresaClienteId) =>
                result
                    ? [
                          { type: 'Bodegas' as const, id: empresaClienteId },
                          ...result.map((bodega) => ({
                              type: 'Bodegas' as const,
                              id: bodega.id,
                          })),
                      ]
                    : [{ type: 'Bodegas' as const, id: empresaClienteId }],
        }),

        desvincularEquipoDesdeDetalle: builder.mutation<
            IDesvincularEquipoResponse,
            { usuarioEquipoId: number | string; data: IDesvincularEquipoRequest }
        >({
            query: ({ usuarioEquipoId, data }) => ({
                url: `/api/usuarios-equipo/${usuarioEquipoId}/desvincular-desde-detalle/`,
                method: 'post',
                data,
            }),
            invalidatesTags: (result) => {
                const tags: Array<
                    | 'EquiposUsuario'
                    | 'ClienteUsuarios'
                    | { type: 'Bodegas'; id: number | string }
                > = ['EquiposUsuario', 'ClienteUsuarios'];

                if (result?.ingreso_bodega?.bodega_id) {
                    tags.push({
                        type: 'Bodegas',
                        id: result.ingreso_bodega.bodega_id,
                    });
                }

                return tags;
            },
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

        recalcularMontoFactura: builder.mutation<IFacturaContrato, number | string>({
            query: (id) => ({
                url: `/api/facturas-contrato/${id}/recalcular-monto/`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: 'FacturaContrato', id: Number(id) },
                'FacturasContrato',
                'FacturasContratoResumen',
            ],
        }),

        // ═══════════════════════════════════════════════════════
        //  Catálogos: Servicios, Planes, Características (CRUD)
        // ═══════════════════════════════════════════════════════

        getCaracteristicasServicio: builder.query<ICaracteristicaServicio[], void>({
            query: () => ({ url: '/api/caracteristicas-servicio/', method: 'get' }),
            providesTags: ['CaracteristicasServicio'],
        }),

        // ─── Servicios CRUD ───
        createServicio: builder.mutation<IServicio, IServicioCatalogoPayload>({
            query: (data) => ({ url: '/api/servicios/', method: 'post', data }),
            invalidatesTags: ['Servicios', 'ContratoServicios'],
        }),

        updateServicio: builder.mutation<
            IServicio,
            { id: number | string; data: Partial<IServicioCatalogoPayload> }
        >({
            query: ({ id, data }) => ({ url: `/api/servicios/${id}/`, method: 'patch', data }),
            invalidatesTags: ['Servicios', 'ContratoServicios', 'PlanesServicio'],
        }),

        deleteServicio: builder.mutation<void, number | string>({
            query: (id) => ({ url: `/api/servicios/${id}/`, method: 'delete' }),
            invalidatesTags: ['Servicios', 'ContratoServicios', 'PlanesServicio'],
        }),

        // ─── Planes de Servicio CRUD ───
        createPlanServicio: builder.mutation<IPlanServicio, IPlanServicioCatalogoPayload>({
            query: (data) => ({ url: '/api/planes-servicio/', method: 'post', data }),
            invalidatesTags: ['PlanesServicio', 'ContratoServicios'],
        }),

        updatePlanServicio: builder.mutation<
            IPlanServicio,
            { id: number | string; data: Partial<IPlanServicioCatalogoPayload> }
        >({
            query: ({ id, data }) => ({ url: `/api/planes-servicio/${id}/`, method: 'patch', data }),
            invalidatesTags: ['PlanesServicio', 'ContratoServicios'],
        }),

        deletePlanServicio: builder.mutation<void, number | string>({
            query: (id) => ({ url: `/api/planes-servicio/${id}/`, method: 'delete' }),
            invalidatesTags: ['PlanesServicio', 'ContratoServicios'],
        }),

        // ─── Características de Servicio CRUD ───
        createCaracteristicaServicio: builder.mutation<ICaracteristicaServicio, { nombre: string; descripcion?: string }>({
            query: (data) => ({ url: '/api/caracteristicas-servicio/', method: 'post', data }),
            invalidatesTags: ['CaracteristicasServicio', 'Servicios', 'ContratoServicios'],
        }),

        updateCaracteristicaServicio: builder.mutation<ICaracteristicaServicio, { id: number | string; data: Partial<ICaracteristicaServicio> }>({
            query: ({ id, data }) => ({ url: `/api/caracteristicas-servicio/${id}/`, method: 'patch', data }),
            invalidatesTags: ['CaracteristicasServicio', 'Servicios', 'ContratoServicios'],
        }),

        deleteCaracteristicaServicio: builder.mutation<void, number | string>({
            query: (id) => ({ url: `/api/caracteristicas-servicio/${id}/`, method: 'delete' }),
            invalidatesTags: ['CaracteristicasServicio', 'Servicios', 'ContratoServicios'],
        }),

        // ═══════════════════════════════════════════════════════
        //  Cotizaciones vinculadas a contrato (tipo venta)
        // ═══════════════════════════════════════════════════════

        getCotizacionesDisponibles: builder.query<
            ICotizacionVinculadaResumen[],
            number | string
        >({
            query: (contratoId) => ({
                url: `/api/contratos/${contratoId}/cotizaciones-disponibles/`,
                method: 'get',
            }),
            providesTags: ['ContratoCotizaciones'],
        }),

        getCotizacionesDisponiblesCliente: builder.query<
            ICotizacionVinculadaResumen[],
            number | string
        >({
            query: (clienteId) => ({
                url: `/api/contratos/cotizaciones-disponibles-cliente/${clienteId}/`,
                method: 'get',
            }),
            providesTags: ['ContratoCotizaciones'],
        }),

        vincularCotizacion: builder.mutation<
            IContratoEmpresaCliente,
            { contratoId: number | string; cotizaciones_ids: number[] }
        >({
            query: ({ contratoId, cotizaciones_ids }) => ({
                url: `/api/contratos/${contratoId}/vincular-cotizacion/`,
                method: 'post',
                data: { cotizaciones_ids },
            }),
            invalidatesTags: (_result, _error, { contratoId }) => [
                { type: 'Contrato', id: Number(contratoId) },
                'ContratoCotizaciones',
                'Cotizaciones',
            ],
        }),

        desvincularCotizacion: builder.mutation<
            IContratoEmpresaCliente,
            { contratoId: number | string; cotizacion_id: number }
        >({
            query: ({ contratoId, cotizacion_id }) => ({
                url: `/api/contratos/${contratoId}/desvincular-cotizacion/`,
                method: 'post',
                data: { cotizacion_id },
            }),
            invalidatesTags: (_result, _error, { contratoId }) => [
                { type: 'Contrato', id: Number(contratoId) },
                'ContratoCotizaciones',
                'Cotizaciones',
            ],
        }),

        // ─── Contratos activos por cliente (para matching OT) ───
        getContratosActivosCliente: builder.query<IContratoMatching[], number | string>({
            query: (clienteId) => ({
                url: `/api/contratos/activos-cliente/?cliente_id=${clienteId}`,
                method: 'get',
            }),
            providesTags: ['ContratosActivosCliente'],
        }),

        // ─── Próximo período disponible para prefactura ───
        getProximoPeriodoFactura: builder.query<
            { periodo_inicio: string; periodo_fin: string },
            number | string
        >({
            query: (contratoId) => ({
                url: `/api/facturas-contrato/proximo-periodo/?contrato_id=${contratoId}`,
                method: 'get',
            }),
        }),

        // ─── Cuotas de pago (schedule desacoplado) ───
        getCuotasPago: builder.query<IContratoCuotaPago[], number | string>({
            query: (contratoId) => ({
                url: `/api/contratos/${contratoId}/cuotas/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'Contrato', id: Number(id) }],
        }),

        setCuotasPago: builder.mutation<
            IContratoCuotaPago[],
            { id: number | string; cuotas: Omit<IContratoCuotaPago, 'id' | 'estado'>[] }
        >({
            query: ({ id, cuotas }) => ({
                url: `/api/contratos/${id}/cuotas/`,
                method: 'put',
                data: { cuotas },
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Contrato', id: Number(id) },
                'Contratos',
            ],
        }),

        // ─── Endpoints resolutores (FASE 9) ───────────────────────────────────

        agregarItemComercial: builder.mutation<
            IContratoEmpresaCliente,
            {
                id: number | string;
                tipo_origen: 'servicio' | 'plan';
                version_id: number;
                cantidad?: number;
                veces_por_mes?: number;
                descuento_anual_porcentaje?: number | null;
                es_addon?: boolean;
            }
        >({
            query: ({ id, ...data }) => ({
                url: `/api/contratos/${id}/agregar-item-comercial/`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Contrato', id: Number(id) },
                'Contratos',
                'ContratoServicios',
            ],
        }),

        agregarLicencia: builder.mutation<
            IContratoEmpresaCliente,
            {
                id: number | string;
                licencia_id: number;
                cantidad?: number;
                partner?: boolean;
                fecha_inicio?: string | null;
                fecha_fin?: string | null;
            }
        >({
            query: ({ id, ...data }) => ({
                url: `/api/contratos/${id}/agregar-licencia/`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Contrato', id: Number(id) },
                'Contratos',
                'ContratoLicencias',
            ],
        }),

        eliminarItemComercial: builder.mutation<
            IContratoEmpresaCliente,
            { id: number | string; itemId: number | string }
        >({
            query: ({ id, itemId }) => ({
                url: `/api/contratos/${id}/eliminar-item/${itemId}/`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Contrato', id: Number(id) },
                'Contratos',
                'ContratoServicios',
            ],
        }),

        eliminarContratoLicencia: builder.mutation<
            IContratoEmpresaCliente,
            { id: number | string; licenciaId: number | string }
        >({
            query: ({ id, licenciaId }) => ({
                url: `/api/contratos/${id}/eliminar-licencia/${licenciaId}/`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Contrato', id: Number(id) },
                'Contratos',
                'ContratoLicencias',
            ],
        }),

        // ── Resumen público del contrato ──
        getContratoResumenPublico: builder.query<IContratoResumenPublico, string>({
            query: (uuid) => ({
                url: `/api/public/contrato-resumen/${uuid}/`,
                method: 'get',
            }),
            providesTags: (_result, _error, uuid) => [
                { type: 'Contrato', id: `resumen-${uuid}` },
            ],
        }),
    }),
});

export const {
    useGetContratosQuery,
    useGetContratosPorEmpresaClienteQuery,
    useGetDetalleContratoQuery,
    useGetPreviewFirmaContratoQuery,
    useGetHistorialContratoQuery,
    useCreateContratoMutation,
    useCreateContratoCompletoMutation,
    usePatchContratoMutation,
    useUpdateContratoMutation,
    useUpdateContratoBorradorMutation,
    useGetResumenComercialContratoQuery,
    useCambiarEstadoContratoMutation,
    useRenovarContratoMutation,
    useEnviarAprobacionContratoMutation,
    useReenviarAprobacionContratoMutation,
    useVolverContratoABorradorMutation,
    useEnviarAFirmaContratoMutation,
    useReenviarAFirmaContratoMutation,
    useGetMetricasDashboardQuery,
    useEditarServiciosGenericosMutation,
    useEditarAlcanceComercialMutation,
    useGetServiciosQuery,
    useGetPlanesServicioQuery,
    useGetPlanServicioQuery,
    useGetVisitasCatalogoQuery,
    useGetLicenciasCatalogoQuery,
    useGetCondicionesEspecialesQuery,
    useGetContratoLicenciasVinculosQuery,
    useGetDetalleContratoLicenciaQuery,
    useUpdateCantidadContratoLicenciaMutation,
    useGetUsuariosVinculadosLicenciaQuery,
    useGetUsuariosDisponiblesLicenciaQuery,
    useCreateUsuarioVinculadoLicenciaMutation,
    useUpdateUsuarioVinculadoLicenciaMutation,
    useDeleteUsuarioVinculadoLicenciaMutation,
    useCambiarEstadoContratoLicenciaMutation,
    useCreateLicenciaCatalogoMutation,
    useUpdateLicenciaCatalogoMutation,
    useDeleteLicenciaCatalogoMutation,
    useGetLicenciaQuery,
    useCreateContratoLicenciaMutation,
    useGetHistorialContratoLicenciaQuery,
    useGetFirmasConfidencialidadQuery,
    useEnviarFirmaContratoMutation,
    useReenviarFirmaContratoMutation,
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
    useGetBodegasPorEmpresaClienteQuery,
    useDesvincularEquipoDesdeDetalleMutation,
    // Facturas de contrato
    useGetFacturasContratoQuery,
    useGetDetalleFacturaContratoQuery,
    useGetResumenFacturasContratoQuery,
    useCreateFacturaContratoMutation,
    useUpdateFacturaContratoMutation,
    useFinalizarFacturaContratoMutation,
    useAsociarDocumentoFacturaMutation,
    useDeleteFacturaContratoMutation,
    useRecalcularMontoFacturaMutation,
    // Catálogos CRUD
    useGetCaracteristicasServicioQuery,
    useCreateServicioMutation,
    useUpdateServicioMutation,
    useDeleteServicioMutation,
    useCreatePlanServicioMutation,
    useUpdatePlanServicioMutation,
    useDeletePlanServicioMutation,
    useCreateCaracteristicaServicioMutation,
    useUpdateCaracteristicaServicioMutation,
    useDeleteCaracteristicaServicioMutation,
    // Cotizaciones vinculadas
    useGetCotizacionesDisponiblesQuery,
    useGetCotizacionesDisponiblesClienteQuery,
    useVincularCotizacionMutation,
    useDesvincularCotizacionMutation,
    // Matching OT-Contrato
    useGetContratosActivosClienteQuery,
    useGetProximoPeriodoFacturaQuery,
    // Cuotas de pago
    useGetCuotasPagoQuery,
    useSetCuotasPagoMutation,
    // Endpoints resolutores (FASE 9)
    useAgregarItemComercialMutation,
    useAgregarLicenciaMutation,
    useEliminarItemComercialMutation,
    useEliminarContratoLicenciaMutation,
    useGetContratoResumenPublicoQuery,
} = contratoApi;

export default contratoApi;
