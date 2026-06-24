import type { IConceptoFiniquito, IFiniquitoContrato } from '@/interface/rrhh.interface';
import RtkQueryService from '@/services/RtkQueryService';

const BASE = '/api/rrhh/finiquitos-contrato';

export const finiquitoApi = RtkQueryService.injectEndpoints({
    overrideExisting: import.meta.env.DEV,
    endpoints: (builder) => ({
        getFiniquitoPorContrato: builder.query<IFiniquitoContrato | null, number>({
            query: (contratoId) => ({ url: `${BASE}/?contrato=${contratoId}`, method: 'get' }),
            transformResponse: (r: IFiniquitoContrato[]) => r[0] ?? null,
            providesTags: (_r, _e, contratoId) => [{ type: 'Finiquito' as const, id: contratoId }],
        }),

        calcularFiniquito: builder.mutation<
            IFiniquitoContrato,
            { contrato_id: number; dias_vacaciones_tomados?: number; aviso_previo_30_dias?: boolean }
        >({
            query: (data) => ({ url: `${BASE}/calcular/`, method: 'post', data }),
            invalidatesTags: (_r, _e, { contrato_id }) => [
                { type: 'Finiquito' as const, id: contrato_id },
                { type: 'ContratoTrabajador' as const, id: contrato_id },
            ],
        }),

        actualizarConceptos: builder.mutation<
            IFiniquitoContrato,
            { id: number; conceptos: IConceptoFiniquito[] }
        >({
            query: ({ id, conceptos }) => ({
                url: `${BASE}/${id}/conceptos/`,
                method: 'patch',
                data: { conceptos },
            }),
            invalidatesTags: (r) =>
                r ? [{ type: 'Finiquito' as const, id: r.contrato }] : [],
        }),

        generarPdfFiniquito: builder.mutation<IFiniquitoContrato, number>({
            query: (id) => ({ url: `${BASE}/${id}/generar-pdf/`, method: 'post' }),
            invalidatesTags: (r) =>
                r ? [{ type: 'Finiquito' as const, id: r.contrato }] : [],
        }),

        regenerarPdfFiniquito: builder.mutation<IFiniquitoContrato, number>({
            query: (id) => ({ url: `${BASE}/${id}/regenerar-pdf/`, method: 'post' }),
            invalidatesTags: (r) =>
                r ? [{ type: 'Finiquito' as const, id: r.contrato }] : [],
        }),

        marcarFirmadoFiniquito: builder.mutation<
            IFiniquitoContrato,
            { id: number; fecha_firma?: string }
        >({
            query: ({ id, ...data }) => ({
                url: `${BASE}/${id}/marcar-firmado/`,
                method: 'post',
                data,
            }),
            invalidatesTags: (r) =>
                r ? [{ type: 'Finiquito' as const, id: r.contrato }] : [],
        }),

        marcarPagadoFiniquito: builder.mutation<IFiniquitoContrato, number>({
            query: (id) => ({ url: `${BASE}/${id}/marcar-pagado/`, method: 'post' }),
            invalidatesTags: (r) =>
                r ? [{ type: 'Finiquito' as const, id: r.contrato }] : [],
        }),

        eliminarFiniquito: builder.mutation<void, { id: number; contratoId: number }>({
            query: ({ id }) => ({ url: `${BASE}/${id}/`, method: 'delete' }),
            invalidatesTags: (_r, _e, { contratoId }) => [
                { type: 'Finiquito' as const, id: contratoId },
            ],
        }),

        aprobarFiniquito: builder.mutation<
            IFiniquitoContrato,
            { id: number; fecha_firma?: string; archivo_firmado?: File }
        >({
            query: ({ id, fecha_firma, archivo_firmado }) => {
                const formData = new FormData();
                if (fecha_firma) formData.append('fecha_firma', fecha_firma);
                if (archivo_firmado) formData.append('archivo_firmado', archivo_firmado);
                return { url: `${BASE}/${id}/aprobar/`, method: 'post', data: formData };
            },
            invalidatesTags: (r) =>
                r ? [{ type: 'Finiquito' as const, id: r.contrato }] : [],
        }),
    }),
});

export const {
    useGetFiniquitoPorContratoQuery,
    useCalcularFiniquitoMutation,
    useActualizarConceptosMutation,
    useGenerarPdfFiniquitoMutation,
    useRegenerarPdfFiniquitoMutation,
    useMarcarFirmadoFiniquitoMutation,
    useMarcarPagadoFiniquitoMutation,
    useEliminarFiniquitoMutation,
    useAprobarFiniquitoMutation,
} = finiquitoApi;
