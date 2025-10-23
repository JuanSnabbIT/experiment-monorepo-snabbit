from django.contrib.contenttypes.models import ContentType
from bodegas.models import MovimientoStock


def registrar_movimiento_stock(
    stock_item,
    cantidad_delta,
    tipo_movimiento,
    usuario=None,
    origen_instancia=None,
    descripcion=""
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

    # Actualizar cantidad de stock
    # stock_item.cantidad += cantidad_delta
    # if usuario:
    #     stock_item._history_user = usuario
    # stock_item.save(update_fields=["cantidad"])

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
        object_id=object_id
    )

def registrar_entrada(stock_item, cantidad, usuario, origen, descripcion="Entrada por compra"):
    registrar_movimiento_stock(
        stock_item=stock_item,
        cantidad_delta=cantidad,
        tipo_movimiento="ENTRADA",
        usuario=usuario,
        origen_instancia=origen,
        descripcion=descripcion
    )

def registrar_salida(stock_item, cantidad, usuario, origen, descripcion="Salida por guía"):
    registrar_movimiento_stock(
        stock_item=stock_item,
        cantidad_delta=cantidad,
        tipo_movimiento="SALIDA",
        usuario=usuario,
        origen_instancia=origen,
        descripcion=descripcion
    )

def registrar_devolucion(stock_item, cantidad, usuario, origen, descripcion="Devolución de guía"):
    registrar_movimiento_stock(
        stock_item=stock_item,
        cantidad_delta=cantidad,
        tipo_movimiento="DEVOLUCION",
        usuario=usuario,
        origen_instancia=origen,
        descripcion=descripcion
    )

def registrar_ajuste_inventario(stock_item, cantidad, usuario, origen, descripcion="Ajuste por toma de inventario"):
    registrar_movimiento_stock(
        stock_item=stock_item,
        cantidad_delta=cantidad,
        tipo_movimiento="AJUsTE_INVENTARIO",
        usuario=usuario,
        origen_instancia=origen,
        descripcion=descripcion
    )

def registrar_ajuste_manual(stock_item, cantidad_delta, usuario, descripcion="Ajuste manual"):
    registrar_movimiento_stock(
        stock_item=stock_item,
        cantidad_delta=cantidad_delta,
        tipo_movimiento="AJUSTE",
        usuario=usuario,
        origen_instancia=None,
        descripcion=descripcion
    )
