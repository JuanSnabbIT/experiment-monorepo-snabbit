/**
 * Interfaces para métricas del Dashboard
 */

// ============= Indicadores Económicos =============
export interface IIndicadorBackend {
    valor: number;
    fecha_referencia: string;
}

export interface IIndicadoresEconomicosBackend {
    fecha_consulta: string;
    dolar: IIndicadorBackend | null;
    uf: IIndicadorBackend | null;
    errores: string[];
}

// ============= Métricas OT =============
export interface IMetricasOTResponse {
    periodo: {
        fecha_inicio: string;
        fecha_fin: string;
    };
    resumen: {
        total_periodo: number;
        total_activas: number;
        ots_vencidas: number;
        completadas_periodo: number;
        total_gastos: number;
    };
    por_estado: Record<string, number>;
    por_prioridad: Record<string, number>;
    cierres_administrativos: Record<string, number>;
    top_tecnicos: Array<{
        id: number;
        nombre: string;
        total: number;
    }>;
    top_clientes: Array<{
        id: number;
        nombre: string;
        total: number;
    }>;
    tendencia_30_dias: Array<{
        fecha: string;
        total: number;
    }>;
}

// ============= Métricas Cotizaciones =============
export interface IMetricasCotizacionesResponse {
    periodo: {
        fecha_inicio: string;
        fecha_fin: string;
    };
    resumen: {
        total_periodo: number;
        proximas_expirar: number;
        expiradas_sin_respuesta: number;
        tasa_conversion: number;
        costo_total_items: number;
        con_error_tipo_cambio: number;
    };
    por_estado: Record<string, number>;
    por_moneda: Record<string, number>;
    monto_por_moneda: Record<string, number>;
    top_clientes: Array<{
        id: number;
        nombre: string;
        total: number;
    }>;
    tendencia_30_dias: Array<{
        fecha: string;
        total: number;
    }>;
}

// ============= Métricas Rendiciones =============
export interface IMetricasRendicionesResponse {
    periodo: {
        fecha_inicio: string;
        fecha_fin: string;
    };
    resumen: {
        total_periodo: number;
        pendientes_aprobacion: number;
        monto_pendiente_aprobacion: number;
        monto_pendiente_pago: number;
        rechazadas: number;
    };
    por_estado: Record<string, number>;
    top_usuarios: Array<{
        id: number;
        nombre: string;
        total: number;
    }>;
    top_clientes: Array<{
        id: number;
        nombre: string;
        total: number;
    }>;
    tendencia_30_dias: Array<{
        fecha: string;
        total: number;
    }>;
}

// ============= Métricas Bodegas =============
export interface IMetricasBodegasResponse {
    periodo: {
        fecha_inicio: string;
        fecha_fin: string;
    };
    ordenes_compra: {
        total_periodo: number;
        por_estado: Record<string, number>;
        pendientes_recepcion: number;
        tendencia_30_dias: Array<{
            fecha: string;
            total: number;
        }>;
    };
    guias_salida: {
        pendientes_firma: number;
        en_transito: number;
        por_estado: Record<string, number>;
    };
    inventario: {
        items_sin_stock: number;
        items_stock_bajo: number;
        total_items_en_stock: number;
    };
    compras_rapidas: {
        pendientes_rendicion: number;
    };
}

// ============= Métricas Contratos =============
export interface IMetricasContratosResponse {
    resumen: {
        total_contratos: number;
        contratos_activos: number;
        contratos_vencidos: number;
        firmas_pendientes: number;
        licencias_por_vencer: number;
    };
    por_estado: Record<string, number>;
    contratos_por_vencer: Array<{
        id: number;
        nombre: string;
        cliente: string;
        empresa_cliente: number;
        fecha_fin: string | null;
        dias_restantes: number | null;
    }>;
    licencias_por_vencer: Array<{
        id: number;
        nombre: string;
        contrato: string;
        fecha_vencimiento: string | null;
        dias_restantes: number | null;
    }>;
    top_clientes: Array<{
        id: number;
        nombre: string;
        total: number;
    }>;
}

// ============= Métricas Vacaciones =============
export interface IMetricasVacacionesResponse {
    resumen: {
        pendientes_aprobacion: number;
        extraordinarias_pendientes: number;
        ausencias_hoy: number;
    };
    por_estado: Record<string, number>;
    vacaciones_proximas: Array<{
        id: number;
        nombre: string;
        fecha_inicio: string;
        fecha_fin: string;
        dias_para_inicio: number;
    }>;
    ausencias_hoy: Array<{
        id: number;
        nombre: string;
        regresa: string;
    }>;
    proximos_feriados: Array<{
        fecha: string;
        nombre: string;
        es_irrenunciable: boolean;
    }>;
}

// ============= Estado consolidado Dashboard =============
export interface IDashboardMetricsState {
    loading: {
        indicadores: boolean;
        ot: boolean;
        cotizaciones: boolean;
        rendiciones: boolean;
        bodegas: boolean;
        contratos: boolean;
        vacaciones: boolean;
    };
    error: {
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
    // Filtro global de fechas
    filtroFechas: {
        fechaInicio: string;
        fechaFin: string;
    };
}
