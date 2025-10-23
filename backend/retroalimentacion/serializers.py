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
    retroalimentacion_aplicada = PreguntaAplicadaSerializer(many=True)

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
            "retroalimentacion_aplicada"
        ]
        read_only_fields = [
            "uuid",
            "orden_trabajo",
            "usuario_empresa",
            "usuario_externo",
            "correo_usuario_externo",
            "fecha_retroalimentacion"
        ]

    # def update(self, instance, validated_data):
    #     if instance.fecha_retroalimentacion:
    #         raise serializers.ValidationError("Esta retroalimentación ya fue respondida.")

    #     aplicada_data = self.initial_data.get("retroalimentacion_aplicada", [])

    #     for item in aplicada_data:
    #         aplicacion_id = item.get("id")
    #         if not aplicacion_id:
    #             continue

    #         try:
    #             aplicacion = RetroalimentacionAplicada.objects.get(id=aplicacion_id, retroalimentacion=instance)
    #             aplicacion.cantidad_estrellas = item.get("cantidad_estrellas", aplicacion.cantidad_estrellas)
    #             aplicacion.observaciones = item.get("observaciones", aplicacion.observaciones)
    #             aplicacion.save()
    #         except RetroalimentacionAplicada.DoesNotExist:
    #             continue

    #     instance.fecha_retroalimentacion = timezone.now()
    #     instance.observacion_retroalimentacion = validated_data.get("observacion_retroalimentacion", instance.observacion_retroalimentacion)
    #     instance.save()

    #     return instance

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



