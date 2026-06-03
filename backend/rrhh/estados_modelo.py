"""Choices y maquinas de estado del modulo RRHH."""

TIPO_CONTRATO = (
    ("indefinido", "Indefinido"),
    ("plazo_fijo", "Plazo fijo"),
    ("reemplazo", "Reemplazo"),
)

JORNADA_CONTRATO = (
    ("completa", "Jornada completa"),
    ("parcial", "Jornada parcial"),
    ("turnos", "Turnos"),
)

ESTADO_CONTRATO = (
    ("borrador", "Borrador"),
    ("pendiente_aprobacion", "Pendiente aprobacion"),
    ("vigente", "Vigente"),
    ("terminado", "Terminado"),
    ("anulado", "Anulado"),
    ("descartado", "Descartado"),
)

# Maquina de transiciones permitidas para ContratoTrabajador
# descartado: rechazo administrativo pre-vigente (sin efecto legal)
# anulado: solo desde vigente, requiere motivo_anulacion
TRANSICIONES_CONTRATO = {
    "borrador": ["pendiente_aprobacion", "vigente", "descartado"],
    "pendiente_aprobacion": ["vigente", "descartado", "borrador"],
    "vigente": ["terminado", "anulado"],
    "terminado": [],
    "anulado": [],
    "descartado": [],
}

MONEDA_CONTRATO = (
    ("CLP", "Peso chileno"),
    ("UF", "UF"),
    ("USD", "Dolar"),
)

TIPO_GRATIFICACION = (
    ("art_47", "Gratificacion anual (Art. 47 CT)"),
    ("art_50_mensual", "Gratificacion mensual garantizada (Art. 50 CT)"),
    ("no_aplica", "No aplica"),
)

MOTIVO_TERMINO_CONTRATO = (
    ("renuncia", "Renuncia voluntaria"),
    ("mutuo_acuerdo", "Mutuo acuerdo"),
    ("vencimiento_plazo", "Vencimiento del plazo"),
    ("necesidades_empresa", "Necesidades de la empresa"),
    ("incumplimiento_grave", "Incumplimiento grave de obligaciones"),
    ("falta_probidad", "Falta de probidad"),
    ("inasistencias_injustificadas", "Inasistencias injustificadas"),
    ("abandono_trabajo", "Abandono del trabajo"),
    ("caso_fortuito_fuerza_mayor", "Caso fortuito o fuerza mayor"),
    ("otro", "Otro"),
)

ESTADO_CIVIL = (
    ("soltero_a", "Soltero/a"),
    ("casado_a", "Casado/a"),
    ("conviviente_civil", "Conviviente civil"),
    ("divorciado_a", "Divorciado/a"),
    ("viudo_a", "Viudo/a"),
)

CAUSAL_REEMPLAZO = (
    ("licencia_medica", "Licencia medica"),
    ("vacaciones", "Vacaciones"),
    ("prenatal_postnatal", "Pre/postnatal"),
    ("permiso_sin_goce", "Permiso sin goce de sueldo"),
    ("otro", "Otro"),
)

TIPO_ANEXO = (
    ("modificacion_sueldo", "Modificacion de sueldo"),
    ("modificacion_cargo", "Modificacion de cargo"),
    ("modificacion_jornada", "Modificacion de jornada"),
    ("prorroga", "Prorroga / extension"),
    ("otro", "Otro"),
)
