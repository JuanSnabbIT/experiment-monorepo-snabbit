from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from dateutil.relativedelta import relativedelta
from contratos.models import (
    ContratoEmpresaCliente,
    EnvioContratoAprobacion,
    EnvioContratoFirmaUsuario,
    UsuarioVinculadoContrato,
    ContratoItemComercial,
    ContratoServicio,
    ContratoVisita,
    ContratoLicencia,
    ContratoCondicionEspecial,
    AcuerdoConfidencialidadContrato,
    Servicio,
    ServicioCaracteristica,
    PlanServicio,
    PlanServicioDetalle,
    CaracteristicaServicio,
    UsuarioVinculadoLicencia,
    PersonaLicenciataria,
    CorreoPersonaLicenciataria,
    Visita,
    Licencia,
    CondicionEspecial,
    FacturaContrato,
    PlantillaContrato,
    SeccionPlantilla,
    EtiquetaPlantilla,
    SeccionContratoGenerada,
)
from core.models import AcuerdoConfidencialidadBase
from empresas.models import UsuarioEmpresa
from empresas.serializers import EmpresaContratoSerializer  # Importa el modelo de usuario vinculado a la empresa
from .venta_helpers import (
    calcular_total_convertido_cotizacion,
    construir_resumen_venta_contrato,
    normalizar_moneda,
    resolver_cuotas_venta,
    resolver_forma_pago_venta,
)


# Serializador para CaracteristicaServicio
class CaracteristicaServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaracteristicaServicio
        fields = '__all__'


class ServicioCaracteristicaConfigSerializer(serializers.Serializer):
    caracteristica_id = serializers.PrimaryKeyRelatedField(
        queryset=CaracteristicaServicio.objects.all(),
        source='caracteristica',
    )
    modo = serializers.ChoiceField(choices=ServicioCaracteristica.MODO_CHOICES)
    orden = serializers.IntegerField(required=False, min_value=0)


class ServicioCaracteristicaSerializer(serializers.ModelSerializer):
    caracteristica = CaracteristicaServicioSerializer(read_only=True)
    caracteristica_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = ServicioCaracteristica
        fields = ['id', 'caracteristica_id', 'caracteristica', 'modo', 'orden']


