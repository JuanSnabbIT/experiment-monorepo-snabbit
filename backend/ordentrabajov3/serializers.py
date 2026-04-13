from rest_framework import serializers
from empresas.models import RelacionEmpresa
from .models import (
    OrdenDeTrabajoV3,
    TareaOTV3,
    AsignacionTecnicoOTV3,
    ChecklistItemOTV3,
    SeguimientoOTV3,
    GastoOTV3,
    AdjuntoOTV3,
    HistorialEstadoOTV3,
    PrefacturaOTV3,
)


# ---- Serializadores resumidos de bodegas para uso en OTV3 ----

class ItemGuiaSalidaResumenOTV3Serializer(serializers.Serializer):
    id = serializers.IntegerField()
    nombre_item = serializers.SerializerMethodField()
    numero_serie = serializers.JSONField()
    cantidad_rebajada = serializers.IntegerField()
    individualizado = serializers.BooleanField()

    def get_nombre_item(self, obj):
        try:
            return obj.stock_item.item.nombre
        except Exception:
            return ""


class GuiaSalidaResumenOTV3Serializer(serializers.Serializer):
    id = serializers.IntegerField()
    estado = serializers.CharField()
    estado_label = serializers.SerializerMethodField()
    motivo = serializers.CharField()
    cliente_nombre = serializers.SerializerMethodField()
    cotizacion_origen_id = serializers.SerializerMethodField()
    cotizacion_origen_numero = serializers.SerializerMethodField()
    fecha_creacion = serializers.DateTimeField()
    cantidad_items_total = serializers.SerializerMethodField()
    descripcion_items = serializers.SerializerMethodField()

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_cliente_nombre(self, obj):
        return obj.cliente.nombre if obj.cliente else ""

    def get_cotizacion_origen_id(self, obj):
        return obj.cotizacion_origen_efectiva_id

    def get_cotizacion_origen_numero(self, obj):
        cotizacion = obj.cotizacion_origen_efectiva
        if cotizacion:
            return cotizacion.numero_cotizacion
        return None

    def get_cantidad_items_total(self, obj):
        items = obj.itemsguiasalida_set.all()
        total = 0
        for item in items:
            total += item.cantidad_rebajada or item.cantidad_original or 0
        return total

    def get_descripcion_items(self, obj):
        items = obj.itemsguiasalida_set.all()
        n_items = items.count()
        total = 0
        for item in items:
            total += item.cantidad_rebajada or item.cantidad_original or 0
        return f"{n_items} item(s), {total} unidad(es)"

    items_detalle = ItemGuiaSalidaResumenOTV3Serializer(
        source="itemsguiasalida_set", many=True, read_only=True
    )


class OrdenCompraResumenOTV3Serializer(serializers.Serializer):
    id = serializers.IntegerField()
    codigo = serializers.CharField()
    estado = serializers.CharField()
    estado_label = serializers.SerializerMethodField()
    nombre_proveedor = serializers.SerializerMethodField()
    nombre_cliente = serializers.SerializerMethodField()
    fecha_compra = serializers.DateField(allow_null=True)
    relacion_cotizacion_numero = serializers.SerializerMethodField()
    relacion_cotizacion_id = serializers.SerializerMethodField()

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_nombre_proveedor(self, obj):
        return obj.proveedor.nombre if obj.proveedor else ""

    def get_nombre_cliente(self, obj):
        return obj.oc_cliente.nombre if obj.oc_cliente else ""

    def get_relacion_cotizacion_numero(self, obj):
        if obj.relacion_cotizacion:
            return obj.relacion_cotizacion.numero_cotizacion
        return None

    def get_relacion_cotizacion_id(self, obj):
        return obj.relacion_cotizacion_id


class ChecklistItemOTV3Serializer(serializers.ModelSerializer):
    completado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistItemOTV3
        fields = [
            "id", "tarea", "tipo", "tipo_display", "descripcion",
            "completado", "completado_por", "completado_por_nombre",
            "fecha_completado", "fecha_creacion",
        ]
        read_only_fields = ["fecha_creacion"]

    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    def get_completado_por_nombre(self, obj):
        if obj.completado_por:
            return obj.completado_por.get_nombre_completo() or obj.completado_por.email
        return None


