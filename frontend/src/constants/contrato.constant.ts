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

export const CATEGORIAS_SERVICIO = [
    { value: 'mantencion', label: 'Mantención Infraestructura' },
    { value: 'desarrollo', label: 'Desarrollo de Software' },
    { value: 'soporte', label: 'Soporte Tecnico' },
    { value: 'capacitacion', label: 'Capacitación' },
    { value: 'datacenter', label: 'Servicios Datacenter' },
];

export const TIPO_MONEDA_LICENCIA = [
    { value: 'USD', label: 'Dolares Americanos' },
    { value: 'CLP', label: 'Pesos Chilenos' },
];
