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
    nueva_fecha_termino?: string | null;
    estado: TEstadoContrato;
    estado_label?: string;
    creado_por: number | null;
    fecha_creacion: string;
    fecha_modificacion: string;
}

export interface IContratoTrabajador {
    id: number;
    usuario_empresa: number | null;

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
    telefono_trabajador?: string | null;
    fecha_nacimiento_trabajador?: string | null;
    nacionalidad_trabajador?: string | null;
    direccion_trabajador?: string | null;
    empresa_nombre?: string | null;
    sucursal_nombre?: string | null;
    email_empresa?: string | null;
    datos_previsionales_trabajador?: {
        afp?: string | null;
        sistema_salud?: 'fonasa' | 'isapre' | 'otro' | null;
        nombre_isapre?: string | null;
        banco?: string | null;
        tipo_cuenta_bancaria?: 'corriente' | 'vista' | 'ahorro' | 'rut' | null;
        numero_cuenta_bancaria?: string | null;
    } | null;
    anexos?: IAnexoContrato[];
    datos_trabajador_nuevo?: {
        email: string;
        first_name?: string;
        last_name?: string;
        rut?: string | null;
        sucursal_id?: number;
        // Datos personales extendidos
        nacionalidad?: string | null;
        fecha_nacimiento?: string | null;
        direccion?: string | null;
        // Datos previsionales
        afp?: string | null;
        sistema_salud?: 'fonasa' | 'isapre' | 'otro' | null;
        nombre_isapre?: string | null;
        banco?: string | null;
        tipo_cuenta_bancaria?: 'corriente' | 'vista' | 'ahorro' | 'rut' | null;
        numero_cuenta_bancaria?: string | null;
        [key: string]: unknown;
    } | null;
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

export type TDecisionAprobacion = 'pendiente' | 'aprobado' | 'rechazado' | 'cambios_solicitados';

export type TActorTipoContrato = 'sistema' | 'rrhh' | 'cliente';
export type TEventoTipoContrato =
    | 'creacion'
    | 'modificacion_campos'
    | 'cambio_estado'
    | 'envio_aprobacion'
    | 'aprobacion'
    | 'rechazo'
    | 'solicitud_cambio'
    | 'anexo_creado'
    | 'eliminacion';

export interface ICambioCampoContrato {
    campo: string;
    valor_anterior: string | null;
    valor_nuevo: string | null;
}

export interface IContratoTrabajadorHistorialEvento {
    id: string;
    fecha: string;
    actor_tipo: TActorTipoContrato;
    actor_nombre: string | null;
    evento_tipo: TEventoTipoContrato;
    origen: 'contrato' | 'anexo' | 'aprobacion_empleador';
    detalle: string;
    cambios: ICambioCampoContrato[];
}

export interface IEnvioAprobacionEmpleador {
    id: number;
    uuid: string;
    contrato: number;
    enviado_a: string;
    enviado_por: number | null;
    decision: TDecisionAprobacion;
    decision_label?: string;
    motivo_rechazo: string | null;
    cambios_solicitados: string[];
    notificar_trabajador: boolean;
    fecha_envio: string;
    fecha_respuesta: string | null;
    ip_respuesta: string | null;
    expirado: boolean;
}

export interface IContratoAprobacionPublica {
    contrato: {
        id: number;
        tipo_contrato: string;
        tipo_contrato_label?: string;
        cargo: string;
        fecha_inicio: string;
        fecha_termino: string | null;
        jornada: string;
        jornada_label?: string;
        sueldo_base: string;
        moneda: string;
        nombre_trabajador: string | null;
        email_trabajador: string | null;
        empresa_nombre: string | null;
    };
    decision: TDecisionAprobacion;
    decision_label?: string;
    fecha_envio: string;
}

export interface IResponderAprobacionPayload {
    decision: TDecisionAprobacion;
    motivo_rechazo?: string;
    cambios_solicitados?: string[];
    notificar_trabajador?: boolean;
    email_trabajador?: string;
}

