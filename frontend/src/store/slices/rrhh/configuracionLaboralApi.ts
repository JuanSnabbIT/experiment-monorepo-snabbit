import RtkQueryService from '@/services/RtkQueryService';

export interface IConfiguracionLaboral {
    id: number;
    clave: string;
    valor: number;
    descripcion: string;
    empresa: number | null;
    es_global: boolean;
}

export interface IConfiguracionLaboralWrite {
    clave: string;
    valor: number;
    descripcion?: string;
    empresa_id?: number;
}

const BASE = '/api/rrhh/configuracion-laboral';

export const configuracionLaboralApi = RtkQueryService.injectEndpoints({
    overrideExisting: import.meta.env.DEV,
    endpoints: (builder) => ({
        getConfiguracionLaboral: builder.query<
            IConfiguracionLaboral[],
            { empresa_id?: string | number } | void
        >({
            query: (params) => {
                const qp = new URLSearchParams();
                if (params?.empresa_id) qp.set('empresa_id', String(params.empresa_id));
                const qs = qp.toString();
                return { url: `${BASE}/${qs ? `?${qs}` : ''}`, method: 'get' };
            },
            providesTags: (result) =>
                result
                    ? [
                          { type: 'ConfiguracionLaboral' as const, id: 'LIST' },
                          ...result.map((c) => ({ type: 'ConfiguracionLaboral' as const, id: c.id })),
                      ]
                    : [{ type: 'ConfiguracionLaboral' as const, id: 'LIST' }],
        }),

        crearConfiguracionLaboral: builder.mutation<IConfiguracionLaboral, IConfiguracionLaboralWrite>({
            query: (data) => ({ url: `${BASE}/`, method: 'post', data }),
            invalidatesTags: [{ type: 'ConfiguracionLaboral', id: 'LIST' }],
        }),

        actualizarConfiguracionLaboral: builder.mutation<
            IConfiguracionLaboral,
            { id: number } & Partial<IConfiguracionLaboralWrite>
        >({
            query: ({ id, ...data }) => ({ url: `${BASE}/${id}/`, method: 'patch', data }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'ConfiguracionLaboral', id },
                { type: 'ConfiguracionLaboral', id: 'LIST' },
            ],
        }),

        eliminarConfiguracionLaboral: builder.mutation<void, number>({
            query: (id) => ({ url: `${BASE}/${id}/`, method: 'delete' }),
            invalidatesTags: [{ type: 'ConfiguracionLaboral', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetConfiguracionLaboralQuery,
    useCrearConfiguracionLaboralMutation,
    useActualizarConfiguracionLaboralMutation,
    useEliminarConfiguracionLaboralMutation,
} = configuracionLaboralApi;
