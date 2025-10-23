export const ESTADO_REVISION_EQUIPO: {value: string, label: string}[] = [
    {value: "por_revisar", label: "Por Revisar"},
    {value: "revisado", label: "Revisado"},
    {value: "no_equipo", label: "El usuario se encontraba sin el equipo"},
    {value: "no_usuario", label: "El usuario no se encontraba"},
    {value: "no_disponible", label: "El usuario no se encontraba disponible"},
]

export const ESTADO_ENTREGA_EQUIPO: {value: string, label: string}[] = [
    {value: "por_entregar", label: "Por Entregar"},
    {value: "entregado", label: "Entregado"},
    {value: "no_entregado", label: "El equipo no se entrego"},
    {value: "no_usuario", label: "El equipo se entrego, pero el usuario no estaba"},
    {value: "desperfecto", label: "El equipo no se entrego por desperfecto"},
]

export const ESTADO_VISITA_SOPORTE: {value: string, label: string}[] = [
    {value: "pendiente", label: "Pendiente"},
    {value: "completada", label: "Completada"},
    {value: "cerrada", label: "Cerrada"},
]
