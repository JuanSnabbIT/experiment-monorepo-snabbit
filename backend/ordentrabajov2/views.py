from bodegas.models import GuiaSalida, ItemsGuiaSalida
from bodegas.serializers import GuiaSalidaSerializer
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import (
    AdjuntoDeOrden,
    CierreAdministrativoOT,
    HistorialCambiosOrden,
    OrdenDeTrabajo,
    RendicionEnOt,
    SeguimientoItemOT,
    ServicioEnOT,
    SoporteTecnico,
    UsuarioAsignadoSoporte,
)
from .serializers import (
    AdjuntoDeOrdenSerializer,
    CierreAdministrativoOTSerializer,
    HistorialCambiosOrdenSerializer,
    OrdenDeTrabajoSerializer,
    RendicionEnOtSerializer,
    SeguimientoItemOTSerializer,
    ServicioEnOTSerializer,
    SoporteTecnicoSerializer,
    UsuarioAsignadoSoporteSerializer,
)


def validar_guia_para_trabajo(
    guia: GuiaSalida,
    orden: OrdenDeTrabajo,
    excluir_soporte_id: int | None = None,
    excluir_servicio_id: int | None = None,
) -> str | None:
    """
    Devuelve un mensaje de error si la guía no puede asociarse al trabajo indicado.
    """
    if not guia.itemsguiasalida_set.exists():
        return "La guía no tiene items."
    if guia.estado not in ("ER", "FR"):
        return "La guía debe estar en 'Espera Firma Recibido' o 'Firmada' para asociarla."
    # Reverse one-to-one relations on GuiaSalida are available as objects
    # e.g. guia.soporte_tecnico and guia.servicio_ot (not *_id attributes)
    if getattr(guia, "soporte_tecnico", None) and getattr(
        guia.soporte_tecnico, "id", None
    ) != excluir_soporte_id:
        return "La guía ya está asociada a otro soporte."
    if getattr(guia, "servicio_ot", None) and getattr(
        guia.servicio_ot, "id", None
    ) != excluir_servicio_id:
        return "La guía ya está asociada a otro servicio."
    if guia.orden_trabajo_id and guia.orden_trabajo_id != orden.id:
        return "La guía está vinculada a otra Orden de Trabajo."
    return None


def actualizar_estado_guia_en_inicio_trabajo(guia: GuiaSalida | None) -> None:
    if not guia:
        return
    if guia.estado == "FR":
        guia.estado = "ET"
        guia.save(update_fields=["estado"])


def calcular_estado_guia_por_devoluciones(guia: GuiaSalida) -> str | None:
    items = ItemsGuiaSalida.objects.filter(guia=guia).values_list(
        "cantidad_rebajada", "cantidad_devuelta"
    )
    if not items:
        return None
    total_reb = sum(cantidad_rebajada for cantidad_rebajada, _ in items)
    if total_reb <= 0:
        return None
    total_dev = sum(cantidad_devuelta for _, cantidad_devuelta in items)
    if total_dev <= 0:
        return "E"
    if total_dev >= total_reb:
        return "R"
    return "PR"


class BaseWriteViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]


