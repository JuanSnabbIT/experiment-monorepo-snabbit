from django.utils import timezone
from django.db.models import Q
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from core.models import PersonalizacionUsuario
from recursos.models import Equipo, UsuarioEquipo

from .estados_modelo import (
    ESTADO_TAREA_COMPLETADA,
    ESTADO_TAREA_NO_REALIZADA,
    TRANSICIONES_TAREA_V3,
    TRANSICIONES_VALIDAS_V3,
    ETAPA_UI_MAP,
    TIPO_SERVICIO_A_MODALIDAD,
)
from .models import (
    AdjuntoOTV3,
    AsignacionTecnicoOTV3,
    ChecklistItemOTV3,
    GastoOTV3,
    HistorialEstadoOTV3,
    OrdenDeTrabajoV3,
    SeguimientoOTV3,
    TareaOTV3,
)
from .serializers import (
    AdjuntoOTV3Serializer,
    AsignacionTecnicoOTV3Serializer,
    ChecklistItemOTV3Serializer,
    GastoOTV3Serializer,
    HistorialEstadoOTV3Serializer,
    OrdenDeTrabajoV3DetalleSerializer,
    OrdenDeTrabajoV3ListSerializer,
    OrdenDeTrabajoV3WriteSerializer,
    SeguimientoOTV3Serializer,
    TareaOTV3Serializer,
)


def _get_empresa_usuario(user):
    """Retorna la empresa del usuario autenticado o None si no tiene personalizacion."""
    personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
    if personalizacion and personalizacion.sucursal_principal:
        return personalizacion.sucursal_principal.empresa
    return None


