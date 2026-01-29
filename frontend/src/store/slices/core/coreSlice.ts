import {
    IAcuerdoBase,
    IComuna,
    IContentType,
    IProvincia,
    IRegion,
} from '@/interface/core.interface';
import { IUser } from '@/interface/user.interface';
import ApiService from '@/services/ApiService';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface CoreState {
    loading: boolean;
    error: string | undefined;
    listaRegiones: IRegion[];
    listaProvincias: IProvincia[];
    listaComunas: IComuna[];
    listaUsuarios: IUser[];
    listaContentType: IContentType[];
    listaAcuerdosBase: IAcuerdoBase[];
}

const initialState: CoreState = {
    loading: false,
    error: undefined,
    listaRegiones: [],
    listaProvincias: [],
    listaComunas: [],
    listaUsuarios: [],
    listaContentType: [],
    listaAcuerdosBase: [],
};

export const listaRegionesThunk = createAsyncThunk<IRegion[], undefined, { rejectValue: string }>(
    'core/listaRegionesThunk',
    async (_, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<IRegion[], string>({
                url: '/api/regiones/',
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error);
        }
    },
);

export const listaProvinciasThunk = createAsyncThunk<
    IProvincia[],
    undefined,
    { rejectValue: string }
>('core/listaProvinciasThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IProvincia[], string>({
            url: '/api/provincias/',
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error);
    }
});

export const listaComunasThunk = createAsyncThunk<IComuna[], undefined, { rejectValue: string }>(
    'core/listaComunasThunk',
    async (_, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<IComuna[], string>({
                url: '/api/comunas/',
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error);
        }
    },
);

export const listaUsuariosThunk = createAsyncThunk<IUser[], undefined, { rejectValue: string }>(
    'core/listaUsuariosThunk',
    async (_, { rejectWithValue }) => {
        try {
            const response = await ApiService.fetchData<IUser[]>({
                url: `/api/users/`,
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    },
);

export const listaContentTypeThunk = createAsyncThunk<
    IContentType[],
    undefined,
    { rejectValue: string }
>('core/listaContentTypeThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IContentType[]>({
            url: `/api/content-types/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const listaAcuerdosBaseThunk = createAsyncThunk<
    IAcuerdoBase[],
    undefined,
    { rejectValue: string }
>('core/listaAcuerdosBaseThunk', async (_, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IAcuerdoBase[]>({
            url: `/api/acuerdos-base/`,
            method: 'get',
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

const coreSlice = createSlice({
    name: `core/coreSlice`,
    initialState,
    reducers: {},
    extraReducers(builder) {
        builder
            .addCase(listaRegionesThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaRegionesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaRegiones = action.payload;
            })
            .addCase(listaRegionesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaProvinciasThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaProvinciasThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaProvincias = action.payload;
            })
            .addCase(listaProvinciasThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaComunasThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaComunasThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaComunas = action.payload;
            })
            .addCase(listaComunasThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaUsuariosThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaUsuariosThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaUsuarios = action.payload;
            })
            .addCase(listaUsuariosThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaContentTypeThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaContentTypeThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaContentType = action.payload;
            })
            .addCase(listaContentTypeThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(listaAcuerdosBaseThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(listaAcuerdosBaseThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaAcuerdosBase = action.payload;
            })
            .addCase(listaAcuerdosBaseThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const {} = coreSlice.actions;

export default coreSlice.reducer;
