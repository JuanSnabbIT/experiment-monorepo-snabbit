from decimal import Decimal

from rest_framework import serializers
from bodegas.estados_modelo import MOVIMIENTOS_TIPO
from items.models import ItemEmpresa
from items.serializers import CategoriaSerializer, FabricanteSerializer
from .models import (
    ArchivoCompra, Bodega, Compra, EstadoTomaInventario,
    ImagenDeItemEnTomaInventario, ItemEnCompra, ItemEnTomaInventario,
    ItemsGuiaSalida, GuiaSalida, MovimientoStock, TomaInventario,
    OrdenCompra, OrdenCompraAgrupada, ItemEnOrdenCompra, StockItemEnBodega,
    ItemOrdenCompraEnStock, VoucherDevolucion, MovimientoEnVoucher
)
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q, Sum
import os

class BodegaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bodega
        fields = '__all__'

class BodegaLightSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bodega
        fields = ('id', 'nombre')
        read_only_fields = fields

class ImagenDeItemEnTomaInventarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagenDeItemEnTomaInventario
        fields = '__all__'

class MultipleImagenesSerializer(serializers.Serializer):
    """
    Recibe un arreglo de cadenas base-64.
    { "imagenes": ["data:image/png;base64,AAA…", "data:image/png;base64,BBB…"] }
    """
    imagenes = serializers.ListField(
        child=serializers.CharField(), allow_empty=False, min_length=1
    )

class EstadoTomaInventarioSerializer(serializers.ModelSerializer):
    estado_label = serializers.SerializerMethodField()

    class Meta:
        model = EstadoTomaInventario
        fields = '__all__'

    def get_estado_label(self, obj):
        return obj.get_estado_display()

class ItemEnTomaInventarioSerializer(serializers.ModelSerializer):
    nombre_item = serializers.SerializerMethodField()
    estado_label = serializers.SerializerMethodField()
    nombre_bodega = serializers.SerializerMethodField()

    class Meta:
        model = ItemEnTomaInventario
        fields = '__all__'

    def get_nombre_item(self, obj):
        return obj.stock_item.item.nombre

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_nombre_bodega(self, obj):
        return obj.stock_item.bodega.nombre

class TomaInventarioCrearSerializer(serializers.ModelSerializer):
    #  ── los campos Many-to-Many los recibimos como lista de IDs
    bodegas = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Bodega.objects.all()
    )

    class Meta:
        model = TomaInventario
        # excluimos los campos que se llenarán automáticamente
        exclude = ("items_a_inventariar", "creado_por")

class TomaInventarioSerializer(serializers.ModelSerializer):
    nombre_creado_por = serializers.SerializerMethodField()
    datos_bodegas = BodegaLightSerializer(source='bodegas', many=True, read_only=True)
    ultimo_estado = serializers.SerializerMethodField()

    class Meta:
        model = TomaInventario
        fields = '__all__'

    def get_nombre_creado_por(self, obj):
        return obj.creado_por.usuario.get_nombre_completo() if obj.creado_por else "Sin Usuario"

    def get_ultimo_estado(self, obj):
        """
        Devuelve el último EstadoTomaInventario creado para la toma,
        tomando como referencia 'fecha_creacion' de ModeloBase.
        Si querés devolver sólo el nombre del estado, cambia la línea
        del return a `return estado.estado` o `estado.get_estado_display()`.
        """
        estado = obj.estados.order_by('-fecha_creacion').first()
        if not estado:
            return None

        # Si querés serializar todo el objeto
        return EstadoTomaInventarioSerializer(estado).data

class DataItemEmpresaSerializer(serializers.ModelSerializer):
    datos_categoria = CategoriaSerializer(source="categoria", read_only=True)
    datos_fabricante = FabricanteSerializer(source="fabricante", read_only=True)

    class Meta:
        model = ItemEmpresa
        fields = '__all__'

class ItemEnOrdenCompraSerializer(serializers.ModelSerializer):
    item_empresa = DataItemEmpresaSerializer(source="item", read_only=True)
    cantidad_recibida = serializers.SerializerMethodField()

    class Meta:
        model = ItemEnOrdenCompra
        fields = '__all__'

    def get_cantidad_recibida(self, obj):
        ct = ContentType.objects.get_for_model(obj)
        itemordencompraenstock = ItemOrdenCompraEnStock.objects.filter(content_type=ct, item_oc_id=obj.pk)
        if itemordencompraenstock.exists():
            return itemordencompraenstock.first().cantidad
        else:
            return None

class OrdenCompraCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrdenCompra
        fields = ['cotizacion', 'proveedor', 'oc_cliente', 'creado_por', 'observaciones', 'estado', 'items', 'oc_empresa']

class OrdenCompraSerializer(serializers.ModelSerializer):
    items = serializers.PrimaryKeyRelatedField(many=True, read_only=True, source='itemenordencompra_set')
    datos_item = ItemEnOrdenCompraSerializer(source="itemenordencompra_set", read_only=True, many=True)
    estado_label = serializers.SerializerMethodField()
    nombre_proveedor = serializers.SerializerMethodField()
    nombre_cotizacion = serializers.SerializerMethodField()
    nombre_cliente = serializers.SerializerMethodField()
    tipo_moneda = serializers.SerializerMethodField()
    tipo_moneda_label = serializers.SerializerMethodField()
    dolar_final = serializers.SerializerMethodField()

    class Meta:
        model = OrdenCompra
        fields = '__all__'

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_nombre_proveedor(self, obj):
        if obj.proveedor:
            return obj.proveedor.nombre
        else:
            return "Sin Proveedor"

    def get_nombre_cotizacion(self, obj):
        if obj.cotizacion:
            return obj.cotizacion.name
        else:
            return "Sin Cotización"

    def get_nombre_cliente(self, obj):
        if obj.oc_cliente:
            return obj.oc_cliente.nombre

    def get_tipo_moneda(self, obj):
        if obj.proveedor:
            return obj.proveedor.tipo_moneda
        return None

    def get_tipo_moneda_label(self, obj):
        if obj.proveedor:
            return obj.proveedor.get_tipo_moneda_display()
        return None

    def get_dolar_final(self, obj):
        if obj.dolar_observado is None:
            return None

        recargo = 0
        if obj.proveedor and obj.proveedor.recargo_dolar is not None:
            recargo = obj.proveedor.recargo_dolar

        return int(Decimal(obj.dolar_observado) + Decimal(recargo))


class OrdenCompraAgrupadaSerializer(serializers.ModelSerializer):
    """
    Serializer principal de OC Agrupada.
    Incluye grupos por proveedor con el estado de cada OC individual.
    """
    estado_derivado = serializers.CharField(read_only=True)
    estado_derivado_label = serializers.CharField(read_only=True)
    nombre_cliente = serializers.SerializerMethodField()
    nombre_empresa = serializers.SerializerMethodField()
    es_prospecto = serializers.SerializerMethodField()
    grupos_proveedor = serializers.SerializerMethodField()
    cotizaciones_ids = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True, source="cotizaciones"
    )

    class Meta:
        model = OrdenCompraAgrupada
        fields = [
            "id", "codigo", "oc_empresa", "oc_cliente",
            "nombre_empresa", "nombre_cliente", "es_prospecto",
            "cotizaciones_ids", "observaciones",
            "estado_derivado", "estado_derivado_label",
            "grupos_proveedor",
            "creado_por", "fecha_creacion", "fecha_modificacion",
        ]
        read_only_fields = ["id", "codigo", "fecha_creacion", "fecha_modificacion"]

    def get_nombre_cliente(self, obj):
        return obj.oc_cliente.nombre if obj.oc_cliente else None

    def get_nombre_empresa(self, obj):
        return obj.oc_empresa.nombre if obj.oc_empresa else None

    def get_es_prospecto(self, obj):
        from empresas.models import RelacionEmpresa
        return RelacionEmpresa.objects.filter(
            prestador_servicios=obj.oc_empresa,
            cliente=obj.oc_cliente,
            tipo_relacion="prospecto",
        ).exists()

    def get_grupos_proveedor(self, obj):
        ocs = obj.ordenes_compra.select_related("proveedor").all()
        return [
            {
                "id": oc.id,
                "codigo": oc.codigo,
                "proveedor_id": oc.proveedor_id,
                "nombre_proveedor": oc.proveedor.nombre if oc.proveedor else "Sin proveedor",
                "estado": oc.estado,
                "estado_label": oc.get_estado_display(),
                "fecha_compra": oc.fecha_compra,
            }
            for oc in ocs
        ]


