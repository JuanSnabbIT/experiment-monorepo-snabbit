from rest_framework import serializers
from core.models import Software
from .models import *


class SoftwareInstaladoSerializer(serializers.ModelSerializer):
    nombre_software = serializers.SerializerMethodField()

    class Meta:
        fields = '__all__'
        model = SoftwareInstalado

    def get_nombre_software(self, obj):
        if isinstance(obj.software, Software):
            return obj.software.nombre
        return obj.software.software.nombre

class AlmacenamientoEquipoSerializer(serializers.ModelSerializer):
    almacenamiento_label = serializers.SerializerMethodField()

    class Meta:
        model = AlmacenamientoEquipo
        fields = '__all__'

    def get_almacenamiento_label(self, obj):
        return obj.get_almacenamiento_display()

class MonitorEquipoSerializer(serializers.ModelSerializer):
    class Meta:
        fields = '__all__'
        model = MonitorEquipo

class FotoEquipoSerializer(serializers.ModelSerializer):
    nombre_usuario = serializers.SerializerMethodField()

    class Meta:
        fields = '__all__'
        model = FotoEquipo

    def get_nombre_usuario(self, obj):
        return obj.usuario_equipo.usuario.usuario.get_nombre_completo()

class EquipoSerializer(serializers.ModelSerializer):
    tipo_equipo_label = serializers.SerializerMethodField()
    marca_label = serializers.SerializerMethodField()
    tipo_procesador_label = serializers.SerializerMethodField()
    generacion_procesador_label = serializers.SerializerMethodField()
    ram_label = serializers.SerializerMethodField()
    sistema_operativo_label = serializers.SerializerMethodField()
    condicion_equipo_label = serializers.SerializerMethodField()
    marca_tarjeta_grafica_label = serializers.SerializerMethodField()
    tipo_tarjeta_grafica_label = serializers.SerializerMethodField()
    datos_almacenamiento = AlmacenamientoEquipoSerializer(source="almacenamientoequipo_set", read_only=True, many=True)
    datos_monitor = MonitorEquipoSerializer(source="monitorequipo_set", read_only=True, many=True)
    datos_software = SoftwareInstaladoSerializer(source="softwareinstalado_set", read_only=True, many=True)
    nombre_usuario_asignado = serializers.SerializerMethodField()
    empresa_propietaria_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Equipo
        fields = '__all__'

    def get_nombre_usuario_asignado(self, obj):
        usuario_equipo = obj.usuario_equipo.filter(estado=True).first()
        if usuario_equipo:
            return usuario_equipo.usuario.usuario.get_nombre_completo()
        return None 

    def get_empresa_propietaria_nombre(self, obj):
        if obj.empresa_propietaria:
            return obj.empresa_propietaria.nombre
        registrado_por = getattr(obj, "registrado_por", None)
        if registrado_por and getattr(registrado_por, "sucursal", None):
            return registrado_por.sucursal.empresa.nombre
        return None

    def get_tipo_equipo_label(self, obj):
        return obj.get_tipo_equipo_display()

    def get_marca_label(self, obj):
        return obj.get_marca_display()

    def get_tipo_procesador_label(self, obj):
        return obj.get_tipo_procesador_display()

    def get_generacion_procesador_label(self, obj):
        return obj.get_generacion_procesador_display()

    def get_ram_label(self, obj):
        return obj.get_ram_display()

    def get_sistema_operativo_label(self, obj):
        return obj.get_sistema_operativo_display()

    def get_condicion_equipo_label(self, obj):
        return obj.get_condicion_equipo_display()

    def get_marca_tarjeta_grafica_label(self, obj):
        return obj.get_marca_tarjeta_grafica_display()

    def get_tipo_tarjeta_grafica_label(self, obj):
        return obj.get_tipo_tarjeta_grafica_display()

