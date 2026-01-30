import { IDiaCalendario, ISolicitudVacaciones } from '@/interface/calendario.interface';
import ApiService from '@/services/ApiService';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface CalendarioState {
    loading: boolean;
    error: string | undefined;
    detalleDiaCalendario: IDiaCalendario | undefined;
    listaSolicitudesVacaciones: ISolicitudVacaciones[];
    detalleSolicitudVacaciones: ISolicitudVacaciones | undefined;
    listaMisSolicitudesVacaciones: ISolicitudVacaciones[];
    listaDiasCalendario: IDiaCalendario[];
    listaSolicitudesVacacionesUsuario: ISolicitudVacaciones[];
}

const initialState: CalendarioState = {
    loading: false,
    error: undefined,
    detalleDiaCalendario: undefined,
    listaSolicitudesVacaciones: [],
    detalleSolicitudVacaciones: undefined,
    listaMisSolicitudesVacaciones: [],
    listaDiasCalendario: [],
    listaSolicitudesVacacionesUsuario: [],
};

export const listaSolicitudesVacacionesUsuarioThunk = createAsyncThunk<
    ISolicitudVacaciones[],
    { filtro: URLSearchParams },
    { rejectValue: string }
>('calendario/listaSolicitudesVacacionesUsuarioThunk', async ({ filtro }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ISolicitudVacaciones[]>({
            url: `/api/solicitudes-vacaciones/por-usuario`,
            method: 'get',
            params: filtro,
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const detalleDiaCalendarioThunk = createAsyncThunk<
    IDiaCalendario,
    { fecha: string },
    { rejectValue: string }
>('calendario/detalleDiaCalendarioThunk', async ({ fecha }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IDiaCalendario>({
            url: `/api/dias-calendario/${fecha}`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data || 'Error al obtener detalle del día');
    }
});

export const listaSolicitudesVacacionesThunk = createAsyncThunk<
    ISolicitudVacaciones[],
    undefined,
    { rejectValue: string }
>('calendario/listaSolicitudesVacacionesThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ISolicitudVacaciones[]>({
            url: '/api/solicitudes-vacaciones/',
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const detalleSolicitudVacacionesThunk = createAsyncThunk<
    ISolicitudVacaciones,
    { id_solicitud: number | string | undefined },
    { rejectValue: string }
>('calendario/detalleSolicitudVacacionesThunk', async ({ id_solicitud }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ISolicitudVacaciones>({
            url: `/api/solicitudes-vacaciones/${id_solicitud}/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaMisSolicitudesVacacionesThunk = createAsyncThunk<
    ISolicitudVacaciones[],
    undefined,
    { rejectValue: string }
>('calendario/listaMisSolicitudesVacacionesThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ISolicitudVacaciones[]>({
            url: `/api/solicitudes-vacaciones/mis-solicitudes/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaDiasCalendarioThunk = createAsyncThunk<
    IDiaCalendario[],
    undefined,
    { rejectValue: string }
>('calendario/listaDiasCalendarioThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IDiaCalendario[]>({
            url: `/api/dias-calendario`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

const calendarioSlice = createSlice({
    name: `calendario/calendarioSlice`,
    initialState,
    reducers: {},
    extraReducers(builder) {
        builder
            .addCase(detalleDiaCalendarioThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleDiaCalendarioThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleDiaCalendario = action.payload;
            })
            .addCase(detalleDiaCalendarioThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaSolicitudesVacacionesThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaSolicitudesVacacionesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaSolicitudesVacaciones = action.payload;
            })
            .addCase(listaSolicitudesVacacionesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleSolicitudVacacionesThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleSolicitudVacacionesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleSolicitudVacaciones = action.payload;
            })
            .addCase(detalleSolicitudVacacionesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaMisSolicitudesVacacionesThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaMisSolicitudesVacacionesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaMisSolicitudesVacaciones = action.payload;
            })
            .addCase(listaMisSolicitudesVacacionesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaDiasCalendarioThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaDiasCalendarioThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaDiasCalendario = action.payload;
            })
            .addCase(listaDiasCalendarioThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaSolicitudesVacacionesUsuarioThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaSolicitudesVacacionesUsuarioThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaSolicitudesVacacionesUsuario = action.payload;
            })
            .addCase(listaSolicitudesVacacionesUsuarioThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const {} = calendarioSlice.actions;

export default calendarioSlice.reducer;
