import {
    ICategoriaGasto,
    ICompraRendicion,
    IItemRendicion,
    IRendicion,
} from '@/interface/rendicion.interface';
import ApiService from '@/services/ApiService';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface RendicionState {
    loading: boolean;
    error: string | undefined;
    listaRendiciones: IRendicion[];
    detalleRendicion: IRendicion | undefined;
    listaCategoriasGasto: ICategoriaGasto[];
    // listaDetalleGasto: IDetalleGasto[]
    // detalleGasto: IDetalleGasto | undefined
    listaMisRendiciones: IRendicion[];
    listaRendicionesSucursal: IRendicion[];
    listaItemsRendicion: IItemRendicion[];
    listaComprasDisponibles: ICompraRendicion[];
}

const initialState: RendicionState = {
    loading: false,
    error: undefined,
    listaRendiciones: [],
    detalleRendicion: undefined,
    listaCategoriasGasto: [],
    // listaDetalleGasto: [],
    // detalleGasto: undefined,
    listaMisRendiciones: [],
    listaRendicionesSucursal: [],
    listaItemsRendicion: [],
    listaComprasDisponibles: [],
};

export const listaComprasDisponiblesThunk = createAsyncThunk<
    ICompraRendicion[],
    undefined,
    { rejectValue: string }
