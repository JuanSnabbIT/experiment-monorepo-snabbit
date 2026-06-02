"""Serializers del modulo RRHH."""

from rest_framework import serializers

from .models import AfpCatalogo, AnexoContrato, BancoCatalogo, CargoCatalogo, ContratoTrabajador, EnvioAprobacionEmpleador


class CargoCatalogoSerializer(serializers.ModelSerializer):
    """Serializer para el catalogo de cargos."""

    class Meta:
        model = CargoCatalogo
        fields = ("id", "empresa", "nombre", "activo", "fecha_creacion", "fecha_modificacion")
        read_only_fields = ("fecha_creacion", "fecha_modificacion")


class AfpCatalogoSerializer(serializers.ModelSerializer):
    """Serializer para el catalogo de AFP."""

    class Meta:
        model = AfpCatalogo
        fields = ("id", "nombre", "empresa", "activo")
        read_only_fields = ("empresa",)


class BancoCatalogoSerializer(serializers.ModelSerializer):
    """Serializer para el catalogo de bancos."""

    class Meta:
        model = BancoCatalogo
        fields = ("id", "nombre", "empresa", "activo")
        read_only_fields = ("empresa",)


class AnexoContratoSerializer(serializers.ModelSerializer):
    tipo_label = serializers.SerializerMethodField()
    estado_label = serializers.SerializerMethodField()

    class Meta:
        model = AnexoContrato
        fields = "__all__"
        read_only_fields = ("fecha_creacion", "fecha_modificacion", "creado_por")

    def get_tipo_label(self, obj):
        return obj.get_tipo_display()

    def get_estado_label(self, obj):
        return obj.get_estado_display()


class ContratoTrabajadorSerializer(serializers.ModelSerializer):
    """Serializer de lectura con labels y datos del trabajador."""

    tipo_contrato_label = serializers.SerializerMethodField()
    jornada_label = serializers.SerializerMethodField()
    estado_label = serializers.SerializerMethodField()
    moneda_label = serializers.SerializerMethodField()
    motivo_termino_label = serializers.SerializerMethodField()

    nombre_trabajador = serializers.SerializerMethodField()
    email_trabajador = serializers.SerializerMethodField()
    rut_trabajador = serializers.SerializerMethodField()
    telefono_trabajador = serializers.SerializerMethodField()
    fecha_nacimiento_trabajador = serializers.SerializerMethodField()
    nacionalidad_trabajador = serializers.SerializerMethodField()
    direccion_trabajador = serializers.SerializerMethodField()

    label_trabajador = serializers.SerializerMethodField()

    datos_previsionales_trabajador = serializers.SerializerMethodField()

    empresa_nombre = serializers.SerializerMethodField()
    sucursal_nombre = serializers.SerializerMethodField()
    email_empresa = serializers.SerializerMethodField()

    plantilla_contrato_titulo = serializers.CharField(
        source="plantilla_contrato.titulo", read_only=True, default=None,
    )
    secciones_generadas = serializers.SerializerMethodField()

    anexos = AnexoContratoSerializer(many=True, read_only=True)

    class Meta:
        model = ContratoTrabajador
        fields = "__all__"
        read_only_fields = (
            "fecha_creacion",
            "fecha_modificacion",
            "creado_por",
            "fecha_aprobacion",
            "aceptado_por",
        )

    def get_tipo_contrato_label(self, obj):
        return obj.get_tipo_contrato_display()

    def get_jornada_label(self, obj):
        return obj.get_jornada_display()

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_moneda_label(self, obj):
        return obj.get_moneda_display()

    def get_motivo_termino_label(self, obj):
        return obj.get_motivo_termino_display() if obj.motivo_termino else None

    def get_nombre_trabajador(self, obj):
        if obj.usuario_empresa:
            usuario = obj.usuario_empresa.usuario
            return getattr(
                usuario,
                "get_nombre_completo",
                lambda: (f"{getattr(usuario, 'first_name', '')} {getattr(usuario, 'last_name', '')}").strip()
                or getattr(usuario, "email", None),
            )()
        if obj.datos_trabajador_nuevo:
            fn = obj.datos_trabajador_nuevo.get("first_name", "")
            ln = obj.datos_trabajador_nuevo.get("last_name", "")
            return f"{fn} {ln}".strip() or None
        return None

    def get_email_trabajador(self, obj):
        if obj.usuario_empresa:
            usuario = obj.usuario_empresa.usuario
            return getattr(usuario, "email", None)
        if obj.datos_trabajador_nuevo:
            return obj.datos_trabajador_nuevo.get("email")
        return None

    def get_rut_trabajador(self, obj):
        if obj.usuario_empresa:
            return obj.usuario_empresa.rut
        if obj.datos_trabajador_nuevo:
            return obj.datos_trabajador_nuevo.get("rut")
        return None

    def get_telefono_trabajador(self, obj):
        usuario = obj.usuario_empresa.usuario if obj.usuario_empresa else None
        return getattr(usuario, "celular", None)

    def get_fecha_nacimiento_trabajador(self, obj):
        usuario = obj.usuario_empresa.usuario if obj.usuario_empresa else None
        fn = getattr(usuario, "fecha_nacimiento", None)
        if fn:
            return fn.strftime("%d/%m/%Y")
        return None

    def get_nacionalidad_trabajador(self, obj):
        usuario = obj.usuario_empresa.usuario if obj.usuario_empresa else None
        return getattr(usuario, "nacionalidad", None)

    def get_direccion_trabajador(self, obj):
        usuario = obj.usuario_empresa.usuario if obj.usuario_empresa else None
        return getattr(usuario, "direccion", None)

    def get_label_trabajador(self, obj):
        if not obj.usuario_empresa and not obj.datos_trabajador_nuevo:
            return None
        nombre = self.get_nombre_trabajador(obj) or ""
        rut = self.get_rut_trabajador(obj)
        email = self.get_email_trabajador(obj) or ""
        sufijo = rut if rut else email
        return f"{nombre} — {sufijo}" if sufijo else nombre

    def get_datos_previsionales_trabajador(self, obj):
        ue = obj.usuario_empresa
        if ue:
            return {
                "afp": ue.afp,
                "sistema_salud": ue.sistema_salud,
                "nombre_isapre": ue.nombre_isapre,
                "banco": ue.banco,
                "tipo_cuenta_bancaria": ue.tipo_cuenta_bancaria,
                "numero_cuenta_bancaria": ue.numero_cuenta_bancaria,
            }
        if obj.datos_trabajador_nuevo:
            d = obj.datos_trabajador_nuevo
            return {
                "afp": d.get("afp"),
                "sistema_salud": d.get("sistema_salud"),
                "nombre_isapre": d.get("nombre_isapre"),
                "banco": d.get("banco"),
                "tipo_cuenta_bancaria": d.get("tipo_cuenta_bancaria"),
                "numero_cuenta_bancaria": d.get("numero_cuenta_bancaria"),
            }
        return {}

    def get_empresa_nombre(self, obj):
        try:
            return obj.usuario_empresa.sucursal.empresa.nombre
        except Exception:
            return None

    def get_sucursal_nombre(self, obj):
        try:
            return obj.usuario_empresa.sucursal.nombre
        except Exception:
            return None

    def get_email_empresa(self, obj):
        try:
            return obj.usuario_empresa.sucursal.empresa.email
        except Exception:
            return None

    def get_secciones_generadas(self, obj):
        secciones = obj.secciones_generadas.all().order_by("orden") if hasattr(obj, "secciones_generadas") else []
        return [
            {
                "id": s.id,
                "titulo": s.titulo,
                "contenido_renderizado": s.contenido_renderizado,
                "orden": s.orden,
                "fue_editado_manualmente": s.fue_editado_manualmente,
                "seccion_plantilla_id": s.seccion_plantilla_id,
            }
            for s in secciones
        ]


