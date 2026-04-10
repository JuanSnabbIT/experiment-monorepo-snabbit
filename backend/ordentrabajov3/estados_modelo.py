# Estados y transiciones para OrdenDeTrabajoV3

ESTADO_BORRADOR = "borrador"
ESTADO_PREPARACION = "preparacion"
ESTADO_EN_EJECUCION = "en_ejecucion"
ESTADO_RETROALIMENTACION = "retroalimentacion"
# Estado intermedio para facturacion (nuevo paso entre retroalimentacion y cierre)
ESTADO_POR_FACTURAR = "por_facturar"
ESTADO_COMPLETADA = "completada"
ESTADO_FACTURADA = "facturada"
ESTADO_CERRADA = "cerrada"
ESTADO_CANCELADA = "cancelada"

ESTADOS_OT_V3 = [
    (ESTADO_BORRADOR, "Borrador"),
    (ESTADO_PREPARACION, "En preparacion"),
    (ESTADO_EN_EJECUCION, "En ejecucion"),
    (ESTADO_RETROALIMENTACION, "Retroalimentacion"),
    (ESTADO_POR_FACTURAR, "Por facturar"),
    # Legacy: se migra a por_facturar, pero se mantiene como choice por compatibilidad.
    (ESTADO_COMPLETADA, "Completada"),
    (ESTADO_FACTURADA, "Facturada"),
    (ESTADO_CERRADA, "Cerrada"),
    (ESTADO_CANCELADA, "Cancelada"),
]

TRANSICIONES_VALIDAS_V3 = {
    ESTADO_BORRADOR: [ESTADO_PREPARACION, ESTADO_CANCELADA],
    ESTADO_PREPARACION: [ESTADO_EN_EJECUCION, ESTADO_CANCELADA],
    ESTADO_EN_EJECUCION: [ESTADO_RETROALIMENTACION, ESTADO_CANCELADA],
    ESTADO_RETROALIMENTACION: [ESTADO_POR_FACTURAR],
    # Legacy: si existiera alguna OT en completada, permitir seguir a facturada.
    ESTADO_COMPLETADA: [ESTADO_FACTURADA],
    ESTADO_POR_FACTURAR: [ESTADO_FACTURADA],
    ESTADO_FACTURADA: [ESTADO_CERRADA],
    ESTADO_CERRADA: [],
    ESTADO_CANCELADA: [],
}

# Estados de tarea
ESTADO_TAREA_PENDIENTE = "pendiente"
ESTADO_TAREA_EN_PROCESO = "en_proceso"
ESTADO_TAREA_COMPLETADA = "completada"
ESTADO_TAREA_NO_REALIZADA = "no_realizada"

ESTADOS_TAREA_V3 = [
    (ESTADO_TAREA_PENDIENTE, "Pendiente"),
    (ESTADO_TAREA_EN_PROCESO, "En proceso"),
    (ESTADO_TAREA_COMPLETADA, "Completada"),
    (ESTADO_TAREA_NO_REALIZADA, "No realizada"),
]

TRANSICIONES_TAREA_V3 = {
    ESTADO_TAREA_PENDIENTE: [ESTADO_TAREA_EN_PROCESO, ESTADO_TAREA_NO_REALIZADA],
    ESTADO_TAREA_EN_PROCESO: [ESTADO_TAREA_COMPLETADA, ESTADO_TAREA_NO_REALIZADA],
    ESTADO_TAREA_COMPLETADA: [],
    ESTADO_TAREA_NO_REALIZADA: [],
}

# Modalidades de trabajo
MODALIDAD_PRESENCIAL = "presencial"
MODALIDAD_REMOTO = "remoto"
MODALIDAD_HIBRIDO = "hibrido"

MODALIDADES_OT_V3 = [
    (MODALIDAD_PRESENCIAL, "Presencial"),
    (MODALIDAD_REMOTO, "Remoto"),
    (MODALIDAD_HIBRIDO, "Hibrido"),
]

# Tipo de servicio
TIPO_SERVICIO_SOPORTE_PRESENCIAL = "soporte_tecnico_presencial"
TIPO_SERVICIO_SOPORTE_REMOTO = "soporte_tecnico_remoto"
TIPO_SERVICIO_SERVICIOS_GENERALES = "servicios_generales"

