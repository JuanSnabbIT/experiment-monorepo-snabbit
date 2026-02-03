ESTADOS_COTIZACION = [
    ('pendiente', 'Pendiente'),
    ('enviada', 'Enviada'),
    ('aceptada', 'Aceptada'),
    ('rechazada', 'Rechazada'),
    ('expirada', 'Expirada'),
]

ESTADO_TIPO_CAMBIO = [
    ('pendiente', 'Pendiente'),       # Task encolado, esperando resultado
    ('actualizado', 'Actualizado'),   # Obtenido de API/BD exitosamente
    ('error', 'Error'),               # Falló la obtención (API y fallbacks)
    ('manual', 'Manual'),             # Usuario ingresó manualmente
]

TIPOS_MONEDA = [
    ('1', 'USD'),
    ('2', 'CLP'),
    ('3', 'UF'),
]

TIPO_SEGUIMIENTO_COTIZACION = [
    ('comentario', 'Comentario'),
    ('incidencia', 'Incidencia'),
    ('actualizacion', 'Actualizacion'),
    ('aprobacion', 'Aprobación'),
    ('rechazo', 'Rechazo'),
]