# Serializador para Servicio
class ServicioSerializer(serializers.ModelSerializer):
    caracteristicas = serializers.SerializerMethodField()
    alcance_caracteristicas = ServicioCaracteristicaSerializer(
        source='alcance_items',
        many=True,
        read_only=True,
    )
    alcance_config = ServicioCaracteristicaConfigSerializer(many=True, write_only=True, required=False)
    caracteristicas_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=CaracteristicaServicio.objects.all(),
        write_only=True,
        required=False,
    )
    categoria_label = serializers.SerializerMethodField()
    bloqueado_por_uso = serializers.SerializerMethodField()
    requiere_nueva_version = serializers.SerializerMethodField()
    incluye = serializers.SerializerMethodField()
    no_incluye = serializers.SerializerMethodField()

    class Meta:
        model = Servicio
        fields = '__all__'

    @staticmethod
    def _sync_alcance(servicio, alcance_config):
        if alcance_config is None:
            return

        ServicioCaracteristica.objects.filter(servicio=servicio).delete()

        caracteristicas = []
        incluye = []
        no_incluye = []
        for index, item in enumerate(alcance_config):
            caracteristica = item['caracteristica']
            modo = item['modo']
            orden = item.get('orden', index)
            ServicioCaracteristica.objects.create(
                servicio=servicio,
                caracteristica=caracteristica,
                modo=modo,
                orden=orden,
            )
            caracteristicas.append(caracteristica)
            descripcion = (
                f"{caracteristica.nombre}: {caracteristica.descripcion}"
                if caracteristica.descripcion
                else caracteristica.nombre
            )
            if modo == ServicioCaracteristica.MODO_INCLUYE:
                incluye.append(descripcion)
            else:
                no_incluye.append(descripcion)

        servicio.caracteristicas.set(caracteristicas)
        servicio.incluye = "\n".join(incluye) or None
        servicio.no_incluye = "\n".join(no_incluye) or None
        servicio.save(update_fields=['incluye', 'no_incluye', 'fecha_modificacion'])

    @classmethod
    def clonar_alcance(cls, origen, destino):
        alcance = [
            {
                'caracteristica': item.caracteristica,
                'modo': item.modo,
                'orden': item.orden,
            }
            for item in origen.alcance_items.select_related('caracteristica').all()
        ]
        if alcance:
            cls._sync_alcance(destino, alcance)
            return
        if origen.caracteristicas.exists():
            cls._sync_alcance(
                destino,
                [
                    {
                        'caracteristica': caracteristica,
                        'modo': ServicioCaracteristica.MODO_INCLUYE,
                        'orden': index,
                    }
                    for index, caracteristica in enumerate(origen.caracteristicas.all())
                ],
            )

    def create(self, validated_data):
        alcance_config = validated_data.pop('alcance_config', None)
        caracteristicas_ids = validated_data.pop('caracteristicas_ids', None)
        if alcance_config is None and caracteristicas_ids is not None:
            alcance_config = [
                {
                    'caracteristica': caracteristica,
                    'modo': ServicioCaracteristica.MODO_INCLUYE,
                    'orden': index,
                }
                for index, caracteristica in enumerate(caracteristicas_ids)
            ]
        servicio = super().create(validated_data)
        self._sync_alcance(servicio, alcance_config)
        return servicio

    def update(self, instance, validated_data):
        alcance_config = validated_data.pop('alcance_config', None)
        caracteristicas_ids = validated_data.pop('caracteristicas_ids', None)
        if alcance_config is None and caracteristicas_ids is not None:
            alcance_config = [
                {
                    'caracteristica': caracteristica,
                    'modo': ServicioCaracteristica.MODO_INCLUYE,
                    'orden': index,
                }
                for index, caracteristica in enumerate(caracteristicas_ids)
            ]
        servicio = super().update(instance, validated_data)
        self._sync_alcance(servicio, alcance_config)
        return servicio

    def get_caracteristicas(self, obj):
        items = obj.obtener_resumen_alcance()
        caracteristicas = items['incluye'] + items['no_incluye']
        if caracteristicas:
            return CaracteristicaServicioSerializer(caracteristicas, many=True).data
        return CaracteristicaServicioSerializer(obj.caracteristicas.all(), many=True).data

    def get_categoria_label(self, obj):
        return obj.get_categoria_display()

    def get_incluye(self, obj):
        return obj.construir_texto_alcance(ServicioCaracteristica.MODO_INCLUYE) or obj.incluye

    def get_no_incluye(self, obj):
        return obj.construir_texto_alcance(ServicioCaracteristica.MODO_NO_INCLUYE) or obj.no_incluye

    def get_bloqueado_por_uso(self, obj):
        return (
            ContratoItemComercial.objects.filter(servicio_version=obj).exists()
            or ContratoServicio.objects.filter(object_id=obj.pk, content_type__model='servicio').exists()
            or PlanServicioDetalle.objects.filter(servicio_version=obj).exists()
        )

    def get_requiere_nueva_version(self, obj):
        return self.get_bloqueado_por_uso(obj)

