import {
    IEmpresa,
    IRelacionEmpresa,
    ISucursalEmpresa,
    IUltimasActividadesUsuarioEmpresa,
    IUsuarioEmpresa,
} from '@/interface/empresas.interface';
import RtkQueryService from '@/services/RtkQueryService';

export const empresaApi = RtkQueryService.injectEndpoints({
    overrideExisting: false,
    endpoints: (builder) => ({
        getEmpresas: builder.query<IEmpresa[], void>({
            query: () => ({ url: '/api/empresas/', method: 'get' }),
            providesTags: (result) =>
                result
                    ? [
                          { type: 'Empresas' as const, id: 'LIST' },
                          ...result.map((empresa) => ({ type: 'Empresa' as const, id: empresa.id })),
                      ]
                    : [{ type: 'Empresas' as const, id: 'LIST' }],
        }),
        getDetalleEmpresa: builder.query<IEmpresa, number | string>({
            query: (id) => ({ url: `/api/empresas/${id}/`, method: 'get' }),
            providesTags: (_result, _error, id) => [{ type: 'Empresa', id }],
        }),
        createEmpresa: builder.mutation<IEmpresa, Partial<IEmpresa>>({
            query: (data) => ({
                url: '/api/empresas/',
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: [{ type: 'Empresas', id: 'LIST' }],
        }),
        updateEmpresa: builder.mutation<
            IEmpresa,
            { id: number | string; data: Partial<IEmpresa> }
        >({
            query: ({ id, data }) => ({
                url: `/api/empresas/${id}/`,
                method: 'patch',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Empresa', id },
                { type: 'Empresas', id: 'LIST' },
            ],
        }),
        deleteEmpresa: builder.mutation<void, number | string>({
            query: (id) => ({
                url: `/api/empresas/${id}/`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: 'Empresa', id },
                { type: 'Empresas', id: 'LIST' },
            ],
        }),
        getSucursalesEmpresa: builder.query<ISucursalEmpresa[], number | string | undefined>({
            query: (id_empresa) => ({
                url: `/api/empresas/${id_empresa}/sucursales/`,
                method: 'get',
            }),
            providesTags: (_result, _error, empresaId) => [
                { type: 'Sucursales', id: empresaId ?? 'LIST' },
            ],
        }),
        getDetalleSucursal: builder.query<
            ISucursalEmpresa,
            { id_empresa: number | string; id_sucursal: number | string }
        >({
            query: ({ id_empresa, id_sucursal }) => ({
                url: `/api/empresas/${id_empresa}/sucursales-empresa/${id_sucursal}/`,
                method: 'get',
            }),
            providesTags: (_result, _error, { id_sucursal }) => [
                { type: 'Sucursal', id: id_sucursal },
            ],
        }),
        createSucursal: builder.mutation<
            ISucursalEmpresa,
            { id_empresa: number | string; data: Partial<ISucursalEmpresa> }
        >({
            query: ({ id_empresa, data }) => ({
                url: `/api/empresas/${id_empresa}/sucursales-empresa/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { id_empresa }) => [
                { type: 'Sucursales', id: id_empresa },
            ],
        }),
        updateSucursal: builder.mutation<
            ISucursalEmpresa,
            { id_empresa: number | string; id_sucursal: number | string; data: Partial<ISucursalEmpresa> }
        >({
            query: ({ id_empresa, id_sucursal, data }) => ({
                url: `/api/empresas/${id_empresa}/sucursales-empresa/${id_sucursal}/`,
                method: 'patch',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { id_empresa, id_sucursal }) => [
                { type: 'Sucursales', id: id_empresa },
                { type: 'Sucursal', id: id_sucursal },
            ],
        }),
        getUsuariosEmpresa: builder.query<IUsuarioEmpresa[], void>({
            query: () => ({ url: '/api/usuarios-empresa/', method: 'get' }),
            providesTags: [{ type: 'UsuariosEmpresa', id: 'LIST' }],
        }),
        getUsuarioDetallePorUser: builder.query<IUsuarioEmpresa, string | number>({
            query: (usuario_id) => ({
                url: `/api/usuarios-empresa/detalle-usuario/?usuario_id=${usuario_id}`,
                method: 'get',
            }),
            providesTags: (result) =>
                result ? [{ type: 'UsuarioEmpresa', id: result.id }] : [],
        }),
        getUltimasActividadesUsuario: builder.query<
            IUltimasActividadesUsuarioEmpresa[],
            number
        >({
            query: (id_usuario_empresa) => ({
                url: `/api/usuarios-empresa/${id_usuario_empresa}/ultimas-actividades/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id_usuario_empresa) => [
                { type: 'UsuarioActividades' as const, id: id_usuario_empresa },
            ],
        }),
        getSelectEmpresas: builder.query<IEmpresa[], void>({
            query: () => ({
                url: '/api/empresas/select-empresas',
                method: 'get',
            }),
            providesTags: [{ type: 'Empresas', id: 'SELECT' }],
        }),
        getMisClientes: builder.query<IRelacionEmpresa[], number | string | undefined>({
            query: (id_empresa) => ({
                url: `/api/empresas/${id_empresa}/mis-clientes`,
                method: 'get',
            }),
            providesTags: (result, _error, id_empresa) =>
                result
                    ? [
                          { type: 'Clientes' as const, id: id_empresa ?? 'LIST' },
                          ...result.map((cliente) => ({
                              type: 'Cliente' as const,
                              id: cliente.id,
                          })),
                      ]
                    : [{ type: 'Clientes' as const, id: id_empresa ?? 'LIST' }],
        }),
        getMisProspectos: builder.query<IRelacionEmpresa[], number | string | undefined>({
            query: (id_empresa) => ({
                url: `/api/empresas/${id_empresa}/mis-prospectos/`,
                method: 'get',
            }),
            providesTags: (result, _error, id_empresa) =>
                result
                    ? [
                          { type: 'Clientes' as const, id: `PROSPECTOS-${id_empresa ?? 'LIST'}` },
                          ...result.map((cliente) => ({
                              type: 'Cliente' as const,
                              id: cliente.id,
                          })),
                      ]
                    : [{ type: 'Clientes' as const, id: `PROSPECTOS-${id_empresa ?? 'LIST'}` }],
        }),
        getDetalleCliente: builder.query<IRelacionEmpresa, number | string>({
            query: (id_relacion) => ({
                url: `/api/relaciones-empresa/${id_relacion}/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id_relacion) => [{ type: 'Cliente' as const, id: id_relacion }],
        }),
        getUsuariosCliente: builder.query<
            IUsuarioEmpresa[],
            { id_empresa: number | string; id_sucursal: number | string }
        >({
            query: ({ id_empresa, id_sucursal }) => ({
                url: `/api/empresas/${id_empresa}/sucursales-empresa/${id_sucursal}/usuarios/`,
                method: 'get',
            }),
            providesTags: (_result, _error, { id_sucursal }) => [
                { type: 'ClienteUsuarios' as const, id: id_sucursal },
            ],
        }),
        getUsuariosTodaLaEmpresa: builder.query<IUsuarioEmpresa[], number | string>({
            query: (id_empresa) => ({
                url: `/api/empresas/${id_empresa}/usuarios/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id_empresa) => [
                { type: 'UsuariosEmpresa', id: id_empresa },
            ],
        }),
        getUsuariosTodoElCliente: builder.query<IUsuarioEmpresa[], number | string>({
            query: (id_empresa) => ({
                url: `/api/empresas/${id_empresa}/usuarios/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id_empresa) => [
                { type: 'ClienteUsuarios' as const, id: id_empresa },
            ],
        }),
        getUsuariosEmpresaYCliente: builder.query<
            IUsuarioEmpresa[],
            { ids_empresa: number[] }
        >({
            query: ({ ids_empresa }) => ({
                url: `/api/usuarios-empresa/usuarios_por_empresas/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ empresa_ids: ids_empresa }),
            }),
            providesTags: [{ type: 'UsuariosEmpresaYCliente' as const, id: 'LIST' }],
        }),
        getUsuariosDeMisClientes: builder.query<
            IUsuarioEmpresa[],
            number | string | undefined
        >({
            query: (id_empresa) => ({
                url: `/api/empresas/${id_empresa}/usuarios-de-clientes/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id_empresa) => [
                { type: 'Clientes' as const, id: id_empresa ?? 'MIS_USERS' },
            ],
        }),

        // ─── Detalle de usuario de cliente ───
        getDetalleUsuarioCliente: builder.query<IUsuarioEmpresa, number | string>({
            query: (usuarioEmpresaId) => ({
                url: `/api/usuarios-empresa/detalle-usuario-cliente/${usuarioEmpresaId}/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [
                { type: 'ClienteUsuarios' as const, id },
            ],
        }),
    }),
});

export const {
    useGetEmpresasQuery,
    useGetDetalleEmpresaQuery,
    useCreateEmpresaMutation,
    useUpdateEmpresaMutation,
    useDeleteEmpresaMutation,
    useGetSucursalesEmpresaQuery,
    useGetDetalleSucursalQuery,
    useCreateSucursalMutation,
    useUpdateSucursalMutation,
    useGetUsuariosEmpresaQuery,
    useGetUsuarioDetallePorUserQuery,
    useGetUltimasActividadesUsuarioQuery,
    useGetSelectEmpresasQuery,
    useGetMisClientesQuery,
    useGetMisProspectosQuery,
    useGetDetalleClienteQuery,
    useGetUsuariosClienteQuery,
    useGetUsuariosTodaLaEmpresaQuery,
    useGetUsuariosTodoElClienteQuery,
    useGetUsuariosEmpresaYClienteQuery,
    useGetUsuariosDeMisClientesQuery,
    useGetDetalleUsuarioClienteQuery,
} = empresaApi;
