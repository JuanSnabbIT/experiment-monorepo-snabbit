import type {
    IContratoTrabajador,
    ICrearContratoConTrabajadorPayload,
    ICrearContratoConTrabajadorResponse,
    TEstadoContrato,
    TMotivoTerminoContrato,
} from '@/interface/rrhh.interface';
import RtkQueryService from '@/services/RtkQueryService';

const BASE = '/api/rrhh/contratos-trabajador';

export const contratoTrabajadorApi = RtkQueryService.injectEndpoints({
    overrideExisting: false,
    endpoints: (builder) => ({
        getContratosPorUsuarioEmpresa: builder.query<IContratoTrabajador[], number | string>({
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

        getContratosPorEmpresaCliente: builder.query<IContratoTrabajador[], number | string>({
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
    }),
});

export const {
    useGetContratosPorUsuarioEmpresaQuery,
    useGetContratosPorEmpresaClienteQuery,
    useGetContratoTrabajadorDetalleQuery,
    useCreateContratoTrabajadorMutation,
    useUpdateContratoTrabajadorMutation,
    useCambiarEstadoContratoTrabajadorMutation,
    useCrearContratoConTrabajadorMutation,
} = contratoTrabajadorApi;
