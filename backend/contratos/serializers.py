from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from contratos.models import (
    ContratoEmpresaCliente,
    EnvioContratoAprobacion,
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
    PersonaLicenciataria,
    CorreoPersonaLicenciataria,
    Visita,
    Licencia,
    CondicionEspecial,
    FacturaContrato,
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
    caracteristicas_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=CaracteristicaServicio.objects.all(),
        write_only=True, required=False, source='caracteristicas',
    )
    categoria_label = serializers.SerializerMethodField()

    class Meta:
        model = Servicio
        fields = '__all__'

    def get_categoria_label(self, obj):
        return obj.get_categoria_display()

# Serializador para PlanServicio
class PlanServicioSerializer(serializers.ModelSerializer):
    servicios = ServicioSerializer(many=True, read_only=True)
    servicios_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Servicio.objects.all(),
        write_only=True, required=False, source='servicios',
    )

    class Meta:
        model = PlanServicio
        fields = '__all__'

# Serializador para Visita
class VisitaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Visita
        fields = '__all__'


class CorreoPersonaLicenciatariaSerializer(serializers.ModelSerializer):
    persona_detalle = serializers.SerializerMethodField()

    class Meta:
        model = CorreoPersonaLicenciataria
        fields = '__all__'
        read_only_fields = ['correo_normalizado', 'empresa']

    def get_persona_detalle(self, obj):
        persona = obj.persona
        return {
            "id": persona.id,
            "nombre": persona.nombre,
            "es_interno": persona.es_interno,
            "usuario_empresa": persona.usuario_empresa_id,
        }


