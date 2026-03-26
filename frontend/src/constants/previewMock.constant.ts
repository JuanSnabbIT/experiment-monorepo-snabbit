// ─── Tipos para datos mock de preview documental ────────────────────────────

export interface IMockServicio {
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    moneda: string;
    incluye: string[];
    no_incluye: string[];
    clausulas?: string;
}

export interface IMockVisita {
    descripcion: string;
    frecuencia: string;
    cantidad: number;
}

export interface IMockCondicion {
    titulo: string;
    detalle: string;
    multa?: number;
    moneda?: string;
}

export interface IMockLicencia {
    nombre: string;
    modalidad: string;
    cantidad: number;
    precio: number;
    moneda: string;
}

export interface IMockCotizacionItem {
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    total: number;
}

export interface IMockCotizacion {
    numero: string;
    nombre: string;
    moneda: string;
    total: number;
    total_convertido?: number;
    moneda_contrato?: string;
    dolar_observado?: number;
    valor_uf?: number;
    items: IMockCotizacionItem[];
}

export interface IMockInfoContrato {
    cliente: string;
    rut_cliente: string;
    prestadora: string;
    tipo_label: string;
    moneda: string;
    fecha_inicio: string;
    fecha_termino: string;
}

export interface IMockComercial {
    info: IMockInfoContrato;
    servicios: IMockServicio[];
    visitas: IMockVisita[];
    condiciones: IMockCondicion[];
    licencias: IMockLicencia[];
    cotizaciones: IMockCotizacion[];
    forma_pago_venta?: 'contado' | 'cuotas';
    cuotas_venta?: Array<{
        orden: number;
        porcentaje: number;
        monto: number;
        hito_pago_tipo?: 'inicio' | 'entrega_intermedia' | 'entrega_final' | 'personalizado';
        hito_pago_descripcion?: string;
        hito_pago_label?: string;
    }>;
    total_consolidado: number;
}

// ─── Mock: Servicios ────────────────────────────────────────────────────────

const MOCK_SERVICIOS: IMockComercial = {
    info: {
        cliente: 'Nombre de la Empresa Cliente',
        rut_cliente: 'XX.XXX.XXX-X',
        prestadora: 'Nombre Empresa Prestadora',
        tipo_label: 'Servicios',
        moneda: 'CLP',
        fecha_inicio: 'DD de mes de AAAA',
        fecha_termino: 'DD de mes de AAAA',
    },
    servicios: [
        {
            nombre: 'Nombre del servicio contratado',
            cantidad: 0,
            precio_unitario: 0,
            moneda: 'CLP',
            incluye: ['Detalle de lo incluido en el servicio', 'Otro detalle incluido'],
            no_incluye: ['Detalle de lo no incluido', 'Otro detalle no incluido'],
            clausulas: 'Cláusula específica del servicio descrito en el contrato.',
        },
        {
            nombre: 'Nombre del segundo servicio',
            cantidad: 0,
            precio_unitario: 0,
            moneda: 'CLP',
            incluye: ['Detalle de lo incluido'],
            no_incluye: ['Detalle de lo no incluido'],
        },
    ],
    visitas: [
        {
            descripcion: 'Descripción de la visita programada',
            frecuencia: 'Mensual',
            cantidad: 0,
        },
    ],
    condiciones: [
        {
            titulo: 'Título de la condición',
            detalle:
                'Descripción detallada de la condición especial del contrato. ' +
                'Incluye los términos, obligaciones y restricciones aplicables.',
            multa: 0,
            moneda: 'CLP',
        },
    ],
    licencias: [],
    cotizaciones: [],
    total_consolidado: 0,
};

// ─── Mock: Licencia ─────────────────────────────────────────────────────────

