from rest_framework import serializers
from bodegas.models import GuiaSalida
from bodegas.serializers import CompraSerializer
from cotizaciones.models import Cotizacion
from retroalimentacion.models import Retroalimentacion
from .models import AdjuntoDeOrden, OrdenDeTrabajo, DetalleTrabajo, HistorialCambiosOrden, SeguimientoDetalleTrabajo, DetalleGastoRendicionOT, UsuarioAsignadoOT
from django.contrib.contenttypes.models import ContentType

class GuiaSalidaMiniSerializer(serializers.ModelSerializer):
    cantidad_items = serializers.SerializerMethodField()
    estado_label = serializers.SerializerMethodField()

    class Meta:
        model  = GuiaSalida
        fields = ("id", "motivo", "cantidad_items", "estado", "estado_label")

    def get_cantidad_items(self, obj):
        return obj.items.count()

    def get_estado_label(self, obj):
        return obj.get_estado_display()

class DetalleGuiaSerializer(serializers.ModelSerializer):
    """
    Serializa un DetalleTrabajo que corresponde a una Visita,
    incluyendo los datos resumidos de la GuiaSalida.
    """
    guia   = GuiaSalidaMiniSerializer(source="insumo")
    estado_label = serializers.SerializerMethodField()

    class Meta:
        model  = DetalleTrabajo
        fields = ("nombre", "descripcion", "estado", "guia", "estado_label", "id")

    def get_estado_label(self, obj):
        return obj.get_estado_display()

class OrdenDeTrabajoSerializer(serializers.ModelSerializer):
    empresa_nombre = serializers.SerializerMethodField()
    cliente_nombre = serializers.SerializerMethodField()
    estado_label = serializers.SerializerMethodField()
    prioridad_label = serializers.SerializerMethodField()
    ultimo_historial = serializers.SerializerMethodField()
    nombre_solicitante = serializers.SerializerMethodField()
    nombre_responsable = serializers.SerializerMethodField()
    # se_puede_completar = serializers.SerializerMethodField()

    def get_empresa_nombre(self, obj):
        return obj.empresa.nombre

    def get_cliente_nombre(self, obj):
        return obj.cliente.nombre

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_prioridad_label(self, obj):
        return obj.get_prioridad_display()

    def get_ultimo_historial(self, obj):
        histo = HistorialCambiosOrden.objects.filter(orden=obj)
        if histo.exists():
            return HistorialCambiosOrdenSerializer(histo.first()).data
        else:
            return None

    def get_nombre_solicitante(self, obj):
        if obj.solicitante_empresa:
            return obj.solicitante_empresa.usuario.get_nombre_completo()
        else:
            return None

    def get_nombre_responsable(self, obj):
        if obj.responsable_empresa:
            return obj.responsable_empresa.usuario.get_nombre_completo()
        else:
            return None

    # def get_se_puede_completar(self, obj):
    #     # traemos todos los detalles de la orden
    #     detalles = DetalleTrabajo.objects.filter(orden=obj).select_related('insumo', 'content_type')

    #     # si no hay detalles, devolvemos False (o True, según tu criterio)
    #     if not detalles.exists():
    #         return True

    #     for det in detalles:
    #         # 1) estado del detalle debe estar en estos tres
    #         if det.estado not in ['medianamente_completado', 'completado', 'no_realizado']:
    #             return False

    #         # 2) si tiene insumo, su estado debe ser 'T', 'R' o 'PR'
    #         if det.insumo and det.insumo.estado not in ['T', 'R', 'PR']:
    #             return False

    #         # 3) si el detalle referencia a una VisitaSoporte, esa visita debe estar completada o cerrada
    #         ct = det.content_type
    #         if ct.app_label == 'visitas' and ct.model == 'visitasoporte':
    #             visita = det.trabajo  # GenericForeignKey
    #             if visita.estado not in ['completada', 'cerrada']:
    #                 return False

    #     # si todo pasa las validaciones, devolvemos True
    #     return True

    class Meta:
        model = OrdenDeTrabajo
        fields = '__all__'

class DetalleTrabajoSerializer(serializers.ModelSerializer):
    estado_label = serializers.SerializerMethodField()
    nombre_tecnico = serializers.SerializerMethodField()
    estado_insumo = serializers.SerializerMethodField()
    estado_visita = serializers.SerializerMethodField()
    codigo_cotizacion = serializers.SerializerMethodField()

    class Meta:
        model = DetalleTrabajo
        fields = '__all__'

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_nombre_tecnico(self, obj):
        if obj.tecnico_asignado:
            return obj.tecnico_asignado.usuario.get_nombre_completo()
        else:
            return None

    def get_estado_insumo(self, obj):
        return obj.insumo.estado if obj.insumo else None

    def get_estado_visita(self, obj):
        return obj.trabajo.estado if obj.trabajo and obj.content_type and obj.content_type.model == "visitasoporte" else None

    def get_codigo_cotizacion(self, obj):
        if ContentType.objects.get_for_model(Cotizacion) == obj.content_type:
            return obj.trabajo.numero_cotizacion
        return None

