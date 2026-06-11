// Tipos compartidos del wizard de contrato laboral
import {
    TJornadaContrato,
    TMonedaContrato,
    TTipoContrato,
} from '@/interface/rrhh.interface';

export interface IFormValuesContratoTrabajador {
    // Step 1 - Datos basicos
    referencia_interna: string;
    observaciones: string;

    // Step 2 - Trabajador
    trab_modo: 'existente' | 'nuevo';
    trab_empresa_cliente_id: number | '';
    trab_usuario_empresa_id: number | '';
    trab_first_name: string;
    trab_last_name: string;
    trab_email: string;
    trab_rut: string;
    trab_sucursal_id: number | '';
    trab_enviar_invitacion: boolean;
    enviar_al_empleador: boolean;
    // Datos personales (User) - opcionales
    trab_nacionalidad: string;
    trab_fecha_nacimiento: string;
    trab_direccion: string;
    // Datos legales Art. 10 CT (solo modo nuevo)
    trab_estado_civil: string;
    trab_profesion_u_oficio: string;

    // Step 3 - Terminos laborales
    tipo_contrato: TTipoContrato | '';
    fecha_inicio: string;
    fecha_termino: string;
    cantidad_meses: number | string | '';
    cargo: string;
    funciones: string;
    jornada: TJornadaContrato | '';
    horas_semanales: number | '';
    dias_semana: string[];
    turnos_rotativo: ITurnoRotativo[];
    grupo_turno_id: number | null;
    horario_detalle: string;
    hora_inicio: string;
    hora_fin: string;
    tiempo_colacion: number | '';
    lugar_trabajo: string;
    lugar_celebracion_contrato: string;
    fecha_firma: string;
    // Campos reemplazo (condicional cuando tipo_contrato = 'reemplazo')
    trab_trabajador_reemplazado_id: number | '';
    causal_reemplazo: string;

    // Step 4 - Remuneraciones
    sueldo_base: number | '';
    sueldo_liquido: number | '';
    moneda: TMonedaContrato;
    tipo_gratificacion: 'art_47' | 'art_50_mensual' | 'no_aplica' | '';
    gratificacion_activa: boolean;
    descuentos_activos: boolean;
    porcentaje_descuentos: string;
    bono_movilizacion: number | '';
    bono_movilizacion_activo: boolean;
    bono_colacion: number | '';
    bono_colacion_activo: boolean;
    afp: number | null;
    sistema_salud: '' | 'fonasa' | 'isapre' | 'otro';
    nombre_isapre: string;
    sistema_salud_otro: string;
    banco: string;
    tipo_cuenta_bancaria: '' | 'corriente' | 'vista' | 'ahorro' | 'rut';
    numero_cuenta_bancaria: string;

    // Step 5 - Documento
    plantilla_contrato_id: number | '';
    archivo_pdf: File | null;
}

export const TIPO_CONTRATO_OPTIONS = [
    { value: 'indefinido', label: 'Indefinido' },
    { value: 'plazo_fijo', label: 'Plazo fijo' },
    { value: 'reemplazo', label: 'Reemplazo' },
];

export const JORNADA_OPTIONS = [
    { value: 'completa', label: 'Jornada completa' },
    { value: 'parcial', label: 'Jornada parcial' },
    { value: 'turnos', label: 'Turnos' },
];

export const MONEDA_LABORAL_OPTIONS = [
    { value: 'CLP', label: 'CLP' },
    { value: 'UF', label: 'UF' },
    { value: 'USD', label: 'USD' },
];

export const SISTEMA_SALUD_OPTIONS = [
    { value: 'fonasa', label: 'Fonasa' },
    { value: 'isapre', label: 'Isapre' },
    { value: 'otro', label: 'Otro' },
];

export const TIPO_GRATIFICACION_OPTIONS = [
    { value: 'art_47', label: 'Gratificacion anual (Art. 47 CT)' },
    { value: 'art_50_mensual', label: 'Gratificacion mensual garantizada (Art. 50 CT)' },
    { value: 'no_aplica', label: 'No aplica' },
];

export const TIPO_CUENTA_OPTIONS = [
    { value: 'corriente', label: 'Cuenta corriente' },
    { value: 'vista', label: 'Cuenta vista' },
    { value: 'ahorro', label: 'Cuenta de ahorro' },
    { value: 'rut', label: 'Cuenta RUT' },
];

export const MESES_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
    value: String(i + 1),
    label: i === 0 ? '1 mes' : `${i + 1} meses`,
}));

export const HORAS_SEMANALES_OPTIONS = [
    { value: '20', label: '20 hrs' },
    { value: '25', label: '25 hrs' },
    { value: '30', label: '30 hrs' },
    { value: '36', label: '36 hrs' },
    { value: '40', label: '40 hrs' },
    { value: '42', label: '42 hrs' },
];

export interface ITurnoRotativo {
    nombre: string;
    dias: string[];
    hora_inicio: string;
    hora_fin: string;
}


export const DIAS_SEMANA = [
    { key: 'L', label: 'Lunes' },
    { key: 'M', label: 'Martes' },
    { key: 'X', label: 'Miercoles' },
    { key: 'J', label: 'Jueves' },
    { key: 'V', label: 'Viernes' },
    { key: 'S', label: 'Sabado' },
    { key: 'D', label: 'Domingo' },
];
