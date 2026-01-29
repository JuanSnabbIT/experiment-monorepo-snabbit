import { IGuardadoParcialRetroalimentacion } from '@/interface/ordenTrabajo.interface';
import { IGruposUsuarios, IPersonalizacionUsuario, IUserMe } from '@/interface/user.interface';
import ApiService from '@/services/ApiService';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface AuthState {
    access: string | undefined;
    refresh: string | undefined;
    loading: boolean;
    error: string | undefined;
    isAuthenticated: boolean;
    userMe: IUserMe | undefined;
    listaGrupos: IGruposUsuarios | undefined;
    personalizacionUsuario: IPersonalizacionUsuario | undefined;
    guardadoRetroalimentacionOT: IGuardadoParcialRetroalimentacion | undefined;
}

const initialState: AuthState = {
    access: undefined,
    refresh: undefined,
    isAuthenticated: false,
    loading: false,
    error: undefined,
    userMe: undefined,
    listaGrupos: undefined,
    personalizacionUsuario: undefined,
    guardadoRetroalimentacionOT: undefined,
};

// export const loginThunk = createAsyncThunk<LoginResponse, {email: string, password: string}, {rejectValue: string}>(
//     'auth/loginThunk',
//     async ({email, password}, {rejectWithValue, dispatch}) => {
//         try {
//             const response = await ApiService.fetchData<LoginResponse, string>({url: '/auth/jwt/create/', method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({email, password}), isLoginRequest: true})
//             dispatch(userMeThunk({access: response.data.access}))
//             dispatch(obtenerGruposThunk({access: response.data.access}))
//             return response.data
//         } catch (error: any) {
//             return rejectWithValue(error.response.data || "No se pudo iniciar sesión")
//         }
//     }
// )

export const userMeThunk = createAsyncThunk<
    IUserMe,
    { access: string | undefined },
    { rejectValue: string }
>('auth/userMeThunk', async ({ access }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IUserMe>({
            url: '/auth/users/me',
            method: 'get',
            headers: { Authorization: `Bearer ${access}` },
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const obtenerGruposThunk = createAsyncThunk<
    IGruposUsuarios,
    { access: string | undefined },
    { rejectValue: string }
>('auth/obtenerGruposThunk', async ({ access }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IGruposUsuarios>({
            url: `/api/get_grupos_user/`,
            method: 'get',
            headers: { Authorization: `Bearer ${access}` },
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const obtenerPersonalizacionThunk = createAsyncThunk<
    IPersonalizacionUsuario,
    { access: string | undefined },
    { rejectValue: string }
>('auth/obtenerPersonalizacionThunk', async ({ access }, { rejectWithValue }) => {
    try {
        const response = await ApiService.fetchData<IPersonalizacionUsuario[]>({
            url: `/api/personalizacion-usuarios/`,
            method: 'get',
            headers: { Authorization: `Bearer ${access}` },
        });
        return response.data[0];
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

const authSlice = createSlice({
    name: `auth/authSlice`,
    initialState,
    reducers: {
        LOGOUT: (state) => {
            state.access = undefined;
            state.refresh = undefined;
            state.isAuthenticated = false;
        },
        GUARDAR_TOKEN: (state, action) => {
            state.access = action.payload;
        },
        LOGIN: (state, action) => {
            state.access = action.payload.access;
            state.refresh = action.payload.refresh;
            state.isAuthenticated = true;
        },
        GUARDAR_RETROALIMENTACION: (state, action) => {
            state.guardadoRetroalimentacionOT = action.payload;
        },
        LIMPIAR_RETROALIMENTACION: (state) => {
            state.guardadoRetroalimentacionOT = undefined;
        },
    },
    extraReducers(builder) {
        builder
            // .addCase(loginThunk.pending, (state) => {
            //     state.loading = true
            // })
            // .addCase(loginThunk.fulfilled, (state, action) => {
            //     state.loading = false
            //     state.access = action.payload.access
            //     state.refresh = action.payload.refresh
            //     state.isAuthenticated = true
            // })
            // .addCase(loginThunk.rejected, (state, action) => {
            //     state.loading = false
            //     state.error = action.payload
            // })
            .addCase(userMeThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(userMeThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.userMe = action.payload;
            })
            .addCase(userMeThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(obtenerGruposThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(obtenerGruposThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.listaGrupos = action.payload;
            })
            .addCase(obtenerGruposThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(obtenerPersonalizacionThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(obtenerPersonalizacionThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.personalizacionUsuario = action.payload;
            })
            .addCase(obtenerPersonalizacionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const {
    LOGOUT,
    GUARDAR_TOKEN,
    LOGIN,
    GUARDAR_RETROALIMENTACION,
    LIMPIAR_RETROALIMENTACION,
} = authSlice.actions;

export default authSlice.reducer;