class TareaOTV3Serializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    tipo_tarea_display = serializers.CharField(source="get_tipo_tarea_display", read_only=True)
    tecnico_asignado_nombre = serializers.SerializerMethodField()
    usuario_receptor_nombre = serializers.SerializerMethodField()
    checklist = ChecklistItemOTV3Serializer(many=True, read_only=True)
    checklist_completado = serializers.SerializerMethodField()
    checklist_total = serializers.SerializerMethodField()

    item_guia_origen = serializers.IntegerField(
        source="item_guia_origen_id", read_only=True, allow_null=True
    )
    item_guia_origen_detalle = serializers.SerializerMethodField()

    class Meta:
        model = TareaOTV3
        fields = [
            "id", "orden", "titulo", "descripcion",
            "estado", "estado_display",
            "tipo_tarea", "tipo_tarea_display",
            "tecnico_asignado", "tecnico_asignado_nombre",
            "usuario_receptor", "usuario_receptor_nombre",
            "fecha_programada", "fecha_ejecutada",
            "notas_ejecucion", "requiere_firma", "firma_datos",
            "checklist", "checklist_completado", "checklist_total",
            "item_guia_origen", "item_guia_origen_detalle",
            "fecha_creacion", "fecha_modificacion",
        ]
        read_only_fields = ["id", "orden", "estado_display", "tipo_tarea_display",
                            "tecnico_asignado_nombre", "usuario_receptor_nombre",
                            "fecha_ejecutada", "firma_datos",
                            "checklist", "checklist_completado", "checklist_total",
                            "item_guia_origen", "item_guia_origen_detalle",
                            "fecha_creacion", "fecha_modificacion"]

    def get_tecnico_asignado_nombre(self, obj):
        if obj.tecnico_asignado:
            return obj.tecnico_asignado.get_nombre_completo() or obj.tecnico_asignado.email
        return None

    def get_usuario_receptor_nombre(self, obj):
        if obj.usuario_receptor:
            return str(obj.usuario_receptor)
        return None

    def get_checklist_completado(self, obj):
        return obj.checklist.filter(completado=True).count()

    def get_checklist_total(self, obj):
        return obj.checklist.count()

    def get_item_guia_origen_detalle(self, obj):
        if not obj.item_guia_origen_id:
            return None
        try:
            item = obj.item_guia_origen
            return {
                "id": item.id,
                "nombre_item": item.stock_item.item.nombre,
                "individualizado": item.individualizado,
                "cantidad_rebajada": item.cantidad_rebajada,
            }
        except Exception:
            return None


class AsignacionTecnicoOTV3Serializer(serializers.ModelSerializer):
    rol_display = serializers.CharField(source="get_rol_display", read_only=True)
    tecnico_nombre = serializers.SerializerMethodField()
    tecnico_email = serializers.SerializerMethodField()

    class Meta:
        model = AsignacionTecnicoOTV3
        fields = [
            "id", "orden", "tecnico", "tecnico_nombre", "tecnico_email",
            "rol", "rol_display", "confirmado",
            "fecha_creacion",
        ]
        read_only_fields = ["id", "orden", "tecnico_nombre", "tecnico_email", "rol_display", "fecha_creacion"]

    def get_tecnico_nombre(self, obj):
        return obj.tecnico.get_nombre_completo() or obj.tecnico.email

    def get_tecnico_email(self, obj):
        return obj.tecnico.email


class SeguimientoOTV3Serializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    autor_nombre = serializers.SerializerMethodField()

    class Meta:
        model = SeguimientoOTV3
        fields = [
            "id", "orden", "tarea",
            "tipo", "tipo_display",
            "contenido",
            "autor", "autor_nombre",
            "fecha_creacion",
        ]
        # `orden` y `tarea` vienen inferidos por la URL nested (/ordenes/{orden_pk}/...).
        # Si no son read-only, DRF los exige en el body y el POST falla con 400.
        read_only_fields = ["fecha_creacion", "autor", "orden", "tarea"]

    def get_autor_nombre(self, obj):
        if obj.autor:
            return obj.autor.get_nombre_completo() or obj.autor.email
        return None

    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["autor"] = request.user
        return super().create(validated_data)