class ContratoTrabajadorWriteSerializer(serializers.ModelSerializer):
    """Serializer de escritura con validaciones de negocio."""

    class Meta:
        model = ContratoTrabajador
        exclude = ("creado_por", "aceptado_por", "fecha_aprobacion", "datos_trabajador_nuevo")

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        tipo = attrs.get("tipo_contrato") or (instance.tipo_contrato if instance else None)
        fecha_inicio = attrs.get("fecha_inicio") or (instance.fecha_inicio if instance else None)
        fecha_termino = attrs.get("fecha_termino") if "fecha_termino" in attrs else (
            instance.fecha_termino if instance else None
        )
        jornada = attrs.get("jornada") or (instance.jornada if instance else None)
        horas_semanales = attrs.get("horas_semanales") if "horas_semanales" in attrs else (
            instance.horas_semanales if instance else None
        )

        if tipo == "plazo_fijo" and not fecha_termino:
            raise serializers.ValidationError(
                {"fecha_termino": "Los contratos a plazo fijo requieren fecha de termino."}
            )

        if fecha_termino and fecha_inicio and fecha_termino <= fecha_inicio:
            raise serializers.ValidationError(
                {"fecha_termino": "La fecha de termino debe ser posterior a la fecha de inicio."}
            )

        # horas_semanales es informativo para cualquier jornada; se valida solo
        # si se pasa un valor invalido, no como requisito obligatorio.

        return attrs


class TrabajadorExistenteSerializer(serializers.Serializer):
    modo = serializers.ChoiceField(choices=[("existente", "existente")])
    usuario_empresa_id = serializers.IntegerField()
    # Datos previsionales / bancarios / personales (opcionales, actualizan al UE/User)
    afp = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    sistema_salud = serializers.ChoiceField(
        choices=[("fonasa", "fonasa"), ("isapre", "isapre"), ("otro", "otro")],
        required=False, allow_blank=True, allow_null=True,
    )
    nombre_isapre = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    banco = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    tipo_cuenta_bancaria = serializers.ChoiceField(
        choices=[
            ("corriente", "corriente"),
            ("vista", "vista"),
            ("ahorro", "ahorro"),
            ("rut", "rut"),
        ],
        required=False, allow_blank=True, allow_null=True,
    )
    numero_cuenta_bancaria = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    nacionalidad = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    fecha_nacimiento = serializers.DateField(required=False, allow_null=True)
    direccion = serializers.CharField(max_length=250, required=False, allow_blank=True, allow_null=True)


