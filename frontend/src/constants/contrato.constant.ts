
export const ESTADOS_CONTRATO = [
    { value: 'borrador', label: 'Borrador' },
    { value: 'activo', label: 'Activo' },
    { value: 'suspendido', label: 'Suspendido' },
    { value: 'finalizado', label: 'Finalizado' },
];

export const TIPO_CONTRATO = [
    { value: 'licencia', label: 'Licenciamiento' },
    { value: 'venta', label: 'Venta' },
    { value: 'servicios', label: 'Servicios' },
    { value: 'trabajador', label: 'Contrato Laboral' },
];

export const FRECUENCIA_VISITA = [
    { value: 'mensual', label: 'Mensual' },
    { value: 'trimestral', label: 'Trimestral' },
    { value: 'semestral', label: 'Semestral' },
    { value: 'anual', label: 'Anual' },
];

export const TIPOS_USUARIO_CONTRATO = [
    { value: 'jefatura', label: 'Jefatura' },
    { value: 'gerencia', label: 'Gerencia' },
    { value: 'finanzas', label: 'Finanzas' },
    { value: 'general', label: 'UsuarioGeneral' },
];

export const TIPO_MODALIDAD_LICENCIA = [
    { value: 'anual', label: 'Anual' },
    { value: 'mensual', label: 'Mensual' },
    { value: 'perpetua', label: 'Perpetua' },
    { value: 'p1y-a', label: 'Compromiso Anual, Pago Unico' },
    { value: 'p1y-m', label: 'Compromiso Anual, Pago Mensual' },
    { value: 'p1m-m', label: 'Compromiso Mensual, Pago Mensual' },
    { value: 'otros', label: 'Otros, señale en observaciones' },
];


export const TIPO_MODALIDAD_BASE_LICENCIA = [
    { value: 'P1M', label: 'P1M - Mensual' },
    { value: 'P1Y', label: 'P1Y - Anual' },
    { value: 'PAGO_UNICO', label: 'Pago unico' },
] as const;

export const TIPO_MODALIDAD_ANUAL_FORMA_PAGO = [
    { value: 'PAGO_UNICO', label: 'Pago unico' },
    { value: 'PAGO_MENSUAL', label: 'Pago mensual' },
] as const;

export const CATEGORIAS_SERVICIO = [
    { value: 'mantencion', label: 'Mantención Infraestructura' },
    { value: 'desarrollo', label: 'Desarrollo de Software' },
    { value: 'soporte', label: 'Soporte Tecnico' },
    { value: 'capacitacion', label: 'Capacitación' },
    { value: 'datacenter', label: 'Servicios Datacenter' },
];

export const TIPO_MONEDA_LICENCIA = [
    { value: 'USD', label: 'USD' },
    { value: 'CLP', label: 'CLP' },
    { value: 'UF', label: 'UF' },
];

export const FORMAS_PAGO_COMERCIALES = [
    { value: 'mensual', label: 'Mensual' },
    { value: 'anual', label: 'Anual' },
    { value: 'pago_unico', label: 'Pago único' },
];

export const TIPOS_SECCION = [
    { value: 'clausula', label: 'Sección con título y texto' },
    { value: 'titulo', label: 'Título' },
    { value: 'libre', label: 'Bloque de texto' },
    { value: 'salto_pagina', label: 'Salto de página' },
    { value: 'firmas', label: 'Firma' },
];

// Labels para tipos legacy ya existentes en BD (no disponibles en creación)
export const TIPOS_SECCION_LABELS_LEGACY: Record<string, string> = {
    encabezado: 'Encabezado',
    clausula: 'Sección con título y texto',
    condiciones_generales: 'Condiciones Generales',
    identificacion_cliente: 'Identificación del Cliente',
    firmas: 'Firma',
    libre: 'Bloque de texto',
    titulo: 'Título',
    subtitulo: 'Subtítulo',
    salto_pagina: 'Salto de página',
};

export const SLOT_DOCUMENTAL = [
    { value: 'antes_alcance', label: 'Antes de alcance' },
    { value: 'entre_alcance_y_operacion', label: 'Entre alcance y operación' },
    { value: 'entre_operacion_y_condiciones', label: 'Entre operación y condiciones' },
    { value: 'despues_condiciones', label: 'Después de condiciones' },
] as const;

