"""
Serializers de entrada para el endpoint agente-facing de creación completa
de cotizaciones (cabecera + ítems en una sola llamada atómica).

A diferencia de CotizacionSerializer (fields = '__all__'), aquí se usa una
whitelist explícita de campos. Un endpoint consumido por un agente NO debe
aceptar cualquier campo del modelo: solo lo estrictamente necesario para el flujo.
"""
from decimal import Decimal

from rest_framework import serializers

from .estados_modelo import TIPOS_MONEDA


class ItemAgenteSerializer(serializers.Serializer):
    """Un ítem de la cotización enviado por el agente."""

    nombre = serializers.CharField(
        max_length=250, required=False, allow_blank=True, allow_null=True
    )
    item_empresa = serializers.IntegerField(required=False, allow_null=True)
    proveedor_empresa = serializers.IntegerField(required=False, allow_null=True)
    descripcion = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    cantidad = serializers.IntegerField(min_value=1)
    precio_unitario = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0")
    )
    tipo_moneda = serializers.ChoiceField(choices=TIPOS_MONEDA, required=False)
    porcentaje_recargo = serializers.IntegerField(
        min_value=0, required=False, allow_null=True
    )

    def validate(self, attrs):
        if not attrs.get("nombre") and not attrs.get("item_empresa"):
            raise serializers.ValidationError(
                "Cada ítem requiere 'nombre' o 'item_empresa'."
            )
        return attrs


class CrearCotizacionCompletaSerializer(serializers.Serializer):
    """Payload completo para crear una cotización con sus ítems."""

    cliente = serializers.IntegerField(help_text="ID de la Empresa cliente.")
    nombre = serializers.CharField(max_length=150)
    tipo_moneda = serializers.ChoiceField(
        choices=TIPOS_MONEDA, required=False, default="2"
    )
    observaciones = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    fecha_facturacion = serializers.DateField(required=False, allow_null=True)
    # Valores manuales opcionales de tipo de cambio. Si no vienen y la moneda
    # los requiere, el endpoint los resuelve de forma síncrona.
    dolar_observado = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    valor_uf = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    items = ItemAgenteSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Debe incluir al menos un ítem.")
        return value
