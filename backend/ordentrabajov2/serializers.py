from django.db.models import Q
from rest_framework import serializers

from bodegas.models import GuiaSalida

from .models import (
    AdjuntoDeOrden,
    CierreAdministrativoOT,
    GastoOperativoEnOt,
    HistorialCambiosOrden,
    OrdenDeTrabajo,
    SeguimientoItemOT,
    ServicioEnOT,
    SoporteTecnico,
    UsuarioAsignadoSoporte,
)


class GuiaSalidaMiniSerializer(serializers.ModelSerializer):
    cantidad_items = serializers.SerializerMethodField()
    estado_label = serializers.SerializerMethodField()
    cliente_nombre = serializers.SerializerMethodField()

    class Meta:
        model = GuiaSalida
        fields = (
            "id",
            "motivo",
            "cantidad_items",
            "estado",
            "estado_label",
            "cliente",
            "cliente_nombre",
        )

    def get_cantidad_items(self, obj):
        return obj.items.count()

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_cliente_nombre(self, obj):
        if obj.cliente:
            return obj.cliente.nombre
        return "Sin Cliente"


class OrdenDeTrabajoSerializer(serializers.ModelSerializer):
    soporte_tecnico_count = serializers.IntegerField(
        source="soportetecnico_set.count", read_only=True
    )
    servicios_count = serializers.IntegerField(
        source="servicioenot_set.count", read_only=True
    )
    cierre_administrativo = serializers.SerializerMethodField()
    rendicion_asociada_id = serializers.SerializerMethodField()
    guias_salida = serializers.SerializerMethodField()

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

    prefactura_asociada_id = serializers.SerializerMethodField()

    def get_rendicion_asociada_id(self, obj):
        """Retorna el ID de la Rendición asociada si existe"""
        if hasattr(obj, "rendicion_asociada") and obj.rendicion_asociada:
            return obj.rendicion_asociada.id
        return None

    def get_prefactura_asociada_id(self, obj):
        if not obj.cliente_id:
            return None
        prefactura = (
            CierreAdministrativoOT.objects.filter(
                cliente_id=obj.cliente_id,
                estado_cierre__in=["borrador", "en_revision", "aprobado", "facturado", "pagado"],
            )
            .order_by("-fecha_creacion")
            .only("id", "resultado", "fecha_creacion")
            .iterator()
        )
        for cierre in prefactura:
            resultado = cierre.resultado or {}
            ots_incluidas = resultado.get("ots_incluidas", [])
            if isinstance(ots_incluidas, list) and obj.id in ots_incluidas:
                return cierre.id
        return None

    def get_guias_salida(self, obj):
        """Retorna lista de guías con su ID y estado para validación frontend"""
        from bodegas.models import GuiaSalida
        guias = GuiaSalida.objects.filter(orden_trabajo=obj).values('id', 'estado')
        return list(guias)

    class Meta:
        model = OrdenDeTrabajo
        fields = "__all__"


class SoporteTecnicoSerializer(serializers.ModelSerializer):
    estado_label = serializers.SerializerMethodField()
    nombre_tecnico = serializers.SerializerMethodField()
    usuarios_asignados_count = serializers.SerializerMethodField()
    usuarios_asignados_total = serializers.SerializerMethodField()
    usuarios_asignados_resueltos = serializers.SerializerMethodField()
    guia_salida = GuiaSalidaMiniSerializer(read_only=True)

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_nombre_tecnico(self, obj):
        if obj.tecnico_asignado:
            return obj.tecnico_asignado.usuario.get_nombre_completo()
        return None

    def get_usuarios_asignados_count(self, obj):
        return obj.usuarioasignadosoporte_set.filter(resuelto=False).count()

    def get_usuarios_asignados_total(self, obj):
        return obj.usuarioasignadosoporte_set.count()

    def get_usuarios_asignados_resueltos(self, obj):
        return obj.usuarioasignadosoporte_set.filter(resuelto=True).count()

    class Meta:
        model = SoporteTecnico
        fields = [
            "id",
            "orden",
            "nombre",
            "descripcion",
            "estado",
            "estado_label",
            "tecnico_asignado",
            "nombre_tecnico",
            "fecha_soporte",
            "guia_salida",
            "usuarios_asignados_count",
            "usuarios_asignados_total",
            "usuarios_asignados_resueltos",
            "fecha_creacion",
            "fecha_modificacion",
        ]