class PersonaLicenciatariaSerializer(serializers.ModelSerializer):
    correos = CorreoPersonaLicenciatariaSerializer(many=True, read_only=True)
    nombre_display = serializers.SerializerMethodField()

    class Meta:
        model = PersonaLicenciataria
        fields = '__all__'

    def get_nombre_display(self, obj):
        if obj.usuario_empresa_id:
            return obj.usuario_empresa.usuario.get_nombre_completo()
        return obj.nombre

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
    es_externo = serializers.SerializerMethodField()
    nombre_display = serializers.SerializerMethodField()
    correo_display = serializers.SerializerMethodField()
    persona = serializers.SerializerMethodField()
    correo_persona_detalle = CorreoPersonaLicenciatariaSerializer(source='correo_persona', read_only=True)
    correo = serializers.EmailField(write_only=True, required=False)

    class Meta:
        model = UsuarioVinculadoLicencia
        fields = '__all__'

    def get_datos_usuario(self, obj):
        return {
            "nombre": obj.usuario.usuario.get_nombre_completo(),
            "correo": obj.usuario.usuario.email
        } if obj.usuario else None

    def get_es_externo(self, obj):
        return obj.es_externo

    def get_nombre_display(self, obj):
        return obj.nombre_asignado or ''

    def get_correo_display(self, obj):
        return obj.correo_asignado or ''

    def get_persona(self, obj):
        persona = obj.persona_licenciataria
        if not persona:
            return None
        return {
            "id": persona.id,
            "nombre": persona.nombre,
            "es_interno": persona.es_interno,
            "usuario_empresa": persona.usuario_empresa_id,
        }

    def validate(self, attrs):
        attrs = super().validate(attrs)
        licencia = attrs.get("licencia") or getattr(self.instance, "licencia", None)
        correo_persona = attrs.get("correo_persona") or getattr(self.instance, "correo_persona", None)
        usuario = attrs.get("usuario") or getattr(self.instance, "usuario", None)
        persona = self.initial_data.get("persona")
        correo = self.initial_data.get("correo")

        if persona and correo_persona:
            raise serializers.ValidationError("No se puede enviar persona y correo_persona al mismo tiempo.")

        if correo_persona:
            if licencia and correo_persona.empresa_id != licencia.contrato.empresa_cliente_id:
                raise serializers.ValidationError(
                    {"correo_persona": "El correo debe pertenecer a la empresa cliente del contrato."}
                )
            return attrs

        if persona:
            try:
                persona_obj = PersonaLicenciataria.objects.get(pk=persona)
            except PersonaLicenciataria.DoesNotExist as exc:
                raise serializers.ValidationError({"persona": "Persona licenciataria no encontrada."}) from exc
            attrs["correo_persona"] = self._resolver_correo_de_persona(licencia, persona_obj, correo)
            return attrs

        if usuario:
            attrs["correo_persona"] = self._resolver_correo_de_usuario(licencia, usuario, correo)
            return attrs

        correo_generico = attrs.get("correo_generico") or getattr(self.instance, "correo_generico", None)
        nombre = attrs.get("nombre") or getattr(self.instance, "nombre", None)
        if correo_generico:
            if licencia is None:
                raise serializers.ValidationError({"licencia": "Licencia requerida para vincular correo externo."})
            _, correo_obj = PersonaLicenciataria.obtener_o_crear_externa(
                empresa=licencia.contrato.empresa_cliente,
                nombre=nombre or correo_generico,
                correo=correo_generico,
            )
            attrs["correo_persona"] = correo_obj
            return attrs

        raise serializers.ValidationError(
            "Debe enviar correo_persona, usuario, o nombre + correo_generico."
        )

    def _resolver_correo_de_persona(self, licencia, persona, correo):
        if licencia and persona.empresa_id != licencia.contrato.empresa_cliente_id:
            raise serializers.ValidationError(
                {"persona": "La persona debe pertenecer a la empresa cliente del contrato."}
            )
        if correo:
            return CorreoPersonaLicenciataria.obtener_o_crear_para_persona(
                persona=persona,
                correo=correo,
                es_principal=False,
                es_corporativo=persona.es_interno,
            )
        correo_obj = persona.correos.filter(activo=True).order_by("-es_principal", "id").first()
        if correo_obj:
            return correo_obj
        raise serializers.ValidationError(
            {"correo": "La persona no tiene correos registrados. Debe indicar uno."}
        )

    def _resolver_correo_de_usuario(self, licencia, usuario, correo):
        empresa = licencia.contrato.empresa_cliente if licencia else usuario.sucursal.empresa
        persona, correo_principal = PersonaLicenciataria.sincronizar_desde_usuario_empresa(
            usuario,
            empresa=empresa,
        )
        if correo:
            correo_normalizado = correo.strip().lower()
            return CorreoPersonaLicenciataria.obtener_o_crear_para_persona(
                persona=persona,
                correo=correo_normalizado,
                es_principal=correo_normalizado == usuario.usuario.email.lower(),
                es_corporativo=True,
                verificado=correo_normalizado == usuario.usuario.email.lower(),
            )
        return correo_principal

