ESTADOS_OC = (
    ("-", "Borrador"),
    ("0", "Pendiente de aprobación"),
    ("1", "Aprobada"),
    ("2", "Rechazada"),
    ("3", "Enviada al proveedor"),
    # ('5', 'En espera'),
    ("4", "Parcialmente recibida"),
    ("5", "Completada"),
    ("6", "Cancelada"),
    ("7", "Cerrada"),
)

# Estados derivados de la OC Agrupada (calculado en base a sus grupos proveedor)
ESTADOS_OC_AGRUPADA = (
    ("borrador", "Borrador"),
    ("en_proceso", "En proceso"),
    ("parcialmente_completada", "Parcialmente completada"),
    ("completada", "Completada"),
    ("cancelada", "Cancelada"),
)

ESTADO_CR = (
    ("-", "Borrador"),
    ("P", "Pendiente de rendición"),
    ("1", "Completada"),
    ("R", "Rendida"),
    ("C", "Cancelada"),
)

ESTADOS_REBAJE = (
    ("P", "Pendiente"),
    ("ER", "Espera firma tecnico"),
    ("FR", "Firmada por tecnico"),
    ("ET", "En Transito"),
    ("R", "Revertida"),
    ("PR", "Parcialmente Revertida"),
    ("E", "Entregada"),
    ("T", "Terminada"),
)

TIPO_COMPRA = (("nacional", "Nacional"), ("internacional", "Internacional"))

TIPO_ARCHIVO = (("1", "archivo"), ("2", "imagen"))

OPCIONES_ARCHIVO = (
    ("boleta", "Boleta"),
    ("factura", "Factura"),
    ("informacion_adicional", "Información Adicional"),
)

MOVIMIENTOS_TIPO = (
    ("ENTRADA", "Entrada por Compra"),
    ("SALIDA", "Salida por Guía"),
    ("DEVOLUCION", "Devolución"),
    ("AJUSTE", "Ajuste Manual"),
    ("INICIAL", "Stock Inicial"),
    ("AJUSTE_INVENTARIO", "Ajuste de Inventario"),
)

ESTADO_ITEM_INTEVENTARIADO = (
    ("por_inventariar", "Por Inventariar"),
    ("inventariado", "Inventariado"),
    ("inventariado_observaciones", "Inventariado Con Observaciones"),
)

ESTADO_TOMA_INVENTARIO = (
    ("pendiente", "Pendiente"),
    ("pausado", "Pausado"),
    ("en_proceso", "En Proceso"),
    ("terminado", "Terminado"),
    ("cerrado", "Cerrado"),
)

ESTADO_SERIE = (
    ("disponible", "Disponible"),
    ("reservada", "Reservada en Guía"),
    ("despachada", "Despachada"),
    ("devuelta", "Devuelta"),
)
