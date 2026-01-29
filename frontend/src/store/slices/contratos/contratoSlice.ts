import {
    ICondicionEspecial,
    IContratoEmpresaCliente,
    IContratoLicencia,
    IContratoServicio,
    IDetalleEnvio,
    IFirmaConfidencialidad,
    ILicencia,
    IPlanServicio,
    IServicio,
    IUsuarioVinculadoLicencia,
    IVisita,
} from '@/interface/contrato.interface';
import { IUsuarioEmpresa } from '@/interface/empresas.interface';
import ApiService from '@/services/ApiService';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface ContratoState {
    loading: boolean;
    error: string | undefined;
    listaContratosDeEmpresaYCliente: IContratoEmpresaCliente[];
    detalleContratoEmpresaCliente: IContratoEmpresaCliente | undefined;
    listaFirmasConfidencialidad: IFirmaConfidencialidad[];
    listaCondicionesEspeciales: ICondicionEspecial[];
    listaVisitas: IVisita[];
    listaLicencias: ILicencia[];
    listaServicios: IServicio[];
    listaPlanServicios: IPlanServicio[];
    listaContratoServicio: IContratoServicio[];
    listaContratoLicenciaDeEmpresaYCliente: IContratoLicencia[];
    listaUsuariosVinculadosLicencia: IUsuarioVinculadoLicencia[];
    listaUsuariosDisponiblesLicencia: IUsuarioEmpresa[];
    detalleContratoLicencia: IContratoLicencia | undefined;
    detalleFirmaContrato: IDetalleEnvio | undefined;
}

const initialState: ContratoState = {
    loading: false,
    error: undefined,
    listaContratosDeEmpresaYCliente: [],
    detalleContratoEmpresaCliente: undefined,
    listaFirmasConfidencialidad: [],
    listaCondicionesEspeciales: [],
    listaVisitas: [],
    listaLicencias: [],
    listaServicios: [],
    listaPlanServicios: [],
    listaContratoServicio: [],
    listaContratoLicenciaDeEmpresaYCliente: [],
    listaUsuariosVinculadosLicencia: [],
    listaUsuariosDisponiblesLicencia: [],
    detalleContratoLicencia: undefined,
    detalleFirmaContrato: undefined,
};

export const detalleFirmaContratoThunk = createAsyncThunk<
    IDetalleEnvio,
    { uuid_envio: string | undefined },
    { rejectValue: string }
>('contrato/detalleFirmaContratoThunk', async ({ uuid_envio }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IDetalleEnvio>({
            url: `/api/acuerdos-por-envio/${uuid_envio}/`,
            isLoginRequest: true,
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data || 'Error al obtener los datos');
    }
});

export const detalleContratoLicenciaThunk = createAsyncThunk<
    IContratoLicencia,
    { id_licencia: string | number | undefined },
    { rejectValue: string }
>('contrato/detalleContratoLicenciaThunk', async ({ id_licencia }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IContratoLicencia>({
            url: `/api/contrato-licencias/${id_licencia}/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data || 'Error al obtener el detalle de la licencia');
    }
});

export const listaUsuariosDisponiblesLicenciaThunk = createAsyncThunk<
    IUsuarioEmpresa[],
    { id_licencia: string | number | undefined; id_empresa: string | number | undefined },
    { rejectValue: string }
>(
    'contrato/listaUsuariosDisponiblesLicenciaThunk',
    async ({ id_licencia, id_empresa }, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<IUsuarioEmpresa[]>({
                url: `/api/contrato-licencias/${id_licencia}/usuarios-vinculados/empresa/${id_empresa}/usuarios-no-vinculados/`,
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(
                error.response.data || 'Error al obtener los usuarios disponibles',
            );
        }
    },
);

export const listaUsuariosVinculadosLicenciaThunk = createAsyncThunk<
    IUsuarioVinculadoLicencia[],
    { id_licencia: number | string | undefined },
    { rejectValue: string }
>('contrato/listaUsuariosVinculadosLicenciaThunk', async ({ id_licencia }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IUsuarioVinculadoLicencia[]>({
            url: `/api/contrato-licencias/${id_licencia}/usuarios-vinculados/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data || 'Error al obtener las licencias');
    }
});

export const listaContratoLicenciaDeEmpresaYClienteThunk = createAsyncThunk<
    IContratoLicencia[],
    { id_cliente: number | string | undefined; id_empresa: number | string | undefined },
    { rejectValue: string }
