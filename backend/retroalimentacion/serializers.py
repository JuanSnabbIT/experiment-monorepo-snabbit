from rest_framework import serializers
from .models import Retroalimentacion, RetroalimentacionAplicada
from django.utils import timezone


class PreguntaAplicadaSerializer(serializers.ModelSerializer):
    pregunta_texto = serializers.CharField(source="pregunta.texto", read_only=True)

    class Meta:
        model = RetroalimentacionAplicada
        fields = [
            "id",
            "pregunta",            # ID de la pregunta
            "pregunta_texto",      # Solo lectura
            "cantidad_estrellas",
            "observaciones"
        ]
        read_only_fields = ["pregunta", "pregunta_texto"]

class RetroalimentacionPublicaSerializer(serializers.ModelSerializer):
    retroalimentacion_aplicada = PreguntaAplicadaSerializer(many=True, read_only=True)
    empresa_nombre = serializers.SerializerMethodField()
    numero_ot = serializers.SerializerMethodField()
    descripcion_ot = serializers.SerializerMethodField()
    tecnico_responsable_nombre = serializers.SerializerMethodField()
    fecha_inicio_ot = serializers.SerializerMethodField()
    fecha_finalizacion_ot = serializers.SerializerMethodField()
    ya_respondida = serializers.SerializerMethodField()
    vencida = serializers.SerializerMethodField()
    fecha_vencimiento = serializers.DateTimeField(read_only=True)
    recordatorios_enviados = serializers.IntegerField(read_only=True)

    class Meta:
        model = Retroalimentacion
        fields = [
            "uuid",
            "orden_trabajo",
            "orden_trabajo_v3",
            "usuario_empresa",
            "usuario_externo",
            "correo_usuario_externo",
            "observacion_retroalimentacion",
            "fecha_retroalimentacion",
            "retroalimentacion_aplicada",
            # Campos enriquecidos del contexto de la OT
            "empresa_nombre",
            "numero_ot",
            "descripcion_ot",
            "tecnico_responsable_nombre",
            "fecha_inicio_ot",
            "fecha_finalizacion_ot",
            "ya_respondida",
            "vencida",
            "fecha_vencimiento",
            "recordatorios_enviados",
        ]
        read_only_fields = [
            "uuid",
            "orden_trabajo",
            "orden_trabajo_v3",
            "usuario_empresa",
            "usuario_externo",
            "correo_usuario_externo",
            "fecha_retroalimentacion",
            "empresa_nombre",
            "numero_ot",
            "descripcion_ot",
            "tecnico_responsable_nombre",
            "fecha_inicio_ot",
            "fecha_finalizacion_ot",
            "ya_respondida",
            "vencida",
            "fecha_vencimiento",
            "recordatorios_enviados",
        ]

    def get_empresa_nombre(self, obj):
        if obj.orden_trabajo_v3_id:
            return getattr(obj.orden_trabajo_v3.empresa, "nombre", None)
        return getattr(getattr(obj.orden_trabajo, "empresa", None), "nombre", None)

    def get_numero_ot(self, obj):
        if obj.orden_trabajo_v3_id:
            return obj.orden_trabajo_v3_id
        return getattr(obj.orden_trabajo, "id", None)

    def get_descripcion_ot(self, obj):
        if obj.orden_trabajo_v3_id:
            return obj.orden_trabajo_v3.titulo
        return getattr(obj.orden_trabajo, "descripcion", None)

    def get_tecnico_responsable_nombre(self, obj):
        if obj.orden_trabajo_v3_id:
            tecnico = obj.orden_trabajo_v3.tecnico_responsable
            if tecnico and hasattr(tecnico, "get_nombre_completo"):
                return tecnico.get_nombre_completo()
            return str(tecnico) if tecnico else None
        tecnico = getattr(obj.orden_trabajo, "tecnico_responsable_ot", None)
        if tecnico and hasattr(tecnico, "usuario"):
            return tecnico.usuario.get_nombre_completo() if hasattr(tecnico.usuario, "get_nombre_completo") else str(tecnico)
        return None

    def get_fecha_inicio_ot(self, obj):
        if obj.orden_trabajo_v3_id:
            return obj.orden_trabajo_v3.fecha_inicio_real
        return getattr(obj.orden_trabajo, "fecha_inicio_ot", None)

    def get_fecha_finalizacion_ot(self, obj):
        if obj.orden_trabajo_v3_id:
            return obj.orden_trabajo_v3.fecha_finalizacion_real
        return getattr(obj.orden_trabajo, "fecha_finalizacion_ot", None)

    def get_ya_respondida(self, obj):
        return obj.fecha_retroalimentacion is not None

    def get_vencida(self, obj):
        if not obj.fecha_vencimiento:
            return False
        return timezone.now() > obj.fecha_vencimiento

class RetroalimentacionAplicadaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RetroalimentacionAplicada
        fields = ['id', 'cantidad_estrellas', 'observaciones']
        read_only_fields = ['id']

class RetroalimentacionSerializer(serializers.ModelSerializer):
    retroalimentacion_aplicada = PreguntaAplicadaSerializer(many=True)
    datos_usuario = serializers.SerializerMethodField()

    class Meta:
        model = Retroalimentacion
        fields = '__all__'

    def get_datos_usuario(self, obj):
        if obj.usuario_empresa:
            return {
                "nombre": obj.usuario_empresa.usuario.get_nombre_completo(),
                "correo": obj.usuario_empresa.usuario.email
            }
        return None



