"""Choices y maquinas de estado del modulo RRHH."""

TIPO_CONTRATO = (
    ("indefinido", "Indefinido"),
    ("plazo_fijo", "Plazo fijo"),
    ("honorarios", "Honorarios"),
    ("reemplazo", "Reemplazo"),
    ("obra_o_faena", "Por obra o faena"),
)

JORNADA_CONTRATO = (
    ("completa", "Jornada completa"),
    ("parcial", "Jornada parcial"),
    ("part_time", "Part time"),
    ("turnos", "Turnos"),
)

ESTADO_CONTRATO = (
    ("borrador", "Borrador"),
    ("pendiente_aprobacion", "Pendiente aprobacion"),
    ("vigente", "Vigente"),
    ("terminado", "Terminado"),
    ("anulado", "Anulado"),
)

# Maquina de transiciones permitidas para ContratoTrabajador
TRANSICIONES_CONTRATO = {
    "borrador": ["pendiente_aprobacion", "vigente", "anulado"],
    "pendiente_aprobacion": ["vigente", "anulado", "borrador"],
    "vigente": ["terminado", "anulado"],
    "terminado": [],
    "anulado": [],
}

MONEDA_CONTRATO = (
    ("CLP", "Peso chileno"),
    ("UF", "UF"),
    ("USD", "Dolar"),
)

MOTIVO_TERMINO_CONTRATO = (
    ("renuncia", "Renuncia voluntaria"),
    ("mutuo_acuerdo", "Mutuo acuerdo"),
    ("vencimiento_plazo", "Vencimiento del plazo"),
    ("necesidades_empresa", "Necesidades de la empresa"),
    ("otro", "Otro"),
)

TIPO_ANEXO = (
    ("modificacion_sueldo", "Modificacion de sueldo"),
    ("modificacion_cargo", "Modificacion de cargo"),
    ("modificacion_jornada", "Modificacion de jornada"),
    ("prorroga", "Prorroga / extension"),
    ("otro", "Otro"),
)
