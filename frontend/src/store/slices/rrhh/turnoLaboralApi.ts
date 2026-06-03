import type { ITurnoLaboral, ITurnoLaboralWrite } from '@/interface/rrhh.interface';
import RtkQueryService from '@/services/RtkQueryService';

const BASE = '/api/rrhh/turnos-laborales';

export const turnoLaboralApi = RtkQueryService.injectEndpoints({
    overrideExisting: import.meta.env.DEV,
    endpoints: (builder) => ({
        getTurnosLaboral: builder.query<ITurnoLaboral[], { empresa_id?: string | number; activos?: boolean } | void>({
            query: (params) => {
                const qp = new URLSearchParams();
                if (params?.empresa_id) qp.set('empresa_id', String(params.empresa_id));
                if (params?.activos === false) qp.set('activos', 'false');
                const qs = qp.toString();
                return { url: `${BASE}/${qs ? `?${qs}` : ''}`, method: 'get' };
            },
            providesTags: (result) =>
                result
                    ? [
                          { type: 'TurnoLaboral' as const, id: 'LIST' },
                          ...result.map((t) => ({ type: 'TurnoLaboral' as const, id: t.id })),
                      ]
                    : [{ type: 'TurnoLaboral' as const, id: 'LIST' }],
        }),

        crearTurnoLaboral: builder.mutation<ITurnoLaboral, ITurnoLaboralWrite>({
            query: (data) => ({ url: `${BASE}/`, method: 'post', data }),
            invalidatesTags: [{ type: 'TurnoLaboral', id: 'LIST' }],
        }),

        editarTurnoLaboral: builder.mutation<ITurnoLaboral, { id: number } & Partial<ITurnoLaboralWrite>>({
            query: ({ id, ...data }) => ({ url: `${BASE}/${id}/`, method: 'patch', data }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'TurnoLaboral', id },
                { type: 'TurnoLaboral', id: 'LIST' },
            ],
        }),

        eliminarTurnoLaboral: builder.mutation<void, number>({
            query: (id) => ({ url: `${BASE}/${id}/`, method: 'delete' }),
            invalidatesTags: [{ type: 'TurnoLaboral', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetTurnosLaboralQuery,
    useCrearTurnoLaboralMutation,
    useEditarTurnoLaboralMutation,
    useEliminarTurnoLaboralMutation,
} = turnoLaboralApi;