class OrdenDeTrabajoV3ViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa = _get_empresa_usuario(self.request.user)
        if not empresa:
            return OrdenDeTrabajoV3.objects.none()
        qs = OrdenDeTrabajoV3.objects.filter(empresa=empresa).select_related(
            "cliente", "tecnico_responsable", "sucursal"
        ).prefetch_related(
            "tareas",
            "asignaciones",
            "guias_salida__itemsguiasalida_set__stock_item__item",
        )
        # Filtros opcionales por query params
        estado = self.request.query_params.get("estado")
        if estado:
            qs = qs.filter(estado=estado)
        modalidad = self.request.query_params.get("modalidad")
        if modalidad:
            qs = qs.filter(modalidad=modalidad)
        tipo_servicio = self.request.query_params.get("tipo_servicio")
        if tipo_servicio:
            qs = qs.filter(tipo_servicio=tipo_servicio)
        return qs

    def get_serializer_class(self):
        if self.action in ("list",):
            return OrdenDeTrabajoV3ListSerializer
        if self.action in ("create", "update", "partial_update"):
            return OrdenDeTrabajoV3WriteSerializer
        return OrdenDeTrabajoV3DetalleSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def perform_create(self, serializer):
        empresa = _get_empresa_usuario(self.request.user)
        if not empresa:
            raise serializers.ValidationError("El usuario no tiene empresa configurada.")
        tipo_servicio = serializer.validated_data.get("tipo_servicio")
        modalidad = TIPO_SERVICIO_A_MODALIDAD.get(tipo_servicio, "presencial")
        serializer.save(empresa=empresa, modalidad=modalidad)

    @action(detail=True, methods=["post"], url_path="cambiar-estado")
    def cambiar_estado(self, request, pk=None):
        """
        Cambia el estado de la OT validando transiciones permitidas.
        Body: { "estado": "en_ejecucion", "comentario": "..." }
        """
        ot = self.get_object()
        nuevo_estado = request.data.get("estado")
        comentario = request.data.get("comentario", "")

        if not nuevo_estado:
            return Response(
                {"detail": 'Debe indicar el campo "estado".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        estados_permitidos = TRANSICIONES_VALIDAS_V3.get(ot.estado, [])
        if nuevo_estado not in estados_permitidos:
            return Response(
                {
                    "detail": f"No se puede cambiar de '{ot.estado}' a '{nuevo_estado}'.",
                    "estado_actual": ot.estado,
                    "transiciones_validas": estados_permitidos,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validaciones especificas por transicion
        bloqueadores = self._validar_bloqueadores_transicion(ot, nuevo_estado)
        if bloqueadores:
            return Response(
                {"detail": "Existen bloqueadores para avanzar.", "bloqueadores": bloqueadores},
                status=status.HTTP_400_BAD_REQUEST,
            )

        estado_anterior = ot.estado
        ot.estado = nuevo_estado

        # Fechas automaticas
        if nuevo_estado == "en_ejecucion" and not ot.fecha_inicio_real:
            ot.fecha_inicio_real = timezone.now()
        if nuevo_estado == "completada" and not ot.fecha_finalizacion_real:
            ot.fecha_finalizacion_real = timezone.now()

        ot.save()

        # Registrar historial con comentario personalizado (si se provee)
        if comentario:
            HistorialEstadoOTV3.objects.filter(
                orden=ot, estado_anterior=estado_anterior, estado_nuevo=nuevo_estado
            ).order_by("-fecha_creacion").first()
            # El signal ya crea el historial; actualizamos el comentario si viene uno
            ultimo = HistorialEstadoOTV3.objects.filter(
                orden=ot, estado_nuevo=nuevo_estado
            ).order_by("-fecha_creacion").first()
            if ultimo:
                ultimo.comentario = comentario
                ultimo.usuario = request.user
                ultimo.save(update_fields=["comentario", "usuario"])

        serializer = OrdenDeTrabajoV3DetalleSerializer(ot, context={"request": request})
        return Response(serializer.data)

    def _validar_bloqueadores_transicion(self, ot, nuevo_estado):
        """Retorna lista de bloqueadores o lista vacia si puede avanzar."""
        bloqueadores = []
        if nuevo_estado == "completada":
            tareas_incompletas = ot.tareas.exclude(
                estado__in=[ESTADO_TAREA_COMPLETADA, ESTADO_TAREA_NO_REALIZADA]
            )
            if tareas_incompletas.exists():
                titulos = list(tareas_incompletas.values_list("titulo", flat=True)[:5])
                bloqueadores.append({
                    "tipo": "tareas_incompletas",
                    "mensaje": f"Hay {tareas_incompletas.count()} tarea(s) sin finalizar.",
                    "detalle": titulos,
                })

            # Bloquear si hay cotizaciones vinculadas con guias sin firmar
            ids_cotizaciones = list(ot.cotizaciones.values_list("id", flat=True))
            if ids_cotizaciones:
                guias_sin_firmar = ot.guias_salida.filter(
                    cotizacion_origen__id__in=ids_cotizaciones,
                    estado="P",
                )
                if guias_sin_firmar.exists():
                    ids = list(guias_sin_firmar.values_list("id", flat=True))
                    bloqueadores.append({
                        "tipo": "guias_sin_firmar",
                        "mensaje": f"Hay {guias_sin_firmar.count()} guia(s) de salida pendiente(s) de firma.",
                        "detalle": [f"Guia #{gid}" for gid in ids],
                    })

        return bloqueadores

    @action(detail=True, methods=["get"], url_path="check-avance")
    def check_avance(self, request, pk=None):
        """
        Retorna los bloqueadores para el proximo estado posible.
        """
        ot = self.get_object()
        estados_permitidos = TRANSICIONES_VALIDAS_V3.get(ot.estado, [])
        resultado = {
            "estado_actual": ot.estado,
            "transiciones_posibles": estados_permitidos,
            "bloqueadores": [],
            "puede_avanzar": True,
        }
        if estados_permitidos:
            proximo_estado = estados_permitidos[0]
            bloqueadores = self._validar_bloqueadores_transicion(ot, proximo_estado)
            resultado["proximo_estado"] = proximo_estado
            resultado["bloqueadores"] = bloqueadores
            resultado["puede_avanzar"] = len(bloqueadores) == 0
        return Response(resultado)

    @action(detail=False, methods=["get"], url_path="metricas-dashboard")
    def metricas_dashboard(self, request):
        """Metricas rapidas del estado de las OTs para dashboard."""
        empresa = _get_empresa_usuario(request.user)
        if not empresa:
            return Response({"detail": "Sin empresa configurada."}, status=400)

        from django.db.models import Count
        qs = OrdenDeTrabajoV3.objects.filter(empresa=empresa)
        conteo_estados = qs.values("estado").annotate(total=Count("id"))
        conteo_modalidad = qs.values("modalidad").annotate(total=Count("id"))

        return Response({
            "total": qs.count(),
            "por_estado": {item["estado"]: item["total"] for item in conteo_estados},
            "por_modalidad": {item["modalidad"]: item["total"] for item in conteo_modalidad},
        })

    # ---- Guias de salida ----

    @action(detail=True, methods=["post"], url_path="vincular-guia")
    def vincular_guia(self, request, pk=None):
        ot = self.get_object()
        guia_id = request.data.get("guia_id")
        if not guia_id:
            return Response({"detail": "Debe indicar guia_id."}, status=status.HTTP_400_BAD_REQUEST)
        from bodegas.models import GuiaSalida
        try:
            guia = GuiaSalida.objects.get(pk=guia_id)
        except GuiaSalida.DoesNotExist:
            return Response({"detail": "Guia de salida no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        ot.guias_salida.add(guia)
        cotizacion = guia.cotizacion_origen_efectiva
        if (
            cotizacion
            and cotizacion.cliente_id == ot.cliente_id
            and cotizacion.empresa_id == ot.empresa_id
        ):
            ot.cotizaciones.add(cotizacion)
        return Response(OrdenDeTrabajoV3DetalleSerializer(ot, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="desvincular-guia")
    def desvincular_guia(self, request, pk=None):
        ot = self.get_object()
        guia_id = request.data.get("guia_id")
        if not guia_id:
            return Response({"detail": "Debe indicar guia_id."}, status=status.HTTP_400_BAD_REQUEST)
        from bodegas.models import GuiaSalida
        try:
            guia = GuiaSalida.objects.get(pk=guia_id)
        except GuiaSalida.DoesNotExist:
            return Response({"detail": "Guia de salida no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        ot.guias_salida.remove(guia)
        return Response(OrdenDeTrabajoV3DetalleSerializer(ot, context={"request": request}).data)

    @action(detail=True, methods=["get"], url_path="guias-disponibles")
    def guias_disponibles(self, request, pk=None):
        ot = self.get_object()
        from bodegas.models import GuiaSalida
        from bodegas.serializers import GuiaSalidaSerializer
        qs = GuiaSalida.objects.filter(
            bodega__sucursal__empresa=ot.empresa,
        ).exclude(
            id__in=ot.guias_salida.values_list("id", flat=True)
        ).order_by("-fecha_creacion")
        serializer = GuiaSalidaSerializer(qs, many=True)
        return Response(serializer.data)

    # ---- Ordenes de compra ----

    @action(detail=True, methods=["post"], url_path="vincular-orden-compra")
    def vincular_orden_compra(self, request, pk=None):
        ot = self.get_object()
        oc_id = request.data.get("orden_compra_id")
        if not oc_id:
            return Response({"detail": "Debe indicar orden_compra_id."}, status=status.HTTP_400_BAD_REQUEST)
        from bodegas.models import OrdenCompra
        try:
            oc = OrdenCompra.objects.get(pk=oc_id)
        except OrdenCompra.DoesNotExist:
            return Response({"detail": "Orden de compra no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        ot.ordenes_compra.add(oc)
        return Response(OrdenDeTrabajoV3DetalleSerializer(ot, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="desvincular-orden-compra")
    def desvincular_orden_compra(self, request, pk=None):
        ot = self.get_object()
        oc_id = request.data.get("orden_compra_id")
        if not oc_id:
            return Response({"detail": "Debe indicar orden_compra_id."}, status=status.HTTP_400_BAD_REQUEST)
        from bodegas.models import OrdenCompra
        try:
            oc = OrdenCompra.objects.get(pk=oc_id)
        except OrdenCompra.DoesNotExist:
            return Response({"detail": "Orden de compra no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        ot.ordenes_compra.remove(oc)
        return Response(OrdenDeTrabajoV3DetalleSerializer(ot, context={"request": request}).data)

    @action(detail=True, methods=["get"], url_path="ordenes-compra-disponibles")
    def ordenes_compra_disponibles(self, request, pk=None):
        ot = self.get_object()
        from bodegas.models import OrdenCompra
        from bodegas.serializers import OrdenCompraSerializer
        qs = OrdenCompra.objects.filter(
            oc_empresa=ot.empresa,
        ).exclude(
            id__in=ot.ordenes_compra.values_list("id", flat=True)
        ).order_by("-fecha_creacion")
        serializer = OrdenCompraSerializer(qs, many=True)
        return Response(serializer.data)

    # ---- Cotizaciones ----

    @action(detail=True, methods=["get"], url_path="cotizaciones-disponibles")
    def cotizaciones_disponibles(self, request, pk=None):
        """Cotizaciones aceptadas del cliente que aun no estan vinculadas a esta OT ni a otra OT v3."""
        ot = self.get_object()
        from cotizaciones.models import Cotizacion
        from cotizaciones.serializers import CotizacionSerializer
        qs = Cotizacion.objects.filter(
            empresa=ot.empresa,
            cliente=ot.cliente,
            estado="aceptada",
        ).exclude(
            # Ya vinculada a esta OT (evitar re-seleccion)
            id__in=ot.cotizaciones.values_list("id", flat=True)
        ).exclude(
            # Ya vinculada a otra OT v3 (prevenir uso duplicado)
            ots_v3__isnull=False
        ).order_by("-numero_cotizacion")
        serializer = CotizacionSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="vincular-cotizacion")
    def vincular_cotizacion(self, request, pk=None):
        """
        Vincula una cotizacion aceptada a la OT. Solo se permite 1 cotizacion.
        Propaga automaticamente:
          - Todas las OCs con relacion_cotizacion=cotizacion (misma empresa/cliente)
          - Todas las GuiasSalida que tengan items que provienen de esas OCs
        Body: {cotizacion_id}
        """
        ot = self.get_object()
        cotizacion_id = request.data.get("cotizacion_id")
        if not cotizacion_id:
            return Response({"detail": "Debe indicar cotizacion_id."}, status=status.HTTP_400_BAD_REQUEST)
        from cotizaciones.models import Cotizacion
        from bodegas.models import OrdenCompra, GuiaSalida
        try:
            cotizacion = Cotizacion.objects.get(pk=cotizacion_id, empresa=ot.empresa, cliente=ot.cliente)
        except Cotizacion.DoesNotExist:
            return Response({"detail": "Cotizacion no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        if cotizacion.estado != "aceptada":
            return Response({"detail": "Solo se pueden vincular cotizaciones aceptadas."}, status=status.HTTP_400_BAD_REQUEST)

        # Validar que la cotizacion no esta ya vinculada a otra OT v3
        otra_ot = cotizacion.ots_v3.exclude(pk=ot.pk).first()
        if otra_ot:
            return Response(
                {"detail": f"Esta cotizacion ya esta vinculada a la OT #{otra_ot.id}."},
                status=status.HTTP_409_CONFLICT,
            )

        # 1. Vincular cotizacion
        ot.cotizaciones.add(cotizacion)

        # 2. Auto-vincular OCs derivadas de esta cotizacion
        ocs_derivadas = OrdenCompra.objects.filter(
            relacion_cotizacion=cotizacion,
            oc_empresa=ot.empresa,
        )
        if ocs_derivadas.exists():
            ot.ordenes_compra.add(*ocs_derivadas)

            # 3. Auto-vincular GuiasSalida que tengan items que provienen de esas OCs
            #    Cadena: GuiaSalida → ItemsGuiaSalida.source_item → ItemEnOrdenCompra → OrdenCompra
        guias_derivadas = GuiaSalida.objects.filter(
            Q(cotizacion_origen=cotizacion)
            | Q(
                cotizacion_origen__isnull=True,
                itemsguiasalida__source_item__orden_compra__in=ocs_derivadas,
            )
        ).distinct()
        if guias_derivadas.exists():
            ot.guias_salida.add(*guias_derivadas)

        return Response(OrdenDeTrabajoV3DetalleSerializer(ot, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="desvincular-cotizacion")
    def desvincular_cotizacion(self, request, pk=None):
        """
        Desvincula una cotizacion de la OT.
        Tambien quita las OCs derivadas de esa cotizacion y sus guias asociadas.
        Body: {cotizacion_id}
        """
        ot = self.get_object()
        cotizacion_id = request.data.get("cotizacion_id")
        if not cotizacion_id:
            return Response({"detail": "Debe indicar cotizacion_id."}, status=status.HTTP_400_BAD_REQUEST)
        from cotizaciones.models import Cotizacion
        from bodegas.models import OrdenCompra, GuiaSalida
        try:
            cotizacion = Cotizacion.objects.get(pk=cotizacion_id)
        except Cotizacion.DoesNotExist:
            return Response({"detail": "Cotizacion no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        # Quitar OCs derivadas de la cotizacion
        ocs_derivadas = OrdenCompra.objects.filter(
            relacion_cotizacion=cotizacion,
            oc_empresa=ot.empresa,
        )
        guias_derivadas = GuiaSalida.objects.filter(
            Q(cotizacion_origen=cotizacion)
            | Q(
                cotizacion_origen__isnull=True,
                itemsguiasalida__source_item__orden_compra__in=ocs_derivadas,
            )
        ).distinct()
        if guias_derivadas.exists():
            ot.guias_salida.remove(*guias_derivadas)
        if ocs_derivadas.exists():
            ot.ordenes_compra.remove(*ocs_derivadas)

        ot.cotizaciones.remove(cotizacion)
        return Response(OrdenDeTrabajoV3DetalleSerializer(ot, context={"request": request}).data)

    @action(detail=True, methods=["get"], url_path="equipos-disponibles")
    def equipos_disponibles(self, request, pk=None):
        """
        Retorna equipos disponibles para asignar en esta OT:
        - Grupo A: equipos que provienen de guias de salida vinculadas a la OT
          (identificados por numero_serie en los items de las guias).
        - Grupo B: equipos del cliente de la OT sin asignacion activa.
        La union de A y B es el conjunto disponible, sin duplicados.
        """
        from recursos.models import Equipo
        from bodegas.models import ItemsGuiaSalida

        ot = self.get_object()
        empresa = _get_empresa_usuario(request.user)
        if not empresa:
            return Response({"detail": "Sin empresa configurada."}, status=400)

        # Grupo A: series presentes en items de guias vinculadas
        series_en_guias = set()
        guia_ids = list(ot.guias_salida.values_list("id", flat=True))
        if guia_ids:
            items_guia = ItemsGuiaSalida.objects.filter(
                guia_id__in=guia_ids
            ).exclude(numero_serie=None).exclude(numero_serie={})
            for item in items_guia:
                ns = item.numero_serie
                if isinstance(ns, str) and ns.strip():
                    series_en_guias.add(ns.strip())
                elif isinstance(ns, dict):
                    # puede ser {"serie": "ABC"} o {"series": [...]}
                    serie_val = ns.get("serie") or ns.get("numero_serie")
                    if serie_val:
                        series_en_guias.add(str(serie_val))

        equipos_guia_ids = set()
        if series_en_guias:
            equipos_guia_ids = set(
                Equipo.objects.filter(
                    empresa_propietaria=empresa,
                    numero_serie__in=series_en_guias,
                ).values_list("id", flat=True)
            )

        # Grupo B: equipos del cliente sin asignacion activa
        equipos_libres_ids = set(
            Equipo.objects.filter(
                empresa_propietaria=empresa,
                cliente=ot.cliente,
                estado=True,
            ).exclude(
                usuario_equipo__estado=True
            ).values_list("id", flat=True)
        )

        ids_disponibles = equipos_guia_ids | equipos_libres_ids
        qs = Equipo.objects.filter(pk__in=ids_disponibles).select_related("cliente")

        from recursos.serializers import EquipoSerializer
        return Response(EquipoSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="crear-tareas-entrega-guia")
    def crear_tareas_entrega_guia(self, request, pk=None):
        """
        Crea tareas de tipo entrega_equipo a partir de items de guias vinculadas a la OT.
        Body: [{item_guia_id: int, usuario_receptor_id: int}, ...]
        Omite duplicados (si ya existe tarea con ese item_guia_origen).
        """
        ot = self.get_object()
        asignaciones = request.data
        if not isinstance(asignaciones, list) or not asignaciones:
            return Response(
                {"detail": "Se esperaba una lista de asignaciones [{item_guia_id, usuario_receptor_id}]."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from bodegas.models import ItemsGuiaSalida
        from empresas.models import UsuarioEmpresa

        guias_ids = set(ot.guias_salida.values_list("id", flat=True))
        creadas = []
        errores = []

        for asig in asignaciones:
            item_guia_id = asig.get("item_guia_id")
            receptor_id = asig.get("usuario_receptor_id")

            if not item_guia_id or not receptor_id:
                errores.append({"asignacion": asig, "error": "Faltan campos requeridos."})
                continue

            try:
                item = ItemsGuiaSalida.objects.select_related(
                    "stock_item__item", "guia"
                ).get(pk=item_guia_id)
            except ItemsGuiaSalida.DoesNotExist:
                errores.append({"item_guia_id": item_guia_id, "error": "Item de guia no encontrado."})
                continue

            if item.guia_id not in guias_ids:
                errores.append({"item_guia_id": item_guia_id, "error": "El item no pertenece a una guia vinculada a esta OT."})
                continue

            try:
                receptor = UsuarioEmpresa.objects.get(pk=receptor_id)
            except UsuarioEmpresa.DoesNotExist:
                errores.append({"usuario_receptor_id": receptor_id, "error": "Usuario receptor no encontrado."})
                continue

            # Omitir si ya existe tarea para este item
            if TareaOTV3.objects.filter(orden=ot, item_guia_origen_id=item_guia_id).exists():
                continue

            nombre_item = ""
            try:
                nombre_item = item.stock_item.item.nombre
            except Exception:
                pass

            tarea = TareaOTV3.objects.create(
                orden=ot,
                titulo=f"Entrega: {nombre_item}",
                tipo_tarea="entrega_equipo",
                requiere_firma=True,
                usuario_receptor=receptor,
                item_guia_origen=item,
            )
            creadas.append(tarea.id)

        ot.refresh_from_db()
        serializer = OrdenDeTrabajoV3DetalleSerializer(ot, context={"request": request})
        return Response(
            {"tareas_creadas": len(creadas), "errores": errores, "orden": serializer.data},
            status=status.HTTP_201_CREATED if creadas else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="stock-para-guia-rapida")
    def stock_para_guia_rapida(self, request, pk=None):
        """
        Devuelve los StockItemEnBodega de la bodega especificada filtrados por cotizacion
        o por orden de compra. Incluye series disponibles si aplica.
        GET ?bodega_id=X&cotizacion_id=Y (filtra por items de las OCs de esa cotizacion)
        GET ?bodega_id=X&orden_compra_id=Y (filtra por items de esa OC especifica)
        """
        ot = self.get_object()
        bodega_id = request.query_params.get("bodega_id")
        cotizacion_id = request.query_params.get("cotizacion_id")
        oc_id = request.query_params.get("orden_compra_id")
        if not bodega_id:
            return Response({"detail": "Debe indicar bodega_id."}, status=status.HTTP_400_BAD_REQUEST)
        from bodegas.models import OrdenCompra, StockItemEnBodega
        from bodegas.functions import obtener_series_disponibles_para_stock

        filtro_item_ids = None
        if cotizacion_id:
            # cotizacion_id tiene precedencia: filtra por todas las OCs derivadas de esa cotizacion
            if not ot.cotizaciones.filter(pk=cotizacion_id).exists():
                return Response(
                    {"detail": "La cotizacion no esta vinculada a esta orden de trabajo."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            from cotizaciones.models import ItemCotizacion
            ocs_cotizacion = ot.ordenes_compra.filter(relacion_cotizacion_id=cotizacion_id)
            ids_por_oc = set(ocs_cotizacion.values_list("items", flat=True))
            # Tambien incluir items directos de la cotizacion (sin OC asociada)
            ids_por_cotizacion = set(
                ItemCotizacion.objects.filter(
                    cotizacion_id=cotizacion_id,
                    item_empresa__isnull=False,
                ).values_list("item_empresa_id", flat=True)
            )
            filtro_item_ids = list(ids_por_oc | ids_por_cotizacion)
        elif oc_id:
            try:
                oc = OrdenCompra.objects.get(pk=oc_id)
            except OrdenCompra.DoesNotExist:
                return Response({"detail": "Orden de compra no encontrada."}, status=status.HTTP_404_NOT_FOUND)
            filtro_item_ids = list(oc.items.values_list("id", flat=True))

        incluir_sin_stock = request.query_params.get("incluir_sin_stock") == "1"

        qs = StockItemEnBodega.objects.filter(
            bodega_id=bodega_id, cantidad__gt=0
        ).select_related("item", "item__categoria")
        if filtro_item_ids is not None:
            qs = qs.filter(item_id__in=filtro_item_ids)

        resultado = []
        for stock in qs:
            series = obtener_series_disponibles_para_stock(stock)
            resultado.append({
                "stock_item_id": stock.id,
                "item_id": stock.item_id,
                "item_nombre": stock.item.nombre,
                "categoria_nombre": stock.item.categoria.nombre if stock.item.categoria else "",
                "cantidad_disponible": stock.cantidad,
                "series_disponibles": series,
                "requiere_serie": len(series) > 0,
                "en_stock": True,
            })

        if incluir_sin_stock and filtro_item_ids is not None:
            # Incluir items de la cotizacion que no tienen stock en esta bodega
            from items.models import ItemEmpresa
            ids_ya_incluidos = {r["item_id"] for r in resultado}
            items_sin_stock = ItemEmpresa.objects.filter(
                id__in=filtro_item_ids
            ).exclude(
                id__in=ids_ya_incluidos
            ).select_related("categoria")
            for item_e in items_sin_stock:
                resultado.append({
                    "stock_item_id": None,
                    "item_id": item_e.id,
                    "item_nombre": item_e.nombre,
                    "categoria_nombre": item_e.categoria.nombre if item_e.categoria else "",
                    "cantidad_disponible": 0,
                    "series_disponibles": [],
                    "requiere_serie": False,
                    "en_stock": False,
                })

        return Response(resultado)

    @action(detail=True, methods=["post"], url_path="crear-guia-rapida")
    def crear_guia_rapida(self, request, pk=None):
        """
        Crea una GuiaSalida vinculada a esta OT y agrega los items indicados.
        Body: {
            "bodega_id": X,
            "motivo": "...",
            "cotizacion_id": X (opcional para guias manuales por cotizacion),
            "items": [
                { "stock_item_id": X, "cantidad_rebajada": N, "numero_serie": "SERIE" (solo si tiene serie) }
            ]
        }
        """
        from django.db import transaction
        from bodegas.models import GuiaSalida, StockItemEnBodega, ItemsGuiaSalida
        from bodegas.movimientos import registrar_salida
        from bodegas.functions import obtener_series_disponibles_para_stock
        from cuentas.functions import obtener_usuario_empresa
        from bodegas.series import reservar_serie
        from cotizaciones.models import Cotizacion
        from django.db.models import F

        ot = self.get_object()
        bodega_id = request.data.get("bodega_id")
        motivo = request.data.get("motivo", "")
        cotizacion_id = request.data.get("cotizacion_id")
        items_data = request.data.get("items", [])
        ingresos_externos = request.data.get("ingresos_externos", [])

        if not bodega_id:
            return Response({"detail": "Debe indicar bodega_id."}, status=status.HTTP_400_BAD_REQUEST)

        cotizacion = None
        if cotizacion_id not in (None, ""):
            try:
                cotizacion = Cotizacion.objects.get(
                    pk=cotizacion_id,
                    empresa=ot.empresa,
                    cliente=ot.cliente,
                )
            except Cotizacion.DoesNotExist:
                return Response(
                    {"detail": "Cotizacion no encontrada para esta OT."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if not ot.cotizaciones.filter(pk=cotizacion.pk).exists():
                return Response(
                    {"detail": "La cotizacion indicada no esta vinculada a esta OT."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if not items_data and not cotizacion and not ingresos_externos:
            return Response(
                {"detail": "Debe indicar al menos un item, una cotizacion o ingresos externos para crear la guia."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario_empresa = obtener_usuario_empresa(request.user)
        if not usuario_empresa:
            return Response({"detail": "No tiene usuario empresa configurado."}, status=status.HTTP_403_FORBIDDEN)

        try:
            with transaction.atomic():
                guia = GuiaSalida.objects.create(
                    bodega_id=bodega_id,
                    cliente=ot.cliente,
                    creado_por=usuario_empresa,
                    motivo=motivo,
                    estado="P",
                    cotizacion_origen=cotizacion,
                )

                if ingresos_externos:
                    from items.models import ItemEmpresa
                    from bodegas.models import Bodega
                    from bodegas.movimientos import registrar_entrada
                    bodega_obj = Bodega.objects.get(pk=bodega_id)
                    items_externos_para_despachar = []
                    for ing in ingresos_externos:
                        item_id_ing = ing.get("item_id")
                        cantidad_ing = int(ing.get("cantidad", 1))
                        precio_ing = int(ing.get("precio", 0))
                        if not item_id_ing or cantidad_ing < 1:
                            raise ValueError("ingresos_externos: item_id y cantidad son requeridos.")
                        try:
                            item_emp = ItemEmpresa.objects.get(pk=item_id_ing)
                        except ItemEmpresa.DoesNotExist:
                            raise ValueError(f"Item {item_id_ing} no encontrado.")
                        existing = StockItemEnBodega.objects.filter(item=item_emp).first()
                        if existing and existing.bodega_id != int(bodega_id):
                            raise ValueError(
                                f"El item '{item_emp.nombre}' ya tiene stock en otra bodega "
                                f"({existing.bodega.nombre}). No se puede ingresar aqui."
                            )
                        if existing:
                            stock_ing = existing
                            if stock_ing.pmp == 0 and precio_ing > 0:
                                StockItemEnBodega.objects.filter(pk=stock_ing.pk).update(pmp=precio_ing)
                                stock_ing.refresh_from_db()
                        else:
                            stock_ing = StockItemEnBodega.objects.create(
                                bodega=bodega_obj,
                                item=item_emp,
                                cantidad=0,
                                cantidad_no_disponible=0,
                                pmp=precio_ing,
                            )
                        registrar_entrada(
                            stock_item=stock_ing,
                            cantidad=cantidad_ing,
                            usuario=usuario_empresa,
                            origen=None,
                            descripcion="Ingreso externo registrado al crear guia rapida en OTV3",
                        )
                        items_externos_para_despachar.append({
                            "stock_item_id": stock_ing.id,
                            "cantidad_rebajada": cantidad_ing,
                        })
                    items_data = list(items_data) + items_externos_para_despachar

                for item_d in items_data:
                    stock_item_id = item_d.get("stock_item_id")
                    cantidad_rebajada = int(item_d.get("cantidad_rebajada", 1))
                    numero_serie = item_d.get("numero_serie")

                    try:
                        stock_item = StockItemEnBodega.objects.select_for_update().get(pk=stock_item_id)
                    except StockItemEnBodega.DoesNotExist:
                        raise ValueError(f"Stock item {stock_item_id} no encontrado.")

                    series_disponibles = obtener_series_disponibles_para_stock(stock_item)
                    tiene_series = bool(series_disponibles)

                    if tiene_series:
                        if not numero_serie:
                            raise ValueError(
                                f"El item '{stock_item.item.nombre}' requiere numero de serie."
                            )
                        if numero_serie not in series_disponibles:
                            raise ValueError(
                                f"La serie '{numero_serie}' no esta disponible para '{stock_item.item.nombre}'."
                            )
                        if cantidad_rebajada != 1:
                            raise ValueError(
                                f"Items con serie deben tener cantidad 1 (item: '{stock_item.item.nombre}')."
                            )
                        cantidad_original = stock_item.cantidad
                        item_guia = ItemsGuiaSalida.objects.create(
                            guia=guia,
                            stock_item=stock_item,
                            cantidad_original=cantidad_original,
                            cantidad_rebajada=1,
                            individualizado=True,
                            numero_serie={"serie": numero_serie},
                        )
                        StockItemEnBodega.objects.filter(pk=stock_item.pk).update(
                            cantidad_no_disponible=F("cantidad_no_disponible") + 1
                        )
                        try:
                            reservar_serie(stock_item, numero_serie, item_guia)
                        except Exception:
                            pass
                        registrar_salida(
                            stock_item=stock_item,
                            cantidad=1,
                            origen=item_guia,
                            usuario=usuario_empresa,
                            descripcion="Item con serie agregado via guia rapida OTV3",
                        )
                    else:
                        if cantidad_rebajada > stock_item.cantidad:
                            raise ValueError(
                                f"Stock insuficiente para '{stock_item.item.nombre}'. "
                                f"Disponible: {stock_item.cantidad}, solicitado: {cantidad_rebajada}."
                            )
                        cantidad_original = stock_item.cantidad
                        item_guia = ItemsGuiaSalida.objects.create(
                            guia=guia,
                            stock_item=stock_item,
                            cantidad_original=cantidad_original,
                            cantidad_rebajada=cantidad_rebajada,
                            individualizado=False,
                        )
                        StockItemEnBodega.objects.filter(pk=stock_item.pk).update(
                            cantidad_no_disponible=F("cantidad_no_disponible") + cantidad_rebajada
                        )
                        registrar_salida(
                            stock_item=stock_item,
                            cantidad=cantidad_rebajada,
                            origen=item_guia,
                            usuario=usuario_empresa,
                            descripcion="Item agregado via guia rapida OTV3",
                        )

                ot.guias_salida.add(guia)
                if cotizacion:
                    ot.cotizaciones.add(cotizacion)

        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": f"Error al crear guia: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(
            OrdenDeTrabajoV3DetalleSerializer(ot, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class TareaOTV3ViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TareaOTV3Serializer

    def get_queryset(self):
        orden_pk = self.kwargs.get("orden_pk")
        empresa = _get_empresa_usuario(self.request.user)
        if not empresa:
            return TareaOTV3.objects.none()
        return TareaOTV3.objects.filter(
            orden__pk=orden_pk, orden__empresa=empresa
        ).select_related("tecnico_asignado").prefetch_related("checklist")

    def perform_create(self, serializer):
        orden_pk = self.kwargs.get("orden_pk")
        empresa = _get_empresa_usuario(self.request.user)
        ot = OrdenDeTrabajoV3.objects.filter(pk=orden_pk, empresa=empresa).first()
        if not ot:
            raise serializers.ValidationError("Orden de trabajo no encontrada.")
        serializer.save(orden=ot)

    @action(detail=True, methods=["post"], url_path="cambiar-estado")
    def cambiar_estado(self, request, orden_pk=None, pk=None):
        tarea = self.get_object()
        nuevo_estado = request.data.get("estado")
        if not nuevo_estado:
            return Response({"detail": 'Debe indicar "estado".'}, status=400)

        estados_permitidos = TRANSICIONES_TAREA_V3.get(tarea.estado, [])
        if nuevo_estado not in estados_permitidos:
            return Response(
                {
                    "detail": f"Transicion invalida: '{tarea.estado}' -> '{nuevo_estado}'.",
                    "transiciones_validas": estados_permitidos,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        tarea.estado = nuevo_estado
        if nuevo_estado == ESTADO_TAREA_COMPLETADA:
            tarea.fecha_ejecutada = timezone.now()
        notas = request.data.get("notas_ejecucion")
        if notas is not None:
            tarea.notas_ejecucion = notas
        tarea.save()
        return Response(TareaOTV3Serializer(tarea, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="completar-con-firma")
    def completar_con_firma(self, request, orden_pk=None, pk=None):
        """
        Completa la tarea y guarda datos de firma.
        Body: {
            "notas_ejecucion": "...",
            "firma_datos": { "nombre": "...", "firma_base64": "..." },
            "asignaciones_equipos": [{"equipo_id": 5}],  (solo si item serializado)
            "cantidad_asignada": 2                        (solo si item NO serializado)
        }
        Para tareas tipo entrega_equipo:
        - Si item_guia_origen.individualizado=True  → crea UsuarioEquipo (equipo serializado)
        - Si item_guia_origen.individualizado=False → crea ItemAsignadoUsuario (item no serializado)
        """
        tarea = self.get_object()
        if not tarea.requiere_firma:
            return Response({"detail": "Esta tarea no requiere firma."}, status=400)

        firma_datos = request.data.get("firma_datos")
        if not firma_datos:
            return Response({"detail": 'Se requiere "firma_datos" para completar.'}, status=400)

        # Bloquear si la guia de salida vinculada no ha sido firmada
        if tarea.tipo_tarea == "entrega_equipo" and tarea.item_guia_origen_id:
            guia = tarea.item_guia_origen.guia
            if guia.estado != "FR":
                return Response(
                    {
                        "detail": (
                            "La guia de salida asociada aun no ha sido firmada. "
                            "Firma la guia antes de completar esta tarea."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        usuario_equipo_ids = []
        item_asignado_ids = []

        if tarea.tipo_tarea == "entrega_equipo":
            if not tarea.usuario_receptor:
                return Response(
                    {"detail": "La tarea de entrega de equipo requiere un usuario receptor."},
                    status=400,
                )

            item_guia = tarea.item_guia_origen
            empresa = _get_empresa_usuario(request.user)

            if item_guia and not item_guia.individualizado:
                # --- Item NO serializado: crear ItemAsignadoUsuario ---
                from recursos.models import ItemAsignadoUsuario
                from django.utils.timezone import now as tz_now

                cantidad_asignada = int(request.data.get("cantidad_asignada", item_guia.cantidad_rebajada))
                if cantidad_asignada < 1 or cantidad_asignada > item_guia.cantidad_rebajada:
                    return Response(
                        {"detail": f"cantidad_asignada debe estar entre 1 y {item_guia.cantidad_rebajada}."},
                        status=400,
                    )

                # Desactivar asignaciones activas previas del mismo stock_item para este usuario
                ItemAsignadoUsuario.objects.filter(
                    usuario=tarea.usuario_receptor,
                    stock_item=item_guia.stock_item,
                    estado=True,
                ).update(estado=False, fecha_devolucion=tz_now().date())

                ia = ItemAsignadoUsuario.objects.create(
                    usuario=tarea.usuario_receptor,
                    stock_item=item_guia.stock_item,
                    item_guia_origen=item_guia,
                    cantidad=cantidad_asignada,
                )
                item_asignado_ids.append(ia.pk)

            else:
                # --- Item serializado (o sin item_guia): crear UsuarioEquipo ---
                asignaciones = request.data.get("asignaciones_equipos", [])
                for item in asignaciones:
                    equipo_id = item.get("equipo_id")
                    if not equipo_id:
                        continue
                    try:
                        equipo = Equipo.objects.get(pk=equipo_id, empresa_propietaria=empresa)
                    except Equipo.DoesNotExist:
                        return Response(
                            {"detail": f"Equipo {equipo_id} no encontrado o no pertenece a la empresa."},
                            status=400,
                        )
                    from django.utils.timezone import now as tz_now
                    UsuarioEquipo.objects.filter(equipo=equipo, estado=True).update(
                        estado=False,
                        fecha_devolucion=tz_now().date(),
                    )
                    ue = UsuarioEquipo.objects.create(
                        equipo=equipo,
                        usuario=tarea.usuario_receptor,
                    )
                    usuario_equipo_ids.append(ue.pk)

        tarea.estado = ESTADO_TAREA_COMPLETADA
        tarea.fecha_ejecutada = timezone.now()
        tarea.notas_ejecucion = request.data.get("notas_ejecucion", tarea.notas_ejecucion)
        tarea.firma_datos = {
            **firma_datos,
            "fecha": timezone.now().isoformat(),
            "firmado_por_id": request.user.pk,
            **({"usuario_equipo_ids": usuario_equipo_ids} if usuario_equipo_ids else {}),
            **({"item_asignado_ids": item_asignado_ids} if item_asignado_ids else {}),
        }
        tarea.save()
        return Response(TareaOTV3Serializer(tarea, context={"request": request}).data)


class AsignacionTecnicoOTV3ViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AsignacionTecnicoOTV3Serializer

    def get_queryset(self):
        orden_pk = self.kwargs.get("orden_pk")
        empresa = _get_empresa_usuario(self.request.user)
        if not empresa:
            return AsignacionTecnicoOTV3.objects.none()
        return AsignacionTecnicoOTV3.objects.filter(
            orden__pk=orden_pk, orden__empresa=empresa
        ).select_related("tecnico")

    def perform_create(self, serializer):
        orden_pk = self.kwargs.get("orden_pk")
        empresa = _get_empresa_usuario(self.request.user)
        ot = OrdenDeTrabajoV3.objects.filter(pk=orden_pk, empresa=empresa).first()
        if not ot:
            raise serializers.ValidationError("Orden de trabajo no encontrada.")
        serializer.save(orden=ot)




class ChecklistItemOTV3ViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChecklistItemOTV3Serializer

    def get_queryset(self):
        tarea_pk = self.kwargs.get("tarea_pk")
        orden_pk = self.kwargs.get("orden_pk")
        empresa = _get_empresa_usuario(self.request.user)
        if not empresa:
            return ChecklistItemOTV3.objects.none()
        return ChecklistItemOTV3.objects.filter(
            tarea__pk=tarea_pk,
            tarea__orden__pk=orden_pk,
            tarea__orden__empresa=empresa,
        )

    def perform_create(self, serializer):
        tarea_pk = self.kwargs.get("tarea_pk")
        orden_pk = self.kwargs.get("orden_pk")
        empresa = _get_empresa_usuario(self.request.user)
        tarea = TareaOTV3.objects.filter(
            pk=tarea_pk, orden__pk=orden_pk, orden__empresa=empresa
        ).first()
        if not tarea:
            raise serializers.ValidationError("Tarea no encontrada.")
        serializer.save(tarea=tarea)

    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle(self, request, orden_pk=None, tarea_pk=None, pk=None):
        """Alterna el estado completado/pendiente del item."""
        item = self.get_object()
        item.completado = not item.completado
        if item.completado:
            item.completado_por = request.user
            item.fecha_completado = timezone.now()
        else:
            item.completado_por = None
            item.fecha_completado = None
        item.save()
        return Response(ChecklistItemOTV3Serializer(item).data)


class SeguimientoOTV3ViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SeguimientoOTV3Serializer

    def get_queryset(self):
        orden_pk = self.kwargs.get("orden_pk")
        empresa = _get_empresa_usuario(self.request.user)
        if not empresa:
            return SeguimientoOTV3.objects.none()
        qs = SeguimientoOTV3.objects.filter(
            orden__pk=orden_pk, orden__empresa=empresa
        ).select_related("autor")
        tarea_pk = self.kwargs.get("tarea_pk")
        if tarea_pk:
            qs = qs.filter(tarea__pk=tarea_pk)
        return qs

    def perform_create(self, serializer):
        orden_pk = self.kwargs.get("orden_pk")
        empresa = _get_empresa_usuario(self.request.user)
        ot = OrdenDeTrabajoV3.objects.filter(pk=orden_pk, empresa=empresa).first()
        if not ot:
            raise serializers.ValidationError("Orden de trabajo no encontrada.")
        tarea_pk = self.kwargs.get("tarea_pk")
        tarea = None
        if tarea_pk:
            tarea = TareaOTV3.objects.filter(pk=tarea_pk, orden=ot).first()
        serializer.save(orden=ot, tarea=tarea, autor=self.request.user)


class GastoOTV3ViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = GastoOTV3Serializer

    def get_queryset(self):
        orden_pk = self.kwargs.get("orden_pk")
        empresa = _get_empresa_usuario(self.request.user)
        if not empresa:
            return GastoOTV3.objects.none()
        return GastoOTV3.objects.filter(
            orden__pk=orden_pk, orden__empresa=empresa
        ).select_related("categoria", "usuario_comprador")

    def perform_create(self, serializer):
        orden_pk = self.kwargs.get("orden_pk")
        empresa = _get_empresa_usuario(self.request.user)
        ot = OrdenDeTrabajoV3.objects.filter(pk=orden_pk, empresa=empresa).first()
        if not ot:
            raise serializers.ValidationError("Orden de trabajo no encontrada.")
        serializer.save(orden=ot, usuario_comprador=self.request.user)


class AdjuntoOTV3ViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    serializer_class = AdjuntoOTV3Serializer

    def get_queryset(self):
        orden_pk = self.kwargs.get("orden_pk")
        empresa = _get_empresa_usuario(self.request.user)
        if not empresa:
            return AdjuntoOTV3.objects.none()
        return AdjuntoOTV3.objects.filter(
            orden__pk=orden_pk, orden__empresa=empresa
        )

    def perform_create(self, serializer):
        orden_pk = self.kwargs.get("orden_pk")
        empresa = _get_empresa_usuario(self.request.user)
        ot = OrdenDeTrabajoV3.objects.filter(pk=orden_pk, empresa=empresa).first()
        if not ot:
            raise serializers.ValidationError("Orden de trabajo no encontrada.")
        serializer.save(orden=ot, subido_por=self.request.user)

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk_upload(self, request, orden_pk=None):
        """Sube multiples fotos a la vez. Body: multipart con lista de archivos."""
        empresa = _get_empresa_usuario(request.user)
        ot = OrdenDeTrabajoV3.objects.filter(pk=orden_pk, empresa=empresa).first()
        if not ot:
            return Response({"detail": "Orden no encontrada."}, status=404)

        archivos = request.FILES.getlist("archivos")
        descripcion = request.data.get("descripcion", "")
        creados = []
        for archivo in archivos:
            adjunto = AdjuntoOTV3.objects.create(
                orden=ot,
                tipo="foto",
                archivo=archivo,
                descripcion=descripcion,
                subido_por=request.user,
            )
            creados.append(adjunto)

        serializer = AdjuntoOTV3Serializer(creados, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class HistorialEstadoOTV3ViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = HistorialEstadoOTV3Serializer

    def get_queryset(self):
        orden_pk = self.kwargs.get("orden_pk")
        empresa = _get_empresa_usuario(self.request.user)
        if not empresa:
            return HistorialEstadoOTV3.objects.none()
        return HistorialEstadoOTV3.objects.filter(
            orden__pk=orden_pk, orden__empresa=empresa
        ).select_related("usuario")
