// Tipos compartidos del wizard de contrato laboral
import {
    TJornadaContrato,
    TMonedaContrato,
    TTipoContrato,
} from '@/interface/rrhh.interface';

export interface IFormValuesContratoTrabajador {
    // Step 1 - Datos basicos
    nombre: string; // referencia interna
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
    horario_detalle: string;
    hora_inicio: string;
    hora_fin: string;
    tiempo_colacion: number | '';
    lugar_trabajo: string;
    lugar_firma: string;
    fecha_firma: string;

    // Step 4 - Remuneraciones
    sueldo_base: number | '';
    sueldo_liquido: number | '';
    moneda: TMonedaContrato;
    gratificacion_legal: boolean;
    bono_movilizacion: number | '';
    bono_colacion: number | '';
    afp: string;
    sistema_salud: '' | 'fonasa' | 'isapre' | 'otro';
    nombre_isapre: string;
    banco: string;
    tipo_cuenta_bancaria: '' | 'corriente' | 'vista' | 'ahorro' | 'rut';
    numero_cuenta_bancaria: string;
}

export const TIPO_CONTRATO_OPTIONS = [
    { value: 'indefinido', label: 'Indefinido' },
    { value: 'plazo_fijo', label: 'Plazo fijo' },
    { value: 'honorarios', label: 'Honorarios' },
    { value: 'reemplazo', label: 'Reemplazo' },
    { value: 'obra_o_faena', label: 'Por obra o faena' },
];

export const JORNADA_OPTIONS = [
    { value: 'completa', label: 'Jornada completa' },
    { value: 'parcial', label: 'Jornada parcial' },
    { value: 'part_time', label: 'Part time' },
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
    { value: '44', label: '44 hrs' },
    { value: '45', label: '45 hrs' },
];

export interface ITurnoRotativo {
    nombre: string;
    dias: string[];
    hora_inicio: string;
    hora_fin: string;
}

export const TURNOS_PREDETERMINADOS: ITurnoRotativo[] = [
    { nombre: 'Manana', dias: ['L', 'M', 'X', 'J', 'V'], hora_inicio: '07:00', hora_fin: '15:00' },
    { nombre: 'Tarde', dias: ['L', 'M', 'X', 'J', 'V'], hora_inicio: '15:00', hora_fin: '23:00' },
    { nombre: 'Noche', dias: ['L', 'M', 'X', 'J', 'V'], hora_inicio: '23:00', hora_fin: '07:00' },
];

export const DIAS_SEMANA = [
    { key: 'L', label: 'Lunes' },
    { key: 'M', label: 'Martes' },
    { key: 'X', label: 'Miercoles' },
    { key: 'J', label: 'Jueves' },
    { key: 'V', label: 'Viernes' },
    { key: 'S', label: 'Sabado' },
    { key: 'D', label: 'Domingo' },
];
