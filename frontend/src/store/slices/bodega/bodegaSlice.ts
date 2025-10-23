import { IBodega, IItemEnOrdenCompra, IItemOrdenCompraEnStock, IItemGuiaSalida, IOrdenCompra, IGuiaSalida, IStockItemEnBodega, IEventoOc, ICompra, IItemEnCompra, IMovimientoStock, ITomaInventario, IItemEnTomaInventario, IEstadoTomaInventario } from "@/interface/bodega.interface"
import ApiService from "@/services/ApiService"
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"


export interface BodegaState {
    loading: boolean
    error: string | undefined
    listaBodegas: IBodega[]
    listaOrdenesCompra: IOrdenCompra[]
    detalleOrdenCompra: IOrdenCompra | undefined
    listaGuiaSalidaBodega: IGuiaSalida[]
    listaStockItemsEnBodega: IStockItemEnBodega[]
    detalleGuiaSalidaBodega: IGuiaSalida | undefined
    listaItemsEnGuiaSalidaBodega: IItemGuiaSalida[]
    listaMisOrdenesDeCompra: IOrdenCompra[]
    listaItemsEnOrdenCompra: IItemEnOrdenCompra[]
    listaBodegasPorEmpresa: IBodega[]
    listaItemsOrdenCompraEnStock: IItemOrdenCompraEnStock[]
    eventosOc: IEventoOc[]
    detalleBodega: IBodega | undefined
    listaGuiaSalidaPorBodega: IGuiaSalida[]
    listaComprasDeStock: IItemOrdenCompraEnStock[]
    listaCompras: ICompra[]
    detalleCompra: ICompra | undefined
    listaItemsCompra: IItemEnCompra[]
    listaMovimientosStock: IMovimientoStock[]
    listaTomaInventario: ITomaInventario[]
    detalleTomaInventario: ITomaInventario | undefined
    listaItemsEnTomaInventario: IItemEnTomaInventario[]
    listaEstadosTomaInventario: IEstadoTomaInventario[]
    buscarItemEnTomaInventario: IItemEnTomaInventario[]
    listaGuiasSalidasDisponibles: IGuiaSalida[]
}

const initialState: BodegaState = {
    loading: false,
    error: undefined,
    listaBodegas: [],
    listaOrdenesCompra: [],
    detalleOrdenCompra: undefined,
    listaGuiaSalidaBodega: [],
    listaStockItemsEnBodega: [],
    detalleGuiaSalidaBodega: undefined,
    listaItemsEnGuiaSalidaBodega: [],
    listaMisOrdenesDeCompra: [],
    listaItemsEnOrdenCompra: [],
    listaBodegasPorEmpresa: [],
    listaItemsOrdenCompraEnStock: [],
    eventosOc: [],
    detalleBodega: undefined,
    listaGuiaSalidaPorBodega: [],
    listaComprasDeStock: [],
    listaCompras: [],
    detalleCompra: undefined,
    listaItemsCompra: [],
    listaMovimientosStock: [],
    listaTomaInventario: [],
    detalleTomaInventario: undefined,
    listaItemsEnTomaInventario: [],
    listaEstadosTomaInventario: [],
    buscarItemEnTomaInventario: [],
    listaGuiasSalidasDisponibles: []
}

export const listaGuiasSalidasDisponiblesThunk = createAsyncThunk<IGuiaSalida[], {id_empresa: number | string | undefined}, {rejectValue: string}>(
    'bodega/listaGuiasSalidasDisponiblesThunk',
    async ({id_empresa}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IGuiaSalida[]>({url: `/api/guia-salida/${id_empresa}/disponibles`})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const buscarItemEnTomaInventarioThunk = createAsyncThunk<IItemEnTomaInventario[], {filtro: URLSearchParams}, {rejectValue: string}>(
    'bodega/buscarItemEnTomaInventarioThunk',
    async ({filtro}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IItemEnTomaInventario[]>({url: `/api/items-en-toma-inventario/buscar`, method: 'get', params: filtro})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data || "Error al encontrar el item en toma inventario")
        }
    }
)