class UsuarioEquipoSerializer(serializers.ModelSerializer):
    nombre_usuario = serializers.SerializerMethodField()
    datos_equipo = EquipoSerializer(source="equipo", read_only=True)
    foto_usuario = serializers.SerializerMethodField()
    tarea_otv3 = serializers.SerializerMethodField()
    item_guia_origen = serializers.SerializerMethodField()

    def get_nombre_usuario(self, obj):
        return obj.usuario.usuario.get_nombre_completo()

    def get_foto_usuario(self, obj):
        if obj.usuario.usuario.image:
            return obj.usuario.usuario.image.url
        return None

    def get_tarea_otv3(self, obj):
        if not obj.tarea_otv3:
            return None
        return {
            'id': obj.tarea_otv3.id,
            'titulo': obj.tarea_otv3.titulo,
            'orden_id': obj.tarea_otv3.orden_id,
            'tipo_tarea': obj.tarea_otv3.tipo_tarea,
        }

    def get_item_guia_origen(self, obj):
        if not obj.item_guia_origen:
            return None
        return {
            'id': obj.item_guia_origen.id,
            'numero_serie': getattr(obj.item_guia_origen, 'numero_serie', None),
            'item_id': getattr(obj.item_guia_origen, 'stock_item_id', None),
        }

    class Meta:
        fields = '__all__'
        model = UsuarioEquipo

class UsuarioEquipoListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listar UsuarioEquipo sin datos completos del equipo"""
    nombre_usuario = serializers.SerializerMethodField()
    rut_usuario = serializers.SerializerMethodField()
    email_usuario = serializers.SerializerMethodField()
    cargo_usuario = serializers.SerializerMethodField()
    numero_serie_equipo = serializers.CharField(source='equipo.numero_serie', read_only=True)
    tipo_equipo = serializers.CharField(source='equipo.get_tipo_equipo_display', read_only=True)
    marca_equipo = serializers.CharField(source='equipo.marca', read_only=True)
    foto_usuario = serializers.SerializerMethodField()
    datos_equipo = EquipoSerializer(source="equipo", read_only=True)
    tarea_otv3 = serializers.SerializerMethodField()
    item_guia_origen = serializers.SerializerMethodField()

    class Meta:
        model = UsuarioEquipo
        fields = [
            'id', 'nombre_usuario', 'rut_usuario', 'email_usuario', 'cargo_usuario',
            'equipo', 'usuario', 'numero_serie_equipo', 'tipo_equipo', 'marca_equipo',
            'datos_equipo',
            'fecha_asignacion', 'fecha_devolucion', 'estado', 'observaciones',
            'foto_usuario', 'tarea_otv3', 'item_guia_origen', 'fecha_creacion', 'fecha_modificacion'
        ]

    def get_nombre_usuario(self, obj):
        return obj.usuario.usuario.get_nombre_completo()

    def get_rut_usuario(self, obj):
        return obj.usuario.usuario.rut

    def get_email_usuario(self, obj):
        return obj.usuario.usuario.email

    def get_cargo_usuario(self, obj):
        return obj.usuario.cargo if obj.usuario.cargo else 'N/A'

    def get_foto_usuario(self, obj):
        if obj.usuario.usuario.image:
            return obj.usuario.usuario.image.url
        return None

    def get_tarea_otv3(self, obj):
        if not obj.tarea_otv3:
            return None
        return {
            'id': obj.tarea_otv3.id,
            'titulo': obj.tarea_otv3.titulo,
            'orden_id': obj.tarea_otv3.orden_id,
            'tipo_tarea': obj.tarea_otv3.tipo_tarea,
        }

    def get_item_guia_origen(self, obj):
        if not obj.item_guia_origen:
            return None
        return {
            'id': obj.item_guia_origen.id,
            'numero_serie': getattr(obj.item_guia_origen, 'numero_serie', None),
            'item_id': getattr(obj.item_guia_origen, 'stock_item_id', None),
        }

class EquipoDetalleCompletoSerializer(serializers.ModelSerializer):
    """Serializer con información completa del equipo incluyendo todas sus relaciones"""
    tipo_equipo_label = serializers.SerializerMethodField()
    marca_label = serializers.SerializerMethodField()
    tipo_procesador_label = serializers.SerializerMethodField()
    generacion_procesador_label = serializers.SerializerMethodField()
    ram_label = serializers.SerializerMethodField()
    sistema_operativo_label = serializers.SerializerMethodField()
    condicion_equipo_label = serializers.SerializerMethodField()
    marca_tarjeta_grafica_label = serializers.SerializerMethodField()
    tipo_tarjeta_grafica_label = serializers.SerializerMethodField()
    
    # Relaciones completas
    almacenamientos = AlmacenamientoEquipoSerializer(source="almacenamientoequipo_set", read_only=True, many=True)
    monitores = MonitorEquipoSerializer(source="monitorequipo_set", read_only=True, many=True)
    software_instalado = SoftwareInstaladoSerializer(source="softwareinstalado_set", read_only=True, many=True)
    fotos = serializers.SerializerMethodField()
    
    # Información del cliente
    nombre_cliente = serializers.CharField(source='cliente.nombre', read_only=True)
    rut_cliente = serializers.CharField(source='cliente.rut_empresa', read_only=True)
    
    # Información del usuario actual asignado
    usuario_actual = serializers.SerializerMethodField()

    class Meta:
        model = Equipo
        fields = '__all__'

    def get_usuario_actual(self, obj):
        usuario_equipo = obj.usuario_equipo.filter(estado=True).first()
        if usuario_equipo:
            return {
                'id': usuario_equipo.id,
                'nombre': usuario_equipo.usuario.usuario.get_nombre_completo(),
                'rut': usuario_equipo.usuario.usuario.rut,
                'email': usuario_equipo.usuario.usuario.email,
                'cargo': usuario_equipo.usuario.cargo,
                'fecha_asignacion': usuario_equipo.fecha_asignacion,
                'observaciones': usuario_equipo.observaciones
            }
        return None

    def get_fotos(self, obj):
        fotos = FotoEquipo.objects.filter(usuario_equipo__equipo=obj)
        return FotoEquipoSerializer(fotos, many=True).data

    def get_tipo_equipo_label(self, obj):
        return obj.get_tipo_equipo_display()

    def get_marca_label(self, obj):
        return obj.get_marca_display()

    def get_tipo_procesador_label(self, obj):
        return obj.get_tipo_procesador_display()

    def get_generacion_procesador_label(self, obj):
        return obj.get_generacion_procesador_display()

    def get_ram_label(self, obj):
        return obj.get_ram_display()

    def get_sistema_operativo_label(self, obj):
        return obj.get_sistema_operativo_display()

    def get_condicion_equipo_label(self, obj):
        return obj.get_condicion_equipo_display()

    def get_marca_tarjeta_grafica_label(self, obj):
        return obj.get_marca_tarjeta_grafica_display()

    def get_tipo_tarjeta_grafica_label(self, obj):
        return obj.get_tipo_tarjeta_grafica_display()

class SoftwareDeEmpresaSerializer(serializers.ModelSerializer):
    nombre_empresa = serializers.SerializerMethodField()

    class Meta:
        fields = '__all__'
        model = SoftwareDeEmpresa

    def get_nombre_empresa(self, obj):
        return obj.software.nombre


class ItemAsignadoUsuarioSerializer(serializers.ModelSerializer):
    nombre_item = serializers.SerializerMethodField()
    nombre_usuario = serializers.SerializerMethodField()
    nombre_item_guia = serializers.SerializerMethodField()

    class Meta:
        model = ItemAsignadoUsuario
        fields = [
            'id', 'usuario', 'nombre_usuario',
            'stock_item', 'nombre_item',
            'item_guia_origen', 'nombre_item_guia',
            'cantidad', 'estado', 'fecha_devolucion',
            'observaciones', 'fecha_creacion', 'fecha_modificacion',
        ]
        read_only_fields = ['fecha_creacion', 'fecha_modificacion']

    def get_nombre_item(self, obj):
        try:
            return obj.stock_item.item.nombre
        except Exception:
            return None

    def get_nombre_usuario(self, obj):
        try:
            return str(obj.usuario)
        except Exception:
            return None

    def get_nombre_item_guia(self, obj):
        try:
            return obj.stock_item.item.nombre
        except Exception:
            return None
