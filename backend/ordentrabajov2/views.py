import logging

from bodegas.models import GuiaSalida, ItemsGuiaSalida
from bodegas.serializers import GuiaSalidaSerializer, ItemsGuiaSalidaSerializer
from cuentas.functions import obtener_usuario_empresa
from django.db import transaction
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from ordentrabajov2.cierre_validaciones import validar_requisitos_cierre_ot

from cotizaciones.models import Cotizacion
from cotizaciones.tasks import actualizar_tipo_cambio_cotizacion

logger = logging.getLogger(__name__)

from .functions import (
    aplicar_cache_asignacion_usuario,
    aplicar_cache_asignacion_swap,
    calcular_ejecutado_de_ots_seleccionadas,
    calcular_ejecutado_del_contrato,
    calcular_pactado_del_contrato,
    guardar_firma_asignacion_pendiente,
    generar_pdf_orden_trabajo,
    obtener_cotizaciones_elegibles_para_ot,
    vincular_cotizaciones_a_ot,
    vincular_cotizaciones_generar_guias,
    vincular_guias_a_ot,
)
from .models import (
    AdjuntoDeOrden,
    CierreAdministrativoOT,
    GastoOperativoEnOt,
    HistorialCambiosOrden,
    OrdenDeTrabajo,
    SeguimientoItemOT,
    ServicioEnOT,
    SoporteTecnico,
    UsuarioAsignadoSoporte,
)
from .serializers import (
    AdjuntoDeOrdenSerializer,
    CierreAdministrativoOTSerializer,
    GastoOperativoEnOtSerializer,
    HistorialCambiosOrdenSerializer,
    OrdenDeTrabajoSerializer,
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
        return (
            "La guía debe estar en 'Espera Firma Recibido' o 'Firmada' para asociarla."
        )
    # Reverse one-to-one relations on GuiaSalida are available as objects
    # e.g. guia.soporte_tecnico and guia.servicio_ot (not *_id attributes)
    if (
        getattr(guia, "soporte_tecnico", None)
        and getattr(guia.soporte_tecnico, "id", None) != excluir_soporte_id
    ):
        return "La guía ya está asociada a otro soporte."
    if (
        getattr(guia, "servicio_ot", None)
        and getattr(guia.servicio_ot, "id", None) != excluir_servicio_id
    ):
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


def actualizar_guias_ot_en_inicio_trabajo(orden: OrdenDeTrabajo | None) -> None:
    """Avanza a 'ET' todas las guías de la OT que estén en 'FR'."""
    if not orden:
        return
    for guia in orden.guias_salida.all():
        actualizar_estado_guia_en_inicio_trabajo(guia)


def validar_guias_ot_firmadas(orden: OrdenDeTrabajo) -> tuple[bool, str]:
    """
    Valida que TODAS las guías de la OT estén en estados apropiados para trabajar.
    Retorna: (válido: bool, mensaje_error: str)
    
    Estados aceptados: FR (Firmada), ET (En Tránsito), E (Entregada), T (Otro)
    """
    guias = orden.guias_salida.all()
    
    # Si no hay guías, se considera válido
    if not guias.exists():
        return (True, "")
    
    # Verificar que TODAS las guías están en estados aceptados
    guias_invalidas = guias.exclude(estado__in=("FR", "ET", "E", "T"))
    
    if guias_invalidas.exists():
        ids_invalidas = list(guias_invalidas.values_list("id", flat=True))
        return (
            False,
            f"Todas las guías de la OT deben estar firmadas o en tránsito. "
            f"Guías pendientes: {ids_invalidas}",
        )
    
    return (True, "")


def validar_guias_ot_terminales(orden: OrdenDeTrabajo) -> tuple[bool, str]:
    """
    Valida que TODAS las guías de la OT estén en estados terminales para cerrar la OT.
    Estados terminales: E (Entregada), PR (Parcialmente Revertida), R (Revertida)
    """
    guias = orden.guias_salida.all()

    if not guias.exists():
        return (True, "")

    guias_invalidas = guias.exclude(estado__in=("E", "PR", "R"))
    if guias_invalidas.exists():
        ids_invalidas = list(guias_invalidas.values_list("id", flat=True))
        return (
            False,
            f"Todas las guías de la OT deben estar entregadas o revertidas. "
            f"Guías pendientes: {ids_invalidas}",
        )

    return (True, "")


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


def obtener_detalles_guia(guia: GuiaSalida) -> dict:
    """
    Calcula detalles de cantidades y usuario responsable de una guía.
    Retorna:
    - cantidad_rebajada_total: Total de items retirados de bodega
    - cantidad_devuelta_total: Total de items devueltos
    - cantidad_items: Cantidad de items en la guía
    - nombre_usuario_creador: Nombre de quién creó la guía
    - cliente_nombre: Cliente asociado si existe
    """
    items = ItemsGuiaSalida.objects.filter(guia=guia)
    cantidad_rebajada = sum(item.cantidad_rebajada for item in items)
    cantidad_devuelta = sum(item.cantidad_devuelta for item in items)
    
    # nombre_creado_por es un SerializerMethodField en bodegas.serializers,
    # por lo que no vive en el modelo. Tomamos el nombre desde creado_por.usuario
    # y si existe la propiedad calculada (por haber sido anotada), la usamos.
    nombre_usuario = "Sistema"
    if getattr(guia, "nombre_creado_por", None):
        nombre_usuario = guia.nombre_creado_por
    elif getattr(guia, "creado_por", None) and getattr(guia.creado_por, "usuario", None):
        nombre_usuario = guia.creado_por.usuario.get_nombre_completo()

    cliente_nombre = ""
    if getattr(guia, "cliente_nombre", None):
        cliente_nombre = guia.cliente_nombre
    elif getattr(guia, "cliente", None):
        cliente_nombre = getattr(guia.cliente, "nombre", "")
    
    return {
        "cantidad_rebajada_total": cantidad_rebajada,
        "cantidad_devuelta_total": cantidad_devuelta,
        "cantidad_items": items.count(),
        "nombre_usuario_creador": nombre_usuario,
        "cliente_nombre": cliente_nombre,
    }


def guardar_firma_subtrabajo_en_ot(
    orden: OrdenDeTrabajo,
    *,
    subtrabajo_tipo: str,
    subtrabajo_id: int,
    responsable_id: int,
    firma: str,
    estado: str,
) -> None:
    """
    Guarda/actualiza la firma de cierre del subtrabajo en firmas_ot.
    """
    entry = {
        "tipo": "subtrabajo",
        "subtrabajo_tipo": subtrabajo_tipo,
        "objeto_id": subtrabajo_id,
        "estado": estado,
        "responsable_id": responsable_id,
        "firma": firma,
        "fecha": timezone.now().isoformat(),
    }
    with transaction.atomic():
        orden_db = OrdenDeTrabajo.objects.select_for_update().get(pk=orden.pk)
        firmas_ot = orden_db.firmas_ot or {}
        firmas_ot.setdefault("firmas_usuarios", [])
        firmas_ot.setdefault("firmas_subtrabajos", [])
        firmas_ot.setdefault("firmas_guias", [])

        actualizado = False
        for idx, item in enumerate(firmas_ot["firmas_subtrabajos"]):
            if (
                item.get("tipo") == "subtrabajo"
                and item.get("subtrabajo_tipo") == subtrabajo_tipo
                and item.get("objeto_id") == subtrabajo_id
                and item.get("estado") == estado
            ) or (
                item.get("subtrabajo_tipo") == subtrabajo_tipo
                and item.get("subtrabajo_id") == subtrabajo_id
                and item.get("estado") == estado
            ):
                firmas_ot["firmas_subtrabajos"][idx] = entry
                actualizado = True
                break
        if not actualizado:
            firmas_ot["firmas_subtrabajos"].append(entry)

        orden_db.firmas_ot = firmas_ot
        orden_db.save(update_fields=["firmas_ot"])


class BaseWriteViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

from core.models import PersonalizacionUsuario
from .cierre_validaciones import validar_requisitos_cierre_ot

class OrdenDeTrabajoViewSet(BaseWriteViewSet):
    queryset = OrdenDeTrabajo.objects.all().order_by("-fecha_creacion")
    serializer_class = OrdenDeTrabajoSerializer

    def get_queryset(self):
        """
        Filtra órdenes de trabajo por la empresa del usuario autenticado.
        Multi-tenancy obligatorio para evitar fuga de datos entre empresas.
        """
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        
        if not personalizacion or not personalizacion.sucursal_principal:
            return OrdenDeTrabajo.objects.none()
        
        empresa = personalizacion.sucursal_principal.empresa
        qs = OrdenDeTrabajo.objects.filter(empresa=empresa).order_by("-fecha_creacion")
        
        # Filtros adicionales por query params
        tipo_servicio = self.request.query_params.get("tipo_servicio")
        estado = self.request.query_params.get("estado")
        empresa_param = self.request.query_params.get("empresa")
        cliente = self.request.query_params.get("cliente")
        
        if tipo_servicio:
            qs = qs.filter(tipo_servicio=tipo_servicio)
        if estado:
            qs = qs.filter(estado=estado)
        if empresa_param:
            # Solo permitir filtrar si es la misma empresa del usuario
            if int(empresa_param) == empresa.id:
                qs = qs.filter(empresa_id=empresa_param)
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
            "completada": ["facturada"],
            "facturada": ["cerrada"],
            "cerrada": [],  # Estado final
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

        if nuevo_estado == "completada":
            guias_terminales, error_msg = validar_guias_ot_terminales(orden)
            if not guias_terminales:
                return Response({"detail": error_msg}, status=status.HTTP_400_BAD_REQUEST)

        # Antes de cerrar definitivamente, validar requisitos administrativos
        if nuevo_estado == "cerrada":
            try:
                errores = validar_requisitos_cierre_ot(orden)
                if errores:
                    return Response(
                        {"detail": "No se puede cerrar la OT. Requisitos no cumplidos.", "errors": errores},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except Exception as e:
                return Response({"detail": f"Error al validar requisitos: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        orden.estado = nuevo_estado
        orden.save()
        # Si la OT inicia, avanzar guías vinculadas a "en tránsito"
        if estado_anterior != orden.estado and orden.estado == "en_proceso":
            for guia in orden.guias_salida.all():
                actualizar_estado_guia_en_inicio_trabajo(guia)
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

        guias_terminales, error_msg = validar_guias_ot_terminales(orden)
        if not guias_terminales and error_msg:
            razones.append(error_msg)

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
                    usuario_nombre = (
                        nombre or getattr(user, "username", None) or str(user)
                    )

            fecha = registro.fecha_cambio or registro.fecha_creacion
            data.append(
                {
                    "id": registro.id,
                    "history_date": fecha.isoformat() if fecha else None,
                    "history_user": usuario_nombre or "Desconocido",
                    "model": "OrdenDeTrabajo",
                    "detalle_cambio": registro.comentario
                    or "Actualizacion de datos de OT",
                    "valor_anterior": registro.estado_anterior,
                    "valor_nuevo": registro.estado_actual,
                    "accion": "Orden de Trabajo Modificado",
                    "accion_tipo": "Modificado",
                    "accion_modelo": "Orden de Trabajo",
                }
            )
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"], url_path="seguimientos")
    def seguimientos(self, request, pk=None):
        """
        Retorna todos los seguimientos de los servicios, soportes y la OT,
        consolidados en un solo listado. Permite crear un seguimiento a nivel OT.
        """
        from django.db.models import Q

        orden = self.get_object()

        if request.method == "POST":
            serializer = SeguimientoItemOTSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = {
                "orden": orden,
                "servicio": None,
                "soporte": None,
            }
            if not serializer.validated_data.get("usuario"):
                try:
                    usuario_empresa = obtener_usuario_empresa(self.request.user)
                    if usuario_empresa:
                        data["usuario"] = usuario_empresa
                except Exception:
                    pass
            serializer.save(**data)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        # Base queryset de seguimientos para la OT
        qs = (
            SeguimientoItemOT.objects.filter(
                Q(servicio__orden=orden) | Q(soporte__orden=orden) | Q(orden=orden)
            )
            .select_related("usuario__usuario", "servicio", "soporte")
            .order_by("-fecha_creacion")
        )

        # Filtros opcionales
        tipo = request.query_params.get("tipo")
        if tipo:
            # Soportar coma-separado para múltiples tipos
            tipos = [t.strip() for t in tipo.split(",") if t.strip()]
            if tipos:
                qs = qs.filter(tipo__in=tipos)

        origen = request.query_params.get("origen")  # 'servicio' | 'soporte'
        if origen == "servicio":
            qs = qs.filter(servicio__isnull=False)
        elif origen == "soporte":
            qs = qs.filter(soporte__isnull=False)

        # Paginación simple con limit/offset (opcional)
        total_count = qs.count()
        limit = request.query_params.get("limit")
        offset = request.query_params.get("offset")
        if limit is not None:
            try:
                lim = max(0, int(limit))
                off = max(0, int(offset or 0))
                qs = qs[off : off + lim]
            except ValueError:
                pass  # Ignorar paginación inválida

        serializer = SeguimientoItemOTSerializer(qs, many=True)
        headers = {"X-Total-Count": str(total_count)}
        return Response(serializer.data, headers=headers, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="guias-disponibles")
    def guias_disponibles(self, request, pk=None):
        orden = self.get_object()
        if not orden.cliente_id:
            return Response([], status=200)

        # Guías ya asociadas a servicios o soportes
        guias_servicios = ServicioEnOT.objects.exclude(
            guia_salida__isnull=True
        ).values_list("guia_salida_id", flat=True)
        guias_soportes = SoporteTecnico.objects.exclude(
            guia_salida__isnull=True
        ).values_list("guia_salida_id", flat=True)
        guias_usadas_ids = set(list(guias_servicios) + list(guias_soportes))

        # Solo permitir guías en "Espera Firma Recibido" (ER) o "Firmada por Recibido" (FR)
        # cuando se intenta vincular a una OT
        allowed_states = ["ER", "FR"]
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

    @action(detail=True, methods=["post"], url_path="vincular-guias")
    def vincular_guias(self, request, pk=None):
        orden = self.get_object()
        guias_ids = request.data.get("guias_ids") or request.data.get("guia_id")
        try:
            resultado = vincular_guias_a_ot(orden, guias_ids)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(resultado, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="vincular-cotizaciones")
    def vincular_cotizaciones(self, request, pk=None):
        orden = self.get_object()
        cotizaciones_ids = request.data.get("cotizaciones_ids") or request.data.get(
            "cotizacion_id"
        )
        try:
            resultado = vincular_cotizaciones_a_ot(orden, cotizaciones_ids)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(resultado, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="cotizaciones-elegibles")
    def cotizaciones_elegibles(self, request, pk=None):
        orden = self.get_object()
        try:
            cotizaciones, resumen = obtener_cotizaciones_elegibles_para_ot(orden)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        from cotizaciones.serializers import CotizacionSerializer

        serializer = CotizacionSerializer(cotizaciones, many=True)
        data = serializer.data
        if resumen:
            for item in data:
                cot_id = item.get("id")
                if cot_id in resumen:
                    item.update(resumen[cot_id])
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="vincular-cotizaciones-generar-guias")
    def vincular_cotizaciones_generar_guias(self, request, pk=None):
        orden = self.get_object()
        cotizaciones_ids = request.data.get("cotizaciones_ids") or request.data.get(
            "cotizacion_id"
        )
        usuario = obtener_usuario_empresa(request.user)
        try:
            resultado = vincular_cotizaciones_generar_guias(
                orden, cotizaciones_ids, usuario=usuario
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(resultado, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="items-serializados")
    def items_serializados(self, request, pk=None):
        orden = self.get_object()
        items = (
            ItemsGuiaSalida.objects.filter(
                guia__orden_trabajo=orden,
                individualizado=True,
            )
            .select_related("stock_item__item", "guia")
            .order_by("guia_id", "id")
        )

        data = []
        for item in items:
            numero_serie = item.numero_serie or {}
            serie = numero_serie.get("serie")
            if not serie:
                continue
            data.append(
                {
                    "item_guia_id": item.id,
                    "guia_id": item.guia_id,
                    "serie": serie,
                    "item_id": item.stock_item.item_id,
                    "item_nombre": item.stock_item.item.nombre,
                }
            )
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="usuarios-asignados-pendientes")
    def usuarios_asignados_pendientes(self, request, pk=None):
        orden = self.get_object()
        soporte_id = request.query_params.get("soporte_id")
        usuarios_pendientes = UsuarioAsignadoSoporte.objects.filter(
            soporte_tecnico__orden=orden,
            resuelto=False,
        )
        if soporte_id:
            usuarios_pendientes = usuarios_pendientes.exclude(
                soporte_tecnico_id=soporte_id
            )

        usuarios_pendientes = usuarios_pendientes.select_related(
            "usuario_empresa",
            "usuario_equipo__usuario",
        )
        usuario_empresa_ids = set()
        for asignado in usuarios_pendientes:
            if asignado.usuario_empresa_id:
                usuario_empresa_ids.add(asignado.usuario_empresa_id)
            elif asignado.usuario_equipo_id and asignado.usuario_equipo:
                usuario_empresa_ids.add(asignado.usuario_equipo.usuario_id)

        return Response(
            {"usuario_empresa_ids": sorted(usuario_empresa_ids)},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="pdf")
    def get_pdf(self, request, pk=None):
        orden = self.get_object()

        # Reunir toda la data necesaria para los módulos
        servicios = orden.servicioenot_set.all()
        soportes = orden.soportetecnico_set.all().prefetch_related("seguimientos")
        guias = (
            orden.guias_salida.all()
            .select_related("bodega", "entregado_a")
            .prefetch_related("itemsguiasalida_set__stock_item__item")
        )
        gastos = orden.gastooperativoenot_set.all().select_related("categoria")
        adjuntos = AdjuntoDeOrden.objects.filter(orden=orden)

        buffer = generar_pdf_orden_trabajo(
            orden, servicios, soportes, guias, gastos, adjuntos
        )

        response = HttpResponse(buffer, content_type="application/pdf")
        filename = f"Orden_Trabajo_{orden.id}.pdf"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        return response

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

        # Validar requisitos si intenta pasar a "cerrada"
        nuevo_estado = data.get("estado")
        if nuevo_estado == "cerrada" and estado_anterior == "En proceso Factura":
            errores = validar_requisitos_cierre_ot(instance)
            if errores:
                return Response(
                    {"detail": " ".join(errores)},
                    status=status.HTTP_400_BAD_REQUEST,
                )


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
                comentario_historial = (
                    str(comentario).strip() or "Actualizacion de datos de OT"
                )
                HistorialCambiosOrden.objects.create(
                    orden=instance,
                    usuario=usuario_empresa,
                    estado_anterior=cambios["anterior"],
                    estado_actual=cambios["actual"],
                    comentario=comentario_historial,
                )
                try:
                    SeguimientoItemOT.objects.create(
                        orden=instance,
                        usuario=usuario_empresa,
                        tipo="actualizacion",
                        comentario=comentario_historial,
                    )
                except Exception:
                    SeguimientoItemOT.objects.create(
                        orden=instance,
                        usuario=None,
                        tipo="actualizacion",
                        comentario=comentario_historial,
                    )

        return Response(serializer.data, status=status.HTTP_200_OK)

    @staticmethod
    def _sincronizar_relaciones_completada(orden: OrdenDeTrabajo) -> None:
        """Sincroniza compras y crea Rendición automática al completar OT."""
        from django.contrib.contenttypes.models import ContentType
        from django.db import transaction
        from django.utils import timezone
        from rendiciones.models import ItemRendicion, Rendicion

        # 1. Sincronizar estado de compras (lógica original)
        compras = orden.compras_rapidas.filter(estado="-")
        for compra in compras:
            if compra.itemencompra_set.exists():
                compra.estado = "P"
                compra.save(update_fields=["estado"])

        # 2. Crear Rendición automática (BLOQUE 6 - FASE 6)
        # Verificar si ya existe rendición para esta OT (idempotencia)
        if hasattr(orden, "rendicion_asociada") and orden.rendicion_asociada:
            return  # Ya tiene rendición, no duplicar

        # Recolectar gastos y compras
        gastos_ot = orden.gastooperativoenot_set.all()
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
                orden_trabajo=orden,
            )

            # Content types para ItemRendicion
            ct_gasto_operativo = ContentType.objects.get(
                app_label="ordentrabajov2", model="gastooperativoenot"
            )
            ct_compra = ContentType.objects.get(app_label="bodegas", model="compra")

            # Crear ItemRendicion para cada gasto operativo
            for gasto in gastos_ot:
                ItemRendicion.objects.create(
                    rendicion=rendicion,
                    content_type=ct_gasto_operativo,
                    detalle_id=gasto.id,
                )

            # Crear ItemRendicion para cada compra
            for compra in compras_con_items:
                ItemRendicion.objects.create(
                    rendicion=rendicion, content_type=ct_compra, detalle_id=compra.id
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

        servicios = list(
            ServicioEnOT.objects.filter(
                orden=orden,
                guia_salida__isnull=False,
            ).select_related("guia_salida")
        )
        soportes = list(
            SoporteTecnico.objects.filter(
                orden=orden,
                guia_salida__isnull=False,
            ).select_related("guia_salida")
        )
        if filtrar_pr:
            servicios = [s for s in servicios if getattr(s.guia_salida, "estado", None) == "PR"]
            soportes = [s for s in soportes if getattr(s.guia_salida, "estado", None) == "PR"]

        guias_directas = list(
            GuiaSalida.objects.filter(
                orden_trabajo=orden,
                soporte_tecnico__isnull=True,
                servicio_ot__isnull=True,
            )
        )
        if filtrar_pr:
            guias_directas = [g for g in guias_directas if g.estado == "PR"]

        guias_involucradas = [
            *(s.guia_salida for s in servicios if s.guia_salida),
            *(s.guia_salida for s in soportes if s.guia_salida),
            *guias_directas,
        ]

        items_por_guia: dict[int, list] = {}
        if guias_involucradas:
            guia_ids = [g.id for g in guias_involucradas if g]
            items_qs = ItemsGuiaSalida.objects.filter(guia_id__in=guia_ids).select_related(
                "stock_item",
                "stock_item__item",
            )
            items_serializados = ItemsGuiaSalidaSerializer(items_qs, many=True).data
            for item in items_serializados:
                guia_id = item.get("guia") or item.get("guia_id")
                if guia_id is None:
                    continue
                items_por_guia.setdefault(int(guia_id), []).append(item)

        out = []
        for s in servicios:
            g = s.guia_salida
            detalles = obtener_detalles_guia(g)
            out.append(
                {
                    "id": s.id,
                    "nombre": s.nombre,
                    "descripcion": s.descripcion or "",
                    "estado": s.estado,
                    "guia": {
                        "id": g.id,
                        "motivo": g.motivo,
                        "cantidad_items": detalles["cantidad_items"],
                        "cantidad_rebajada_total": detalles["cantidad_rebajada_total"],
                        "cantidad_devuelta_total": detalles["cantidad_devuelta_total"],
                        "nombre_usuario_creador": detalles["nombre_usuario_creador"],
                        "cliente_nombre": detalles["cliente_nombre"],
                        "estado": g.estado,
                        "estado_label": g.get_estado_display(),
                    },
                    "estado_label": s.get_estado_display(),
                    "tipo": "servicio",
                    "items": items_por_guia.get(g.id, []),
                }
            )

        for s in soportes:
            g = s.guia_salida
            detalles = obtener_detalles_guia(g)
            out.append(
                {
                    "id": s.id,
                    "nombre": s.nombre,
                    "descripcion": s.descripcion or "",
                    "estado": s.estado,
                    "guia": {
                        "id": g.id,
                        "motivo": g.motivo,
                        "cantidad_items": detalles["cantidad_items"],
                        "cantidad_rebajada_total": detalles["cantidad_rebajada_total"],
                        "cantidad_devuelta_total": detalles["cantidad_devuelta_total"],
                        "nombre_usuario_creador": detalles["nombre_usuario_creador"],
                        "cliente_nombre": detalles["cliente_nombre"],
                        "estado": g.estado,
                        "estado_label": g.get_estado_display(),
                    },
                    "estado_label": s.get_estado_display(),
                    "tipo": "soporte",
                    "items": items_por_guia.get(g.id, []),
                }
            )

        for g in guias_directas:
            detalles = obtener_detalles_guia(g)
            # Detectar si la guía viene de una cotización verificando la cadena de relaciones
            # Guía → Items → source_item (ItemEnOrdenCompra) → orden_compra → relacion_cotizacion
            cotizacion_relacionada = None
            try:
                items_guia = ItemsGuiaSalida.objects.filter(guia=g).select_related(
                    "source_item__orden_compra__relacion_cotizacion"
                )
                for item in items_guia:
                    if (
                        item.source_item
                        and item.source_item.orden_compra
                        and item.source_item.orden_compra.relacion_cotizacion
                    ):
                        cotizacion_relacionada = item.source_item.orden_compra.relacion_cotizacion
                        break
            except Exception:
                pass
            
            out.append(
                {
                    "id": g.id,
                    "nombre": f"Guía de Salida #{g.id}",
                    "descripcion": g.motivo or "Sin descripción",
                    "estado": "completado",
                    "guia": {
                        "id": g.id,
                        "motivo": g.motivo,
                        "cantidad_items": detalles["cantidad_items"],
                        "cantidad_rebajada_total": detalles["cantidad_rebajada_total"],
                        "cantidad_devuelta_total": detalles["cantidad_devuelta_total"],
                        "nombre_usuario_creador": detalles["nombre_usuario_creador"],
                        "cliente_nombre": detalles["cliente_nombre"],
                        "estado": g.estado,
                        "estado_label": g.get_estado_display(),
                    },
                    "estado_label": "Directo OT",
                    "tipo": "guia_directa",
                    "cotizacion_relacionada": {
                        "id": cotizacion_relacionada.id,
                        "numero": cotizacion_relacionada.numero_cotizacion,
                    } if cotizacion_relacionada else None,
                    "items": items_por_guia.get(g.id, []),
                }
            )

        return Response(out, status=200)

    @action(detail=False, methods=["get"], url_path="metricas-dashboard")
    def metricas_dashboard(self, request):
        """
        Endpoint para métricas del dashboard.
        Retorna conteo por estado, prioridad, técnicos y tendencia temporal.
        
        Query params:
        - fecha_inicio: Fecha inicio del período (default: primer día del mes actual)
        - fecha_fin: Fecha fin del período (default: hoy)
        """
        from django.db.models import Count, Avg, F, ExpressionWrapper, DurationField
        from django.db.models.functions import TruncDate
        from datetime import date, timedelta
        from core.models import PersonalizacionUsuario
        
        # Obtener empresa del usuario a través de PersonalizacionUsuario
        personalizacion = PersonalizacionUsuario.objects.filter(
            usuario=request.user
        ).select_related("sucursal_principal__empresa").first()
        
        if not personalizacion or not personalizacion.sucursal_principal or not personalizacion.sucursal_principal.empresa:
            return Response(
                {"detail": "No se encontró empresa asociada al usuario"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        empresa_id = personalizacion.sucursal_principal.empresa.id
        # Parsear fechas del período
        fecha_inicio_str = request.query_params.get("fecha_inicio")
        fecha_fin_str = request.query_params.get("fecha_fin")
        
        hoy = date.today()
        if fecha_inicio_str:
            try:
                fecha_inicio = date.fromisoformat(fecha_inicio_str)
            except ValueError:
                fecha_inicio = hoy.replace(day=1)
        else:
            fecha_inicio = hoy.replace(day=1)
        
        if fecha_fin_str:
            try:
                fecha_fin = date.fromisoformat(fecha_fin_str)
            except ValueError:
                fecha_fin = hoy
        else:
            fecha_fin = hoy
        
        # Queryset base filtrado por empresa y período
        qs_base = OrdenDeTrabajo.objects.filter(
            empresa_id=empresa_id,
            fecha_creacion__date__gte=fecha_inicio,
            fecha_creacion__date__lte=fecha_fin
        )
        
        # Queryset para OTs activas (sin filtro de fecha para conteos actuales)
        qs_activas = OrdenDeTrabajo.objects.filter(empresa_id=empresa_id)
        
        # 1. Conteo por estado (activas, sin filtro de fecha)
        conteo_estados = dict(qs_activas.values_list("estado").annotate(count=Count("id")))
        estados_resultado = {
            "pendiente": conteo_estados.get("pendiente", 0),
            "en_proceso": conteo_estados.get("en_proceso", 0),
            "completada": conteo_estados.get("completada", 0),
            "cerrada": conteo_estados.get("cerrada", 0),
            "facturada": conteo_estados.get("facturada", 0),
            "cancelada": conteo_estados.get("cancelada", 0),
        }
        
        # 2. Conteo por prioridad (en el período)
        conteo_prioridad = dict(qs_base.values_list("prioridad").annotate(count=Count("id")))
        prioridad_resultado = {
            "alta": conteo_prioridad.get("1", 0),
            "media": conteo_prioridad.get("2", 0),
            "baja": conteo_prioridad.get("3", 0),
        }
        
        # 3. OTs vencidas (fecha_finalizacion_ot pasada y no completadas/cerradas)
        ots_vencidas = qs_activas.filter(
            fecha_finalizacion_ot__lt=hoy,
            estado__in=["pendiente", "en_proceso"]
        ).count()
        
        # 4. Top 5 técnicos con más OTs (en el período)
        top_tecnicos = list(
            qs_base.filter(tecnico_responsable_ot__isnull=False)
            .values(
                "tecnico_responsable_ot__id",
                "tecnico_responsable_ot__usuario__first_name",
                "tecnico_responsable_ot__usuario__last_name"
            )
            .annotate(total=Count("id"))
            .order_by("-total")[:5]
        )
        tecnicos_resultado = [
            {
                "id": t["tecnico_responsable_ot__id"],
                "nombre": f"{t['tecnico_responsable_ot__usuario__first_name']} {t['tecnico_responsable_ot__usuario__last_name']}".strip() or "Sin nombre",
                "total": t["total"]
            }
            for t in top_tecnicos
        ]
        
        # 5. Top 5 clientes con más OTs (en el período)
        top_clientes = list(
            qs_base.values("cliente__id", "cliente__nombre")
            .annotate(total=Count("id"))
            .order_by("-total")[:5]
        )
        clientes_resultado = [
            {
                "id": c["cliente__id"],
                "nombre": c["cliente__nombre"],
                "total": c["total"]
            }
            for c in top_clientes
        ]
        
        # 6. Tendencia de OTs creadas (últimos 30 días)
        fecha_30_dias = hoy - timedelta(days=30)
        tendencia = list(
            OrdenDeTrabajo.objects.filter(
                empresa_id=empresa_id,
                fecha_creacion__date__gte=fecha_30_dias
            )
            .annotate(fecha=TruncDate("fecha_creacion"))
            .values("fecha")
            .annotate(total=Count("id"))
            .order_by("fecha")
        )
        tendencia_resultado = [
            {"fecha": t["fecha"].isoformat(), "total": t["total"]}
            for t in tendencia
        ]
        
        # 7. Total gastos OT en el período
        total_gastos = GastoOperativoEnOt.objects.filter(
            orden__empresa_id=empresa_id,
            fecha_compra__gte=fecha_inicio,
            fecha_compra__lte=fecha_fin
        ).aggregate(total=Sum("monto_total"))["total"] or 0
        
        # 8. OTs completadas en el período
        ots_completadas_periodo = qs_base.filter(estado="completada").count()
        
        # 9. Conteo cierres administrativos por estado (filtrado por cliente de la empresa)
        cierres = CierreAdministrativoOT.objects.filter(
            cliente_id=empresa_id
        ).values_list("estado_cierre").annotate(count=Count("id"))
        cierres_resultado = {
            "borrador": 0,
            "en_revision": 0,
            "aprobado": 0,
            "facturado": 0,
            "pagado": 0,
            "anulado": 0,
        }
        for estado, count in cierres:
            if estado in cierres_resultado:
                cierres_resultado[estado] = count
        
        return Response({
            "periodo": {
                "fecha_inicio": fecha_inicio.isoformat(),
                "fecha_fin": fecha_fin.isoformat(),
            },
            "resumen": {
                "total_periodo": qs_base.count(),
                "total_activas": qs_activas.exclude(estado__in=["cerrada", "cancelada"]).count(),
                "ots_vencidas": ots_vencidas,
                "completadas_periodo": ots_completadas_periodo,
                "total_gastos": float(total_gastos),
            },
            "por_estado": estados_resultado,
            "por_prioridad": prioridad_resultado,
            "cierres_administrativos": cierres_resultado,
            "top_tecnicos": tecnicos_resultado,
            "top_clientes": clientes_resultado,
            "tendencia_30_dias": tendencia_resultado,
        })


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
        estado_anterior = instance.estado
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
            # Validar que TODAS las guías de la OT estén firmadas/en tránsito/entregadas
            guias_validas, error_msg = validar_guias_ot_firmadas(instance.orden)
            if not guias_validas:
                return Response(
                    {"detail": error_msg},
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
        if resp.status_code in (status.HTTP_200_OK, status.HTTP_202_ACCEPTED):
            instance.refresh_from_db()

            # Auto-crear seguimiento si cambió el estado
            if estado_anterior != instance.estado:
                logger.info(
                    f"Estado cambiado en soporte {instance.id}: '{estado_anterior}' -> '{instance.estado}'"
                )
                if request.user and request.user.is_authenticated:
                    try:
                        usuario_empresa = obtener_usuario_empresa(request.user)
                        seguimiento = SeguimientoItemOT.objects.create(
                            soporte=instance,
                            usuario=usuario_empresa,
                            tipo="actualizacion",
                            comentario=f"Estado cambiado de '{estado_anterior}' a '{instance.estado}'",
                        )
                        logger.info(
                            f"✅ Seguimiento creado: ID={seguimiento.id}, Usuario={usuario_empresa}"
                        )
                    except Exception as e:
                        logger.error(
                            f"❌ Error al crear seguimiento para soporte {instance.id}: {str(e)}"
                        )
                        # Crear seguimiento sin usuario como fallback
                        seguimiento = SeguimientoItemOT.objects.create(
                            soporte=instance,
                            usuario=None,
                            tipo="actualizacion",
                            comentario=f"Estado cambiado de '{estado_anterior}' a '{instance.estado}'",
                        )
                        logger.warning(
                            f"⚠️ Seguimiento creado sin usuario: ID={seguimiento.id}"
                        )
                else:
                    logger.warning(
                        f"⚠️ Usuario no autenticado, creando seguimiento sin usuario para soporte {instance.id}"
                    )
                    seguimiento = SeguimientoItemOT.objects.create(
                        soporte=instance,
                        usuario=None,
                        tipo="actualizacion",
                        comentario=f"Estado cambiado de '{estado_anterior}' a '{instance.estado}'",
                    )

            if nuevo_estado == "en_proceso":
                if instance.orden.estado == "pendiente":
                    instance.orden.estado = "en_proceso"
                    instance.orden.save(update_fields=["estado"])
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
            orden = (
                OrdenDeTrabajo.objects.select_related("tecnico_responsable_ot")
                .only("tecnico_responsable_ot", "fecha_inicio_ot")
                .get(pk=orden_trabajo_pk)
            )
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

    # ⚠️ FUNCIONALIDAD ANTIGUA DESHABILITADA (2026-01)
    # Se debe usar el modelo de guías directas en la OT.
    # Para reactivar, descomenta el bloque y remueve el endpoint de InsumoViewSet.
    # @action(detail=True, methods=["post"], url_path="asociar-guia")
    # def asociar_guia(self, request, pk=None, orden_trabajo_pk=None):
    #     soporte = self.get_object()
    #     guia_id = request.data.get("guia_salida")
    #     if not guia_id:
    #         return Response(
    #             {"detail": 'Debes enviar "guia_salida".'},
    #             status=status.HTTP_400_BAD_REQUEST,
    #         )
    #     guia = get_object_or_404(GuiaSalida, pk=guia_id)
    #     error = validar_guia_para_trabajo(
    #         guia, soporte.orden, excluir_soporte_id=soporte.id
    #     )
    #     if error:
    #         return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)
    #     if not guia.orden_trabajo_id:
    #         guia.orden_trabajo = soporte.orden
    #         guia.save(update_fields=["orden_trabajo"])
    #     soporte.guia_salida = guia
    #     soporte.save(update_fields=["guia_salida"])
    #     return Response(self.get_serializer(soporte).data, status=status.HTTP_200_OK)

    # @action(detail=True, methods=["post"], url_path="desasociar-guia")
    # def desasociar_guia(self, request, pk=None, orden_trabajo_pk=None):
    #     soporte = self.get_object()
    #     if not soporte.guia_salida_id:
    #         return Response(
    #             {"detail": "El soporte no tiene guía asociada."},
    #             status=status.HTTP_400_BAD_REQUEST,
    #         )
    #     guia = soporte.guia_salida
    #     soporte.guia_salida = None
    #     soporte.save(update_fields=["guia_salida"])
    #     guia.refresh_from_db()
    #     if not getattr(guia, "servicio_ot", None) and not getattr(
    #         guia, "soporte_tecnico", None
    #     ):
    #         guia.orden_trabajo = None
    #         guia.save(update_fields=["orden_trabajo"])
    #     return Response(self.get_serializer(soporte).data, status=status.HTTP_200_OK)

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

    @action(detail=True, methods=["post"], url_path="completar-trabajo")
    def completar_trabajo(self, request, pk=None, orden_trabajo_pk=None):
        """
        Completa un soporte técnico:
        1. Valida que exista al menos 1 comentario técnico
        2. Requiere firma del usuario final (firma_entrega)
        3. Requiere usuario que recibe (entregado_a)
        4. Actualiza estado a 'completado' o 'medianamente_completado'
        5. Si tiene guía, actualiza firma_entrega y entregado_a en la guía

        Body esperado:
        {
          "firma_entrega": "<base64 signature>",
          "entregado_a": <usuario_empresa_id>,
          "estado": "completado" | "medianamente_completado"  (opcional, default: completado)
        }
        """
        soporte = self.get_object()

        # Validación 1: Ya debe estar en proceso
        if soporte.estado != "en_proceso":
            return Response(
                {"detail": "El soporte debe estar 'en proceso' para completarlo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validación 2: Al menos un comentario técnico
        tiene_comentario_tecnico = SeguimientoItemOT.objects.filter(
            soporte=soporte, tipo="comentario_tecnico"
        ).exists()

        if not tiene_comentario_tecnico:
            return Response(
                {
                    "detail": "Se requiere al menos un comentario técnico antes de completar el soporte."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validación 3: Firma y usuario receptor
        firma_entrega = request.data.get("firma_entrega", "").strip()
        entregado_a_id = request.data.get("entregado_a")
        estado_final = request.data.get(
            "estado", "completado"
        )  # Por defecto completado

        # Validar que el estado sea válido
        if estado_final not in ("completado", "medianamente_completado"):
            return Response(
                {
                    "detail": "El estado debe ser 'completado' o 'medianamente_completado'."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not firma_entrega:
            return Response(
                {"detail": "El campo 'firma_entrega' es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not entregado_a_id:
            return Response(
                {"detail": "El campo 'entregado_a' es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from empresas.models import UsuarioEmpresa

            entregado_a = UsuarioEmpresa.objects.get(pk=entregado_a_id)
        except UsuarioEmpresa.DoesNotExist:
            return Response(
                {"detail": "Usuario receptor no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Actualizar soporte con el estado especificado
        soporte.estado = estado_final
        soporte.save(update_fields=["estado"])

        guardar_firma_subtrabajo_en_ot(
            soporte.orden,
            subtrabajo_tipo="soporte",
            subtrabajo_id=soporte.id,
            responsable_id=entregado_a.id,
            firma=firma_entrega,
            estado=estado_final,
        )

        # Si tiene guía asociada, actualizar firma de entrega
        if soporte.guia_salida_id:
            guia = soporte.guia_salida
            guia.firma_entrega = firma_entrega
            guia.entregado_a = entregado_a
            guia.estado = "E"  # Entregada
            guia.save(update_fields=["firma_entrega", "entregado_a", "estado"])
            logger.info(
                f"✅ Guía #{guia.id} actualizada con firma de entrega y estado 'E'"
            )

        # Crear seguimiento automático
        if request.user and request.user.is_authenticated:
            try:
                usuario_empresa = obtener_usuario_empresa(request.user)
                SeguimientoItemOT.objects.create(
                    soporte=soporte,
                    usuario=usuario_empresa,
                    tipo="actualizacion",
                    comentario=f"Soporte marcado como '{estado_final}' y firmado por {entregado_a.usuario.get_full_name() or entregado_a.usuario.username}",
                )
            except Exception as e:
                logger.error(f"❌ Error al crear seguimiento de completado: {str(e)}")

        logger.info(
            f"✅ Soporte #{soporte.id} marcado como '{estado_final}' exitosamente"
        )
        return Response(self.get_serializer(soporte).data, status=status.HTTP_200_OK)

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


class UsuariosVinculadosOrdenAPIView(APIView):
    """
    Endpoint de compatibilidad: devuelve los usuarios asignados a una OT (agregando asignaciones de soportes).
    Ruta: /ordenes-de-trabajo/<orden_pk>/usuarios-vinculados/
    """

    def get(self, request, orden_pk=None):
        if orden_pk is None:
            return Response([], status=status.HTTP_200_OK)
        usuarios = UsuarioAsignadoSoporte.objects.filter(
            soporte_tecnico__orden_id=orden_pk
        ).order_by("-fecha_creacion")
        serializer = UsuarioAsignadoSoporteSerializer(usuarios, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RetroalimentacionesOrdenAPIView(APIView):
    """
    Endpoint de compatibilidad: devuelve retroalimentaciones asociadas a una OT.
    Ruta: /ordenes-de-trabajo/<orden_pk>/retroalimentaciones/
    """

    def get(self, request, orden_pk=None):
        if orden_pk is None:
            return Response([], status=status.HTTP_200_OK)
        try:
            from retroalimentacion.serializers import RetroalimentacionSerializer
            from retroalimentacion.models import Retroalimentacion

            retro = Retroalimentacion.objects.filter(orden_trabajo_id=orden_pk).order_by("-fecha_creacion")
            serializer = RetroalimentacionSerializer(retro, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception:
            return Response([], status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="firmar-asignacion")
    def firmar_asignacion(self, request, pk=None, **kwargs):
        usuario_asignado = self.get_object()
        soporte = usuario_asignado.soporte_tecnico
        firma = (request.data.get("firma") or "").strip()

        if soporte.estado != "en_proceso":
            return Response(
                {"detail": "El soporte debe estar en proceso para firmar."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not firma:
            return Response(
                {"detail": "La firma es requerida."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cache = usuario_asignado.cache_asignacion or {}
        if cache.get("firma_pendiente"):
            return Response(
                {"detail": "Esta asignacion ya tiene una firma pendiente de aplicar."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        movimientos = (cache.get("cache") or {}).get("movimientos") or []
        if not movimientos:
            return Response(
                {"detail": "No hay movimientos pendientes para firmar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        seleccion = (cache.get("cache") or {}).get("seleccion") or {}
        tipo = seleccion.get("tipo")

        usuario_empresa = obtener_usuario_empresa(request.user)
        usuario_empresa_actual = (
            usuario_asignado.usuario_empresa
            or (usuario_asignado.usuario_equipo.usuario if usuario_asignado.usuario_equipo else None)
        )
        if tipo == "equipo":
            equipo_id = seleccion.get("equipo_id")
            if equipo_id:
                from recursos.models import UsuarioEquipo
                from django.db.models import Q

                usuario_equipo_actual = (
                    UsuarioEquipo.objects.select_related("usuario")
                    .filter(equipo_id=equipo_id, estado=True)
                    .exclude(usuario=usuario_empresa_actual)
                    .first()
                )
                if usuario_equipo_actual and usuario_equipo_actual.usuario_id:
                    otro_asignado = (
                        UsuarioAsignadoSoporte.objects.filter(
                            soporte_tecnico=soporte,
                            resuelto=False,
                        )
                        .filter(
                            Q(usuario_empresa_id=usuario_equipo_actual.usuario_id)
                            | Q(usuario_equipo__usuario_id=usuario_equipo_actual.usuario_id)
                        )
                        .first()
                    )
                    firma_pendiente = None
                    fecha_pendiente = None
                    if otro_asignado:
                        cache_otro = otro_asignado.cache_asignacion or {}
                        firma_pendiente = (cache_otro.get("firma_pendiente") or {}).get(
                            "firma"
                        )
                        fecha_pendiente = (cache_otro.get("firma_pendiente") or {}).get(
                            "fecha"
                        )
                    if firma_pendiente and otro_asignado:
                        try:
                            entry_actual, entry_otro = aplicar_cache_asignacion_swap(
                                usuario_asignado,
                                otro_asignado,
                                firma_actual=firma,
                                firma_otro=firma_pendiente,
                                fecha_firma_otro=fecha_pendiente,
                                usuario_ejecutor=usuario_empresa,
                            )
                        except Exception as exc:
                            return Response(
                                {"detail": str(exc)},
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                        return Response(
                            {
                                "estado": "aplicada",
                                "entries": [entry_actual, entry_otro],
                            },
                                status=status.HTTP_200_OK,
                            )
                    if not otro_asignado:
                        return Response(
                            {"detail": "El equipo ya tiene un usuario asignado."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    try:
                        entry = guardar_firma_asignacion_pendiente(
                            usuario_asignado,
                            firma=firma,
                            usuario_ejecutor=usuario_empresa,
                        )
                    except Exception as exc:
                        return Response(
                            {"detail": str(exc)},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    return Response(
                        {
                            "estado": "pendiente",
                            "detail": "Firma guardada. Pendiente de aplicar.",
                            "entry": entry,
                        },
                        status=status.HTTP_200_OK,
                    )
        try:
            entry = aplicar_cache_asignacion_usuario(
                usuario_asignado,
                firma=firma,
                usuario_ejecutor=usuario_empresa,
            )
        except UsuarioAsignadoSoporte.DoesNotExist:
            return Response(
                {"detail": "Asignacion no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(entry, status=status.HTTP_200_OK)


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
        estado_anterior = instance.estado
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
            fecha_servicio = (
                request.data.get("fecha_servicio") or instance.fecha_servicio
            )
            if not fecha_servicio:
                return Response(
                    {"detail": "Define fecha de servicio antes de iniciar."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Validar que TODAS las guías de la OT estén firmadas/en tránsito/entregadas
            guias_validas, error_msg = validar_guias_ot_firmadas(instance.orden)
            if not guias_validas:
                return Response(
                    {"detail": error_msg},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        resp = super().update(request, *args, partial=partial, **kwargs)
        if resp.status_code in (status.HTTP_200_OK, status.HTTP_202_ACCEPTED):
            instance.refresh_from_db()

            # Auto-crear seguimiento si cambió el estado
            if estado_anterior != instance.estado:
                logger.info(
                    f"Estado cambiado en servicio {instance.id}: '{estado_anterior}' -> '{instance.estado}'"
                )
                if request.user and request.user.is_authenticated:
                    try:
                        usuario_empresa = obtener_usuario_empresa(request.user)
                        seguimiento = SeguimientoItemOT.objects.create(
                            servicio=instance,
                            usuario=usuario_empresa,
                            tipo="actualizacion",
                            comentario=f"Estado cambiado de '{estado_anterior}' a '{instance.estado}'",
                        )
                        logger.info(
                            f"✅ Seguimiento creado: ID={seguimiento.id}, Usuario={usuario_empresa}"
                        )
                    except Exception as e:
                        logger.error(
                            f"❌ Error al crear seguimiento para servicio {instance.id}: {str(e)}"
                        )
                        # Crear seguimiento sin usuario como fallback
                        seguimiento = SeguimientoItemOT.objects.create(
                            servicio=instance,
                            usuario=None,
                            tipo="actualizacion",
                            comentario=f"Estado cambiado de '{estado_anterior}' a '{instance.estado}'",
                        )
                        logger.warning(
                            f"⚠️ Seguimiento creado sin usuario: ID={seguimiento.id}"
                        )
                else:
                    logger.warning(
                        f"⚠️ Usuario no autenticado, creando seguimiento sin usuario para servicio {instance.id}"
                    )
                    seguimiento = SeguimientoItemOT.objects.create(
                        servicio=instance,
                        usuario=None,
                        tipo="actualizacion",
                        comentario=f"Estado cambiado de '{estado_anterior}' a '{instance.estado}'",
                    )

            if nuevo_estado == "en_proceso":
                if instance.orden.estado == "pendiente":
                    instance.orden.estado = "en_proceso"
                    instance.orden.save(update_fields=["estado"])
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
            orden = (
                OrdenDeTrabajo.objects.select_related("tecnico_responsable_ot")
                .only("tecnico_responsable_ot", "fecha_inicio_ot")
                .get(pk=orden_trabajo_pk)
            )
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

    # ⚠️ FUNCIONALIDAD ANTIGUA DESHABILITADA (2026-01)
    # Se debe usar el modelo de guías directas en la OT.
    # Para reactivar, descomenta el bloque y remueve el endpoint de InsumoViewSet.
    # @action(detail=True, methods=["post"], url_path="asociar-guia")
    # def asociar_guia(self, request, pk=None, orden_trabajo_pk=None):
    #     servicio = self.get_object()
    #     guia_id = request.data.get("guia_salida")
    #     if not guia_id:
    #         return Response(
    #             {"detail": 'Debes enviar "guia_salida".'},
    #             status=status.HTTP_400_BAD_REQUEST,
    #         )
    #     guia = get_object_or_404(GuiaSalida, pk=guia_id)
    #     error = validar_guia_para_trabajo(
    #         guia, servicio.orden, excluir_servicio_id=servicio.id
    #     )
    #     if error:
    #         return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)
    #     if not guia.orden_trabajo_id:
    #         guia.orden_trabajo = servicio.orden
    #         guia.save(update_fields=["orden_trabajo"])
    #     servicio.guia_salida = guia
    #     servicio.save(update_fields=["guia_salida"])
    #     return Response(self.get_serializer(servicio).data, status=status.HTTP_200_OK)

    # @action(detail=True, methods=["post"], url_path="desasociar-guia")
    # def desasociar_guia(self, request, pk=None, orden_trabajo_pk=None):
    #     servicio = self.get_object()
    #     if not servicio.guia_salida_id:
    #         return Response(
    #             {"detail": "El servicio no tiene guía asociada."},
    #             status=status.HTTP_400_BAD_REQUEST,
    #         )
    #     guia = servicio.guia_salida
    #     servicio.guia_salida = None
    #     servicio.save(update_fields=["guia_salida"])
    #     guia.refresh_from_db()
    #     if not getattr(guia, "servicio_ot", None) and not getattr(
    #         guia, "soporte_tecnico", None
    #     ):
    #         guia.orden_trabajo = None
    #         guia.save(update_fields=["orden_trabajo"])
    #     return Response(self.get_serializer(servicio).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="completar-trabajo")
    def completar_trabajo(self, request, pk=None, orden_trabajo_pk=None):
        """
        Completa un servicio general:
        1. Valida que exista al menos 1 comentario técnico
        2. Requiere firma del usuario final (firma_entrega)
        3. Requiere usuario que recibe (entregado_a)
        4. Actualiza estado a 'completado' o 'medianamente_completado'
        5. Si tiene guía, actualiza firma_entrega y entregado_a en la guía

        Body esperado:
        {
          "firma_entrega": "<base64 signature>",
          "entregado_a": <usuario_empresa_id>,
          "estado": "completado" | "medianamente_completado"  (opcional, default: completado)
        }
        """
        servicio = self.get_object()

        # Validación 1: Ya debe estar en proceso
        if servicio.estado != "en_proceso":
            return Response(
                {"detail": "El servicio debe estar 'en proceso' para completarlo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validación 2: Al menos un comentario técnico
        tiene_comentario_tecnico = SeguimientoItemOT.objects.filter(
            servicio=servicio, tipo="comentario_tecnico"
        ).exists()

        if not tiene_comentario_tecnico:
            return Response(
                {
                    "detail": "Se requiere al menos un comentario técnico antes de completar el servicio."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validación 3: Firma y usuario receptor
        firma_entrega = request.data.get("firma_entrega", "").strip()
        entregado_a_id = request.data.get("entregado_a")
        estado_final = request.data.get(
            "estado", "completado"
        )  # Por defecto completado

        # Validar que el estado sea válido
        if estado_final not in ("completado", "medianamente_completado"):
            return Response(
                {
                    "detail": "El estado debe ser 'completado' o 'medianamente_completado'."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not firma_entrega:
            return Response(
                {"detail": "El campo 'firma_entrega' es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not entregado_a_id:
            return Response(
                {"detail": "El campo 'entregado_a' es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from empresas.models import UsuarioEmpresa

            entregado_a = UsuarioEmpresa.objects.get(pk=entregado_a_id)
        except UsuarioEmpresa.DoesNotExist:
            return Response(
                {"detail": "Usuario receptor no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Actualizar servicio con el estado especificado
        servicio.estado = estado_final
        servicio.save(update_fields=["estado"])

        guardar_firma_subtrabajo_en_ot(
            servicio.orden,
            subtrabajo_tipo="servicio",
            subtrabajo_id=servicio.id,
            responsable_id=entregado_a.id,
            firma=firma_entrega,
            estado=estado_final,
        )

        # Si tiene guía asociada, actualizar firma de entrega
        if servicio.guia_salida_id:
            guia = servicio.guia_salida
            guia.firma_entrega = firma_entrega
            guia.entregado_a = entregado_a
            guia.estado = "E"  # Entregada
            guia.save(update_fields=["firma_entrega", "entregado_a", "estado"])
            logger.info(
                f"✅ Guía #{guia.id} actualizada con firma de entrega y estado 'E'"
            )

        # Crear seguimiento automático
        if request.user and request.user.is_authenticated:
            try:
                usuario_empresa = obtener_usuario_empresa(request.user)
                SeguimientoItemOT.objects.create(
                    servicio=servicio,
                    usuario=usuario_empresa,
                    tipo="actualizacion",
                    comentario=f"Servicio marcado como '{estado_final}' y firmado por {entregado_a.usuario.get_full_name() or entregado_a.usuario.username}",
                )
            except Exception as e:
                logger.error(f"❌ Error al crear seguimiento de completado: {str(e)}")

        logger.info(
            f"✅ Servicio #{servicio.id} marcado como '{estado_final}' exitosamente"
        )
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
                actualizar_guias_ot_en_inicio_trabajo(servicio.orden)
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


class GastoOperativoEnOtViewSet(BaseWriteViewSet):
    queryset = (
        GastoOperativoEnOt.objects.select_related("orden", "categoria")
        .all()
        .order_by("-fecha_creacion")
    )
    serializer_class = GastoOperativoEnOtSerializer

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
    """
    Prefacturas para facturación manual de OT(s).

    Endpoints:
    - GET /cierres-administrativos/ → Listar prefacturas
    - GET /cierres-administrativos/{id}/ → Detalle
    - POST /cierres-administrativos/ → Crear prefactura
    - PATCH /cierres-administrativos/{id}/ → Editar (solo estado=borrador)
    - POST /cierres-administrativos/{id}/finalizar/ → Cambiar a aprobado
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CierreAdministrativoOTSerializer
    http_method_names = ["get", "post", "patch", "head", "options", "delete"]

    def _prefactura_ots_incluidas(self, prefactura: CierreAdministrativoOT) -> list[int]:
        resultado = prefactura.resultado or {}
        items = resultado.get("ots_incluidas", [])
        return [ot_id for ot_id in items if isinstance(ot_id, int)]

    def _lock_cotizaciones_fecha_prefactura(self, prefactura: CierreAdministrativoOT):
        ots_incluidas = self._prefactura_ots_incluidas(prefactura)
        if not ots_incluidas:
            return

        fecha_prefactura = (
            prefactura.fecha_prefactura
            or (
                prefactura.fecha_creacion.date()
                if prefactura.fecha_creacion
                else timezone.localdate()
            )
        )

        cotizaciones = (
            Cotizacion.objects.filter(
                ordenes_trabajo_v2__id__in=set(ots_incluidas),
                fecha_facturacion_congelada=False,
            )
            .distinct()
        )
        if not cotizaciones.exists():
            return

        for cotizacion in cotizaciones:
            cotizacion.fecha_facturacion = fecha_prefactura
            cotizacion.fecha_facturacion_congelada = True
            cotizacion.fecha_tipo_cambio = fecha_prefactura

        Cotizacion.objects.bulk_update(
            cotizaciones,
            ["fecha_facturacion", "fecha_facturacion_congelada", "fecha_tipo_cambio"],
        )

        for cotizacion in cotizaciones:
            actualizar_tipo_cambio_cotizacion.delay(cotizacion.id)

    def get_queryset(self):
        qs = CierreAdministrativoOT.objects.select_related(
            "cliente", "creado_por", "actualizado_por"
        ).order_by("-fecha_creacion")
        # Filtrar por cliente si viene en query param
        cliente_id = self.request.query_params.get("cliente")
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        # Filtrar por estado si viene en query param
        estado = self.request.query_params.get("estado")
        if estado:
            qs = qs.filter(estado_cierre=estado)
        return qs

    def perform_create(self, serializer):
        """Crear prefactura con auditoría automática y actualizar estado de OTs."""
        usuario_empresa = obtener_usuario_empresa(self.request.user)
        fecha_prefactura = self.request.data.get("fecha_prefactura")
        prefactura = serializer.save(
            creado_por=usuario_empresa,
            fecha_prefactura=fecha_prefactura or timezone.localdate(),
        )
        
        # Actualizar estado de las OTs incluidas a "facturada" (En proceso Factura)
        resultado = prefactura.resultado or {}
        ots_incluidas = resultado.get("ots_incluidas", [])
        
        if ots_incluidas:
            OrdenDeTrabajo.objects.filter(id__in=ots_incluidas).update(estado="facturada")

        self._lock_cotizaciones_fecha_prefactura(prefactura)

    def perform_update(self, serializer):
        """Actualizar prefactura (solo borrador) con auditoría automática."""
        # Validar que esté en estado borrador
        instancia = self.get_object()
        if instancia.estado_cierre != "borrador":
            raise serializers.ValidationError(
                f"Solo se pueden editar prefacturas en estado 'borrador'. Estado actual: {instancia.get_estado_cierre_display()}"
            )
        usuario_empresa = obtener_usuario_empresa(self.request.user)
        serializer.save(actualizado_por=usuario_empresa)

    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, pk=None):
        """Cambiar prefactura de borrador a aprobado (confirmar para facturación)."""
        prefactura = self.get_object()

        # Validar estado
        if prefactura.estado_cierre != "borrador":
            return Response(
                {
                    "detail": f"Prefactura debe estar en estado 'borrador' para finalizar. Estado actual: {prefactura.get_estado_cierre_display()}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validar que tenga items para facturar
        items_json = prefactura.resultado or {}
        items = items_json.get("items", [])
        if not items:
            return Response(
                {"detail": "Prefactura debe tener al menos un item para finalizar"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        facturables = [it for it in items if it.get("facturar")]
        if not facturables:
            return Response(
                {
                    "detail": "Prefactura debe tener al menos un item marcado como 'facturar=true'"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cambiar estado
        usuario_empresa = obtener_usuario_empresa(request.user)
        prefactura.estado_cierre = "aprobado"
        prefactura.actualizado_por = usuario_empresa
        prefactura.save()

        self._lock_cotizaciones_fecha_prefactura(prefactura)

        serializer = self.get_serializer(prefactura)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="anular")
    def anular(self, request, pk=None):
        """Marcar la prefactura como anulada (no eliminar) para permitir volver a facturar las OTs."""
        prefactura = self.get_object()

        if prefactura.estado_cierre == "anulado":
            return Response({"detail": "Prefactura ya está anulada."}, status=status.HTTP_400_BAD_REQUEST)

        usuario_empresa = obtener_usuario_empresa(request.user)
        prefactura.estado_cierre = "anulado"
        prefactura.actualizado_por = usuario_empresa
        prefactura.save(update_fields=["estado_cierre", "actualizado_por", "fecha_modificacion"]) if hasattr(prefactura, 'fecha_modificacion') else prefactura.save()

        ots_incluidas = self._prefactura_ots_incluidas(prefactura)
        if ots_incluidas:
            OrdenDeTrabajo.objects.filter(id__in=ots_incluidas).update(estado="completada")

        serializer = self.get_serializer(prefactura)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        prefactura = self.get_object()

        if prefactura.estado_cierre != "anulado":
            return Response(
                {
                    "detail": "Solo se pueden eliminar prefacturas ya anuladas."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        ots_incluidas = self._prefactura_ots_incluidas(prefactura)
        if ots_incluidas:
            OrdenDeTrabajo.objects.filter(id__in=ots_incluidas).update(estado="completada")

        prefactura.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(
        detail=True,
        methods=["post"],
        url_path="asociar-documento",
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def asociar_documento(self, request, pk=None):
        """Asociar o reemplazar un documento de factura a la prefactura."""
        prefactura = self.get_object()

        if "documento" not in request.FILES:
            return Response(
                {"detail": "Debe enviar un archivo llamado 'documento'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        archivo = request.FILES["documento"]

        extensiones_permitidas = [
            "pdf",
            "doc",
            "docx",
            "xls",
            "xlsx",
            "txt",
            "jpg",
            "jpeg",
            "png",
        ]
        ext = archivo.name.split(".")[-1].lower() if "." in archivo.name else ""
        if ext not in extensiones_permitidas:
            return Response(
                {
                    "detail": (
                        f"Extensión '{ext}' no permitida. Extensiones permitidas: "
                        f"{', '.join(extensiones_permitidas)}"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_size = 10 * 1024 * 1024
        if archivo.size > max_size:
            return Response(
                {"detail": "El archivo excede el tamaño máximo de 10MB"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if prefactura.documento_factura:
            prefactura.documento_factura.delete()

        usuario_empresa = obtener_usuario_empresa(request.user)
        prefactura.documento_factura = archivo
        prefactura.actualizado_por = usuario_empresa
        prefactura.save(
            update_fields=["documento_factura", "actualizado_por", "fecha_modificacion"]
        )

        serializer = self.get_serializer(prefactura)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="facturar")
    def facturar(self, request, pk=None):
        """
        Cambiar prefactura a estado 'facturado' cuando tiene documento asociado.
        Valida que la prefactura esté en estado 'aprobado' y tenga un documento.
        """
        prefactura = self.get_object()

        if prefactura.estado_cierre != "aprobado":
            return Response(
                {
                    "detail": (
                        "Prefactura debe estar en estado 'aprobado' para facturar. "
                        f"Estado actual: {prefactura.get_estado_cierre_display()}"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not prefactura.documento_factura:
            return Response(
                {
                    "detail": (
                        "Debe asociar un documento de factura antes de confirmar la facturación"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario_empresa = obtener_usuario_empresa(request.user)
        prefactura.estado_cierre = "facturado"
        prefactura.actualizado_por = usuario_empresa
        prefactura.save(
            update_fields=["estado_cierre", "actualizado_por", "fecha_modificacion"]
        )

        serializer = self.get_serializer(prefactura)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="comparativa")
    def comparativa_ots_contrato(self, request):
        """
        Obtener comparativa entre OTs seleccionadas y un contrato.

        POST body:
        {
            "ots_ids": [1, 2, 3],
            "contrato_id": 5
        }

        Response:
        {
            "pactado": {...},
            "ejecutado": {...},
            "diferencia": 500.0
        }
        """
        from contratos.models import ContratoEmpresaCliente

        ots_ids = request.data.get("ots_ids", [])
        contrato_id = request.data.get("contrato_id")
        fecha_prefactura = request.data.get("fecha_prefactura")

        if not ots_ids and not contrato_id:
            return Response(
                {
                    "detail": "Debes proporcionar al menos una OT (ots_ids) o un contrato (contrato_id)"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        pactado = None
        ejecutado = None
        diferencia = None

        if contrato_id:
            try:
                contrato = ContratoEmpresaCliente.objects.get(id=contrato_id)
                pactado = calcular_pactado_del_contrato(contrato)
            except ContratoEmpresaCliente.DoesNotExist:
                return Response(
                    {"detail": "Contrato no encontrado"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        if ots_ids:
            ejecutado = calcular_ejecutado_de_ots_seleccionadas(
                ots_ids, fecha_prefactura=fecha_prefactura
            )

            # Solo calcular diferencia si tenemos ambos valores
            if pactado is not None and ejecutado is not None:
                diferencia = pactado["total"] - ejecutado["total"]

        return Response(
            {
                "pactado": pactado,
                "ejecutado": ejecutado,
                "diferencia": diferencia,
            },
            status=status.HTTP_200_OK,
        )


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

        # Asignar usuario actual si no se envió
        if not serializer.validated_data.get("usuario"):
            try:
                usuario_empresa = obtener_usuario_empresa(self.request.user)
                if usuario_empresa:
                    data["usuario"] = usuario_empresa
            except Exception:
                pass

        serializer.save(**data)


class InsumoViewSet(viewsets.ViewSet):
    """
    ViewSet para manejar insumos (guías directas, servicios, soportes).
    Solo implementa la acción de desasociar guía.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_orden_trabajo(self):
        """Obtiene la orden de trabajo desde los kwargs de la URL"""
        orden_trabajo_pk = self.kwargs.get('orden_trabajo_pk')
        if not orden_trabajo_pk:
            return None
        return get_object_or_404(OrdenDeTrabajo, pk=orden_trabajo_pk)

    @action(detail=True, methods=["post"], url_path="desasociar-guia")
    def desasociar_guia(self, request, pk=None, orden_trabajo_pk=None):
        """
        Desvincula una guía directa de la OT.
        Si el insumo es tipo 'guia_directa', el pk es el id de la guía.
        """
        orden = self.get_orden_trabajo()
        if not orden:
            return Response(
                {"detail": "Orden de trabajo no encontrada"},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            # El pk es el id del insumo. Si es guía directa, es el id de la guía
            guia = GuiaSalida.objects.get(
                id=pk,
                orden_trabajo=orden,
                soporte_tecnico__isnull=True,
                servicio_ot__isnull=True
            )
        except GuiaSalida.DoesNotExist:
            return Response(
                {"detail": "No se encontró la guía directa asociada a esta OT"},
                status=status.HTTP_404_NOT_FOUND
            )

        cotizaciones_ids = list(
            ItemsGuiaSalida.objects.filter(
                guia=guia,
                source_item__orden_compra__relacion_cotizacion__isnull=False,
            )
            .values_list(
                "source_item__orden_compra__relacion_cotizacion_id",
                flat=True,
            )
            .distinct()
        )

        # Desvincular la guía de la OT
        guia.orden_trabajo = None
        guia.save(update_fields=["orden_trabajo"])

        if cotizaciones_ids:
            for cot_id in cotizaciones_ids:
                if not GuiaSalida.objects.filter(
                    orden_trabajo=orden,
                    itemsguiasalida__source_item__orden_compra__relacion_cotizacion_id=cot_id,
                ).exists():
                    orden.cotizaciones.remove(cot_id)

        return Response(
            {"detail": "Guía desvinculada correctamente"},
            status=status.HTTP_200_OK
        )
