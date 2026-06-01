import type {
    IAnexoContrato,
    IContratoTrabajador,
    IContratoTrabajadorHistorialEvento,
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
                          { type: 'ContratoTrabajadorList', id: `EC-${empresaClienteId}` },
                          ...result.map((c) => ({
                              type: 'ContratoTrabajador' as const,
                              id: c.id,
                          })),
                      ]
                    : [{ type: 'ContratoTrabajadorList', id: `EC-${empresaClienteId}` }],
        }),

        getContratoTrabajadorDetalle: builder.query<IContratoTrabajador, number | string>({
            query: (id) => ({ url: `${BASE}/${id}/`, method: 'get' }),
            providesTags: (_r, _e, id) => [{ type: 'ContratoTrabajador', id }],
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
            invalidatesTags: (_r, _e, arg) => {
                const tags: Array<{ type: 'ContratoTrabajadorList' | 'ClienteUsuarios'; id: string | number }> = [
                    { type: 'ContratoTrabajadorList', id: 'LIST' },
                ];
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
                result ? [{ type: 'AnexoContrato' as const, id: `C-${result.contrato}` }] : [],
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

        aceptarContratoTrabajador: builder.mutation<IContratoTrabajador, number | string>({
            query: (id) => ({ url: `${BASE}/${id}/aceptar/`, method: 'post' }),
            invalidatesTags: (_r, _e, id) => [
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
    }),
});

export const {
    useGetContratosTrabajadorQuery,
    useGetContratosTrabajadorPorUsuarioEmpresaQuery,
    useGetContratosTrabajadorPorEmpresaClienteQuery,
    useGetContratoTrabajadorDetalleQuery,
    useCreateContratoTrabajadorMutation,
    useUpdateContratoTrabajadorMutation,
    useCambiarEstadoContratoTrabajadorMutation,
    useCrearContratoConTrabajadorMutation,
    useGenerarPdfContratoTrabajadorMutation,
    useSubirPdfContratoTrabajadorMutation,
    useGetAnexosContratoQuery,
    useCrearAnexoContratoMutation,
    useActualizarAnexoContratoMutation,
    useEnviarAprobacionEmpleadorMutation,
    useGetEstadoAprobacionEmpleadorQuery,
    useAceptarContratoTrabajadorMutation,
    useResponderAprobacionPublicaMutation,
    useActualizarDatosRelacionadosContratoMutation,
    useGetHistorialContratoTrabajadorQuery,
    useCrearCopiaContratoMutation,
} = contratoTrabajadorApi;
