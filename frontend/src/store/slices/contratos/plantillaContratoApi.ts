import {
    IEtiquetaPlantilla,
    IPlantillaContrato,
    ISeccionContratoGenerada,
    ISeccionPlantilla,
} from '@/interface/plantillaContrato.interface';
import RtkQueryService from '@/services/RtkQueryService';

const plantillaContratoApi = RtkQueryService.injectEndpoints({
    endpoints: (builder) => ({
        // ─── Plantillas CRUD ───
        getPlantillasContrato: builder.query<IPlantillaContrato[], void>({
            query: () => ({ url: '/api/plantillas-contrato/', method: 'get' }),
            providesTags: ['PlantillasContrato'],
        }),

        getDetallePlantilla: builder.query<IPlantillaContrato, number | string>({
            query: (id) => ({ url: `/api/plantillas-contrato/${id}/`, method: 'get' }),
            providesTags: (_result, _error, id) => [
                { type: 'PlantillasContrato', id: Number(id) },
            ],
        }),

        createPlantilla: builder.mutation<IPlantillaContrato, Partial<IPlantillaContrato>>({
            query: (data) => ({ url: '/api/plantillas-contrato/', method: 'post', data }),
            invalidatesTags: ['PlantillasContrato'],
        }),

        updatePlantilla: builder.mutation<
            IPlantillaContrato,
            { id: number | string; data: Partial<IPlantillaContrato> }
        >({
            query: ({ id, data }) => ({
                url: `/api/plantillas-contrato/${id}/`,
                method: 'PATCH',
                data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'PlantillasContrato', id: Number(id) },
                'PlantillasContrato',
            ],
        }),

        deletePlantilla: builder.mutation<void, number | string>({
            query: (id) => ({ url: `/api/plantillas-contrato/${id}/`, method: 'delete' }),
            invalidatesTags: ['PlantillasContrato'],
        }),

        duplicarPlantilla: builder.mutation<IPlantillaContrato, number | string>({
            query: (id) => ({
                url: `/api/plantillas-contrato/${id}/duplicar/`,
                method: 'post',
            }),
            invalidatesTags: ['PlantillasContrato'],
        }),

        // ─── Secciones de Plantilla (nested) ───
        createSeccionPlantilla: builder.mutation<
            ISeccionPlantilla,
            { plantillaId: number | string; data: Partial<ISeccionPlantilla> }
        >({
            query: ({ plantillaId, data }) => ({
                url: `/api/plantillas-contrato/${plantillaId}/secciones/`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, { plantillaId }) => [
                { type: 'PlantillasContrato', id: Number(plantillaId) },
            ],
        }),

        updateSeccionPlantilla: builder.mutation<
            ISeccionPlantilla,
            {
                plantillaId: number | string;
                seccionId: number | string;
                data: Partial<ISeccionPlantilla>;
            }
        >({
            query: ({ plantillaId, seccionId, data }) => ({
                url: `/api/plantillas-contrato/${plantillaId}/secciones/${seccionId}/`,
                method: 'PATCH',
                data,
            }),
            invalidatesTags: (_result, _error, { plantillaId }) => [
                { type: 'PlantillasContrato', id: Number(plantillaId) },
            ],
        }),

        deleteSeccionPlantilla: builder.mutation<
            void,
            { plantillaId: number | string; seccionId: number | string }
        >({
            query: ({ plantillaId, seccionId }) => ({
                url: `/api/plantillas-contrato/${plantillaId}/secciones/${seccionId}/`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, { plantillaId }) => [
                { type: 'PlantillasContrato', id: Number(plantillaId) },
            ],
        }),

        reordenarSeccionesPlantilla: builder.mutation<
            void,
            {
                plantillaId: number | string;
                secciones: { id: number; orden: number }[];
                bloques?: {
                    alcance?: number;
                    operacion?: number;
                    condiciones?: number;
                };
            }
        >({
            query: ({ plantillaId, secciones, bloques }) => ({
                url: `/api/plantillas-contrato/${plantillaId}/secciones/reordenar/`,
                method: 'post',
                data: bloques ? { secciones, bloques } : { secciones },
            }),
            invalidatesTags: (_result, _error, { plantillaId }) => [
                { type: 'PlantillasContrato', id: Number(plantillaId) },
            ],
        }),

        // ─── Etiquetas ───
        getEtiquetasPlantilla: builder.query<IEtiquetaPlantilla[], void>({
            query: () => ({ url: '/api/etiquetas-plantilla/', method: 'get' }),
            providesTags: ['EtiquetasPlantilla'],
        }),

        createEtiqueta: builder.mutation<IEtiquetaPlantilla, Partial<IEtiquetaPlantilla>>({
            query: (data) => ({ url: '/api/etiquetas-plantilla/', method: 'post', data }),
            invalidatesTags: ['EtiquetasPlantilla'],
        }),

        updateEtiqueta: builder.mutation<
            IEtiquetaPlantilla,
            { id: number | string; data: Partial<IEtiquetaPlantilla> }
        >({
            query: ({ id, data }) => ({
                url: `/api/etiquetas-plantilla/${id}/`,
                method: 'PATCH',
                data,
            }),
            invalidatesTags: ['EtiquetasPlantilla'],
        }),

        deleteEtiqueta: builder.mutation<void, number | string>({
            query: (id) => ({ url: `/api/etiquetas-plantilla/${id}/`, method: 'delete' }),
            invalidatesTags: ['EtiquetasPlantilla'],
        }),

        // ─── Secciones Generadas en Contrato ───
        getSeccionesGeneradas: builder.query<ISeccionContratoGenerada[], number | string>({
            query: (contratoId) => ({
                url: `/api/contratos/${contratoId}/secciones-generadas/`,
                method: 'get',
            }),
            providesTags: (_result, _error, contratoId) => [
                { type: 'SeccionesContratoGeneradas', id: Number(contratoId) },
            ],
        }),

        generarSeccionesContrato: builder.mutation<ISeccionContratoGenerada[], number | string>({
            query: (contratoId) => ({
                url: `/api/contratos/${contratoId}/generar-secciones/`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, contratoId) => [
                { type: 'SeccionesContratoGeneradas', id: Number(contratoId) },
            ],
        }),

        updateSeccionGenerada: builder.mutation<
            ISeccionContratoGenerada,
            {
                contratoId: number | string;
                seccionId: number | string;
                data: Partial<ISeccionContratoGenerada>;
            }
        >({
            query: ({ contratoId, seccionId, data }) => ({
                url: `/api/contratos/${contratoId}/secciones-generadas/${seccionId}/`,
                method: 'PATCH',
                data,
            }),
            invalidatesTags: (_result, _error, { contratoId }) => [
                { type: 'SeccionesContratoGeneradas', id: Number(contratoId) },
            ],
        }),
    }),
});

export const {
    useGetPlantillasContratoQuery,
    useGetDetallePlantillaQuery,
    useCreatePlantillaMutation,
    useUpdatePlantillaMutation,
    useDeletePlantillaMutation,
    useDuplicarPlantillaMutation,
    useCreateSeccionPlantillaMutation,
    useUpdateSeccionPlantillaMutation,
    useDeleteSeccionPlantillaMutation,
    useReordenarSeccionesPlantillaMutation,
    useGetEtiquetasPlantillaQuery,
    useCreateEtiquetaMutation,
    useUpdateEtiquetaMutation,
    useDeleteEtiquetaMutation,
    useGetSeccionesGeneradasQuery,
    useGenerarSeccionesContratoMutation,
    useUpdateSeccionGeneradaMutation,
} = plantillaContratoApi;

export default plantillaContratoApi;
