"""
Serializers públicos para aprobación/rechazo de cotizaciones vía email.

Estos serializers se usan en endpoints SIN autenticación, por lo que
exponen solo la información necesaria para que el cliente pueda
revisar y responder la cotización.

Documentación para Frontend:
----------------------------
El endpoint GET /api/public/cotizacion/{token}/ retorna este JSON estructurado
para renderizar la vista de aprobación/rechazo.
"""

from decimal import Decimal
from rest_framework import serializers
from .models import Cotizacion, ItemCotizacion, SolicitanteCotizacion


class EmpresaPublicSerializer(serializers.Serializer):
    """
    Datos públicos de la empresa emisora de la cotización.
    No expone información sensible como emails internos o configuraciones.
    """
    id = serializers.IntegerField(read_only=True)
    nombre = serializers.CharField(read_only=True)
    rut_empresa = serializers.CharField(read_only=True, allow_null=True)
    direccion_principal = serializers.CharField(read_only=True, allow_null=True)
    telefono = serializers.CharField(read_only=True, allow_null=True)
    email = serializers.EmailField(read_only=True, allow_null=True)
    sitio_web = serializers.CharField(read_only=True, allow_null=True)
    logo = serializers.CharField(read_only=True, allow_null=True)


class ClientePublicSerializer(serializers.Serializer):
    """
    Datos públicos del cliente destinatario.
    """
    id = serializers.IntegerField(read_only=True)
    nombre = serializers.CharField(read_only=True)
    rut_empresa = serializers.CharField(read_only=True, allow_null=True)


class ItemCotizacionPublicSerializer(serializers.ModelSerializer):
    """
    Item de cotización con precios calculados para vista pública.
    
    Campos importantes:
    - precio_venta_unitario: Precio unitario con recargo aplicado (en moneda de cotización)
    - precio_venta_total: Precio total con recargo (en moneda de cotización)
    """
    nombre_display = serializers.SerializerMethodField()
    precio_venta_unitario = serializers.SerializerMethodField()
    precio_venta_total = serializers.SerializerMethodField()

    class Meta:
        model = ItemCotizacion
        fields = [
            'id',
            'nombre_display',
            'descripcion',
            'cantidad',
            'precio_venta_unitario',
            'precio_venta_total',
            'aprobado',
        ]

    def get_nombre_display(self, obj):
        """Retorna el nombre del item (de ItemEmpresa o del campo nombre)."""
        if obj.item_empresa:
            return obj.item_empresa.nombre
        return obj.nombre or "Sin nombre"

    def get_precio_venta_unitario(self, obj):
        """Precio unitario con recargo en moneda de la cotización."""
        return float(obj.precio_venta_neta_unitario_moneda_base)

    def get_precio_venta_total(self, obj):
        """Precio total con recargo en moneda de la cotización."""
        return float(obj.precio_venta_neta_total_moneda_base)


class SolicitanteInfoSerializer(serializers.Serializer):
    """
    Información del solicitante actual (el que tiene el token).
    """
    id = serializers.IntegerField(read_only=True)
    nombre = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    puede_responder = serializers.SerializerMethodField()
    ya_respondio = serializers.BooleanField(source='token_usado', read_only=True)
    aprobo = serializers.BooleanField(read_only=True)

    def get_nombre(self, obj):
        return obj.get_nombre()

    def get_email(self, obj):
        return obj.get_email()

    def get_puede_responder(self, obj):
        """
        El solicitante puede responder si:
        1. No ha usado el token (no ha respondido)
        2. La cotización está en estado 'enviada'
        3. La cotización no ha expirado
        """
        if obj.token_usado:
            return False
        cotizacion = obj.cotizacion
        if cotizacion.estado != 'enviada':
            return False
        if not cotizacion.es_vigente:
            return False
        return True


