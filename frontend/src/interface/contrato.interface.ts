import { IUsuarioEmpresa } from './empresas.interface';

export interface ISeccionContratoGenerada {
    id: number;
    titulo: string;
    contenido_renderizado: string;
    orden: number;
    tipo: string;
}

export interface ICotizacionVinculadaItem {
    id: number;
    nombre: string;
    cantidad: number;
    tipo_moneda?: string;
    tipo_moneda_label?: string;
    precio_unitario_origen?: number;
    costo_total_origen?: number;
    precio_unitario: number;
    costo_total: number;
}

export interface ICuotaVenta {
    orden: number;
    porcentaje: number;
    monto?: number;
    hito_pago_tipo?: 'inicio' | 'entrega_intermedia' | 'entrega_final' | 'personalizado';
    hito_pago_descripcion?: string;
    hito_pago_label?: string;
}

export interface IContratoCuotaPago {
    id: number;
    numero_cuota: number;
    porcentaje: string;
    hito_pago_tipo: 'inicio' | 'entrega_intermedia' | 'entrega_final' | 'personalizado';
    hito_pago_descripcion: string;
    fecha_vencimiento?: string | null;
    estado: 'pendiente' | 'facturada' | 'pagada';
}

export interface ICotizacionVinculadaResumen {
    id: number;
    numero_cotizacion: string;
    nombre: string;
    estado: string;
    estado_label: string;
    tipo_moneda: string;
    tipo_moneda_label: string;
    total_estimado: number;
    fecha_vencimiento: string | null;
    items_count: number;
    items: ICotizacionVinculadaItem[];
    moneda_contrato?: 'CLP' | 'UF' | 'USD' | null;
    total_convertido?: number | null;
    dolar_observado?: number | null;
    valor_uf?: number | null;
    tiene_items_moneda_mixta?: boolean;
    monedas_items?: Array<'CLP' | 'UF' | 'USD'>;
}

export interface IContratoEmpresaCliente {
    id: number;
    items_comerciales: IContratoItemComercial[];
    contrato_servicios: IContratoServicio[];
    contrato_visitas: IContratoVisita[];
    contrato_licencias: IContratoLicencia[];
    cotizaciones_vinculadas: ICotizacionVinculadaResumen[];
    contrato_condiciones_especiales: IContratoCondicionEspecial[];
    vinculos_contrato: IVinculoContrato[];
    firmas_confidencialidad: IFirmaConfidencialidad[];
    fecha_creacion: string;
    fecha_modificacion: string;
    fecha_inicio: string;
    fecha_fin: string | null;
    estado: string;
    observaciones: string;
    empresa_prestadora: number;
    empresa_cliente: number;
    servicios_genericos: number[];
    visitas: number[];
    licencias: number[];
    condiciones_especiales: number[];
    usuarios_vinculados: number[];
    nombre: string;
    estado_label: string;
    datos_empresa: IEmpresaContrato;
    datos_cliente: IEmpresaContrato;
    tipo: string;
    moneda_cobro: 'CLP' | 'UF' | 'USD';
    forma_pago_contractual: 'mensual' | 'anual' | 'pago_unico';
    forma_pago_venta?: 'contado' | 'cuotas' | null;
    cuotas_venta?: ICuotaVenta[];
    cuotas_pago?: IContratoCuotaPago[];
    tipo_label: string;
    destinatario_principal?: IVinculoContrato | null;
    ultimo_envio_aprobacion?: IContratoAprobacionEstado | null;
    ultimo_envio_firma?: IContratoFirmaEstado | null;
    ultimo_comentario_cliente?: string | null;
    total_contrato: number;
    resumen_comercial?: IResumenComercialContrato;
    contrato_anterior: number | null;
    contrato_anterior_detalle?: IContratoRenovacionRef | null;
    renovaciones_detalle?: IContratoRenovacionRef[];
    plantilla?: number | null;
    plantilla_version_usada?: string | null;
    dias_aviso_termino?: number;
    requiere_nda?: boolean;
    snapshot_total_venta?: string | null;
    /** Documento completo del motor v2.9 (mismo HTML que el PDF real) — solo
     *  presente si `plantilla` usa `version_editor === 'v29'`. Null en cualquier
     *  otro caso (plantilla v1/v2, o sin plantilla). */
    documento_v29_html?: string | null;
}