export const listaEstadosTomaInventarioThunk = createAsyncThunk<IEstadoTomaInventario[], {id_toma: string | number | undefined}, {rejectValue: string}>(
    'bodega/listaEstadosTomaInventarioThunk',
    async ({id_toma}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IEstadoTomaInventario[]>({url: `/api/tomas-inventario/${id_toma}/estados`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data || "Error al obtener los estados de toma de inventario")
        }
    }
)

export const listaItemsEnTomaInventarioThunk = createAsyncThunk<IItemEnTomaInventario[], {id_toma: string | number | undefined}, {rejectValue: string}>(
    'bodega/listaItemsEnTomaInventarioThunk',
    async ({id_toma}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IItemEnTomaInventario[]>({url: `/api/tomas-inventario/${id_toma}/items/`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data || "Error al obtener los items de toma de inventario")
        }
    }
)

export const detalleTomaInventarioThunk = createAsyncThunk<ITomaInventario, {id_toma: string | number | undefined}, {rejectValue: string}>(
    'bodega/detalleTomaInventarioThunk',
    async ({id_toma}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<ITomaInventario>({url: `/api/tomas-inventario/${id_toma}/`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data || "Error al obtener la toma del inventario")
        }
    }
)

export const listaTomaInventarioFiltroThunk = createAsyncThunk<[], {filtro: URLSearchParams}, {rejectValue: string}>(
    'bodega/listaTomaInventarioFiltroThunk',
    async ({filtro}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<[]>({url: `/api/tomas-inventario`, method: 'get', params: filtro})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data || "Error al obtener la lista de tomas de inventarios")
        }
    }
)

export const listaTomaInventarioThunk = createAsyncThunk<ITomaInventario[], undefined, {rejectValue: string}>(
    'bodega/listaTomaInventarioThunk',
    async (_, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<ITomaInventario[]>({url: `/api/tomas-inventario`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data || "Error al obtener la lista de tomas de inventarios")
        }
    }
)

export const listaMovimientosStockThunk = createAsyncThunk<IMovimientoStock[], {id_item: number | string | undefined, id_empresa: string | number | undefined}, {rejectValue: string}>(
    'bodega/listaMovimientosStockThunk',
    async ({id_item, id_empresa}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IMovimientoStock[]>({url: `/api/empresas/${id_empresa}/items-empresa/${id_item}/movimientos/`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data || "Error al obtener la lista de movimientos")
        }
    }
)

export const listaItemsCompraThunk = createAsyncThunk<IItemEnCompra[], {id_compra: string | number | undefined}, {rejectValue: string}>(
    'bodega/listaItemsCompraThunk',
    async ({id_compra}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IItemEnCompra[]>({url: `/api/compras/${id_compra}/items-compras/`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data || "Error al obtener los items")
        }
    }
)

