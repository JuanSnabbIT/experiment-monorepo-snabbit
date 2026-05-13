from rest_framework import serializers


class DestinatarioContratoPublicSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    nombre = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    es_externo = serializers.BooleanField(read_only=True)


class SeccionGeneradaPublicSerializer(serializers.Serializer):
    """Serializa una SeccionContratoGenerada para consumo público."""
    id = serializers.IntegerField(read_only=True)
    titulo = serializers.CharField(read_only=True)
    contenido_renderizado = serializers.CharField(read_only=True)
    orden = serializers.IntegerField(read_only=True)
    tipo = serializers.SerializerMethodField()

    def get_tipo(self, obj):
        if obj.seccion_plantilla:
            return obj.seccion_plantilla.tipo
        return "libre"


class ContratoAprobacionPublicSerializer(serializers.Serializer):
    uuid = serializers.UUIDField(read_only=True)
    puede_responder = serializers.BooleanField(read_only=True)
    ya_respondio = serializers.BooleanField(read_only=True)
    aprobado = serializers.BooleanField(read_only=True, allow_null=True)
    fecha_envio = serializers.DateTimeField(read_only=True, allow_null=True)
    fecha_respuesta = serializers.DateTimeField(read_only=True, allow_null=True)
    comentario_respuesta = serializers.CharField(read_only=True, allow_null=True)
    version_envio = serializers.IntegerField(read_only=True)
    destinatario = DestinatarioContratoPublicSerializer(read_only=True)
    contrato = serializers.JSONField(read_only=True)
    secciones_generadas = serializers.ListField(read_only=True)


class ContratoFirmaPublicSerializer(serializers.Serializer):
    uuid = serializers.UUIDField(read_only=True)
    puede_firmar = serializers.BooleanField(read_only=True)
    firmado = serializers.BooleanField(read_only=True)
    fecha_envio = serializers.DateTimeField(read_only=True, allow_null=True)
    fecha_emision = serializers.DateTimeField(read_only=True, allow_null=True, required=False)
    fecha_firma = serializers.DateTimeField(read_only=True, allow_null=True)
    firma = serializers.CharField(read_only=True, allow_null=True, required=False)
    firma_prestadora_disponible = serializers.BooleanField(read_only=True, required=False)
    es_version_enviada = serializers.BooleanField(read_only=True, required=False)
    destinatario = DestinatarioContratoPublicSerializer(read_only=True, allow_null=True)
    contrato = serializers.JSONField(read_only=True)
    secciones_generadas = serializers.ListField(read_only=True)


class ContratoResumenPublicSerializer(serializers.Serializer):
    """Serializa los datos del resumen público de un contrato activo."""
    uuid = serializers.UUIDField(read_only=True)
    activo = serializers.BooleanField(read_only=True)
    fecha_envio = serializers.DateTimeField(read_only=True, allow_null=True)
    destinatario = DestinatarioContratoPublicSerializer(read_only=True, allow_null=True)
    contrato = serializers.JSONField(read_only=True)
    secciones_generadas = serializers.ListField(read_only=True)
