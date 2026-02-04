import {
    IIndicadoresEconomicosBackend,
    IMetricasBodegasResponse,
    IMetricasContratosResponse,
    IMetricasCotizacionesResponse,
    IMetricasOTResponse,
    IMetricasRendicionesResponse,
    IMetricasVacacionesResponse,
} from '@/interface/dashboard-metrics.interface';
import { IndicadoresEconomicos } from '@/interface/dashboard.interface';
import ApiService from '@/services/ApiService';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Tipos de período
export type DashboardPeriodType = 'day' | 'week' | 'month' | 'custom';

// Helpers para fechas
const getFirstDayOfMonth = (): string => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
};

const getToday = (): string => {
    return new Date().toISOString().split('T')[0];
};

// Calcular fechas del período anterior para comparación
const getPreviousPeriodDates = (
    fechaInicio: string,
    fechaFin: string,
): { fechaInicio: string; fechaFin: string } => {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diffDays = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));

    const prevFin = new Date(inicio);
    prevFin.setDate(prevFin.getDate() - 1);

    const prevInicio = new Date(prevFin);
    prevInicio.setDate(prevInicio.getDate() - diffDays);

    return {
        fechaInicio: prevInicio.toISOString().split('T')[0],
        fechaFin: prevFin.toISOString().split('T')[0],
    };
};

export interface DashboardState {
    loading: boolean;
    error: string | undefined;
    ultimosValoresIndicadores: IndicadoresEconomicos | undefined;
    // Nueva estructura para métricas
    metricsLoading: {
        indicadores: boolean;
        ot: boolean;
        cotizaciones: boolean;
        rendiciones: boolean;
        bodegas: boolean;
        contratos: boolean;
        vacaciones: boolean;
    };
    metricsError: {
        indicadores: string | null;
        ot: string | null;
        cotizaciones: string | null;
        rendiciones: string | null;
        bodegas: string | null;
        contratos: string | null;
        vacaciones: string | null;
    };
    indicadores: IIndicadoresEconomicosBackend | null;
    metricas: {
        ot: IMetricasOTResponse | null;
        cotizaciones: IMetricasCotizacionesResponse | null;
        rendiciones: IMetricasRendicionesResponse | null;
        bodegas: IMetricasBodegasResponse | null;
        contratos: IMetricasContratosResponse | null;
        vacaciones: IMetricasVacacionesResponse | null;
    };
    // Métricas del período anterior para comparación
    metricasAnteriores: {
        ot: IMetricasOTResponse | null;
        cotizaciones: IMetricasCotizacionesResponse | null;
        rendiciones: IMetricasRendicionesResponse | null;
    };
    filtroFechas: {
        fechaInicio: string;
        fechaFin: string;
    };
    // Período activo
    activePeriod: DashboardPeriodType;
}

const initialState: DashboardState = {
    loading: false,
    error: undefined,
    ultimosValoresIndicadores: undefined,
    metricsLoading: {
        indicadores: false,
        ot: false,
        cotizaciones: false,
        rendiciones: false,
        bodegas: false,
        contratos: false,
        vacaciones: false,
    },
    metricsError: {
        indicadores: null,
        ot: null,
        cotizaciones: null,
        rendiciones: null,
        bodegas: null,
        contratos: null,
        vacaciones: null,
    },
    indicadores: null,
    metricas: {
        ot: null,
        cotizaciones: null,
        rendiciones: null,
        bodegas: null,
        contratos: null,
        vacaciones: null,
    },
    metricasAnteriores: {
        ot: null,
        cotizaciones: null,
        rendiciones: null,
    },
    filtroFechas: {
        fechaInicio: getFirstDayOfMonth(),
        fechaFin: getToday(),
    },
    activePeriod: 'month',
};

// ============= Thunk Legacy - Mindicador directo =============
export const ultimosValoresIndicadoresThunk = createAsyncThunk<
    IndicadoresEconomicos,
    undefined,
    { rejectValue: string }
>('dashboard/ultimosValoresIndicadoresThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IndicadoresEconomicos>({
            baseURL: `https://mindicador.cl`,
            url: '/api',
            method: 'get',
            isLoginRequest: true,
        });
        return response.data;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        return rejectWithValue(message);
    }
});

// ============= Thunks para métricas desde backend =============

interface FiltroFechasParams {
    fechaInicio?: string;
    fechaFin?: string;
}

// Indicadores económicos desde backend (con cache)
export const fetchIndicadoresBackendThunk = createAsyncThunk<
    IIndicadoresEconomicosBackend,
    FiltroFechasParams | undefined,
    { rejectValue: string }
>('dashboard/fetchIndicadoresBackend', async (params, { rejectWithValue }) => {
    try {
        const queryParams = params?.fechaInicio ? `?fecha=${params.fechaInicio}` : '';
        const response = await ApiService.fetchData<IIndicadoresEconomicosBackend>({
            url: `/api/indicadores-economicos/ultimos/${queryParams}`,
            method: 'get',
        });
        return response.data;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error al obtener indicadores';
        return rejectWithValue(message);
    }
});