>('rendicion/listaComprasDisponiblesThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ICompraRendicion[]>({
            url: `/api/rendiciones/compras-libres`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaItemsRendicionThunk = createAsyncThunk<
    IItemRendicion[],
    { id_rendicion: string | number | undefined },
    { rejectValue: string }
>('rendicion/listaItemsRendicionThunk', async ({ id_rendicion }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IItemRendicion[]>({
            url: `/api/rendiciones/${id_rendicion}/items-rendicion/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaRendicionesThunk = createAsyncThunk<
    IRendicion[],
    undefined,
    { rejectValue: string }
>('rendicion/listaRendicionesThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IRendicion[]>({
            url: `/api/rendiciones/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaMisRendicionesThunk = createAsyncThunk<
    IRendicion[],
    undefined,
    { rejectValue: string }
>('rendicion/listaMisRendicionesThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IRendicion[]>({
            url: `/api/rendiciones/mis-rendiciones/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});
export const listaRendicionesSucursalesThunk = createAsyncThunk<
    IRendicion[],
    undefined,
    { rejectValue: string }
>('rendicion/listaRendicionesSucursalesThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IRendicion[]>({
            url: `/api/rendiciones/rendiciones-sucursal/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const detalleRendicionThunk = createAsyncThunk<
    IRendicion,
    { id_rendicion: number | string | undefined },
    { rejectValue: string }
>('rendicion/detalleRendicionThunk', async ({ id_rendicion }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IRendicion>({
            url: `/api/rendiciones/${id_rendicion}/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data || 'Error al obtener las rendiciones');
    }
});

export const listaCategoriasGastoThunk = createAsyncThunk<
    ICategoriaGasto[],
    undefined,
    { rejectValue: string }
>('rendicion/listaCategoriasGastoThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ICategoriaGasto[]>({
            url: `/api/categorias-gasto/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

// FASE 1 - Endpoints de cambio de estado
export const rechazarRendicionThunk = createAsyncThunk<
    IRendicion,
    { id_rendicion: number | string; motivo_rechazo: string },
    { rejectValue: string }
>('rendicion/rechazarRendicionThunk', async ({ id_rendicion, motivo_rechazo }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IRendicion>({
            url: `/api/rendiciones/${id_rendicion}/rechazar/`,
            method: 'post',
            data: { motivo_rechazo },
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data || 'Error al rechazar la rendición');
    }
});

export const aprobarRendicionThunk = createAsyncThunk<
    IRendicion,
    { id_rendicion: number | string },
    { rejectValue: string }
>('rendicion/aprobarRendicionThunk', async ({ id_rendicion }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IRendicion>({
            url: `/api/rendiciones/${id_rendicion}/aprobar/`,
            method: 'post',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data || 'Error al aprobar la rendición');
    }
});

export const pagarRendicionThunk = createAsyncThunk<
    IRendicion,
    { id_rendicion: number | string },
    { rejectValue: string }
>('rendicion/pagarRendicionThunk', async ({ id_rendicion }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IRendicion>({
            url: `/api/rendiciones/${id_rendicion}/pagar/`,
            method: 'post',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data || 'Error al marcar rendición como pagada');
    }
});

// export const listaDetalleGastoThunk = createAsyncThunk<IDetalleGasto[], {id_rendicion: number | string | undefined}, {rejectValue: string}>(
//     'rendicion/listaDetalleGastoThunk',
//     async ({id_rendicion}, {rejectWithValue}) => {
//         try {
//             const response = await ApiService.fetchData<IDetalleGasto[]>({url: `/api/rendiciones/${id_rendicion}/detalles-gasto/`, method: 'get'})
//             return response.data
//         } catch (error: any) {
//             return rejectWithValue(error.response.data)
//         }
//     }

// )

// export const detalleGastoThunk = createAsyncThunk<IDetalleGasto, {id_detalle: number | string | undefined; rendicion_id:number | string | any}, {rejectValue: string}>(
//     'rendicion/detalleGastoThunk',
//     async ({id_detalle, rendicion_id}, {rejectWithValue}) => {
//         try {
//             const response = await ApiService.fetchData<IDetalleGasto>({url: `/api/rendiciones/${rendicion_id}/detalles-gasto/${id_detalle}/`, method: 'get'})
//             return response.data
//         } catch (error: any) {
//             return rejectWithValue(error.response.data)
//         }
//     }

// )

export const rendicionSlice = createSlice({
    name: 'rendicion/rendicionSlice',
    initialState,
    reducers: {},
    extraReducers(builder) {
        builder
            .addCase(listaRendicionesThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaRendicionesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaRendiciones = action.payload;
            })
            .addCase(listaRendicionesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleRendicionThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleRendicionThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleRendicion = action.payload;
            })
            .addCase(detalleRendicionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaCategoriasGastoThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaCategoriasGastoThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaCategoriasGasto = action.payload;
            })
            .addCase(listaCategoriasGastoThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // .addCase(listaDetalleGastoThunk.pending, (state) => {
            //     state.loading = true
            //     state.error = undefined
            // })
            // .addCase(listaDetalleGastoThunk.fulfilled, (state, action) => {
            //     state.loading = false
            //     state.error = undefined
            //     state.listaDetalleGasto = action.payload
            // })
            // .addCase(listaDetalleGastoThunk.rejected, (state, action) => {
            //     state.loading = false
            //     state.error = action.payload
            // })
            // .addCase(detalleGastoThunk.pending, (state) =>{
            //     state.loading = true
            //     state.error = undefined
            // })
            // .addCase(detalleGastoThunk.fulfilled, (state, action) => {
            //     state.loading = false
            //     state.error = undefined
            //     state.detalleGasto = action.payload
            // })
            // .addCase(detalleGastoThunk.rejected, (state, action) => {
            //     state.loading = false
            //     state.error = action.payload
            // })
            .addCase(listaMisRendicionesThunk.pending, (state) => {
                state.loading = true;
                state.error = undefined;
            })
            .addCase(listaMisRendicionesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.error = undefined;
                state.listaMisRendiciones = action.payload;
            })
            .addCase(listaMisRendicionesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaRendicionesSucursalesThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaRendicionesSucursalesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.error = undefined;
                state.listaRendicionesSucursal = action.payload;
            })
            .addCase(listaRendicionesSucursalesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaItemsRendicionThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaItemsRendicionThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaItemsRendicion = action.payload;
            })
            .addCase(listaItemsRendicionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaComprasDisponiblesThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaComprasDisponiblesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaComprasDisponibles = action.payload;
            })
            .addCase(listaComprasDisponiblesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // FASE 1 - Cambio de estados
            .addCase(rechazarRendicionThunk.pending, (state) => {
                state.loading = true;
                state.error = undefined;
            })
            .addCase(rechazarRendicionThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleRendicion = action.payload;
            })
            .addCase(rechazarRendicionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(aprobarRendicionThunk.pending, (state) => {
                state.loading = true;
                state.error = undefined;
            })
            .addCase(aprobarRendicionThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleRendicion = action.payload;
            })
            .addCase(aprobarRendicionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(pagarRendicionThunk.pending, (state) => {
                state.loading = true;
                state.error = undefined;
            })
            .addCase(pagarRendicionThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleRendicion = action.payload;
            })
            .addCase(pagarRendicionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const {} = rendicionSlice.actions;

export default rendicionSlice.reducer;