class GastoOTV3Serializer(serializers.ModelSerializer):
    categoria_nombre = serializers.SerializerMethodField()
    usuario_comprador_nombre = serializers.SerializerMethodField()

    class Meta:
        model = GastoOTV3
        fields = [
            "id", "orden", "tarea",
            "categoria", "categoria_nombre",
            "detalle", "cantidad", "monto_unitario", "monto_total",
            "comprobante",
            "usuario_comprador", "usuario_comprador_nombre",
            "fecha_compra", "fecha_creacion",
        ]
        read_only_fields = ["fecha_creacion", "monto_total", "usuario_comprador", "orden"]

    def get_categoria_nombre(self, obj):
        return obj.categoria.nombre if obj.categoria else None

    def get_usuario_comprador_nombre(self, obj):
        if obj.usuario_comprador:
            return obj.usuario_comprador.get_nombre_completo() or obj.usuario_comprador.email
        return None

    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["usuario_comprador"] = request.user
        return super().create(validated_data)


class AdjuntoOTV3Serializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    subido_por_nombre = serializers.SerializerMethodField()
    archivo_url = serializers.SerializerMethodField()

    class Meta:
        model = AdjuntoOTV3
        fields = [
            "id", "orden", "tarea",
            "tipo", "tipo_display",
            "archivo", "archivo_url", "descripcion",
            "subido_por", "subido_por_nombre",
            "fecha_creacion",
        ]
        read_only_fields = ["fecha_creacion", "subido_por", "orden"]

    def get_subido_por_nombre(self, obj):
        if obj.subido_por:
            return obj.subido_por.get_nombre_completo() or obj.subido_por.email
        return None

    def get_archivo_url(self, obj):
        request = self.context.get("request")
        if obj.archivo and request:
            return request.build_absolute_uri(obj.archivo.url)
        return None

    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["subido_por"] = request.user
        return super().create(validated_data)


class HistorialEstadoOTV3Serializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()
    estado_anterior_display = serializers.SerializerMethodField()
    estado_nuevo_display = serializers.SerializerMethodField()

    class Meta:
        model = HistorialEstadoOTV3
        fields = [
            "id", "orden",
            "estado_anterior", "estado_anterior_display",
            "estado_nuevo", "estado_nuevo_display",
            "comentario",
            "usuario", "usuario_nombre",
            "fecha_creacion",
        ]
        read_only_fields = ["fecha_creacion"]

    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return obj.usuario.get_nombre_completo() or obj.usuario.email
        return "Sistema"

    def get_estado_anterior_display(self, obj):
        from .estados_modelo import ESTADOS_OT_V3
        return dict(ESTADOS_OT_V3).get(obj.estado_anterior, obj.estado_anterior)

    def get_estado_nuevo_display(self, obj):
        from .estados_modelo import ESTADOS_OT_V3
        return dict(ESTADOS_OT_V3).get(obj.estado_nuevo, obj.estado_nuevo)


# ---- Serializers de lista (compactos) ----

class OrdenDeTrabajoV3ListSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    modalidad_display = serializers.CharField(source="get_modalidad_display", read_only=True)
    tipo_servicio_display = serializers.CharField(source="get_tipo_servicio_display", read_only=True)
    prioridad_display = serializers.CharField(source="get_prioridad_display", read_only=True)
    cliente_nombre = serializers.SerializerMethodField()
    empresa_nombre = serializers.SerializerMethodField()
    tecnico_responsable_nombre = serializers.SerializerMethodField()
    total_tareas = serializers.SerializerMethodField()
    tareas_completadas = serializers.SerializerMethodField()
    etapa_ui = serializers.SerializerMethodField()

    class Meta:
        model = OrdenDeTrabajoV3
        fields = [
            "id", "titulo",
            "empresa", "empresa_nombre",
            "cliente", "cliente_nombre",
            "tipo_servicio", "tipo_servicio_display",
            "modalidad", "modalidad_display",
            "estado", "estado_display",
            "prioridad", "prioridad_display",
            "etapa_ui",
            "tecnico_responsable", "tecnico_responsable_nombre",
            "fecha_programada", "fecha_fin_estimada",
            "fecha_inicio_real", "fecha_finalizacion_real",
            "total_tareas", "tareas_completadas",
            "fecha_creacion",
        ]

    def get_cliente_nombre(self, obj):
        return obj.cliente.nombre if obj.cliente else None

    def get_empresa_nombre(self, obj):
        return obj.empresa.nombre if obj.empresa else None

    def get_tecnico_responsable_nombre(self, obj):
        if obj.tecnico_responsable:
            return obj.tecnico_responsable.get_nombre_completo() or obj.tecnico_responsable.email
        return None

    def get_total_tareas(self, obj):
        return obj.tareas.count()

    def get_tareas_completadas(self, obj):
        return obj.tareas.filter(estado="completada").count()

    def get_etapa_ui(self, obj):
        return obj.get_etapa_ui()


