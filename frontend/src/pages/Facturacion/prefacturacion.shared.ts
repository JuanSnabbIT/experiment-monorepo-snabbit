export type TPrefacturaTab = 'contrato' | 'ot';

export type TPrefacturaEstado = 'borrador' | 'por_facturar' | 'facturado';

export interface IPrefacturacionRouteState {
    tab: TPrefacturaTab;
    estado: TPrefacturaEstado[];
    q: string;
    historico: boolean;
}

export interface IPrefacturaMetricas {
    total: number;
    borrador: number;
    por_facturar: number;
    facturado: number;
}

export interface IPrefacturaListItemVM {
    id: number;
    tipo: TPrefacturaTab;
    tipoLabel: string;
    referencia: string;
    cliente: string;
    contexto: string;
    estado: string;
    estadoLabel: string;
    totalLabel: string;
    fechaLabel: string;
    otIds: number[];
    detailPath: string;
}

const PREFAC_LIST_PATH = '/facturacion/facturas-contrato';
const PREFAC_OT_DETAIL_BASE_PATH = '/facturacion/otv3/prefacturas';
const PREFAC_OT_CREATE_PATH = '/facturacion/otv3/prefacturas/crear';
const VALID_ESTADOS: TPrefacturaEstado[] = ['borrador', 'por_facturar', 'facturado'];

const isValidEstado = (estado: string): estado is TPrefacturaEstado =>
    VALID_ESTADOS.includes(estado as TPrefacturaEstado);

export const getPrefacturaEstadoColor = (estado: string) => {
    const map: Record<string, 'amber' | 'blue' | 'emerald' | 'zinc'> = {
        borrador: 'amber',
        por_facturar: 'blue',
        facturado: 'emerald',
    };

    return map[estado] ?? 'zinc';
};

export const getPrefacturaEstadoLabel = (estado: string) => {
    const map: Record<string, string> = {
        borrador: 'Borrador',
        por_facturar: 'Por facturar',
        facturado: 'Facturado',
    };

    return map[estado] ?? estado;
};

export const parsePrefacturacionSearchParams = (
    searchParams: URLSearchParams,
    defaultTab: TPrefacturaTab = 'contrato',
): IPrefacturacionRouteState => {
    const tabParam = searchParams.get('tab');
    const tab: TPrefacturaTab = tabParam === 'ot' || tabParam === 'contrato' ? tabParam : defaultTab;
    const estado = searchParams
        .getAll('estado')
        .map((item) => item.trim())
        .filter(isValidEstado);

    return {
        tab,
        estado,
        q: searchParams.get('q')?.trim() ?? '',
        historico: searchParams.get('historico') === '1',
    };
};

export const createPrefacturacionSearchParams = (
    state: Partial<IPrefacturacionRouteState>,
    defaultTab: TPrefacturaTab = 'contrato',
) => {
    const normalizedState: IPrefacturacionRouteState = {
        tab: state.tab ?? defaultTab,
        estado: (state.estado ?? []).filter(isValidEstado),
        q: state.q?.trim() ?? '',
        historico: Boolean(state.historico),
    };

    const params = new URLSearchParams();
    params.set('tab', normalizedState.tab);

    normalizedState.estado.forEach((estado) => params.append('estado', estado));

    if (normalizedState.q) {
        params.set('q', normalizedState.q);
    }

    if (normalizedState.historico) {
        params.set('historico', '1');
    }

    return params;
};

export const buildPrefacturacionListPath = (
    state: Partial<IPrefacturacionRouteState>,
    defaultTab: TPrefacturaTab = 'contrato',
) => {
    const params = createPrefacturacionSearchParams(state, defaultTab);
    const queryString = params.toString();

    return queryString ? `${PREFAC_LIST_PATH}?${queryString}` : PREFAC_LIST_PATH;
};

export const buildPrefacturaContratoDetailPath = (
    id: number | string,
    state: Partial<IPrefacturacionRouteState>,
) => {
    const params = createPrefacturacionSearchParams(state, 'contrato');
    const queryString = params.toString();
    const path = `${PREFAC_LIST_PATH}/${id}`;

    return queryString ? `${path}?${queryString}` : path;
};

export const buildPrefacturaOTDetailPath = (
    id: number | string,
    state: Partial<IPrefacturacionRouteState>,
) => {
    const params = createPrefacturacionSearchParams(state, 'ot');
    const queryString = params.toString();
    const path = `${PREFAC_OT_DETAIL_BASE_PATH}/${id}`;

    return queryString ? `${path}?${queryString}` : path;
};

export const buildPrefacturaOTCreatePath = (
    state: Partial<IPrefacturacionRouteState>,
    extras?: Record<string, number | string | null | undefined>,
) => {
    const params = createPrefacturacionSearchParams(state, 'ot');

    Object.entries(extras ?? {}).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            params.set(key, String(value));
        }
    });

    const queryString = params.toString();
    return queryString ? `${PREFAC_OT_CREATE_PATH}?${queryString}` : PREFAC_OT_CREATE_PATH;
};

export const calculatePrefacturaMetricas = <T>(
    items: T[],
    getEstado: (item: T) => string | null | undefined,
): IPrefacturaMetricas => {
    const metricas: IPrefacturaMetricas = {
        total: items.length,
        borrador: 0,
        por_facturar: 0,
        facturado: 0,
    };

    items.forEach((item) => {
        const estado = getEstado(item);
        if (estado && estado in metricas) {
            metricas[estado as keyof IPrefacturaMetricas] += 1;
        }
    });

    return metricas;
};