export interface IEmpresaContrato {
    id: number;
    representantes_legales: IUsuarioEmpresa[];
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    sitio_web: string;
    direccion_principal: string;
    logo: string;
    firma_empresa: string;
    recargo: number;
    rut_empresa: null | string;
    telefono: null | string;
    email: null | string;
    ppm: string;
    clientes: number[];
}

export interface IFirmaConfidencialidad {
    id: number;
    contrato: number;
    acuerdo_base: number | null;
    firma_usuario_empresa: number | null;
    nombre_usuario: string;
    correo_usuario?: string;
    es_externo?: boolean;
    titulo_acuerdo: string;
    contenido_acuerdo: string;
    fecha_creacion: string;
    fecha_modificacion: string;
    fecha_envio: string | null;
    fecha_firma: string | null;
    firmado: boolean;
    archivo_firma: string | null;
    nombre_firmante?: string | null;
    correo_firmante?: string | null;
    periodicidad_meses?: number | null;
    vigencia_desde?: string | null;
    vigencia_hasta?: string | null;
}

export interface IVinculoContrato {
    id: number;
    usuario: number | null;
    contrato: number;
    datos_usuario: {
        nombre: string;
        email: string;
    } | null;
    tipo_usuario_label: string;
    existe_envio: number | null;
    fecha_creacion: string;
    fecha_modificacion: string;
    fecha_vinculacion: string;
    tipo_usuario: string;
    nombre: string | null;
    correo_generico: string | null;
    correo_normalizado: string | null;
    nombre_display: string;
    correo_display: string;
    es_externo: boolean;
    es_destinatario_principal: boolean;
    aprobacion_pendiente?: IContratoAprobacionEstado | null;
    firma_pendiente?: IContratoFirmaEstado | null;
}

export interface IContratoAprobacionEstado {
    id: number;
    uuid: string;
    enviado: boolean;
    respondido: boolean;
    aprobado: boolean | null;
    fecha_envio: string | null;
    fecha_respuesta: string | null;
    comentario_respuesta: string | null;
    version_envio: number;
    deprecado: boolean;
    fecha_deprecacion: string | null;
    motivo_deprecacion?: string | null;
}

export interface IContratoFirmaEstado {
    id: number;
    uuid: string;
    enviado: boolean;
    firmado: boolean;
    fecha_envio: string | null;
    fecha_firma: string | null;
}

export interface IContratoHistorialEvento {
    id: string;
    fecha: string | null;
    tipo: string;
    usuario: string | null;
    origen: string;
    detalle: string;
    cambios: string;
    solicitado_por_cliente?: boolean;
}

export interface IContratoRenovacionRef {
    id: number;
    nombre: string;
    estado: string;
}

export interface IVolverContratoBorradorResponse {
    detail: string;
    envios_deprecados: number;
    contrato: IContratoEmpresaCliente;
}

export interface IContratoPublicoAprobacion {
    uuid: string;
    puede_responder: boolean;
    ya_respondio: boolean;
    aprobado: boolean | null;
    fecha_envio: string | null;
    fecha_respuesta: string | null;
    comentario_respuesta: string | null;
    version_envio: number;
    destinatario: {
        id: number;
        nombre: string;
        email: string;
        es_externo: boolean;
    };
    contrato: IContratoEmpresaCliente;
    secciones_generadas: ISeccionContratoGenerada[];
}

export interface IContratoPublicoFirma {
    uuid: string | null;
    puede_firmar: boolean;
    firmado: boolean;
    fecha_envio: string | null;
    fecha_emision?: string | null;
    fecha_firma: string | null;
    firma?: string | null;
    firma_prestadora_disponible?: boolean;
    es_version_enviada?: boolean;
    destinatario: {
        id: number;
        nombre: string;
        email: string;
        es_externo: boolean;
    } | null;
    contrato: IContratoEmpresaCliente;
    secciones_generadas: ISeccionContratoGenerada[];
}