class SeguimientoDetalleTrabajoSerializer(serializers.ModelSerializer):
    nombre_usuario = serializers.SerializerMethodField()

    class Meta:
        model = SeguimientoDetalleTrabajo
        fields = '__all__'

    def get_nombre_usuario(self, obj):
        return obj.usuario.usuario.get_nombre_completo() if obj.usuario else "Sin Usuario"

class HistorialCambiosOrdenSerializer(serializers.ModelSerializer):
    nombre_usuario = serializers.SerializerMethodField()

    class Meta:
        model = HistorialCambiosOrden
        fields = '__all__'

    def get_nombre_usuario(self, obj):
        return obj.usuario.usuario.get_nombre_completo()

class AdjuntoDeOrdenSerializer(serializers.ModelSerializer):
    tipo_label = serializers.SerializerMethodField()

    class Meta:
        model = AdjuntoDeOrden
        fields = '__all__'

    def get_tipo_label(self, obj):
        return obj.get_tipo_display()

class DetalleTrabajoCompraSerializer(serializers.ModelSerializer):
    estado_label = serializers.SerializerMethodField()
    nombre_tecnico = serializers.SerializerMethodField()
    compra = CompraSerializer(source="trabajo", read_only=True)
    estado_insumo = serializers.SerializerMethodField()

    class Meta:
        model = DetalleTrabajo
        fields = '__all__'

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_nombre_tecnico(self, obj):
        if obj.tecnico_asignado:
            return obj.tecnico_asignado.usuario.get_nombre_completo()
        else:
            return None

    def get_estado_insumo(self, obj):
        return obj.insumo.estado if obj.insumo else None

# class RetroalimentacionOTSerializer(serializers.ModelSerializer):
#     nombre_usuario = serializers.SerializerMethodField()
#     correo_usuario = serializers.SerializerMethodField()
#     vigente = serializers.SerializerMethodField()

#     class Meta:
#         model=RetroalimentacionOT
#         fields='__all__'
    
#     def get_nombre_usuario(self, obj):
#         return obj.usuario.usuario.get_nombre_completo() if obj.usuario else None

#     def get_correo_usuario(self, obj):
#         return obj.usuario.usuario.email if obj.usuario else None

#     def get_vigente(self, obj):
#         return obj.vigente

class OrdenDeTrabajoRetroalimentacion(serializers.ModelSerializer):
    class Meta:
        model = OrdenDeTrabajo
        fields = '__all__'

# class RetroalimentacionDetailSerializer(serializers.ModelSerializer):
#     orden = OrdenDeTrabajoSerializer(read_only=True)
#     vigente = serializers.SerializerMethodField()

#     class Meta:
#         model = RetroalimentacionOT
#         fields = [
#             'uuid',
#             'orden',
#             'usuario',
#             'nombre',
#             'correo',
#             'cantidad_visitas',
#             'cantidad_estrellas',
#             'observacion_retroalimentacion',
#             'fecha_retroalimentacion',
#             'vigente',
#         ]

#     def get_vigente(self, obj):
#         return obj.vigente

# class RetroalimentacionPatchSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = RetroalimentacionOT
#         fields = [
#             'cantidad_estrellas',
#             'observacion_retroalimentacion',
#             'fecha_retroalimentacion',
#         ]
#         extra_kwargs = {
#             'cantidad_estrellas': {'required': False},
#             'observacion_retroalimentacion': {'required': False},
#             'fecha_retroalimentacion': {'required': False},
#         }

class DetalleGastoRendicionOTSerializer(serializers.ModelSerializer):
    nombre_categoria = serializers.SerializerMethodField()
    descripcion_categoria = serializers.SerializerMethodField()

    class Meta:
        model = DetalleGastoRendicionOT
        fields = '__all__'

    def get_nombre_categoria(self, obj):
        return obj.categoria.nombre if obj.categoria else None

    def get_descripcion_categoria(self, obj):
        return obj.categoria.descripcion if obj.categoria else None

class UsuarioAsignadoOTSerializer(serializers.ModelSerializer):
    datos_usuario = serializers.SerializerMethodField()

    class Meta:
        model = UsuarioAsignadoOT
        fields = '__all__'

    def get_datos_usuario(self, obj):
        if obj.usuario_empresa:
            return {
                "nombre": obj.usuario_empresa.usuario.get_nombre_completo(),
                "correo": obj.usuario_empresa.usuario.email
            }
        return None

class RetroalimentacionSerializer(serializers.ModelSerializer):
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