>(
    'contrato/listaContratoLicenciaDeEmpresaYClienteThunk',
    async ({ id_cliente, id_empresa }, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<IContratoLicencia[]>({
                url: `/api/contrato-licencias/lista-vinculos/${id_empresa}/${id_cliente}/`,
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    },
);

export const listaContratosDeEmpresaYClienteThunk = createAsyncThunk<
    IContratoEmpresaCliente[],
    { id_empresa: number | string | undefined; id_cliente: number | string | undefined },
    { rejectValue: string }
>(
    'contrato/listaContratosDeEmpresaYClienteThunk',
    async ({ id_cliente, id_empresa }, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<IContratoEmpresaCliente[]>({
                url: `/api/contratos/filtrar-por-empresa-cliente/${id_empresa}/${id_cliente}/`,
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response.data || 'Error al obtener la lista de contratos');
        }
    },
);

export const detalleContratoEmpresaClienteThunk = createAsyncThunk<
    IContratoEmpresaCliente,
    { id_contrato: number | string | undefined | null },
    { rejectValue: string }
>('contrato/detalleContratoEmpresaClienteThunk', async ({ id_contrato }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IContratoEmpresaCliente>({
            url: `/api/contratos/${id_contrato}/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data || 'Error al obtener el detalle de contrato');
    }
});

export const listaFirmasConfidencialidadThunk = createAsyncThunk<
    IFirmaConfidencialidad[],
    { id_contrato: number | string | undefined | null },
    { rejectValue: string }
>('contrato/listaFirmasConfidencialidadThunk', async ({ id_contrato }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IFirmaConfidencialidad[]>({
            url: `/api/contratos/${id_contrato}/firmas/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(
            error.response.data || 'Error al obtener las firmas de confidencialidad',
        );
    }
});

export const listaCondicionesEspecialesThunk = createAsyncThunk<
    ICondicionEspecial[],
    undefined,
    { rejectValue: string }
>('contrato/listaCondicionesEspecialesThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ICondicionEspecial[]>({
            url: `/api/condiciones-especiales`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(
            error.response.data || 'Error al obtener las condiciones especiales',
        );
    }
});

export const listaVisitasThunk = createAsyncThunk<IVisita[], undefined, { rejectValue: string }>(
    'contrato/listaVisitasThunk',
    async (_, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<IVisita[]>({
                url: `/api/visitas`,
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response.data || 'Error al obtener las visitas');
        }
    },
);

export const listaLicenciasThunk = createAsyncThunk<
    ILicencia[],
    undefined,
    { rejectValue: string }
>('contrato/listaLicenciasThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<ILicencia[]>({
            url: `/api/licencias`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data || 'Error al obtener las licencias');
    }
});

export const listaServiciosThunk = createAsyncThunk<
    IServicio[],
    undefined,
    { rejectValue: string }
>('contrato/listaServiciosThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IServicio[]>({
            url: `/api/servicios`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data || 'Error al obtener los servicios');
    }
});

export const listaPlanServiciosThunk = createAsyncThunk<
    IPlanServicio[],
    undefined,
    { rejectValue: string }
>('contrato/listaPlanServiciosThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IPlanServicio[]>({
            url: `/api/planes-servicio`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data || 'Error al obtener los planes de servicios');
    }
});

export const listaContratoServicioThunk = createAsyncThunk<
    IContratoServicio[],
    { id_contrato: number | string | undefined },
    { rejectValue: string }
>('contrato/listaContratoServicioThunk', async ({ id_contrato }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IContratoServicio[]>({
            url: `/api/contratos/${id_contrato}/servicios/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data || 'Error al obtener los servicios');
    }
});

const contratoSlice = createSlice({
    name: `contrato/contratoSlice`,
    initialState,
    reducers: {
        LIMPIAR_DETALLE_CONTRATO: (state) => {
            state.detalleContratoEmpresaCliente = undefined;
        },
        LIMPIAR_USUARIOS_VINCULADOS_LICENCIA: (state) => {
            state.listaUsuariosVinculadosLicencia = [];
        },
        LIMPIAR_DETALLE_LICENCIA: (state) => {
            state.detalleContratoLicencia = undefined;
        },
    },
    extraReducers(builder) {
        builder
            .addCase(listaContratosDeEmpresaYClienteThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaContratosDeEmpresaYClienteThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaContratosDeEmpresaYCliente = action.payload;
            })
            .addCase(listaContratosDeEmpresaYClienteThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleContratoEmpresaClienteThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleContratoEmpresaClienteThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleContratoEmpresaCliente = action.payload;
            })
            .addCase(detalleContratoEmpresaClienteThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaFirmasConfidencialidadThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaFirmasConfidencialidadThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaFirmasConfidencialidad = action.payload;
            })
            .addCase(listaFirmasConfidencialidadThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaCondicionesEspecialesThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaCondicionesEspecialesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaCondicionesEspeciales = action.payload;
            })
            .addCase(listaCondicionesEspecialesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaVisitasThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaVisitasThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaVisitas = action.payload;
            })
            .addCase(listaVisitasThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaLicenciasThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaLicenciasThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaLicencias = action.payload;
            })
            .addCase(listaLicenciasThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaServiciosThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaServiciosThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaServicios = action.payload;
            })
            .addCase(listaServiciosThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaPlanServiciosThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaPlanServiciosThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaPlanServicios = action.payload;
            })
            .addCase(listaPlanServiciosThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaContratoServicioThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaContratoServicioThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaContratoServicio = action.payload;
            })
            .addCase(listaContratoServicioThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaContratoLicenciaDeEmpresaYClienteThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaContratoLicenciaDeEmpresaYClienteThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaContratoLicenciaDeEmpresaYCliente = action.payload;
            })
            .addCase(listaContratoLicenciaDeEmpresaYClienteThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaUsuariosVinculadosLicenciaThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaUsuariosVinculadosLicenciaThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaUsuariosVinculadosLicencia = action.payload;
            })
            .addCase(listaUsuariosVinculadosLicenciaThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaUsuariosDisponiblesLicenciaThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaUsuariosDisponiblesLicenciaThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaUsuariosDisponiblesLicencia = action.payload;
            })
            .addCase(listaUsuariosDisponiblesLicenciaThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleContratoLicenciaThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleContratoLicenciaThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleContratoLicencia = action.payload;
            })
            .addCase(detalleContratoLicenciaThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detalleFirmaContratoThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(detalleFirmaContratoThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.detalleFirmaContrato = action.payload;
            })
            .addCase(detalleFirmaContratoThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const {
    LIMPIAR_DETALLE_CONTRATO,
    LIMPIAR_USUARIOS_VINCULADOS_LICENCIA,
    LIMPIAR_DETALLE_LICENCIA,
} = contratoSlice.actions;

export default contratoSlice.reducer;
