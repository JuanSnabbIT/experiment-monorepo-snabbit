import type {
    IAnexoContrato,
    IConsultaAfpResponse,
    IContratoTrabajador,
    IContratoTrabajadorHistorialEvento,
    IContratoTrabajadorSnapshotBlock,
    IContratoTrabajadorSnapshotUpdatePayload,
    ICrearContratoConTrabajadorPayload,
    ICrearContratoConTrabajadorResponse,
    IEnvioAprobacionEmpleador,
    IResponderAprobacionPayload,
    TEstadoContrato,
    TMotivoTerminoContrato
} from '@/interface/rrhh.interface';
import RtkQueryService from '@/services/RtkQueryService';

const BASE = '/api/rrhh/contratos-trabajador';

export const contratoTrabajadorApi = RtkQueryService.injectEndpoints({
    overrideExisting: import.meta.env.DEV,
    endpoints: (builder) => ({
        getContratosTrabajador: builder.query<IContratoTrabajador[], void>({
            query: () => ({ url: `${BASE}/`, method: 'get' }),
            providesTags: (result) =>
                result
                    ? [
                          { type: 'ContratoTrabajadorList' as const, id: 'LIST' },
                          ...result.map((c) => ({ type: 'ContratoTrabajador' as const, id: c.id })),
                      ]
                    : [{ type: 'ContratoTrabajadorList' as const, id: 'LIST' }],
        }),

        getContratosTrabajadorPorUsuarioEmpresa: builder.query<IContratoTrabajador[], number | string>({
            query: (usuarioEmpresaId) => ({
                url: `${BASE}/?usuario_empresa=${usuarioEmpresaId}`,
                method: 'get',
            }),
            providesTags: (result, _error, usuarioEmpresaId) =>
                result
                    ? [
                          { type: 'ContratoTrabajadorList', id: `UE-${usuarioEmpresaId}` },
                          ...result.map((c) => ({
                              type: 'ContratoTrabajador' as const,
                              id: c.id,
                          })),
                      ]
                    : [{ type: 'ContratoTrabajadorList', id: `UE-${usuarioEmpresaId}` }],
        }),

        getContratosTrabajadorPorEmpresaCliente: builder.query<IContratoTrabajador[], number | string>({
            query: (empresaClienteId) => ({
                url: `${BASE}/?empresa_cliente=${empresaClienteId}`,
                method: 'get',
            }),
            providesTags: (result, _error, empresaClienteId) =>
                result
                    ? [
                          { type: 'ContratoTrabajadorList', id: 'LIST' },
                          { type: 'ContratoTrabajadorList', id: `EC-${empresaClienteId}` },
                          ...result.map((c) => ({
                              type: 'ContratoTrabajador' as const,
                              id: c.id,
                          })),
                      ]
                    : [
                          { type: 'ContratoTrabajadorList', id: 'LIST' },
                          { type: 'ContratoTrabajadorList', id: `EC-${empresaClienteId}` },
                      ],
        }),

        getContratoTrabajadorDetalle: builder.query<IContratoTrabajador, number | string>({
            query: (id) => ({ url: `${BASE}/${id}/`, method: 'get' }),
            providesTags: (_r, _e, id) => [{ type: 'ContratoTrabajador', id }],
        }),

        getContratoTrabajadorSnapshotBlock: builder.query<
            IContratoTrabajadorSnapshotBlock,
            { id: number | string; path: string }
        >({
            query: ({ id, path }) => ({
                url: `${BASE}/${id}/get-block/?path=${encodeURIComponent(path)}`,
                method: 'get',
            }),
            providesTags: (_r, _e, arg) => [{ type: 'ContratoTrabajador' as const, id: arg.id }],
        }),

        createContratoTrabajador: builder.mutation<IContratoTrabajador, FormData | Partial<IContratoTrabajador>>({
            query: (data) => ({
                url: `${BASE}/`,
                method: 'post',
                data,
            }),
            invalidatesTags: [{ type: 'ContratoTrabajadorList', id: 'LIST' }],
        }),

        updateContratoTrabajador: builder.mutation<
            IContratoTrabajador,
            { id: number; data: FormData | Partial<IContratoTrabajador> }
        >({
            query: ({ id, data }) => ({
                url: `${BASE}/${id}/`,
                method: 'patch',
                data,
            }),
            invalidatesTags: (_r, _e, { id }) => [
                { type: 'ContratoTrabajador', id },
                { type: 'ContratoTrabajadorList', id: 'LIST' },
            ],
        }),

        cambiarEstadoContratoTrabajador: builder.mutation<
            IContratoTrabajador,
            {
                id: number;
                estado: TEstadoContrato;
                accion?: string;
                fecha_termino_real?: string;
                motivo_termino?: TMotivoTerminoContrato;
                observaciones_termino?: string;
            }
        >({
            query: ({ id, ...payload }) => ({
                url: `${BASE}/${id}/cambiar-estado/`,
                method: 'post',
                data: payload,
            }),
            invalidatesTags: (_r, _e, { id }) => [
                { type: 'ContratoTrabajador', id },
                { type: 'ContratoTrabajadorList', id: 'LIST' },
            ],
        }),

        crearContratoConTrabajador: builder.mutation<
            ICrearContratoConTrabajadorResponse,
            ICrearContratoConTrabajadorPayload & { sucursal_id_invalidar?: number }
        >({
            query: ({ sucursal_id_invalidar: _ignore, ...data }) => ({
                url: `${BASE}/crear-con-trabajador/`,
                method: 'post',
                data,
            }),
            invalidatesTags: (result, _e, arg) => {
                const tags: Array<{ type: 'ContratoTrabajadorList' | 'ClienteUsuarios'; id: string | number }> = [
                    { type: 'ContratoTrabajadorList', id: 'LIST' },
                ];
                if (result?.usuario_empresa_id) {
                    tags.push({ type: 'ContratoTrabajadorList', id: `UE-${result.usuario_empresa_id}` });
                }
                if (arg.sucursal_id_invalidar) {
                    tags.push({ type: 'ClienteUsuarios', id: arg.sucursal_id_invalidar });
                }
                return tags;
            },
        }),

        generarPdfContratoTrabajador: builder.mutation<IContratoTrabajador, number | string>({
            query: (id) => ({
                url: `${BASE}/${id}/generar-pdf/`,
                method: 'post',
            }),
            invalidatesTags: (_r, _e, id) => [{ type: 'ContratoTrabajador', id }],
        }),

        subirPdfContratoTrabajador: builder.mutation<IContratoTrabajador, { id: number | string; archivo: File }>({
            query: ({ id, archivo }) => {
                const fd = new FormData();
                fd.append('archivo_pdf', archivo);
                return { url: `${BASE}/${id}/subir-pdf/`, method: 'post', data: fd };
            },
            invalidatesTags: (_r, _e, { id }) => [{ type: 'ContratoTrabajador', id }],
        }),

        // ── Anexos de contrato ──────────────────────────────────────────
        getAnexosContrato: builder.query<IAnexoContrato[], number | string>({
            query: (contratoId) => ({
                url: `/api/rrhh/anexos-contrato/?contrato=${contratoId}`,
                method: 'get',
            }),
            providesTags: (_r, _e, contratoId) => [
                { type: 'AnexoContrato' as const, id: `C-${contratoId}` },
            ],
        }),

        crearAnexoContrato: builder.mutation<IAnexoContrato, FormData>({
            query: (fd) => ({ url: `/api/rrhh/anexos-contrato/`, method: 'post', data: fd }),
            invalidatesTags: (result) =>
                result
                    ? [
                          { type: 'AnexoContrato' as const, id: `C-${result.contrato}` },
                          { type: 'ContratoTrabajador' as const, id: result.contrato },
                      ]
                    : [],
        }),

        eliminarAnexoContrato: builder.mutation<void, { id: number; contratoId: number }>({
            query: ({ id }) => ({
                url: `/api/rrhh/anexos-contrato/${id}/`,
                method: 'delete',
            }),
            invalidatesTags: (_r, _e, { contratoId }) => [
                { type: 'AnexoContrato' as const, id: `C-${contratoId}` },
            ],
        }),

        activarAnexoContrato: builder.mutation<IAnexoContrato, number>({
            query: (id) => ({
                url: `/api/rrhh/anexos-contrato/${id}/activar/`,
                method: 'post',
            }),
            invalidatesTags: (result) =>
                result
                    ? [
                          { type: 'AnexoContrato' as const, id: `C-${result.contrato}` },
                          { type: 'ContratoTrabajador' as const, id: result.contrato },
                      ]
                    : [],
        }),

        actualizarAnexoContrato: builder.mutation<
            IAnexoContrato,
            { id: number; data: FormData | Partial<IAnexoContrato> }
        >({
            query: ({ id, data }) => ({
                url: `/api/rrhh/anexos-contrato/${id}/`,
                method: 'patch',
                data,
            }),
            invalidatesTags: (result) =>
                result ? [{ type: 'AnexoContrato' as const, id: `C-${result.contrato}` }] : [],
        }),

        enviarAprobacionEmpleador: builder.mutation<
            { contrato: IContratoTrabajador; envio: IEnvioAprobacionEmpleador },
            { id: number; email_empleador: string }
        >({
            query: ({ id, email_empleador }) => ({
                url: `${BASE}/${id}/enviar-aprobacion-empleador/`,
                method: 'post',
                data: { email_empleador },
            }),
            invalidatesTags: (_r, _e, { id }) => [
                { type: 'ContratoTrabajador' as const, id },
                { type: 'ContratoTrabajadorList' as const, id: 'LIST' },
            ],
        }),

        getEstadoAprobacionEmpleador: builder.query<
            { envio: IEnvioAprobacionEmpleador | null },
            number | string
        >({
            query: (id) => ({
                url: `${BASE}/${id}/estado-aprobacion-empleador/`,
                method: 'get',
            }),
            providesTags: (_r, _e, id) => [{ type: 'ContratoTrabajador' as const, id: id as number }],
        }),

        aprobarContratoTrabajador: builder.mutation<
            IContratoTrabajador,
            { id: number | string; accion?: string }
        >({
            query: ({ id, accion }) => ({
                url: `${BASE}/${id}/aprobar/`,
                method: 'post',
                data: accion ? { accion } : undefined,
            }),
            invalidatesTags: (_r, _e, { id }) => [
                { type: 'ContratoTrabajador' as const, id: id as number },
                { type: 'ContratoTrabajadorList' as const, id: 'LIST' },
            ],
        }),

        responderAprobacionPublica: builder.mutation<
            { detail: string },
            { uuid: string; payload: IResponderAprobacionPayload }
        >({
            query: ({ uuid, payload }) => ({
                url: `/api/public/rrhh/contrato-aprobacion/${uuid}/responder/`,
                method: 'post',
                data: payload,
            }),
        }),

        actualizarDatosRelacionadosContrato: builder.mutation<
            IContratoTrabajador,
            { id: number; data: Record<string, unknown> }
        >({
            query: ({ id, data }) => ({
                url: `${BASE}/${id}/actualizar-datos-relacionados/`,
                method: 'patch',
                data,
            }),
            invalidatesTags: (_r, _e, { id }) => [
                { type: 'ContratoTrabajador', id },
                { type: 'ContratoTrabajadorList', id: 'LIST' },
            ],
        }),

        updateContratoTrabajadorSnapshotBlock: builder.mutation<
            IContratoTrabajadorSnapshotBlock,
            IContratoTrabajadorSnapshotUpdatePayload
        >({
            query: ({ id, path, value }) => ({
                url: `${BASE}/${id}/update-block/`,
                method: 'patch',
                data: { path, value },
            }),
            invalidatesTags: (_r, _e, { id }) => [
                { type: 'ContratoTrabajador' as const, id },
                { type: 'ContratoTrabajadorList' as const, id: 'LIST' },
            ],
        }),

        getHistorialContratoTrabajador: builder.query<IContratoTrabajadorHistorialEvento[], number | string>({
            query: (id) => ({ url: `${BASE}/${id}/historial/`, method: 'get' }),
            providesTags: (_r, _e, id) => [
                { type: 'ContratoTrabajadorHistorial' as const, id },
                { type: 'ContratoTrabajador' as const, id },
            ],
        }),

        crearCopiaContrato: builder.mutation<IContratoTrabajador, { id: number | string; nombre: string }>({
            query: ({ id, nombre }) => ({
                url: `${BASE}/${id}/crear-copia/`,
                method: 'post',
                data: { nombre },
            }),
            invalidatesTags: [{ type: 'ContratoTrabajadorList', id: 'LIST' }],
        }),

        // ── Consulta de afiliación AFP (spensiones.cl) ──────────────────
        // Dispara la Celery task. No usa tags: no toca entidades persistidas.
        dispararConsultaAfp: builder.mutation<IConsultaAfpResponse, { rut: string; forzar?: boolean }>({
            query: (data) => ({ url: `${BASE}/consultar-afp/`, method: 'post', data }),
        }),
        // Polling por RUT contra el cache Redis (usar pollingInterval + skip).
        getConsultaAfp: builder.query<IConsultaAfpResponse, { rut: string }>({
            query: ({ rut }) => ({
                url: `${BASE}/consultar-afp/?rut=${encodeURIComponent(rut)}`,
                method: 'get',
            }),
        }),
    }),
});

