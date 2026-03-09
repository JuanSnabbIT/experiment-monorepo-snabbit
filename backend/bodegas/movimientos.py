from bodegas.models import MovimientoStock
from django.contrib.contenttypes.models import ContentType
from django.db.models import F


def registrar_movimiento_stock(
    stock_item,
    cantidad_delta,
    tipo_movimiento,
    usuario=None,
    origen_instancia=None,
    descripcion="",
):
    """
    Registra un movimiento de stock, actualizando la cantidad en el stock_item.

    Args:
        stock_item (StockItemEnBodega): el ítem afectado
        cantidad_delta (int): valor a sumar o restar del stock
        tipo_movimiento (str): "ENTRADA", "SALIDA", "DEVOLUCION", "AJUSTE"
        usuario (UsuarioEmpresa): usuario que realiza el movimiento
        origen_instancia (Modelo permitido): ItemOrdenCompraEnStock o ItemsGuiaSalida
        descripcion (str): texto descriptivo
    """

    # BUG FIX: Usar actualización atómica con F() para evitar race conditions
    # y valores obsoletos en memoria
    from bodegas.models import StockItemEnBodega

    StockItemEnBodega.objects.filter(pk=stock_item.pk).update(
        cantidad=F("cantidad") + cantidad_delta
    )

    # Refrescar el objeto para tener el valor actualizado
    stock_item.refresh_from_db()

    # Obtener content_type y object_id
    content_type = None
    object_id = None

    if origen_instancia:
        content_type = ContentType.objects.get_for_model(origen_instancia)
        object_id = origen_instancia.pk

    # Crear movimiento
    MovimientoStock.objects.create(
        stock_item=stock_item,
        tipo_movimiento=tipo_movimiento,
        cantidad=cantidad_delta,
        descripcion=descripcion,
        usuario=usuario,
        content_type=content_type,
        object_id=object_id,
    )


def registrar_entrada(
    stock_item, cantidad, usuario, origen, descripcion="Entrada por compra"
):
    """
    Registra una entrada de stock. IMPORTANTE: 'cantidad' debe ser el DELTA a sumar,
    no el saldo actual del stock_item.

    Args:
        stock_item (StockItemEnBodega): Ítem a actualizar
        cantidad (int): Cantidad a sumar al stock (DELTA, no saldo)
        usuario (UsuarioEmpresa): Usuario que realiza el movimiento
        origen: Instancia que genera el movimiento (ej: ItemEnCompra)
        descripcion (str): Descripción del movimiento

    Raises:
        ValueError: Si cantidad es negativa o no es entero
    """
    if not isinstance(cantidad, int) or cantidad < 0:
        raise ValueError(
            f"registrar_entrada: cantidad debe ser entero positivo, recibió {cantidad}"
        )

    registrar_movimiento_stock(
        stock_item=stock_item,
        cantidad_delta=cantidad,  # Positivo: suma al stock
        tipo_movimiento="ENTRADA",
        usuario=usuario,
        origen_instancia=origen,
        descripcion=descripcion,
    )


def registrar_salida(
    stock_item, cantidad, usuario, origen, descripcion="Salida por guía"
):
    """
    Registra una salida de stock. IMPORTANTE: 'cantidad' debe ser el DELTA a restar,
    no el saldo actual del stock_item.

    Args:
        stock_item (StockItemEnBodega): Ítem a actualizar
        cantidad (int): Cantidad a restar del stock (DELTA, no saldo)
        usuario (UsuarioEmpresa): Usuario que realiza el movimiento
        origen: Instancia que genera el movimiento (ej: ItemsGuiaSalida)
        descripcion (str): Descripción del movimiento

    Raises:
        ValueError: Si cantidad es negativa o no es entero
    """
    if not isinstance(cantidad, int) or cantidad < 0:
        raise ValueError(
            f"registrar_salida: cantidad debe ser entero positivo, recibió {cantidad}"
        )

    registrar_movimiento_stock(
        stock_item=stock_item,
        cantidad_delta=-cantidad,  # Negativo: resta del stock
        tipo_movimiento="SALIDA",
        usuario=usuario,
        origen_instancia=origen,
        descripcion=descripcion,
    )


def registrar_devolucion(
    stock_item, cantidad, usuario, origen, descripcion="Devolución de guía"
):
    """
    Registra una devolución de stock. IMPORTANTE: 'cantidad' debe ser el DELTA a sumar,
    no el saldo actual del stock_item.

    Args:
        stock_item (StockItemEnBodega): Ítem a actualizar
        cantidad (int): Cantidad a sumar al stock (DELTA, no saldo)
        usuario (UsuarioEmpresa): Usuario que realiza el movimiento
        origen: Instancia que genera el movimiento (ej: ItemsGuiaSalida)
        descripcion (str): Descripción del movimiento

    Raises:
        ValueError: Si cantidad es negativa o no es entero
    """
    if not isinstance(cantidad, int) or cantidad < 0:
        raise ValueError(
            f"registrar_devolucion: cantidad debe ser entero positivo, recibió {cantidad}"
        )

    registrar_movimiento_stock(
        stock_item=stock_item,
        cantidad_delta=cantidad,  # Positivo: suma al stock
        tipo_movimiento="DEVOLUCION",
        usuario=usuario,
        origen_instancia=origen,
        descripcion=descripcion,
    )


def registrar_ajuste_inventario(
    stock_item, cantidad, usuario, origen, descripcion="Ajuste por toma de inventario"
):
    registrar_movimiento_stock(
        stock_item=stock_item,
        cantidad_delta=cantidad,
        tipo_movimiento="AJUSTE_INVENTARIO",
        usuario=usuario,
        origen_instancia=origen,
        descripcion=descripcion,
    )


def registrar_ajuste_manual(
    stock_item, cantidad_delta, usuario, descripcion="Ajuste manual"
):
    registrar_movimiento_stock(
        stock_item=stock_item,
        cantidad_delta=cantidad_delta,
        tipo_movimiento="AJUSTE",
        usuario=usuario,
        origen_instancia=None,
        descripcion=descripcion,
    )