# Serializador para PlanServicio
class PlanServicioSerializer(serializers.ModelSerializer):
    servicios = ServicioSerializer(many=True, read_only=True)
    detalles_servicio = serializers.SerializerMethodField()
    servicios_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Servicio.objects.all(),
        write_only=True, required=False, source='servicios',
    )
    bloqueado_por_uso = serializers.SerializerMethodField()
    requiere_nueva_version = serializers.SerializerMethodField()
    alcance_heredado = serializers.SerializerMethodField()
    alcance_conflictos = serializers.SerializerMethodField()
    precio_sugerido_clp = serializers.SerializerMethodField()
    precio_sugerido_uf = serializers.SerializerMethodField()
    precio_sugerido_usd = serializers.SerializerMethodField()
    incluye = serializers.SerializerMethodField()
    no_incluye = serializers.SerializerMethodField()

    class Meta:
        model = PlanServicio
        fields = '__all__'

    def create(self, validated_data):
        servicios = list(validated_data.pop('servicios', []))
        plan = super().create(validated_data)
        self._guardar_detalles_servicio(plan, servicios)
        return plan

    def update(self, instance, validated_data):
        servicios = validated_data.pop('servicios', None)
        plan = super().update(instance, validated_data)
        if servicios is not None:
            plan.detalles_servicio.all().delete()
            self._guardar_detalles_servicio(plan, list(servicios))
        return plan

    def _guardar_detalles_servicio(self, plan, servicios):
        for orden, servicio in enumerate(servicios):
            PlanServicioDetalle.objects.create(
                plan=plan,
                servicio_version=servicio,
                orden=orden,
                obligatorio=True,
                cantidad_default=1,
                veces_por_mes_default=getattr(servicio, 'veces_por_mes_default', 1) or 1,
            )

    def get_detalles_servicio(self, obj):
        detalles = obj.detalles_servicio.select_related('servicio_version').all()
        return PlanServicioDetalleSerializer(detalles, many=True).data

    def _build_alcance_data(self, obj):
        heredado = []
        conflictos = []
        for item in obj.obtener_items_alcance_resueltos():
            caracteristica = CaracteristicaServicioSerializer(item['caracteristica']).data
            incluye = sorted(item['incluye'])
            no_incluye = sorted(item['no_incluye'])
            if incluye and no_incluye:
                conflictos.append(
                    {
                        'caracteristica': caracteristica,
                        'servicios_incluye': incluye,
                        'servicios_no_incluye': no_incluye,
                    }
                )
                continue
            heredado.append(
                {
                    'caracteristica': caracteristica,
                    'modo': (
                        ServicioCaracteristica.MODO_INCLUYE
                        if incluye
                        else ServicioCaracteristica.MODO_NO_INCLUYE
                    ),
                    'servicios': incluye or no_incluye,
                }
            )
        return heredado, conflictos

    def get_alcance_heredado(self, obj):
        heredado, _conflictos = self._build_alcance_data(obj)
        return heredado

    def get_alcance_conflictos(self, obj):
        _heredado, conflictos = self._build_alcance_data(obj)
        return conflictos

    def get_precio_sugerido_clp(self, obj):
        return sum((detalle.servicio_version.precio_clp or 0) for detalle in obj.detalles_servicio.all())

    def get_precio_sugerido_uf(self, obj):
        return sum((detalle.servicio_version.precio_uf or 0) for detalle in obj.detalles_servicio.all())

    def get_precio_sugerido_usd(self, obj):
        return sum((detalle.servicio_version.precio_usd or 0) for detalle in obj.detalles_servicio.all())

    def get_incluye(self, obj):
        return obj.construir_texto_alcance(ServicioCaracteristica.MODO_INCLUYE) or obj.incluye

    def get_no_incluye(self, obj):
        return obj.construir_texto_alcance(ServicioCaracteristica.MODO_NO_INCLUYE) or obj.no_incluye

    def get_bloqueado_por_uso(self, obj):
        return (
            ContratoItemComercial.objects.filter(plan_version=obj).exists()
            or ContratoServicio.objects.filter(object_id=obj.pk, content_type__model='planservicio').exists()
        )

    def get_requiere_nueva_version(self, obj):
        return self.get_bloqueado_por_uso(obj)

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


class PlanServicioDetalleSerializer(serializers.ModelSerializer):
    servicio_version = ServicioSerializer(read_only=True)

    class Meta:
        model = PlanServicioDetalle
        fields = '__all__'


