import { ICompra, IItemGuiaSalida } from './bodega.interface';
import { ICotizacion } from './cotizaciones.interface';
import { IVisitaSoporte } from './visitas.interface';

export interface IOrdenDeTrabajo {
    id: number;
    empresa_nombre: string;
    cliente_nombre: string;
    estado_label: string;
    prioridad_label: string;
    tipo_servicio_label: string;
    fecha_creacion: string;
    fecha_modificacion: string;
    fecha_inicio_ot: string;
    fecha_finalizacion_ot: string;
    estado: string;
    descripcion: string;
    prioridad: string;
    notas_internas: string;
    empresa: number;
    cliente: number;
    tipo_servicio: 'general' | 'soporte_r' | 'soporte_p';
    tecnico_responsable_ot: number | null;
    cliente_solicitante: number | null;
    soporte_tecnico_count?: number;
    servicios_count?: number;
    cierre_administrativo?: ICierreAdministrativoOT | null;
    prefactura_asociada_id?: number | null;
    rendicion_asociada_id?: number | null;
    guias_salida?: Array<{ id: number; estado: string }>;
    // Campos legacy (mantener para compatibilidad temporal)
    responsable_empresa?: null | number;
    solicitante_empresa?: number | null;
    adjuntos?: number[];
    trabajos?: number[];
    historial_cambios?: number[];
    ultimo_historial?: IHistorialCambiosOrden | null;
    nombre_solicitante?: string | null;
    nombre_responsable?: string | null;
}

export interface IListaTrabajosFiltrado {
    cotizaciones: ICotizacion[];
    visitas_soporte: IVisitaSoporte[];
}

export interface IServicioEnOT {
    id: number;
    orden: number;
    nombre: string;
    descripcion: string;
    estado: 'pendiente' | 'en_proceso' | 'medianamente_completado' | 'completado' | 'no_realizado';
    estado_label?: string;
    tecnico_asignado: number | null;
    nombre_tecnico?: string | null;
    resuelto: boolean;
    fecha_servicio: string | null;
    fecha_creacion: string;
    fecha_modificacion: string;
}

export interface IDetalleOrdenDeTrabajo {
    id: number;
    estado_label: string;
    nombre_tecnico: null | string;
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    descripcion: string;
    trabajo_id: number;
    estado: string;
    orden: number;
    content_type: number;
    tecnico_asignado: null | number;
    insumo: null | number;
    estado_insumo: string | null;
    estado_visita: string | null;
    codigo_cotizacion: number | null;
}

export interface IItemSerializado {
    item_guia_id: number;
    guia_id: number;
    serie: string;
    item_id: number;
    item_nombre: string;
}

export interface ISeguimientoOrden {
    detalleId: number | undefined;
    id: number;
    orden: number;
    tipo: string;
    fecha: string;
    comentario: string;
    usuario: number;
    nombre_usuario: string;
}

export interface ISeguimientoItemOT {
    id: number;
    orden?: number | null;
    servicio: number | null;
    servicio_nombre: string | null;
    soporte: number | null;
    soporte_nombre: string | null;
    usuario: number | null;
    usuario_nombre: string | null;
    tipo: string;
    comentario: string | null;
    fecha_creacion: string;
    fecha_modificacion: string;
}

export interface IHistorialCambiosOrden {
    id: number;
    nombre_usuario: string;
    fecha_creacion: string;
    fecha_modificacion: string;
    fecha_cambio: string;
    estado_anterior: string | null;
    estado_actual: string | null;
    comentario: string | null;
    orden: number;
    usuario: number;
}

export interface IAdjuntoDeOrden {
    id: number;
    tipo_label: string;
    fecha_creacion: string;
    fecha_modificacion: string;
    tipo: string;
    archivo: string;
    descripcion: string;
    orden: number;
}

export interface IHistorialSimple {
    id: number;
    history_date: string;
    history_user: string;
    model: string;
    detalle_cambio: string;
    valor_anterior: null | string;
    valor_nuevo: string | null;
    accion: string;
    accion_tipo: string;
    accion_modelo: string;
}

export interface IListaDetallesSeguimientosOT {
    orden_id: number;
    detalles: {
        detalle_id: number;
        seguimientos: {
            id: number;
            tipo: string;
            fecha: string;
            comentario: string;
            usuario: number;
        }[];
        visita: {
            id: number;
            asistencias: {
                id: number;
                estado_revision: string;
                observaciones: string;
                observaciones_revision: string;
            }[];
            entregas: {
                id: number;
                estado_entrega: string;
                observaciones: string;
                observaciones_entrega: string;
            }[];
            descripcion_servicio: string;
        } | null;
    }[];
}

export interface IDetalleOrdenDeTrabajoCompra {
    id: number;
    estado_label: string;
    nombre_tecnico: null | string;
    compra: ICompra;
    estado_insumo: string | null;
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    descripcion: string;
    trabajo_id: number;
    estado: string;
    orden: number;
    content_type: number;
    tecnico_asignado: null | number;
    insumo: null | number;
}

