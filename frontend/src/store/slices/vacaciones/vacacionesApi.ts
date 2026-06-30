import { ISolicitudVacaciones } from '@/interface/calendario.interface';
import RtkQueryService from '@/services/RtkQueryService';

interface ICrearSolicitudVacacionesPayload {
    usuario_empresa: number | string;
    fecha_inicio: string;
    fecha_fin: string;
    es_extraordinaria: boolean;
    comentario: string;
    creado_por?: number | string;
}

interface IActualizarSolicitudVacacionesPayload {
    id: number | string;
    data: Record<string, unknown>;
}

interface IEliminarSolicitudVacacionesPayload {
    id: number | string;
}

interface IFirmarSolicitudVacacionesPayload {
    id: number | string;
    firma_usuario: string;
}

export const vacacionesApi = RtkQueryService.injectEndpoints({
    overrideExisting: false,
    endpoints: (builder) => ({
        // ── Queries ────────────────────────────────────────────────────────────
        getSolicitudesVacacionesPorUsuario: builder.query<
            ISolicitudVacaciones[],
            number | string
        >({
            query: (usuarioEmpresaId) => ({
                url: `/api/solicitudes-vacaciones/por-usuario/?usuario_empresa=${usuarioEmpresaId}`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [
                { type: 'SolicitudVacacionesList' as const, id },
            ],
        }),
        getSolicitudesVacaciones: builder.query<ISolicitudVacaciones[], void>({
            query: () => ({
                url: '/api/solicitudes-vacaciones/',
                method: 'get',
            }),
            providesTags: [{ type: 'SolicitudVacacionesList' as const, id: 'ALL' }],
        }),
        getMisSolicitudesVacaciones: builder.query<ISolicitudVacaciones[], void>({
            query: () => ({
                url: '/api/solicitudes-vacaciones/mis-solicitudes/',
                method: 'get',
            }),
            providesTags: [{ type: 'SolicitudVacacionesList' as const, id: 'MIS' }],
        }),
        getDetalleSolicitudVacaciones: builder.query<ISolicitudVacaciones, number | string>({
            query: (id) => ({
                url: `/api/solicitudes-vacaciones/${id}/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [
                { type: 'SolicitudVacaciones' as const, id },
            ],
        }),
        // ── Mutations ──────────────────────────────────────────────────────────
        crearSolicitudVacaciones: builder.mutation<
            ISolicitudVacaciones,
            ICrearSolicitudVacacionesPayload
        >({
            query: (data) => ({
                url: `/api/solicitudes-vacaciones/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { usuario_empresa }) => [
                { type: 'SolicitudVacacionesList' as const, id: usuario_empresa },
                { type: 'SolicitudVacacionesList' as const, id: 'ALL' },
            ],
        }),
        actualizarSolicitudVacaciones: builder.mutation<
            ISolicitudVacaciones,
            IActualizarSolicitudVacacionesPayload
        >({
            query: ({ id, data }) => ({
                url: `/api/solicitudes-vacaciones/${id}/`,
                method: 'patch',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'SolicitudVacacionesList' as const, id: 'ALL' },
                { type: 'SolicitudVacacionesList' as const, id: 'MIS' },
                { type: 'SolicitudVacaciones' as const, id },
            ],
        }),
        eliminarSolicitudVacaciones: builder.mutation<void, IEliminarSolicitudVacacionesPayload>({
            query: ({ id }) => ({
                url: `/api/solicitudes-vacaciones/${id}/`,
                method: 'delete',
            }),
            invalidatesTags: [{ type: 'SolicitudVacacionesList' as const, id: 'ALL' }],
        }),
        firmarSolicitudVacaciones: builder.mutation<
            ISolicitudVacaciones,
            IFirmarSolicitudVacacionesPayload
        >({
            query: ({ id, firma_usuario }) => ({
                url: `/api/solicitudes-vacaciones/${id}/`,
                method: 'patch',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ firma_usuario }),
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'SolicitudVacacionesList' as const, id: 'MIS' },
                { type: 'SolicitudVacaciones' as const, id },
            ],
        }),
    }),
});

export const {
    useGetSolicitudesVacacionesPorUsuarioQuery,
    useGetSolicitudesVacacionesQuery,
    useGetMisSolicitudesVacacionesQuery,
    useGetDetalleSolicitudVacacionesQuery,
    useCrearSolicitudVacacionesMutation,
    useActualizarSolicitudVacacionesMutation,
    useEliminarSolicitudVacacionesMutation,
    useFirmarSolicitudVacacionesMutation,
} = vacacionesApi;
