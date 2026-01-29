import { IEquipo, IUsuarioEquipo } from '@/interface/recursos.interface';
import {
    IAsistenciaUsuario,
    IEntregaEquipo,
    IInsumoEnVisitaSoporte,
    IVisitaSoporte,
} from '@/interface/visitas.interface';
import ApiService from '@/services/ApiService';
import { getErrorMessage } from '@/utils/errorHandlers';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface VisitasState {
    loading: boolean;
    error: string | undefined;

    listaVisitasSoporte: IVisitaSoporte[];
    detalleVisitasSoporte: IVisitaSoporte | undefined;

    listaAsistenciaUsuarios: IAsistenciaUsuario[];
    detalleAsistenciaUsuario: IAsistenciaUsuario | undefined;

    listaUsuarioEquipoAsistencia: IUsuarioEquipo[];
    detalleUsuarioEquipoAsistencia: IUsuarioEquipo | undefined;

    listaEntregaEquipos: IEntregaEquipo[];
    detalleEntregaEquipo: IEntregaEquipo | undefined;

    listaInsumosEnVisita: IInsumoEnVisitaSoporte[];

    // listaGuiaDeSalidaFiltrada: IGuiaSalida[]

    listaDeEquiposParaEntregar: IEquipo[];

    listaTodosAsistenciaUsuarios: IAsistenciaUsuario[];
}

const initialState: VisitasState = {
    loading: false,
    error: undefined,

    listaVisitasSoporte: [],
    detalleVisitasSoporte: undefined,

    listaAsistenciaUsuarios: [],
    detalleAsistenciaUsuario: undefined,

    listaUsuarioEquipoAsistencia: [],
    detalleUsuarioEquipoAsistencia: undefined,

    listaEntregaEquipos: [],
    detalleEntregaEquipo: undefined,

    listaInsumosEnVisita: [],

    // listaGuiaDeSalidaFiltrada: [],

    listaDeEquiposParaEntregar: [],

    listaTodosAsistenciaUsuarios: [],
};

export const listaVisitasSoporteThunk = createAsyncThunk<
    IVisitaSoporte[],
    undefined,
    { rejectValue: string }
>('visitas/listaVisitasSoporteThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IVisitaSoporte[]>({
            url: `/api/visitas-soporte/`,
            method: 'get',
        });
        return response.data;
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error));
    }
});

export const detalleVisitaSoporteThunk = createAsyncThunk<
    IVisitaSoporte,
    { id_visita: number | string | undefined },
    { rejectValue: string }
>('visitas/detalleVisitaSoporteThunk', async ({ id_visita }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IVisitaSoporte>({
            url: `/api/visitas-soporte/${id_visita}/`,
            method: 'get',
        });
        return response.data;
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error));
    }
});

export const listaAsistenciaUsuariosThunk = createAsyncThunk<
    IAsistenciaUsuario[],
    { id_visita: number | string | undefined },
    { rejectValue: string }
>('visitas/listaAsistenciaUsuariosThunk', async ({ id_visita }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IAsistenciaUsuario[]>({
            url: `/api/visitas-soporte/${id_visita}/asistencias-usuarios/`,
            method: 'get',
        });
        return response.data;
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error));
    }
});

export const detalleAsistenciaUsuarioThunk = createAsyncThunk<
    IAsistenciaUsuario,
    { id_visita: number | string | undefined; id_usuario: number | string | undefined },
    { rejectValue: string }
>(
    'visitas/detalleAsistenciaUsuarioThunk',
    async ({ id_visita, id_usuario }, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<IAsistenciaUsuario>({
                url: `/api/visitas-soporte/${id_visita}/asistencias-usuarios/${id_usuario}/`,
                method: 'get',
            });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    },
);

export const listaUsuarioEquipoAsistenciaThunk = createAsyncThunk<
    IUsuarioEquipo[],
    { id_visita: number | string | undefined },
    { rejectValue: string }
>('visitas/listaUsuarioEquipoAsistenciaThunk', async ({ id_visita }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IUsuarioEquipo[]>({
            url: `/api/visitas-soporte/${id_visita}/asistencias-usuarios/lista-usuarios-equipo/`,
            method: 'get',
        });
        return response.data;
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error));
    }
});

export const detalleUsuarioEquipoAsistenciaThunk = createAsyncThunk<
    IUsuarioEquipo,
    { id_visita: number | string; id_usuario: number | string },
    { rejectValue: string }
>(
    'visitas/detalleUsuarioEquipoAsistenciaThunk',
    async ({ id_visita, id_usuario }, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<IUsuarioEquipo>({
                url: `/api/visitas-soporte/${id_visita}/asistencia-usuarios/${id_usuario}/`,
                method: 'get',
            });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    },
);

export const listaEntregaEquipoThunk = createAsyncThunk<
    IEntregaEquipo[],
    { id_visita: number | string | undefined },
    { rejectValue: string }
>('visitas/listaEntregaEquipoThunk', async ({ id_visita }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IEntregaEquipo[]>({
            url: `/api/visitas-soporte/${id_visita}/entregas-equipos/`,
            method: 'get',
        });
        return response.data;
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error));
    }
});

export const detalleEntregaEquipoThunk = createAsyncThunk<
    IEntregaEquipo,
    { id_visita: number | string; id_usuario: number | string },
    { rejectValue: string }