// Métricas OT
export const fetchMetricasOTThunk = createAsyncThunk<
    IMetricasOTResponse,
    FiltroFechasParams | undefined,
    { rejectValue: string }
>('dashboard/fetchMetricasOT', async (params, { rejectWithValue, getState }) => {
    try {
        const state = getState() as { dashboard: DashboardState };
        const { fechaInicio, fechaFin } = params || state.dashboard.filtroFechas;
        const response = await ApiService.fetchData<IMetricasOTResponse>({
            url: `/api/ordenes-de-trabajo/metricas-dashboard/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`,
            method: 'get',
        });
        return response.data;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error al obtener métricas OT';
        return rejectWithValue(message);
    }
});

// Métricas Cotizaciones
export const fetchMetricasCotizacionesThunk = createAsyncThunk<
    IMetricasCotizacionesResponse,
    FiltroFechasParams | undefined,
    { rejectValue: string }
>('dashboard/fetchMetricasCotizaciones', async (params, { rejectWithValue, getState }) => {
    try {
        const state = getState() as { dashboard: DashboardState };
        const { fechaInicio, fechaFin } = params || state.dashboard.filtroFechas;
        const response = await ApiService.fetchData<IMetricasCotizacionesResponse>({
            url: `/api/cotizaciones/metricas-dashboard/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`,
            method: 'get',
        });
        return response.data;
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : 'Error al obtener métricas cotizaciones';
        return rejectWithValue(message);
    }
});

// Métricas Rendiciones
export const fetchMetricasRendicionesThunk = createAsyncThunk<
    IMetricasRendicionesResponse,
    FiltroFechasParams | undefined,
    { rejectValue: string }
>('dashboard/fetchMetricasRendiciones', async (params, { rejectWithValue, getState }) => {
    try {
        const state = getState() as { dashboard: DashboardState };
        const { fechaInicio, fechaFin } = params || state.dashboard.filtroFechas;
        const response = await ApiService.fetchData<IMetricasRendicionesResponse>({
            url: `/api/rendiciones/metricas-dashboard/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`,
            method: 'get',
        });
        return response.data;
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : 'Error al obtener métricas rendiciones';
        return rejectWithValue(message);
    }
});

// Métricas Bodegas
export const fetchMetricasBodegasThunk = createAsyncThunk<
    IMetricasBodegasResponse,
    FiltroFechasParams | undefined,
    { rejectValue: string }
>('dashboard/fetchMetricasBodegas', async (params, { rejectWithValue, getState }) => {
    try {
        const state = getState() as { dashboard: DashboardState };
        const { fechaInicio, fechaFin } = params || state.dashboard.filtroFechas;
        const response = await ApiService.fetchData<IMetricasBodegasResponse>({
            url: `/api/ordenes-compra/metricas-dashboard/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`,
            method: 'get',
        });
        return response.data;
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : 'Error al obtener métricas bodegas';
        return rejectWithValue(message);
    }
});

// Métricas Contratos
export const fetchMetricasContratosThunk = createAsyncThunk<
    IMetricasContratosResponse,
    FiltroFechasParams | undefined,
    { rejectValue: string }
>('dashboard/fetchMetricasContratos', async (params, { rejectWithValue, getState }) => {
    try {
        const state = getState() as { dashboard: DashboardState };
        const { fechaInicio, fechaFin } = params || state.dashboard.filtroFechas;
        const response = await ApiService.fetchData<IMetricasContratosResponse>({
            url: `/api/contratos/metricas-dashboard/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`,
            method: 'get',
        });
        return response.data;
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : 'Error al obtener métricas contratos';
        return rejectWithValue(message);
    }
});

// Métricas Vacaciones
export const fetchMetricasVacacionesThunk = createAsyncThunk<
    IMetricasVacacionesResponse,
    FiltroFechasParams | undefined,
    { rejectValue: string }
>('dashboard/fetchMetricasVacaciones', async (params, { rejectWithValue, getState }) => {
    try {
        const state = getState() as { dashboard: DashboardState };
        const { fechaInicio, fechaFin } = params || state.dashboard.filtroFechas;
        const response = await ApiService.fetchData<IMetricasVacacionesResponse>({
            url: `/api/solicitudes-vacaciones/metricas-dashboard/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`,
            method: 'get',
        });
        return response.data;
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : 'Error al obtener métricas vacaciones';
        return rejectWithValue(message);
    }
});