export interface IContratoFirmaPreview extends IContratoPublicoFirma {}

export interface IContratoResumenPublico {
    uuid: string;
    activo: boolean;
    fecha_envio: string | null;
    destinatario: {
        id: number;
        nombre: string;
        email: string;
        es_externo: boolean;
    } | null;
    contrato: IContratoEmpresaCliente;
    secciones_generadas: ISeccionContratoGenerada[];
}

export interface IContratoCondicionEspecial {
    id: number;
    contrato: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    condicion: number | null;
    texto: string | null;
    titulo_condicion: string;
    descripcion_condicion: string;
    nombre_condicion: string;
    detalle_condicion: string;
    multa_condicion: number;
    titulo_personalizado?: string | null;
    detalle_personalizado?: string | null;
    multa_incumplimiento?: string | number;
}

export interface IContratoLicencia {
    id: number;
    nombre_licencia: string;
    proveedor_licencia: string;
    licencias_disponibles: number;
    licencia_precio_partner: number | null;
    licencia_precio_venta: number | null;
    licencia_precio_venta_p1m: number | null;
    licencia_moneda: string | null;
    licencia_modalidad_base: string | null;
    licencia_numero_parte: string | null;
    licencia_descripcion: string | null;
    fecha_inicio_edicion: string | null;
    fecha_fin_edicion: string | null;
    dias_hasta_fin_edicion: number | null;
    nombre_contrato: string;
    se_puede_reducir: boolean;
    se_puede_cancelar: boolean;
    se_puede_desvincular: boolean;
    se_puede_aumentar: boolean;
    mensaje_ventana_edicion: string;
    dias_restantes_licencia: number;
    estado: string;
    estado_label: string;
    color_estado: 'emerald' | 'red' | 'amber' | 'zinc';
    fecha_creacion: string;
    fecha_modificacion: string;
    cantidad: number;
    modalidad_snapshot: string;
    modalidad_snapshot_label: string;
    moneda_snapshot: string;
    moneda_snapshot_label: string;
    precio_unitario_snapshot: string;
    nombre_snapshot: string;
    proveedor_snapshot: string;
    fecha_inicio: null | string;
    fecha_fin: null | string;
    partner: boolean;
    contrato: number;
    licencia: number;
    usuarios: number[];
    empresa_cliente: number;
}

export interface IContratoVisita {
    id: number;
    contrato: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    frecuencia: string;
    cantidad: number;
    visitas_usadas: number;
    precio_visita_adicional: string | null;
    visita: number;
    descripcion_visita: string;
    frecuencia_label: string;
}

export interface IResumenComercialContrato {
    tipo_resumen?: 'servicios' | 'licencia' | 'venta';
    moneda: 'CLP' | 'UF' | 'USD';
    forma_pago_contractual: 'mensual' | 'anual' | 'pago_unico';
    forma_pago_venta?: 'contado' | 'cuotas' | null;
    forma_pago_venta_label?: string | null;
    total_mensual: number;
    total_anual: number;
    total_pago_unico: number;
    total_licencias: number;
    total_contrato: number;
    cuotas_venta?: ICuotaVenta[];
    cuotas_venta_resumen?: ICuotaVenta[];
    cotizaciones_vinculadas_count?: number;
    cotizaciones_detalle?: Array<{
        id: number;
        numero_cotizacion: number | null;
        nombre: string;
        moneda_origen: 'CLP' | 'UF' | 'USD';
        total_origen: number;
        moneda_contrato: 'CLP' | 'UF' | 'USD';
        total_convertido: number | null;
        dolar_observado?: number | null;
        valor_uf?: number | null;
        tiene_items_moneda_mixta?: boolean;
        monedas_items?: Array<'CLP' | 'UF' | 'USD'>;
        items_count: number;
        error_conversion?: string | null;
    }>;
    errores_conversion?: string[];
}

export interface IPlanServicioDetalle {
    id: number;
    plan: number;
    servicio_version: IServicio;
    orden: number;
    obligatorio: boolean;
    cantidad_default: number;
    veces_por_mes_default: number;
}