class OrdenCompraAgrupadaCreateSerializer(serializers.Serializer):
    """
    Payload para crear una OC Agrupada desde cotizaciones aprobadas.
    """
    oc_empresa = serializers.IntegerField()
    oc_cliente = serializers.IntegerField()
    cotizaciones_ids = serializers.ListField(
        child=serializers.IntegerField(), min_length=1
    )
    observaciones = serializers.CharField(required=False, allow_blank=True, default="")

class ItemEmpresaEnStockSerializer(serializers.ModelSerializer):
    datos_categoria = CategoriaSerializer(source="categoria", read_only=True)
    datos_fabricante = FabricanteSerializer(source="fabricante", read_only=True)

    class Meta:
        model = ItemEmpresa
        fields = '__all__'

class StockItemEnBodegaSerializer(serializers.ModelSerializer):
    datos_item = ItemEmpresaEnStockSerializer(source="item", read_only=True)
    numeros_series = serializers.SerializerMethodField()

    class Meta:
        model = StockItemEnBodega
        fields = '__all__'

    def get_numeros_series(self, obj):
        """Retorna solo las series disponibles (no asignadas a otro documento)."""
        from bodegas.series import obtener_series_disponibles
        return obtener_series_disponibles(obj)

class ItemOrdenCompraEnStockSerializer(serializers.ModelSerializer):
    nombre_bodega = serializers.SerializerMethodField()
    bodega_stock_id = serializers.SerializerMethodField()
    id_documento   = serializers.SerializerMethodField()
    tipo_documento = serializers.SerializerMethodField()

    class Meta:
        model = ItemOrdenCompraEnStock
        fields = '__all__'

    def get_nombre_bodega(self, obj):
        if obj.stock_item and obj.stock_item.bodega:
            return obj.stock_item.bodega.nombre
        item_oc = getattr(obj, "item_oc", None)
        if item_oc and hasattr(item_oc, "item"):
            stock_item = StockItemEnBodega.objects.filter(item=item_oc.item).first()
            if stock_item:
                return stock_item.bodega.nombre
        if obj.bodega_temporal:
            return obj.bodega_temporal.nombre
        return "Sin Bodega"

    def get_bodega_stock_id(self, obj):
        if obj.stock_item and obj.stock_item.bodega_id:
            return obj.stock_item.bodega_id
        item_oc = getattr(obj, "item_oc", None)
        if item_oc and hasattr(item_oc, "item"):
            stock_item = StockItemEnBodega.objects.filter(item=item_oc.item).first()
            if stock_item:
                return stock_item.bodega_id
        return None

    def get_id_documento(self, obj):
        """
        Devuelve:
          • orden_compra_id si el item proviene de ItemEnOrdenCompra
          • compra_id       si el item proviene de ItemEnCompra
          • None            en cualquier otro caso
        """
        if obj.item_oc is None:               # no debería ocurrir, pero por seguridad
            return None

        # Item proveniente de una Orden de Compra
        if hasattr(obj.item_oc, "orden_compra_id"):
            return obj.item_oc.orden_compra_id

        # Item proveniente de una Compra
        if hasattr(obj.item_oc, "compra_id"):
            return obj.item_oc.compra_id

        return None

    def get_tipo_documento(self, obj):
        # No es obligatorio, pero suele ser útil para el front-end
        if obj.content_type.model == "itemenordencompra":
            return "OC"        # Orden de Compra
        if obj.content_type.model == "itemencompra":
            return "CR"        # Compra
        return "-"

class ItemsGuiaSalidaSerializer(serializers.ModelSerializer):
    datos_stock = StockItemEnBodegaSerializer(source="stock_item", read_only=True)
    guia_id = serializers.PrimaryKeyRelatedField(source="guia.pk", read_only=True)

    class Meta:
        model = ItemsGuiaSalida
        fields = '__all__'

