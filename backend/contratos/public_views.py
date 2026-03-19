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
from .flow_helpers import validar_firma_imagen
from .models import EnvioContratoAprobacion, EnvioContratoFirmaUsuario
from .public_serializers import (
    ContratoAprobacionPublicSerializer,
    ContratoFirmaPublicSerializer,
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


class PublicContratoAprobacionDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            envio = EnvioContratoAprobacion.objects.select_related(
                "contrato",
                "destinatario",
                "destinatario__usuario__usuario",
            ).get(uuid=token, enviado=True)
        except EnvioContratoAprobacion.DoesNotExist:
            return Response(
                {"detail": "Token no valido o aprobacion no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

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
            }
        )
        return Response(serializer.data)


class PublicContratoAprobacionPDFView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            envio = EnvioContratoAprobacion.objects.get(uuid=token, enviado=True)
        except EnvioContratoAprobacion.DoesNotExist:
            return Response(
                {"detail": "Token no valido o aprobacion no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        response = HttpResponse(envio.pdf_congelado, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="contrato_aprobacion_{envio.contrato_id}_v{envio.version_envio}.pdf"'
        )
        return response


class PublicAprobarContratoView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token):
        try:
            envio = EnvioContratoAprobacion.objects.select_related("contrato").get(uuid=token, enviado=True)
        except EnvioContratoAprobacion.DoesNotExist:
            return Response(
                {"detail": "Token no valido o aprobacion no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

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

        return Response(
            {"detail": "Contrato aprobado exitosamente.", "contrato_id": envio.contrato_id},
            status=status.HTTP_200_OK,
        )


class PublicRechazarContratoView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token):
        try:
            envio = EnvioContratoAprobacion.objects.select_related("contrato").get(uuid=token, enviado=True)
        except EnvioContratoAprobacion.DoesNotExist:
            return Response(
                {"detail": "Token no valido o aprobacion no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

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

        return Response(
            {"detail": "Contrato rechazado. Se registraron los cambios solicitados."},
            status=status.HTTP_200_OK,
        )


class PublicRechazarDefinitivoContratoView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token):
        try:
            envio = EnvioContratoAprobacion.objects.select_related("contrato").get(uuid=token, enviado=True)
        except EnvioContratoAprobacion.DoesNotExist:
            return Response(
                {"detail": "Token no valido o aprobacion no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

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

        serializer = ContratoFirmaPublicSerializer(
            {
                "uuid": envio.uuid,
                "puede_firmar": not envio.firmado and envio.usuario.contrato.estado == "en_firma",
                "firmado": envio.firmado,
                "fecha_envio": envio.fecha_envio,
                "fecha_emision": envio.fecha_envio,
                "fecha_firma": envio.fecha_firma,
                "firma": envio.firma,
                "firma_prestadora_disponible": bool(
                    getattr(envio.usuario.contrato.empresa_prestadora, "firma_empresa", None)
                ),
                "es_version_enviada": True,
                "destinatario": _destinatario_payload(envio.usuario),
                "contrato": envio.snapshot_contrato or {},
            }
        )
        return Response(serializer.data)


class PublicContratoFirmaPDFView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            envio = EnvioContratoFirmaUsuario.objects.get(uuid=token, enviado=True)
        except EnvioContratoFirmaUsuario.DoesNotExist:
            return Response(
                {"detail": "Token no valido o envio de firma no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        response = HttpResponse(envio.pdf_congelado, content_type="application/pdf")
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

        return Response(
            {
                "uuid": str(envio.uuid),
                "firmado": envio.firmado,
                "fecha_firma": envio.fecha_firma.isoformat(),
            },
            status=status.HTTP_200_OK,
        )