class OrdenDeTrabajoViewSet(BaseWriteViewSet):
    queryset = OrdenDeTrabajo.objects.all().order_by("-fecha_creacion")
    serializer_class = OrdenDeTrabajoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        tipo_servicio = self.request.query_params.get("tipo_servicio")
        estado = self.request.query_params.get("estado")
        empresa = self.request.query_params.get("empresa")
        cliente = self.request.query_params.get("cliente")
        if tipo_servicio:
            qs = qs.filter(tipo_servicio=tipo_servicio)
        if estado:
            qs = qs.filter(estado=estado)
        if empresa:
            qs = qs.filter(empresa_id=empresa)
        if cliente:
            qs = qs.filter(cliente_id=cliente)
        return qs

    @action(detail=True, methods=["post"], url_path="cambiar-estado")
    def cambiar_estado(self, request, pk=None):
        orden = self.get_object()
        nuevo_estado = request.data.get("estado")
        if not nuevo_estado:
            return Response({"detail": 'Debe indicar "estado"'}, status=400)
        
        # Validar transiciones de estado permitidas
        estado_anterior = orden.estado
        transiciones_validas = {
            "pendiente": ["en_proceso", "cancelada"],
            "en_proceso": ["completada", "cancelada"],
            "completada": ["cerrada"],
            "cerrada": ["facturada"],
            "facturada": [],  # Estado final
            "cancelada": [],  # Estado final
        }
        
        estados_permitidos = transiciones_validas.get(estado_anterior, [])
        if nuevo_estado not in estados_permitidos:
            return Response(
                {
                    "detail": f"No se puede cambiar de '{estado_anterior}' a '{nuevo_estado}'. "
                             f"Estados permitidos: {', '.join(estados_permitidos) if estados_permitidos else 'ninguno (estado final)'}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        orden.estado = nuevo_estado
        orden.save()
        if estado_anterior != orden.estado and orden.estado == "completada":
            self._sincronizar_relaciones_completada(orden)
        return Response(self.get_serializer(orden).data)

    @action(detail=True, methods=["get"], url_path="check-completabilidad")
    def check_completabilidad(self, request, pk=None):
        """
        Devuelve un booleano `se_puede_completar` y una lista de `razones`
        explicando por qué la orden no puede completarse.
        """
        orden = self.get_object()
        razones = []

        # Check Soportes
        soportes = orden.soportetecnico_set.all()
        for soporte in soportes:
            if soporte.estado not in [
                "medianamente_completado",
                "completado",
                "no_realizado",
            ]:
                razones.append(
                    f"Soporte {soporte.nombre}: estado '{soporte.get_estado_display()}' no permite completar"
                )

        # Check Servicios
        servicios = orden.servicioenot_set.all()
        for servicio in servicios:
            if servicio.estado not in [
                "medianamente_completado",
                "completado",
                "no_realizado",
            ]:
                razones.append(
                    f"Servicio {servicio.nombre}: estado '{servicio.get_estado_display()}' no permite completar"
                )

        se_puede_completar = len(razones) == 0
        return Response({"se_puede_completar": se_puede_completar, "razones": razones})

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        """
        Retorna un historial simple para compatibilidad con la UI legacy.
        """
        orden = self.get_object()
        historial = (
            HistorialCambiosOrden.objects.filter(orden=orden)
            .select_related("usuario__usuario")
            .order_by("-fecha_cambio", "-fecha_creacion")
        )
        data = []
        for registro in historial:
            usuario_nombre = None
            usuario_empresa = registro.usuario
            if usuario_empresa and getattr(usuario_empresa, "usuario", None):
                user = usuario_empresa.usuario
                if hasattr(user, "get_nombre_completo"):
                    usuario_nombre = user.get_nombre_completo()
                else:
                    usuario_nombre = str(user)
            elif usuario_empresa:
                usuario_nombre = str(usuario_empresa)
            elif request.user and request.user.is_authenticated:
                user = request.user
                if hasattr(user, "get_nombre_completo"):
                    usuario_nombre = user.get_nombre_completo()
                else:
                    nombre = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
                    usuario_nombre = nombre or getattr(user, "username", None) or str(user)

            fecha = registro.fecha_cambio or registro.fecha_creacion
            data.append(
                {
                    "id": registro.id,
                    "history_date": fecha.isoformat() if fecha else None,
                    "history_user": usuario_nombre or "Desconocido",
                    "model": "OrdenDeTrabajo",
                    "detalle_cambio": registro.comentario or "Actualizacion de datos de OT",
                    "valor_anterior": registro.estado_anterior,
                    "valor_nuevo": registro.estado_actual,
                    "accion": "Orden de Trabajo Modificado",
                    "accion_tipo": "Modificado",
                    "accion_modelo": "Orden de Trabajo",
                }
            )
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="guias-disponibles")
    def guias_disponibles(self, request, pk=None):
        orden = self.get_object()
        if not orden.cliente_id:
            return Response([], status=200)

        # Guías ya asociadas a servicios o soportes
        guias_servicios = ServicioEnOT.objects.exclude(guia_salida__isnull=True).values_list(
            "guia_salida_id", flat=True
        )
        guias_soportes = SoporteTecnico.objects.exclude(guia_salida__isnull=True).values_list(
            "guia_salida_id", flat=True
        )
        guias_usadas_ids = set(list(guias_servicios) + list(guias_soportes))

        # Estados válidos para asociar (permitir en espera de firma, firmada, en tránsito, entregada, terminada)
        allowed_states = ["ER", "FR", "ET", "E", "T"]
        guias_estado = GuiaSalida.objects.filter(
            estado__in=allowed_states,
            cliente_id=orden.cliente_id,
        )

        # Excluir guías ya usadas o asociadas a otra orden
        guias_disponibles = guias_estado.exclude(pk__in=guias_usadas_ids).exclude(
            orden_trabajo__isnull=False
        )

        serializer = GuiaSalidaSerializer(guias_disponibles, many=True)
        return Response(serializer.data, status=200)

    def update(self, request, *args, **kwargs):
        """
        Registra en historial cuando se actualizan campos clave de negocio.
        """
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        estado_anterior = instance.estado
        original = self._snapshot_campos_relevantes(instance)

        data = request.data.copy()
        comentario = data.pop("comentario", "")
        data.pop("estado_anterior", None)
        data.pop("estado_actual", None)

        if isinstance(comentario, list):
            comentario = comentario[0] if comentario else ""

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        instance.refresh_from_db()
        if estado_anterior != instance.estado and instance.estado == "completada":
            self._sincronizar_relaciones_completada(instance)
        cambios = self._build_cambios_detalle(instance, original)
        if cambios:
            usuario_empresa = getattr(request.user, "usuarioempresa", None)
            if usuario_empresa:
                HistorialCambiosOrden.objects.create(
                    orden=instance,
                    usuario=usuario_empresa,
                    estado_anterior=cambios["anterior"],
                    estado_actual=cambios["actual"],
                    comentario=(str(comentario).strip() or "Actualizacion de datos de OT"),
                )

        return Response(serializer.data, status=status.HTTP_200_OK)

    @staticmethod
    def _sincronizar_relaciones_completada(orden: OrdenDeTrabajo) -> None:
        """Sincroniza compras y crea Rendición automática al completar OT."""
        from django.db import transaction
        from django.utils import timezone
        from rendiciones.models import Rendicion, ItemRendicion
        from django.contrib.contenttypes.models import ContentType
        
        # 1. Sincronizar estado de compras (lógica original)
        compras = orden.compras_rapidas.filter(estado="-")
        for compra in compras:
            if compra.itemencompra_set.exists():
                compra.estado = "P"
                compra.save(update_fields=["estado"])
        
        # 2. Crear Rendición automática (BLOQUE 6 - FASE 6)
        # Verificar si ya existe rendición para esta OT (idempotencia)
        if hasattr(orden, 'rendicion_asociada') and orden.rendicion_asociada:
            return  # Ya tiene rendición, no duplicar
        
        # Recolectar gastos y compras
        gastos_ot = orden.rendicionenot_set.all()
        compras_con_items = orden.compras_rapidas.filter(
            itemencompra__isnull=False
        ).distinct()
        
        # Solo crear rendición si hay gastos o compras
        if not gastos_ot.exists() and not compras_con_items.exists():
            return
        
        # Determinar usuario: técnico responsable o cliente solicitante
        usuario_rendicion = orden.tecnico_responsable_ot or orden.cliente_solicitante
        if not usuario_rendicion:
            # Si no hay usuario asignado, no crear rendición automática
            return
        
        # Crear rendición dentro de transacción atómica
        with transaction.atomic():
            rendicion = Rendicion.objects.create(
                usuario=usuario_rendicion,
                fecha_rendicion=timezone.now().date(),
                estado="1",  # En Espera de Aprobación
                cliente=orden.cliente,
                observaciones=f"Rendición generada automáticamente desde OT #{orden.id}",
                orden_trabajo=orden
            )
            
            # Content types para ItemRendicion
            ct_rendicion_ot = ContentType.objects.get(
                app_label="ordentrabajov2", model="rendicionenot"
            )
            ct_compra = ContentType.objects.get(
                app_label="bodegas", model="compra"
            )
            
            # Crear ItemRendicion para cada gasto operativo
            for gasto in gastos_ot:
                ItemRendicion.objects.create(
                    rendicion=rendicion,
                    content_type=ct_rendicion_ot,
                    detalle_id=gasto.id
                )
            
            # Crear ItemRendicion para cada compra
            for compra in compras_con_items:
                ItemRendicion.objects.create(
                    rendicion=rendicion,
                    content_type=ct_compra,
                    detalle_id=compra.id
                )

    def _build_cambios_detalle(self, instance, original: dict) -> dict | None:
        """
        Construye textos de antes/despues para fechas, responsables, solicitante,
        prioridad, instrucciones y notas internas.
        Devuelve None si no hubo cambios relevantes.
        """
        campos = (
            ("fecha_inicio_ot", "Fecha de inicio", self._format_valor),
            ("fecha_finalizacion_ot", "Fecha de finalizacion", self._format_valor),
            ("tecnico_responsable_ot", "Responsable", self._format_valor),
            ("cliente_solicitante", "Solicitante", self._format_valor),
            (
                "prioridad",
                "Prioridad",
                lambda valor: self._format_choice(instance, "prioridad", valor),
            ),
            ("descripcion", "Instrucciones OT", self._format_valor),
            ("notas_internas", "Notas internas", self._format_valor),
        )
        anteriores = []
        actuales = []
        for field, label, formatter in campos:
            previo = original.get(field)
            nuevo = getattr(instance, field, None)
            if previo != nuevo:
                anteriores.append(f"{label}: {formatter(previo)}")
                actuales.append(f"{label}: {formatter(nuevo)}")

        if not anteriores:
            return None

        return {
            "anterior": "; ".join(anteriores),
            "actual": "; ".join(actuales),
        }

    @staticmethod
    def _format_valor(valor) -> str:
        if valor is None:
            return "Sin valor"
        if hasattr(valor, "usuario") and hasattr(valor.usuario, "get_nombre_completo"):
            return valor.usuario.get_nombre_completo()
        return str(valor)

    @staticmethod
    def _format_choice(instance, field_name: str, valor) -> str:
        if valor is None:
            return "Sin valor"
        campo = instance._meta.get_field(field_name)
        mapping = dict(campo.flatchoices)
        return mapping.get(valor, str(valor))

    @staticmethod
    def _snapshot_campos_relevantes(instance) -> dict:
        return {
            "fecha_inicio_ot": getattr(instance, "fecha_inicio_ot", None),
            "fecha_finalizacion_ot": getattr(instance, "fecha_finalizacion_ot", None),
            "tecnico_responsable_ot": getattr(instance, "tecnico_responsable_ot", None),
            "cliente_solicitante": getattr(instance, "cliente_solicitante", None),
            "prioridad": getattr(instance, "prioridad", None),
            "descripcion": getattr(instance, "descripcion", None),
            "notas_internas": getattr(instance, "notas_internas", None),
        }

    @action(detail=True, methods=["get"], url_path="insumos")
    def insumos_en_ot(self, request, pk=None):
        """
        Devuelve una lista combinada de Servicios y Soportes con guia asociada.
        Usa ?solo_pr=true para filtrar solo guias en estado parcialmente revertida (PR).
        """
        orden = self.get_object()
        solo_pr = request.query_params.get("solo_pr")
        filtrar_pr = str(solo_pr).lower() in ("1", "true", "yes")

        servicios = ServicioEnOT.objects.filter(
            orden=orden,
            guia_salida__isnull=False,
        )
        soportes = SoporteTecnico.objects.filter(
            orden=orden,
            guia_salida__isnull=False,
        )
        if filtrar_pr:
            servicios = servicios.filter(guia_salida__estado="PR")
            soportes = soportes.filter(guia_salida__estado="PR")

        servicios = servicios.select_related("guia_salida").all()
        soportes = soportes.select_related("guia_salida").all()

        out = []
        for s in servicios:
            g = s.guia_salida
            out.append(
                {
                    "id": s.id,
                    "nombre": s.nombre,
                    "descripcion": s.descripcion or "",
                    "estado": s.estado,
                    "guia": {
                        "id": g.id,
                        "motivo": g.motivo,
                        "cantidad_items": g.items.count(),
                        "estado": g.estado,
                        "estado_label": g.get_estado_display(),
                    },
                    "estado_label": s.get_estado_display(),
                    "tipo": "servicio",
                }
            )

        for s in soportes:
            g = s.guia_salida
            out.append(
                {
                    "id": s.id,
                    "nombre": s.nombre,
                    "descripcion": s.descripcion or "",
                    "estado": s.estado,
                    "guia": {
                        "id": g.id,
                        "motivo": g.motivo,
                        "cantidad_items": g.items.count(),
                        "estado": g.estado,
                        "estado_label": g.get_estado_display(),
                    },
                    "estado_label": s.get_estado_display(),
                    "tipo": "soporte",
                }
            )

        return Response(out, status=200)


class SoporteTecnicoViewSet(BaseWriteViewSet):
    queryset = (
        SoporteTecnico.objects.select_related("orden").all().order_by("-fecha_creacion")
    )
    serializer_class = SoporteTecnicoSerializer

    def update(self, request, *args, **kwargs):
        """
        Valida que un soporte con guía asociada sólo pueda pasar a 'en_proceso'
        si la guía está en tránsito/entregada y el soporte tiene técnico y fecha.
        """
        partial = kwargs.pop("partial", False)
        instance: SoporteTecnico = self.get_object()
        nuevo_estado = request.data.get("estado", instance.estado)
        final_states = ("completado", "medianamente_completado")

        if nuevo_estado == "en_proceso":
            if not instance.tecnico_asignado_id and not request.data.get(
                "tecnico_asignado"
            ):
                return Response(
                    {"detail": "Asigna un técnico antes de iniciar el soporte."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            fecha_soporte = request.data.get("fecha_soporte") or instance.fecha_soporte
            if not fecha_soporte:
                return Response(
                    {"detail": "Define fecha de soporte antes de iniciar."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if instance.guia_salida_id:
                estado_guia = instance.guia_salida.estado
                if estado_guia not in ("FR", "ET", "E", "T"):
                    return Response(
                        {
                            "detail": "La guía debe estar firmada, en tránsito o entregada para iniciar el soporte."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        if nuevo_estado in final_states and instance.guia_salida_id:
            guia = instance.guia_salida
            estado_esperado = "E" if nuevo_estado == "completado" else "PR"
            if not guia.entregado_a_id or not guia.firma_entrega:
                return Response(
                    {
                        "detail": (
                            "Debes registrar destinatario y firma en la guia antes de completar el soporte."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if guia.estado != estado_esperado:
                return Response(
                    {
                        "detail": (
                            "La guia debe estar en el estado correcto segun el trabajo completado."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if nuevo_estado in final_states and instance.guia_salida_id:
            guia = instance.guia_salida
            estado_esperado = "E" if nuevo_estado == "completado" else "PR"
            if not guia.entregado_a_id or not guia.firma_entrega:
                return Response(
                    {
                        "detail": (
                            "Debes registrar destinatario y firma en la guia antes de completar el servicio."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if guia.estado != estado_esperado:
                return Response(
                    {
                        "detail": (
                            "La guia debe estar en el estado correcto segun el trabajo completado."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        resp = super().update(request, *args, partial=partial, **kwargs)
        if (
            resp.status_code in (status.HTTP_200_OK, status.HTTP_202_ACCEPTED)
            and nuevo_estado == "en_proceso"
        ):
            instance.refresh_from_db()
            if instance.orden.estado == "pendiente":
                instance.orden.estado = "en_proceso"
                instance.orden.save(update_fields=["estado"])
            if instance.guia_salida_id:
                actualizar_estado_guia_en_inicio_trabajo(instance.guia_salida)
        return resp

    def get_queryset(self):
        qs = super().get_queryset()
        # Soporte para URLs anidadas bajo /ordenes-trabajo/{orden_trabajo_pk}/soportes/
        orden_trabajo_pk = self.kwargs.get("orden_trabajo_pk")
        if orden_trabajo_pk:
            qs = qs.filter(orden_id=orden_trabajo_pk)
        # Fallback a query param si no es anidado
        orden = self.request.query_params.get("orden")
        if orden:
            qs = qs.filter(orden_id=orden)
        return qs

    def perform_create(self, serializer):
        # Si es ruta anidada, asignar automáticamente la orden
        orden_trabajo_pk = self.kwargs.get("orden_trabajo_pk")
        orden = None
        if orden_trabajo_pk:
            orden = OrdenDeTrabajo.objects.select_related("tecnico_responsable_ot").only(
                "tecnico_responsable_ot", "fecha_inicio_ot"
            ).get(pk=orden_trabajo_pk)
        else:
            orden = serializer.validated_data.get("orden")

        defaults = {}
        if orden:
            if (
                not serializer.validated_data.get("tecnico_asignado")
                and orden.tecnico_responsable_ot
            ):
                defaults["tecnico_asignado"] = orden.tecnico_responsable_ot
            if (
                not serializer.validated_data.get("fecha_soporte")
                and orden.fecha_inicio_ot
            ):
                defaults["fecha_soporte"] = orden.fecha_inicio_ot
        if orden_trabajo_pk:
            defaults["orden_id"] = orden_trabajo_pk

        serializer.save(**defaults)

    @action(detail=True, methods=["post"], url_path="asociar-guia")
    def asociar_guia(self, request, pk=None, orden_trabajo_pk=None):
        soporte = self.get_object()
        guia_id = request.data.get("guia_salida")
        if not guia_id:
            return Response(
                {"detail": 'Debes enviar "guia_salida".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        guia = get_object_or_404(GuiaSalida, pk=guia_id)
        error = validar_guia_para_trabajo(
            guia, soporte.orden, excluir_soporte_id=soporte.id
        )
        if error:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)

        if not guia.orden_trabajo_id:
            guia.orden_trabajo = soporte.orden
            guia.save(update_fields=["orden_trabajo"])

        soporte.guia_salida = guia
        soporte.save(update_fields=["guia_salida"])
        return Response(self.get_serializer(soporte).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="desasociar-guia")
    def desasociar_guia(self, request, pk=None, orden_trabajo_pk=None):
        soporte = self.get_object()
        if not soporte.guia_salida_id:
            return Response(
                {"detail": "El soporte no tiene guía asociada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        guia = soporte.guia_salida
        soporte.guia_salida = None
        soporte.save(update_fields=["guia_salida"])

        guia.refresh_from_db()
        if not getattr(guia, "servicio_ot", None) and not getattr(
            guia, "soporte_tecnico", None
        ):
            guia.orden_trabajo = None
            guia.save(update_fields=["orden_trabajo"])

        return Response(self.get_serializer(soporte).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="actualizar-estado")
    def actualizar_estado(self, request, pk=None, orden_trabajo_pk=None):
        soporte = self.get_object()
        nuevo_estado = request.data.get("estado")
        if not nuevo_estado:
            return Response({"detail": 'Debe indicar "estado"'}, status=400)
        soporte.estado = nuevo_estado
        soporte.save()
        if nuevo_estado == "en_proceso" and soporte.guia_salida_id:
            actualizar_estado_guia_en_inicio_trabajo(soporte.guia_salida)
        return Response(self.get_serializer(soporte).data)

    @action(detail=True, methods=["get"], url_path="usuarios-asignados")
    def usuarios_asignados(self, request, pk=None, orden_trabajo_pk=None):
        """
        Devuelve la lista de usuarios asignados a este soporte técnico.
        """
        soporte = self.get_object()
        usuarios = UsuarioAsignadoSoporte.objects.filter(soporte_tecnico=soporte)
        serializer = UsuarioAsignadoSoporteSerializer(usuarios, many=True)
        return Response(serializer.data)


class UsuarioAsignadoSoporteViewSet(BaseWriteViewSet):
    queryset = (
        UsuarioAsignadoSoporte.objects.select_related("soporte_tecnico")
        .all()
        .order_by("-fecha_creacion")
    )
    serializer_class = UsuarioAsignadoSoporteSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Soporte para URLs anidadas bajo /soportes-tecnicos/{soporte_tecnico_pk}/usuarios-asignados/
        soporte_tecnico_pk = self.kwargs.get("soporte_tecnico_pk")
        if soporte_tecnico_pk:
            qs = qs.filter(soporte_tecnico_id=soporte_tecnico_pk)
        # Fallback a query param
        soporte = self.request.query_params.get("soporte")
        if soporte:
            qs = qs.filter(soporte_tecnico_id=soporte)
        return qs

    def perform_create(self, serializer):
        soporte_tecnico_pk = self.kwargs.get("soporte_tecnico_pk")
        if soporte_tecnico_pk:
            serializer.save(soporte_tecnico_id=soporte_tecnico_pk)
        else:
            serializer.save()


class ServicioEnOTViewSet(BaseWriteViewSet):
    queryset = (
        ServicioEnOT.objects.select_related("orden", "guia_salida")
        .all()
        .order_by("-fecha_creacion")
    )
    serializer_class = ServicioEnOTSerializer

    def update(self, request, *args, **kwargs):
        """
        Valida que un servicio con guía asociada sólo pueda pasar a 'en_proceso'
        si la guía está en tránsito/entregada y el servicio tiene técnico y fecha.
        """
        partial = kwargs.pop("partial", False)
        instance: ServicioEnOT = self.get_object()
        nuevo_estado = request.data.get("estado", instance.estado)
        final_states = ("completado", "medianamente_completado")

        if nuevo_estado == "en_proceso":
            if not instance.tecnico_asignado_id and not request.data.get(
                "tecnico_asignado"
            ):
                return Response(
                    {"detail": "Asigna un técnico antes de iniciar el servicio."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            fecha_servicio = request.data.get("fecha_servicio") or instance.fecha_servicio
            if not fecha_servicio:
                return Response(
                    {"detail": "Define fecha de servicio antes de iniciar."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if instance.guia_salida_id:
                estado_guia = instance.guia_salida.estado
                if estado_guia not in ("FR", "ET", "E", "T"):
                    return Response(
                        {
                            "detail": "La guía debe estar firmada, en tránsito o entregada para iniciar el servicio."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        resp = super().update(request, *args, partial=partial, **kwargs)
        if (
            resp.status_code in (status.HTTP_200_OK, status.HTTP_202_ACCEPTED)
            and nuevo_estado == "en_proceso"
        ):
            instance.refresh_from_db()
            if instance.orden.estado == "pendiente":
                instance.orden.estado = "en_proceso"
                instance.orden.save(update_fields=["estado"])
            if instance.guia_salida_id:
                actualizar_estado_guia_en_inicio_trabajo(instance.guia_salida)
        return resp

    def get_queryset(self):
        qs = super().get_queryset()
        # Soporte para URLs anidadas bajo /ordenes-trabajo/{orden_trabajo_pk}/servicios/
        orden_trabajo_pk = self.kwargs.get("orden_trabajo_pk")
        if orden_trabajo_pk:
            qs = qs.filter(orden_id=orden_trabajo_pk)
        # Fallback a query param
        orden = self.request.query_params.get("orden")
        if orden:
            qs = qs.filter(orden_id=orden)
        return qs

    def perform_create(self, serializer):
        orden_trabajo_pk = self.kwargs.get("orden_trabajo_pk")
        orden = None
        if orden_trabajo_pk:
            orden = OrdenDeTrabajo.objects.select_related("tecnico_responsable_ot").only(
                "tecnico_responsable_ot", "fecha_inicio_ot"
            ).get(pk=orden_trabajo_pk)
        else:
            orden = serializer.validated_data.get("orden")

        defaults = {}
        if orden:
            if (
                not serializer.validated_data.get("tecnico_asignado")
                and orden.tecnico_responsable_ot
            ):
                defaults["tecnico_asignado"] = orden.tecnico_responsable_ot
            if (
                not serializer.validated_data.get("fecha_servicio")
                and orden.fecha_inicio_ot
            ):
                defaults["fecha_servicio"] = orden.fecha_inicio_ot
        if orden_trabajo_pk:
            defaults["orden_id"] = orden_trabajo_pk

        serializer.save(**defaults)

    @action(detail=True, methods=["post"], url_path="asociar-guia")
    def asociar_guia(self, request, pk=None, orden_trabajo_pk=None):
        servicio = self.get_object()
        guia_id = request.data.get("guia_salida")
        if not guia_id:
            return Response(
                {"detail": 'Debes enviar "guia_salida".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        guia = get_object_or_404(GuiaSalida, pk=guia_id)
        error = validar_guia_para_trabajo(
            guia, servicio.orden, excluir_servicio_id=servicio.id
        )
        if error:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)

        if not guia.orden_trabajo_id:
            guia.orden_trabajo = servicio.orden
            guia.save(update_fields=["orden_trabajo"])

        servicio.guia_salida = guia
        servicio.save(update_fields=["guia_salida"])
        return Response(self.get_serializer(servicio).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="desasociar-guia")
    def desasociar_guia(self, request, pk=None, orden_trabajo_pk=None):
        servicio = self.get_object()
        if not servicio.guia_salida_id:
            return Response(
                {"detail": "El servicio no tiene guía asociada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        guia = servicio.guia_salida
        servicio.guia_salida = None
        servicio.save(update_fields=["guia_salida"])

        guia.refresh_from_db()
        if not getattr(guia, "servicio_ot", None) and not getattr(
            guia, "soporte_tecnico", None
        ):
            guia.orden_trabajo = None
            guia.save(update_fields=["orden_trabajo"])

        return Response(self.get_serializer(servicio).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="actualizar-estado")
    def actualizar_estado(self, request, pk=None, orden_trabajo_pk=None):
        servicio = self.get_object()
        nuevo_estado = request.data.get("estado")
        if not nuevo_estado:
            return Response({"detail": 'Debe indicar "estado"'}, status=400)
        servicio.estado = nuevo_estado
        servicio.save()
        if nuevo_estado == "en_proceso":
            if servicio.orden.estado == "pendiente":
                servicio.orden.estado = "en_proceso"
                servicio.orden.save(update_fields=["estado"])
            if servicio.guia_salida_id:
                actualizar_estado_guia_en_inicio_trabajo(servicio.guia_salida)
        return Response(self.get_serializer(servicio).data)


class HistorialCambiosOrdenViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = (
        HistorialCambiosOrden.objects.select_related("orden")
        .all()
        .order_by("-fecha_creacion")
    )
    serializer_class = HistorialCambiosOrdenSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        # Soporte para URLs anidadas bajo /ordenes-trabajo/{orden_trabajo_pk}/historial/
        orden_trabajo_pk = self.kwargs.get("orden_trabajo_pk")
        if orden_trabajo_pk:
            qs = qs.filter(orden_id=orden_trabajo_pk)
        # Fallback a query param
        orden = self.request.query_params.get("orden")
        if orden:
            qs = qs.filter(orden_id=orden)
        return qs

    def perform_create(self, serializer):
        """
        Crea historial asignando usuario_empresa y la orden anidada si viene en la ruta.
        """
        usuario_empresa = getattr(self.request.user, "usuarioempresa", None)
        if not usuario_empresa:
            raise PermissionDenied("El usuario no tiene perfil de empresa asociado.")

        orden_trabajo_pk = self.kwargs.get("orden_trabajo_pk")
        if orden_trabajo_pk:
            serializer.save(orden_id=orden_trabajo_pk, usuario=usuario_empresa)
        else:
            serializer.save(usuario=usuario_empresa)


class AdjuntoDeOrdenViewSet(BaseWriteViewSet):
    queryset = (
        AdjuntoDeOrden.objects.select_related("orden").all().order_by("-fecha_creacion")
    )
    serializer_class = AdjuntoDeOrdenSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Soporte para URLs anidadas bajo /ordenes-trabajo/{orden_trabajo_pk}/adjuntos/
        orden_trabajo_pk = self.kwargs.get("orden_trabajo_pk")
        if orden_trabajo_pk:
            qs = qs.filter(orden_id=orden_trabajo_pk)
        # Fallback a query param
        orden = self.request.query_params.get("orden")
        if orden:
            qs = qs.filter(orden_id=orden)
        return qs

    def perform_create(self, serializer):
        orden_trabajo_pk = self.kwargs.get("orden_trabajo_pk")
        if orden_trabajo_pk:
            serializer.save(orden_id=orden_trabajo_pk)
        else:
            serializer.save()


class RendicionEnOtViewSet(BaseWriteViewSet):
    queryset = (
        RendicionEnOt.objects.select_related("orden", "categoria")
        .all()
        .order_by("-fecha_creacion")
    )
    serializer_class = RendicionEnOtSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Soporte para URLs anidadas bajo /ordenes-trabajo/{orden_trabajo_pk}/rendiciones/
        orden_trabajo_pk = self.kwargs.get("orden_trabajo_pk")
        if orden_trabajo_pk:
            qs = qs.filter(orden_id=orden_trabajo_pk)
        # Fallback a query param
        orden = self.request.query_params.get("orden")
        if orden:
            qs = qs.filter(orden_id=orden)
        return qs

    def perform_create(self, serializer):
        orden_trabajo_pk = self.kwargs.get("orden_trabajo_pk")
        if orden_trabajo_pk:
            serializer.save(orden_id=orden_trabajo_pk)
        else:
            serializer.save()


class CierreAdministrativoOTViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = (
        CierreAdministrativoOT.objects.select_related("orden")
        .all()
        .order_by("-fecha_creacion")
    )
    serializer_class = CierreAdministrativoOTSerializer

    http_method_names = [
        "get",
        "patch",
        "head",
        "options",
    ]  # evitar crear/borrar manualmente

    def get_queryset(self):
        qs = super().get_queryset()
        # Soporte para URLs anidadas bajo /ordenes-trabajo/{orden_trabajo_pk}/cierre/
        orden_trabajo_pk = self.kwargs.get("orden_trabajo_pk")
        if orden_trabajo_pk:
            qs = qs.filter(orden_id=orden_trabajo_pk)
        # Fallback a query param
        orden = self.request.query_params.get("orden")
        if orden:
            qs = qs.filter(orden_id=orden)
        return qs


class SeguimientoItemOTViewSet(BaseWriteViewSet):
    queryset = (
        SeguimientoItemOT.objects.select_related("servicio", "soporte", "usuario")
        .all()
        .order_by("-fecha_creacion")
    )
    serializer_class = SeguimientoItemOTSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        servicio_pk = self.kwargs.get("servicio_general_pk")
        soporte_pk = self.kwargs.get("soporte_tecnico_pk")
        if servicio_pk:
            qs = qs.filter(servicio_id=servicio_pk)
        if soporte_pk:
            qs = qs.filter(soporte_id=soporte_pk)
        servicio = self.request.query_params.get("servicio")
        soporte = self.request.query_params.get("soporte")
        if servicio:
            qs = qs.filter(servicio_id=servicio)
        if soporte:
            qs = qs.filter(soporte_id=soporte)
        return qs

    def perform_create(self, serializer):
        servicio_pk = self.kwargs.get("servicio_general_pk")
        soporte_pk = self.kwargs.get("soporte_tecnico_pk")
        data = {}
        if servicio_pk:
            data["servicio_id"] = servicio_pk
        if soporte_pk:
            data["soporte_id"] = soporte_pk
        serializer.save(**data)
