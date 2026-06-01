import RtkQueryService from '@/services/RtkQueryService';

export interface IAfpCatalogo {
    id: number;
    nombre: string;
    empresa: number | null;
    activo: boolean;
}

export interface IBancoCatalogo {
    id: number;
    nombre: string;
    empresa: number | null;
    activo: boolean;
}

const AFP_BASE = '/api/rrhh/afp-catalogo';
const BANCO_BASE = '/api/rrhh/banco-catalogo';

export const catalogosRrhhApi = RtkQueryService.injectEndpoints({
    overrideExisting: import.meta.env.DEV,
    endpoints: (builder) => ({
        getAfpCatalogo: builder.query<IAfpCatalogo[], { search?: string } | void>({
            query: (params) => {
                const search = (params as { search?: string })?.search;
                const url = search ? `${AFP_BASE}/?search=${encodeURIComponent(search)}` : `${AFP_BASE}/`;
                return { url, method: 'get' };
            },
            providesTags: [{ type: 'AfpCatalogo' as const, id: 'LIST' }],
        }),

        crearAfpInline: builder.mutation<IAfpCatalogo, { nombre: string }>({
            query: (data) => ({ url: `${AFP_BASE}/`, method: 'post', data }),
            invalidatesTags: [{ type: 'AfpCatalogo' as const, id: 'LIST' }],
        }),

        getBancoCatalogo: builder.query<IBancoCatalogo[], { search?: string } | void>({
            query: (params) => {
                const search = (params as { search?: string })?.search;
                const url = search ? `${BANCO_BASE}/?search=${encodeURIComponent(search)}` : `${BANCO_BASE}/`;
                return { url, method: 'get' };
            },
            providesTags: [{ type: 'BancoCatalogo' as const, id: 'LIST' }],
        }),

        crearBancoInline: builder.mutation<IBancoCatalogo, { nombre: string }>({
            query: (data) => ({ url: `${BANCO_BASE}/`, method: 'post', data }),
            invalidatesTags: [{ type: 'BancoCatalogo' as const, id: 'LIST' }],
        }),
    }),
});

export const {
    useGetAfpCatalogoQuery,
    useCrearAfpInlineMutation,
    useGetBancoCatalogoQuery,
    useCrearBancoInlineMutation,
} = catalogosRrhhApi;