const dashboardSlice = createSlice({
    name: 'dashboard/dashboardSlice',
    initialState,
    reducers: {
        setFiltroFechas: (
            state,
            action: PayloadAction<{ fechaInicio: string; fechaFin: string }>,
        ) => {
            state.filtroFechas = action.payload;
        },
        setActivePeriod: (state, action: PayloadAction<DashboardPeriodType>) => {
            state.activePeriod = action.payload;
        },
        resetMetricas: (state) => {
            state.metricas = {
                ot: null,
                cotizaciones: null,
                rendiciones: null,
                bodegas: null,
                contratos: null,
                vacaciones: null,
            };
            state.metricasAnteriores = {
                ot: null,
                cotizaciones: null,
                rendiciones: null,
            };
        },
    },
    extraReducers(builder) {
        builder
            // Legacy thunk
            .addCase(ultimosValoresIndicadoresThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(ultimosValoresIndicadoresThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.ultimosValoresIndicadores = action.payload;
            })
            .addCase(ultimosValoresIndicadoresThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Indicadores Backend
            .addCase(fetchIndicadoresBackendThunk.pending, (state) => {
                state.metricsLoading.indicadores = true;
                state.metricsError.indicadores = null;
            })
            .addCase(fetchIndicadoresBackendThunk.fulfilled, (state, action) => {
                state.metricsLoading.indicadores = false;
                state.indicadores = action.payload;
            })
            .addCase(fetchIndicadoresBackendThunk.rejected, (state, action) => {
                state.metricsLoading.indicadores = false;
                state.metricsError.indicadores = action.payload || 'Error desconocido';
            })
            // Métricas OT
            .addCase(fetchMetricasOTThunk.pending, (state) => {
                state.metricsLoading.ot = true;
                state.metricsError.ot = null;
            })
            .addCase(fetchMetricasOTThunk.fulfilled, (state, action) => {
                state.metricsLoading.ot = false;
                state.metricas.ot = action.payload;
            })
            .addCase(fetchMetricasOTThunk.rejected, (state, action) => {
                state.metricsLoading.ot = false;
                state.metricsError.ot = action.payload || 'Error desconocido';
            })
            // Métricas Cotizaciones
            .addCase(fetchMetricasCotizacionesThunk.pending, (state) => {
                state.metricsLoading.cotizaciones = true;
                state.metricsError.cotizaciones = null;
            })
            .addCase(fetchMetricasCotizacionesThunk.fulfilled, (state, action) => {
                state.metricsLoading.cotizaciones = false;
                state.metricas.cotizaciones = action.payload;
            })
            .addCase(fetchMetricasCotizacionesThunk.rejected, (state, action) => {
                state.metricsLoading.cotizaciones = false;
                state.metricsError.cotizaciones = action.payload || 'Error desconocido';
            })
            // Métricas Rendiciones
            .addCase(fetchMetricasRendicionesThunk.pending, (state) => {
                state.metricsLoading.rendiciones = true;
                state.metricsError.rendiciones = null;
            })
            .addCase(fetchMetricasRendicionesThunk.fulfilled, (state, action) => {
                state.metricsLoading.rendiciones = false;
                state.metricas.rendiciones = action.payload;
            })
            .addCase(fetchMetricasRendicionesThunk.rejected, (state, action) => {
                state.metricsLoading.rendiciones = false;
                state.metricsError.rendiciones = action.payload || 'Error desconocido';
            })
            // Métricas Bodegas
            .addCase(fetchMetricasBodegasThunk.pending, (state) => {
                state.metricsLoading.bodegas = true;
                state.metricsError.bodegas = null;
            })
            .addCase(fetchMetricasBodegasThunk.fulfilled, (state, action) => {
                state.metricsLoading.bodegas = false;
                state.metricas.bodegas = action.payload;
            })
            .addCase(fetchMetricasBodegasThunk.rejected, (state, action) => {
                state.metricsLoading.bodegas = false;
                state.metricsError.bodegas = action.payload || 'Error desconocido';
            })
            // Métricas Contratos
            .addCase(fetchMetricasContratosThunk.pending, (state) => {
                state.metricsLoading.contratos = true;
                state.metricsError.contratos = null;
            })
            .addCase(fetchMetricasContratosThunk.fulfilled, (state, action) => {
                state.metricsLoading.contratos = false;
                state.metricas.contratos = action.payload;
            })
            .addCase(fetchMetricasContratosThunk.rejected, (state, action) => {
                state.metricsLoading.contratos = false;
                state.metricsError.contratos = action.payload || 'Error desconocido';
            })
            // Métricas Vacaciones
            .addCase(fetchMetricasVacacionesThunk.pending, (state) => {
                state.metricsLoading.vacaciones = true;
                state.metricsError.vacaciones = null;
            })
            .addCase(fetchMetricasVacacionesThunk.fulfilled, (state, action) => {
                state.metricsLoading.vacaciones = false;
                state.metricas.vacaciones = action.payload;
            })
            .addCase(fetchMetricasVacacionesThunk.rejected, (state, action) => {
                state.metricsLoading.vacaciones = false;
                state.metricsError.vacaciones = action.payload || 'Error desconocido';
            });
    },
});

export const { setFiltroFechas, setActivePeriod, resetMetricas } = dashboardSlice.actions;

export default dashboardSlice.reducer;
