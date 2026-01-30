import { IndicadoresEconomicos } from '@/interface/dashboard.interface';
import ApiService from '@/services/ApiService';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface DashboardState {
    loading: boolean;
    error: string | undefined;
    ultimosValoresIndicadores: IndicadoresEconomicos | undefined;
}

const initialState: DashboardState = {
    loading: false,
    error: undefined,
    ultimosValoresIndicadores: undefined,
};

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
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

const dashboardSlice = createSlice({
    name: 'dashboard/dashboardSlice',
    initialState,
    reducers: {},
    extraReducers(builder) {
        builder
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
            });
    },
});

export const {} = dashboardSlice.actions;

export default dashboardSlice.reducer;
