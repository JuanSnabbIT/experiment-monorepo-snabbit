# estados_modelo.py

# ESTADO_VISITA_SOPORTE = [
#     ("PENDIENTE", "Pendiente"),
#     ("EN_PROCESO", "En proceso"),
#     ("FINALIZADA", "Finalizada"),
#     ("CANCELADA", "Cancelada"),
#     ("REPROGRAMADA", "Reprogramada"),
# ]

# ESTADO_REVISION_EQUIPO = [
#     ("POR_REVISAR", "Por revisar"),
#     ("DIAGNOSTICADA", "Diagnosticada"),
#     ("EN_REPARACION", "En reparación"),
#     ("REPARADA", "Reparada"),
#     ("REEMPLAZO", "Requiere reemplazo"),
#     ("FUNCIONAL", "Funcional"),
#     ("DESCARTADA", "Descartada"),
# ]

ESTADO_REVISION_EQUIPO = [
    ("por_revisar", "Por Revisar"),
    ("revisado", "Revisado"),
    ("no_equipo", "El usuario se encontraba sin el equipo"),
    ("no_usuario", "El usuario no se encontraba"),
    ("no_disponible", "El usuario no se encontraba disponible"),
]

ESTADO_ENTREGA_EQUIPO = [
    ("por_entregar", "Por Entregar"),
    ("entregado", "Entregado"),
    ("no_entregado", "El equipo no se entrego"),
    ("no_usuario", "El equipo se entrego, pero el usuario no estaba"),
    ("desperfecto", "El equipo no se entrego por desperfecto"),
]

ESTADO_VISITA_SOPORTE = [
    ("pendiente", "Pendiente"),
    ("completada", "Completada"),
    ("cerrada", "Cerrada"),
]
