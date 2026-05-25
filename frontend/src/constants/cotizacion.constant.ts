export const ESTADO_COTIZACION = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'enviada', label: 'Enviada' },
    { value: 'aceptada', label: 'Aceptada' },
    { value: 'rechazada', label: 'Rechazada' },
    { value: 'expirada', label: 'Expirada' },
];

export const TIPO_MONEDA = [
    { value: '1', label: 'USD' },
    { value: '2', label: 'CLP' },
    { value: '3', label: 'UF' },
];

export const TIPO_SEGUIMIENTO_COTIZACION: {
    value: string;
    label: string;
    icon: string;
    color: string;
}[] = [
    { value: 'comentario', label: 'Comentario', icon: 'HeroDocumentText', color: 'blue' },
    { value: 'incidencia', label: 'Incidencia', icon: 'HeroExclamationTriangle', color: 'red' },
    { value: 'actualizacion', label: 'Actualizacion', icon: 'HeroArrowPath', color: 'amber' },
    { value: 'mensaje_email', label: 'Mensaje Email', icon: 'HeroEnvelope', color: 'violet' },
];
