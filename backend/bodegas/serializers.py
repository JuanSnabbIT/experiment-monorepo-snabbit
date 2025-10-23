from rest_framework import serializers
from bodegas.estados_modelo import MOVIMIENTOS_TIPO
from items.models import ItemEmpresa
from items.serializers import CategoriaSerializer, FabricanteSerializer
from .models import ArchivoCompra, Bodega, Compra, EstadoTomaInventario, ImagenDeItemEnTomaInventario, ItemEnCompra, ItemEnTomaInventario, ItemsGuiaSalida, GuiaSalida, MovimientoStock, TomaInventario, OrdenCompra, ItemEnOrdenCompra, StockItemEnBodega, ItemOrdenCompraEnStock
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
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
        if obj.itemordencompraenstock_set.all().exists():
            lista = []
            for item in obj.itemordencompraenstock_set.all():
                if item.numeros_serie.get("numeros_serie"):
                    for item_stock in item.numeros_serie.get("numeros_serie"):
                        lista.append(item_stock.get("serie"))
            return lista
        else:
            return []

class ItemOrdenCompraEnStockSerializer(serializers.ModelSerializer):
    nombre_bodega = serializers.SerializerMethodField()
    id_documento   = serializers.SerializerMethodField()
    tipo_documento = serializers.SerializerMethodField()

    class Meta:
        model = ItemOrdenCompraEnStock
        fields = '__all__'

    def get_nombre_bodega(self, obj):
        if obj.bodega_temporal:
            return obj.bodega_temporal.nombre
        else:
            return "Sin Bodega"

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
    items = ItemsGuiaSalidaSerializer(many=True, read_only=True, source="items_guia_salida_set")
    estado_label = serializers.SerializerMethodField()
    nombre_creado_por = serializers.SerializerMethodField()
    nombre_recibido_por = serializers.SerializerMethodField()

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
        else:
            "Sin Creado Por"

    def get_nombre_recibido_por(self, obj):
        if obj.recibido_por:
            return obj.recibido_por.usuario.get_nombre_completo()
        else:
            "Sin Recibido Por"

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
        fields = ['tipo', 'sucursal', 'proveedor', 'creado_por', 'observaciones', 'bodega_temporal']

class CompraSerializer(serializers.ModelSerializer):
    tipo_label = serializers.SerializerMethodField()
    estado_label = serializers.SerializerMethodField()
    nombre_proveedor = serializers.SerializerMethodField()
    nombre_creado_por = serializers.SerializerMethodField()
    archivos = ArchivoCompraSerializer(many=True, read_only=True)
    nombre_bodega = serializers.SerializerMethodField()
    total_compra = serializers.SerializerMethodField()

    class Meta:
        model = Compra
        fields = '__all__'

    def get_tipo_label(self, obj):
        return obj.get_tipo_display()

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_nombre_proveedor(self, obj):
        return obj.proveedor.nombre if obj.proveedor else "Sin Proveedor"

    def get_nombre_creado_por(self, obj):
        return obj.creado_por.usuario.get_nombre() if obj.creado_por else "Sin Usuario"

    def get_nombre_bodega(self, obj):
        return obj.bodega_temporal.nombre if obj.bodega_temporal else "Sin Bodega"

    def get_total_compra(self, obj):
        return obj.total_compra

class ItemEnCompraSerializer(serializers.ModelSerializer):
    nombre_item = serializers.SerializerMethodField()
    item_stock = serializers.SerializerMethodField()

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