>('visitas/detalleEntregaEquipoThunk', async ({ id_visita, id_usuario }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IEntregaEquipo>({
            url: `/api/visitas-soporte/${id_visita}/entregas-equipos/${id_usuario}/`,
            method: 'get',
        });
        return response.data;
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error));
    }
});

export const listaInsumosEnVisitaSoporteThunk = createAsyncThunk<
    IInsumoEnVisitaSoporte[],
    { id_visita: number | string | undefined },
    { rejectValue: string }
>('visitas/listaInsumosEnVisitaSoporteThunk', async ({ id_visita }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IInsumoEnVisitaSoporte[]>({
            url: `/api/visitas-soporte/${id_visita}/insumos-visitas/`,
            method: 'get',
        });
        return response.data;
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error));
    }
});

// export const listaGuiaDeSalidaFiltradaThunk = createAsyncThunk<IGuiaSalida[], {id_bodega: string | number | undefined}, {rejectValue: string}>(
//     'visitas/listaGuiaDeSalidaFiltradaThunk',
//     async ({id_bodega}, {rejectWithValue}) => {
//         try {
//             const response = await ApiService.fetchData<IGuiaSalida[]>({url: `/api/visitas-soporte/guias-disponibles/`, method: 'get', params: {bodega_id: id_bodega}})
//             return response.data
//         } catch (error: any) {
//             return rejectWithValue(error.response.data || "Error al obtener las guias de salidas")
//         }
//     }
// )

export const listaDeEquiposParaEntregarThunk = createAsyncThunk<
    IEquipo[],
    { id_guia_salida: string | number | undefined | null },
    { rejectValue: string }
>('visitas/listaDeEquiposParaEntregarThunk', async ({ id_guia_salida }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IEquipo[], string>({
            url: `/api/guia-salida/${id_guia_salida}/equipos-guia`,
            method: 'get',
        });
        return response.data;
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error));
    }
});

export const listaTodosAsistenciaUsuariosThunk = createAsyncThunk<
    IAsistenciaUsuario[],
    undefined,
    { rejectValue: string }
>('visitas/listaTodosAsistenciaUsuariosThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IAsistenciaUsuario[]>({
            url: `/api/visitas-soporte/asistencias-por-detalle-trabajo/`,
            method: 'GET',
        });
        console.log('Respuesta del backend:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error en la petición GET:', error);
        return rejectWithValue('Error al obtener las asistencias de usuarios');
    }
});

export const visitasSlice = createSlice({
    name: 'visitas/visitasSlice',
    initialState,
    reducers: {},
    extraReducers(builder) {
        builder
            .addCase(listaVisitasSoporteThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaVisitasSoporteThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaVisitasSoporte = action.payload;
            })
            .addCase(listaVisitasSoporteThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleVisitaSoporteThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleVisitaSoporteThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleVisitasSoporte = action.payload;
            })
            .addCase(detalleVisitaSoporteThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaAsistenciaUsuariosThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaAsistenciaUsuariosThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaAsistenciaUsuarios = action.payload;
            })
            .addCase(listaAsistenciaUsuariosThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleAsistenciaUsuarioThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleAsistenciaUsuarioThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleAsistenciaUsuario = action.payload;
            })
            .addCase(detalleAsistenciaUsuarioThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaUsuarioEquipoAsistenciaThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaUsuarioEquipoAsistenciaThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaUsuarioEquipoAsistencia = action.payload;
            })
            .addCase(listaUsuarioEquipoAsistenciaThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleUsuarioEquipoAsistenciaThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleUsuarioEquipoAsistenciaThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleUsuarioEquipoAsistencia = action.payload;
            })
            .addCase(detalleUsuarioEquipoAsistenciaThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaEntregaEquipoThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaEntregaEquipoThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaEntregaEquipos = action.payload;
            })
            .addCase(listaEntregaEquipoThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleEntregaEquipoThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleEntregaEquipoThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleEntregaEquipo = action.payload;
            })
            .addCase(detalleEntregaEquipoThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaInsumosEnVisitaSoporteThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaInsumosEnVisitaSoporteThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaInsumosEnVisita = action.payload;
            })
            .addCase(listaInsumosEnVisitaSoporteThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // .addCase(listaGuiaDeSalidaFiltradaThunk.pending, (state) => {
            //     state.loading = true
            // })
            // .addCase(listaGuiaDeSalidaFiltradaThunk.fulfilled, (state, action) => {
            //     state.loading = false
            //     state.listaGuiaDeSalidaFiltrada = action.payload
            // })
            // .addCase(listaGuiaDeSalidaFiltradaThunk.rejected, (state, action) => {
            //     state.loading = false
            //     state.error = action.payload
            // })
            .addCase(listaDeEquiposParaEntregarThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaDeEquiposParaEntregarThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaDeEquiposParaEntregar = action.payload;
            })
            .addCase(listaDeEquiposParaEntregarThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaTodosAsistenciaUsuariosThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaTodosAsistenciaUsuariosThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaTodosAsistenciaUsuarios = action.payload;
            })
            .addCase(listaTodosAsistenciaUsuariosThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const {} = visitasSlice.actions;

export default visitasSlice.reducer;
