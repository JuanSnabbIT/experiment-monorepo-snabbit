import { combineReducers, CombinedState, AnyAction, Reducer } from 'redux'
import RtkQueryService from '@/services/RtkQueryService'
import auth, { AuthState, LOGOUT } from './slices/auth/authSlice'   
import core, { CoreState } from './slices/core/coreSlice'
import invitacion, { InvitacionState } from './slices/invitacion/invitacionSlice'
import empresa, { EmpresaState } from './slices/empresa/empresaSlice'
import calendario, { CalendarioState } from './slices/calendario/calendarioSlice'
import item, { ItemState } from './slices/item/itemSlice'
import bodega, { BodegaState } from './slices/bodega/bodegaSlice'
import recursos, { RecursosState } from './slices/recursos/recursosSlice'
import dashboard, { DashboardState } from './slices/dashboard/dashboardSlice'
import rendicion, { RendicionState } from './slices/rendiciones/rendicionSlice'
import cotizacion, { CotizacionState } from './slices/cotizaciones/cotizacionSlice'
import ordenTrabajo, { OrdenTrabajoState } from './slices/ordenTrabajo/ordenTrabajoSlice'
import visita, { VisitasState } from './slices/visita/visitasSlice'
import contrato, { ContratoState } from './slices/contratos/contratoSlice'

export type RootState = CombinedState<{
    auth: AuthState
    bodega: BodegaState
    calendario: CalendarioState
    contrato: ContratoState
    core: CoreState
    cotizacion: CotizacionState
    dashboard: DashboardState
    empresa: EmpresaState
    invitacion: InvitacionState
    item: ItemState
    ordenTrabajo: OrdenTrabajoState
    recursos: RecursosState
    rendicion: RendicionState
    visita: VisitasState
    /* eslint-disable @typescript-eslint/no-explicit-any */
    [RtkQueryService.reducerPath]: any
}>

export interface AsyncReducers {
    [key: string]: Reducer<any, AnyAction>
}

const staticReducers = {
    auth,
    bodega,
    calendario,
    contrato,
    core,
    cotizacion,
    dashboard,
    empresa,
    invitacion,
    item,
    ordenTrabajo,
    recursos,
    rendicion,
    visita,
    [RtkQueryService.reducerPath]: RtkQueryService.reducer,
}

const rootReducer =
    (asyncReducers?: AsyncReducers) =>
    (state: RootState | undefined, action: AnyAction) => {
        // Quitar Estado si es LOGOUT
        if (action.type === LOGOUT.type) {
            state = undefined;
        }
        const combinedReducer = combineReducers({
            ...staticReducers,
            ...asyncReducers,
        })
        return combinedReducer(state, action)
    }

export default rootReducer
