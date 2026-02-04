import { IOrdenCompra } from '@/interface/bodega.interface';
import {
    ICotizacion,
    IItemCotizacion,
    ISeguimientoCotizacion,
    ISolicitanteCotizacion,
} from '@/interface/cotizaciones.interface';
import { IUsuarioEmpresa } from '@/interface/empresas.interface';
import ApiService from '@/services/ApiService';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface CotizacionState {
    loading: boolean;
    error: any;
    listaCotizaciones: ICotizacion[];
    detalleCotizacion: ICotizacion | undefined;
    detallesPorNumero: Record<string, ICotizacion>;
    listaItemsCotizacion: IItemCotizacion[];
    listaItemsEnCotizacion: IItemCotizacion[];
    itemsPorCotizacion: Record<string, IItemCotizacion[]>;
    detalleItemCotizacion: IItemCotizacion | undefined;
    detalleItemEnCotizacion: IItemCotizacion | undefined;
    listaSeguimientoCotizacion: ISeguimientoCotizacion[];
    detalleSeguiemientoCotizacion: ISeguimientoCotizacion | undefined;
    listaSolicitantesCotizacion: ISolicitanteCotizacion[];
    solicitantesPorCotizacion: Record<string, ISolicitanteCotizacion[]>;
    copiasPorCotizacion: Record<string, ICotizacion[]>;
    listaUsuariosParaSolicitante: IUsuarioEmpresa[];
    listaOrdenesDeCompraCotizacion: IOrdenCompra[];
}

const initialState: CotizacionState = {
    loading: false,
    error: undefined,
    listaCotizaciones: [],
    listaItemsEnCotizacion: [],
    itemsPorCotizacion: {},
    detalleCotizacion: undefined,
    detallesPorNumero: {},
    listaItemsCotizacion: [],
    detalleItemCotizacion: undefined,
    detalleItemEnCotizacion: undefined,
    listaSeguimientoCotizacion: [],
    detalleSeguiemientoCotizacion: undefined,
    listaSolicitantesCotizacion: [],
    solicitantesPorCotizacion: {},
    copiasPorCotizacion: {},
    listaUsuariosParaSolicitante: [],
    listaOrdenesDeCompraCotizacion: [],
};

export const detalleCotizacionPorNumeroThunk = createAsyncThunk<
    ICotizacion,
    { numero_cotizacion: string | number | undefined },
    { rejectValue: string }