class ContratoItemComercialSerializer(serializers.ModelSerializer):
    servicio_version = ServicioSerializer(read_only=True)
    plan_version = PlanServicioSerializer(read_only=True)
    nombre = serializers.CharField(source='snapshot_nombre', read_only=True)
    subtotal = serializers.SerializerMethodField()
    tipo_item = serializers.CharField(source='tipo_origen', read_only=True)
    servicio_generico = serializers.SerializerMethodField()

    class Meta:
        model = ContratoItemComercial
        fields = '__all__'

    def get_subtotal(self, obj):
        if obj.forma_pago == 'pago_unico':
            return float(obj.total_pago_unico)
        if obj.forma_pago == 'anual':
            return float(obj.total_anual)
        return float(obj.total_mensual)

    def get_servicio_generico(self, obj):
        if obj.tipo_origen == 'plan' and obj.plan_version_id:
            return PlanServicioSerializer(obj.plan_version).data
        if obj.tipo_origen == 'servicio' and obj.servicio_version_id:
            return ServicioSerializer(obj.servicio_version).data
        return {
            'id': obj.catalogo_version_id,
            'nombre': obj.snapshot_nombre,
            'descripcion': obj.snapshot_descripcion,
            'incluye': obj.snapshot_incluye,
            'no_incluye': obj.snapshot_no_incluye,
            'clausulas_especiales': obj.snapshot_clausulas,
        }

# Serializador para ContratoServicio
class ContratoServicioSerializer(serializers.ModelSerializer):
    # Mostramos en forma anidada el servicio o plan relacionado según el content_type
    servicio_generico = serializers.SerializerMethodField()
    contrato = serializers.PrimaryKeyRelatedField(read_only=True)
    nombre = serializers.SerializerMethodField()

    subtotal = serializers.SerializerMethodField()
    tipo_item = serializers.SerializerMethodField()

    class Meta:
        model = ContratoServicio
        fields = '__all__'

    def get_servicio_generico(self, obj):
        if obj.item_comercial_id:
            return ContratoItemComercialSerializer(obj.item_comercial).data.get('servicio_generico')
        if obj.content_type.model == 'servicio':
            return ServicioSerializer(obj.servicio_generico).data
        elif obj.content_type.model == 'planservicio':
            return PlanServicioSerializer(obj.servicio_generico).data
        return None

    def get_nombre(self, obj):
        if obj.item_comercial_id:
            return obj.item_comercial.snapshot_nombre
        if obj.servicio_generico:
            return obj.servicio_generico.nombre
        else:
            return ""

    def get_subtotal(self, obj):
        if obj.item_comercial_id:
            return float(obj.item_comercial.total_para_forma_pago_contractual)
        return float(obj.precio_unitario) * obj.cantidad

    def get_tipo_item(self, obj):
        if obj.item_comercial_id:
            return obj.item_comercial.tipo_origen
        if obj.content_type_id:
            return obj.content_type.model
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
    nombre_condicion = serializers.SerializerMethodField()
    detalle_condicion = serializers.SerializerMethodField()
    multa_condicion = serializers.SerializerMethodField()

    class Meta:
        model = ContratoCondicionEspecial
        fields = '__all__'

    def get_titulo_condicion(self, obj):
        return self.get_nombre_condicion(obj)

    def get_descripcion_condicion(self, obj):
        return self.get_detalle_condicion(obj)

    def get_nombre_condicion(self, obj):
        if obj.titulo_personalizado:
            return obj.titulo_personalizado
        if obj.condicion:
            return obj.condicion.titulo
        return 'Condicion especial'

    def get_detalle_condicion(self, obj):
        if obj.detalle_personalizado:
            return obj.detalle_personalizado
        if obj.condicion:
            return obj.condicion.descripcion
        return obj.texto or ''

    def get_multa_condicion(self, obj):
        if obj.multa_incumplimiento:
            return float(obj.multa_incumplimiento)
        if obj.condicion_id:
            return float(obj.condicion.multa_incumplimiento)
        return 0
        

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
    nombre_usuario = serializers.SerializerMethodField()
    correo_usuario = serializers.SerializerMethodField()
    es_externo = serializers.SerializerMethodField()

    class Meta:
        model = AcuerdoConfidencialidadContrato
        fields = '__all__'

    def get_titulo_acuerdo(self, obj):
        return obj.acuerdo_base.titulo if obj.acuerdo_base_id else ''

    def get_contenido_acuerdo(self, obj):
        return obj.acuerdo_base.contenido if obj.acuerdo_base_id else ''

    def get_nombre_usuario(self, obj):
        return obj.nombre_usuario

    def get_correo_usuario(self, obj):
        return obj.correo_usuario

    def get_es_externo(self, obj):
        return obj.es_externo

    def validate(self, attrs):
        attrs = super().validate(attrs)
        usuario_empresa = attrs.get('firma_usuario_empresa') or getattr(self.instance, 'firma_usuario_empresa', None)
        nombre_firmante = attrs.get('nombre_firmante') or getattr(self.instance, 'nombre_firmante', None)
        correo_firmante = attrs.get('correo_firmante') or getattr(self.instance, 'correo_firmante', None)

        if not usuario_empresa and not correo_firmante:
            raise serializers.ValidationError(
                {'firma_usuario_empresa': 'Debe indicar un usuario interno o un firmante externo.'}
            )
        if not usuario_empresa and not nombre_firmante:
            raise serializers.ValidationError(
                {'nombre_firmante': 'Debe indicar el nombre del firmante externo.'}
            )

        periodicidad = attrs.get('periodicidad_meses')
        if periodicidad is not None and periodicidad <= 0:
            raise serializers.ValidationError(
                {'periodicidad_meses': 'La periodicidad debe ser mayor que cero.'}
            )

        return attrs

    def create(self, validated_data):
        vigencia_desde = validated_data.get("vigencia_desde")
        periodicidad = validated_data.get("periodicidad_meses")
        if vigencia_desde and periodicidad and not validated_data.get("vigencia_hasta"):
            validated_data["vigencia_hasta"] = vigencia_desde + relativedelta(months=periodicidad)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        vigencia_desde = validated_data.get("vigencia_desde", instance.vigencia_desde)
        periodicidad = validated_data.get("periodicidad_meses", instance.periodicidad_meses)
        if vigencia_desde and periodicidad and "vigencia_hasta" not in validated_data:
            validated_data["vigencia_hasta"] = vigencia_desde + relativedelta(months=periodicidad)
        return super().update(instance, validated_data)

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
            "deprecado": envio.deprecado,
            "fecha_deprecacion": envio.fecha_deprecacion,
            "motivo_deprecacion": envio.motivo_deprecacion,
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


