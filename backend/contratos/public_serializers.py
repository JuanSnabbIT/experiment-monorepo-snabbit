from rest_framework import serializers


class DestinatarioContratoPublicSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    nombre = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    es_externo = serializers.BooleanField(read_only=True)


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