export const {
    useGetContratosTrabajadorQuery,
    useGetContratosTrabajadorPorUsuarioEmpresaQuery,
    useGetContratosTrabajadorPorEmpresaClienteQuery,
    useGetContratoTrabajadorDetalleQuery,
    useGetContratoTrabajadorSnapshotBlockQuery,
    useCreateContratoTrabajadorMutation,
    useUpdateContratoTrabajadorMutation,
    useCambiarEstadoContratoTrabajadorMutation,
    useCrearContratoConTrabajadorMutation,
    useGenerarPdfContratoTrabajadorMutation,
    useSubirPdfContratoTrabajadorMutation,
    useGetAnexosContratoQuery,
    useCrearAnexoContratoMutation,
    useEliminarAnexoContratoMutation,
    useActivarAnexoContratoMutation,
    useActualizarAnexoContratoMutation,
    useEnviarAprobacionEmpleadorMutation,
    useGetEstadoAprobacionEmpleadorQuery,
    useAprobarContratoTrabajadorMutation,
    useResponderAprobacionPublicaMutation,
    useActualizarDatosRelacionadosContratoMutation,
    useUpdateContratoTrabajadorSnapshotBlockMutation,
    useGetHistorialContratoTrabajadorQuery,
    useCrearCopiaContratoMutation,
    useDispararConsultaAfpMutation,
    useGetConsultaAfpQuery,
    useLazyGetConsultaAfpQuery,
} = contratoTrabajadorApi;
