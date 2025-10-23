export interface ICotizacion {
    id: number
    estado_label: string
    tipo_moneda_label: string
    empresa_nombre: string
    cliente_nombre: string
    recargo_cliente: number
    es_vigente: boolean
    fecha_creacion: string
    fecha_modificacion: string
    nombre: string
    numero_cotizacion: number
    fecha_vencimiento: string
    estado: string
    descripcion: string
    total_estimado: string
    observaciones: string
    tipo_moneda: string
    fecha_facturacion: string
    dolar_observado: string
    valor_uf: string
    ppm: string
    empresa: number
    cliente: number
    items: number[]
    solicitantes: number[]
}

export interface IItemCotizacion {
    id: number
    ppm: number
    nombre_item: string
    nombre_proveedor: string
    recargo_iva_venta: number
    iva_compra: number
    // precio_venta_neta: number
    valor_ppm: number
    total_impuesto: number
    precio_total_backend: {
        clp: number
        usd: number
    }
    precio_unitario_backend: {
        clp: number
        usd: number
    }
    precio_venta_neta_unitario_moneda_base: number
    precio_venta_neta_total_moneda_base: number
    ganancia: number
    fecha_creacion: string
    fecha_modificacion: string
    aprobado: boolean
    nombre: null | string
    descripcion: null | string
    porcentaje_recargo: number
    cantidad: number
    precio_unitario: string
    costo_total: string
    recargo_dolar: number
    cotizacion: number
    item_empresa: number
    proveedor_empresa: number
}

export interface ISeguimientoCotizacion {
    id: number;
    cotizacion: number;
    fecha: Date;
    comentario: string;
    usuario: number; 
    usuario_nombre: string;
}

export interface ISolicitanteCotizacion     {
    id: number
    nombre_usuario: string
    email_usuario: string
    fecha_creacion: string
    fecha_modificacion: string
    usuario_id: number
    aprobo: boolean
    fecha_aprobacion: null | string
    cotizacion: number
    content_type: number
}

export interface IComentarioCotizacion {
    id: number
    nombre_creado_por: string
    fecha_creacion: string
    fecha_modificacion: string
    comentario: string
    cotizacion: number
    creado_por: number
}