class CotizacionPublicSerializer(serializers.ModelSerializer):
    """
    Serializer completo de cotización para vista pública.
    
    Uso: GET /api/public/cotizacion/{token}/
    
    Response ejemplo:
    {
        "numero_cotizacion": 850,
        "nombre": "Servicios IT Q1 2026",
        "estado": "enviada",
        "estado_display": "Enviada",
        "fecha_creacion": "2026-01-15",
        "fecha_vencimiento": "2026-02-15",
        "es_vigente": true,
        "descripcion": "Cotización de servicios...",
        "observaciones": "Válida por 30 días",
        "tipo_moneda": "2",
        "tipo_moneda_display": "CLP",
        "simbolo_moneda": "$",
        "total_estimado": 1500000.00,
        "empresa": {
            "id": 1,
            "nombre": "Snabbit",
            "rut_empresa": "76.xxx.xxx-x",
            "logo": "base64...",
            ...
        },
        "cliente": {
            "id": 2,
            "nombre": "Cliente SA",
            "rut_empresa": "77.xxx.xxx-x"
        },
        "items": [
            {
                "id": 1,
                "nombre_display": "Servicio de Mantención",
                "descripcion": "Mantención mensual de equipos",
                "cantidad": 12,
                "precio_venta_unitario": 100000.00,
                "precio_venta_total": 1200000.00
            },
            ...
        ],
        "solicitante": {
            "id": 5,
            "nombre": "Juan Pérez",
            "email": "juan@cliente.cl",
            "puede_responder": true,
            "ya_respondio": false,
            "aprobo": false
        }
    }
    """
    empresa = EmpresaPublicSerializer(read_only=True)
    cliente = ClientePublicSerializer(read_only=True)
    items = ItemCotizacionPublicSerializer(many=True, read_only=True)
    solicitante = serializers.SerializerMethodField()
    
    estado_display = serializers.SerializerMethodField()
    tipo_moneda_display = serializers.SerializerMethodField()
    simbolo_moneda = serializers.SerializerMethodField()
    es_vigente = serializers.BooleanField(read_only=True)
    total_calculado = serializers.SerializerMethodField()

    class Meta:
        model = Cotizacion
        fields = [
            'numero_cotizacion',
            'nombre',
            'estado',
            'estado_display',
            'fecha_creacion',
            'fecha_vencimiento',
            'es_vigente',
            'descripcion',
            'observaciones',
            'tipo_moneda',
            'tipo_moneda_display',
            'simbolo_moneda',
            'total_estimado',
            'total_calculado',
            'empresa',
            'cliente',
            'items',
            'solicitante',
        ]

    def get_estado_display(self, obj):
        return obj.get_estado_display()

    def get_tipo_moneda_display(self, obj):
        monedas = {'1': 'USD', '2': 'CLP', '3': 'UF'}
        return monedas.get(obj.tipo_moneda, 'CLP')

    def get_simbolo_moneda(self, obj):
        simbolos = {'1': 'US$', '2': '$', '3': 'UF'}
        return simbolos.get(obj.tipo_moneda, '$')

    def get_total_calculado(self, obj):
        """Total calculado dinámicamente desde los items."""
        return float(obj.calcular_total_estimado)

    def get_solicitante(self, obj):
        """
        Retorna info del solicitante actual.
        El solicitante se pasa en el contexto desde la vista.
        """
        solicitante = self.context.get('solicitante')
        if solicitante:
            return SolicitanteInfoSerializer(solicitante).data
        return None


class AprobarCotizacionPublicSerializer(serializers.Serializer):
    """
    Serializer para POST /api/public/cotizacion/{token}/aprobar/
    
    Request body:
    {
        "item_ids": [1, 2, 3]  // IDs de items a aprobar (opcional, si vacío aprueba todos)
    }
    
    Response exitosa (200):
    {
        "detail": "Cotización aprobada exitosamente.",
        "numero_cotizacion": 850,
        "items_aprobados": 3
    }
    
    Errores posibles:
    - 400: Token ya usado / Cotización no vigente / Items inválidos
    - 404: Token no encontrado
    - 410: Cotización expirada
    """
    item_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
        help_text="Lista de IDs de items a aprobar. Si está vacía, se aprueban todos."
    )


class RechazarCotizacionPublicSerializer(serializers.Serializer):
    """
    Serializer para POST /api/public/cotizacion/{token}/rechazar/
    
    Request body:
    {
        "motivo": "El precio excede nuestro presupuesto"  // Opcional
    }
    
    Response exitosa (200):
    {
        "detail": "Cotización rechazada.",
        "numero_cotizacion": 850
    }
    
    Errores posibles:
    - 400: Token ya usado / Cotización no vigente
    - 404: Token no encontrado
    - 410: Cotización expirada
    """
    motivo = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
        help_text="Motivo del rechazo (opcional)."
    )