export interface IContratoPlanComponenteSnapshot {
    servicio_version_id?: number | null;
    nombre: string;
    descripcion?: string | null;
    categoria?: string | null;
    categoria_label?: string | null;
    obligatorio?: boolean | null;
    cantidad_default?: number | null;
    veces_por_mes_default?: number | null;
    orden?: number | null;
    caracteristicas?: ICaracteristicaServicio[];
    alcance_caracteristicas?: IServicioAlcanceItem[];
    alcance_caracteristicas_texto?: string | null;
    incluye?: string | null;
    no_incluye?: string | null;
    clausulas_especiales?: string | null;
}

export interface IDetalleCobro {
    moneda_item: 'CLP' | 'UF' | 'USD';
    moneda_cobro: 'CLP' | 'UF' | 'USD';
    forma_pago_contractual: 'mensual' | 'anual' | 'pago_unico';
    precio_unitario: number;
    cantidad: number;
    veces_por_mes: number;
    descuento_anual_porcentaje: string | null;
    subtotal_mensual: number;
    subtotal_anual: number;
    subtotal_pago_unico: number;
    subtotal_cobro: number;
    subtotal_convertido: number | null;
    estado_conversion: 'misma_moneda' | 'convertido' | 'sin_tipo_cambio';
    dolar_observado: number | null;
    valor_uf: number | null;
    fecha_tipo_cambio: string;
}

export interface IContratoItemComercial {
    id: number;
    contrato: number;
    tipo_origen: 'servicio' | 'plan';
    servicio_version: IServicio | null;
    plan_version: IPlanServicio | null;
    catalogo_version_id: number | null;
    snapshot_nombre: string;
    snapshot_descripcion: string | null;
    snapshot_incluye: string | null;
    snapshot_no_incluye: string | null;
    snapshot_clausulas: string | null;
    snapshot_componentes_plan: IContratoPlanComponenteSnapshot[];
    cantidad: number;
    veces_por_mes: number;
    num_visitas_mensuales?: number | null;
    snapshot_num_visitas_mensuales?: number | null;
    forma_pago: 'mensual' | 'anual' | 'pago_unico';
    moneda: 'CLP' | 'UF' | 'USD';
    precio_unitario_contratado: string;
    descuento_anual_porcentaje?: string | null;
    total_mensual: string;
    total_anual: string;
    total_pago_unico: string;
    es_addon: boolean;
    orden: number;
    nombre: string;
    subtotal: number;
    subtotal_en_moneda_cobro: number | null;
    tipo_item: 'servicio' | 'plan';
    servicio_generico: IPlanServicio | IServicio | Record<string, unknown>;
    detalle_cobro?: IDetalleCobro;
}

export interface IContratoServicio {
    id: number;
    servicio_generico: IPlanServicio | IServicio;
    contrato: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    object_id: number;
    cantidad: number;
    precio_unitario: string;
    content_type: number;
    nombre: string;
    subtotal: number;
    subtotal_en_moneda_cobro: number | null;
    tipo_item: string;
}

export interface IPlanServicio {
    id: number;
    servicios: IServicio[];
    detalles_servicio?: IPlanServicioDetalle[];
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    descripcion: string;
    empresa_prestadora?: number | null;
    version?: number;
    activo?: boolean;
    es_vigente?: boolean;
    precio?: string;
    precio_anual?: string | null;
    tipo_moneda?: string;
    veces_por_mes_default?: number;
    num_visitas_mensuales?: number | null;
    formas_pago_permitidas?: string[];
    bloqueado_por_uso?: boolean;
    requiere_nueva_version?: boolean;
    alcance_heredado?: IPlanAlcanceItem[];
    alcance_conflictos?: IPlanAlcanceConflicto[];
    precio_sugerido?: number | null;
    tipo_moneda_sugerido?: string | null;
    incluye?: string | null;
    no_incluye?: string | null;
    clausulas_especiales?: string | null;
}