# ---- Serializer de detalle (completo) ----

class ClienteSolicitanteDetalleSerializer(serializers.Serializer):
    """Serializer inline para el detalle del cliente solicitante en OTV3."""
    id = serializers.IntegerField()
    nombre = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()

    def get_nombre(self, obj):
        if hasattr(obj, "usuario") and obj.usuario:
            if hasattr(obj.usuario, "get_nombre_completo"):
                return obj.usuario.get_nombre_completo()
            return str(obj.usuario)
        return str(obj)

    def get_email(self, obj):
        if hasattr(obj, "usuario") and obj.usuario:
            return getattr(obj.usuario, "email", None)
        return None


class OrdenDeTrabajoV3DetalleSerializer(OrdenDeTrabajoV3ListSerializer):
    tareas = TareaOTV3Serializer(many=True, read_only=True)
    asignaciones = AsignacionTecnicoOTV3Serializer(many=True, read_only=True)
    seguimientos = SeguimientoOTV3Serializer(many=True, read_only=True)
    gastos = GastoOTV3Serializer(many=True, read_only=True)
    adjuntos = AdjuntoOTV3Serializer(many=True, read_only=True)
    historial_estados = HistorialEstadoOTV3Serializer(many=True, read_only=True)
    total_gastos = serializers.SerializerMethodField()
    guias_vinculadas = GuiaSalidaResumenOTV3Serializer(source="guias_salida", many=True, read_only=True)
    ordenes_compra_vinculadas = OrdenCompraResumenOTV3Serializer(source="ordenes_compra", many=True, read_only=True)
    cotizaciones_detalle = serializers.SerializerMethodField()
    cliente_solicitante_detalle = ClienteSolicitanteDetalleSerializer(source="cliente_solicitante", read_only=True)
    cliente_es_prospecto = serializers.SerializerMethodField()

    class Meta(OrdenDeTrabajoV3ListSerializer.Meta):
        fields = OrdenDeTrabajoV3ListSerializer.Meta.fields + [
            "descripcion", "contrato", "sucursal",
            "cliente_solicitante",
            "cliente_solicitante_detalle",
            "cliente_es_prospecto",
            "direccion", "notas_internas",
            "tareas", "asignaciones", "seguimientos",
            "gastos", "adjuntos", "historial_estados",
            "total_gastos",
            "guias_vinculadas", "ordenes_compra_vinculadas",
            "cotizaciones_detalle",
            "fecha_modificacion",
        ]

    def get_total_gastos(self, obj):
        from django.db.models import Sum
        result = obj.gastos.aggregate(total=Sum("monto_total"))
        return result["total"] or 0

    def get_cliente_es_prospecto(self, obj):
        return RelacionEmpresa.objects.filter(
            prestador_servicios=obj.empresa,
            cliente=obj.cliente,
            tipo_relacion="prospecto",
        ).exists()

    def get_cotizaciones_detalle(self, obj):
        MONEDA_LABEL = {"1": "USD", "2": "CLP", "3": "UF"}
        result = []
        for cot in obj.cotizaciones.all():
            # Usar select_related explícito para garantizar N+1 controlado y
            # obtener todos los items independientemente del proveedor
            items_list = list(
                cot.items.select_related("item_empresa", "proveedor_empresa").all()
            )
            tiene_equipos = any(
                i.item_empresa and getattr(i.item_empresa, "es_equipo", False)
                for i in items_list
            )
            items_data = []
            for item in items_list:
                nombre = item.nombre or (
                    item.item_empresa.nombre if item.item_empresa else "Sin nombre"
                )
                proveedor_nombre = (
                    item.proveedor_empresa.nombre if item.proveedor_empresa else None
                )
                items_data.append({
                    "id": item.id,
                    "nombre": nombre,
                    "proveedor_empresa_nombre": proveedor_nombre,
                    "cantidad": item.cantidad,
                    "precio_unitario": str(item.precio_unitario),
                    "costo_total": str(item.costo_total),
                    "tipo_moneda": item.tipo_moneda,
                    "tipo_moneda_label": MONEDA_LABEL.get(item.tipo_moneda, item.tipo_moneda),
                })
            result.append({
                "id": cot.id,
                "numero_cotizacion": cot.numero_cotizacion,
                "nombre": cot.nombre,
                "estado": cot.estado,
                "total_estimado": str(cot.total_estimado),
                "tipo_moneda": cot.tipo_moneda,
                "tipo_moneda_label": MONEDA_LABEL.get(cot.tipo_moneda, cot.tipo_moneda),
                "tiene_equipos": tiene_equipos,
                "items": items_data,
            })
        return result


