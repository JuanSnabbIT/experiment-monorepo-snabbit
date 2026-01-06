export const PRIORIDAD = [
	{ value: '1', label: 'Alta' },
	{ value: '2', label: 'Media' },
	{ value: '3', label: 'Baja' },
];

export const TIPO_SERVICIO = [
	{ value: 'general', label: 'Servicios Generales' },
	{ value: 'soporte_r', label: 'Soporte Técnico Remoto' },
	{ value: 'soporte_p', label: 'Soporte Técnico Presencial' },
];

export const ESTADOS_DETALLE_TRABAJO: { value: string; label: string }[] = [
	{ value: 'pendiente', label: 'Pendiente' },
	{ value: 'en_proceso', label: 'En Proceso' },
	{ value: 'medianamente_completado', label: 'Medianamente Completado' },
	{ value: 'completado', label: 'Completado' },
	{ value: 'no_realizado', label: 'No Realizado' },
];

export const TIPO_SEGUIMIENTO: { value: string; label: string; icon: string; color: string }[] = [
	{ value: 'comentario_tecnico', label: 'Comentario Técnico', icon: 'HeroWrenchScrewdriver', color: 'blue' },
	{ value: 'incidencia', label: 'Incidencia', icon: 'HeroExclamationTriangle', color: 'red' },
	{ value: 'comunicacion_usuario', label: 'Comunicación al Usuario', icon: 'HeroChatBubbleLeftRight', color: 'emerald' },
];
