export interface IPreferenciasDashboard {
    indicadores_economicos: boolean;
    empresa_seleccionada: boolean;
    actualizaciones_oc: boolean;
    ultimos_eventos: boolean;
}

export interface IndicadoresEconomicos {
    version: string;
    autor: string;
    fecha: string;
    uf: DetalleIndicadores;
    ivp: DetalleIndicadores;
    dolar: DetalleIndicadores;
    dolar_intercambio: DetalleIndicadores;
    euro: DetalleIndicadores;
    ipc: DetalleIndicadores;
    utm: DetalleIndicadores;
    imacec: DetalleIndicadores;
    tpm: DetalleIndicadores;
    libra_cobre: DetalleIndicadores;
    tasa_desempleo: DetalleIndicadores;
    bitcoin: DetalleIndicadores;
}

export interface DetalleIndicadores {
    codigo: string;
    nombre: string;
    unidad_medida: string;
    fecha: string;
    valor: number;
}
