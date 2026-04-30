import io

from bodegas.models import Compra
from core.models import PersonalizacionUsuario
from cuentas.functions import obtener_usuario_empresa
from django.contrib.contenttypes.models import ContentType
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from empresas.models import UsuarioEmpresa

# from ordentrabajo.models import DetalleGastoRendicionOT  # TEMPORAL - V1 desactivada
# from ordentrabajo.serializers import DetalleGastoRendicionOTSerializer  # TEMPORAL - V1 desactivada
from ordentrabajov2.models import GastoOperativoEnOt  # V2
from ordentrabajov2.serializers import GastoOperativoEnOtSerializer  # V2
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .functions import generar_rendicion_pdf
from .models import (
    CategoriaGastoRendicion,
    DetalleGastoRendicion,
    ItemRendicion,
    Rendicion,
)
from .serializers import (
    CategoriaGastoRendicionSerializer,
    CompraRendicionSerializer,
    DetalleGastoRendicionSerializer,
    ItemRendicionSerializer,
    RendicionSerializer,
)


class CategoriaGastoRendicionViewSet(viewsets.ModelViewSet):
    queryset = CategoriaGastoRendicion.objects.all()
    serializer_class = CategoriaGastoRendicionSerializer


class DetalleGastoRendicionViewSet(viewsets.ModelViewSet):
    queryset = DetalleGastoRendicion.objects.all()
    serializer_class = DetalleGastoRendicionSerializer


