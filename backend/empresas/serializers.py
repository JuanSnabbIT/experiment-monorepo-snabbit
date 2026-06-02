from rest_framework import serializers
from .models import *
from bd_ciudades.models import Region, Provincia, Comuna

class SucursalEmpresaListaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SucursalEmpresa
        fields = ['id', 'nombre', 'direccion']

class EmpresaSerializer(serializers.ModelSerializer):
    sucursales = SucursalEmpresaListaSerializer(many=True, read_only=True)  # Añade el serializador anidado

    class Meta:
        model = Empresa
        fields = '__all__'

class SucursalEmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SucursalEmpresa
        fields = '__all__'

class CargaFamiliarSerializer(serializers.ModelSerializer):
    parentesco_label = serializers.SerializerMethodField()

    class Meta:
        model = CargaFamiliar
        fields = [
            'id', 'nombres', 'apellido_paterno', 'apellido_materno',
            'rut', 'fecha_nacimiento', 'parentesco', 'parentesco_label', 'is_activo',
        ]

    def get_parentesco_label(self, obj):
        return obj.get_parentesco_display()


class UsuarioEmpresaSerializer(serializers.ModelSerializer):
    nombre_usuario = serializers.SerializerMethodField()
    email_usuario = serializers.SerializerMethodField()
    papeleta = serializers.SerializerMethodField()
    estado_label = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(source="usuario.is_active", read_only=True)
    nombre_sucursal = serializers.SerializerMethodField()

    # Datos personales desde cuentas.User
    first_name = serializers.CharField(source="usuario.first_name", read_only=True)
    second_name = serializers.CharField(source="usuario.second_name", read_only=True, default=None)
    last_name = serializers.CharField(source="usuario.last_name", read_only=True)
    second_last_name = serializers.CharField(source="usuario.second_last_name", read_only=True, default=None)
    celular = serializers.CharField(source="usuario.celular", read_only=True, default=None)
    genero = serializers.CharField(source="usuario.genero", read_only=True, default=None)
    genero_label = serializers.SerializerMethodField()
    fecha_nacimiento = serializers.DateField(source="usuario.fecha_nacimiento", read_only=True, default=None)
    estado_civil = serializers.CharField(source="usuario.estado_civil", read_only=True, default=None)
    estado_civil_label = serializers.SerializerMethodField()
    nacionalidad = serializers.CharField(source="usuario.nacionalidad", read_only=True, default=None)
    direccion = serializers.CharField(source="usuario.direccion", read_only=True, default=None)
    region = serializers.IntegerField(source="usuario.region", read_only=True, default=None)
    provincia = serializers.IntegerField(source="usuario.provincia", read_only=True, default=None)
    comuna = serializers.IntegerField(source="usuario.comuna", read_only=True, default=None)
    # Nombres resueltos desde bd_ciudades (IDs -> strings legibles en frontend)
    region_nombre = serializers.SerializerMethodField()
    provincia_nombre = serializers.SerializerMethodField()
    comuna_nombre = serializers.SerializerMethodField()
    foto_perfil = serializers.SerializerMethodField()

    # Datos de educacion desde cuentas.User
    nivel_estudios = serializers.CharField(source="usuario.nivel_estudios", read_only=True, default=None)
    nivel_estudios_label = serializers.SerializerMethodField()
    titulo_especialidad = serializers.CharField(source="usuario.titulo_especialidad", read_only=True, default=None)
    institucion_educacional = serializers.CharField(source="usuario.institucion_educacional", read_only=True, default=None)

    # Labels para campos con choices propios de UsuarioEmpresa
    sistema_salud_label = serializers.SerializerMethodField()
    tipo_cuenta_bancaria_label = serializers.SerializerMethodField()

    # AFP como FK: exponer nombre legible
    afp_nombre = serializers.CharField(source="afp.nombre", read_only=True, default=None)

    # Cargas familiares
    cargas_familiares = CargaFamiliarSerializer(many=True, read_only=True)

    # Historial de contratos laborales RRHH (para tab Documentos)
    contratos_laborales_historial = serializers.SerializerMethodField()

    # Contrato laboral vigente desde rrhh.ContratoTrabajador
    contrato_laboral_vigente = serializers.SerializerMethodField()

    class Meta:
        model = UsuarioEmpresa
        fields = '__all__'

    def get_nombre_usuario(self, obj):
        return obj.usuario.get_nombre_completo()

    def get_papeleta(self, obj):
        return obj.generar_papeleta()

    def get_email_usuario(self, obj):
        return obj.usuario.email

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_nombre_sucursal(self, obj):
        return f"{obj.sucursal.nombre} de {obj.sucursal.empresa.nombre}"

    def get_genero_label(self, obj):
        return obj.usuario.get_genero_display() if obj.usuario.genero else None

    def get_estado_civil_label(self, obj):
        return obj.usuario.get_estado_civil_display() if obj.usuario.estado_civil else None

    def get_nivel_estudios_label(self, obj):
        return obj.usuario.get_nivel_estudios_display() if obj.usuario.nivel_estudios else None

    def get_region_nombre(self, obj):
        region_id = obj.usuario.region
        if not region_id:
            return None
        try:
            return Region.objects.using("db_comunas").get(region_id=region_id).region_nombre
        except Region.DoesNotExist:
            return None

    def get_provincia_nombre(self, obj):
        provincia_id = obj.usuario.provincia
        if not provincia_id:
            return None
        try:
            return Provincia.objects.using("db_comunas").get(provincia_id=provincia_id).provincia_nombre
        except Provincia.DoesNotExist:
            return None

    def get_comuna_nombre(self, obj):
        comuna_id = obj.usuario.comuna
        if not comuna_id:
            return None
        try:
            return Comuna.objects.using("db_comunas").get(comuna_id=comuna_id).comuna_nombre
        except Comuna.DoesNotExist:
            return None

    def get_sistema_salud_label(self, obj):
        return obj.get_sistema_salud_display() if obj.sistema_salud else None

    def get_tipo_cuenta_bancaria_label(self, obj):
        return obj.get_tipo_cuenta_bancaria_display() if obj.tipo_cuenta_bancaria else None

    def get_foto_perfil(self, obj):
        if not obj.usuario.image:
            return None
        request = self.context.get("request")
        url = obj.usuario.image.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def get_contratos_laborales_historial(self, obj):
        """Retorna lista de contratos laborales RRHH con link al PDF."""
        request = self.context.get("request")
        result = []
        for c in obj.contratos_laborales.order_by("-fecha_creacion"):
            pdf_url = None
            if c.archivo_pdf:
                url = c.archivo_pdf.url
                pdf_url = request.build_absolute_uri(url) if request else url
            result.append({
                "id": c.id,
                "tipo_contrato_label": c.get_tipo_contrato_display(),
                "estado": c.estado,
                "estado_label": c.get_estado_display(),
                "fecha_inicio": str(c.fecha_inicio),
                "fecha_termino": str(c.fecha_termino) if c.fecha_termino else None,
                "archivo_pdf": pdf_url,
            })
        return result

    def get_contrato_laboral_vigente(self, obj):
        """Retorna el contrato laboral RRHH mas relevante del trabajador."""
        PRIORIDAD = ["vigente", "pendiente_aprobacion", "borrador"]
        contrato = None
        for estado in PRIORIDAD:
            contrato = obj.contratos_laborales.filter(estado=estado).order_by("-fecha_creacion").first()
            if contrato:
                break
        if not contrato:
            return None
        return {
            "id": contrato.id,
            "tipo_contrato": contrato.tipo_contrato,
            "tipo_contrato_label": contrato.get_tipo_contrato_display(),
            "jornada": contrato.jornada,
            "jornada_label": contrato.get_jornada_display(),
            "cargo": contrato.cargo,
            "lugar_trabajo": contrato.lugar_trabajo,
            "sueldo_base": str(contrato.sueldo_base),
            "sueldo_liquido": str(contrato.sueldo_liquido) if contrato.sueldo_liquido else None,
            "moneda": contrato.moneda,
            "tipo_gratificacion": getattr(contrato, 'tipo_gratificacion', None),
            "tipo_gratificacion_label": contrato.get_tipo_gratificacion_display() if hasattr(contrato, 'tipo_gratificacion') else None,
            "bono_movilizacion": str(contrato.bono_movilizacion),
            "bono_colacion": str(contrato.bono_colacion),
            "fecha_inicio": str(contrato.fecha_inicio),
            "fecha_termino": str(contrato.fecha_termino) if contrato.fecha_termino else None,
            "estado": contrato.estado,
            "estado_label": contrato.get_estado_display(),
        }