class GuiaSalidaSerializer(serializers.ModelSerializer):
    items = ItemsGuiaSalidaSerializer(many=True, read_only=True, source="itemsguiasalida_set")
    estado_label = serializers.SerializerMethodField()
    nombre_creado_por = serializers.SerializerMethodField()
    nombre_recibido_por = serializers.SerializerMethodField()
    cliente_nombre = serializers.SerializerMethodField()
    cantidad_items_total = serializers.SerializerMethodField()
    descripcion_items = serializers.SerializerMethodField()

    class Meta:
        model = GuiaSalida
        fields = '__all__'

    def get_estado_label(self, obj):
        if obj.estado:
            return obj.get_estado_display()
        return "Sin Estado"

    def get_nombre_creado_por(self, obj):
        if obj.creado_por:
            return obj.creado_por.usuario.get_nombre_completo()
        return "Sin Creado Por"

    def get_nombre_recibido_por(self, obj):
        if obj.recibido_por:
            return obj.recibido_por.usuario.get_nombre_completo()
        return "Sin Recibido Por"

    def get_cliente_nombre(self, obj):
        if obj.cliente:
            return obj.cliente.nombre
        return "Sin Cliente"

    def get_cantidad_items_total(self, obj):
        """
        Retorna la suma total de cantidades disponibles para uso/vínculo.
        Usamos cantidad_rebajada (lo realmente retirado de bodega). Si no
        existe rebaja aún, cae a cantidad_original.
        """
        items = obj.itemsguiasalida_set.all()
        total_cantidades = 0
        for item in items:
            cantidad_base = item.cantidad_rebajada or item.cantidad_original
            if item.individualizado:
                total_cantidades += 1 if cantidad_base is None else cantidad_base
            else:
                total_cantidades += cantidad_base
        return total_cantidades

    def get_descripcion_items(self, obj):
        """
        Retorna una descripción legible:
        "<n_items> items, <total_cantidades> cantidades"
        """
        items = obj.itemsguiasalida_set.all()
        n_items = items.count()
        total_cantidades = 0
        for item in items:
            cantidad_base = item.cantidad_rebajada or item.cantidad_original
            if item.individualizado:
                total_cantidades += 1 if cantidad_base is None else cantidad_base
            else:
                total_cantidades += cantidad_base

        return f"{n_items} items, {total_cantidades} cantidades"



class ArchivoCompraSerializer(serializers.ModelSerializer):
    nombre_archivo = serializers.SerializerMethodField()
    nombre_creado_por = serializers.SerializerMethodField()
    tipo_label = serializers.SerializerMethodField()
    opcion_label = serializers.SerializerMethodField()

    class Meta:
        model = ArchivoCompra
        fields = '__all__'

    def get_nombre_archivo(self, obj):
        return os.path.basename(obj.archivo.name) if obj.archivo else ""

    def get_nombre_creado_por(self, obj):
        return obj.creado_por.usuario.get_nombre_completo() if obj.creado_por else "Sin Usuario"

    def get_tipo_label(self, obj):
        return obj.get_tipo_display()

    def get_opcion_label(self, obj):
        return obj.get_opcion_display()

class CompraCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Compra
        fields = [
            "id",
            "sucursal",
            "creado_por",
            "observaciones",
            "fecha_compra",
            "orden_trabajo",
        ]
        extra_kwargs = {
            "id": {"read_only": True},
            "sucursal": {"required": False, "allow_null": True},
            "creado_por": {"required": False, "allow_null": True},
            "orden_trabajo": {"required": False, "allow_null": True},
        }

class CompraSerializer(serializers.ModelSerializer):
    estado_label = serializers.SerializerMethodField()
    nombre_creado_por = serializers.SerializerMethodField()
    archivos = ArchivoCompraSerializer(many=True, read_only=True)
    total_compra = serializers.SerializerMethodField()
    itemencompra_set = serializers.SerializerMethodField()

    class Meta:
        model = Compra
        fields = '__all__'

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_nombre_creado_por(self, obj):
        return obj.creado_por.usuario.get_nombre() if obj.creado_por else "Sin Usuario"

    def get_total_compra(self, obj):
        return obj.total_compra
    
    def get_itemencompra_set(self, obj):
        items = obj.itemencompra_set.all()
        return ItemEnCompraSerializer(items, many=True).data