class UsuarioAsignadoSoporteSerializer(serializers.ModelSerializer):
    nombre_usuario = serializers.SerializerMethodField()
    numero_serie_equipo = serializers.SerializerMethodField()
    tipo_equipo = serializers.SerializerMethodField()
    equipo_id = serializers.SerializerMethodField()

    def get_nombre_usuario(self, obj):
        if obj.usuario_equipo:
            return obj.usuario_equipo.usuario.usuario.get_nombre_completo()
        if obj.usuario_empresa:
            return obj.usuario_empresa.usuario.get_nombre_completo()
        return None

    def get_numero_serie_equipo(self, obj):
        if obj.usuario_equipo:
            return obj.usuario_equipo.equipo.numero_serie
        return None

    def get_tipo_equipo(self, obj):
        if obj.usuario_equipo:
            return obj.usuario_equipo.equipo.get_tipo_equipo_display()
        return None

    def get_equipo_id(self, obj):
        if obj.usuario_equipo:
            return obj.usuario_equipo.equipo_id
        return None

    def validate(self, attrs):
        if self.instance is None:
            if not attrs.get("usuario_equipo") and not attrs.get("usuario_empresa"):
                raise serializers.ValidationError(
                    "Debe indicar 'usuario_equipo' o 'usuario_empresa'."
                )
            soporte = attrs.get("soporte_tecnico")
            if not soporte:
                view = self.context.get("view")
                soporte_pk = (
                    view.kwargs.get("soporte_tecnico_pk") if view and hasattr(view, "kwargs") else None
                )
                if soporte_pk:
                    soporte = SoporteTecnico.objects.filter(pk=soporte_pk).first()

            usuario_empresa = attrs.get("usuario_empresa")
            usuario_equipo = attrs.get("usuario_equipo")
            if soporte and (usuario_empresa or usuario_equipo):
                usuario_empresa_id = (
                    usuario_empresa.id if usuario_empresa else usuario_equipo.usuario_id
                )
                existe = UsuarioAsignadoSoporte.objects.filter(
                    soporte_tecnico__orden=soporte.orden,
                    resuelto=False,
                ).exclude(
                    soporte_tecnico=soporte
                ).filter(
                    Q(usuario_empresa_id=usuario_empresa_id)
                    | Q(usuario_equipo__usuario_id=usuario_empresa_id)
                )
                if existe.exists():
                    raise serializers.ValidationError(
                        "El usuario ya esta asignado a otro subtrabajo pendiente en esta OT."
                    )
        return attrs

    class Meta:
        model = UsuarioAsignadoSoporte
        fields = [
            "id",
            "soporte_tecnico",
            "usuario_equipo",
            "usuario_empresa",
            "nombre_usuario",
            "numero_serie_equipo",
            "tipo_equipo",
            "equipo_id",
            "trabajo_realizado",
            "resuelto",
            "cache_asignacion",
            "fecha_creacion",
            "fecha_modificacion",
        ]


class ServicioEnOTSerializer(serializers.ModelSerializer):
    estado_label = serializers.SerializerMethodField()
    nombre_tecnico = serializers.SerializerMethodField()
    guia_salida = GuiaSalidaMiniSerializer(read_only=True)

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
            "guia_salida",
            "resuelto",
            "fecha_servicio",
            "fecha_creacion",
            "fecha_modificacion",
        ]


class HistorialCambiosOrdenSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()
    nombre_usuario = serializers.SerializerMethodField()

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
            "nombre_usuario",
            "fecha_creacion",
        ]
        read_only_fields = [
            "id",
            "fecha_cambio",
            "fecha_creacion",
            "usuario",
            "usuario_nombre",
            "nombre_usuario",
            "orden",
        ]

    def get_usuario_nombre(self, obj):
        if obj.usuario and hasattr(obj.usuario, "usuario"):
            return obj.usuario.usuario.get_nombre_completo()
        if obj.usuario:
            return str(obj.usuario)
        return None

    def get_nombre_usuario(self, obj):
        return self.get_usuario_nombre(obj)


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


class GastoOperativoEnOtSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source="categoria.nombre", read_only=True)
    # Alias compatible con frontend (expected `nombre_categoria`)
    nombre_categoria = serializers.CharField(source="categoria.nombre", read_only=True)
    # Alias compatible con endpoint gastos-rendicion (expected `descripcion_categoria`)
    descripcion_categoria = serializers.CharField(
        source="categoria.nombre", read_only=True
    )

    fecha_gasto = serializers.DateTimeField(source="fecha_compra", read_only=True)

    def to_internal_value(self, data):
        mutable = data.copy()
        if 'fecha_gasto' in mutable and 'fecha_compra' not in mutable:
            mutable['fecha_compra'] = mutable['fecha_gasto']
        return super().to_internal_value(mutable)

    class Meta:
        model = GastoOperativoEnOt
        fields = [
            "id",
            "orden",
            "categoria",
            "categoria_nombre",
            "nombre_categoria",
            "descripcion_categoria",
            "detalle",
            "cantidad",
            "monto_unitario",
            "monto_total",
            "usuario_comprador",
            "fecha_compra",
            "fecha_gasto",
            "fecha_creacion",
            "fecha_modificacion",
        ]
        read_only_fields = ["monto_total"]


class CierreAdministrativoOTSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(
        source="cliente.nombre", read_only=True, allow_null=True
    )
    # Exponer directamente el JSON `resultado`
    resultado = serializers.JSONField(required=False)

    class Meta:
        model = CierreAdministrativoOT
        fields = [
            "id",
            "cliente",
            "cliente_nombre",
            "estado_cierre",
            "resultado",
            "creado_por",
            "actualizado_por",
            "comentario",
            "fecha_creacion",
            "fecha_modificacion",
        ]
        read_only_fields = ["fecha_creacion", "fecha_modificacion"]

    def validate_resultado(self, value):
        # Normalizar y asegurar llaves esperadas
        if value is None:
            return {}
        if not isinstance(value, dict):
            return {}
        value.setdefault("cliente_id", None)
        value.setdefault("ots_incluidas", [])
        value.setdefault("items", [])
        value.setdefault("resumen", {})
        return value


class SeguimientoItemOTSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()
    servicio_nombre = serializers.SerializerMethodField()
    soporte_nombre = serializers.SerializerMethodField()

    class Meta:
        model = SeguimientoItemOT
        fields = [
            "id",
            "orden",
            "servicio",
            "servicio_nombre",
            "soporte",
            "soporte_nombre",
            "usuario",
            "usuario_nombre",
            "tipo",
            "comentario",
            "fecha_creacion",
            "fecha_modificacion",
        ]
        read_only_fields = ["fecha_creacion", "fecha_modificacion"]

    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return obj.usuario.usuario.get_nombre_completo()
        return None

    def get_servicio_nombre(self, obj):
        if obj.servicio:
            return obj.servicio.nombre
        return None

    def get_soporte_nombre(self, obj):
        if obj.soporte:
            return obj.soporte.nombre
        return None
