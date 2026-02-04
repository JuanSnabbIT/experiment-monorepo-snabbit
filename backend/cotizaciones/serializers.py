from .models import *
from rest_framework import serializers
from django.utils import timezone
from cuentas.models import User
from empresas.models import UsuarioEmpresa


class ItemCotizacionSerializer(serializers.ModelSerializer):
    ppm = serializers.SerializerMethodField()
    nombre_item = serializers.SerializerMethodField()
    nombre_proveedor = serializers.SerializerMethodField()
    tipo_moneda_proveedor = serializers.SerializerMethodField()
    tipo_moneda_proveedor_label = serializers.SerializerMethodField()
    recargo_iva_venta = serializers.SerializerMethodField()
    iva_compra = serializers.SerializerMethodField()
    # precio_venta_neta = serializers.SerializerMethodField()
    valor_ppm = serializers.SerializerMethodField()
    total_impuesto = serializers.SerializerMethodField()
    precio_total_backend = serializers.SerializerMethodField()
    precio_unitario_backend = serializers.SerializerMethodField()
    ganancia = serializers.SerializerMethodField()
    precio_venta_neta_unitario_moneda_base = serializers.SerializerMethodField()
    precio_venta_neta_total_moneda_base = serializers.SerializerMethodField()

    class Meta:
        model = ItemCotizacion
        fields = '__all__'

    def get_ppm(self, obj):
        return obj.cotizacion.ppm

    def get_nombre_item(self, obj):
        if obj.item_empresa:
            return obj.item_empresa.nombre
        return obj.nombre

    def get_nombre_proveedor(self, obj):
        if obj.proveedor_empresa:
            return obj.proveedor_empresa.nombre
        return None

    def get_tipo_moneda_proveedor(self, obj):
        if obj.proveedor_empresa:
            return obj.proveedor_empresa.tipo_moneda
        return '2'  # Default CLP

    def get_tipo_moneda_proveedor_label(self, obj):
        if obj.proveedor_empresa:
            return obj.proveedor_empresa.get_tipo_moneda_display()
        return 'CLP'

    def get_recargo_iva_venta(self, obj):
        return obj.recargo_iva_venta

    def get_iva_compra(self, obj):
        return obj.iva_compra

    # def get_precio_venta_neta(self, obj):
    #     return obj.precio_venta_neta

    def get_valor_ppm(self, obj):
        return obj.valor_ppm

    def get_total_impuesto(self, obj):
        return obj.total_impuesto

    def get_precio_total_backend(self, obj):
        return obj.precio_total_backend

    def get_precio_unitario_backend(self, obj):
        return obj.precio_unitario_backend

    def get_ganancia(self, obj):
        return obj.ganancia

    def get_precio_venta_neta_unitario_moneda_base(self, obj):
        return obj.precio_venta_neta_unitario_moneda_base

    def get_precio_venta_neta_total_moneda_base(self, obj):
        return obj.precio_venta_neta_total_moneda_base

class CotizacionSerializer(serializers.ModelSerializer):
    estado_label = serializers.SerializerMethodField()
    tipo_moneda_label = serializers.SerializerMethodField()
    empresa_nombre = serializers.SerializerMethodField()
    cliente_nombre = serializers.SerializerMethodField()
    recargo_cliente = serializers.SerializerMethodField()
    es_vigente = serializers.SerializerMethodField()
    total_estimado = serializers.SerializerMethodField()
    copias_count = serializers.SerializerMethodField()
    estado_tipo_cambio_label = serializers.SerializerMethodField()

    # Alias para el criterio "tipo_cambio_usado" (se persiste en dolar_observado).
    tipo_cambio_usado = serializers.DecimalField(
        source='dolar_observado',
        required=False,
        allow_null=True,
        max_digits=10,
        decimal_places=2,
    )

    def get_empresa_nombre(self, obj):
        return obj.empresa.nombre

    def get_cliente_nombre(self, obj):
        return obj.cliente.nombre

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_tipo_moneda_label(self, obj):
        return obj.get_tipo_moneda_display()

    def get_recargo_cliente(self, obj):
        return obj.cliente.recargo

    def get_es_vigente(self, obj):
        return obj.es_vigente

    def get_total_estimado(self, obj):
        return obj.calcular_total_estimado

    def get_copias_count(self, obj):
        if hasattr(obj, "copias_count"):
            return obj.copias_count
        if hasattr(obj, "_prefetched_objects_cache") and "copias" in obj._prefetched_objects_cache:
            return len(obj._prefetched_objects_cache["copias"])
        return obj.copias.count()

    def get_estado_tipo_cambio_label(self, obj):
        return obj.get_estado_tipo_cambio_display()

    class Meta:
        model = Cotizacion
        fields = '__all__'

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)

    def create(self, validated_data):
        # Prefill recargo desde el cliente si no viene en la solicitud.
        recargo = validated_data.get("porcentaje_recargo")
        cliente = validated_data.get("cliente")
        if recargo is None and cliente:
            validated_data["porcentaje_recargo"] = cliente.recargo

        fecha_facturacion = validated_data.get('fecha_facturacion')
        if fecha_facturacion is None:
            validated_data['fecha_facturacion'] = timezone.localdate()
        return super().create(validated_data)

    def validate(self, attrs):
        if self.instance:
            if self.instance.fecha_facturacion_congelada:
                if "fecha_facturacion" in attrs:
                    nueva_fecha = attrs["fecha_facturacion"]
                    if nueva_fecha != self.instance.fecha_facturacion:
                        raise serializers.ValidationError(
                            {"fecha_facturacion": "La fecha de facturación está bloqueada por una prefactura."}
                        )
                if attrs.get("fecha_facturacion_congelada") is False:
                    raise serializers.ValidationError(
                        {
                            "fecha_facturacion_congelada": "No se puede desbloquear la fecha de facturación una vez fijada."
                        }
                    )
        return super().validate(attrs)

class SeguimientoCotizacionSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()

    def get_usuario_nombre(self, obj):
        if obj.usuario and obj.usuario.usuario:
            return f"{obj.usuario.usuario.first_name} {obj.usuario.usuario.last_name}"
        return "Sistema"

    class Meta:
        model = SeguimientoCotizacion
        fields = '__all__'

class SolicitanteCotizacionSerializer(serializers.ModelSerializer):
    nombre_usuario = serializers.SerializerMethodField()
    email_usuario = serializers.SerializerMethodField()

    class Meta:
        model = SolicitanteCotizacion
        fields = '__all__'

    def validate(self, data):
        """
        Validar que no exista el mismo email en múltiples solicitantes
        de la MISMA cotización.
        """
        cotizacion = data.get('cotizacion')
        content_type = data.get('content_type')
        usuario_id = data.get('usuario_id')
        
        if not cotizacion or not content_type or not usuario_id:
            return data
        
        # Obtener el email del usuario que se intenta agregar
        email_a_agregar = None
        if content_type.model == "solicitanteexterno":
            try:
                solicitante_ext = SolicitanteExterno.objects.get(pk=usuario_id)
                email_a_agregar = solicitante_ext.email
            except SolicitanteExterno.DoesNotExist:
                pass
        elif content_type.model == "usuarioempresa":
            try:
                usuario_emp = UsuarioEmpresa.objects.get(pk=usuario_id)
                email_a_agregar = usuario_emp.usuario.email
            except UsuarioEmpresa.DoesNotExist:
                pass
        
        if email_a_agregar:
            # Verificar si existe otro solicitante con el mismo email en la MISMA cotización
            from django.contrib.contenttypes.models import ContentType as CT
            solicitantes_cotizacion = SolicitanteCotizacion.objects.filter(
                cotizacion=cotizacion
            ).exclude(pk=self.instance.pk if self.instance else None)
            
            for solicitante in solicitantes_cotizacion:
                email_existente = None
                if solicitante.content_type.model == "solicitanteexterno":
                    try:
                        email_existente = SolicitanteExterno.objects.get(
                            pk=solicitante.usuario_id
                        ).email
                    except SolicitanteExterno.DoesNotExist:
                        pass
                elif solicitante.content_type.model == "usuarioempresa":
                    try:
                        email_existente = UsuarioEmpresa.objects.get(
                            pk=solicitante.usuario_id
                        ).usuario.email
                    except UsuarioEmpresa.DoesNotExist:
                        pass
                
                if email_existente and email_existente.lower() == email_a_agregar.lower():
                    raise serializers.ValidationError(
                        "Este email ya está agregado como solicitante en esta cotización."
                    )
        
        return data

    def get_nombre_usuario(self, obj):
        # Si es un solicitante externo, usamos el atributo "nombre"
        if obj.content_type.model == "solicitanteexterno":
            return obj.usuario.nombre
        # Si es un usuario empresa, accedemos al usuario relacionado y obtenemos el nombre
        elif obj.content_type.model == "usuarioempresa":
            return obj.usuario.usuario.get_nombre_completo()
        return ""

    def get_email_usuario(self, obj):
        # Si es un solicitante externo, usamos el atributo "email"
        if obj.content_type.model == "solicitanteexterno":
            return obj.usuario.email
        # Si es un usuario empresa, accedemos al usuario relacionado y obtenemos su email
        elif obj.content_type.model == "usuarioempresa":
            return obj.usuario.usuario.email
        return ""

class SolicitanteExternoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitanteExterno
        fields = '__all__'