class RendicionViewSet(viewsets.ModelViewSet):
    queryset = Rendicion.objects.all()
    serializer_class = RendicionSerializer

    def perform_create(self, serializer):
        """
        BLOQUE 6: Auto-herencia de política de viáticos desde el cliente.

        Si la rendición tiene un cliente asociado y NO se especificó una política
        explícita, heredamos la política por defecto del cliente.
        """
        cliente = serializer.validated_data.get("cliente")

        rendicion = serializer.save()

        # Hook FCM N5: rendición pendiente de aprobación (silencioso)
        try:
            from notificaciones.services import notificar_rendicion_pendiente_aprobacion
            notificar_rendicion_pendiente_aprobacion(
                rendicion, usuario_actor=self.request.user
            )
        except Exception:
            import logging
            logging.getLogger(__name__).exception(
                "Hook FCM N5 (rendicion pendiente) fallo (silencioso)."
            )

    @action(detail=False, methods=["get"], url_path="mis-rendiciones")
    def mis_rendiciones(self, request):
        usuario = request.user
        try:
            usuario_empresa = UsuarioEmpresa.objects.get(usuario=usuario)
        except UsuarioEmpresa.DoesNotExist:
            return Response({"detail": "UsuarioEmpresa no encontrado."}, status=404)

        rendiciones = self.queryset.filter(usuario=usuario_empresa)
        serializer = self.get_serializer(rendiciones, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="rendiciones-sucursal")
    def rendiciones_sucursal(self, request):
        usuario = request.user
        try:
            personalizacion = PersonalizacionUsuario.objects.get(usuario=usuario)
            sucursal = personalizacion.sucursal_principal
            if not sucursal:
                return Response(
                    {"detail": "Sucursal principal no seleccionada."}, status=400
                )
        except PersonalizacionUsuario.DoesNotExist:
            return Response(
                {"detail": "Personalización del usuario no encontrada."}, status=404
            )

        rendiciones = self.queryset.filter(usuario__sucursal=sucursal)
        serializer = self.get_serializer(rendiciones, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="descargar-pdf")
    def descargar_pdf(self, request, pk=None):
        """
        Genera y devuelve el PDF de la rendición solicitada.
        """
        # Obtenemos la rendición a través del detalle
        rendicion = self.get_object()
        try:
            usuario_empresa = UsuarioEmpresa.objects.get(usuario=request.user)
        except UsuarioEmpresa.DoesNotExist:
            return Response({"detail": "UsuarioEmpresa no encontrado."}, status=404)

        # Creamos un buffer para almacenar el PDF
        buffer = io.BytesIO()

        # Preparar datos de la tabla combinando todos los items (OT, gastos libres, compras)
        header = [
            "Categoría",
            "Detalle",
            "Cantidad",
            "Monto Unitario",
            "Monto Total",
            "Fecha Gasto",
        ]
        datos_tabla = [header]

        # Prefetch mínimo para evitar consultas adicionales por content_type
        items_rendicion = rendicion.items.select_related("content_type").all()

        for item in items_rendicion:
            detalle = item.detalle

            # Si hay referencias rotas, lo omitimos
            if detalle is None:
                continue

            categoria = ""
            texto_detalle = ""
            cantidad = ""
            monto_unitario = ""
            monto_total = ""
            fecha_gasto = ""

            # Gasto libre (rendiciones.DetalleGastoRendicion)
            if (
                item.content_type.app_label == "rendiciones"
                and item.content_type.model == "detallegastorendicion"
            ):
                categoria = (
                    str(detalle.categoria.nombre)
                    if getattr(detalle, "categoria", None)
                    else ""
                )
                texto_detalle = detalle.detalle or ""
                cantidad = str(detalle.cantidad)
                monto_unitario = f"${detalle.monto_unitario:.2f}"
                monto_total = f"${detalle.monto_total:.2f}"
                fecha_gasto = (
                    detalle.fecha_gasto.strftime("%d-%m-%Y")
                    if detalle.fecha_gasto
                    else ""
                )

            # Gasto de OT (ordentrabajov2.GastoOperativoEnOt)
            elif (
                item.content_type.app_label == "ordentrabajov2"
                and item.content_type.model == "gastooperativoenot"
            ):
                categoria = (
                    str(detalle.categoria.nombre)
                    if getattr(detalle, "categoria", None)
                    else ""
                )
                texto_detalle = detalle.detalle or ""
                cantidad = str(detalle.cantidad)
                monto_unitario = f"${detalle.monto_unitario:.2f}"
                monto_total = (
                    f"${detalle.monto_total:.2f}"
                    if detalle.monto_total is not None
                    else ""
                )
                fecha_gasto = (
                    detalle.fecha_compra.strftime("%d-%m-%Y")
                    if getattr(detalle, "fecha_compra", None)
                    else ""
                )

            # Compra (bodegas.Compra)
            elif (
                item.content_type.app_label == "bodegas"
                and item.content_type.model == "compra"
            ):
                categoria = "Compra"
                texto_detalle = f"Compra {getattr(detalle, 'codigo', '')}".strip()
                cantidad = f"{detalle.itemencompra_set.count()} items"
                monto_unitario = "-"
                monto_total = (
                    f"${detalle.total_compra:.2f}"
                    if hasattr(detalle, "total_compra")
                    else ""
                )
                fecha_gasto = (
                    detalle.fecha_compra.strftime("%d-%m-%Y")
                    if getattr(detalle, "fecha_compra", None)
                    else ""
                )

            else:
                # Tipo no reconocido, omitimos
                continue

            datos_tabla.append(
                [
                    categoria,
                    texto_detalle,
                    cantidad,
                    monto_unitario,
                    monto_total,
                    fecha_gasto,
                ]
            )

        # Datos de la empresa (puedes extraerlos de otro modelo o configuración)
        nombre_empresa = usuario_empresa.sucursal.empresa.nombre
        rut_empresa = usuario_empresa.sucursal.empresa.rut_empresa
        direccion_empresa = usuario_empresa.sucursal.empresa.direccion_principal
        telefono_empresa = usuario_empresa.sucursal.empresa.telefono
        email_empresa = usuario_empresa.sucursal.empresa.email
        sitio_web_empresa = usuario_empresa.sucursal.empresa.sitio_web

        # Fecha de la rendición e ID (u otro identificador)
        fecha_rendicion = (
            rendicion.fecha_rendicion.strftime("%d-%m-%Y")
            if rendicion.fecha_rendicion
            else ""
        )
        id_rendicion = str(rendicion.id)

        # Llamamos a la función que genera el PDF
        generar_rendicion_pdf(
            nombre_empresa,
            rut_empresa,
            direccion_empresa,
            telefono_empresa,
            email_empresa,
            sitio_web_empresa,
            fecha_rendicion,
            id_rendicion,
            usuario_empresa,
            rendicion,
            datos_tabla,
            buffer,
        )

        buffer.seek(0)
        response = HttpResponse(buffer, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="rendicion_{id_rendicion}.pdf"'
        )
        return response

    @action(detail=False, methods=["get"], url_path="detalles-ot-libres")
    def detalles_ot_libres(self, request):
        """
        Listado de GastoOperativoEnOt (V2) que aún no han sido rendidos
        (es decir, no existen en ningún ItemRendicion).
        """
        # obtengo el ContentType para GastoOperativoEnOt
        ct_ot = ContentType.objects.get_for_model(GastoOperativoEnOt)
        # IDs de GastoOperativoEnOt ya usados en algún ItemRendicion
        usados = ItemRendicion.objects.filter(content_type=ct_ot).values_list(
            "detalle_id", flat=True
        )
        # filtro los que NO estén en esa lista
        libres = GastoOperativoEnOt.objects.exclude(pk__in=usados)

        serializer = GastoOperativoEnOtSerializer(libres, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="compras-libres")
    def compras_libres(self, request):
        """
        Lista las Compras (bodegas.Compra) con estado='1'
        que NO están referenciadas en ningún ItemRendicion.
        """
        # 1. Obtén el ContentType para Compra
        ct_compra = ContentType.objects.get(app_label="bodegas", model="compra")
        user = obtener_usuario_empresa(request.user)

        # 2. Averigua qué IDs de Compra ya están en ItemRendicion
        usados = ItemRendicion.objects.filter(content_type=ct_compra).values_list(
            "detalle_id", flat=True
        )

        # 3. Filtra las Compras con estado='1' y excluye las ya usadas
        compras_disponibles = Compra.objects.filter(
            estado="1", sucursal=user.sucursal
        ).exclude(pk__in=usados)

        serializer = CompraRendicionSerializer(compras_disponibles, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="metricas-dashboard")
    def metricas_dashboard(self, request):
        """
        Endpoint para métricas del dashboard de rendiciones.
        Retorna conteo por estado, montos y usuarios con más rendiciones.
        
        NOTA: Las métricas son del sistema completo (empresa), NO por usuario.
        
        Query params:
        - fecha_inicio: Fecha inicio del período (default: primer día del mes actual)
        - fecha_fin: Fecha fin del período (default: hoy)
        """
        from django.db.models import Count, Sum
        from django.db.models.functions import TruncDate
        from datetime import date, timedelta
        
        # Obtener empresa del usuario
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
        
        # Queryset base filtrado por empresa (a través de usuario.sucursal.empresa)
        qs_base = Rendicion.objects.filter(
            usuario__sucursal__empresa_id=empresa_id,
            fecha_rendicion__gte=fecha_inicio,
            fecha_rendicion__lte=fecha_fin
        )
        
        # Queryset para rendiciones activas (sin filtro de fecha)
        qs_activas = Rendicion.objects.filter(usuario__sucursal__empresa_id=empresa_id)
        
        # 1. Conteo por estado
        conteo_estados = dict(qs_activas.values_list("estado").annotate(count=Count("id")))
        estados_resultado = {
            "borrador": conteo_estados.get("0", 0),
            "pendiente_aprobacion": conteo_estados.get("1", 0),
            "aprobada": conteo_estados.get("2", 0),
            "rechazada": conteo_estados.get("3", 0),
            "pagada": conteo_estados.get("4", 0),
        }
        
        # 2. Calcular montos totales (usando la propiedad total_reembolso_tecnico)
        # Nota: Como es una propiedad calculada, necesitamos iterar
        monto_pendiente_aprobacion = 0
        monto_pendiente_pago = 0
        
        rendiciones_pendientes_aprobacion = qs_activas.filter(estado="1")
        for r in rendiciones_pendientes_aprobacion:
            monto_pendiente_aprobacion += r.total_reembolso_tecnico
        
        rendiciones_aprobadas = qs_activas.filter(estado="2")
        for r in rendiciones_aprobadas:
            monto_pendiente_pago += r.total_reembolso_tecnico
        
        # 3. Rendiciones rechazadas sin atender
        rechazadas = estados_resultado["rechazada"]
        
        # 4. Top 5 usuarios con más rendiciones (en el período)
        top_usuarios = list(
            qs_base.values(
                "usuario__id",
                "usuario__usuario__first_name",
                "usuario__usuario__last_name"
            )
            .annotate(total=Count("id"))
            .order_by("-total")[:5]
        )
        usuarios_resultado = [
            {
                "id": u["usuario__id"],
                "nombre": f"{u['usuario__usuario__first_name']} {u['usuario__usuario__last_name']}".strip() or "Sin nombre",
                "total": u["total"]
            }
            for u in top_usuarios
        ]
        
        # 5. Top 5 clientes con más rendiciones (en el período)
        top_clientes = list(
            qs_base.filter(cliente__isnull=False)
            .values("cliente__id", "cliente__nombre")
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
        
        # 6. Tendencia últimos 30 días
        fecha_30_dias = hoy - timedelta(days=30)
        
        # Para compatibilidad con SQLite, usar date() en lugar de TruncDate
        from django.db.models.functions import Cast
        from django.db import models as db_models
        
        try:
            # Intentar con TruncDate (funciona en PostgreSQL)
            tendencia = list(
                Rendicion.objects.filter(
                    usuario__sucursal__empresa_id=empresa_id,
                    fecha_rendicion__gte=fecha_30_dias,
                    fecha_rendicion__isnull=False
                )
                .annotate(fecha=TruncDate("fecha_rendicion"))
                .values("fecha")
                .annotate(total=Count("id"))
                .order_by("fecha")
            )
            tendencia_resultado = [
                {"fecha": t["fecha"].isoformat(), "total": t["total"]}
                for t in tendencia
            ]
        except Exception:
            # Fallback para SQLite: agrupar por fecha manualmente
            rendiciones_30_dias = Rendicion.objects.filter(
                usuario__sucursal__empresa_id=empresa_id,
                fecha_rendicion__gte=fecha_30_dias,
                fecha_rendicion__isnull=False
            ).values_list('fecha_rendicion', flat=True)
            
            from collections import defaultdict
            tendencia_dict = defaultdict(int)
            for fecha_rendicion in rendiciones_30_dias:
                if fecha_rendicion:
                    fecha_str = fecha_rendicion.date().isoformat() if hasattr(fecha_rendicion, 'date') else fecha_rendicion.isoformat()
                    tendencia_dict[fecha_str] += 1
            
            tendencia_resultado = [
                {"fecha": fecha, "total": total}
                for fecha, total in sorted(tendencia_dict.items())
            ]
        
        
        return Response({
            "periodo": {
                "fecha_inicio": fecha_inicio.isoformat(),
                "fecha_fin": fecha_fin.isoformat(),
            },
            "resumen": {
                "total_periodo": qs_base.count(),
                "pendientes_aprobacion": estados_resultado["pendiente_aprobacion"],
                "monto_pendiente_aprobacion": float(monto_pendiente_aprobacion),
                "monto_pendiente_pago": float(monto_pendiente_pago),
                "rechazadas": rechazadas,
            },
            "por_estado": estados_resultado,
            "top_usuarios": usuarios_resultado,
            "top_clientes": clientes_resultado,
            "tendencia_30_dias": tendencia_resultado,
        })

    @action(detail=True, methods=["post"], url_path="rechazar")
    def rechazar(self, request, pk=None):
        """
        Rechaza una rendición (estado 1 -> 3).
        
        Requiere:
        - motivo_rechazo (string, mínimo 10 caracteres)
        
        Validaciones:
        - La rendición debe estar en estado 1 (pendiente de aprobación)
        - El motivo debe tener al menos 10 caracteres
        """
        rendicion = self.get_object()
        
        # Validar estado actual
        if rendicion.estado != "1":
            return Response(
                {"detail": f"La rendición debe estar en estado 'pendiente de aprobación' (1). Estado actual: {rendicion.estado}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener y validar motivo
        motivo = request.data.get("motivo_rechazo", "").strip()
        if not motivo:
            return Response(
                {"detail": "El campo 'motivo_rechazo' es obligatorio"},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(motivo) < 10:
            return Response(
                {"detail": "El motivo debe tener al menos 10 caracteres"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Actualizar rendición
        from django.utils import timezone
        rendicion.estado = "3"  # Rechazada
        rendicion.motivo_rechazo = motivo
        rendicion.revisado_por = request.user
        rendicion.fecha_revision = timezone.now()
        rendicion.save()

        # Actualizar estado de compras asociadas a la rendición
        self._actualizar_estado_compras(rendicion, "C")
        
        # Hook FCM N6: rendición rechazada (silencioso)
        try:
            from notificaciones.services import notificar_rendicion_actualizada
            notificar_rendicion_actualizada(
                rendicion, accion="rechazada", usuario_actor=request.user
            )
        except Exception:
            import logging
            logging.getLogger(__name__).exception(
                "Hook FCM N6 (rendicion rechazada) fallo (silencioso)."
            )
        
        serializer = self.get_serializer(rendicion)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="aprobar")
    def aprobar(self, request, pk=None):
        """
        Aprueba una rendición (estado 1 -> 2).
        
        Validaciones:
        - La rendición debe estar en estado 1 (pendiente de aprobación)
        """
        rendicion = self.get_object()
        
        # Validar estado actual
        if rendicion.estado != "1":
            return Response(
                {"detail": f"La rendición debe estar en estado 'pendiente de aprobación' (1). Estado actual: {rendicion.estado}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Actualizar rendición
        from django.utils import timezone
        rendicion.estado = "2"  # Aprobada
        rendicion.revisado_por = request.user
        rendicion.fecha_revision = timezone.now()
        rendicion.save()

        # Actualizar estado de compras asociadas a la rendición
        self._actualizar_estado_compras(rendicion, "R")
        
        # Hook FCM N6: rendición aprobada (silencioso)
        try:
            from notificaciones.services import notificar_rendicion_actualizada
            notificar_rendicion_actualizada(
                rendicion, accion="aprobada", usuario_actor=request.user
            )
        except Exception:
            import logging
            logging.getLogger(__name__).exception(
                "Hook FCM N6 (rendicion aprobada) fallo (silencioso)."
            )
        
        serializer = self.get_serializer(rendicion)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @staticmethod
    def _actualizar_estado_compras(rendicion: Rendicion, nuevo_estado: str) -> None:
        """
        Actualiza el estado de las compras asociadas a la rendición.
        Solo afecta compras en estado 'P' (Pendiente de rendición).
        """
        ct_compra = ContentType.objects.get(app_label="bodegas", model="compra")
        compra_ids = (
            ItemRendicion.objects.filter(
                rendicion=rendicion, content_type=ct_compra
            )
            .values_list("detalle_id", flat=True)
            .distinct()
        )

        if compra_ids:
            Compra.objects.filter(id__in=compra_ids, estado="P").update(
                estado=nuevo_estado
            )

    @action(detail=True, methods=["post"], url_path="pagar")
    def pagar(self, request, pk=None):
        """
        Marca una rendición como pagada (estado 2 -> 4).
        
        Validaciones:
        - La rendición debe estar en estado 2 (aprobada)
        """
        rendicion = self.get_object()
        
        # Validar estado actual
        if rendicion.estado != "2":
            return Response(
                {"detail": f"La rendición debe estar en estado 'aprobada' (2). Estado actual: {rendicion.estado}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Actualizar rendición
        from django.utils import timezone
        rendicion.estado = "4"  # Pagada
        rendicion.revisado_por = request.user  # Registrar quién pagó
        rendicion.fecha_revision = timezone.now()  # Registrar cuándo se pagó
        rendicion.save()
        
        # Hook FCM N6: rendición pagada (silencioso)
        try:
            from notificaciones.services import notificar_rendicion_actualizada
            notificar_rendicion_actualizada(
                rendicion, accion="pagada", usuario_actor=request.user
            )
        except Exception:
            import logging
            logging.getLogger(__name__).exception(
                "Hook FCM N6 (rendicion pagada) fallo (silencioso)."
            )
        # TODO: Registrar el pago en el sistema de contabilidad si aplica
        
        serializer = self.get_serializer(rendicion)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ItemRendicionViewSet(viewsets.ModelViewSet):
    queryset = ItemRendicion.objects.all()
    serializer_class = ItemRendicionSerializer

    def get_queryset(self):
        rendicion_id = self.kwargs.get("rendicion_pk")
        if rendicion_id:
            return ItemRendicion.objects.filter(rendicion_id=rendicion_id)
        return ItemRendicion.objects.all()

    @action(detail=False, methods=["post"], url_path="crear-item")
    def create_item(self, request, rendicion_pk=None):
        rendicion = get_object_or_404(Rendicion, pk=rendicion_pk)
        ct_id = request.data.get("content_type")

        if ct_id:
            ct = get_object_or_404(ContentType, pk=ct_id)
            # Compra: buscamos por 'codigo' en lugar de por ID
            if ct.app_label == "bodegas" and ct.model == "compra":
                codigo = request.data.get("detalle_id")
                if not codigo:
                    return Response(
                        {"detail": "Debe enviar el campo 'codigo' para una Compra."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                compra = get_object_or_404(Compra, codigo=codigo)
                item = ItemRendicion.objects.create(
                    rendicion=rendicion, content_type=ct, detalle_id=compra.pk
                )
                return Response(
                    ItemRendicionSerializer(item).data, status=status.HTTP_201_CREATED
                )

            # Gastos OT V2 o internos: uso directo de detalle_id
            if (ct.app_label, ct.model) in {
                ("ordentrabajov2", "gastooperativoenot"),  # V2
                ("rendiciones", "detallegastorendicion"),
            }:
                detalle_id = request.data.get("detalle_id")
                if not detalle_id:
                    return Response(
                        {"detail": "Debe enviar 'detalle_id' para este tipo de item."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                item = ItemRendicion.objects.create(
                    rendicion=rendicion, content_type=ct, detalle_id=detalle_id
                )
                return Response(
                    ItemRendicionSerializer(item).data, status=status.HTTP_201_CREATED
                )

            return Response(
                {"detail": "ContentType no válido para ItemRendicion."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Caso B: creación de DetalleGastoRendicion
        det_data = {
            "categoria": request.data.get("categoria"),
            "detalle": request.data.get("detalle"),
            "cantidad": request.data.get("cantidad"),
            "monto_unitario": request.data.get("monto_unitario"),
            "fecha_gasto": request.data.get("fecha_gasto"),
        }
        det_ser = DetalleGastoRendicionSerializer(data=det_data)
        det_ser.is_valid(raise_exception=True)
        nuevo = det_ser.save()

        ct_det = ContentType.objects.get_for_model(DetalleGastoRendicion)
        item = ItemRendicion.objects.create(
            rendicion=rendicion, content_type=ct_det, detalle_id=nuevo.pk
        )
        return Response(
            ItemRendicionSerializer(item).data, status=status.HTTP_201_CREATED
        )
