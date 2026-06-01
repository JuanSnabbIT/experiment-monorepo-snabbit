import { IEtiquetaPlantilla } from '@/interface/plantillaContrato.interface';
import {
    IBloqueTransversalContrato,
    ICreatePlantillaV2Payload,
    IPlantillaContratoV2,
    IPlantillaContratoV2List,
    IReordenarBloquesPayload,
    IReordenarSeccionesPayload,
    ISeccionPlantillaV2,
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
                url: '/api/plantillas-contrato-v2/',
                method: 'get',
                params: params ?? {},
            }),
            providesTags: ['PlantillaContratoV2List'],
        }),

        // ─── Detalle de plantilla V2 ─────────────────────────────────────
        getDetallePlantillaV2: builder.query<IPlantillaContratoV2, number | string>({
            query: (id) => ({ url: `/api/plantillas-contrato-v2/${id}/`, method: 'get' }),
            providesTags: (_result, _error, id) => [{ type: 'PlantillaContratoV2', id: Number(id) }],
        }),

        // ─── Crear plantilla V2 ──────────────────────────────────────────
        createPlantillaV2: builder.mutation<IPlantillaContratoV2, ICreatePlantillaV2Payload>({
            query: (data) => ({ url: '/api/plantillas-contrato-v2/', method: 'post', data }),
            invalidatesTags: ['PlantillaContratoV2List'],
        }),

        // ─── Actualizar plantilla V2 ─────────────────────────────────────
        updatePlantillaV2: builder.mutation<IPlantillaContratoV2, IUpdatePlantillaV2Payload>({
            query: ({ id, ...data }) => ({
                url: `/api/plantillas-contrato-v2/${id}/`,
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
            query: (id) => ({ url: `/api/plantillas-contrato-v2/${id}/`, method: 'delete' }),
            invalidatesTags: ['PlantillaContratoV2List'],
        }),

        // ─── Duplicar plantilla V2 ───────────────────────────────────────
        duplicarPlantillaV2: builder.mutation<IPlantillaContratoV2, number>({
            query: (id) => ({
                url: `/api/plantillas-contrato-v2/${id}/duplicar/`,
                method: 'post',
            }),
            invalidatesTags: ['PlantillaContratoV2List'],
        }),

        // ─── Reordenar secciones ─────────────────────────────────────────
        reordenarSeccionesV2: builder.mutation<void, IReordenarSeccionesPayload>({
            query: ({ plantillaId, orden }) => ({
                url: `/api/plantillas-contrato-v2/${plantillaId}/reordenar-secciones/`,
                method: 'post',
                data: orden,
            }),
            invalidatesTags: (_result, _error, { plantillaId }) => [
                { type: 'PlantillaContratoV2', id: plantillaId },
            ],
        }),

        // ─── Reordenar bloques transversales ─────────────────────────────
        reordenarBloquesV2: builder.mutation<IPlantillaContratoV2, IReordenarBloquesPayload>({
            query: ({ plantillaId, bloques }) => ({
                url: `/api/plantillas-contrato-v2/${plantillaId}/reordenar-bloques/`,
                method: 'post',
                data: bloques,
            }),
            invalidatesTags: (_result, _error, { plantillaId }) => [
                { type: 'PlantillaContratoV2', id: plantillaId },
                'PlantillaContratoV2List',
            ],
        }),

        // ─── CRUD secciones anidadas V2 ──────────────────────────────────
        getSeccionesPlantillaV2: builder.query<ISeccionPlantillaV2[], number | string>({
            query: (plantillaId) => ({
                url: `/api/plantillas-contrato-v2/${plantillaId}/secciones-v2/`,
                method: 'get',
            }),
            providesTags: (_result, _error, plantillaId) => [
                { type: 'SeccionPlantillaV2', id: Number(plantillaId) },
            ],
        }),

        createSeccionV2: builder.mutation<
            ISeccionPlantillaV2,
            { plantillaId: number; data: Partial<ISeccionPlantillaV2> }
        >({
            query: ({ plantillaId, data }) => ({
                url: `/api/plantillas-contrato-v2/${plantillaId}/secciones-v2/`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, { plantillaId }) => [
                { type: 'SeccionPlantillaV2', id: plantillaId },
                { type: 'PlantillaContratoV2', id: plantillaId },
            ],
        }),

        updateSeccionV2: builder.mutation<
            ISeccionPlantillaV2,
            { plantillaId: number; seccionId: number; data: Partial<ISeccionPlantillaV2> }
        >({
            query: ({ plantillaId, seccionId, data }) => ({
                url: `/api/plantillas-contrato-v2/${plantillaId}/secciones-v2/${seccionId}/`,
                method: 'PATCH',
                data,
            }),
            invalidatesTags: (_result, _error, { plantillaId }) => [
                { type: 'SeccionPlantillaV2', id: plantillaId },
                { type: 'PlantillaContratoV2', id: plantillaId },
            ],
        }),

        deleteSeccionV2: builder.mutation<void, { plantillaId: number; seccionId: number }>({
            query: ({ plantillaId, seccionId }) => ({
                url: `/api/plantillas-contrato-v2/${plantillaId}/secciones-v2/${seccionId}/`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, { plantillaId }) => [
                { type: 'SeccionPlantillaV2', id: plantillaId },
                { type: 'PlantillaContratoV2', id: plantillaId },
            ],
        }),

        // ─── Catálogo de bloques transversales ───────────────────────────
        getBloquesTransversales: builder.query<
            IBloqueTransversalContrato[],
            { tipo_contrato?: string } | void
        >({
            query: (params) => ({
                url: '/api/bloques-transversales/',
                method: 'get',
                params: params ?? {},
            }),
            providesTags: ['BloqueTransversal'],
        }),

        // ─── Etiquetas por tipo de contrato (V2) ─────────────────────────
        getEtiquetasV2: builder.query<IEtiquetaPlantilla[], { tipo_contrato?: string } | void>({
            query: (params) => ({
                url: '/api/etiquetas-plantilla-v2/',
                method: 'get',
                params: params ?? {},
            }),
            providesTags: ['EtiquetaPlantillaV2'],
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
    useReordenarSeccionesV2Mutation,
    useReordenarBloquesV2Mutation,
    useGetSeccionesPlantillaV2Query,
    useCreateSeccionV2Mutation,
    useUpdateSeccionV2Mutation,
    useDeleteSeccionV2Mutation,
    useGetBloquesTransversalesQuery,
    useGetEtiquetasV2Query,
} = plantillaContratoV2Api;

export default plantillaContratoV2Api;