TIPOS_SERVICIO_OT_V3 = [
    (TIPO_SERVICIO_SOPORTE_PRESENCIAL, "Soporte Técnico Presencial"),
    (TIPO_SERVICIO_SOPORTE_REMOTO, "Soporte Técnico Remoto"),
    (TIPO_SERVICIO_SERVICIOS_GENERALES, "Servicios Generales"),
]

# Mapeo tipo_servicio -> modalidad automatica
TIPO_SERVICIO_A_MODALIDAD = {
    TIPO_SERVICIO_SOPORTE_PRESENCIAL: MODALIDAD_PRESENCIAL,
    TIPO_SERVICIO_SOPORTE_REMOTO: MODALIDAD_REMOTO,
    TIPO_SERVICIO_SERVICIOS_GENERALES: MODALIDAD_PRESENCIAL,
}

# Prioridades
PRIORIDAD_BAJA = "baja"
PRIORIDAD_NORMAL = "normal"
PRIORIDAD_ALTA = "alta"
PRIORIDAD_CRITICA = "critica"

PRIORIDADES_OT_V3 = [
    (PRIORIDAD_BAJA, "Baja"),
    (PRIORIDAD_NORMAL, "Normal"),
    (PRIORIDAD_ALTA, "Alta"),
    (PRIORIDAD_CRITICA, "Critica"),
]

# Roles de tecnico en asignacion
ROL_LIDER = "lider"
ROL_APOYO = "apoyo"
ROL_SUPERVISOR = "supervisor"

ROLES_ASIGNACION = [
    (ROL_LIDER, "Lider"),
    (ROL_APOYO, "Apoyo"),
    (ROL_SUPERVISOR, "Supervisor"),
]

# Tipos de seguimiento
TIPO_SEG_COMENTARIO_TECNICO = "comentario_tecnico"
TIPO_SEG_INCIDENCIA = "incidencia"
TIPO_SEG_COMUNICACION_CLIENTE = "comunicacion_cliente"
TIPO_SEG_ACTUALIZACION = "actualizacion"

TIPOS_SEGUIMIENTO = [
    (TIPO_SEG_COMENTARIO_TECNICO, "Comentario tecnico"),
    (TIPO_SEG_INCIDENCIA, "Incidencia"),
    (TIPO_SEG_COMUNICACION_CLIENTE, "Comunicacion con cliente"),
    (TIPO_SEG_ACTUALIZACION, "Actualizacion"),
]

# Tipos de checklist
TIPO_CHECKLIST_PRE = "pre_trabajo"
TIPO_CHECKLIST_POST = "post_trabajo"

TIPOS_CHECKLIST = [
    (TIPO_CHECKLIST_PRE, "Pre-trabajo"),
    (TIPO_CHECKLIST_POST, "Post-trabajo"),
]

# Tipos de adjunto
TIPO_ADJUNTO_FOTO = "foto"
TIPO_ADJUNTO_DOCUMENTO = "documento"
TIPO_ADJUNTO_REPORTE = "reporte"
TIPO_ADJUNTO_OTRO = "otro"

TIPOS_ADJUNTO = [
    (TIPO_ADJUNTO_FOTO, "Foto"),
    (TIPO_ADJUNTO_DOCUMENTO, "Documento"),
    (TIPO_ADJUNTO_REPORTE, "Reporte"),
    (TIPO_ADJUNTO_OTRO, "Otro"),
]

# Mapper estado OT -> etapa UI que consume el frontend
ETAPA_UI_MAP = {
    ESTADO_BORRADOR: "preparacion",
    ESTADO_PREPARACION: "preparacion",
    ESTADO_EN_EJECUCION: "ejecucion",
    ESTADO_RETROALIMENTACION: "retroalimentacion",
    ESTADO_POR_FACTURAR: "por_facturar",
    ESTADO_COMPLETADA: "por_facturar",
    ESTADO_FACTURADA: "cierre",
    ESTADO_CERRADA: "cerrada",
    ESTADO_CANCELADA: "cancelada",
}
