from rest_framework import serializers

from .models import (
    AdjuntoDeOrden,
    CierreAdministrativoOT,
    HistorialCambiosOrden,
    OrdenDeTrabajo,
    RendicionEnOt,
    ServicioEnOT,
    SoporteTecnico,
    UsuarioAsignadoSoporte,
)


class OrdenDeTrabajoSerializer(serializers.ModelSerializer):
    soporte_tecnico_count = serializers.IntegerField(
        source="soportetecnico_set.count", read_only=True
    )
    servicios_count = serializers.IntegerField(
        source="servicioenot_set.count", read_only=True
    )
    cierre_administrativo = serializers.SerializerMethodField()

    empresa_nombre = serializers.SerializerMethodField()
    cliente_nombre = serializers.SerializerMethodField()
    estado_label = serializers.SerializerMethodField()
    prioridad_label = serializers.SerializerMethodField()
    tipo_servicio_label = serializers.SerializerMethodField()
    ultimo_historial = serializers.SerializerMethodField()
    nombre_solicitante = serializers.SerializerMethodField()
    nombre_responsable = serializers.SerializerMethodField()

    def get_empresa_nombre(self, obj):
        return obj.empresa.nombre

    def get_cliente_nombre(self, obj):
        return obj.cliente.nombre

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_prioridad_label(self, obj):
        return obj.get_prioridad_display()

    def get_tipo_servicio_label(self, obj):
        return obj.get_tipo_servicio_display()

    def get_ultimo_historial(self, obj):
        histo = HistorialCambiosOrden.objects.filter(orden=obj)
        if histo.exists():
            return HistorialCambiosOrdenSerializer(histo.first()).data
        else:
            return None

    def get_nombre_solicitante(self, obj):
        if obj.cliente_solicitante:
            return obj.cliente_solicitante.usuario.get_nombre_completo()
        else:
            return None

    def get_nombre_responsable(self, obj):
        if obj.tecnico_responsable_ot:
            return obj.tecnico_responsable_ot.usuario.get_nombre_completo()
        else:
            return None

    def get_cierre_administrativo(self, obj):
        if hasattr(obj, "cierre_administrativo_v2"):
            return CierreAdministrativoOTSerializer(obj.cierre_administrativo_v2).data
        return None

    class Meta:
        model = OrdenDeTrabajo
        fields = "__all__"


class SoporteTecnicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SoporteTecnico
        fields = [
            "id",
            "orden",
            "nombre",
            "descripcion",
            "estado",
            "tecnico_asignado",
            "fecha_soporte",
            "fecha_creacion",
            "fecha_modificacion",
        ]


class UsuarioAsignadoSoporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsuarioAsignadoSoporte
        fields = [
            "id",
            "soporte_tecnico",
            "usuario_equipo",
            "trabajo_realizado",
            "resuelto",
            "fecha_creacion",
            "fecha_modificacion",
        ]


class ServicioEnOTSerializer(serializers.ModelSerializer):
    estado_label = serializers.SerializerMethodField()
    nombre_tecnico = serializers.SerializerMethodField()

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_nombre_tecnico(self, obj):
        if obj.tecnico_asignado:
            return obj.tecnico_asignado.usuario.get_nombre_completo()
        return None

    class Meta:
        model = ServicioEnOT
        fields = [
            "id",
            "orden",
            "nombre",
            "descripcion",
            "estado",
            "estado_label",
            "tecnico_asignado",
            "nombre_tecnico",
            "resuelto",
            "fecha_servicio",
            "fecha_creacion",
            "fecha_modificacion",
        ]


class HistorialCambiosOrdenSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source="usuario.nombre", read_only=True)

    class Meta:
        model = HistorialCambiosOrden
        fields = [
            "id",
            "orden",
            "fecha_cambio",
            "estado_anterior",
            "estado_actual",
            "comentario",
            "usuario",
            "usuario_nombre",
            "fecha_creacion",
        ]
        read_only_fields = fields  # Historial es sólo lectura aquí


class AdjuntoDeOrdenSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdjuntoDeOrden
        fields = [
            "id",
            "orden",
            "tipo",
            "archivo",
            "descripcion",
            "fecha_creacion",
            "fecha_modificacion",
        ]


class RendicionEnOtSerializer(serializers.ModelSerializer):
    class Meta:
        model = RendicionEnOt
        fields = [
            "id",
            "orden",
            "categoria",
            "detalle",
            "cantidad",
            "monto_unitario",
            "monto_total",
            "usuario_comprador",
            "fecha_compra",
            "fecha_creacion",
            "fecha_modificacion",
        ]
        read_only_fields = ["monto_total"]


class CierreAdministrativoOTSerializer(serializers.ModelSerializer):
    class Meta:
        model = CierreAdministrativoOT
        fields = [
            "id",
            "orden",
            "usuario",
            "fecha_cierre",
            "valido",
            "resultado",
            "comentario",
            "fecha_creacion",
            "fecha_modificacion",
        ]
        read_only_fields = ["fecha_cierre", "fecha_creacion", "fecha_modificacion"]
