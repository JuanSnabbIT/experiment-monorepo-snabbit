"""
Vistas publicas para responder retroalimentacion de OT V3 via email.

Convencion:
- Endpoints publicos viven bajo /api/public/*
- No requieren autenticacion. El acceso se controla mediante token (UUID) en URL.

ENDPOINTS:
- GET  /api/public/retroalimentacion-otv3/{token}/
- POST /api/public/retroalimentacion-otv3/{token}/responder/
"""

from __future__ import annotations

from typing import Any

from django.db.models import F
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ordentrabajov3.estados_modelo import (
    ESTADO_POR_FACTURAR,
    ESTADO_RETROALIMENTACION,
)
from ordentrabajov3.models import HistorialEstadoOTV3

from .models import LogDeAccesoRetroalimentacion, Retroalimentacion, RetroalimentacionAplicada
from .serializers import RetroalimentacionAplicadaSerializer, RetroalimentacionPublicaSerializer


def get_client_ip(request) -> str | None:
    """Obtiene la IP real del cliente, considerando proxies."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _build_expired_response(retro: Retroalimentacion) -> Response:
    return Response(
        {
            "detail": "Esta encuesta ha vencido y ya no puede ser respondida.",
            "fecha_vencimiento": retro.fecha_vencimiento,
        },
        status=status.HTTP_410_GONE,
    )


def _get_retro_otv3_publica(token) -> tuple[Retroalimentacion | None, Response | None]:
    queryset = (
        Retroalimentacion.objects.select_related(
            "orden_trabajo_v3__empresa",
            "orden_trabajo_v3__tecnico_responsable",
            "usuario_empresa__usuario",
        )
        .prefetch_related("retroalimentacion_aplicada__pregunta")
        .filter(orden_trabajo_v3__isnull=False)
    )
    try:
        retro = queryset.get(uuid=token)
    except Retroalimentacion.DoesNotExist:
        return None, Response(
            {"detail": "Token no valido o encuesta no encontrada."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if (
        retro.fecha_retroalimentacion is None
        and retro.fecha_vencimiento
        and timezone.now() > retro.fecha_vencimiento
    ):
        return None, _build_expired_response(retro)

    return retro, None


class PublicRetroalimentacionOTV3DetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        retro, error_response = _get_retro_otv3_publica(token)
        if error_response:
            return error_response

        if retro.fecha_retroalimentacion is None and retro.orden_trabajo_v3.estado != ESTADO_RETROALIMENTACION:
            return Response(
                {
                    "detail": "La OT no esta disponible para retroalimentacion.",
                    "estado_actual": retro.orden_trabajo_v3.estado,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Incrementar visitas + log de acceso
        Retroalimentacion.objects.filter(pk=retro.pk).update(
            cantidad_visitas=F("cantidad_visitas") + 1
        )
        retro.refresh_from_db(fields=["cantidad_visitas"])
        LogDeAccesoRetroalimentacion.objects.create(
            retroalimentacion=retro,
            ip=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        return Response(RetroalimentacionPublicaSerializer(retro).data)


class PublicRetroalimentacionOTV3ResponderView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token):
        retro, error_response = _get_retro_otv3_publica(token)
        if error_response:
            return error_response

        if retro.fecha_retroalimentacion:
            return Response(
                {"detail": "Esta encuesta ya fue respondida. Gracias por su retroalimentacion."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if retro.fecha_vencimiento and timezone.now() > retro.fecha_vencimiento:
            return _build_expired_response(retro)

        if retro.orden_trabajo_v3.estado != ESTADO_RETROALIMENTACION:
            return Response(
                {
                    "detail": "La OT no esta disponible para retroalimentacion.",
                    "estado_actual": retro.orden_trabajo_v3.estado,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload: Any = request.data
        items = payload.get("items", []) if isinstance(payload, dict) else []
        if not isinstance(items, list) or len(items) == 0:
            return Response(
                {"detail": "Se requiere un arreglo 'items' con al menos un elemento."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ids_validos = set(
            retro.retroalimentacion_aplicada.values_list("id", flat=True)
        )
        errores: list[dict[str, Any]] = []
        resultados: list[dict[str, Any]] = []

        for entry in items:
            pk = entry.get("id") if isinstance(entry, dict) else None
            if pk is None:
                errores.append({"id": None, "errors": {"id": ["Campo obligatorio."]}})
                continue

            if pk not in ids_validos:
                errores.append(
                    {
                        "id": pk,
                        "errors": {"id": [f"El item {pk} no pertenece a esta encuesta."]},
                    }
                )
                continue

            try:
                instancia = RetroalimentacionAplicada.objects.get(pk=pk)
            except RetroalimentacionAplicada.DoesNotExist:
                errores.append({"id": pk, "errors": {"id": ["Item no encontrado."]}})
                continue

            serializer = RetroalimentacionAplicadaSerializer(
                instance=instancia, data=entry, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                resultados.append(serializer.data)
            else:
                errores.append({"id": pk, "errors": serializer.errors})

        if errores:
            return Response(
                {"detail": "Payload invalido.", "errors": errores},
                status=status.HTTP_400_BAD_REQUEST,
            )

        retro.fecha_retroalimentacion = timezone.now()
        retro.save(update_fields=["fecha_retroalimentacion"])

        otv3 = retro.orden_trabajo_v3
        if otv3.estado == ESTADO_RETROALIMENTACION:
            otv3.estado = ESTADO_POR_FACTURAR
            otv3.save(update_fields=["estado"])
            # El signal crea el historial automaticamente; actualizamos el comentario.
            ultimo = HistorialEstadoOTV3.objects.filter(
                orden=otv3,
                estado_nuevo=ESTADO_POR_FACTURAR,
            ).order_by("-fecha_creacion").first()
            if ultimo:
                ultimo.comentario = "Retroalimentacion completada por el cliente"
                ultimo.save(update_fields=["comentario"])

        return Response({"updated": resultados}, status=status.HTTP_200_OK)