# ── Serializers del Sistema de Plantillas ──

class SeccionPlantillaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeccionPlantilla
        fields = '__all__'
        read_only_fields = ['plantilla', 'fecha_creacion', 'fecha_modificacion']

    def validate(self, attrs):
        from contratos.estados_modelo import CONTENIDO_CANONICO_FIRMAS

        tipo = attrs.get('tipo', getattr(self.instance, 'tipo', None))

        if tipo == 'firmas':
            attrs['contenido_template'] = CONTENIDO_CANONICO_FIRMAS
            attrs['es_editable_en_contrato'] = False
            attrs['es_obligatoria'] = True
        return attrs


class PlantillaContratoSerializer(serializers.ModelSerializer):
    secciones = SeccionPlantillaSerializer(many=True, read_only=True)
    tipo_contrato_label = serializers.CharField(
        source='get_tipo_contrato_display', read_only=True,
    )

    class Meta:
        model = PlantillaContrato
        fields = '__all__'
        read_only_fields = ['fecha_creacion', 'fecha_modificacion', 'empresa_prestadora', 'es_default']


class EtiquetaPlantillaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EtiquetaPlantilla
        fields = '__all__'
        read_only_fields = ['fecha_creacion', 'fecha_modificacion']


class SeccionContratoGeneradaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeccionContratoGenerada
        fields = '__all__'
        read_only_fields = ['fecha_creacion', 'fecha_modificacion', 'contrato']