export interface IServicio {
    id: number;
    caracteristicas: ICaracteristicaServicio[];
    alcance_caracteristicas?: IServicioAlcanceItem[];
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    descripcion: string;
    categoria: string;
    categoria_label: string;
    empresa_prestadora?: number | null;
    version?: number;
    activo?: boolean;
    es_vigente?: boolean;
    precio?: string;
    tipo_moneda?: string;
    veces_por_mes_default?: number;
    formas_pago_permitidas?: string[];
    bloqueado_por_uso?: boolean;
    requiere_nueva_version?: boolean;
    incluye?: string | null;
    no_incluye?: string | null;
    clausulas_especiales?: string | null;
}

export interface ICaracteristicaServicio {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    descripcion: string;
}

export interface IServicioAlcanceItem {
    id: number;
    caracteristica_id: number;
    caracteristica: ICaracteristicaServicio;
    modo: 'incluye' | 'no_incluye';
    orden: number;
}

export interface IPlanAlcanceItem {
    caracteristica: ICaracteristicaServicio;
    modo: 'incluye' | 'no_incluye';
    servicios: string[];
}

export interface IPlanAlcanceConflicto {
    caracteristica: ICaracteristicaServicio;
    servicios_incluye: string[];
    servicios_no_incluye: string[];
}

export interface ICondicionEspecial {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    titulo: string;
    descripcion: string;
    multa_incumplimiento?: string | number;
}

export interface IVisita {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    descripcion: string;
}

export interface ILicencia {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    proveedor: string | null;
    descripcion: string | null;
    numero_parte: string | null;
    modalidad_base: 'P1M' | 'P1Y' | 'PAGO_UNICO';
    modalidad_anual_forma_pago: 'PAGO_UNICO' | 'PAGO_MENSUAL' | null;
    precio_partner: number;
    precio_venta: number;
    moneda: string;
    activo: boolean;
    empresa_prestadora?: number | null;
}

export interface IPersonaLicenciatariaResumen {
    id: number;
    nombre: string;
    es_interno: boolean;
    usuario_empresa: number | null;
}

export interface ICorreoPersonaLicenciataria {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    persona: number;
    empresa: number;
    correo: string;
    correo_normalizado: string;
    es_principal: boolean;
    es_corporativo: boolean;
    verificado: boolean;
    activo: boolean;
    persona_detalle: IPersonaLicenciatariaResumen;
}

export interface IUsuarioVinculadoLicencia {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    fecha_asignacion: string;
    nombre: null | string;
    correo_generico: null | string;
    usuario: number | null;
    licencia: number;
    correo_persona: number | null;
    datos_usuario: {
        nombre: string;
        correo: string;
    } | null;
    es_externo: boolean;
    nombre_display: string;
    correo_display: string;
    persona: IPersonaLicenciatariaResumen | null;
    correo_persona_detalle: ICorreoPersonaLicenciataria | null;
}

export interface IDetalleEnvio {
    acuerdos_confidencialidad: {
        id: number;
        acuerdo_base_id: number;
        acuerdo_base_titulo: string;
        acuerdo_base_contenido: string;
        contrato_id: number;
        fecha_creacion: string;
        fecha_modificacion: string;
    }[];
}

export interface IFacturaContrato {
    id: number;
    contrato: number;
    empresa_prestadora: number;
    empresa_cliente: number;
    estado: string;
    estado_label: string;
    periodo_inicio: string;
    periodo_fin: string;
    fecha_emision: string | null;
    monto_total: string;
    moneda: string;
    moneda_label: string;
    resultado: Record<string, unknown> | null;
    comentario: string;
    documento_factura: string | null;
    creado_por: number | null;
    actualizado_por: number | null;
    creado_por_nombre: string | null;
    nombre_contrato: string;
    nombre_cliente: string;
    nombre_prestadora: string;
    monto_calculado?: string;
    forma_pago_contractual?: string | null;
    forma_pago_contractual_label?: string | null;
    fecha_creacion: string;
    fecha_modificacion: string;
}

// ── Interfaces para matching OT-Contrato ──

export interface IContratoVisitaMatching {
    id: number;
    visita: number;
    frecuencia: string;
    frecuencia_label?: string;
    cantidad: number;
    visitas_usadas: number;
    descripcion_visita: string;
}

