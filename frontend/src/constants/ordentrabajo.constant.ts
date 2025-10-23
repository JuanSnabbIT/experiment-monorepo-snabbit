export const PRIORIDAD = [
    {value: '1', label:'Alta'},
    {value: '2', label:'Media'},
    {value: '3', label:'Baja'},
]

export const ESTADOS_DETALLE_TRABAJO: {value:string, label:string}[]= [
    {value: 'pendiente', label: 'Pendiente'},
    {value: 'en_proceso', label: 'En Proceso'},
    {value: 'medianamente_completado', label: 'Medianamente Completado'},
    {value: 'completado', label: 'Completado'},
    {value: 'no_realizado', label: 'No Realizado'},
]

export const TIPO_SEGUIMIENTO: {value:string, label:string}[]= [
    { value: 'actualizacion', label: 'Actualización' },
    { value: 'incidencia', label: 'Incidencia' },
    { value: 'comentario', label: 'Comentario' },
];