import {
    IEmpresa,
    IRelacionEmpresa,
    ISucursalEmpresa,
    IUltimasActividadesUsuarioEmpresa,
    IUsuarioEmpresa,
} from '@/interface/empresas.interface';
import ApiService from '@/services/ApiService';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface EmpresaState {
    loading: boolean;
    error: string | undefined;
    listaEmpresas: IEmpresa[];
    listaUsuariosEmpresa: IUsuarioEmpresa[];
    detalleUsuarioEmpresa: IUsuarioEmpresa | undefined;
    listaUltimasActividades: IUltimasActividadesUsuarioEmpresa[];
    selectEmpresas: IEmpresa[];
    detalleEmpresa: IEmpresa | undefined;
    listaMisClientes: IRelacionEmpresa[];
    listaMisClientesRrhh: IRelacionEmpresa[];
    listaMisProspectos: IRelacionEmpresa[];
    detalleCliente: IRelacionEmpresa | undefined;
    listaUsuariosCliente: IUsuarioEmpresa[];
    listaMisSucursales: ISucursalEmpresa[];
    listaUsuariosTodaLaEmpresa: IUsuarioEmpresa[];
    detalleSucursal: ISucursalEmpresa | undefined;
    listaUsuariosDeMisClientes: IUsuarioEmpresa[];
    listaUsuariosEmpresaYCliente: IUsuarioEmpresa[];
    listaUsuariosTodoElCliente: IUsuarioEmpresa[];
    usuarioEmpresaLogeado: IUsuarioEmpresa | undefined;
}

const initialState: EmpresaState = {
    loading: false,
    error: undefined,
    listaEmpresas: [],
    listaUsuariosEmpresa: [],
    detalleUsuarioEmpresa: undefined,
    listaUltimasActividades: [],
    selectEmpresas: [],
    detalleEmpresa: undefined,
    listaMisClientes: [],
    listaMisClientesRrhh: [],
    listaMisProspectos: [],
    detalleCliente: undefined,
    listaUsuariosCliente: [],
    listaMisSucursales: [],
    listaUsuariosTodaLaEmpresa: [],
    detalleSucursal: undefined,
    listaUsuariosDeMisClientes: [],
    listaUsuariosEmpresaYCliente: [],
    listaUsuariosTodoElCliente: [],
    usuarioEmpresaLogeado: undefined,
};

export const listaUsuariosEmpresaYClienteThunk = createAsyncThunk<
    IUsuarioEmpresa[],
    { ids_empresa: number[] },
    { rejectValue: string }
>('empresa/listaUsuariosEmpresaYClienteThunk', async ({ ids_empresa }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IUsuarioEmpresa[], string>({
            url: `/api/usuarios-empresa/usuarios_por_empresas/`,
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({ empresa_ids: ids_empresa }),
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data || 'Error en la lista usuarios');
    }
});

export const listaUsuariosDeMisClientesThunk = createAsyncThunk<
    IUsuarioEmpresa[],
    { id_empresa: number | string | undefined },
    { rejectValue: string }