# ---- Serializer de escritura (create/update) ----

class OrdenDeTrabajoV3WriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrdenDeTrabajoV3
        fields = [
            "id",
            "titulo", "descripcion",
            "empresa", "sucursal", "cliente", "contrato", "cotizaciones",
            "cliente_solicitante",
            "tipo_servicio", "modalidad", "prioridad",
            "tecnico_responsable",
            "fecha_programada",
            "fecha_fin_estimada",
            "direccion", "notas_internas",
        ]
        extra_kwargs = {
            "empresa": {"required": False},
            "modalidad": {"required": False},
        }

    def create(self, validated_data):
        # E1: manejar M2M cotizaciones manualmente y propagar OCs + guias derivadas
        cotizaciones = validated_data.pop("cotizaciones", [])
        ot = super().create(validated_data)
        if cotizaciones:
            from bodegas.models import GuiaSalida, OrdenCompra
            from django.db.models import Q
            for cotizacion in cotizaciones:
                ot.cotizaciones.add(cotizacion)
                ocs = OrdenCompra.objects.filter(
                    relacion_cotizacion=cotizacion, oc_empresa=ot.empresa
                )
                if ocs.exists():
                    ot.ordenes_compra.add(*ocs)
                guias = GuiaSalida.objects.filter(
                    Q(cotizacion_origen=cotizacion)
                    | Q(
                        cotizacion_origen__isnull=True,
                        itemsguiasalida__source_item__orden_compra__in=ocs,
                    )
                ).distinct()
                if guias.exists():
                    ot.guias_salida.add(*guias)
        return ot


class CrearSolicitanteProspectoOTV3Serializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=250)
    last_name = serializers.CharField(max_length=250)
    celular = serializers.CharField(max_length=17, required=False, allow_blank=True, allow_null=True)


class PrefacturaOTV3Serializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    ot_titulo = serializers.SerializerMethodField()
    ots_ids = serializers.SerializerMethodField()
    ots_titulos = serializers.SerializerMethodField()
    contratos_ids = serializers.SerializerMethodField()
    contratos_nombres = serializers.SerializerMethodField()

    class Meta:
        model = PrefacturaOTV3
        fields = [
            "id",
            "ot",
            "ot_titulo",
            "ots_ids",
            "ots_titulos",
            "contratos_ids",
            "contratos_nombres",
            "cliente",
            "cliente_nombre",
            "estado_cierre",
            "resultado",
            "fecha_prefactura",
            "comentario",
            "tasa_dolar_usada",
            "tasa_uf_usada",
            "fecha_tasa_cambio",
            "documento_factura",
            "creado_por",
            "actualizado_por",
            "fecha_creacion",
            "fecha_modificacion",
        ]
        read_only_fields = [
            "cliente",
            "estado_cierre",
            "documento_factura",
            "creado_por",
            "actualizado_por",
            "fecha_creacion",
            "fecha_modificacion",
        ]

    def get_ot_titulo(self, obj):
        ot = obj.ot
        return ot.titulo if ot else None

    def get_ots_ids(self, obj):
        return list(obj.ots.values_list("id", flat=True))

    def get_ots_titulos(self, obj):
        return list(obj.ots.values_list("titulo", flat=True))

    def get_contratos_ids(self, obj):
        return list(obj.contratos.values_list("id", flat=True))

    def get_contratos_nombres(self, obj):
        return [str(c) for c in obj.contratos.all()]


class PrefacturaOTV3WriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrefacturaOTV3
        fields = [
            "resultado",
            "fecha_prefactura",
            "comentario",
        ]
