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