export const CATEGORIAS_ETIQUETA = [
    { value: 'cliente', label: 'Datos del Cliente' },
    { value: 'proveedor', label: 'Datos del Proveedor' },
    { value: 'contrato', label: 'Datos del Contrato' },
    { value: 'servicio', label: 'Datos del Servicio' },
    { value: 'economico', label: 'Datos Económicos' },
    { value: 'custom', label: 'Personalizada' },
];

export const ESTADOS_LICENCIA = [
    { value: 'activa',     label: 'Activa',     color: 'emerald' as const },
    { value: 'vencida',    label: 'Vencida',    color: 'red'     as const },
    { value: 'suspendida', label: 'Suspendida', color: 'amber'   as const },
    { value: 'cancelada',  label: 'Cancelada',  color: 'zinc'    as const },
];

// ─── Colores por categoría de etiqueta ───
import { TColors } from '@/types/colors.type';

export const COLORES_CATEGORIA: Record<string, TColors> = {
    cliente: 'blue',
    proveedor: 'violet',
    contrato: 'emerald',
    servicio: 'amber',
    economico: 'red',
    custom: 'zinc',
};

/** Espejo del backend contratos/estados_modelo.py → TRANSICIONES_ESTADO_LICENCIA */
export const TRANSICIONES_ESTADO_LICENCIA: Record<string, string[]> = {
    activa:     ['suspendida', 'cancelada'],
    suspendida: ['activa', 'cancelada'],
    vencida:    ['cancelada'],
    cancelada:  [],
};

// ─── Etiquetas calculadas por motor_plantillas.py (no vienen de BD) ───
// Estas etiquetas se resuelven en runtime al generar secciones desde la plantilla.
export const ETIQUETAS_CALCULADAS: { clave: string; nombre: string; descripcion: string }[] = [
    { clave: 'cotizaciones_tabla',              nombre: 'Tabla de cotizaciones',       descripcion: 'Tabla HTML con los ítems de las cotizaciones vinculadas' },
    { clave: 'cantidad_cotizaciones',           nombre: 'N° de cotizaciones',          descripcion: 'Cantidad de cotizaciones vinculadas al contrato' },
    { clave: 'total_cotizaciones',              nombre: 'Total cotizaciones',           descripcion: 'Suma total de todas las cotizaciones en la moneda del contrato' },
    { clave: 'forma_pago_venta',                nombre: 'Forma de pago (venta)',        descripcion: 'Forma de pago definida en la OT de venta vinculada' },
    { clave: 'cantidad_cuotas_venta',           nombre: 'N° de cuotas',                descripcion: 'Número de cuotas del plan de pago de la venta' },
    { clave: 'cuotas_venta_tabla',              nombre: 'Tabla de cuotas',             descripcion: 'Tabla HTML con el detalle de cada cuota del plan de pago' },
    { clave: 'cotizaciones_totales_convertidos',nombre: 'Total convertido (USD/UF)',   descripcion: 'Total de cotizaciones convertido a USD u otra moneda base' },
    { clave: 'dolar_observado_cotizaciones',    nombre: 'Dólar observado',             descripcion: 'Tipo de cambio USD utilizado para la conversión de montos' },
];

// Contenido canónico para secciones tipo "firmas" (espejo del backend)
export const CONTENIDO_CANONICO_FIRMAS =
    '[Zona de firmas del contrato]\n\n' +
    'Representante Empresa Prestadora: [nombre_empresa_prestadora]\n' +
    'Representante Cliente: [nombre_cliente]';

// Contenido canónico para secciones tipo "identificacion_cliente"
export const CONTENIDO_CANONICO_IDENTIFICACION =
    '1.- Identificación de "EL CLIENTE"\n\n' +
    'Nombre o Razón Social: [nombre_cliente]\n' +
    'R.U.T: [rut_cliente]\n' +
    'Domicilio: [domicilio_cliente]\n' +
    'Giro o actividad: [giro_cliente]\n' +
    'Representante legal: [representante_cliente]\n' +
    'R.U.T del representante: [rut_representante_cliente]\n' +
    'E-mail: [email_cliente]';
