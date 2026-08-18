ESTADOS_CONTRATO = [
    ('borrador', 'Borrador'),
    ('en_aprobacion_cliente', 'En aprobacion del cliente'),
    ('cambios_solicitados', 'Cambios solicitados'),
    ('aprobado_cliente', 'Aprobado por cliente'),
    ('rechazado_cliente', 'Rechazado por cliente'),
    ('en_firma', 'En firma'),
    ('activo', 'Activo'),
    ('suspendido', 'Suspendido'),
    ('finalizado', 'Finalizado')
]

TIPO_CONTRATO = [
    ('licencia', 'Licenciamiento'),
    ('venta', 'Venta'),
    ('servicios', 'Servicios'),
    ('trabajador', 'Contrato Laboral'),
    ('finiquito', 'Finiquito de contrato'),
]

FRECUENCIA_VISITA = [
    ('mensual', 'Mensual'),
    ('trimestral', 'Trimestral'),
    ('semestral', 'Semestral'),
    ('anual', 'Anual')
]

TIPO_MODALIDAD_LICENCIA = [
    ('anual', 'Anual'),
    ('mensual', 'Mensual'),
    ('perpetua', 'Perpetua'),
    ('p1y-a', 'Compromiso Anual, Pago Unico'),
    ('p1y-m', 'Compromiso Anual, Pago Mensual'),
    ('p1m-m', 'Compromiso Mensual, Pago Mensual'),
    ('otros', 'Otros, señale en observaciones')
]

TIPO_MODALIDAD_BASE_LICENCIA = [
    ('P1M', 'P1M - Mensual'),
    ('P1Y', 'P1Y - Anual'),
    ('PAGO_UNICO', 'Pago unico'),
]

TIPO_MODALIDAD_ANUAL_FORMA_PAGO = [
    ('PAGO_UNICO', 'Pago unico'),
    ('PAGO_MENSUAL', 'Pago mensual'),
]

TIPO_MONEDA_LICENCIA = [
    ('UF', 'Unidad de Fomento'),
    ('USD', 'Dolares Americanos'),
    ('CLP', 'Pesos Chilenos'),
]

FORMAS_PAGO_COMERCIALES = [
    ('mensual', 'Mensual'),
    ('anual', 'Anual'),
    ('pago_unico', 'Pago unico'),
]

FORMAS_PAGO_VENTA = [
    ('contado', 'Contado'),
    ('cuotas', 'Cuotas'),
]

CATEGORIAS_SERVICIO = [
    ('mantencion', 'Mantención Infraestructura'),
    ('desarrollo', 'Desarrollo de Software'),
    ('soporte', 'Soporte Tecnico'),
    ('capacitacion', 'Capacitación'),
    ('datacenter', 'Servicios Datacenter'),
]

TIPOS_USUARIO_CONTRATO = [
    ('jefatura', 'Jefatura'),
    ('gerencia', 'Gerencia'),
    ('finanzas', 'Finanzas'),
    ('general', 'UsuarioGeneral'),
]

ESTADOS_FACTURA_CONTRATO = [
    ('borrador', 'Borrador'),
    ('por_facturar', 'Por facturar'),
    ('facturado', 'Facturado'),
]

ESTADOS_CONTRATO_LICENCIA = [
    ('activa', 'Activa'),
    ('vencida', 'Vencida'),
    ('suspendida', 'Suspendida'),
    ('cancelada', 'Cancelada'),
]

# Transiciones válidas para ContratoLicencia.estado
TRANSICIONES_ESTADO_LICENCIA = {
    'activa': ['suspendida', 'cancelada'],
    'suspendida': ['activa', 'cancelada'],
    'vencida': ['cancelada'],
    'cancelada': [],
}

# ── Contenido canónico para secciones de tipo "condiciones_generales" ──
# Texto base reutilizado en todos los contratos B2B (servicios, licencia, venta).
CONTENIDO_CANONICO_CONDICIONES_GENERALES = (
    "El presente contrato se rige por las leyes de la Republica de Chile. "
    "Cualquier controversia derivada del mismo sera sometida a la jurisdiccion "
    "de los tribunales ordinarios de justicia competentes.\n\n"
    "Las partes declaran conocer y aceptar integra y voluntariamente el "
    "contenido de este instrumento."
)

# ── Bloques comerciales requeridos por tipo de contrato ──
# Define qué dato comercial debe estar presente antes de enviar el contrato a aprobación.
# Clave: atributo/related_name en ContratoEmpresaCliente.
BLOQUES_REQUERIDOS_POR_TIPO = {
    "servicios": ["items_comerciales"],
    "licencia": ["contrato_licencias"],
    "venta": ["cotizaciones_vinculadas"],
    "trabajador": [],
}

# ── Bloques comerciales opcionales por tipo de contrato ──
# Aparecen en el PDF si existen datos, pero no bloquean la transición a aprobación.
BLOQUES_OPCIONALES_POR_TIPO = {
    "servicios": ["condiciones_especiales", "firmas_confidencialidad"],
    "licencia": ["items_comerciales", "condiciones_especiales", "firmas_confidencialidad"],
    "venta": ["condiciones_especiales", "firmas_confidencialidad"],
    "trabajador": [],
}
