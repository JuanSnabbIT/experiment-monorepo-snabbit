// Interfaces del modulo RRHH (contratos laborales y anexos)

export type TTipoContrato =
    | 'indefinido'
    | 'plazo_fijo'
    | 'honorarios'
    | 'reemplazo'
    | 'obra_o_faena';

export type TJornadaContrato = 'completa' | 'parcial' | 'part_time' | 'turnos';

export type TEstadoContrato =
    | 'borrador'
    | 'pendiente_aceptacion'
    | 'vigente'
    | 'terminado'
    | 'anulado';

export type TMonedaContrato = 'CLP' | 'UF' | 'USD';

export type TMotivoTerminoContrato =
    | 'renuncia'
    | 'mutuo_acuerdo'
    | 'vencimiento_plazo'
    | 'necesidades_empresa'
    | 'otro';

export type TTipoAnexoContrato =
    | 'modificacion_sueldo'
    | 'modificacion_cargo'
    | 'modificacion_jornada'
    | 'prorroga'
    | 'otro';

export interface IAnexoContrato {
    id: number;
    contrato: number;
    tipo: TTipoAnexoContrato;
    tipo_label?: string;
    fecha_efectiva: string;
    descripcion: string;
    archivo_pdf: string | null;
    estado: TEstadoContrato;
    estado_label?: string;
    creado_por: number | null;
    fecha_creacion: string;
    fecha_modificacion: string;
}

export interface IContratoTrabajador {
    id: number;
    usuario_empresa: number;

    tipo_contrato: TTipoContrato;
    tipo_contrato_label?: string;
    fecha_inicio: string;
    fecha_termino: string | null;

    cargo: string;
    funciones: string | null;

    jornada: TJornadaContrato;
    jornada_label?: string;
    horas_semanales: number | null;
    lugar_trabajo: string | null;

    sueldo_base: string;
    moneda: TMonedaContrato;
    moneda_label?: string;
    gratificacion_legal: boolean;
    bono_movilizacion: string;
    bono_colacion: string;

    archivo_pdf: string | null;

    estado: TEstadoContrato;
    estado_label?: string;
    fecha_aceptacion: string | null;
    aceptado_por: number | null;

    motivo_termino: TMotivoTerminoContrato | null;
    motivo_termino_label?: string | null;
    fecha_termino_real: string | null;
    observaciones_termino: string | null;

    creado_por: number | null;
    fecha_creacion: string;
    fecha_modificacion: string;

    // Datos derivados (read-only)
    nombre_trabajador?: string | null;
    email_trabajador?: string | null;
    rut_trabajador?: string | null;
    anexos?: IAnexoContrato[];
}

export interface ITrabajadorExistentePayload {
    modo: 'existente';
    usuario_empresa_id: number;
}

export interface ITrabajadorNuevoPayload {
    modo: 'nuevo';
    email: string;
    first_name: string;
    last_name?: string;
    rut?: string;
    sucursal_id: number;
    enviar_invitacion?: boolean;
}

export interface ICrearContratoConTrabajadorPayload {
    trabajador: ITrabajadorExistentePayload | ITrabajadorNuevoPayload;
    contrato: Partial<IContratoTrabajador>;
}

export interface ICrearContratoConTrabajadorResponse {
    contrato: IContratoTrabajador;
    usuario_empresa_id: number;
    invitacion_enviada: boolean;
}
