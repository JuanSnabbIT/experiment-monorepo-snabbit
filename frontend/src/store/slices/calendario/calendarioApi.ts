import { IDiaCalendario, ISolicitudVacaciones } from '@/interface/calendario.interface';
import RtkQueryService from '@/services/RtkQueryService';

export const calendarioApi = RtkQueryService.injectEndpoints({
    overrideExisting: false,
    endpoints: (builder) => ({
        getDiasCalendario: builder.query<IDiaCalendario[], void>({
            query: () => ({
                url: '/api/dias-calendario/',
                method: 'get',
            }),
            providesTags: ['DiasCalendarioList'],
        }),
        getSolicitudesVacacionesCalendario: builder.query<ISolicitudVacaciones[], void>({
            query: () => ({
                url: '/api/solicitudes-vacaciones/',
                method: 'get',
            }),
            providesTags: [{ type: 'SolicitudVacacionesList' as const, id: 'ALL' }],
        }),
    }),
});

export const {
    useGetDiasCalendarioQuery,
    useGetSolicitudesVacacionesCalendarioQuery,
} = calendarioApi;
