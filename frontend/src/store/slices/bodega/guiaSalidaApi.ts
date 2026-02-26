import { IGuiaSalida, IItemGuiaSalida, IStockItemEnBodega } from '@/interface/bodega.interface';
import RtkQueryService from '@/services/RtkQueryService';

export const guiaSalidaApi = RtkQueryService.injectEndpoints({
    endpoints: (builder) => ({
        getGuiasSalidaPorBodega: builder.query<IGuiaSalida[], number | string>({
            query: (id_bodega) => ({
                url: `/api/bodegas/${id_bodega}/guias-salida/`,
                method: 'get',
            }),
            providesTags: (result) =>
                result
                    ? [
                          ...result.map(({ id }) => ({ type: 'GuiaSalida' as const, id })),
                          { type: 'GuiaSalida', id: 'LIST' },
                      ]
                    : [{ type: 'GuiaSalida', id: 'LIST' }],
        }),
        getDetalleGuiaSalida: builder.query<IGuiaSalida, string | number>({
            query: (id) => ({
                url: `/api/guia-salida/${id}/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'GuiaSalida' as const, id }],
        }),
        getItemsGuiaSalida: builder.query<IItemGuiaSalida[], number | string>({
            query: (id) => ({
                url: `/api/guia-salida/${id}/items/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{ type: 'GuiaSalidaItems' as const, id }],
        }),
        getStockItemsEnBodega: builder.query<IStockItemEnBodega[], number | string>({
            query: (id_bodega) => ({
                url: `/api/bodegas/${id_bodega}/stock-items-en-bodega/`,
                method: 'get',
            }),
            providesTags: (_result, _error, id_bodega) => [
                { type: 'StockItems' as const, id: id_bodega },
            ],
        }),
        getOrdenesCompraDeStock: builder.query<
            any[],
            { id_bodega: number | string; id_stock: number | string }
        >({
            query: ({ id_bodega, id_stock }) => ({
                url: `/api/bodegas/${id_bodega}/stock-items-en-bodega/${id_stock}/ordenes-compra`,
                method: 'get',
            }),
            providesTags: (_result, _error, { id_stock }) => [
                { type: 'OrdenCompraItemsStock' as const, id: id_stock },
            ],
        }),
        agregarSerieStock: builder.mutation<
            IStockItemEnBodega,
            { id_bodega: number | string; id_stock: number | string; serie: string }
        >({
            query: ({ id_bodega, id_stock, serie }) => ({
                url: `/api/bodegas/${id_bodega}/stock-items-en-bodega/${id_stock}/agregar-serie/`,
                method: 'post',
                data: { serie },
            }),
            invalidatesTags: (_result, _error, { id_bodega, id_stock }) => [
                { type: 'StockItems' as const, id: id_bodega },
                { type: 'OrdenCompraItemsStock' as const, id: id_stock },
            ],
        }),
        eliminarSerieStock: builder.mutation<
            IStockItemEnBodega,
            { id_bodega: number | string; id_stock: number | string; serie: string }
        >({
            query: ({ id_bodega, id_stock, serie }) => ({
                url: `/api/bodegas/${id_bodega}/stock-items-en-bodega/${id_stock}/eliminar-serie/`,
                method: 'post',
                data: { serie },
            }),
            invalidatesTags: (_result, _error, { id_bodega, id_stock }) => [
                { type: 'StockItems' as const, id: id_bodega },
                { type: 'OrdenCompraItemsStock' as const, id: id_stock },
            ],
        }),
        createGuiaSalida: builder.mutation<
            IGuiaSalida,
            { bodega: number; cliente?: number; recibido_por?: number; motivo?: string }
        >({
            query: (body) => ({
                url: `/api/guia-salida/`,
                method: 'post',
                data: body,
            }),
            invalidatesTags: [{ type: 'GuiaSalida', id: 'LIST' }],
        }),
        updateGuiaSalida: builder.mutation<
            IGuiaSalida,
            {
                id: number | string;
                motivo?: string;
                recibido_por?: number;
                estado?: string;
                entregado_a?: string | number;
                firma_entrega?: string;
            }
        >({
            query: ({ id, ...body }) => ({
                url: `/api/guia-salida/${id}/`,
                method: 'patch',
                data: body,
            }),
            invalidatesTags: (result, _error, { id }) => {
                const baseTags = [
                    { type: 'GuiaSalida' as const, id },
                    { type: 'GuiaSalida' as const, id: 'LIST' },
                ];
                const ordenId = result?.orden_trabajo;
                const ordenTags = ordenId
                    ? ([
                          { type: 'OrdenTrabajo' as const, id: ordenId },
                          { type: 'OrdenTrabajoInsumos' as const, id: ordenId },
                      ] as const)
                    : [];
                return [...baseTags, ...ordenTags];
            },
        }),
        deleteGuiaSalida: builder.mutation<
            { detail: string; bodega_id?: number },
            number | string
        >({
            query: (id) => ({
                url: `/api/guia-salida/${id}/`,
                method: 'delete',
            }),
            invalidatesTags: (result) => {
                const tags: any[] = [
                    { type: 'GuiaSalida', id: 'LIST' },
                    { type: 'OrdenCompraItemsStock' as const },
                ];
                if (result?.bodega_id) {
                    tags.push({ type: 'StockItems', id: result.bodega_id });
                } else {
                    tags.push({ type: 'StockItems', id: 'LIST' });
                }
                return tags;
            },
        }),
        agregarItemGuia: builder.mutation<
            IItemGuiaSalida & { bodega_id?: number },
            {
                id_guia: number | string;
                stock_item_id: number;
                cantidad_rebajada: number;
                individualizado?: boolean;
            }
        >({
            query: ({ id_guia, ...body }) => ({
                url: `/api/guia-salida/${id_guia}/agregar-item/`,
                method: 'post',
                data: body,
            }),
            invalidatesTags: (result, _error, { id_guia }) => {
                const tags: any[] = [
                    { type: 'GuiaSalidaItems', id: id_guia },
                    { type: 'GuiaSalida', id: id_guia },
                ];
                // Invalidar con bodega_id específico si está disponible
                if (result?.bodega_id) {
                    tags.push({ type: 'StockItems', id: result.bodega_id });
                } else {
                    tags.push({ type: 'StockItems', id: 'LIST' });
                }
                return tags;
            },
        }),
        editarItemGuia: builder.mutation<
            IItemGuiaSalida & { bodega_id?: number },
            { id_guia: number | string; item_id: number | string; nueva_cantidad: number }
        >({
            query: ({ id_guia, item_id, nueva_cantidad }) => ({
                url: `/api/guia-salida/${id_guia}/items-guia/${item_id}/editar-item/`,
                method: 'patch',
                data: { nueva_cantidad },
            }),
            invalidatesTags: (result, _error, { id_guia }) => {
                const tags: any[] = [
                    { type: 'GuiaSalidaItems', id: id_guia },
                    { type: 'GuiaSalida', id: id_guia },
                ];
                // Invalidar con bodega_id específico si está disponible
                if (result?.bodega_id) {
                    tags.push({ type: 'StockItems', id: result.bodega_id });
                } else {
                    tags.push({ type: 'StockItems', id: 'LIST' });
                }
                return tags;
            },
        }),
        eliminarItemGuia: builder.mutation<
            { detail: string; bodega_id?: number },
            { id_guia: number | string; item_id: number | string }
        >({
            query: ({ id_guia, item_id }) => ({
                url: `/api/guia-salida/${id_guia}/items-guia/${item_id}/eliminar-item/`,
                method: 'delete',
            }),
            invalidatesTags: (result, _error, { id_guia }) => {
                const tags: any[] = [
                    { type: 'GuiaSalidaItems', id: id_guia },
                    { type: 'GuiaSalida', id: id_guia },
                ];
                // Invalidar con bodega_id específico si está disponible
                if (result?.bodega_id) {
                    tags.push({ type: 'StockItems', id: result.bodega_id });
                } else {
                    tags.push({ type: 'StockItems', id: 'LIST' });
                }
                return tags;
            },
        }),
        actualizarSerieItem: builder.mutation<
            { detail: string; data: { serie: string; modelo: string; object_id: number } },
            {
                id_guia: number | string;
                item_id: number | string;
                serie: string;
                id_bodega?: number | string;
                id_stock?: number | string;
            }
        >({
            query: ({ id_guia, item_id, serie }) => ({
                url: `/api/guia-salida/${id_guia}/items-guia/${item_id}/actualizar-serie/`,
                method: 'patch',
                data: { serie },
            }),
            invalidatesTags: (_result, _error, { id_guia, id_bodega, id_stock }) => [
                // String(id_guia) asegura coincidencia con el cache que usa string desde useParams
                { type: 'GuiaSalidaItems', id: String(id_guia) },
                // Invalidación específica del stock para refrescar lista de series disponibles
                id_stock
                    ? { type: 'OrdenCompraItemsStock' as const, id: id_stock }
                    : { type: 'OrdenCompraItemsStock' as const },
                // Invalidación específica de la bodega para refrescar el stock
                id_bodega
                    ? { type: 'StockItems' as const, id: id_bodega }
                    : { type: 'StockItems' as const, id: 'LIST' },
            ],
        }),
        aprobarGuia: builder.mutation<
            IGuiaSalida,
            { id: number | string; firma_recibido_por?: string; recibido_por?: string | number }
        >({
            query: ({ id, ...body }) => ({
                url: `/api/guia-salida/${id}/aprobar-guia/`,
                method: 'post',
                data: body,
            }),
            invalidatesTags: (result, _error, { id }) => {
                const baseTags = [
                    { type: 'GuiaSalida' as const, id },
                    { type: 'GuiaSalida' as const, id: 'LIST' },
                ];
                const ordenId = result?.orden_trabajo;
                const ordenTags = ordenId
                    ? ([
                          { type: 'OrdenTrabajo' as const, id: ordenId },
                          { type: 'OrdenTrabajoInsumos' as const, id: ordenId },
                      ] as const)
                    : [];
                return [...baseTags, ...ordenTags];
            },
        }),
        comprobarGuia: builder.mutation<IGuiaSalida, number | string>({
            query: (id) => ({
                url: `/api/guia-salida/${id}/comprobar-guia/`,
                method: 'post',
            }),
            invalidatesTags: (result, _error, id) => {
                const baseTags = [
                    { type: 'GuiaSalida' as const, id },
                    { type: 'GuiaSalida' as const, id: 'LIST' },
                ];
                const ordenId = result?.orden_trabajo;
                const ordenTags = ordenId
                    ? ([
                          { type: 'OrdenTrabajo' as const, id: ordenId },
                          { type: 'OrdenTrabajoInsumos' as const, id: ordenId },
                      ] as const)
                    : [];
                return [...baseTags, ...ordenTags];
            },
        }),
        confirmarRecepcion: builder.mutation<
            IGuiaSalida,
            {
                id: number | string;
                confirmado_por_id: number;
                firma?: string;
                items?: Array<{ item_guia_id: number; cantidad_a_devolver: number }>;
            }
        >({
            query: ({ id, ...body }) => ({
                url: `/api/guia-salida/${id}/confirmar-recepcion/`,
                method: 'post',
                data: body,
            }),
            invalidatesTags: (result, _error, { id }) => {
                const baseTags = [
                    { type: 'GuiaSalida' as const, id },
                    { type: 'GuiaSalida' as const, id: 'LIST' },
                    { type: 'GuiaSalidaItems' as const, id },
                ];
                const ordenId = result?.orden_trabajo;
                const ordenTags = ordenId
                    ? ([
                          { type: 'OrdenTrabajo' as const, id: ordenId },
                          { type: 'OrdenTrabajoInsumos' as const, id: ordenId },
                      ] as const)
                    : [];
                return [...baseTags, ...ordenTags];
            },
        }),
        volverPendiente: builder.mutation<IGuiaSalida, number | string>({
            query: (id) => ({
                url: `/api/guia-salida/${id}/volver-pendiente/`,
                method: 'post',
            }),
            invalidatesTags: (result, _error, id) => {
                const baseTags = [
                    { type: 'GuiaSalida' as const, id },
                    { type: 'GuiaSalida' as const, id: 'LIST' },
                ];
                const ordenId = result?.orden_trabajo;
                const ordenTags = ordenId
                    ? ([
                          { type: 'OrdenTrabajo' as const, id: ordenId },
                          { type: 'OrdenTrabajoInsumos' as const, id: ordenId },
                      ] as const)
                    : [];
                return [...baseTags, ...ordenTags];
            },
        }),
        devolverABodega: builder.mutation<
            IGuiaSalida,
            {
                id: number | string;
                items?: Array<{ item_guia_id: number; cantidad_a_devolver: number }>;
            }
        >({
            query: ({ id, items }) => ({
                url: `/api/guia-salida/${id}/devolver_a_bodega/`,
                method: 'post',
                data: items ? { items } : undefined,
            }),
            invalidatesTags: (result, _error, { id }) => {
                const baseTags = [
                    { type: 'GuiaSalida' as const, id },
                    { type: 'GuiaSalida' as const, id: 'LIST' },
                    { type: 'StockItems' as const, id: 'LIST' },
                    { type: 'GuiaSalidaItems' as const, id },
                ];
                const ordenId = result?.orden_trabajo;
                const ordenTags = ordenId
                    ? ([
                          { type: 'OrdenTrabajo' as const, id: ordenId },
                          { type: 'OrdenTrabajoInsumos' as const, id: ordenId },
                      ] as const)
                    : [];
                return [...baseTags, ...ordenTags];
            },
        }),

    }),
    overrideExisting: true,
});

export const {
    useGetGuiasSalidaPorBodegaQuery,
    useGetDetalleGuiaSalidaQuery,
    useGetItemsGuiaSalidaQuery,
    useGetStockItemsEnBodegaQuery,
    useGetOrdenesCompraDeStockQuery,
    useCreateGuiaSalidaMutation,
    useUpdateGuiaSalidaMutation,
    useDeleteGuiaSalidaMutation,
    useAgregarItemGuiaMutation,
    useEditarItemGuiaMutation,
    useEliminarItemGuiaMutation,
    useActualizarSerieItemMutation,
    useAprobarGuiaMutation,
    useComprobarGuiaMutation,
    useConfirmarRecepcionMutation,
    useVolverPendienteMutation,
    useDevolverABodegaMutation,
    useAgregarSerieStockMutation,
    useEliminarSerieStockMutation,
} = guiaSalidaApi;
