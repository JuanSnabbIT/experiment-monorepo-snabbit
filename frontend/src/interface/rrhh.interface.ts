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
    | 'en_firma'
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

    nombre: string | null;
    observaciones: string | null;
    sueldo_liquido: string | null;
    horario_detalle: string | null;
    tiempo_colacion: number | null;
    lugar_firma: string | null;
    fecha_firma: string | null;
    plantilla_contrato: number | null;

    // Datos derivados (read-only)
    nombre_trabajador?: string | null;
    email_trabajador?: string | null;
    rut_trabajador?: string | null;
    anexos?: IAnexoContrato[];
}

export interface ITrabajadorDatosOpcionales {
    afp?: string;
    sistema_salud?: 'fonasa' | 'isapre' | 'otro';
    nombre_isapre?: string;
    banco?: string;
    tipo_cuenta_bancaria?: 'corriente' | 'vista' | 'ahorro' | 'rut';
    numero_cuenta_bancaria?: string;
    nacionalidad?: string;
    fecha_nacimiento?: string;
    direccion?: string;
}

export interface ITrabajadorExistentePayload extends ITrabajadorDatosOpcionales {
    modo: 'existente';
    usuario_empresa_id: number;
}

export interface ITrabajadorNuevoPayload extends ITrabajadorDatosOpcionales {
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

export interface IEnviarFirmaContratoTrabajadorResponse {
    uuid: string;
    url_firma: string;
    contrato: IContratoTrabajador;
}

export interface ISeccionContratoTrabajadorGenerada {
    titulo: string;
    contenido: string;
    orden: number;
}

export interface IContratoTrabajadorPublicoFirma {
    uuid: string;
    puede_firmar: boolean;
    firmado: boolean;
    fecha_envio: string | null;
    fecha_firma: string | null;
    firma: string | null;
    destinatario: { nombre: string; email: string } | null;
    contrato: { datos_empresa?: { nombre?: string }; [key: string]: unknown };
    secciones_generadas: ISeccionContratoTrabajadorGenerada[];
}

export interface IFirmarContratoTrabajadorPublicoPayload {
    firma: string;
    fecha_firma: string;
    firmado: boolean;
}