class TrabajadorNuevoSerializer(serializers.Serializer):
    modo = serializers.ChoiceField(choices=[("nuevo", "nuevo")])
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    rut = serializers.CharField(max_length=20, required=False, allow_blank=True)
    sucursal_id = serializers.IntegerField()
    enviar_invitacion = serializers.BooleanField(default=True)
    # Datos previsionales / bancarios (en UsuarioEmpresa)
    afp = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    sistema_salud = serializers.ChoiceField(
        choices=[("fonasa", "fonasa"), ("isapre", "isapre"), ("otro", "otro")],
        required=False, allow_blank=True, allow_null=True,
    )
    nombre_isapre = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    banco = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    tipo_cuenta_bancaria = serializers.ChoiceField(
        choices=[
            ("corriente", "corriente"),
            ("vista", "vista"),
            ("ahorro", "ahorro"),
            ("rut", "rut"),
        ],
        required=False, allow_blank=True, allow_null=True,
    )
    numero_cuenta_bancaria = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    # Datos personales (en User)
    nacionalidad = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    fecha_nacimiento = serializers.DateField(required=False, allow_null=True)
    direccion = serializers.CharField(max_length=250, required=False, allow_blank=True, allow_null=True)


class CrearContratoConTrabajadorSerializer(serializers.Serializer):
    """Payload polimorfico: trabajador (existente | nuevo) + contrato."""

    trabajador = serializers.DictField()
    contrato = serializers.DictField()

    def validate_trabajador(self, value):
        modo = value.get("modo")
        if modo == "existente":
            return TrabajadorExistenteSerializer(data=value).run_validation(value)
        if modo == "nuevo":
            return TrabajadorNuevoSerializer(data=value).run_validation(value)
        raise serializers.ValidationError("modo debe ser 'existente' o 'nuevo'.")

    def validate_contrato(self, value):
        # Validamos campos del contrato sin instancia (sin usuario_empresa aun).
        # Omitimos la FK 'usuario_empresa' porque aun no existe; la view la
        # establecera mas adelante con el ue.id real (existente) o el UE recien
        # creado (nuevo). Validar con un placeholder inválido (e.g. 0) provoca
        # "Clave primaria \"0\" inválida - objeto no existe.".
        contrato_payload = dict(value)
        contrato_payload.pop("usuario_empresa", None)
        # Solo validamos reglas de negocio (no la FK).
        ser = ContratoTrabajadorWriteSerializer(data=contrato_payload, partial=True)
        ser.is_valid(raise_exception=True)
        return value


class EnvioAprobacionEmpleadorSerializer(serializers.ModelSerializer):
    """Serializer de lectura para EnvioAprobacionEmpleador."""

    decision_label = serializers.SerializerMethodField()

    class Meta:
        model = EnvioAprobacionEmpleador
        fields = (
            "id",
            "uuid",
            "contrato",
            "enviado_a",
            "enviado_por",
            "decision",
            "decision_label",
            "motivo_rechazo",
            "cambios_solicitados",
            "notificar_trabajador",
            "fecha_envio",
            "fecha_respuesta",
            "ip_respuesta",
            "expirado",
        )
        read_only_fields = fields

    def get_decision_label(self, obj):
        return obj.get_decision_display()


class ContratoAprobacionPublicaSerializer(serializers.ModelSerializer):
    """Datos minimos del contrato para la vista publica del empleador."""

    tipo_contrato_label = serializers.SerializerMethodField()
    jornada_label = serializers.SerializerMethodField()
    nombre_trabajador = serializers.SerializerMethodField()
    email_trabajador = serializers.SerializerMethodField()
    empresa_nombre = serializers.SerializerMethodField()

    class Meta:
        model = ContratoTrabajador
        fields = (
            "id",
            "tipo_contrato",
            "tipo_contrato_label",
            "cargo",
            "fecha_inicio",
            "fecha_termino",
            "jornada",
            "jornada_label",
            "sueldo_base",
            "moneda",
            "nombre_trabajador",
            "email_trabajador",
            "empresa_nombre",
        )

    def get_tipo_contrato_label(self, obj):
        return obj.get_tipo_contrato_display()

    def get_jornada_label(self, obj):
        return obj.get_jornada_display()

    def get_nombre_trabajador(self, obj):
        if obj.usuario_empresa and obj.usuario_empresa.usuario:
            usuario = obj.usuario_empresa.usuario
            return getattr(
                usuario,
                "get_nombre_completo",
                lambda: (f"{getattr(usuario, 'first_name', '')} {getattr(usuario, 'last_name', '')}").strip()
                or getattr(usuario, "email", None),
            )()
        return None

    def get_email_trabajador(self, obj):
        if obj.usuario_empresa and obj.usuario_empresa.usuario:
            return obj.usuario_empresa.usuario.email
        return None

    def get_empresa_nombre(self, obj):
        try:
            return obj.usuario_empresa.sucursal.empresa.nombre
        except Exception:
            return None
