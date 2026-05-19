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
    estado_inicial: 'borrador' | 'pendiente_aceptacion';

    // Step 2 - Trabajador
    trab_modo: 'existente' | 'nuevo';
    trab_usuario_empresa_id: number | '';
    trab_first_name: string;
    trab_last_name: string;
    trab_email: string;
    trab_rut: string;
    trab_sucursal_id: number | '';
    trab_enviar_invitacion: boolean;
    // Datos personales (User) - opcionales
    trab_nacionalidad: string;
    trab_fecha_nacimiento: string;
    trab_direccion: string;

    // Step 3 - Terminos laborales
    tipo_contrato: TTipoContrato | '';
    fecha_inicio: string;
    fecha_termino: string;
    cargo: string;
    funciones: string;
    jornada: TJornadaContrato | '';
    horas_semanales: number | '';
    horario_detalle: string;
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
