// Interfaces TypeScript para el modulo Orden de Trabajo V3

export type TEstadoOTV3 =
    | 'borrador'
    | 'preparacion'
    | 'en_ejecucion'
    | 'retroalimentacion'
    | 'por_facturar'
    | 'completada'
    | 'facturada'
    | 'cerrada'
    | 'cancelada';

export type TModalidadOTV3 = 'presencial' | 'remoto' | 'hibrido';

export type TTipoServicioOTV3 =
    | 'soporte_tecnico_presencial'
    | 'soporte_tecnico_remoto'
    | 'servicios_generales';

export type TPrioridadOTV3 = 'baja' | 'normal' | 'alta' | 'critica';

export type TEstadoTareaOTV3 = 'pendiente' | 'en_proceso' | 'completada' | 'no_realizada';

export type TRolAsignacion = 'lider' | 'apoyo' | 'supervisor';

export type TTipoSeguimientoOTV3 =
    | 'comentario_tecnico'
    | 'incidencia'
    | 'comunicacion_cliente'
    | 'actualizacion';

export type TTipoChecklistOTV3 = 'pre_trabajo' | 'post_trabajo';

export type TTipoAdjuntoOTV3 = 'foto' | 'documento' | 'reporte' | 'otro';

export type TEtapaUIOTV3 =
    | 'preparacion'
    | 'ejecucion'
    | 'retroalimentacion'
    | 'por_facturar'
    | 'cierre'
    | 'cerrada'
    | 'cancelada';

export type TEstadoPrefacturaOTV3 = 'borrador' | 'por_facturar' | 'facturado';

export interface IPrefacturaOTV3 {
    id: number;
    /** @deprecated Usar `ots` (M2M). Se mantiene por compatibilidad con datos historicos. */
    ot?: number;
    ot_titulo?: string;
    ots: number[];
    ots_titulos?: string[];
    contratos: number[];
    contratos_nombres?: string[];
    comentario?: string;
    cliente: number;
    cliente_nombre?: string;
    estado_cierre: TEstadoPrefacturaOTV3;
    resultado: Record<string, any>;
    fecha_prefactura?: string | null;
    documento_factura?: string | null;
    fecha_creacion?: string;
    fecha_modificacion?: string;
}

export interface ICreatePrefacturaV3Payload {
    /** Lista de OT IDs a incluir (nuevo campo multi-OT). */
    ot_ids?: number[];
    /** @deprecated Compatibilidad legacy — usar ot_ids. */
    ot_id?: number;
    contrato_ids?: number[];
    comentario?: string;
    /** Resultado con matching manual (opcional). */
    resultado?: IResultadoPrefacturaV3;
    fecha_prefactura?: string;
}

export interface IComparativaV3Params {
    ot_ids: number[];
    contrato_ids?: number[];
    fecha_prefactura?: string;
    dolar?: number;
    uf?: number;
}

export interface IComparativaItemV3 {
    descripcion: string;
    cantidad?: number;
    precio_unitario?: number;
    total: number;
    moneda?: string;
    fuente?: string;
}

export interface IComparativaV3Result {
    pactado: { items: IComparativaItemV3[]; total: number; moneda: string };
    ejecutado: {
        items: IItemEjecutadoV3[];
        total: number;
        moneda: string;
        resumen?: Record<string, number>;
        cotizaciones?: Array<Record<string, unknown>>;
    };
    diferencia: number;
    visitas_contrato: Record<string, any> | null;
    ots_marcadas_visitas: number[];
}

export interface IChecklistItemOTV3 {
    id: number;
    tarea: number;
    tipo: TTipoChecklistOTV3;
    tipo_display: string;
    descripcion: string;
    completado: boolean;
    completado_por: number | null;
    completado_por_nombre: string | null;
    fecha_completado: string | null;
    fecha_creacion: string;
}

export interface ITareaOTV3 {
    id: number;
    orden: number;
    titulo: string;
    descripcion: string;
    estado: TEstadoTareaOTV3;
    estado_display: string;
    tipo_tarea: 'regular' | 'entrega_equipo';
    tipo_tarea_display: string;
    tecnico_asignado: number | null;
    tecnico_asignado_nombre: string | null;
    usuario_receptor: number | null;
    usuario_receptor_nombre: string | null;
    fecha_programada: string | null;
    fecha_ejecutada: string | null;
    notas_ejecucion: string;
    requiere_firma: boolean;
    firma_datos: {
        nombre: string;
        firma_base64: string;
        fecha: string;
        firmado_por_id: number;
    } | null;
    checklist: IChecklistItemOTV3[];
    checklist_completado: number;
    checklist_total: number;
    item_guia_origen: number | null;
    item_guia_origen_detalle: {
        id: number;
        nombre_item: string;
        individualizado: boolean;
        cantidad_rebajada: number;
    } | null;
    fecha_creacion: string;
    fecha_modificacion: string;
}

