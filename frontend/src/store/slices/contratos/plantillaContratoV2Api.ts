import { IEtiquetaPlantilla } from '@/interface/plantillaContrato.interface';
import {
    ICreatePlantillaV2Payload,
    IPlantillaContratoV2,
    IPlantillaContratoV2List,
    IPreviewHtmlV29Payload,
    IPreviewHtmlV29Response,
    IUpdatePlantillaV2Payload
} from '@/interface/plantillaContratoV2.interface';
import RtkQueryService from '@/services/RtkQueryService';

const plantillaContratoV2Api = RtkQueryService.injectEndpoints({
    endpoints: (builder) => ({
        // ─── Listado de plantillas V2 ────────────────────────────────────
        getPlantillasV2: builder.query<
            IPlantillaContratoV2List[],
            { tipo_contrato?: string; scope?: string; empresa_cliente?: number } | void
        >({
            query: (params) => ({
                url: '/api/plantillas-contrato/',
                method: 'get',
                params: params ?? {},
            }),
            providesTags: ['PlantillaContratoV2List'],
        }),

        // ─── Detalle de plantilla V2 ─────────────────────────────────────
        getDetallePlantillaV2: builder.query<IPlantillaContratoV2, number | string>({
            query: (id) => ({ url: `/api/plantillas-contrato/${id}/`, method: 'get' }),
            providesTags: (_result, _error, id) => [{ type: 'PlantillaContratoV2', id: Number(id) }],
        }),

        // ─── Crear plantilla V2 ──────────────────────────────────────────
        createPlantillaV2: builder.mutation<IPlantillaContratoV2, ICreatePlantillaV2Payload>({
            query: (data) => ({ url: '/api/plantillas-contrato/', method: 'post', data }),
            invalidatesTags: ['PlantillaContratoV2List'],
        }),

        // ─── Actualizar plantilla V2 ─────────────────────────────────────
        updatePlantillaV2: builder.mutation<IPlantillaContratoV2, IUpdatePlantillaV2Payload>({
            query: ({ id, ...data }) => ({
                url: `/api/plantillas-contrato/${id}/`,
                method: 'PATCH',
                data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'PlantillaContratoV2', id },
                'PlantillaContratoV2List',
            ],
        }),

        // ─── Eliminar plantilla V2 ───────────────────────────────────────
        deletePlantillaV2: builder.mutation<void, number>({
            query: (id) => ({ url: `/api/plantillas-contrato/${id}/`, method: 'delete' }),
            invalidatesTags: ['PlantillaContratoV2List'],
        }),

        // ─── Duplicar plantilla V2 ───────────────────────────────────────
        duplicarPlantillaV2: builder.mutation<IPlantillaContratoV2, number>({
            query: (id) => ({
                url: `/api/plantillas-contrato/${id}/duplicar/`,
                method: 'post',
            }),
            invalidatesTags: ['PlantillaContratoV2List'],
        }),

        // ─── Catálogo de etiquetas del adaptador (V2.9) ──────────────────
        getEtiquetasCatalogo: builder.query<IEtiquetaPlantilla[], { tipo_contrato: string }>({
            query: (params) => ({
                url: '/api/etiquetas-disponibles/',
                method: 'get',
                params,
            }),
            providesTags: ['EtiquetasCatalogo'],
        }),

        // ─── Vista previa v2.9 (sin persistir) ───────────────────────────
        previewHtmlV29: builder.mutation<IPreviewHtmlV29Response, IPreviewHtmlV29Payload>({
            query: ({ plantillaId, ...data }) => ({
                url: `/api/plantillas-contrato/${plantillaId}/preview-html/`,
                method: 'post',
                data,
            }),
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetPlantillasV2Query,
    useGetDetallePlantillaV2Query,
    useCreatePlantillaV2Mutation,
    useUpdatePlantillaV2Mutation,
    useDeletePlantillaV2Mutation,
    useDuplicarPlantillaV2Mutation,
    useGetEtiquetasCatalogoQuery,
    usePreviewHtmlV29Mutation,
} = plantillaContratoV2Api;

export default plantillaContratoV2Api;