class ItemEnCompraSerializer(serializers.ModelSerializer):
    nombre_item = serializers.SerializerMethodField()
    item_stock = serializers.SerializerMethodField()
    cantidad_devuelta = serializers.SerializerMethodField()
    cantidad_usada = serializers.SerializerMethodField()
    estado_uso_label = serializers.SerializerMethodField()

    class Meta:
        model = ItemEnCompra
        fields = '__all__'

    def get_nombre_item(self, obj):
        return obj.item.nombre

    def get_item_stock(self, obj):
        content_type = ContentType.objects.get_for_model(obj)
        stock_item = ItemOrdenCompraEnStock.objects.filter(
            content_type=content_type,
            item_oc_id=obj.id,
        ).first()

        if not stock_item:
            return None

        return ItemOrdenCompraEnStockSerializer(stock_item).data

    def get_cantidad_devuelta(self, obj):
        content_type = ContentType.objects.get_for_model(obj)
        total = (
            MovimientoStock.objects.filter(
                tipo_movimiento="DEVOLUCION",
                content_type=content_type,
                object_id=obj.id,
            ).aggregate(total=Sum("cantidad"))
        )["total"]
        return int(total or 0)

    def get_cantidad_usada(self, obj):
        cantidad = obj.cantidad or 0
        devuelta = self.get_cantidad_devuelta(obj)
        return max(cantidad - devuelta, 0)

    def get_estado_uso_label(self, obj):
        cantidad = obj.cantidad or 0
        devuelta = self.get_cantidad_devuelta(obj)

        if cantidad <= 0:
            return "Sin cantidad"
        if devuelta <= 0:
            return "Usado total"
        if devuelta >= cantidad:
            return "Devuelto"
        return "Parcial"

class ItemsGuiaSalidaEnMovimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemsGuiaSalida
        fields = '__all__'

class StockInicialSerializer(serializers.Serializer):
    bodega      = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all())
    item        = serializers.PrimaryKeyRelatedField(queryset=ItemEmpresa.objects.all())
    cantidad    = serializers.IntegerField(min_value=0)
    descripcion = serializers.CharField(allow_blank=True, required=False)

    def validate(self, attrs):
        # Evitar duplicados: no debe existir ya un StockItemEnBodega (bodega, item)
        if StockItemEnBodega.objects.filter(
            bodega=attrs["bodega"], item=attrs["item"]
        ).exists():
            raise serializers.ValidationError(
                "Ya existe un registro de stock para este ítem en la bodega."
            )
        return attrs

class AjusteStockSerializer(serializers.Serializer):
    stock_item   = serializers.PrimaryKeyRelatedField(
        queryset=StockItemEnBodega.objects.all()
    )
    cantidad     = serializers.IntegerField()          # puede ser + / -
    descripcion  = serializers.CharField(allow_blank=True, required=False)

    def validate_cantidad(self, value):
        if value == 0:
            raise serializers.ValidationError("La cantidad no puede ser cero.")
        return value

    def validate(self, attrs):
        stock_item = attrs["stock_item"]
        nueva_cantidad = stock_item.cantidad + attrs["cantidad"]
        if nueva_cantidad < 0:
            raise serializers.ValidationError(
                f"Stock insuficiente: el ajuste dejaría la cantidad en {nueva_cantidad}."
            )
        return attrs

class MovimientoStockSerializer(serializers.ModelSerializer):
    datos_origen = serializers.SerializerMethodField()
    nombre_usuario = serializers.SerializerMethodField()

    class Meta:
        model = MovimientoStock
        fields = '__all__'

    # --- registro modelo → serializador -----------
    _SERIALIZER_MAP = {
        # clave: "<app_label>.<model_name>"
        "bodegas.itemordencompraenstock": ItemOrdenCompraEnStockSerializer,
        "bodegas.itemsguiasalida":       ItemsGuiaSalidaEnMovimientoSerializer,
    }
    # ---------------------------------------------

    def get_datos_origen(self, obj):
        """
        Devuelve el objeto 'origen' serializado con el serializer
        que corresponde a su ContentType. Si no hay serializer
        configurado, devuelve None.
        """
        origen_obj = obj.origen
        if origen_obj is None:
            return None

        # se arma la clave tal como la guardamos en el dict
        key = f"{origen_obj._meta.app_label}.{origen_obj._meta.model_name}"
        serializer_cls = self._SERIALIZER_MAP.get(key)

        if serializer_cls is None:
            # opcional: podrías lanzar una excepción o devolver algo por defecto
            return None

        # importante pasar el context para respetar request/user/etc.
        return serializer_cls(origen_obj, context=self.context).data

    def get_nombre_usuario(self, obj):
        return obj.usuario.usuario.get_nombre_completo() if obj.usuario else "Sin Usuario"


class MovimientoEnVoucherSerializer(serializers.ModelSerializer):
    """Serializer para la tabla intermedia MovimientoEnVoucher."""
    movimiento = MovimientoStockSerializer(read_only=True)
    
    class Meta:
        model = MovimientoEnVoucher
        fields = ['id', 'movimiento', 'orden', 'notas', 'fecha_creacion']