# Serializadores para cotizaciones vinculadas a contratos de venta
class CotizacionVinculadaItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nombre = serializers.SerializerMethodField()
    cantidad = serializers.IntegerField()
    tipo_moneda = serializers.CharField()
    tipo_moneda_label = serializers.SerializerMethodField()
    precio_unitario_origen = serializers.DecimalField(max_digits=10, decimal_places=2, source="precio_unitario")
    costo_total_origen = serializers.DecimalField(max_digits=10, decimal_places=2, source="costo_total")
    precio_unitario = serializers.SerializerMethodField()
    costo_total = serializers.SerializerMethodField()

    def get_nombre(self, obj):
        if obj.item_empresa:
            return obj.item_empresa.nombre
        return obj.nombre

    def get_tipo_moneda_label(self, obj):
        return obj.get_tipo_moneda_display()

    def get_precio_unitario(self, obj):
        return float(obj.precio_venta_neta_unitario_moneda_base)

    def get_costo_total(self, obj):
        return float(obj.precio_venta_neta_total_moneda_base)


class CotizacionVinculadaResumenSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    numero_cotizacion = serializers.IntegerField()
    nombre = serializers.CharField()
    estado = serializers.CharField()
    estado_label = serializers.SerializerMethodField()
    tipo_moneda = serializers.CharField()
    tipo_moneda_label = serializers.SerializerMethodField()
    total_estimado = serializers.SerializerMethodField()
    fecha_vencimiento = serializers.DateField()
    items_count = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    moneda_contrato = serializers.SerializerMethodField()
    total_convertido = serializers.SerializerMethodField()
    dolar_observado = serializers.SerializerMethodField()
    valor_uf = serializers.SerializerMethodField()
    tiene_items_moneda_mixta = serializers.SerializerMethodField()
    monedas_items = serializers.SerializerMethodField()

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_tipo_moneda_label(self, obj):
        return obj.get_tipo_moneda_display()

    def get_total_estimado(self, obj):
        return obj.calcular_total_estimado

    def get_items_count(self, obj):
        return obj.items.count()

    def get_items(self, obj):
        return CotizacionVinculadaItemSerializer(obj.items.all(), many=True).data

    def get_moneda_contrato(self, obj):
        contrato = getattr(obj, "contrato", None)
        if not contrato:
            return None
        try:
            return normalizar_moneda(contrato.moneda_cobro)
        except ValueError:
            return contrato.moneda_cobro

    def get_total_convertido(self, obj):
        contrato = getattr(obj, "contrato", None)
        if not contrato:
            return None
        try:
            return float(calcular_total_convertido_cotizacion(obj, contrato.moneda_cobro))
        except ValueError:
            return None

    def get_dolar_observado(self, obj):
        value = getattr(obj, "dolar_observado", None)
        return float(value) if value not in (None, "") else None

    def get_valor_uf(self, obj):
        value = getattr(obj, "valor_uf", None)
        return float(value) if value not in (None, "") else None

    def get_tiene_items_moneda_mixta(self, obj):
        moneda_cotizacion = normalizar_moneda(getattr(obj, "tipo_moneda", None))
        monedas_items = {
            normalizar_moneda(getattr(item, "tipo_moneda", None) or "2")
            for item in obj.items.all()
        }
        return any(moneda != moneda_cotizacion for moneda in monedas_items)

    def get_monedas_items(self, obj):
        monedas_items = sorted(
            {
                normalizar_moneda(getattr(item, "tipo_moneda", None) or "2")
                for item in obj.items.all()
            }
        )
        return monedas_items