export interface IContratoItemComercialMatching {
    id: number;
    tipo_origen: 'servicio' | 'plan';
    snapshot_nombre: string;
    cantidad: number;
    veces_por_mes: number;
    precio_unitario_contratado: string;
    total_mensual: string;
    moneda: string;
    num_visitas_mensuales: number | null;
    snapshot_componentes_plan: IContratoPlanComponenteSnapshot[];
}

export interface IContratoMatching {
    id: number;
    nombre: string;
    estado: string;
    estado_label: string;
    empresa_cliente: number;
    moneda_cobro: string;
    dia_facturacion?: number | null;
    precio_visita_adicional?: string | number;
    fecha_inicio?: string;
    fecha_fin?: string | null;
    visitas: IContratoVisitaMatching[];
    items_comerciales: IContratoItemComercialMatching[];
}

export interface IFacturaContratoResumen {
    estado: string;
    cantidad: number;
    total: number | null;
}

// ── Interfaces para endpoints "por usuario" ──

export interface ILicenciaVinculadaPorUsuario {
    id: number;
    fecha_asignacion: string;
    nombre_licencia: string;
    proveedor_licencia: string | null;
    estado_licencia: string;
    estado_licencia_label: string;
    color_estado: 'emerald' | 'red' | 'amber' | 'zinc';
    fecha_fin_licencia: string | null;
    nombre_contrato: string;
    contrato_id: number;
    licencia_contrato_id: number;
}

export interface IContratoVinculadoPorUsuario {
    id: number;
    fecha_vinculacion: string;
    tipo_usuario: string;
    tipo_usuario_label: string;
    nombre_contrato: string;
    tipo_contrato: string;
    tipo_contrato_label: string;
    estado_contrato: string;
    estado_contrato_label: string;
    fecha_inicio_contrato: string;
    fecha_fin_contrato: string | null;
    contrato_id: number;
}

export interface IContratoItemComercialPayload {
    tipo_origen: 'servicio' | 'plan';
    version_id?: number;
    catalogo_version_id?: number;
    cantidad?: number;
    veces_por_mes?: number;
    num_visitas_mensuales?: number | null;
    forma_pago?: 'mensual' | 'anual' | 'pago_unico';
    moneda?: 'CLP' | 'UF' | 'USD';
    precio_unitario_contratado?: number;
    descuento_anual_porcentaje?: number | null;
    es_addon?: boolean;
}

export interface IAlcanceComercialPayload {
    modo: 'plan' | 'personalizado' | 'vacio';
    plan_id?: number | null;
    plan_version_id?: number | null;
    plan?: IContratoItemComercialPayload | null;
    items?: IContratoItemComercialPayload[];
    servicios?: IContratoItemComercialPayload[];
    addons?: IContratoItemComercialPayload[];
}

export interface IContratoBorradorPayload {
    contrato: Partial<
        Pick<
            IContratoEmpresaCliente,
            | 'nombre'
            | 'fecha_inicio'
            | 'fecha_fin'
            | 'observaciones'
            | 'tipo'
            | 'empresa_cliente'
            | 'empresa_prestadora'
            | 'moneda_cobro'
            | 'forma_pago_contractual'
            | 'forma_pago_venta'
            | 'plantilla'
            | 'dias_aviso_termino'
            | 'cuotas_venta'
        >
    >;
    destinatario_principal?: {
        usuario_id?: number;
        nombre?: string;
        correo?: string;
        correo_generico?: string;
        tipo_usuario?: string;
        es_destinatario_principal?: boolean;
    } | null;
    usuarios_vinculados?: Array<{
        id?: number;
        usuario_id?: number;
        nombre?: string;
        correo?: string;
        correo_generico?: string;
        tipo_usuario?: string;
        es_destinatario_principal?: boolean;
    }>;
    alcance_comercial?: IAlcanceComercialPayload | null;
    licencias?: Array<Record<string, unknown>>;
    visitas?: Array<Record<string, unknown>>;
    condiciones_especiales?: Array<Record<string, unknown>>;
    cotizaciones_ids?: number[];
}
