import {
    IEquipo,
    IFotoEquipo,
    ISoftware,
    ISoftwareDeEmpresa,
    IUsuarioEquipo,
} from '@/interface/recursos.interface';
import ApiService from '@/services/ApiService';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface RecursosState {
    loading: boolean;
    error: string | undefined;
    listaEquiposEmpresa: IEquipo[];
    detalleEquipoEmpresa: IEquipo | undefined;
    listaUsuariosDelEquipo: IUsuarioEquipo[];
    listaUsuariosDelEquipoPorCliente: IUsuarioEquipo[];
    listaEquiposDeMisClientes: IEquipo[];
    listaSoftware: ISoftware[];
    listaSoftwareEmpresa: ISoftwareDeEmpresa[];
    listaEquiposPorCliente: IEquipo[];
    listaFotosDelEquipo: IFotoEquipo[];
}

const initialState: RecursosState = {
    loading: false,
    error: undefined,
    listaEquiposEmpresa: [],
    detalleEquipoEmpresa: undefined,
    listaUsuariosDelEquipo: [],
    listaUsuariosDelEquipoPorCliente: [],
    listaEquiposDeMisClientes: [],
    listaSoftware: [],
    listaSoftwareEmpresa: [],
    listaEquiposPorCliente: [],
    listaFotosDelEquipo: [],
};

export const listaEquiposEmpresaThunk = createAsyncThunk<
    IEquipo[],
    { id_empresa: number | string | undefined | null },
    { rejectValue: string }
>('recursos/listaEquiposEmpresaThunk', async ({ id_empresa }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IEquipo[]>({
            url: `/api/empresas/${id_empresa}/equipos/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const detalleEquipoEmpresaThunk = createAsyncThunk<
    IEquipo,
    { id_equipo: number | undefined | string },
    { rejectValue: string }
>('recursos/detalleEquipoEmpresaThunk', async ({ id_equipo }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IEquipo>({
            url: `/api/equipos/${id_equipo}/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaUsuariosDelEquipoThunk = createAsyncThunk<
    IUsuarioEquipo[],
    { id_equipo: number | string | undefined },
    { rejectValue: string }
>('recursos/listaUsuariosDelEquipoThunk', async ({ id_equipo }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IUsuarioEquipo[]>({
            url: `/api/equipos/${id_equipo}/usuario-equipo/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(
            error.response.data || 'Error al obtener la lista de usuarios del equipo',
        );
    }
});

export const listaUsuariosDelEquipoPorClienteThunk = createAsyncThunk<
    IUsuarioEquipo[],
    { cliente_id: number | string | undefined },
    { rejectValue: string }
>('recursos/listaUsuariosDelEquipoPorClienteThunk', async ({ cliente_id }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IUsuarioEquipo[]>({
            url: `/api/usuarios-equipo/por-cliente/?cliente_id=${cliente_id}`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaEquiposDeMisClientesThunk = createAsyncThunk<
    IEquipo[],
    { id_empresa: number | string | undefined },
    { rejectValue: string }
>('recursos/listaEquiposDeMisClientesThunk', async ({ id_empresa }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IEquipo[]>({
            url: `/api/empresas/${id_empresa}/equipos-clientes`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaSoftwareThunk = createAsyncThunk<ISoftware[], undefined, { rejectValue: string }>(
    'recursos/listaSoftwareThunk',
    async (_, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<ISoftware[]>({
                url: `/api/softwares/`,
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    },
);

export const listaSoftwareDeEmpresaThunk = createAsyncThunk<
    ISoftwareDeEmpresa[],
    { id_empresa: number | string | undefined },
    { rejectValue: string }
>('recursos/listaSoftwareDeEmpresaThunk', async ({ id_empresa }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ISoftwareDeEmpresa[]>({
            url: `/api/software-empresa/empresa/${id_empresa}/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(
            error.response.data || 'Error al obtener la lista de softwares de empresa',
        );
    }
});

export const listaEquiposPorClienteThunk = createAsyncThunk<
    IEquipo[],
    { cliente_id: number | string | undefined },
    { rejectValue: string }
>('recursos/listaEquiposPorClienteThunk', async ({ cliente_id }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IEquipo[]>({
            url: `/api/equipos/por-cliente/?cliente_id=${cliente_id}`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data || 'Error al obtener los equipos del cliente');
    }
});

export const listaFotosDelEquipoThunk = createAsyncThunk<
    IFotoEquipo[],
    { id_equipo: string | number | undefined },
    { rejectValue: string }
>('recursos/listaFotosDelEquipoThunk', async ({ id_equipo }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<[]>({
            url: `/api/equipos/${id_equipo}/fotos/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const recursosSlice = createSlice({
    name: 'recursos/recursosSlice',
    initialState,
    reducers: {},
    extraReducers(builder) {
        builder
            .addCase(listaEquiposEmpresaThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaEquiposEmpresaThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaEquiposEmpresa = action.payload;
            })
            .addCase(listaEquiposEmpresaThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleEquipoEmpresaThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleEquipoEmpresaThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleEquipoEmpresa = action.payload;
            })
            .addCase(detalleEquipoEmpresaThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaUsuariosDelEquipoThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaUsuariosDelEquipoThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaUsuariosDelEquipo = action.payload;
            })
            .addCase(listaUsuariosDelEquipoThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaUsuariosDelEquipoPorClienteThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaUsuariosDelEquipoPorClienteThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaUsuariosDelEquipoPorCliente = action.payload;
            })
            .addCase(listaUsuariosDelEquipoPorClienteThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaEquiposDeMisClientesThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaEquiposDeMisClientesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaEquiposDeMisClientes = action.payload;
            })
            .addCase(listaEquiposDeMisClientesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaSoftwareThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaSoftwareThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaSoftware = action.payload;
            })
            .addCase(listaSoftwareThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaSoftwareDeEmpresaThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaSoftwareDeEmpresaThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaSoftwareEmpresa = action.payload;
            })
            .addCase(listaSoftwareDeEmpresaThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaEquiposPorClienteThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaEquiposPorClienteThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaEquiposEmpresa = action.payload;
            })
            .addCase(listaEquiposPorClienteThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaFotosDelEquipoThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaFotosDelEquipoThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaFotosDelEquipo = action.payload;
            })
            .addCase(listaFotosDelEquipoThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const {} = recursosSlice.actions;

export default recursosSlice.reducer;
