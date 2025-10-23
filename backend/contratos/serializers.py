from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from contratos.models import (
    ContratoEmpresaCliente,
    EnvioContratoFirmaUsuario,
    UsuarioVinculadoContrato,
    ContratoServicio,
    ContratoVisita,
    ContratoLicencia,
    ContratoCondicionEspecial,
    AcuerdoConfidencialidadContrato,
    Servicio,
    PlanServicio,
    CaracteristicaServicio,
    UsuarioVinculadoLicencia,
    Visita,
    Licencia,
    CondicionEspecial,
)
from core.models import AcuerdoConfidencialidadBase
from empresas.models import UsuarioEmpresa
from empresas.serializers import EmpresaContratoSerializer  # Importa el modelo de usuario vinculado a la empresa


# Serializador para CaracteristicaServicio
class CaracteristicaServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaracteristicaServicio
        fields = '__all__'

# Serializador para Servicio
class ServicioSerializer(serializers.ModelSerializer):
    caracteristicas = CaracteristicaServicioSerializer(many=True, read_only=True)
    categoria_label = serializers.SerializerMethodField()

    class Meta:
        model = Servicio
        fields = '__all__'

    def get_categoria_label(self, obj):
        return obj.get_categoria_display()

# Serializador para PlanServicio
class PlanServicioSerializer(serializers.ModelSerializer):
    servicios = ServicioSerializer(many=True, read_only=True)

    class Meta:
        model = PlanServicio
        fields = '__all__'

# Serializador para Visita
class VisitaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Visita
        fields = '__all__'

# Serializador para Licencia
class LicenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Licencia
        fields = '__all__'

# Serializador para CondicionEspecial
class CondicionEspecialSerializer(serializers.ModelSerializer):
    class Meta:
        model = CondicionEspecial
        fields = '__all__'

# Serializador para ContratoServicio
class ContratoServicioSerializer(serializers.ModelSerializer):
    # Mostramos en forma anidada el servicio o plan relacionado según el content_type
    servicio_generico = serializers.SerializerMethodField()
    contrato = serializers.PrimaryKeyRelatedField(read_only=True)
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = ContratoServicio
        fields = '__all__'

    def get_servicio_generico(self, obj):
        if obj.content_type.model == 'servicio':
            return ServicioSerializer(obj.servicio_generico).data
        elif obj.content_type.model == 'planservicio':
            return PlanServicioSerializer(obj.servicio_generico).data
        return None

    def get_nombre(self, obj):
        if obj.servicio_generico:
            return obj.servicio_generico.nombre
        else:
            return ""

# Serializador para ContratoVisita
class ContratoVisitaSerializer(serializers.ModelSerializer):
    # visita = VisitaSerializer(read_only=True)
    contrato = serializers.PrimaryKeyRelatedField(read_only=True)
    descripcion_visita = serializers.SerializerMethodField()
    frecuencia_label = serializers.SerializerMethodField()

    class Meta:
        model = ContratoVisita
        fields = '__all__'

    def get_descripcion_visita(self, obj):
        return obj.visita.descripcion

    def get_frecuencia_label(self, obj):
        return obj.get_frecuencia_display()

class UsuarioVinculadoLicenciaSerializer(serializers.ModelSerializer):
    datos_usuario = serializers.SerializerMethodField()

    class Meta:
        model = UsuarioVinculadoLicencia
        fields = '__all__'

    def get_datos_usuario(self, obj):
        return {
            "nombre": obj.usuario.usuario.get_nombre_completo(),
            "correo": obj.usuario.usuario.email
        } if obj.usuario else None

# class ContratoLicenciaVinculoUsuarioSerializer(serializers.ModelSerializer):
class ContratoLicenciaSerializer(serializers.ModelSerializer):
    tipo_modalidad_label = serializers.SerializerMethodField()
    nombre_licencia = serializers.SerializerMethodField()
    proveedor_licencia = serializers.SerializerMethodField()
    tipo_moneda_label = serializers.SerializerMethodField()
    licencias_disponibles  = serializers.SerializerMethodField()
    fecha_inicio_edicion = serializers.SerializerMethodField()
    fecha_fin_edicion = serializers.SerializerMethodField()
    nombre_contrato = serializers.SerializerMethodField()
    se_puede_reducir = serializers.SerializerMethodField()
    dias_restantes_licencia = serializers.SerializerMethodField()

    class Meta:
        model = ContratoLicencia
        fields = '__all__'

    def get_tipo_modalidad_label(self, obj):
        return obj.get_tipo_modalidad_display()

    def get_nombre_licencia(self, obj):
        return obj.licencia.nombre

    def get_proveedor_licencia(self, obj):
        return obj.licencia.proveedor

    def get_tipo_moneda_label(self, obj):
        return obj.get_tipo_moneda_display()

    def get_licencias_disponibles(self, obj):
        """
        Calcula cuántas licencias quedan libres:
        total contratado menos las ya vinculadas.
        """
        asignadas = obj.vinculos_licencia.count()
        # print(obj._inicio_periodo())
        return max(obj.cantidad - asignadas, 0)

    def get_fecha_inicio_edicion(self, obj):
        """
        Fecha en que comienza la ventana de edición
        (propiedad inicio_periodo_actual en el modelo).
        """
        inicio = obj.inicio_periodo_actual
        return inicio.isoformat() if inicio else None

    def get_fecha_fin_edicion(self, obj):
        """
        Fecha en que termina la ventana de edición
        (propiedad fin_periodo_actual en el modelo).
        """
        fin = obj.fin_periodo_actual
        return fin.isoformat() if fin else None

    def get_nombre_contrato(self, obj):
        return obj.contrato.nombre

    def get_se_puede_reducir(self, obj):
        return obj.puede_reducir

    def get_dias_restantes_licencia(self, obj):
        return obj.dias_restantes_licencia

