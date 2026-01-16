ESTADOS_ORDEN = [
    ("pendiente", "Pendiente"),
    ("en_proceso", "En Proceso"),
    ("completada", "Completada"),
    ("cerrada", "Validada y Cerrada"),
    ("facturada", "Facturada"),
    ("cancelada", "Cancelada"),
]

SERVICIOS_OT = [
    ("general", "Servicios Generales"),
    ("soporte_r", "Soporte Tecnico Remoto"),
    ("soporte_p", "Soporte Tecnico Presencial"),
]

PRIORIDAD = [
    ("1", "Alta"),
    ("2", "Media"),
    ("3", "Baja"),
]

TIPO_SEGUIMIENTO = [
    ("comentario_tecnico", "Comentario Técnico"),
    ("incidencia", "Incidencia"),
    ("comunicacion_usuario", "Comunicación al Usuario"),
    ("actualizacion", "Actualización"),
]

TIPO_ADJUNTO = [
    ("contrato", "Contrato"),
    ("imagen", "Imagen"),
    ("informe", "Informe"),
]

ESTADOS_DETALLE_TRABAJO = [
    ("pendiente", "Pendiente"),
    ("en_proceso", "En Proceso"),
    ("medianamente_completado", "Medianamente Completado"),
    ("completado", "Completado"),
    ("no_realizado", "No Realizado"),
]

CATEGORIAS_COMPRA_OT = [
    ("hardware", "Hardware"),
    ("software", "Software"),
    ("hospedaje", "Hospedaje"),
    ("alimentacion", "Alimentación"),
    ("transporte", "Transporte"),
    ("otros", "Otros"),
]

# Estados del cierre administrativo y facturación de una OT
ESTADOS_CIERRE_OT = [
    ("borrador", "Borrador"),
    ("en_revision", "En Revisión"),
    ("aprobado", "Aprobado"),
    ("facturado", "Facturado"),
    ("pagado", "Pagado"),
    ("anulado", "Anulado"),
]
