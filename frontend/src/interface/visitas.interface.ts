import { IEquipo } from './recursos.interface';

export interface IVisitaSoporte {
    id: number;
    empresa: number | undefined;
    empresa_nombre: string | undefined;
    cliente: number | undefined;
    cliente_nombre: string | undefined;
    asistencia_usuarios: number[];
    descripcion_servicio: string | undefined;
    fecha_creacion: string | undefined;
    fecha_modificacion: string | undefined;
    estado: string;
    estado_label: string;
    guia_salida: number | null;
    guia_salida_nombre: string;
}

export interface IAsistenciaUsuario {
    id: number;
    visita: number | undefined;
    estado_revision: string;
    estado_revision_label: string;
    observaciones: string;
    usuario_equipo: number | undefined;
    usuario_equipo_nombre: string | undefined;
    observaciones_revision: string;
}

export interface IEntregaEquipo {
    id: number;
    nombre_usuario_a_entregar: string;
    estado_entrega_label: string;
    datos_equipo: IEquipo;
    fecha_creacion: string;
    fecha_modificacion: string;
    estado_entrega: string;
    observaciones: string;
    firma_entregado: string;
    observaciones_entrega: string;
    visita: number;
    equipo: number;
    usuario_a_entregar: number;
    se_puede_firmar: boolean;
}

export interface IInsumoEnVisitaSoporte {
    id: number;
    visita: number;
    guia: number;
}

export interface IEntregaEquipoEnOT {
    id: number;
    estado_entrega_label: string;
    nombre_usuario_a_entregar: string;
    numero_serie_equipo: string;
    fecha_creacion: string;
    fecha_modificacion: string;
    estado_entrega: string;
    observaciones: string;
    nombre_quien_recibe: string;
    firma_entregado: string;
    observaciones_entrega: string;
    visita: number;
    equipo: number | null;
    usuario_a_entregar: number | null;
    se_puede_firmar: boolean;
}

export interface IAsistenciaUsuarioEnOT {
    id: number;
    estado_revision_label: string;
    usuario_equipo_nombre: string;
    fecha_creacion: string;
    fecha_modificacion: string;
    estado_revision: string;
    observaciones: string;
    observaciones_revision: string;
    visita: number;
    usuario_equipo: number;
}

export interface IVisitaEnOT {
    id: number;
    datos_entregas: IEntregaEquipoEnOT[];
    datos_asistencias: IAsistenciaUsuarioEnOT[];
    fecha_creacion: string;
    fecha_modificacion: string;
    descripcion_servicio: string;
    empresa: number;
    cliente: number;
    estado: string;
}