# Serializador para ContratoLicencia
# class ContratoLicenciaSerializer(serializers.ModelSerializer):
#     #licencia = LicenciaSerializer(read_only=True)
#     contrato = serializers.PrimaryKeyRelatedField(read_only=True)
#     tipo_modalidad_label = serializers.SerializerMethodField()
#     nombre_licencia = serializers.SerializerMethodField()
#     proveedor_licencia = serializers.SerializerMethodField()
#     tipo_moneda_label = serializers.SerializerMethodField()

#     class Meta:
#         model = ContratoLicencia
#         fields = '__all__'

#     def get_tipo_modalidad_label(self, obj):
#         return obj.get_tipo_modalidad_display()

#     def get_nombre_licencia(self, obj):
#         return obj.licencia.nombre

#     def get_proveedor_licencia(self, obj):
#         return obj.licencia.proveedor

#     def get_tipo_moneda_label(self, obj):
#         return obj.get_tipo_moneda_display()

# Serializador para ContratoCondicionEspecial
class ContratoCondicionEspecialSerializer(serializers.ModelSerializer):
    #condicion = CondicionEspecialSerializer(read_only=True)
    contrato = serializers.PrimaryKeyRelatedField(read_only=True)
    titulo_condicion = serializers.SerializerMethodField()
    descripcion_condicion = serializers.SerializerMethodField()

    class Meta:
        model = ContratoCondicionEspecial
        fields = '__all__'

    def get_titulo_condicion(self, obj):
        return obj.condicion.titulo

    def get_descripcion_condicion(self, obj):
        return obj.condicion.descripcion
        

# Serializador para AcuerdoConfidencialidadContrato
class AcuerdoConfidencialidadContratoSerializer(serializers.ModelSerializer):
    # Se muestran las claves primarias para las relaciones.
    contrato = serializers.PrimaryKeyRelatedField(read_only=True)
    titulo_acuerdo = serializers.SerializerMethodField()
    contenido_acuerdo = serializers.SerializerMethodField()

    class Meta:
        model = AcuerdoConfidencialidadContrato
        fields = '__all__'

    def get_titulo_acuerdo(self, obj):
        return obj.acuerdo_base.titulo

    def get_contenido_acuerdo(self, obj):
        return obj.acuerdo_base.contenido

# Serializador para UsuarioVinculadoContrato
class UsuarioVinculadoContratoSerializer(serializers.ModelSerializer):
    usuario = serializers.PrimaryKeyRelatedField(queryset=UsuarioEmpresa.objects.all())
    contrato = serializers.PrimaryKeyRelatedField(read_only=True)
    datos_usuario = serializers.SerializerMethodField()
    tipo_usuario_label = serializers.SerializerMethodField()
    existe_envio = serializers.SerializerMethodField()

    class Meta:
        model = UsuarioVinculadoContrato
        fields = '__all__'

    def get_datos_usuario(self, obj):
        return {"nombre": obj.usuario.usuario.get_nombre_completo(), "email": obj.usuario.usuario.email}

    def get_tipo_usuario_label(self, obj):
        return obj.get_tipo_usuario_display()

    def get_existe_envio(self, obj):
        if EnvioContratoFirmaUsuario.objects.filter(usuario=obj).exists():
            return EnvioContratoFirmaUsuario.objects.filter(usuario=obj).first().pk
        else:
            return None

# Serializador para ContratoEmpresaCliente
class ContratoEmpresaClienteSerializer(serializers.ModelSerializer):
    # Mostramos los datos de las relaciones a través de inlines de solo lectura.
    contrato_servicios = ContratoServicioSerializer(many=True, read_only=True)
    contrato_visitas = ContratoVisitaSerializer(many=True, read_only=True)
    contrato_licencias = ContratoLicenciaSerializer(many=True, read_only=True)
    contrato_condiciones_especiales = ContratoCondicionEspecialSerializer(many=True, read_only=True)
    # La relación ManyToMany mediante el modelo intermedio se accede mediante el related_name "vinculos_contrato"
    vinculos_contrato = UsuarioVinculadoContratoSerializer(many=True, read_only=True)
    firmas_confidencialidad = AcuerdoConfidencialidadContratoSerializer(many=True, read_only=True)
    estado_label = serializers.SerializerMethodField()
    valido = serializers.SerializerMethodField()
    datos_empresa = serializers.SerializerMethodField()
    datos_cliente = serializers.SerializerMethodField()
    tipo_label = serializers.SerializerMethodField()

    class Meta:
        model = ContratoEmpresaCliente
        fields = '__all__'

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_valido(self, obj):
        # Verifica que el contrato tenga estado 'activo'
        if obj.estado != 'activo':
            return False
        # Verifica que exista al menos una firma de acuerdo de confidencialidad
        if not obj.firmas_confidencialidad.exists():
            return False
        # Verifica que exista al menos un usuario vinculado
        if not obj.vinculos_contrato.exists():
            return False
        # Verifica que exista al menos un servicio asociado al contrato
        if not obj.contrato_servicios.exists():
            return False
        return True

    def get_nombre_empresa(self, obj):
        return obj.empresa_prestadora.nombre

    def get_nombre_cliente(self, obj):
        return obj.empresa_cliente.nombre

    def get_datos_empresa(self, obj):
        return EmpresaContratoSerializer(obj.empresa_prestadora, read_only=True).data

    def get_datos_cliente(self, obj):
        return EmpresaContratoSerializer(obj.empresa_cliente, read_only=True).data

    def get_tipo_label(self, obj):
        return obj.get_tipo_display()

class EnvioContratoFirmaUsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnvioContratoFirmaUsuario
        fields = '__all__'