>('empresa/listaUsuariosDeMisClientesThunk', async ({ id_empresa }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IUsuarioEmpresa[]>({
            url: `/api/empresas/${id_empresa}/usuarios-de-clientes/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaUsuariosTodaLaEmpresaThunk = createAsyncThunk<
    IUsuarioEmpresa[],
    { id_empresa: number | string | undefined },
    { rejectValue: string }
>('empresa/listaUsuariosTodaLaEmpresaThunk', async ({ id_empresa }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IUsuarioEmpresa[]>({
            url: `/api/empresas/${id_empresa}/usuarios/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaUsuariosTodoElClienteThunk = createAsyncThunk<
    IUsuarioEmpresa[],
    { id_empresa: number | string | undefined },
    { rejectValue: string }
>('empresa/listaUsuariosTodoElClienteThunk', async ({ id_empresa }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IUsuarioEmpresa[]>({
            url: `/api/empresas/${id_empresa}/usuarios/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaMisSucursalesThunk = createAsyncThunk<
    ISucursalEmpresa[],
    { id_empresa: number | string | undefined },
    { rejectValue: string }
>('empresa/listaMisSucursalesThunk', async ({ id_empresa }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ISucursalEmpresa[]>({
            url: `/api/empresas/${id_empresa}/sucursales/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaUsuariosClienteThunk = createAsyncThunk<
    IUsuarioEmpresa[],
    { id_empresa: number | string | undefined; id_sucursal: string | number | undefined },
    { rejectValue: string }
>('empresa/listaUsuariosClienteThunk', async ({ id_empresa, id_sucursal }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IUsuarioEmpresa[]>({
            url: `/api/empresas/${id_empresa}/sucursales-empresa/${id_sucursal}/usuarios/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const detalleClienteThunk = createAsyncThunk<
    IRelacionEmpresa,
    { id_relacion: string | number | undefined },
    { rejectValue: string }
>('empresa/detalleClienteThunk', async ({ id_relacion }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IRelacionEmpresa>({
            url: `/api/relaciones-empresa/${id_relacion}/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaMisClientesThunk = createAsyncThunk<
    IRelacionEmpresa[],
    { id_empresa: number | string | undefined | null },
    { rejectValue: string }
>('empresa/listaMisClientesThunk', async ({ id_empresa }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IRelacionEmpresa[]>({
            url: `/api/empresas/${id_empresa}/mis-clientes`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaMisClientesRrhhThunk = createAsyncThunk<
    IRelacionEmpresa[],
    { id_empresa: number | string | undefined | null },
    { rejectValue: string }
>('empresa/listaMisClientesRrhhThunk', async ({ id_empresa }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IRelacionEmpresa[]>({
            url: `/api/empresas/${id_empresa}/mis-clientes?tipo=rrhh-cliente`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaMisProspectosThunk = createAsyncThunk<
    IRelacionEmpresa[],
    { id_empresa: number | string | undefined | null },
    { rejectValue: string }
>('empresa/listaMisProspectosThunk', async ({ id_empresa }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IRelacionEmpresa[]>({
            url: `/api/empresas/${id_empresa}/mis-prospectos/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const detalleEmpresaThunk = createAsyncThunk<
    IEmpresa,
    { id_empresa: string | number | undefined },
    { rejectValue: string }
>('empresa/detalleEmpresaThunk', async ({ id_empresa }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IEmpresa>({
            url: `/api/empresas/${id_empresa}`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const selectEmpresasThunk = createAsyncThunk<IEmpresa[], undefined, { rejectValue: string }>(
    'empresa/selectEmpresasThunk',
    async (_, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<IEmpresa[]>({
                url: '/api/empresas/select-empresas',
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    },
);

export const listaEmpresasThunk = createAsyncThunk<IEmpresa[], undefined, { rejectValue: string }>(
    'empresa/listaEmpresasThunk',
    async (_, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<IEmpresa[]>({
                url: '/api/empresas/',
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error);
        }
    },
);

export const listaUsuariosEmpresaThunk = createAsyncThunk<
    IUsuarioEmpresa[],
    undefined,
    { rejectValue: string }
>('empresa/listaUsuariosEmpresaThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IUsuarioEmpresa[]>({
            url: `/api/usuarios-empresa/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const detalleUsuarioEmpresaPorUserThunk = createAsyncThunk<
    IUsuarioEmpresa,
    { id_usuario: string | number | undefined },
    { rejectValue: string }
>('empresa/detalleUsuarioEmpresaPorUserThunk', async ({ id_usuario }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IUsuarioEmpresa>({
            url: `/api/usuarios-empresa/detalle-usuario/?usuario_id=${id_usuario}`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaUltimasActividadesThunk = createAsyncThunk<
    IUltimasActividadesUsuarioEmpresa[],
    { id_usuario_empresa: number | string | undefined },
    { rejectValue: string }
>('empresa/listaUltimasActividadesThunk', async ({ id_usuario_empresa }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IUltimasActividadesUsuarioEmpresa[]>({
            url: `/api/usuarios-empresa/${id_usuario_empresa}/ultimas-actividades/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const detalleSucursalThunk = createAsyncThunk<
    ISucursalEmpresa,
    { id_empresa: string | number | undefined; id_sucursal: string | number | undefined },
    { rejectValue: string }
>('empresa/detalleSucursalThunk', async ({ id_empresa, id_sucursal }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ISucursalEmpresa>({
            url: `/api/empresas/${id_empresa}/sucursales-empresa/${id_sucursal}/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const usuarioEmpresaLogeadoThunk = createAsyncThunk<
    IUsuarioEmpresa,
    { id_usuario: string | number | undefined },
    { rejectValue: string }
>('empresa/usuarioEmpresaLogeadoThunk', async ({ id_usuario }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IUsuarioEmpresa>({
            url: `/api/usuarios-empresa/detalle-usuario/?usuario_id=${id_usuario}`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

const empresaSlice = createSlice({
    name: 'empresa/empresaSlice',
    initialState,
    reducers: {},
    extraReducers(builder) {
        builder
            .addCase(listaEmpresasThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaEmpresasThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaEmpresas = action.payload;
            })
            .addCase(listaEmpresasThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaUsuariosEmpresaThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaUsuariosEmpresaThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaUsuariosEmpresa = action.payload;
            })
            .addCase(listaUsuariosEmpresaThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleUsuarioEmpresaPorUserThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleUsuarioEmpresaPorUserThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleUsuarioEmpresa = action.payload;
            })
            .addCase(detalleUsuarioEmpresaPorUserThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaUltimasActividadesThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaUltimasActividadesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaUltimasActividades = action.payload;
            })
            .addCase(listaUltimasActividadesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(selectEmpresasThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(selectEmpresasThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.selectEmpresas = action.payload;
            })
            .addCase(selectEmpresasThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleEmpresaThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleEmpresaThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleEmpresa = action.payload;
            })
            .addCase(detalleEmpresaThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaMisClientesThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaMisClientesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaMisClientes = action.payload;
            })
            .addCase(listaMisClientesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaMisClientesRrhhThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaMisClientesRrhhThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaMisClientesRrhh = action.payload;
            })
            .addCase(listaMisClientesRrhhThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaMisProspectosThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaMisProspectosThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaMisProspectos = action.payload;
            })
            .addCase(listaMisProspectosThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleClienteThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleClienteThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleCliente = action.payload;
            })
            .addCase(detalleClienteThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaUsuariosClienteThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaUsuariosClienteThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaUsuariosCliente = action.payload;
            })
            .addCase(listaUsuariosClienteThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaMisSucursalesThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaMisSucursalesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaMisSucursales = action.payload;
            })
            .addCase(listaMisSucursalesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaUsuariosTodaLaEmpresaThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaUsuariosTodaLaEmpresaThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaUsuariosTodaLaEmpresa = action.payload;
            })
            .addCase(listaUsuariosTodaLaEmpresaThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleSucursalThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleSucursalThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleSucursal = action.payload;
            })
            .addCase(detalleSucursalThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaUsuariosDeMisClientesThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaUsuariosDeMisClientesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaUsuariosDeMisClientes = action.payload;
            })
            .addCase(listaUsuariosDeMisClientesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaUsuariosEmpresaYClienteThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaUsuariosEmpresaYClienteThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaUsuariosEmpresaYCliente = action.payload;
            })
            .addCase(listaUsuariosEmpresaYClienteThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaUsuariosTodoElClienteThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaUsuariosTodoElClienteThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaUsuariosTodoElCliente = action.payload;
            })
            .addCase(listaUsuariosTodoElClienteThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(usuarioEmpresaLogeadoThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(usuarioEmpresaLogeadoThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.usuarioEmpresaLogeado = action.payload;
            })
            .addCase(usuarioEmpresaLogeadoThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const {} = empresaSlice.actions;

export default empresaSlice.reducer;
