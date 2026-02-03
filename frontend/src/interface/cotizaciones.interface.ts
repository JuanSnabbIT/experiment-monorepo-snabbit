export interface ICotizacion {
    id: number;
    estado_label: string;
    tipo_moneda_label: string;
    empresa_nombre: string;
    cliente_nombre: string;
    recargo_cliente: number;
    es_vigente: boolean;
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    numero_cotizacion: number;
    fecha_vencimiento: string;
    estado: string;
    descripcion: string;
    total_estimado: string;
    observaciones: string;
    tipo_moneda: string;
    fecha_facturacion: string;
    dolar_observado: string;
    valor_uf: string;
    fecha_tipo_cambio?: string;
    estado_tipo_cambio: 'pendiente' | 'actualizado' | 'error' | 'manual';
    estado_tipo_cambio_label: string;
    error_tipo_cambio?: string | null;
    ppm: string;
    empresa: number;
    cliente: number;
    items: number[];
    solicitantes: number[];
    copias_count?: number;
    oc_count?: number;
    oc_recibidas_count?: number;
    guias_count?: number;
    total_pedido?: number;
    total_recibido?: number;
    fecha_facturacion_congelada?: boolean;
}

export interface IItemCotizacion {
    id: number;
    ppm: number;
    nombre_item: string;
    nombre_proveedor: string;
    recargo_iva_venta: number;
    iva_compra: number;
    // precio_venta_neta: number
    valor_ppm: number;
    total_impuesto: number;
    precio_total_backend: {
        clp: number;
        usd: number;
    };
    precio_unitario_backend: {
        clp: number;
        usd: number;
    };
    precio_venta_neta_unitario_moneda_base: number;
    precio_venta_neta_total_moneda_base: number;
    ganancia: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    aprobado: boolean;
    nombre: null | string;
    descripcion: null | string;
    porcentaje_recargo: number;
    cantidad: number;
    precio_unitario: string;
    costo_total: string;
    recargo_dolar: number;
    cotizacion: number;
    item_empresa: number;
    proveedor_empresa: number;
    tipo_moneda_proveedor?: string;
    tipo_moneda_proveedor_label?: string;
}

export interface ISeguimientoCotizacion {
    id: number;
    cotizacion: number;
    fecha: string;
    comentario: string;
    tipo: string;
    usuario: number;
    usuario_nombre: string;
}

export interface ISolicitanteCotizacion {
    id: number;
    nombre_usuario: string;
    email_usuario: string;
    fecha_creacion: string;
    fecha_modificacion: string;
    usuario_id: number;
    aprobo: boolean;
    fecha_aprobacion: null | string;
    cotizacion: number;
    content_type: number;
}

export interface IEmpresaPublicaCotizacion {
    id: number;
    nombre: string;
    rut_empresa?: string | null;
    direccion_principal?: string | null;
    telefono?: string | null;
    email?: string | null;
    sitio_web?: string | null;
    logo?: string | null;
}

export interface IClientePublicoCotizacion {
    id: number;
    nombre: string;
    rut_empresa?: string | null;
}

export interface IItemCotizacionPublico {
    id: number;
    nombre_display: string;
    descripcion?: string | null;
    cantidad: number;
    precio_venta_unitario: number;
    precio_venta_total: number;
    aprobado: boolean;
}

export interface ISolicitantePublicoCotizacion {
    id: number;
    nombre: string;
    email: string;
    puede_responder: boolean;
    ya_respondio: boolean;
    aprobo: boolean | null;
}

export interface ICotizacionPublica {
    numero_cotizacion: number;
    nombre: string;
    estado: string;
    estado_display: string;
    fecha_creacion: string;
    fecha_vencimiento: string | null;
    es_vigente: boolean;
    descripcion?: string | null;
    observaciones?: string | null;
    tipo_moneda: string;
    tipo_moneda_display: string;
    simbolo_moneda: string;
    total_estimado: number | string;
    total_calculado: number | string;
    empresa: IEmpresaPublicaCotizacion;
    cliente: IClientePublicoCotizacion;
    items: IItemCotizacionPublico[];
    solicitante: ISolicitantePublicoCotizacion | null;
}