export interface IInsumo {
    id: number;
    nombre: string;
    descripcion: string;
    estado: string;
    guia: {
        id: number;
        motivo: string;
        cantidad_items: number;
        cantidad_rebajada_total: number;
        cantidad_devuelta_total: number;
        nombre_usuario_creador: string;
        cliente_nombre: string;
        estado: string;
        estado_label: string;
    } | null;
    estado_label: string;
    tipo?: 'soporte' | 'servicio' | 'guia_directa';
    items?: IItemGuiaSalida[];
}

export interface ICheckCompletibilidad {
    se_puede_completar: boolean;
    razones: string[];
}

export interface IRetroalimentacionOT {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    uuid: string;
    cantidad_visitas: number;
    usuario_externo: string | null;
    correo_usuario_externo: string | null;
    observacion_retroalimentacion: null | string;
    fecha_retroalimentacion: null | string;
    orden_trabajo: string;
    usuario_empresa: null | number;
    preguntas: number[];
    datos_usuario: null | {
        nombre: string;
        correo: string;
    };
}

export interface IRetroalimentacionSinPermisosOT {
    uuid: string;
    orden_trabajo: number;
    usuario_empresa: null | string;
    usuario_externo: string;
    correo_usuario_externo: string;
    observacion_retroalimentacion: null | string;
    fecha_retroalimentacion: null | string;
    retroalimentacion_aplicada: IRetroalimentacionAplicada[];
}

export interface IRetroalimentacionAplicada {
    id: number;
    pregunta: number;
    pregunta_texto: string;
    cantidad_estrellas: null | number;
    observaciones: string;
}

export interface IDetalleGastoRendicionOT {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    detalle: string | null;
    cantidad: number;
    monto_unitario: number;
    monto_total: number;
    fecha_gasto: string;
    orden: number;
    categoria: number;
    nombre_categoria: string | null;
    descripcion_categoria: string | null;
}

export interface IUsuarioVinculado {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    usuario_externo: null | string;
    correo_usuario_externo: null | string;
    orden: number;
    usuario_empresa: number;
    datos_usuario: null | {
        nombre: string;
        correo: string;
    };
}

export interface IGuardadoParcialRetroalimentacion {
    token: string;
    preguntas: {
        id: number;
        cantidad_estrellas: number;
        observaciones: string;
    }[];
}

export interface IDetalleRetroalimentacionOT {
    id: number;
    retroalimentacion_aplicada: IRetroalimentacionAplicada[];
    fecha_creacion: string;
    fecha_modificacion: string;
    uuid: string;
    cantidad_visitas: number;
    usuario_externo: null | string;
    correo_usuario_externo: null | string;
    observacion_retroalimentacion: string;
    fecha_retroalimentacion: null | string;
    orden_trabajo: number;
    usuario_empresa: number;
    preguntas: number[];
    datos_usuario: null | {
        nombre: string;
        correo: string;
    };
}

// ========================================
// INTERFACES V2 - OrdenTrabajoV2
// ========================================

export interface ISoporteTecnico {
    id: number;
    orden: number;
    nombre: string;
    descripcion: string;
    estado: 'pendiente' | 'en_proceso' | 'completado' | 'medianamente_completado' | 'no_realizado';
    estado_label?: string;
    tecnico_asignado: number | null;
    nombre_tecnico?: string | null;
    fecha_soporte: string | null;
    guia_salida?: {
        id: number;
        motivo: string;
        cantidad_items: number;
        estado: string;
        estado_label: string;
    } | null;
    usuarios_asignados_count?: number;
    fecha_creacion: string;
    fecha_modificacion: string;
}

export interface IServicioEnOT {
    id: number;
    orden: number;
    nombre: string;
    descripcion: string;
    estado: 'pendiente' | 'en_proceso' | 'completado' | 'medianamente_completado' | 'no_realizado';
    tecnico_asignado: number | null;
    resuelto: boolean;
    fecha_servicio: string | null;
    fecha_creacion: string;
    fecha_modificacion: string;
}

export interface IUsuarioAsignadoSoporte {
    id: number;
    soporte_tecnico: number;
    usuario_equipo: number | null;
    usuario_empresa?: number | null;
    nombre_usuario: string;
    numero_serie_equipo?: string | null;
    tipo_equipo?: string | null;
    equipo_id?: number | null;
    trabajo_realizado: string;
    resuelto: boolean;
    cache_asignacion?: Record<string, unknown> | null;
    fecha_creacion: string;
    fecha_modificacion: string;
}

export interface IRendicionEnOt {
    id: number;
    orden: number;
    categoria: string;
    detalle: string | null;
    cantidad: number;
    monto_unitario: number;
    monto_total: number;
    usuario_comprador: number | null;
    fecha_compra: string;
    fecha_creacion: string;
    fecha_modificacion: string;
}

export interface ICierreAdministrativoOT {
    id: number;
    orden: number;
    usuario: number | null;
    fecha_cierre: string;
    estado_cierre?: string | null;
    valido: boolean;
    resultado: Record<string, any>;
    comentario: string | null;
    fecha_creacion: string;
    fecha_modificacion: string;
}