export interface IAsignacionTecnicoOTV3 {
    id: number;
    orden: number;
    tecnico: number;
    tecnico_nombre: string;
    tecnico_email: string;
    rol: TRolAsignacion;
    rol_display: string;
    confirmado: boolean;
    fecha_creacion: string;
}

export interface ISeguimientoOTV3 {
    id: number;
    orden: number;
    tarea: number | null;
    tipo: TTipoSeguimientoOTV3;
    tipo_display: string;
    contenido: string;
    autor: number | null;
    autor_nombre: string | null;
    fecha_creacion: string;
}

export interface IGastoOTV3 {
    id: number;
    orden: number;
    tarea: number | null;
    categoria: number;
    categoria_nombre: string | null;
    detalle: string;
    cantidad: number;
    monto_unitario: string;
    monto_total: string;
    comprobante: string | null;
    usuario_comprador: number | null;
    usuario_comprador_nombre: string | null;
    fecha_compra: string | null;
    fecha_creacion: string;
}

export interface IAdjuntoOTV3 {
    id: number;
    orden: number;
    tarea: number | null;
    tipo: TTipoAdjuntoOTV3;
    tipo_display: string;
    archivo: string;
    archivo_url: string | null;
    descripcion: string;
    subido_por: number | null;
    subido_por_nombre: string | null;
    fecha_creacion: string;
}

export interface IHistorialEstadoOTV3 {
    id: number;
    orden: number;
    estado_anterior: string;
    estado_anterior_display: string;
    estado_nuevo: string;
    estado_nuevo_display: string;
    comentario: string;
    usuario: number | null;
    usuario_nombre: string;
    fecha_creacion: string;
}

export interface IOrdenDeTrabajoV3List {
    id: number;
    titulo: string;
    empresa: number;
    empresa_nombre: string | null;
    cliente: number;
    cliente_nombre: string | null;
    tipo_servicio: TTipoServicioOTV3;
    tipo_servicio_display: string;
    modalidad: TModalidadOTV3;
    modalidad_display: string;
    estado: TEstadoOTV3;
    estado_display: string;
    prioridad: TPrioridadOTV3;
    prioridad_display: string;
    etapa_ui: TEtapaUIOTV3;
    tecnico_responsable: number | null;
    tecnico_responsable_nombre: string | null;
    fecha_programada: string | null;
    fecha_fin_estimada: string | null;
    fecha_inicio_real: string | null;
    fecha_finalizacion_real: string | null;
    total_tareas: number;
    tareas_completadas: number;
    fecha_creacion: string;
}

export interface ICotizacionItemResumenOTV3 {
    id: number;
    nombre: string;
    proveedor_empresa_nombre: string | null;
    cantidad: number;
    precio_unitario: string;
    costo_total: string;
    tipo_moneda: string;
    tipo_moneda_label: string;
}

export interface ICotizacionResumenOTV3 {
    id: number;
    numero_cotizacion: number;
    nombre: string;
    estado: string;
    total_estimado: string;
    tipo_moneda: string;
    tipo_moneda_label: string;
    tiene_equipos: boolean;
    items: ICotizacionItemResumenOTV3[];
}

export interface IClienteSolicitanteDetalleOTV3 {
    id: number;
    nombre: string;
    email: string | null;
}

export interface IOrdenDeTrabajoV3 extends IOrdenDeTrabajoV3List {
    descripcion: string;
    contrato: number | null;
    sucursal: number | null;
    cliente_solicitante: number | null;
    cliente_solicitante_detalle: IClienteSolicitanteDetalleOTV3 | null;
    direccion: string;
    notas_internas: string;
    tareas: ITareaOTV3[];
    asignaciones: IAsignacionTecnicoOTV3[];
    seguimientos: ISeguimientoOTV3[];
    gastos: IGastoOTV3[];
    adjuntos: IAdjuntoOTV3[];
    historial_estados: IHistorialEstadoOTV3[];
    total_gastos: number;
    fecha_modificacion: string;
    guias_vinculadas: IGuiaSalidaResumenOTV3[];
    ordenes_compra_vinculadas: IOrdenCompraResumenOTV3[];
    cotizaciones_detalle: ICotizacionResumenOTV3[];
}

export interface IItemGuiaSalidaResumenOTV3 {
    id: number;
    nombre_item: string;
    numero_serie: Record<string, unknown>;
    cantidad_rebajada: number;
    individualizado: boolean;
}