export const detalleCompraThunk = createAsyncThunk<ICompra, {id_compra: number | string | undefined}, {rejectValue: string}>(
    'bodega/detalleCompraThunk',
    async ({id_compra}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<ICompra>({url: `/api/compras/${id_compra}/`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const listaComprasThunk = createAsyncThunk<ICompra[], undefined, {rejectValue: string}>(
    'bodega/listaComprasThunk',
    async (_, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<ICompra[]>({url: `/api/compras/`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const listaComprasDeStockThunk = createAsyncThunk<IItemOrdenCompraEnStock[], {id_bodega: string | number | undefined, id_stock: number | undefined | string}, {rejectValue: string}>(
    'bodega/listaComprasDeStockThunk',
    async ({id_bodega, id_stock}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IItemOrdenCompraEnStock[]>({url: `/api/bodegas/${id_bodega}/stock-items-en-bodega/${id_stock}/ordenes-compra`, method: 'get'})
            return response.data
        } catch(error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const listaGuiaSalidaPorBodegaThunk = createAsyncThunk<IGuiaSalida[], {id_bodega: number | string | undefined}, {rejectValue: string}>(
    'bodega/listaGuiaSalidaPorBodegaThunk',
    async ({id_bodega}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IGuiaSalida[]>({url: `/api/bodegas/${id_bodega}/guias-salida/`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const detalleBodegaThunk = createAsyncThunk<IBodega, {id_bodega: string | number | undefined}, {rejectValue: string}>(
    'bodega/detalleBodegaThunk',
    async ({id_bodega}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IBodega>({url: `/api/bodegas/${id_bodega}/`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const listaEventosOcThunk = createAsyncThunk<IEventoOc[], undefined, {rejectValue: string}>(
    'bodega/obtenerEventosOcThunk',
    async (_, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<IEventoOc[]>({ url: `/api/ordenes-compra/ultimos-eventos/`, method: 'get' });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    }
);

export const listaItemsEnOrdenCompraThunk = createAsyncThunk<IItemEnOrdenCompra[], {id_orden: string | number | undefined}, {rejectValue: string}>(
    'bodega/listaItemsEnOrdenCompraThunk',
    async ({id_orden}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IItemEnOrdenCompra[]>({url: `/api/ordenes-compra/${id_orden}/items-en-orden-compra/`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const listaMisOrdenesDeCompraThunk = createAsyncThunk<IOrdenCompra[], undefined, {rejectValue: string}>(
    'bodega/listaMisOrdenesDeCompraThunk',
    async (_, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IOrdenCompra[]>({url: `/api/ordenes-compra/mis_ordenes/`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const listaItemsEnGuiaSalidaBodegaThunk = createAsyncThunk<IItemGuiaSalida[], {id_guia: string | number | undefined}, {rejectValue: string}>(
    'bodega/listaItemsEnGuiaSalidaBodegaThunk',
    async ({id_guia}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IItemGuiaSalida[]>({url: `/api/guia-salida/${id_guia}/items-guia/`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const detalleGuiaSalidaBodegaThunk = createAsyncThunk<IGuiaSalida, {id_guia: string | number | undefined }, {rejectValue: string}>(
    'bodega/detalleGuiaSalidaBodegaThunk',
    async ({id_guia}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IGuiaSalida>({url: `/api/guia-salida/${id_guia}/`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const listaStockItemsEnBodegaThunk = createAsyncThunk<IStockItemEnBodega[], {id_bodega: string | number | undefined}, {rejectValue: string}>(
    'bodega/listaStockItemsEnBodegaThunk',
    async ({id_bodega}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IStockItemEnBodega[]>({url: `/api/bodegas/${id_bodega}/stock-items-en-bodega/`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const listaGuiaSalidaBodegaThunk = createAsyncThunk<IGuiaSalida[], undefined, {rejectValue: string}>(
    'bodega/listaGuiaSalidaBodegaThunk',
    async (_, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IGuiaSalida[]>({url: `/api/guia-salida`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const listaBodegasThunk = createAsyncThunk<IBodega[], undefined, {rejectValue: string}>(
    'bodega/listaBodegasThunk',
    async (_, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IBodega[]>({url: `/api/bodegas/`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const listaOrdenesCompraThunk = createAsyncThunk<IOrdenCompra[], {id_empresa: string | number | undefined | null, filtro?: URLSearchParams}, {rejectValue: string}>(
    'bodega/listaOrdenesCompraThunk',
    async ({id_empresa, filtro}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IOrdenCompra[]>({url: `/api/ordenes-compra/por-empresa/${id_empresa}/`, method: 'get', params: filtro ? filtro : undefined})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const detalleOrdenCompraThunk = createAsyncThunk<IOrdenCompra, {id_orden: string | number | undefined}, {rejectValue: string}>(
    'bodega/detalleOrdenCompraThunk',
    async ({id_orden}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IOrdenCompra>({url: `/api/ordenes-compra/${id_orden}`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const listaBodegasPorEmpresaThunk = createAsyncThunk<IBodega[], {id_empresa: number | string | undefined | null}, {rejectValue: string}>(
    'bodega/listaBodegasPorEmpresaThunk',
    async ({id_empresa}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IBodega[]>({url: `/api/bodegas/por-empresa/${id_empresa}/`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const listaItemsOrdenCompraEnStockThunk = createAsyncThunk<IItemOrdenCompraEnStock[], {id_orden: string | number | undefined}, {rejectValue: string}>(
    'bodega/listaItemsOrdenCompraEnStockThunk',
    async ({id_orden}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IItemOrdenCompraEnStock[]>({url: `/api/ordenes-compra/${id_orden}/items-orden-compra-en-stock/por-orden/`, method: 'get'})
            return response.data
        } catch (error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

const bodegaSlice = createSlice({
    name: `bodega/bodegaSlice`,
    initialState,
    reducers: {
        LIMPIAR_LISTA_GUIA_SALIDA_POR_BODEGA: (state) => {
            state.listaGuiaSalidaPorBodega = []
        },
        LIMPIAR_LISTA_BUSCAR_ITEM_TOMA_INVENTARIO: (state) => {
            state.buscarItemEnTomaInventario = []
        }
    },
    extraReducers(builder) {
        builder
            .addCase(listaBodegasThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaBodegasThunk.fulfilled, (state, action) => {
                state.listaBodegas = action.payload
                state.loading = false
            })
            .addCase(listaBodegasThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaOrdenesCompraThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaOrdenesCompraThunk.fulfilled, (state, action) => {
                state.listaOrdenesCompra = action.payload
                state.loading = false
            })
            .addCase(listaOrdenesCompraThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(detalleOrdenCompraThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(detalleOrdenCompraThunk.fulfilled, (state, action) => {
                state.detalleOrdenCompra = action.payload
                state.loading = false
            })
            .addCase(detalleOrdenCompraThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaGuiaSalidaBodegaThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaGuiaSalidaBodegaThunk.fulfilled, (state, action) => {
                state.listaGuiaSalidaBodega = action.payload
                state.loading = false
            })
            .addCase(listaGuiaSalidaBodegaThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaStockItemsEnBodegaThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaStockItemsEnBodegaThunk.fulfilled, (state, action) => {
                state.listaStockItemsEnBodega = action.payload
                state.loading = false
            })
            .addCase(listaStockItemsEnBodegaThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(detalleGuiaSalidaBodegaThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(detalleGuiaSalidaBodegaThunk.fulfilled, (state, action) => {
                state.detalleGuiaSalidaBodega = action.payload
                state.loading = false
            })
            .addCase(detalleGuiaSalidaBodegaThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaItemsEnGuiaSalidaBodegaThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaItemsEnGuiaSalidaBodegaThunk.fulfilled, (state, action) => {
                state.listaItemsEnGuiaSalidaBodega = action.payload
                state.loading = false
            })
            .addCase(listaItemsEnGuiaSalidaBodegaThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaMisOrdenesDeCompraThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaMisOrdenesDeCompraThunk.fulfilled, (state, action) => {
                state.listaMisOrdenesDeCompra = action.payload
                state.loading = false
            })
            .addCase(listaMisOrdenesDeCompraThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaItemsEnOrdenCompraThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaItemsEnOrdenCompraThunk.fulfilled, (state, action) => {
                state.listaItemsEnOrdenCompra = action.payload
                state.loading = false
            })
            .addCase(listaItemsEnOrdenCompraThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaBodegasPorEmpresaThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaBodegasPorEmpresaThunk.fulfilled, (state, action) => {
                state.listaBodegasPorEmpresa = action.payload
                state.loading = false
            })
            .addCase(listaBodegasPorEmpresaThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaItemsOrdenCompraEnStockThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaItemsOrdenCompraEnStockThunk.fulfilled, (state, action) => {
                state.listaItemsOrdenCompraEnStock = action.payload
                state.loading = false
            })
            .addCase(listaItemsOrdenCompraEnStockThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaEventosOcThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaEventosOcThunk.fulfilled, (state, action) => {
                state.eventosOc = action.payload
                state.loading = false
            })
            .addCase(listaEventosOcThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(detalleBodegaThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(detalleBodegaThunk.fulfilled, (state, action) => {
                state.detalleBodega = action.payload
                state.loading = false
            })
            .addCase(detalleBodegaThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaGuiaSalidaPorBodegaThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaGuiaSalidaPorBodegaThunk.fulfilled, (state, action) => {
                state.listaGuiaSalidaPorBodega = action.payload
                state.loading = false
            })
            .addCase(listaGuiaSalidaPorBodegaThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaComprasDeStockThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaComprasDeStockThunk.fulfilled, (state, action) => {
                state.listaComprasDeStock = action.payload
                state.loading = false
            })
            .addCase(listaComprasDeStockThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            // .addCase(detalleItemOrdenCompraThunk.pending, (state) => {
            //     state.loading = true
            // })
            // .addCase(detalleItemOrdenCompraThunk.fulfilled, (state, action) => {
            //     state.detalleItemOrdenCompra = action.payload
            //     state.loading = false
            // })
            // .addCase(detalleItemOrdenCompraThunk.rejected, (state, action) => {
            //     state.loading = false
            //     state.error = action.payload
            // })
            .addCase(listaComprasThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaComprasThunk.fulfilled, (state, action) => {
                state.listaCompras = action.payload
                state.loading = false
            })
            .addCase(listaComprasThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(detalleCompraThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(detalleCompraThunk.fulfilled, (state, action) => {
                state.detalleCompra = action.payload
                state.loading = false
            })
            .addCase(detalleCompraThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaItemsCompraThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaItemsCompraThunk.fulfilled, (state, action) => {
                state.listaItemsCompra = action.payload
                state.loading = false
            })
            .addCase(listaItemsCompraThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaMovimientosStockThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaMovimientosStockThunk.fulfilled, (state, action) => {
                state.listaMovimientosStock = action.payload
                state.loading = false
            })
            .addCase(listaMovimientosStockThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaTomaInventarioThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaTomaInventarioThunk.fulfilled, (state, action) => {
                state.listaTomaInventario = action.payload
                state.loading = false
            })
            .addCase(listaTomaInventarioThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaTomaInventarioFiltroThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaTomaInventarioFiltroThunk.fulfilled, (state, action) => {
                state.listaTomaInventario = action.payload
                state.loading = false
            })
            .addCase(listaTomaInventarioFiltroThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(detalleTomaInventarioThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(detalleTomaInventarioThunk.fulfilled, (state, action) => {
                state.detalleTomaInventario = action.payload
                state.loading = false
            })
            .addCase(detalleTomaInventarioThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaItemsEnTomaInventarioThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaItemsEnTomaInventarioThunk.fulfilled, (state, action) => {
                state.listaItemsEnTomaInventario = action.payload
                state.loading = false
            })
            .addCase(listaItemsEnTomaInventarioThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaEstadosTomaInventarioThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaEstadosTomaInventarioThunk.fulfilled, (state, action) => {
                state.listaEstadosTomaInventario = action.payload
                state.loading = false
            })
            .addCase(listaEstadosTomaInventarioThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(buscarItemEnTomaInventarioThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(buscarItemEnTomaInventarioThunk.fulfilled, (state, action) => {
                state.buscarItemEnTomaInventario = action.payload
                state.loading = false
            })
            .addCase(buscarItemEnTomaInventarioThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaGuiasSalidasDisponiblesThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaGuiasSalidasDisponiblesThunk.fulfilled, (state, action) => {
                state.listaGuiasSalidasDisponibles = action.payload
                state.loading = false
            })
            .addCase(listaGuiasSalidasDisponiblesThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
    }
})

export const { LIMPIAR_LISTA_GUIA_SALIDA_POR_BODEGA, LIMPIAR_LISTA_BUSCAR_ITEM_TOMA_INVENTARIO } = bodegaSlice.actions

export default bodegaSlice.reducer