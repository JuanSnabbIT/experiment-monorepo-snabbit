"""Serializers del modulo RRHH."""

from rest_framework import serializers

from .models import AnexoContrato, ContratoTrabajador


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
            "fecha_aceptacion",
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
        usuario = obj.usuario_empresa.usuario if obj.usuario_empresa else None
        if not usuario:
            return None
        return getattr(usuario, "get_nombre", lambda: usuario.get_full_name())()

    def get_email_trabajador(self, obj):
        usuario = obj.usuario_empresa.usuario if obj.usuario_empresa else None
        return getattr(usuario, "email", None)

    def get_rut_trabajador(self, obj):
        return obj.usuario_empresa.rut if obj.usuario_empresa else None

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
        exclude = ("creado_por", "aceptado_por", "fecha_aceptacion")

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

        if jornada in ("parcial", "part_time") and not horas_semanales:
            raise serializers.ValidationError(
                {"horas_semanales": "Debe indicar las horas semanales para jornada parcial o part time."}
            )

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
        contrato_payload = dict(value)
        contrato_payload.setdefault("usuario_empresa", 0)  # placeholder
        # Solo validamos reglas de negocio (no la FK).
        ser = ContratoTrabajadorWriteSerializer(data=contrato_payload, partial=True)
        ser.is_valid(raise_exception=True)
        return value
