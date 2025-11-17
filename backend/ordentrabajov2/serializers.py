from rest_framework import serializers
from .models import (
    OrdenDeTrabajo,
    SoporteTecnico,
    UsuarioAsignadoSoporte,
    ServicioEnOT,
    HistorialCambiosOrden,
    AdjuntoDeOrden,
    RendicionEnOt,
    CierreAdministrativoOT,
)


class OrdenDeTrabajoSerializer(serializers.ModelSerializer):
    soporte_tecnico_count = serializers.IntegerField(source='soportetecnico_set.count', read_only=True)
    servicios_count = serializers.IntegerField(source='servicioenot_set.count', read_only=True)
    cierre_administrativo = serializers.SerializerMethodField()

    class Meta:
        model = OrdenDeTrabajo
        fields = [
            'id','empresa','cliente','tipo_servicio','fecha_inicio_ot','fecha_finalizacion_ot','estado',
            'descripcion','prioridad','notas_internas','tecnico_responsable_ot','cliente_solicitante',
            'soporte_tecnico_count','servicios_count','cierre_administrativo','fecha_creacion','fecha_modificacion'
        ]

    def get_cierre_administrativo(self, obj):
        if hasattr(obj, 'cierre_administrativo_v2'):
            return CierreAdministrativoOTSerializer(obj.cierre_administrativo_v2).data
        return None


class SoporteTecnicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SoporteTecnico
        fields = ['id','orden','nombre','descripcion','estado','tecnico_asignado','fecha_soporte','fecha_creacion','fecha_modificacion']


class UsuarioAsignadoSoporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsuarioAsignadoSoporte
        fields = ['id','soporte_tecnico','usuario_equipo','trabajo_realizado','resuelto','fecha_creacion','fecha_modificacion']


class ServicioEnOTSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicioEnOT
        fields = ['id','orden','nombre','descripcion','estado','tecnico_asignado','resuelto','fecha_servicio','fecha_creacion','fecha_modificacion']


class HistorialCambiosOrdenSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True)

    class Meta:
        model = HistorialCambiosOrden
        fields = ['id','orden','fecha_cambio','estado_anterior','estado_actual','comentario','usuario','usuario_nombre','fecha_creacion']
        read_only_fields = fields  # Historial es sólo lectura aquí


class AdjuntoDeOrdenSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdjuntoDeOrden
        fields = ['id','orden','tipo','archivo','descripcion','fecha_creacion','fecha_modificacion']


class RendicionEnOtSerializer(serializers.ModelSerializer):
    class Meta:
        model = RendicionEnOt
        fields = ['id','orden','categoria','detalle','cantidad','monto_unitario','monto_total','usuario_comprador','fecha_compra','fecha_creacion','fecha_modificacion']
        read_only_fields = ['monto_total']


class CierreAdministrativoOTSerializer(serializers.ModelSerializer):
    class Meta:
        model = CierreAdministrativoOT
        fields = ['id','orden','usuario','fecha_cierre','valido','resultado','comentario','fecha_creacion','fecha_modificacion']
        read_only_fields = ['fecha_cierre','fecha_creacion','fecha_modificacion']
