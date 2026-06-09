import RtkQueryService from '@/services/RtkQueryService';

export interface IAfpCatalogo {
    id: number;
    nombre: string;
    empresa: number | null;
    activo: boolean;
    tasa_cotizacion?: number | null;
}

export interface IBancoCatalogo {
    id: number;
    nombre: string;
    empresa: number | null;
    activo: boolean;
}

export interface INacionalidadCatalogo {
    id: number;
    nombre: string;
    empresa: number | null;
    activo: boolean;
}

const AFP_BASE = '/api/rrhh/afp-catalogo';
const BANCO_BASE = '/api/rrhh/banco-catalogo';
const NACIONALIDAD_BASE = '/api/rrhh/nacionalidad-catalogo';

const buildCatalogoUrl = (
    base: string,
    params?: { search?: string; empresa_id?: string | number },
): string => {
    const qp = new URLSearchParams();
    if (params?.search) qp.set('search', params.search);
    if (params?.empresa_id) qp.set('empresa_id', String(params.empresa_id));
    const qs = qp.toString();
    return `${base}/${qs ? `?${qs}` : ''}`;
};

export const catalogosRrhhApi = RtkQueryService.injectEndpoints({
    overrideExisting: import.meta.env.DEV,
    endpoints: (builder) => ({
        getAfpCatalogo: builder.query<
            IAfpCatalogo[],
            { search?: string; empresa_id?: string | number } | void
        >({
            query: (params) => ({
                url: buildCatalogoUrl(AFP_BASE, params || undefined),
                method: 'get',
            }),
            providesTags: (result) =>
                result
                    ? [
                          { type: 'AfpCatalogo' as const, id: 'LIST' },
                          ...result.map((a) => ({ type: 'AfpCatalogo' as const, id: a.id })),
                      ]
                    : [{ type: 'AfpCatalogo' as const, id: 'LIST' }],
        }),

        crearAfpInline: builder.mutation<IAfpCatalogo, { nombre: string; empresa_id?: number }>({
            query: (data) => ({ url: `${AFP_BASE}/`, method: 'post', data }),
            invalidatesTags: [{ type: 'AfpCatalogo' as const, id: 'LIST' }],
        }),

        actualizarAfp: builder.mutation<
            IAfpCatalogo,
            { id: number; nombre?: string; tasa_cotizacion?: number | null }
        >({
            query: ({ id, ...data }) => ({ url: `${AFP_BASE}/${id}/`, method: 'patch', data }),
            invalidatesTags: (_r, _e, { id }) => [
                { type: 'AfpCatalogo', id },
                { type: 'AfpCatalogo', id: 'LIST' },
            ],
        }),

        eliminarAfp: builder.mutation<void, number>({
            query: (id) => ({ url: `${AFP_BASE}/${id}/`, method: 'delete' }),
            invalidatesTags: [{ type: 'AfpCatalogo', id: 'LIST' }],
        }),

        getBancoCatalogo: builder.query<
            IBancoCatalogo[],
            { search?: string; empresa_id?: string | number } | void
        >({
            query: (params) => ({
                url: buildCatalogoUrl(BANCO_BASE, params || undefined),
                method: 'get',
            }),
            providesTags: (result) =>
                result
                    ? [
                          { type: 'BancoCatalogo' as const, id: 'LIST' },
                          ...result.map((b) => ({ type: 'BancoCatalogo' as const, id: b.id })),
                      ]
                    : [{ type: 'BancoCatalogo' as const, id: 'LIST' }],
        }),

        crearBancoInline: builder.mutation<IBancoCatalogo, { nombre: string; empresa_id?: number }>({
            query: (data) => ({ url: `${BANCO_BASE}/`, method: 'post', data }),
            invalidatesTags: [{ type: 'BancoCatalogo' as const, id: 'LIST' }],
        }),

        actualizarBanco: builder.mutation<IBancoCatalogo, { id: number; nombre?: string }>({
            query: ({ id, ...data }) => ({ url: `${BANCO_BASE}/${id}/`, method: 'patch', data }),
            invalidatesTags: (_r, _e, { id }) => [
                { type: 'BancoCatalogo', id },
                { type: 'BancoCatalogo', id: 'LIST' },
            ],
        }),

        eliminarBanco: builder.mutation<void, number>({
            query: (id) => ({ url: `${BANCO_BASE}/${id}/`, method: 'delete' }),
            invalidatesTags: [{ type: 'BancoCatalogo', id: 'LIST' }],
        }),

        getNacionalidadCatalogo: builder.query<
            INacionalidadCatalogo[],
            { search?: string; empresa_id?: string | number } | void
        >({
            query: (params) => ({
                url: buildCatalogoUrl(NACIONALIDAD_BASE, params || undefined),
                method: 'get',
            }),
            providesTags: (result) =>
                result
                    ? [
                          { type: 'NacionalidadCatalogo' as const, id: 'LIST' },
                          ...result.map((n) => ({ type: 'NacionalidadCatalogo' as const, id: n.id })),
                      ]
                    : [{ type: 'NacionalidadCatalogo' as const, id: 'LIST' }],
        }),

        crearNacionalidadInline: builder.mutation<
            INacionalidadCatalogo,
            { nombre: string; empresa_id?: number }
        >({
            query: (data) => ({ url: `${NACIONALIDAD_BASE}/`, method: 'post', data }),
            invalidatesTags: [{ type: 'NacionalidadCatalogo' as const, id: 'LIST' }],
        }),
    }),
});

export const {
    useGetAfpCatalogoQuery,
    useCrearAfpInlineMutation,
    useActualizarAfpMutation,
    useEliminarAfpMutation,
    useGetBancoCatalogoQuery,
    useCrearBancoInlineMutation,
    useActualizarBancoMutation,
    useEliminarBancoMutation,
    useGetNacionalidadCatalogoQuery,
    useCrearNacionalidadInlineMutation,
} = catalogosRrhhApi;