# class ContratoLicenciaVinculoUsuarioSerializer(serializers.ModelSerializer):
class ContratoLicenciaSerializer(serializers.ModelSerializer):
    contrato = serializers.PrimaryKeyRelatedField(read_only=True)
    tipo_modalidad_label = serializers.SerializerMethodField()
    nombre_licencia = serializers.SerializerMethodField()
    proveedor_licencia = serializers.SerializerMethodField()
    tipo_moneda_label = serializers.SerializerMethodField()
    licencias_disponibles  = serializers.SerializerMethodField()
    fecha_inicio_edicion = serializers.SerializerMethodField()
    fecha_fin_edicion = serializers.SerializerMethodField()
    dias_hasta_fin_edicion = serializers.SerializerMethodField()
    nombre_contrato = serializers.SerializerMethodField()
    se_puede_reducir = serializers.SerializerMethodField()
    se_puede_cancelar = serializers.SerializerMethodField()
    se_puede_desvincular = serializers.SerializerMethodField()
    se_puede_aumentar = serializers.SerializerMethodField()
    mensaje_ventana_edicion = serializers.SerializerMethodField()
    dias_restantes_licencia = serializers.SerializerMethodField()
    estado_label = serializers.SerializerMethodField()
    color_estado = serializers.SerializerMethodField()
    empresa_cliente = serializers.SerializerMethodField()

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

    def get_dias_hasta_fin_edicion(self, obj):
        return obj.dias_hasta_fin_edicion

    def get_se_puede_reducir(self, obj):
        return obj.puede_reducir_cupos

    def get_se_puede_cancelar(self, obj):
        return obj.puede_cancelar

    def get_se_puede_desvincular(self, obj):
        return obj.puede_desvincular_usuarios

    def get_se_puede_aumentar(self, obj):
        return obj.puede_aumentar_cupos

    def get_mensaje_ventana_edicion(self, obj):
        return obj.mensaje_ventana_edicion

    def get_dias_restantes_licencia(self, obj):
        return obj.dias_restantes_licencia

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_color_estado(self, obj):
        """Color para Badge en el frontend."""
        colores = {
            'activa': 'emerald',
            'vencida': 'red',
            'suspendida': 'amber',
            'cancelada': 'zinc',
        }
        return colores.get(obj.estado, 'zinc')

    def get_empresa_cliente(self, obj):
        """ID de la empresa cliente del contrato padre."""
        return obj.contrato.empresa_cliente_id

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
    contrato = serializers.PrimaryKeyRelatedField(read_only=True)
    titulo_condicion = serializers.SerializerMethodField()
    descripcion_condicion = serializers.SerializerMethodField()

    class Meta:
        model = ContratoCondicionEspecial
        fields = '__all__'

    def get_titulo_condicion(self, obj):
        if obj.condicion:
            return obj.condicion.titulo
        return obj.texto or ''

    def get_descripcion_condicion(self, obj):
        if obj.condicion:
            return obj.condicion.descripcion
        return obj.texto or ''
        

# ── Serializers ligeros para endpoints "por usuario" ──

class LicenciaVinculadaPorUsuarioSerializer(serializers.ModelSerializer):
    """Serializer ligero: vínculos licencia ↔ usuario con datos resumidos."""
    nombre_licencia = serializers.CharField(source='licencia.licencia.nombre', read_only=True)
    proveedor_licencia = serializers.CharField(source='licencia.licencia.proveedor', read_only=True)
    estado_licencia = serializers.CharField(source='licencia.estado', read_only=True)
    estado_licencia_label = serializers.CharField(source='licencia.get_estado_display', read_only=True)
    color_estado = serializers.SerializerMethodField()
    fecha_fin_licencia = serializers.DateField(source='licencia.fecha_fin', read_only=True)
    nombre_contrato = serializers.CharField(source='licencia.contrato.nombre', read_only=True)
    contrato_id = serializers.IntegerField(source='licencia.contrato.id', read_only=True)
    licencia_contrato_id = serializers.IntegerField(source='licencia.id', read_only=True)

    class Meta:
        model = UsuarioVinculadoLicencia
        fields = [
            'id', 'fecha_asignacion',
            'nombre_licencia', 'proveedor_licencia',
            'estado_licencia', 'estado_licencia_label', 'color_estado',
            'fecha_fin_licencia', 'nombre_contrato',
            'contrato_id', 'licencia_contrato_id',
        ]

    def get_color_estado(self, obj):
        colores = {
            'activa': 'emerald',
            'vencida': 'red',
            'suspendida': 'amber',
            'cancelada': 'zinc',
        }
        return colores.get(obj.licencia.estado, 'zinc')


