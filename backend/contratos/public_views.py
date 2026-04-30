import json

from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .flow_helpers import get_client_ip
from .flow_helpers import actualizar_pdf_firmado_envio
from .flow_helpers import construir_pdf_contrato
from .flow_helpers import construir_pdf_desde_payload
from .flow_helpers import validar_firma_imagen
from .models import EnvioContratoAprobacion, EnvioContratoFirmaUsuario
from .public_serializers import (
    ContratoAprobacionPublicSerializer,
    ContratoFirmaPublicSerializer,
    SeccionGeneradaPublicSerializer,
)

APROBACION_DEPRECADA_DETAIL = (
    "Este enlace fue invalidado porque el contrato volvio a borrador. Solicita un nuevo correo."
)


def _destinatario_payload(vinculo):
    if not vinculo:
        return None
    return {
        "id": vinculo.id,
        "nombre": vinculo.nombre_display,
        "email": vinculo.correo_display,
        "es_externo": vinculo.es_externo,
    }


def _build_aprobacion_deprecada_response(envio):
    return Response(
        {
            "detail": APROBACION_DEPRECADA_DETAIL,
            "contrato_id": envio.contrato_id,
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


def _get_envio_aprobacion_publico(token, *, select_related_fields=None):
    queryset = EnvioContratoAprobacion.objects
    if select_related_fields:
        queryset = queryset.select_related(*select_related_fields)
    try:
        envio = queryset.get(uuid=token, enviado=True)
    except EnvioContratoAprobacion.DoesNotExist:
        return None, Response(
            {"detail": "Token no valido o aprobacion no encontrada."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if envio.deprecado:
        return None, _build_aprobacion_deprecada_response(envio)

    return envio, None


class PublicContratoAprobacionDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        envio, error_response = _get_envio_aprobacion_publico(
            token,
            select_related_fields=(
                "contrato",
                "destinatario",
                "destinatario__usuario__usuario",
            ),
        )
        if error_response:
            return error_response

        secciones_qs = envio.contrato.secciones_generadas.select_related(
            "seccion_plantilla"
        ).order_by("orden")
        secciones_data = SeccionGeneradaPublicSerializer(secciones_qs, many=True).data

        serializer = ContratoAprobacionPublicSerializer(
            {
                "uuid": envio.uuid,
                "puede_responder": not envio.respondido and envio.contrato.estado == "en_aprobacion_cliente",
                "ya_respondio": envio.respondido,
                "aprobado": envio.aprobado,
                "fecha_envio": envio.fecha_envio,
                "fecha_respuesta": envio.fecha_respuesta,
                "comentario_respuesta": envio.comentario_respuesta,
                "version_envio": envio.version_envio,
                "destinatario": _destinatario_payload(envio.destinatario),
                "contrato": envio.snapshot_contrato or {},
                "secciones_generadas": secciones_data,
            }
        )
        return Response(serializer.data)


class PublicContratoAprobacionPDFView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        envio, error_response = _get_envio_aprobacion_publico(
            token, select_related_fields=("contrato",)
        )
        if error_response:
            return error_response

        if envio.pdf_congelado:
            pdf_bytes = envio.pdf_congelado
        elif envio.snapshot_contrato:
            pdf_bytes = construir_pdf_desde_payload(envio.snapshot_contrato)
        else:
            pdf_bytes = construir_pdf_contrato(envio.contrato)

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="contrato_aprobacion_{envio.contrato_id}_v{envio.version_envio}.pdf"'
        )
        return response


class PublicAprobarContratoView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token):
        envio, error_response = _get_envio_aprobacion_publico(
            token,
            select_related_fields=("contrato",),
        )
        if error_response:
            return error_response

        if envio.respondido:
            return Response(
                {"detail": "Este enlace ya fue utilizado para responder."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if envio.contrato.estado != "en_aprobacion_cliente":
            return Response(
                {"detail": "El contrato no esta disponible para aprobacion.", "estado_actual": envio.contrato.estado},
                status=status.HTTP_400_BAD_REQUEST,
            )

        envio.respondido = True
        envio.aprobado = True
        envio.fecha_respuesta = timezone.now()
        envio.ip_respuesta = get_client_ip(request)
        envio.save(
            update_fields=[
                "respondido",
                "aprobado",
                "fecha_respuesta",
                "ip_respuesta",
            ]
        )

        envio.contrato.estado = "aprobado_cliente"
        envio.contrato.save(update_fields=["estado", "fecha_modificacion"])

        # Hook FCM N17: aprobacion del cliente (silencioso)
        try:
            from notificaciones.services import notificar_contrato_resolucion_cliente
            notificar_contrato_resolucion_cliente(
                envio.contrato, accion="aprobado"
            )
        except Exception:
            import logging
            logging.getLogger(__name__).exception(
                "Hook FCM N17 (contrato aprobado) fallo (silencioso)."
            )

        return Response(
            {"detail": "Contrato aprobado exitosamente.", "contrato_id": envio.contrato_id},
            status=status.HTTP_200_OK,
        )


class PublicRechazarContratoView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token):
        envio, error_response = _get_envio_aprobacion_publico(
            token,
            select_related_fields=("contrato",),
        )
        if error_response:
            return error_response

        if envio.respondido:
            return Response(
                {"detail": "Este enlace ya fue utilizado para responder."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if envio.contrato.estado != "en_aprobacion_cliente":
            return Response(
                {"detail": "El contrato no esta disponible para rechazo.", "estado_actual": envio.contrato.estado},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = request.data
        if not isinstance(payload, dict):
            try:
                payload = json.loads(request.body.decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                payload = {}

        comentario = (payload.get("comentario") or payload.get("motivo") or "").strip()
        if not comentario:
            return Response(
                {"detail": "Debe indicar el motivo o comentario del rechazo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        envio.respondido = True
        envio.aprobado = False
        envio.fecha_respuesta = timezone.now()
        envio.ip_respuesta = get_client_ip(request)
        envio.comentario_respuesta = comentario
        envio.save(
            update_fields=[
                "respondido",
                "aprobado",
                "fecha_respuesta",
                "ip_respuesta",
                "comentario_respuesta",
            ]
        )

        envio.contrato.estado = "cambios_solicitados"
        envio.contrato.save(update_fields=["estado", "fecha_modificacion"])

        # Hook FCM N17: rechazo con cambios solicitados (silencioso)
        try:
            from notificaciones.services import notificar_contrato_resolucion_cliente
            notificar_contrato_resolucion_cliente(
                envio.contrato, accion="con cambios solicitados"
            )
        except Exception:
            import logging
            logging.getLogger(__name__).exception(
                "Hook FCM N17 (contrato cambios) fallo (silencioso)."
            )

        return Response(
            {"detail": "Contrato rechazado. Se registraron los cambios solicitados."},
            status=status.HTTP_200_OK,
        )


class PublicRechazarDefinitivoContratoView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token):
        envio, error_response = _get_envio_aprobacion_publico(
            token,
            select_related_fields=("contrato",),
        )
        if error_response:
            return error_response

        if envio.respondido:
            return Response(
                {"detail": "Este enlace ya fue utilizado para responder."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if envio.contrato.estado != "en_aprobacion_cliente":
            return Response(
                {"detail": "El contrato no esta disponible para rechazo.", "estado_actual": envio.contrato.estado},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = request.data
        if not isinstance(payload, dict):
            try:
                payload = json.loads(request.body.decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                payload = {}

        comentario = (payload.get("comentario") or payload.get("motivo") or "").strip()
        if not comentario:
            return Response(
                {"detail": "Debe indicar el motivo del rechazo definitivo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        envio.respondido = True
        envio.aprobado = False
        envio.fecha_respuesta = timezone.now()
        envio.ip_respuesta = get_client_ip(request)
        envio.comentario_respuesta = comentario
        envio.save(
            update_fields=[
                "respondido",
                "aprobado",
                "fecha_respuesta",
                "ip_respuesta",
                "comentario_respuesta",
            ]
        )

        envio.contrato.estado = "rechazado_cliente"
        envio.contrato.save(update_fields=["estado", "fecha_modificacion"])

        # Hook FCM N17: rechazo definitivo (silencioso)
        try:
            from notificaciones.services import notificar_contrato_resolucion_cliente
            notificar_contrato_resolucion_cliente(
                envio.contrato, accion="rechazado definitivamente"
            )
        except Exception:
            import logging
            logging.getLogger(__name__).exception(
                "Hook FCM N17 (contrato rechazado definitivo) fallo (silencioso)."
            )

        return Response(
            {"detail": "Contrato rechazado definitivamente y cerrado."},
            status=status.HTTP_200_OK,
        )


class PublicContratoFirmaDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            envio = EnvioContratoFirmaUsuario.objects.select_related(
                "usuario",
                "usuario__usuario",
                "usuario__contrato",
            ).get(uuid=token, enviado=True)
        except EnvioContratoFirmaUsuario.DoesNotExist:
            return Response(
                {"detail": "Token no valido o envio de firma no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        contrato = envio.usuario.contrato
        secciones_qs = contrato.secciones_generadas.select_related(
            "seccion_plantilla"
        ).order_by("orden")
        secciones_data = SeccionGeneradaPublicSerializer(secciones_qs, many=True).data

        serializer = ContratoFirmaPublicSerializer(
            {
                "uuid": envio.uuid,
                "puede_firmar": not envio.firmado and contrato.estado == "en_firma",
                "firmado": envio.firmado,
                "fecha_envio": envio.fecha_envio,
                "fecha_emision": envio.fecha_envio,
                "fecha_firma": envio.fecha_firma,
                "firma": envio.firma,
                "firma_prestadora_disponible": bool(
                    getattr(contrato.empresa_prestadora, "firma_empresa", None)
                ),
                "es_version_enviada": True,
                "destinatario": _destinatario_payload(envio.usuario),
                "contrato": envio.snapshot_contrato or {},
                "secciones_generadas": secciones_data,
            }
        )
        return Response(serializer.data)


class PublicContratoFirmaPDFView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            envio = EnvioContratoFirmaUsuario.objects.select_related(
                "usuario__contrato"
            ).get(uuid=token, enviado=True)
        except EnvioContratoFirmaUsuario.DoesNotExist:
            return Response(
                {"detail": "Token no valido o envio de firma no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Servir el PDF en orden de prioridad para garantizar inmutabilidad del documento
        if envio.pdf_congelado:
            pdf_bytes = envio.pdf_congelado
        elif envio.snapshot_contrato:
            # Reconstruir desde snapshot para registros historicos sin pdf_congelado
            pdf_bytes = construir_pdf_desde_payload(envio.snapshot_contrato)
        else:
            # Fallback final: solo para datos previos a la implementacion del congelado
            pdf_bytes = construir_pdf_contrato(envio.usuario.contrato)

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'inline; filename="contrato_firma_{envio.usuario.contrato_id}.pdf"'
        )
        return response


class PublicFirmarContratoView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, token):
        try:
            envio = EnvioContratoFirmaUsuario.objects.select_related("usuario__contrato").get(uuid=token, enviado=True)
        except EnvioContratoFirmaUsuario.DoesNotExist:
            return Response(
                {"detail": "Token no valido o envio de firma no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if envio.firmado:
            return Response(
                {"detail": "Este enlace ya fue utilizado para firmar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if envio.usuario.contrato.estado != "en_firma":
            return Response(
                {"detail": "El contrato no esta disponible para firma.", "estado_actual": envio.usuario.contrato.estado},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = request.data
        if not isinstance(payload, dict):
            try:
                payload = json.loads(request.body.decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                payload = {}

        firma_value = payload.get("firma")
        fecha_firma_str = payload.get("fecha_firma")
        firmado_value = payload.get("firmado")

        if firma_value is None or fecha_firma_str is None or firmado_value is None:
            return Response(
                {"detail": 'Se requieren los campos "firma", "fecha_firma" y "firmado".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fecha_firma = parse_datetime(fecha_firma_str)
        if fecha_firma is None:
            return Response(
                {"detail": '"fecha_firma" no es un datetime ISO valido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            firma_normalizada = validar_firma_imagen(firma_value)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        envio.firma = firma_normalizada
        envio.fecha_firma = fecha_firma
        envio.firmado = bool(firmado_value)
        envio.ip_respuesta = get_client_ip(request)
        actualizar_pdf_firmado_envio(envio)
        envio.save(update_fields=["firma", "fecha_firma", "firmado", "ip_respuesta", "pdf_congelado"])

        contrato = envio.usuario.contrato
        contrato.estado = "activo"
        contrato.save(update_fields=["estado", "fecha_modificacion"])

        # Hook FCM N17 + N18: contrato firmado y activado (silencioso). Se delega N18
        # a la signal post_save (generar_primera_prefactura_al_activar) para evitar duplicados;
        # aqui solo emitimos el evento de firma (resolucion cliente).
        try:
            from notificaciones.services import notificar_contrato_resolucion_cliente
            notificar_contrato_resolucion_cliente(contrato, accion="firmado")
        except Exception:
            import logging
            logging.getLogger(__name__).exception(
                "Hook FCM N17 (contrato firmado) fallo (silencioso)."
            )

        return Response(
            {
                "uuid": str(envio.uuid),
                "firmado": envio.firmado,
                "fecha_firma": envio.fecha_firma.isoformat(),
            },
            status=status.HTTP_200_OK,
        )