class RelacionEmpresaSerializer(serializers.ModelSerializer):
    info_prestador_servicios = EmpresaSerializer(source="prestador_servicios", read_only=True)
    info_cliente = EmpresaSerializer(source="cliente", read_only=True)
    tipo_relacion_label = serializers.SerializerMethodField()

    class Meta:
        model = RelacionEmpresa
        fields = '__all__'

    def get_tipo_relacion_label(self, obj):
        return obj.get_tipo_relacion_display()

    def validate(self, attrs):
        prestador = attrs.get("prestador_servicios") or getattr(self.instance, "prestador_servicios", None)
        cliente = attrs.get("cliente") or getattr(self.instance, "cliente", None)
        if prestador and cliente and prestador == cliente:
            raise serializers.ValidationError("No se puede asignar la misma empresa como cliente de sí misma.")
        return attrs


class CrearProspectoSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=255)
    rut_empresa = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    telefono = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)

class EmpresaContratoSerializer(serializers.ModelSerializer):
    representantes_legales = serializers.SerializerMethodField()

    class Meta:
        model = Empresa
        fields = '__all__'

    def get_representantes_legales(self, obj):
        representantes = UsuarioEmpresa.objects.filter(
            sucursal__in=obj.sucursales.all(),
            grupos__name="representante_legal"
        ).distinct()

        return UsuarioEmpresaSerializer(representantes, many=True).data
