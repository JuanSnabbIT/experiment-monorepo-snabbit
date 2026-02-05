import { IGuardadoParcialRetroalimentacion } from '@/interface/ordenTrabajo.interface';
import { IGruposUsuarios, IPersonalizacionUsuario, IUserMe } from '@/interface/user.interface';
import ApiService from '@/services/ApiService';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';

export interface AuthState {
    access: string | undefined;
    refresh: string | undefined;
    loading: boolean;
    error: string | undefined;
    isAuthenticated: boolean;
    /** Indica si la sesión ya fue verificada después de rehidratar el estado - NO SE PERSISTE */
    _sessionVerified: boolean;
    userMe: IUserMe | undefined;
    listaGrupos: IGruposUsuarios | undefined;
    personalizacionUsuario: IPersonalizacionUsuario | undefined;
    guardadoRetroalimentacionOT: IGuardadoParcialRetroalimentacion | undefined;
}

const initialState: AuthState = {
    access: undefined,
    refresh: undefined,
    isAuthenticated: false,
    _sessionVerified: false,
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

export const userMeThunk = createAsyncThunk<IUserMe, void, { rejectValue: string }>(
    'auth/userMeThunk',
    async (_, { rejectWithValue }) => {
        try {
            // No pasar headers manualmente - el interceptor de BaseService lo hace
            const response = await ApiService.fetchData<IUserMe>({
                url: '/auth/users/me/',
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data || 'Error al obtener usuario');
        }
    },
);

export const obtenerGruposThunk = createAsyncThunk<IGruposUsuarios, void, { rejectValue: string }>(
    'auth/obtenerGruposThunk',
    async (_, { rejectWithValue }) => {
        try {
            // No pasar headers manualmente - el interceptor de BaseService lo hace
            const response = await ApiService.fetchData<IGruposUsuarios>({
                url: `/api/get_grupos_user/`,
                method: 'get',
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data || 'Error al obtener grupos');
        }
    },
);

export const obtenerPersonalizacionThunk = createAsyncThunk<
    IPersonalizacionUsuario,
    void,
    { rejectValue: string }
>('auth/obtenerPersonalizacionThunk', async (_, { rejectWithValue }) => {
    try {
        // No pasar headers manualmente - el interceptor de BaseService lo hace
        const response = await ApiService.fetchData<IPersonalizacionUsuario[]>({
            url: `/api/personalizacion-usuarios/`,
            method: 'get',
        });
        return response.data[0];
    } catch (error: any) {
        return rejectWithValue(error.response?.data || 'Error al obtener personalización');
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
            state._sessionVerified = false;
            state.userMe = undefined;
            state.listaGrupos = undefined;
            state.personalizacionUsuario = undefined;
            state.guardadoRetroalimentacionOT = undefined;
            state.error = undefined;
        },
        GUARDAR_TOKEN: (state, action) => {
            state.access = action.payload;
        },
        LOGIN: (state, action) => {
            state.access = action.payload.access;
            state.refresh = action.payload.refresh;
            state.isAuthenticated = true;
            state._sessionVerified = true;
        },
        /** Marca la sesión como verificada (válida o inválida) */
        SET_SESSION_VERIFIED: (state, action) => {
            state._sessionVerified = action.payload;
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
            // Primero todos los addCase
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
            })
            // addMatcher debe ir DESPUÉS de todos los addCase
            .addMatcher(
                (action) => action.type === REHYDRATE,
                (state, action: { payload?: { auth?: AuthState } }) => {
                    if (action.payload?.auth) {
                        // Restaurar todo excepto _sessionVerified
                        return {
                            ...action.payload.auth,
                            _sessionVerified: false, // Siempre resetear esto
                        };
                    }
                    return state;
                },
            );
    },
});

export const {
    LOGOUT,
    GUARDAR_TOKEN,
    LOGIN,
    SET_SESSION_VERIFIED,
    GUARDAR_RETROALIMENTACION,
    LIMPIAR_RETROALIMENTACION,
} = authSlice.actions;

export default authSlice.reducer;
