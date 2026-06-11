import type { IGrupoTurno, IGrupoTurnoWrite } from '@/interface/rrhh.interface';
import RtkQueryService from '@/services/RtkQueryService';

const BASE = '/api/rrhh/grupos-turno';

export const grupoTurnoApi = RtkQueryService.injectEndpoints({
    overrideExisting: import.meta.env.DEV,
    endpoints: (builder) => ({
        getGruposTurno: builder.query<IGrupoTurno[], { empresa_id?: number | '' } | void>({
            query: (params) => {
                const qp = new URLSearchParams();
                if (params?.empresa_id) qp.set('empresa_id', String(params.empresa_id));
                const qs = qp.toString();
                return { url: `${BASE}/${qs ? `?${qs}` : ''}`, method: 'get' };
            },
            providesTags: (result) =>
                result
                    ? [
                          { type: 'GrupoTurno' as const, id: 'LIST' },
                          ...result.map((g) => ({ type: 'GrupoTurno' as const, id: g.id })),
                      ]
                    : [{ type: 'GrupoTurno' as const, id: 'LIST' }],
        }),

        getGrupoTurnoById: builder.query<IGrupoTurno, number>({
            query: (id) => ({ url: `${BASE}/${id}/`, method: 'get' }),
            providesTags: (_r, _e, id) => [{ type: 'GrupoTurno' as const, id }],
        }),

        createGrupoTurno: builder.mutation<IGrupoTurno, IGrupoTurnoWrite>({
            query: (data) => ({ url: `${BASE}/`, method: 'post', data }),
            invalidatesTags: [{ type: 'GrupoTurno' as const, id: 'LIST' }],
        }),

        updateGrupoTurno: builder.mutation<IGrupoTurno, { id: number } & Partial<IGrupoTurnoWrite>>({
            query: ({ id, ...data }) => ({ url: `${BASE}/${id}/`, method: 'patch', data }),
            invalidatesTags: (_r, _e, { id }) => [
                { type: 'GrupoTurno' as const, id },
                { type: 'GrupoTurno' as const, id: 'LIST' },
            ],
        }),

        nuevaVersionGrupoTurno: builder.mutation<IGrupoTurno, number>({
            query: (id) => ({ url: `${BASE}/${id}/nueva-version/`, method: 'post' }),
            invalidatesTags: (_r, _e, id) => [
                { type: 'GrupoTurno' as const, id },
                { type: 'GrupoTurno' as const, id: 'LIST' },
            ],
        }),
    }),
});

export const {
    useGetGruposTurnoQuery,
    useGetGrupoTurnoByIdQuery,
    useCreateGrupoTurnoMutation,
    useUpdateGrupoTurnoMutation,
    useNuevaVersionGrupoTurnoMutation,
} = grupoTurnoApi;
