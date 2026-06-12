// Interfaces del modulo RRHH (contratos laborales y anexos)

export interface ITrabajadorCliente {
    tipo: 'confirmado' | 'pendiente';
    ref_id: number;
    nombre: string | null;
    email: string | null;
    rut: string | null;
    cargo: string | null;
    sucursal_id: number | null;
    estado: string;
    estado_label: string;
}

export type TTipoContrato =
    | 'indefinido'
    | 'plazo_fijo'
    | 'reemplazo';

export type TJornadaContrato = 'completa' | 'parcial' | 'turnos';

export type TEstadoContrato =
    | 'borrador'
    | 'pendiente_aprobacion'
    | 'vigente'
    | 'terminado'
    | 'anulado'
    | 'descartado';

export type TMonedaContrato = 'CLP' | 'UF' | 'USD';

export type TMotivoTerminoContrato =
    | 'renuncia'
    | 'mutuo_acuerdo'
    | 'vencimiento_plazo'
    | 'necesidades_empresa'
    | 'incumplimiento_grave'
    | 'falta_probidad'
    | 'inasistencias_injustificadas'
    | 'abandono_trabajo'
    | 'caso_fortuito_fuerza_mayor'
    | 'otro';

export type TTipoGratificacion = 'art_47' | 'art_50_mensual' | 'no_aplica';

export type TTipoAnexoContrato =
    | 'modificacion_sueldo'
    | 'modificacion_cargo'
    | 'modificacion_jornada'
    | 'prorroga'
    | 'otro';

export interface ITurnoLaboral {
    id: number;
    nombre: string;
    hora_inicio: string;
    hora_fin: string;
    cruza_medianoche: boolean;
    dias_semana: string[];
    horas_turno: string | null;
    activo: boolean;
    empresa_nombre: string | null;
    es_global: boolean;
}

export interface ITurnoLaboralWrite {
    nombre: string;
    hora_inicio: string;
    hora_fin: string;
    dias_semana: string[];
    horas_turno?: number;
    empresa_id?: number;
}

export interface ISlotTurno {
    id: number;
    turno: number;
    orden: number;
    turno_nombre: string;
    turno_hora_inicio: string;
    turno_hora_fin: string;
    turno_horas: string | null;
}

export interface ISlotTurnoWrite {
    turno: number;
    orden: number;
}

export interface IGrupoTurno {
    id: number;
    empresa: number;
    nombre: string;
    ciclo: 'semanal' | 'quincenal' | 'mensual';
    activo: boolean;
    horas_promedio: number | null;
    slots: ISlotTurno[];
    fecha_creacion: string;
    fecha_modificacion: string;
}

export interface IGrupoTurnoWrite {
    nombre: string;
    ciclo: 'semanal' | 'quincenal' | 'mensual';
    activo?: boolean;
    slots_write: ISlotTurnoWrite[];
    empresa_id?: number;
}

export interface IGrupoTurnoSnapshot {
    id: number;
    nombre: string;
    ciclo: string;
    slots: Array<{
        orden: number;
        turno_id: number;
        nombre: string;
        hora_inicio: string;
        hora_fin: string;
        horas_turno: number | null;
    }>;
}

export interface IAnexoContrato {
    id: number;
    contrato: number;
    numero_anexo?: number | null;
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
    snapshot_documento?: Record<string, string | null> | null;

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
    tipo_gratificacion: TTipoGratificacion;
    bono_movilizacion: string;
    bono_colacion: string;

    archivo_pdf: string | null;

    estado: TEstadoContrato;
    estado_label?: string;
    fecha_aprobacion: string | null;
    aceptado_por: number | null;

    motivo_termino: TMotivoTerminoContrato | null;
    motivo_termino_label?: string | null;
    fecha_termino_real: string | null;
    observaciones_termino: string | null;

    creado_por: number | null;
    fecha_creacion: string;
    fecha_modificacion: string;

    referencia_interna: string | null;
    observaciones: string | null;
    sueldo_liquido: string | null;
    horario_detalle: string | null;
    grupo_turno: number | null;
    grupo_turno_data?: IGrupoTurno | null;
    grupo_turno_snapshot?: IGrupoTurnoSnapshot | null;
    tiempo_colacion: number | null;
    lugar_celebracion_contrato: string | null;
    fecha_firma: string | null;
    plantilla_contrato: number | null;
    plantilla_contrato_titulo?: string | null;

    // Campos legales Art. 10 CT
    estado_civil: string | null;
    estado_civil_label?: string | null;
    profesion_u_oficio: string | null;
    sistema_salud_otro: string | null;
    trabajador_reemplazado: number | null;
    causal_reemplazo: string | null;
    causal_reemplazo_label?: string | null;

    // Antigüedad y vacaciones calculadas desde UsuarioEmpresa
    antiguedad_trabajador?: {
        dias_totales: number;
        años: number;
        meses: number;
        dias: number;
        formato: string;
        dias_vacaciones_acumulados: number;
        dias_vacaciones_disponibles: number;
    } | null;

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
        afp_id?: number | null;
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

export interface IContratoTrabajadorSnapshotBlock {
    path: string;
    value: string | null;
}

export interface IContratoTrabajadorSnapshotUpdatePayload extends IContratoTrabajadorSnapshotBlock {
    id: number | string;
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

