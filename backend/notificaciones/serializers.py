from rest_framework import serializers

from .models import (
    ConfiguracionNotificacionEmpresa,
    FCMToken,
    Notificacion,
    TipoEventoNotificacion,
)


class FCMTokenRegistroSerializer(serializers.ModelSerializer):
    """Payload para registrar un token de dispositivo desde el frontend."""

    class Meta:
        model = FCMToken
        fields = ["token", "user_agent"]
        extra_kwargs = {
            "user_agent": {"required": False, "allow_blank": True},
        }


class NotificacionSerializer(serializers.ModelSerializer):
    tipo_label = serializers.SerializerMethodField()

    class Meta:
        model = Notificacion
        fields = [
            "id",
            "tipo",
            "tipo_label",
            "titulo",
            "cuerpo",
            "url_destino",
            "leida",
            "fecha_lectura",
            "datos",
            "fecha_creacion",
        ]
        read_only_fields = fields

    def get_tipo_label(self, obj: Notificacion) -> str:
        if not obj.tipo:
            return ""

        try:
            return TipoEventoNotificacion(obj.tipo).label
        except ValueError:
            return str(obj.tipo)


class ConfiguracionNotificacionEmpresaSerializer(serializers.ModelSerializer):
    tipo_label = serializers.SerializerMethodField()

    class Meta:
        model = ConfiguracionNotificacionEmpresa
        fields = ["id", "empresa", "tipo", "tipo_label", "activo"]

    def get_tipo_label(self, obj: ConfiguracionNotificacionEmpresa) -> str:
        if not obj.tipo:
            return ""

        try:
            return TipoEventoNotificacion(obj.tipo).label
        except ValueError:
            return str(obj.tipo)