class ContratoVinculadoPorUsuarioSerializer(serializers.ModelSerializer):
    """Serializer ligero: vínculos contrato ↔ usuario con datos resumidos."""
    nombre_contrato = serializers.CharField(source='contrato.nombre', read_only=True)
    tipo_contrato = serializers.CharField(source='contrato.tipo', read_only=True)
    tipo_contrato_label = serializers.CharField(source='contrato.get_tipo_display', read_only=True)
    estado_contrato = serializers.CharField(source='contrato.estado', read_only=True)
    estado_contrato_label = serializers.CharField(source='contrato.get_estado_display', read_only=True)
    fecha_inicio_contrato = serializers.DateField(source='contrato.fecha_inicio', read_only=True)
    fecha_fin_contrato = serializers.DateField(source='contrato.fecha_fin', read_only=True)
    contrato_id = serializers.IntegerField(source='contrato.id', read_only=True)
    tipo_usuario_label = serializers.SerializerMethodField()

    class Meta:
        model = UsuarioVinculadoContrato
        fields = [
            'id', 'fecha_vinculacion', 'tipo_usuario', 'tipo_usuario_label',
            'nombre_contrato', 'tipo_contrato', 'tipo_contrato_label',
            'estado_contrato', 'estado_contrato_label',
            'fecha_inicio_contrato', 'fecha_fin_contrato', 'contrato_id',
        ]

    def get_tipo_usuario_label(self, obj):
        return obj.get_tipo_usuario_display()


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
    usuario = serializers.PrimaryKeyRelatedField(queryset=UsuarioEmpresa.objects.all(), required=False, allow_null=True)
    contrato = serializers.PrimaryKeyRelatedField(read_only=True)
    datos_usuario = serializers.SerializerMethodField()
    tipo_usuario_label = serializers.SerializerMethodField()
    existe_envio = serializers.SerializerMethodField()
    nombre_display = serializers.SerializerMethodField()
    correo_display = serializers.SerializerMethodField()
    es_externo = serializers.SerializerMethodField()
    aprobacion_pendiente = serializers.SerializerMethodField()
    firma_pendiente = serializers.SerializerMethodField()

    class Meta:
        model = UsuarioVinculadoContrato
        fields = '__all__'

    def get_datos_usuario(self, obj):
        if not obj.usuario:
            return None
        return {"nombre": obj.usuario.usuario.get_nombre_completo(), "email": obj.usuario.usuario.email}

    def get_tipo_usuario_label(self, obj):
        return obj.get_tipo_usuario_display()

    def get_existe_envio(self, obj):
        envio = EnvioContratoFirmaUsuario.objects.filter(usuario=obj).order_by('-fecha_envio', '-id').first()
        return envio.pk if envio else None

    def get_nombre_display(self, obj):
        return obj.nombre_display

    def get_correo_display(self, obj):
        return obj.correo_display

    def get_es_externo(self, obj):
        return obj.es_externo

    def get_aprobacion_pendiente(self, obj):
        envio = EnvioContratoAprobacion.objects.filter(destinatario=obj).order_by('-fecha_envio', '-id').first()
        if not envio:
            return None
        return {
            "id": envio.id,
            "uuid": str(envio.uuid),
            "enviado": envio.enviado,
            "respondido": envio.respondido,
            "aprobado": envio.aprobado,
            "fecha_envio": envio.fecha_envio,
            "fecha_respuesta": envio.fecha_respuesta,
            "comentario_respuesta": envio.comentario_respuesta,
            "version_envio": envio.version_envio,
        }

    def get_firma_pendiente(self, obj):
        envio = EnvioContratoFirmaUsuario.objects.filter(usuario=obj).order_by('-fecha_envio', '-id').first()
        if not envio:
            return None
        return {
            "id": envio.id,
            "uuid": str(envio.uuid),
            "enviado": envio.enviado,
            "firmado": envio.firmado,
            "fecha_envio": envio.fecha_envio,
            "fecha_firma": envio.fecha_firma,
        }

    def validate(self, attrs):
        attrs = super().validate(attrs)
        usuario = attrs.get("usuario", getattr(self.instance, "usuario", None))
        nombre = attrs.get("nombre", getattr(self.instance, "nombre", None))
        correo_generico = attrs.get("correo_generico", getattr(self.instance, "correo_generico", None))

        if not usuario and not correo_generico:
            raise serializers.ValidationError(
                "Debe enviar un usuario existente o un contacto manual con nombre y correo."
            )

        if not usuario and not nombre:
            raise serializers.ValidationError({"nombre": "Debe indicar el nombre del contacto manual."})

        return attrs

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
    destinatario_principal = serializers.SerializerMethodField()
    ultimo_envio_aprobacion = serializers.SerializerMethodField()
    ultimo_envio_firma = serializers.SerializerMethodField()
    ultimo_comentario_cliente = serializers.SerializerMethodField()

    class Meta:
        model = ContratoEmpresaCliente
        fields = '__all__'

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.instance:
            campos_bloqueados = {"estado", "empresa_prestadora", "empresa_cliente", "tipo"}
            presentes = campos_bloqueados.intersection(attrs.keys())
            if presentes:
                raise serializers.ValidationError(
                    {
                        "detail": (
                            "Los campos estado, tipo y empresas no se pueden editar desde este flujo. "
                            "Usa las acciones especificas del contrato."
                        )
                    }
                )
        return attrs

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

    def get_destinatario_principal(self, obj):
        destinatario = obj.destinatario_principal
        if not destinatario:
            return None
        return UsuarioVinculadoContratoSerializer(destinatario, read_only=True).data

    def get_ultimo_envio_aprobacion(self, obj):
        envio = obj.envios_aprobacion.order_by('-fecha_envio', '-id').first()
        if not envio:
            return None
        return {
            "id": envio.id,
            "uuid": str(envio.uuid),
            "enviado": envio.enviado,
            "respondido": envio.respondido,
            "aprobado": envio.aprobado,
            "fecha_envio": envio.fecha_envio,
            "fecha_respuesta": envio.fecha_respuesta,
            "comentario_respuesta": envio.comentario_respuesta,
            "version_envio": envio.version_envio,
        }

    def get_ultimo_envio_firma(self, obj):
        envio = EnvioContratoFirmaUsuario.objects.filter(
            usuario__contrato=obj
        ).order_by('-fecha_envio', '-id').first()
        if not envio:
            return None
        return {
            "id": envio.id,
            "uuid": str(envio.uuid),
            "enviado": envio.enviado,
            "firmado": envio.firmado,
            "fecha_envio": envio.fecha_envio,
            "fecha_firma": envio.fecha_firma,
        }

    def get_ultimo_comentario_cliente(self, obj):
        envio = obj.envios_aprobacion.filter(
            respondido=True,
            aprobado=False,
        ).order_by('-fecha_respuesta', '-id').first()
        return envio.comentario_respuesta if envio else None

class EnvioContratoFirmaUsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnvioContratoFirmaUsuario
        fields = '__all__'


class EnvioContratoAprobacionSerializer(serializers.ModelSerializer):
    destinatario_detalle = UsuarioVinculadoContratoSerializer(source='destinatario', read_only=True)

    class Meta:
        model = EnvioContratoAprobacion
        fields = '__all__'


class FacturaContratoSerializer(serializers.ModelSerializer):
    estado_label = serializers.SerializerMethodField()
    moneda_label = serializers.SerializerMethodField()
    nombre_contrato = serializers.CharField(source="contrato.nombre", read_only=True)
    nombre_cliente = serializers.CharField(
        source="empresa_cliente.nombre", read_only=True
    )
    nombre_prestadora = serializers.CharField(
        source="empresa_prestadora.nombre", read_only=True
    )
    creado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = FacturaContrato
        fields = "__all__"
        read_only_fields = [
            "fecha_creacion",
            "fecha_modificacion",
            "creado_por",
            "actualizado_por",
        ]

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_moneda_label(self, obj):
        return obj.get_moneda_display()

    def get_creado_por_nombre(self, obj):
        if obj.creado_por:
            return str(obj.creado_por)
        return None
