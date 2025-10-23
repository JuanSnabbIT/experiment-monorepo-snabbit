import { IInvitacionEmpresa } from "@/interface/invitacion.interface"
import ApiService from "@/services/ApiService"
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"


export interface InvitacionState {
    loading: boolean
    error: string | undefined
    listaInvitaciones: IInvitacionEmpresa[]
}

const initialState: InvitacionState = {
    loading: false,
    error: undefined,
    listaInvitaciones: []
}

export const listaInvitacionesFiltroThunk = createAsyncThunk<IInvitacionEmpresa[], {filtro: string}, {rejectValue: string}>(
    'invitacion/listaInvitacionesFiltroThunk',
    async ({filtro}, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IInvitacionEmpresa[]>({url: `/api/invitaciones-empresa/${filtro}`, method: 'get'})
            return response.data
        } catch(error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

export const listaInvitacionesThunk = createAsyncThunk<IInvitacionEmpresa[], undefined, {rejectValue: string}>(
    'invitacion/listaInvitacionesThunk',
    async (_, {rejectWithValue}) => {
        try {
            const response = await ApiService.fetchData<IInvitacionEmpresa[]>({url: `/api/invitaciones-empresa/`, method: 'get'})
            return response.data
        } catch(error: any) {
            return rejectWithValue(error.response.data)
        }
    }
)

const invitacionSlice = createSlice({
    name: 'invitacion/invitacionSlice',
    initialState,
    reducers: {},
    extraReducers(builder) {
        builder
            .addCase(listaInvitacionesFiltroThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaInvitacionesFiltroThunk.fulfilled, (state, action) => {
                state.loading = false
                state.listaInvitaciones = action.payload
            })
            .addCase(listaInvitacionesFiltroThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(listaInvitacionesThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(listaInvitacionesThunk.fulfilled, (state, action) => {
                state.loading = false
                state.listaInvitaciones = action.payload
            })
            .addCase(listaInvitacionesThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
    },
})

export const {} = invitacionSlice.actions

export default invitacionSlice.reducer