>(
    'cotizacion/detalleCotizacionPorNumeroThunk',
    async ({ numero_cotizacion }, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<ICotizacion>({
                url: `/api/cotizaciones/por-numero/${numero_cotizacion}/`,
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    },
);

export const listaCotizacionesThunk = createAsyncThunk<
    ICotizacion[],
    undefined,
    { rejectValue: string }
>('cotizacion/listaCotizacionesThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ICotizacion[]>({
            url: '/api/cotizaciones/',
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const detalleCotizacionThunk = createAsyncThunk<
    ICotizacion,
    { id_cotizacion: number | string | undefined },
    { rejectValue: string }
>('cotizacion/detalleCotizacionThunk', async ({ id_cotizacion }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ICotizacion>({
            url: `/api/cotizaciones/${id_cotizacion}/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaItemsCotizacionThunk = createAsyncThunk<
    IItemCotizacion[],
    undefined,
    { rejectValue: string }
>('cotizacion/listaItemsCotizacionThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IItemCotizacion[]>({
            url: `/api/items-cotizacion/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const detalleItemCotizacionThunk = createAsyncThunk<
    IItemCotizacion,
    { id_item: number | string | undefined },
    { rejectValue: string }
>('cotizacion/detalleItemCotizacionThunk', async ({ id_item }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IItemCotizacion>({
            url: `/api/items-cotizacion/${id_item}/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaItemsEnCotizacionThunk = createAsyncThunk<
    IItemCotizacion[],
    { id_cotizacion: number | string | undefined },
    { rejectValue: string }
>('cotizacion/listaItemsEnCotizacionThunk', async ({ id_cotizacion }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IItemCotizacion[]>({
            url: `/api/cotizaciones/${id_cotizacion}/items/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const detalleItemEnCotizacionThunk = createAsyncThunk<
    IItemCotizacion,
    { id_cotizacion: number | string | undefined; id_item: number | string | undefined },
    { rejectValue: string }
>(
    'cotizacion/detalleItemEnCotizacionThunk',
    async ({ id_cotizacion, id_item }, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<IItemCotizacion>({
                url: `/api/cotizaciones/${id_cotizacion}/items/${id_item}/`,
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    },
);

export const listaCotizacionesSucursalThunk = createAsyncThunk<
    ICotizacion[],
    { filtro?: URLSearchParams } | undefined,
    { rejectValue: string }
>('cotizacion/listaCotizacionesSucursalThunk', async (args, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ICotizacion[]>({
            url: '/api/cotizaciones/cotizaciones-empresa/',
            method: 'get',
            params: args?.filtro ? args.filtro : undefined,
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaCopiasCotizacionThunk = createAsyncThunk<
    ICotizacion[],
    { id_cotizacion: number | string | undefined },
    { rejectValue: string }
>('cotizacion/listaCopiasCotizacionThunk', async ({ id_cotizacion }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ICotizacion[]>({
            url: `/api/cotizaciones/${id_cotizacion}/copias/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data || 'Error al obtener las copias');
    }
});

export const duplicarCotizacionThunk = createAsyncThunk<
    ICotizacion,
    { id_cotizacion: number | string | undefined },
    { rejectValue: string }
>('cotizacion/duplicarCotizacionThunk', async ({ id_cotizacion }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ICotizacion>({
            url: `/api/cotizaciones/${id_cotizacion}/crear-copia-rechazada/`,
            method: 'post',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data || 'Error al duplicar cotizacion');
    }
});

export const seguimientoCotizacionThunk = createAsyncThunk<
    ISeguimientoCotizacion[],
    { id_cotizacion: number | string | undefined },
    { rejectValue: string }
>('cotizacion/seguimientoCotizacionThunk', async ({ id_cotizacion }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ISeguimientoCotizacion[]>({
            url: `/api/cotizaciones/${id_cotizacion}/seguimientos/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const detalleSeguimientoCotizacionThunk = createAsyncThunk<
    ISeguimientoCotizacion,
    { id_cotizacion: number | string | undefined; id_seguimiento: number | string | undefined },
    { rejectValue: string }
>(
    'cotizacion/detalleSeguimientoCotizacionThunk',
    async ({ id_cotizacion, id_seguimiento }, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<ISeguimientoCotizacion>({
                url: `/api/cotizaciones/${id_cotizacion}/seguimientos/${id_seguimiento}/`,
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    },
);

export const listaSolicitantesCotizacionThunk = createAsyncThunk<
    ISolicitanteCotizacion[],
    { id_cotizacion: string | number | undefined },
    { rejectValue: string }
>('cotizacion/listaSolicitantesCotizacionThunk', async ({ id_cotizacion }, { rejectWithValue }) => {
    if (!id_cotizacion) {
        return [];
    }
    try {
        const response = await ApiService.fetchData<ISolicitanteCotizacion[]>({
            url: `/api/cotizaciones/${id_cotizacion}/solicitantes-cotizacion/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data || 'Error al obtener la lista de solicitantes');
    }
});

export const listaUsuariosParaSolicitanteThunk = createAsyncThunk<
    IUsuarioEmpresa[],
    { id_cotizacion: string | number | undefined },
    { rejectValue: string }
>(
    'cotizacion/listaUsuariosParaSolicitanteThunk',
    async ({ id_cotizacion }, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<IUsuarioEmpresa[]>({
                url: `/api/cotizaciones/${id_cotizacion}/solicitantes-cotizacion/sin-relacionar/`,
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(
                error.response.data || 'Error al obtener la lista de solicitantes',
            );
        }
    },
);

export const listaOrdenesDeCompraCotizacionThunk = createAsyncThunk<
    IOrdenCompra[],
    { id_cotizacion: number | string | undefined },
    { rejectValue: string }
>(
    'cotizacion/listaOrdenesDeCompraCotizacionThunk',
    async ({ id_cotizacion }, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<IOrdenCompra[]>({
                url: `/api/cotizaciones/${id_cotizacion}/ordenes-compras/`,
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(
                error.response.data ||
                    'Error al obtener la lista de ordenes asociadas a cotización',
            );
        }
    },
);

const cotizacionSlice = createSlice({
    name: `cotizacion/cotizacionSlice`,
    initialState,
    reducers: {},
    extraReducers(builder) {
        builder
            .addCase(listaCotizacionesThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaCotizacionesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaCotizaciones = action.payload;
            })
            .addCase(listaCotizacionesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleCotizacionThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleCotizacionThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleCotizacion = action.payload;
                const key = action.payload?.numero_cotizacion
                    ? String(action.payload.numero_cotizacion)
                    : undefined;
                if (key) {
                    state.detallesPorNumero[key] = action.payload;
                }
            })
            .addCase(detalleCotizacionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaItemsCotizacionThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaItemsCotizacionThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaItemsCotizacion = action.payload;
            })
            .addCase(listaItemsCotizacionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleItemCotizacionThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleItemCotizacionThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleItemCotizacion = action.payload;
            })
            .addCase(detalleItemCotizacionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaItemsEnCotizacionThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaItemsEnCotizacionThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaItemsEnCotizacion = action.payload;
                const key = action.meta.arg.id_cotizacion
                    ? String(action.meta.arg.id_cotizacion)
                    : undefined;
                if (key) {
                    state.itemsPorCotizacion[key] = action.payload;
                }
            })
            .addCase(listaItemsEnCotizacionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleItemEnCotizacionThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleItemEnCotizacionThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleItemEnCotizacion = action.payload;
            })
            .addCase(detalleItemEnCotizacionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaCotizacionesSucursalThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaCotizacionesSucursalThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaCotizaciones = action.payload;
            })
            .addCase(listaCotizacionesSucursalThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaCopiasCotizacionThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaCopiasCotizacionThunk.fulfilled, (state, action) => {
                state.loading = false;
                const key = action.meta.arg.id_cotizacion
                    ? String(action.meta.arg.id_cotizacion)
                    : undefined;
                if (key) {
                    state.copiasPorCotizacion[key] = action.payload;
                }
            })
            .addCase(listaCopiasCotizacionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(duplicarCotizacionThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(duplicarCotizacionThunk.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(duplicarCotizacionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(seguimientoCotizacionThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(seguimientoCotizacionThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaSeguimientoCotizacion = action.payload;
            })
            .addCase(seguimientoCotizacionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaSolicitantesCotizacionThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaSolicitantesCotizacionThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaSolicitantesCotizacion = action.payload;
                const key = action.meta.arg.id_cotizacion
                    ? String(action.meta.arg.id_cotizacion)
                    : undefined;
                if (key) {
                    state.solicitantesPorCotizacion[key] = action.payload;
                }
            })
            .addCase(listaSolicitantesCotizacionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaUsuariosParaSolicitanteThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaUsuariosParaSolicitanteThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaUsuariosParaSolicitante = action.payload;
            })
            .addCase(listaUsuariosParaSolicitanteThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaOrdenesDeCompraCotizacionThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaOrdenesDeCompraCotizacionThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaOrdenesDeCompraCotizacion = action.payload;
            })
            .addCase(listaOrdenesDeCompraCotizacionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleCotizacionPorNumeroThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleCotizacionPorNumeroThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleCotizacion = action.payload;
                const key = action.payload?.numero_cotizacion
                    ? String(action.payload.numero_cotizacion)
                    : undefined;
                if (key) {
                    state.detallesPorNumero[key] = action.payload;
                }
            })
            .addCase(detalleCotizacionPorNumeroThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const {} = cotizacionSlice.actions;

export default cotizacionSlice.reducer;
