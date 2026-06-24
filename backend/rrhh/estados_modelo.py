"""Choices y maquinas de estado del modulo RRHH."""

TIPO_SUELDO = (
    ("base",    "Sueldo base (bruto)"),
    ("liquido", "Sueldo líquido (neto)"),
)

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
    ("vencido", "Vencido"),
    ("terminado", "Terminado"),
    ("anulado", "Anulado"),
    ("descartado", "Descartado"),
)

# Maquina de transiciones permitidas para ContratoTrabajador
# descartado: rechazo administrativo pre-vigente (sin efecto legal)
# anulado: solo desde vigente, requiere motivo_anulacion
# vencido: transicion automatica para plazo_fijo cuando fecha_termino < hoy
TRANSICIONES_CONTRATO = {
    "borrador": ["pendiente_aprobacion", "vigente", "descartado"],
    "pendiente_aprobacion": ["vigente", "descartado", "borrador"],
    "vigente": ["terminado", "anulado", "vencido"],
    "vencido": ["terminado"],
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
    # Art. 159 — Sin indemnización
    ("renuncia",                  "Renuncia voluntaria (Art. 159 N°2)"),
    ("mutuo_acuerdo",             "Mutuo acuerdo (Art. 159 N°1)"),
    ("vencimiento_plazo",         "Vencimiento del plazo (Art. 159 N°4)"),
    ("conclusion_obra_faena",     "Conclusión de obra o faena (Art. 159 N°5)"),
    ("caso_fortuito_fuerza_mayor","Caso fortuito o fuerza mayor (Art. 159 N°6)"),
    # Art. 160 — Sin indemnización (causa imputable al trabajador)
    ("incumplimiento_grave",      "Incumplimiento grave de obligaciones (Art. 160)"),
    ("falta_probidad",            "Falta de probidad (Art. 160 N°1)"),
    ("inasistencias_injustificadas","Inasistencias injustificadas (Art. 160 N°3)"),
    ("abandono_trabajo",          "Abandono del trabajo (Art. 160 N°4)"),
    # Art. 161 — CON indemnización
    ("necesidades_empresa",       "Necesidades de la empresa (Art. 161)"),
    ("desahucio_empleador",       "Desahucio del empleador (Art. 161 inc. 2)"),
    # Despido injustificado
    ("despido_injustificado",     "Despido injustificado"),
    ("otro",                      "Otro"),
)

# ── Clasificación de causales para lógica de finiquito ──────────────────────

# Causales SIN derecho a indemnización por años de servicio
CAUSALES_SIN_INDEMNIZACION = frozenset({
    "renuncia",
    "mutuo_acuerdo",
    "vencimiento_plazo",
    "conclusion_obra_faena",
    "caso_fortuito_fuerza_mayor",
    "incumplimiento_grave",
    "falta_probidad",
    "inasistencias_injustificadas",
    "abandono_trabajo",
    "otro",
})

# Causales CON derecho a indemnización por años de servicio (Art. 163 CT)
CAUSALES_CON_INDEMNIZACION = frozenset({
    "necesidades_empresa",     # Art. 161
    "desahucio_empleador",     # Art. 161 inc. 2
    "despido_injustificado",   # + recargo
})

# Causales que generan derecho a aviso previo de 30 días (Art. 162 CT)
# Si el empleador no avisa, debe pagar indemnización sustitutiva
CAUSALES_CON_AVISO_PREVIO = frozenset({
    "necesidades_empresa",
    "desahucio_empleador",
})

# Causales con recargo sobre indemnización por despido injustificado
CAUSALES_CON_RECARGO = frozenset({
    "despido_injustificado",
})

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

ESTADO_FINIQUITO = (
    ("borrador",   "Borrador"),
    ("calculado",  "Calculado"),
    ("firmado",    "Firmado"),
    ("pagado",     "Pagado"),
)

TIPO_ANEXO = (
    ("prorroga",               "Prórroga / extensión"),
    ("cambio_tipo_contrato",   "Conversión a indefinido"),
    ("modificacion_sueldo",    "Modificación de sueldo"),
    ("modificacion_cargo",     "Modificación de cargo"),
    ("modificacion_funciones", "Modificación de funciones"),
    ("modificacion_jornada",   "Modificación de jornada"),
    ("cambio_lugar_trabajo",   "Cambio de lugar de trabajo"),
    ("modificacion_general",   "Modificación general"),
    ("otro",                   "Otro"),
)
