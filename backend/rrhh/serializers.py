"""Serializers del modulo RRHH."""

from core.validators import validate_rut_chileno
from rest_framework import serializers

from .models import AfpCatalogo, AnexoContrato, BancoCatalogo, CargoCatalogo, ConfiguracionLaboral, ContratoTrabajador, EnvioAprobacionEmpleador, FiniquitoContrato, GrupoTurno, IsapreCatalogo, NacionalidadCatalogo, SlotTurno, TurnoLaboral


def _normalize_first_capitalized(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = " ".join(value.strip().split())
    if not normalized:
        return None
    lower = normalized.lower()
    return f"{lower[:1].upper()}{lower[1:]}"


class CargoCatalogoSerializer(serializers.ModelSerializer):
    """Serializer para el catalogo de cargos."""

    class Meta:
        model = CargoCatalogo
        fields = ("id", "empresa", "nombre", "activo", "funciones_default", "fecha_creacion", "fecha_modificacion")
        read_only_fields = ("fecha_creacion", "fecha_modificacion")


class AfpCatalogoSerializer(serializers.ModelSerializer):
    """Serializer para el catalogo de AFP."""

    class Meta:
        model = AfpCatalogo
        fields = ("id", "nombre", "empresa", "activo", "tasa_cotizacion")
        read_only_fields = ("empresa",)


class IsapreCatalogoSerializer(serializers.ModelSerializer):
    """Serializer para el catalogo de Isapres."""

    class Meta:
        model = IsapreCatalogo
        fields = ("id", "nombre", "empresa", "activo")
        read_only_fields = ("empresa",)


class BancoCatalogoSerializer(serializers.ModelSerializer):
    """Serializer para el catalogo de bancos."""

    class Meta:
        model = BancoCatalogo
        fields = ("id", "nombre", "empresa", "activo")
        read_only_fields = ("empresa",)


class NacionalidadCatalogoSerializer(serializers.ModelSerializer):
    """Serializer para el catalogo de nacionalidades."""

    class Meta:
        model = NacionalidadCatalogo
        fields = ("id", "nombre", "empresa", "activo")
        read_only_fields = ("empresa",)


class ConfiguracionLaboralSerializer(serializers.ModelSerializer):
    """Serializer para parametros legales/laborales (global + por empresa)."""

    es_global = serializers.SerializerMethodField()

    class Meta:
        model = ConfiguracionLaboral
        fields = ("id", "clave", "valor", "descripcion", "empresa", "es_global")
        read_only_fields = ("empresa",)

    def get_es_global(self, obj):
        return obj.empresa is None


class TurnoLaboralSerializer(serializers.ModelSerializer):
    """Serializer para el catalogo de turnos laborales."""

    empresa_nombre = serializers.SerializerMethodField()
    es_global = serializers.SerializerMethodField()

    class Meta:
        model = TurnoLaboral
        fields = (
            "id", "nombre", "hora_inicio", "hora_fin",
            "cruza_medianoche", "dias_semana", "horas_turno",
            "activo", "empresa_nombre", "es_global",
        )
        read_only_fields = ("cruza_medianoche", "horas_turno", "empresa_nombre", "es_global")

    def get_empresa_nombre(self, obj):
        return obj.empresa.nombre if obj.empresa else None

    def get_es_global(self, obj):
        return obj.empresa is None


class SlotTurnoSerializer(serializers.ModelSerializer):
    turno_nombre = serializers.CharField(source="turno.nombre", read_only=True)
    turno_hora_inicio = serializers.TimeField(source="turno.hora_inicio", read_only=True)
    turno_hora_fin = serializers.TimeField(source="turno.hora_fin", read_only=True)
    turno_horas = serializers.DecimalField(source="turno.horas_turno", max_digits=4, decimal_places=2, read_only=True)

    class Meta:
        model = SlotTurno
        fields = ("id", "turno", "orden", "turno_nombre", "turno_hora_inicio", "turno_hora_fin", "turno_horas")


class GrupoTurnoSerializer(serializers.ModelSerializer):
    slots = SlotTurnoSerializer(many=True, read_only=True)
    slots_write = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="Lista de {turno: id, orden: int} para escritura.",
    )
    horas_promedio = serializers.FloatField(read_only=True)

    class Meta:
        model = GrupoTurno
        fields = ("id", "empresa", "nombre", "ciclo", "activo", "horas_promedio", "slots", "slots_write", "fecha_creacion", "fecha_modificacion")
        read_only_fields = ("empresa", "fecha_creacion", "fecha_modificacion")
        # empresa es read_only (se inyecta en perform_create), lo que rompe el
        # UniqueTogetherValidator autogenerado por DRF. Suprimimos y validamos en create().
        validators = []

    def create(self, validated_data):
        slots_data = validated_data.pop("slots_write", [])
        empresa = validated_data.get("empresa")
        nombre = validated_data.get("nombre", "")
        if empresa and GrupoTurno.objects.filter(empresa=empresa, nombre=nombre).exists():
            raise serializers.ValidationError({"nombre": "Ya existe un grupo con ese nombre para esta empresa."})
        grupo = GrupoTurno.objects.create(**validated_data)
        self._write_slots(grupo, slots_data)
        return grupo

    def update(self, instance, validated_data):
        slots_data = validated_data.pop("slots_write", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if slots_data is not None:
            instance.slots.all().delete()
            self._write_slots(instance, slots_data)
        return instance

    def _write_slots(self, grupo, slots_data):
        from django.db.models import Q
        valid_turno_ids = set(
            TurnoLaboral.objects.filter(
                Q(empresa__isnull=True) | Q(empresa=grupo.empresa)
            ).values_list("id", flat=True)
        )
        for item in slots_data:
            turno_id = item.get("turno")
            if turno_id is None:
                raise serializers.ValidationError({"slots_write": "Cada slot requiere el campo 'turno'."})
            if turno_id not in valid_turno_ids:
                raise serializers.ValidationError(
                    {"slots_write": f"El turno {turno_id} no pertenece a esta empresa."}
                )
            SlotTurno.objects.create(grupo=grupo, turno_id=turno_id, orden=item.get("orden", 0))


class AnexoContratoSerializer(serializers.ModelSerializer):
    tipo_label = serializers.SerializerMethodField()
    estado_label = serializers.SerializerMethodField()

    class Meta:
        model = AnexoContrato
        fields = "__all__"
        read_only_fields = ("fecha_creacion", "fecha_modificacion", "creado_por", "numero_anexo", "numero_prorroga", "tipo")

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
    hora_inicio_display = serializers.SerializerMethodField()
    hora_fin_display = serializers.SerializerMethodField()

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

    antiguedad_trabajador = serializers.SerializerMethodField()

    plantilla_contrato_titulo = serializers.CharField(
        source="plantilla_contrato.titulo", read_only=True, default=None,
    )
    secciones_generadas = serializers.SerializerMethodField()

    anexos = AnexoContratoSerializer(many=True, read_only=True)
    finiquito = serializers.SerializerMethodField()

    class Meta:
        model = ContratoTrabajador
        fields = "__all__"
        read_only_fields = (
            "fecha_creacion",
            "fecha_modificacion",
            "creado_por",
            "fecha_aprobacion",
            "aceptado_por",
            "snapshot_documento",
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

    def get_hora_inicio_display(self, obj):
        return obj.hora_inicio.strftime("%H:%M") if obj.hora_inicio else None

    def get_hora_fin_display(self, obj):
        return obj.hora_fin.strftime("%H:%M") if obj.hora_fin else None

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
                "afp": ue.afp.nombre if ue.afp_id else None,
                "afp_id": ue.afp_id,
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

    def get_antiguedad_trabajador(self, obj):
        if not obj.usuario_empresa:
            return None
        ue = obj.usuario_empresa
        antiguedad = ue.calcular_dias_desde_contratacion()
        return {
            **antiguedad,
            "dias_vacaciones_acumulados": round(float(ue.calcular_dias_vacaciones_acumulados()), 1),
            "dias_vacaciones_tomados": round(float(ue.calcular_dias_vacaciones_tomados()), 1),
            "dias_vacaciones_disponibles": round(float(ue.dias_vacaciones_disponibles()), 1),
        }

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

    def get_finiquito(self, obj):
        try:
            return FiniquitoContratoSerializer(obj.finiquito).data
        except FiniquitoContrato.DoesNotExist:
            return None


SNAPSHOT_DOCUMENTO_EDITABLE_PATHS: dict[str, tuple[type, ...]] = {
    "direccion_empresa": (str, type(None)),
    "representante_legal": (str, type(None)),
    "nombre_trabajador": (str, type(None)),
    "rut_trabajador": (str, type(None)),
    "direccion_trabajador": (str, type(None)),
}


class SnapshotGetBlockSerializer(serializers.Serializer):
    """Valida lectura de un bloque permitido de snapshot_documento."""

    path = serializers.CharField(required=True, allow_blank=False)

    def validate_path(self, value: str) -> str:
        if value not in SNAPSHOT_DOCUMENTO_EDITABLE_PATHS:
            raise serializers.ValidationError("Path no permitido para lectura por bloque.")
        return value


class SnapshotUpdateBlockSerializer(serializers.Serializer):
    """Valida mutacion de un bloque permitido de snapshot_documento."""

    path = serializers.CharField(required=True, allow_blank=False)
    value = serializers.JSONField(required=True)

    def validate_path(self, value: str) -> str:
        if value not in SNAPSHOT_DOCUMENTO_EDITABLE_PATHS:
            raise serializers.ValidationError("Path no permitido para actualizacion por bloque.")
        return value

    def validate(self, attrs):
        path = attrs["path"]
        value = attrs["value"]
        expected_types = SNAPSHOT_DOCUMENTO_EDITABLE_PATHS[path]

        if not isinstance(value, expected_types):
            type_names = ", ".join(t.__name__ for t in expected_types)
            raise serializers.ValidationError(
                {"value": f"Tipo invalido para '{path}'. Tipos permitidos: {type_names}"}
            )

        return attrs


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
        trabajador_reemplazado = attrs.get("trabajador_reemplazado") if "trabajador_reemplazado" in attrs else (
            instance.trabajador_reemplazado if instance else None
        )
        causal_reemplazo = attrs.get("causal_reemplazo") if "causal_reemplazo" in attrs else (
            instance.causal_reemplazo if instance else None
        )
        sueldo = attrs.get("sueldo") if "sueldo" in attrs else (
            instance.sueldo if instance else None
        )

        if tipo == "plazo_fijo" and not fecha_termino:
            raise serializers.ValidationError(
                {"fecha_termino": "Los contratos a plazo fijo requieren fecha de termino."}
            )

        if fecha_termino and fecha_inicio and fecha_termino <= fecha_inicio:
            raise serializers.ValidationError(
                {"fecha_termino": "La fecha de termino debe ser posterior a la fecha de inicio."}
            )

        turnos_rotativo = attrs.get("turnos_rotativo") if "turnos_rotativo" in attrs else (
            instance.turnos_rotativo if instance else []
        )
        grupo_turno = attrs.get("grupo_turno") if "grupo_turno" in attrs else (
            instance.grupo_turno if instance else None
        )
        if jornada == "turnos" and not turnos_rotativo and not grupo_turno:
            raise serializers.ValidationError(
                {"grupo_turno": "Los contratos con jornada por turnos requieren un grupo de turnos asignado."}
            )

        if tipo == "reemplazo" and not trabajador_reemplazado:
            raise serializers.ValidationError(
                {"trabajador_reemplazado": "Debes indicar el trabajador reemplazado."}
            )

        if tipo == "reemplazo" and not causal_reemplazo:
            raise serializers.ValidationError(
                {"causal_reemplazo": "Debes indicar la causal de reemplazo."}
            )

        if sueldo is not None and sueldo <= 0:
            raise serializers.ValidationError(
                {"sueldo": "El sueldo debe ser mayor a 0."}
            )

        hora_inicio = attrs.get("hora_inicio") if "hora_inicio" in attrs else (
            instance.hora_inicio if instance else None
        )
        hora_fin = attrs.get("hora_fin") if "hora_fin" in attrs else (
            instance.hora_fin if instance else None
        )
        if hora_inicio and hora_fin and hora_fin <= hora_inicio:
            raise serializers.ValidationError(
                {"hora_fin": "La hora de fin debe ser posterior a la hora de inicio."}
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

    def validate(self, attrs):
        sistema_salud = attrs.get("sistema_salud")
        nombre_isapre = attrs.get("nombre_isapre")
        sistema_salud_otro = attrs.get("sistema_salud_otro")

        banco = attrs.get("banco")
        tipo_cuenta = attrs.get("tipo_cuenta_bancaria")
        numero_cuenta = attrs.get("numero_cuenta_bancaria")

        if sistema_salud == "isapre" and not nombre_isapre:
            raise serializers.ValidationError({"nombre_isapre": "Requerido cuando sistema_salud es isapre."})

        if sistema_salud == "otro" and not sistema_salud_otro:
            raise serializers.ValidationError({"sistema_salud_otro": "Requerido cuando sistema_salud es otro."})

        filled_banking_fields = [bool(banco), bool(tipo_cuenta), bool(numero_cuenta)]
        if any(filled_banking_fields) and not all(filled_banking_fields):
            raise serializers.ValidationError(
                {"banco": "Completa banco, tipo de cuenta y numero de cuenta en conjunto."}
            )

        if "nacionalidad" in attrs:
            attrs["nacionalidad"] = _normalize_first_capitalized(attrs.get("nacionalidad"))

        return attrs


class TrabajadorNuevoSerializer(serializers.Serializer):
    modo = serializers.ChoiceField(choices=[("nuevo", "nuevo")])
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    rut = serializers.CharField(max_length=20)
    sucursal_id = serializers.IntegerField()
    enviar_invitacion = serializers.BooleanField(default=True)

    def validate_rut(self, value):
        if value:
            validate_rut_chileno(value)
        return value
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
    sistema_salud_otro = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    # Datos personales (en User)
    nacionalidad = serializers.CharField(max_length=100)
    fecha_nacimiento = serializers.DateField()
    direccion = serializers.CharField(max_length=250)

    def validate(self, attrs):
        sistema_salud = attrs.get("sistema_salud")
        nombre_isapre = attrs.get("nombre_isapre")
        sistema_salud_otro = attrs.get("sistema_salud_otro")

        banco = attrs.get("banco")
        tipo_cuenta = attrs.get("tipo_cuenta_bancaria")
        numero_cuenta = attrs.get("numero_cuenta_bancaria")

        if sistema_salud == "isapre" and not nombre_isapre:
            raise serializers.ValidationError({"nombre_isapre": "Requerido cuando sistema_salud es isapre."})

        if sistema_salud == "otro" and not sistema_salud_otro:
            raise serializers.ValidationError({"sistema_salud_otro": "Requerido cuando sistema_salud es otro."})

        filled_banking_fields = [bool(banco), bool(tipo_cuenta), bool(numero_cuenta)]
        if any(filled_banking_fields) and not all(filled_banking_fields):
            raise serializers.ValidationError(
                {"banco": "Completa banco, tipo de cuenta y numero de cuenta en conjunto."}
            )

        attrs["nacionalidad"] = _normalize_first_capitalized(attrs.get("nacionalidad"))

        return attrs


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
            "sueldo",
            "tipo_sueldo",
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

class FiniquitoContratoSerializer(serializers.ModelSerializer):
    """Serializer para FiniquitoContrato."""

    estado_label = serializers.SerializerMethodField()

    class Meta:
        model = FiniquitoContrato
        fields = "__all__"
        read_only_fields = (
            "calculado_por",
            "fecha_creacion",
            "fecha_modificacion",
        )

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def validate_conceptos(self, value):
        required_keys = {"id", "nombre", "detalle", "monto"}
        for item in value:
            if not required_keys.issubset(item.keys()):
                raise serializers.ValidationError(
                    f"Cada concepto debe tener las claves: {required_keys}"
                )
        return value
