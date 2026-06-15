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

export const vacacionesApi = RtkQueryService.injectEndpoints({
    overrideExisting: false,
    endpoints: (builder) => ({
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
            ],
        }),
    }),
});

export const {
    useGetSolicitudesVacacionesPorUsuarioQuery,
    useCrearSolicitudVacacionesMutation,
} = vacacionesApi;