# Serializador para ContratoEmpresaCliente
class ContratoEmpresaClienteSerializer(serializers.ModelSerializer):
    # Mostramos los datos de las relaciones a través de inlines de solo lectura.
    items_comerciales = ContratoItemComercialSerializer(many=True, read_only=True)
    contrato_servicios = ContratoServicioSerializer(many=True, read_only=True)
    contrato_visitas = ContratoVisitaSerializer(many=True, read_only=True)
    contrato_licencias = ContratoLicenciaSerializer(many=True, read_only=True)
    contrato_condiciones_especiales = ContratoCondicionEspecialSerializer(many=True, read_only=True)
    cotizaciones_vinculadas = CotizacionVinculadaResumenSerializer(many=True, read_only=True)
    # La relación ManyToMany mediante el modelo intermedio se accede mediante el related_name "vinculos_contrato"
    vinculos_contrato = UsuarioVinculadoContratoSerializer(many=True, read_only=True)
    firmas_confidencialidad = AcuerdoConfidencialidadContratoSerializer(many=True, read_only=True)
    secciones_generadas = SeccionContratoGeneradaSerializer(many=True, read_only=True)
    estado_label = serializers.SerializerMethodField()
    valido = serializers.SerializerMethodField()
    datos_empresa = serializers.SerializerMethodField()
    datos_cliente = serializers.SerializerMethodField()
    tipo_label = serializers.SerializerMethodField()
    destinatario_principal = serializers.SerializerMethodField()
    ultimo_envio_aprobacion = serializers.SerializerMethodField()
    ultimo_envio_firma = serializers.SerializerMethodField()
    ultimo_comentario_cliente = serializers.SerializerMethodField()
    total_contrato = serializers.SerializerMethodField()
    resumen_comercial = serializers.SerializerMethodField()
    contrato_anterior_detalle = serializers.SerializerMethodField()
    renovaciones_detalle = serializers.SerializerMethodField()

    documento_final_url = serializers.CharField(read_only=True, required=False)

    class Meta:
        model = ContratoEmpresaCliente
        fields = '__all__'

    def validate(self, attrs):
        attrs = super().validate(attrs)
        tipo_contrato = attrs.get("tipo") or getattr(self.instance, "tipo", None)
        if tipo_contrato == "venta":
            forma_pago_venta = resolver_forma_pago_venta(
                self.instance,
                forma_pago_venta=attrs.get("forma_pago_venta"),
                forma_pago_contractual=attrs.get("forma_pago_contractual"),
            )
            try:
                cuotas_venta = resolver_cuotas_venta(
                    self.instance,
                    forma_pago_venta=forma_pago_venta,
                    cuotas_venta=attrs.get("cuotas_venta"),
                    forma_pago_contractual=attrs.get("forma_pago_contractual"),
                    strict=True,
                    require_hitos="cuotas_venta" in attrs,
                )
            except ValueError as exc:
                raise serializers.ValidationError({"cuotas_venta": [str(exc)]}) from exc
            attrs["forma_pago_venta"] = forma_pago_venta
            attrs["cuotas_venta"] = cuotas_venta
            attrs["forma_pago_contractual"] = "pago_unico"
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
        tiene_contenido_comercial = (
            obj.items_comerciales.exists()
            or obj.contrato_servicios.exists()
            or (obj.tipo == "venta" and obj.cotizaciones_vinculadas.exists())
        )
        if not tiene_contenido_comercial:
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
            "deprecado": envio.deprecado,
            "fecha_deprecacion": envio.fecha_deprecacion,
            "motivo_deprecacion": envio.motivo_deprecacion,
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

    def get_total_contrato(self, obj):
        if obj.tipo == "venta":
            try:
                return construir_resumen_venta_contrato(obj)["total_contrato"]
            except ValueError:
                return 0
        if obj.items_comerciales.exists():
            total_servicios = float(obj.total_items_comerciales)
        else:
            total_servicios = sum(
                float(servicio.precio_unitario) * servicio.cantidad
                for servicio in obj.contrato_servicios.all()
            )
        total_licencias = sum(
            float(licencia.precio_unitario) * licencia.cantidad
            for licencia in obj.contrato_licencias.all()
        )
        return total_servicios + total_licencias

    def get_contrato_anterior_detalle(self, obj):
        if not obj.contrato_anterior:
            return None
        return {
            "id": obj.contrato_anterior.id,
            "nombre": obj.contrato_anterior.nombre,
            "estado": obj.contrato_anterior.estado,
        }

    def get_renovaciones_detalle(self, obj):
        renovaciones = obj.renovaciones.all().order_by("-fecha_creacion")
        return [
            {"id": r.id, "nombre": r.nombre, "estado": r.estado}
            for r in renovaciones
        ]

    def get_resumen_comercial(self, obj):
        if obj.tipo == "venta":
            try:
                return construir_resumen_venta_contrato(obj)
            except ValueError as exc:
                return {
                    "tipo_resumen": "venta",
                    "moneda": obj.moneda_cobro,
                    "forma_pago_contractual": "pago_unico",
                    "forma_pago_venta": resolver_forma_pago_venta(obj),
                    "forma_pago_venta_label": (
                        "Cuotas" if resolver_forma_pago_venta(obj) == "cuotas" else "Contado"
                    ),
                    "total_mensual": 0,
                    "total_anual": 0,
                    "total_pago_unico": 0,
                    "total_licencias": 0,
                    "total_contrato": 0,
                    "cuotas_venta": [],
                    "cuotas_venta_resumen": [],
                    "cotizaciones_vinculadas_count": obj.cotizaciones_vinculadas.count(),
                    "cotizaciones_detalle": [],
                    "errores_conversion": [str(exc)],
                }
        total_mensual = sum(float(item.total_mensual) for item in obj.items_comerciales.all())
        total_anual = sum(float(item.total_anual) for item in obj.items_comerciales.all())
        total_pago_unico = sum(float(item.total_pago_unico) for item in obj.items_comerciales.all())
        total_licencias = sum(
            float(licencia.precio_unitario) * licencia.cantidad
            for licencia in obj.contrato_licencias.all()
        )
        return {
            "tipo_resumen": obj.tipo,
            "moneda": obj.moneda_cobro,
            "forma_pago_contractual": obj.forma_pago_contractual,
            "total_mensual": total_mensual,
            "total_anual": total_anual,
            "total_pago_unico": total_pago_unico,
            "total_licencias": total_licencias,
            "total_contrato": self.get_total_contrato(obj),
        }

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
    nombre_contrato = serializers.SerializerMethodField()
    nombre_cliente = serializers.SerializerMethodField()
    nombre_prestadora = serializers.SerializerMethodField()
    creado_por_nombre = serializers.SerializerMethodField()
    monto_calculado = serializers.SerializerMethodField()

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

    def get_nombre_contrato(self, obj):
        return getattr(getattr(obj, "contrato", None), "nombre", None)

    def get_nombre_cliente(self, obj):
        return getattr(getattr(obj, "empresa_cliente", None), "nombre", None)

    def get_nombre_prestadora(self, obj):
        return getattr(getattr(obj, "empresa_prestadora", None), "nombre", None)

    def get_creado_por_nombre(self, obj):
        if obj.creado_por:
            return str(obj.creado_por)
        return None

    def get_monto_calculado(self, obj):
        contrato = getattr(obj, "contrato", None)
        if contrato is None:
            return "0"
        total = getattr(contrato, "total_items_comerciales", 0) or 0
        return str(total)


