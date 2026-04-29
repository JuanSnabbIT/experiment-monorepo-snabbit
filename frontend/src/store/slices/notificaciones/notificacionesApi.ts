// API RTK Query para notificaciones in-app.

import RtkQueryService from '@/services/RtkQueryService';

export interface INotificacion {
    id: number;
    tipo: string;
    tipo_label: string;
    titulo: string;
    cuerpo: string;
    url_destino: string;
    leida: boolean;
    fecha_creacion: string;
    fecha_lectura: string | null;
    datos: Record<string, unknown>;
}

interface INoLeidasCount {
    no_leidas: number;
}

const notificacionesApi = RtkQueryService.injectEndpoints({
    endpoints: (builder) => ({
        getNotificaciones: builder.query<INotificacion[], void>({
            query: () => ({ url: '/api/notificaciones/', method: 'get' }),
            transformResponse: (response: INotificacion[] | { results: INotificacion[] }) => {
                if (Array.isArray(response)) return response;
                return response?.results || [];
            },
            providesTags: ['Notificaciones'],
        }),
        getNoLeidasCount: builder.query<INoLeidasCount, void>({
            query: () => ({ url: '/api/notificaciones/no-leidas-count/', method: 'get' }),
            providesTags: ['NotificacionesNoLeidas'],
        }),
        marcarLeida: builder.mutation<INotificacion, number>({
            query: (id) => ({
                url: `/api/notificaciones/${id}/marcar-leida/`,
                method: 'patch',
            }),
            invalidatesTags: ['Notificaciones', 'NotificacionesNoLeidas'],
        }),
        marcarTodasLeidas: builder.mutation<{ marcadas: number }, void>({
            query: () => ({
                url: '/api/notificaciones/marcar-todas-leidas/',
                method: 'post',
            }),
            invalidatesTags: ['Notificaciones', 'NotificacionesNoLeidas'],
        }),
    }),
});

export const {
    useGetNotificacionesQuery,
    useGetNoLeidasCountQuery,
    useMarcarLeidaMutation,
    useMarcarTodasLeidasMutation,
} = notificacionesApi;

export default notificacionesApi;
