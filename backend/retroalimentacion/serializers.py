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
    numero_ot = serializers.IntegerField(source="orden_trabajo.id", read_only=True)
    descripcion_ot = serializers.CharField(source="orden_trabajo.descripcion", read_only=True)
    tecnico_responsable_nombre = serializers.SerializerMethodField()
    fecha_inicio_ot = serializers.DateField(source="orden_trabajo.fecha_inicio_ot", read_only=True)
    fecha_finalizacion_ot = serializers.DateField(source="orden_trabajo.fecha_finalizacion_ot", read_only=True)
    ya_respondida = serializers.SerializerMethodField()

    class Meta:
        model = Retroalimentacion
        fields = [
            "uuid",
            "orden_trabajo",
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
        ]
        read_only_fields = [
            "uuid",
            "orden_trabajo",
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
        ]

    def get_empresa_nombre(self, obj):
        empresa = getattr(obj.orden_trabajo, 'empresa', None)
        return getattr(empresa, 'nombre', None)

    def get_tecnico_responsable_nombre(self, obj):
        tecnico = getattr(obj.orden_trabajo, 'tecnico_responsable_ot', None)
        if tecnico and hasattr(tecnico, 'usuario'):
            return tecnico.usuario.get_nombre_completo() if hasattr(tecnico.usuario, 'get_nombre_completo') else str(tecnico)
        return None

    def get_ya_respondida(self, obj):
        return obj.fecha_retroalimentacion is not None

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