export interface IGuiaSalidaResumenOTV3 {
    id: number;
    estado: string;
    estado_label: string;
    motivo: string;
    cliente_nombre: string;
    cotizacion_origen_id: number | null;
    cotizacion_origen_numero: number | null;
    fecha_creacion: string;
    cantidad_items_total: number;
    descripcion_items: string;
    items_detalle: IItemGuiaSalidaResumenOTV3[];
}

export interface IOrdenCompraResumenOTV3 {
    id: number;
    codigo: string;
    estado: string;
    estado_label: string;
    nombre_proveedor: string;
    nombre_cliente: string;
    fecha_compra: string;
    relacion_cotizacion_numero: string | null;
    relacion_cotizacion_id: number | null;
}

export interface IStockItemParaGuiaRapida {
    stock_item_id: number | null;
    item_id: number;
    item_nombre: string;
    categoria_nombre: string;
    cantidad_disponible: number;
    series_disponibles: string[];
    requiere_serie: boolean;
    en_stock: boolean;
}

export interface IOrdenDeTrabajoV3Write {
    titulo: string;
    descripcion?: string;
    empresa?: number;
    sucursal?: number | null;
    cliente: number;
    contrato?: number | null;
    cotizaciones?: number[];
    cliente_solicitante?: number | null;
    tipo_servicio: TTipoServicioOTV3;
    modalidad?: TModalidadOTV3;
    prioridad: TPrioridadOTV3;
    tecnico_responsable?: number | null;
    fecha_programada?: string | null;
    fecha_fin_estimada?: string | null;
    direccion?: string;
    notas_internas?: string;
}

export interface ITareaOTV3Write {
    titulo: string;
    descripcion?: string;
    tecnico_asignado?: number | null;
    fecha_programada?: string | null;
    requiere_firma?: boolean;
    tipo_tarea?: 'regular' | 'entrega_equipo';
    usuario_receptor?: number | null;
}

export interface ICheckAvanceOTV3 {
    estado_actual: TEstadoOTV3;
    transiciones_posibles: TEstadoOTV3[];
    proximo_estado?: TEstadoOTV3;
    bloqueadores: Array<{
        tipo: string;
        mensaje: string;
        detalle?: string[];
    }>;
    puede_avanzar: boolean;
}

export interface IMetricasDashboardOTV3 {
    total: number;
    por_estado: Record<TEstadoOTV3, number>;
    por_modalidad: Record<TModalidadOTV3, number>;
}

// ── Matching Manual (Prefactura) ──────────────────────────────────────

export interface IItemEjecutadoV3 {
    id: string | number;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    total: number;
    tipo: string;
    ot_id?: number;
    estado?: string;
    guia_id?: number;
    compra_id?: number;
    rendicion_id?: number;
    item_rendicion_id?: number;
    content_type?: string;
    item_id?: number;
    categoria_id?: number | null;
    categoria_nombre?: string | null;
    fecha_gasto?: string | null;
    dolar_observado?: number | null;
}

export interface IItemPrefacturaV3 {
    itemId: string;
    facturar: boolean;
    comentario: string;
    precioAsignado: number | null;
}

export interface IVisitasContratoResumenV3 {
    periodo: string;
    incluidas_mes: number;
    confirmadas_mes: number;
}

export interface IVisitasPrefacturaV3 extends IVisitasContratoResumenV3 {
    marcadas_prefactura: number;
    proyectadas_mes: number;
    exceso_prefactura: number;
    ots_marcadas: number[];
    precio_unitario_exceso: number;
    total_exceso: number;
}

export interface IResultadoPrefacturaV3 {
    cliente_id?: number | null;
    contrato_ids?: number[] | null;
    ots_incluidas?: number[];
    items?: IItemFacturableV3[];
    resumen?: {
        total_items?: number;
        total_facturar?: number;
        total_excluidos?: number;
    };
    visitas?: IVisitasPrefacturaV3;
}

export interface IItemFacturableV3 {
    tipo: string;
    id: string | number;
    descripcion: string;
    ot_id?: number;
    cantidad: number;
    precio_total: number;
    precio_ajustado?: number | null;
    facturar: boolean;
    comentario?: string;
    categoria_id?: number | null;
    categoria_nombre?: string | null;
    fecha_gasto?: string | null;
    dolar_observado?: number | null;
    parent_id?: number | null;
    item_id?: string | number | null;
    guia_id?: number | null;
    compra_id?: number | null;
    rendicion_id?: number | null;
    item_rendicion_id?: number | null;
    content_type?: string | null;
}

export interface ITipoCambioResponse {
    fecha: string;
    fecha_dolar: string | null;
    fecha_uf: string | null;
    dolar: number;
    uf: number;
}