# ── Serializers para Matching OT → Contrato ──

class ContratoVisitaMatchingSerializer(serializers.ModelSerializer):
    descripcion_visita = serializers.SerializerMethodField()
    frecuencia_label = serializers.SerializerMethodField()

    class Meta:
        model = ContratoVisita
        fields = [
            "id", "visita", "frecuencia", "frecuencia_label",
            "cantidad", "visitas_usadas", "descripcion_visita",
        ]

    def get_descripcion_visita(self, obj):
        return obj.visita.descripcion

    def get_frecuencia_label(self, obj):
        return obj.get_frecuencia_display()


class ContratoItemComercialMatchingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContratoItemComercial
        fields = [
            "id", "tipo_origen", "snapshot_nombre", "cantidad", "veces_por_mes",
            "precio_unitario_contratado", "total_mensual", "moneda",
            "num_visitas_mensuales", "snapshot_componentes_plan",
        ]


class ContratoMatchingSerializer(serializers.ModelSerializer):
    visitas = ContratoVisitaMatchingSerializer(
        source="contrato_visitas", many=True, read_only=True
    )
    items_comerciales = ContratoItemComercialMatchingSerializer(
        many=True, read_only=True
    )
    estado_label = serializers.SerializerMethodField()

    class Meta:
        model = ContratoEmpresaCliente
        fields = [
            "id", "nombre", "estado", "estado_label",
            "empresa_cliente",
            "moneda_cobro", "dia_facturacion", "precio_visita_adicional",
            "fecha_inicio", "fecha_fin",
            "visitas", "items_comerciales",
        ]

    def get_estado_label(self, obj):
        return obj.get_estado_display()