const MOCK_LICENCIA: IMockComercial = {
    info: {
        cliente: 'Nombre de la Empresa Cliente',
        rut_cliente: 'XX.XXX.XXX-X',
        prestadora: 'Nombre Empresa Prestadora',
        tipo_label: 'Licenciamiento',
        moneda: 'UF',
        fecha_inicio: 'DD de mes de AAAA',
        fecha_termino: 'DD de mes de AAAA',
    },
    servicios: [],
    visitas: [],
    condiciones: [
        {
            titulo: 'Título de la condición',
            detalle:
                'Descripción detallada de la condición especial del contrato. ' +
                'Incluye los términos, obligaciones y restricciones aplicables.',
            multa: 0,
            moneda: 'CLP',
        },
    ],
    licencias: [
        {
            nombre: 'Nombre de la licencia',
            modalidad: 'Anual',
            cantidad: 0,
            precio: 0,
            moneda: 'UF',
        },
        {
            nombre: 'Nombre de segunda licencia',
            modalidad: 'Anual',
            cantidad: 0,
            precio: 0,
            moneda: 'UF',
        },
    ],
    cotizaciones: [],
    total_consolidado: 0,
};

// ─── Mock: Venta ────────────────────────────────────────────────────────────

const MOCK_VENTA: IMockComercial = {
    info: {
        cliente: 'Nombre de la Empresa Cliente',
        rut_cliente: 'XX.XXX.XXX-X',
        prestadora: 'Nombre Empresa Prestadora',
        tipo_label: 'Venta',
        moneda: 'CLP',
        fecha_inicio: 'DD de mes de AAAA',
        fecha_termino: 'DD de mes de AAAA',
    },
    servicios: [],
    visitas: [],
    condiciones: [
        {
            titulo: 'Título de la condición',
            detalle:
                'Descripción detallada de la condición especial del contrato. ' +
                'Incluye los términos, obligaciones y restricciones aplicables.',
        },
    ],
    licencias: [],
    cotizaciones: [
        {
            numero: '915',
            nombre: 'Hardware y despliegue inicial',
            moneda: 'USD',
            total: 0,
            total_convertido: 0,
            moneda_contrato: 'CLP',
            dolar_observado: 950,
            items: [
                {
                    nombre: 'Firewall principal',
                    cantidad: 0,
                    precio_unitario: 0,
                    total: 0,
                },
                {
                    nombre: 'Implementacion y configuracion',
                    cantidad: 0,
                    precio_unitario: 0,
                    total: 0,
                },
            ],
        },
        {
            numero: '916',
            nombre: 'Accesorios y puesta en marcha',
            moneda: 'CLP',
            total: 0,
            total_convertido: 0,
            moneda_contrato: 'CLP',
            dolar_observado: 950,
            items: [
                {
                    nombre: 'Kit de cableado',
                    cantidad: 0,
                    precio_unitario: 0,
                    total: 0,
                },
            ],
        },
    ],
    forma_pago_venta: 'cuotas',
    cuotas_venta: [
        {
            orden: 1,
            porcentaje: 50,
            monto: 0,
            hito_pago_tipo: 'inicio',
            hito_pago_descripcion: 'Inicio',
            hito_pago_label: 'Inicio',
        },
        {
            orden: 2,
            porcentaje: 50,
            monto: 0,
            hito_pago_tipo: 'entrega_final',
            hito_pago_descripcion: 'Entrega final',
            hito_pago_label: 'Entrega final',
        },
    ],
    total_consolidado: 0,
};

// ─── Mapa por tipo de contrato ──────────────────────────────────────────────

export const MOCK_COMERCIAL_POR_TIPO: Record<string, IMockComercial> = {
    servicios: MOCK_SERVICIOS,
    licencia: MOCK_LICENCIA,
    venta: MOCK_VENTA,
};

// ─── Posición de bloques mock (después de qué tipo de sección se insertan) ──

export const POSICION_BLOQUES_MOCK: Record<
    string,
    { despues_de_tipo: string; fallback: 'inicio' | 'fin' }
> = {
    alcance: { despues_de_tipo: 'clausula', fallback: 'fin' },
    operacion: { despues_de_tipo: 'clausula', fallback: 'fin' },
    condiciones: { despues_de_tipo: 'condiciones_generales', fallback: 'fin' },
};