class VoucherDevolucionSerializer(serializers.ModelSerializer):
    """
    Serializer para VoucherDevolucion con movimientos agrupados por origen.
    
    Nested data incluye:
    - Movimientos individuales (vía MovimientoEnVoucher)
    - Agrupación por origen (GuíaSalida/Compra)
    - Total de ítems devueltos
    """
    movimientos_agrupados = serializers.SerializerMethodField()
    total_items_devueltos = serializers.IntegerField(read_only=True)
    orden_trabajo_numero = serializers.CharField(
        source='orden_trabajo.id',
        read_only=True
    )
    responsable_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = VoucherDevolucion
        fields = [
            'id',
            'numero',
            'orden_trabajo',
            'orden_trabajo_numero',
            'observaciones',
            'movimientos_agrupados',
            'total_items_devueltos',
            'responsable_nombre',
            'fecha_creacion',
            'fecha_modificacion',
        ]
        read_only_fields = ['numero', 'fecha_creacion', 'fecha_modificacion']
    
    def get_responsable_nombre(self, obj):
        """Retorna nombre completo del responsable si existe."""
        if obj.movimientos.first() and obj.movimientos.first().usuario:
            return obj.movimientos.first().usuario.usuario.get_nombre_completo()
        return "Sin responsable"
    
    def get_movimientos_agrupados(self, obj):
        """
        Agrupa movimientos por origen (GuíaSalida o Compra).
        
        Retorna estructura:
        [
            {
                "origen_tipo": "GuíaSalida" | "Compra",
                "origen_id": int,
                "origen_detalle": str,
                "items": [
                    {
                        "item_nombre": str,
                        "item_codigo": str,
                        "cantidad_devuelta": int,
                        "bodega": str,
                        "usuario": str,
                        "fecha": str
                    }
                ]
            }
        ]
        """
        from collections import defaultdict
        from bodegas.models import ItemsGuiaSalida, ItemEnCompra
        
        agrupado = defaultdict(list)
        
        # Obtener movimientos ordenados
        movimientos_voucher = obj.movimientos_voucher.select_related(
            'movimiento__stock_item__item',
            'movimiento__stock_item__bodega',
            'movimiento__usuario__usuario',
            'movimiento__content_type'
        ).order_by('orden', '-fecha_creacion')
        
        for mv in movimientos_voucher:
            movimiento = mv.movimiento
            origen = movimiento.origen
            
            if not origen:
                continue
            
            # Determinar tipo y detalle del origen
            if isinstance(origen, ItemsGuiaSalida):
                origen_key = f"GuíaSalida-{origen.guia.id}"
                origen_tipo = "GuíaSalida"
                origen_detalle = f"Guía de Salida #{origen.guia.id}"
                origen_id = origen.guia.id
            elif isinstance(origen, ItemEnCompra):
                origen_key = f"Compra-{origen.compra.id}"
                origen_tipo = "Compra"
                origen_detalle = f"Compra {origen.compra.codigo}"
                origen_id = origen.compra.id
            else:
                # Tipo de origen no soportado
                continue
            
            # Agregar item al grupo correspondiente
            agrupado[origen_key].append({
                'origen_tipo': origen_tipo,
                'origen_id': origen_id,
                'origen_detalle': origen_detalle,
                'item_nombre': movimiento.stock_item.item.nombre,
                'item_codigo': movimiento.stock_item.item.codigo if hasattr(movimiento.stock_item.item, 'codigo') else '',
                'cantidad_devuelta': movimiento.cantidad,
                'bodega': movimiento.stock_item.bodega.nombre,
                'usuario': movimiento.usuario.usuario.get_nombre_completo() if movimiento.usuario else 'Sin usuario',
                'fecha': movimiento.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
            })
        
        # Transformar dict a lista con estructura final
        resultado = []
        for origen_key, items in agrupado.items():
            if items:
                resultado.append({
                    'origen_tipo': items[0]['origen_tipo'],
                    'origen_id': items[0]['origen_id'],
                    'origen_detalle': items[0]['origen_detalle'],
                    'items': [
                        {
                            'item_nombre': item['item_nombre'],
                            'item_codigo': item['item_codigo'],
                            'cantidad_devuelta': item['cantidad_devuelta'],
                            'bodega': item['bodega'],
                            'usuario': item['usuario'],
                            'fecha': item['fecha'],
                        }
                        for item in items
                    ]
                })
        
        return resultado
