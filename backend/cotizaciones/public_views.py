"""
Vistas públicas para aprobación/rechazo de cotizaciones vía email.

Estos endpoints NO requieren autenticación. El acceso se controla
mediante un token único (UUID) asociado a cada solicitante.

Documentación para Frontend:
----------------------------

ENDPOINTS PÚBLICOS (sin autenticación):

1. GET /api/public/cotizacion/{token}/
   - Retorna datos completos de la cotización para mostrar al cliente
   - Permite ver múltiples veces (no consume el token)
   - Ver CotizacionPublicSerializer para estructura del response

2. POST /api/public/cotizacion/{token}/aprobar/
   - Aprueba la cotización
   - Body: { "item_ids": [1, 2, 3] }  // opcional, vacío = todos
   - Consume el token (uso único)
   - Notifica al emisor

3. POST /api/public/cotizacion/{token}/rechazar/
   - Rechaza la cotización
   - Body: { "motivo": "Razón del rechazo" }  // opcional
   - Consume el token (uso único)
   - Notifica al emisor

FLUJO ESPERADO EN FRONTEND:
1. Usuario recibe email con link: {FRONTEND_URL}/cotizacion/public/responder/{token}
2. Frontend llama GET /api/public/cotizacion/{token}/ para obtener datos
3. Muestra cotización con botones Aprobar/Rechazar
4. Si aprueba: muestra selector de items + confirmación
5. Si rechaza: muestra input de motivo (opcional) + confirmación
6. POST a endpoint correspondiente
7. Muestra mensaje de éxito/error

CÓDIGOS DE ERROR:
- 400 Bad Request: Token ya usado, cotización no en estado válido
- 404 Not Found: Token no existe
- 410 Gone: Cotización expirada (fecha_vencimiento < hoy)
"""

import logging

from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from items.models import ItemEmpresa
from rest_framework import status
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .functions import crear_seguimiento_cotizacion, generar_pdf_cotizacion_desde_model
from .models import Cotizacion, ItemCotizacion, SolicitanteCotizacion
from .public_serializers import (
    AprobarCotizacionPublicSerializer,
    CotizacionPublicSerializer,
    RechazarCotizacionPublicSerializer,
)

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Obtiene la IP real del cliente, considerando proxies."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class PublicCotizacionDetailView(RetrieveAPIView):
    """
    GET /api/public/cotizacion/{token}/

    Retorna los datos completos de una cotización para vista pública.
    No requiere autenticación - el token actúa como credencial.

    Permite ver la cotización múltiples veces (no marca el token como usado).

    Response 200:
        Ver CotizacionPublicSerializer para estructura completa.

    Response 404:
        { "detail": "Token no válido o cotización no encontrada." }

    Response 410:
        { "detail": "Esta cotización ha expirado.", "fecha_vencimiento": "2026-01-15" }
    """

    permission_classes = [AllowAny]
    serializer_class = CotizacionPublicSerializer
    lookup_field = "token"
    lookup_url_kwarg = "token"

    def get_queryset(self):
        return SolicitanteCotizacion.objects.select_related(
            "cotizacion",
            "cotizacion__empresa",
            "cotizacion__cliente",
        ).prefetch_related(
            "cotizacion__items",
            "cotizacion__items__item_empresa",
        )

    def get_object(self):
        token = self.kwargs.get("token")
        try:
            solicitante = self.get_queryset().get(token=token)
            return solicitante
        except SolicitanteCotizacion.DoesNotExist:
            return None

    def retrieve(self, request, *args, **kwargs):
        solicitante = self.get_object()

        if not solicitante:
            return Response(
                {"detail": "Token no válido o cotización no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        cotizacion = solicitante.cotizacion

        # Registrar primer acceso del solicitante al documento
        if not solicitante.fecha_primera_vista:
            solicitante.fecha_primera_vista = timezone.now()
            solicitante.save(update_fields=["fecha_primera_vista"])

        # Verificar expiración (pero permitir ver)
        if not cotizacion.es_vigente and cotizacion.estado == "enviada":
            # Permitir ver pero indicar que expiró
            pass

        serializer = self.serializer_class(
            cotizacion, context={"request": request, "solicitante": solicitante}
        )
        return Response(serializer.data)


class PublicCotizacionPDFView(APIView):
    """
    GET /api/public/cotizacion/{token}/pdf/
    
    Descarga el PDF de la cotización.
    No requiere autenticación - el token actúa como credencial.
    
    Response 200: PDF file (application/pdf)
    Response 404: Token no válido
    """
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            solicitante = SolicitanteCotizacion.objects.select_related(
                'cotizacion',
                'cotizacion__empresa',
                'cotizacion__cliente',
            ).get(token=token)
        except SolicitanteCotizacion.DoesNotExist:
            return Response(
                {"detail": "Token no válido o cotización no encontrada."},
                status=status.HTTP_404_NOT_FOUND
            )

        cotizacion = solicitante.cotizacion

        try:
            pdf_bytes = generar_pdf_cotizacion_desde_model(cotizacion_id=cotizacion.pk)
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            filename = f"Cotizacion_{cotizacion.numero_cotizacion}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            logger.error(f"Error generando PDF para cotización {cotizacion.pk}: {e}")
            return Response(
                {"detail": "Error al generar el PDF."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PublicAprobarCotizacionView(APIView):
    """
    POST /api/public/cotizacion/{token}/aprobar/

    Aprueba una cotización. Uso único del token.

    Request body:
        {
            "item_ids": [1, 2, 3]  // Opcional. Si vacío, aprueba todos los items.
        }

    Response 200:
        {
            "detail": "Cotización aprobada exitosamente.",
            "numero_cotizacion": 850,
            "items_aprobados": 3
        }

    Response 400:
        { "detail": "Este enlace ya fue utilizado para responder." }
        { "detail": "La cotización no está en estado válido para aprobar." }
        { "detail": "Algunos items no pertenecen a esta cotización." }

    Response 404:
        { "detail": "Token no válido o cotización no encontrada." }

    Response 410:
        { "detail": "Esta cotización ha expirado y no puede ser aprobada." }
    """

    permission_classes = [AllowAny]

    def post(self, request, token):
        # 1. Validar token
        try:
            solicitante = (
                SolicitanteCotizacion.objects.select_related(
                    "cotizacion",
                    "cotizacion__empresa",
                )
                .prefetch_related(
                    "cotizacion__items",
                )
                .get(token=token)
            )
        except SolicitanteCotizacion.DoesNotExist:
            return Response(
                {"detail": "Token no válido o cotización no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        cotizacion = solicitante.cotizacion

        # 2. Validar que el token no haya sido usado
        if solicitante.token_usado:
            return Response(
                {"detail": "Este enlace ya fue utilizado para responder."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Validar que la cotización esté en estado válido
        if cotizacion.estado != "enviada":
            return Response(
                {
                    "detail": "La cotización no está en estado válido para aprobar.",
                    "estado_actual": cotizacion.estado,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 4. Validar que no haya expirado
        if not cotizacion.es_vigente:
            return Response(
                {
                    "detail": "Esta cotización ha expirado y no puede ser aprobada.",
                    "fecha_vencimiento": (
                        cotizacion.fecha_vencimiento.isoformat()
                        if cotizacion.fecha_vencimiento
                        else None
                    ),
                },
                status=status.HTTP_410_GONE,
            )

        # 5. Validar body
        serializer = AprobarCotizacionPublicSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item_ids = serializer.validated_data.get("item_ids", [])

        # 6. Si no se especifican items, aprobar todos
        all_items = list(cotizacion.items.all())
        if not item_ids:
            items_a_aprobar = all_items
        else:
            # Validar que los items pertenezcan a esta cotización
            cotizacion_item_ids = {item.id for item in all_items}
            invalid_ids = set(item_ids) - cotizacion_item_ids
            if invalid_ids:
                return Response(
                    {
                        "detail": "Algunos items no pertenecen a esta cotización.",
                        "items_invalidos": list(invalid_ids),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            items_a_aprobar = [item for item in all_items if item.id in item_ids]

        # 7. Ejecutar aprobación atómica
        with transaction.atomic():
            ahora = timezone.now()
            ip_cliente = get_client_ip(request)

            # Marcar solicitante
            solicitante.aprobo = True
            solicitante.token_usado = True
            solicitante.fecha_aprobacion = ahora
            solicitante.fecha_respuesta = ahora
            solicitante.ip_respuesta = ip_cliente
            solicitante.save(
                update_fields=[
                    "aprobo",
                    "token_usado",
                    "fecha_aprobacion",
                    "fecha_respuesta",
                    "ip_respuesta",
                ]
            )

            # Resetear items y aprobar los seleccionados
            cotizacion.items.all().update(aprobado=False)
            for item in items_a_aprobar:
                # Crear ItemEmpresa si no existe (lógica existente)
                if item.item_empresa is None:
                    item_empresa, _created = ItemEmpresa.objects.get_or_create(
                        nombre=item.nombre or f"ItemCotizacion {item.id}",
                        empresa=cotizacion.empresa,
                        defaults={"descripcion_corta": (item.descripcion or "")[:45]},
                    )
                    if item.proveedor_empresa:
                        item_empresa.proveedores_empresa.add(item.proveedor_empresa)
                    item.item_empresa = item_empresa

                item.aprobado = True
                item.save(update_fields=["aprobado", "item_empresa"])

            # Cambiar estado cotización
            cotizacion.estado = "aceptada"
            cotizacion.save(update_fields=["estado"])

            # Crear seguimiento
            crear_seguimiento_cotizacion(
                cotizacion_id=cotizacion.id,
                usuario_id=None,  # No hay usuario autenticado
                comentario=f"Cotización aprobada vía email por {solicitante.get_nombre()} ({solicitante.get_email()}). Items aprobados: {len(items_a_aprobar)}.",
                tipo="aprobacion",
            )

            # Hook FCM N2: cotización aprobada vía link público (silencioso)
            try:
                from notificaciones.services import notificar_cotizacion_aprobada
                notificar_cotizacion_aprobada(cotizacion, usuario_actor=None)
            except Exception:
                import logging
                logging.getLogger(__name__).exception(
                    "Hook FCM N2 (cotizacion aprobada publica) fallo (silencioso)."
                )

        # 8. Notificar al emisor (async)
        from .tasks import notificar_respuesta_cotizacion

        try:
            notificar_respuesta_cotizacion.delay(
                cotizacion_id=cotizacion.id,
                accion="aprobada",
                solicitante_nombre=solicitante.get_nombre(),
                solicitante_email=solicitante.get_email(),
                items_aprobados=len(items_a_aprobar),
            )
        except Exception as e:
            logger.warning(f"No se pudo encolar notificación de aprobación: {e}")

        return Response(
            {
                "detail": "Cotización aprobada exitosamente.",
                "numero_cotizacion": cotizacion.numero_cotizacion,
                "items_aprobados": len(items_a_aprobar),
            },
            status=status.HTTP_200_OK,
        )


class PublicRechazarCotizacionView(APIView):
    """
    POST /api/public/cotizacion/{token}/rechazar/

    Rechaza una cotización. Uso único del token.

    Request body:
        {
            "motivo": "El precio excede nuestro presupuesto"  // Opcional
        }

    Response 200:
        {
            "detail": "Cotización rechazada.",
            "numero_cotizacion": 850
        }

    Response 400:
        { "detail": "Este enlace ya fue utilizado para responder." }
        { "detail": "La cotización no está en estado válido para rechazar." }

    Response 404:
        { "detail": "Token no válido o cotización no encontrada." }

    Response 410:
        { "detail": "Esta cotización ha expirado." }
    """

    permission_classes = [AllowAny]

    def post(self, request, token):
        # 1. Validar token
        try:
            solicitante = SolicitanteCotizacion.objects.select_related(
                "cotizacion",
                "cotizacion__empresa",
            ).get(token=token)
        except SolicitanteCotizacion.DoesNotExist:
            return Response(
                {"detail": "Token no válido o cotización no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        cotizacion = solicitante.cotizacion

        # 2. Validar que el token no haya sido usado
        if solicitante.token_usado:
            return Response(
                {"detail": "Este enlace ya fue utilizado para responder."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Validar que la cotización esté en estado válido
        if cotizacion.estado != "enviada":
            return Response(
                {
                    "detail": "La cotización no está en estado válido para rechazar.",
                    "estado_actual": cotizacion.estado,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 4. Validar que no haya expirado (para rechazar también validamos)
        if not cotizacion.es_vigente:
            return Response(
                {
                    "detail": "Esta cotización ha expirado.",
                    "fecha_vencimiento": (
                        cotizacion.fecha_vencimiento.isoformat()
                        if cotizacion.fecha_vencimiento
                        else None
                    ),
                },
                status=status.HTTP_410_GONE,
            )

        # 5. Validar body
        serializer = RechazarCotizacionPublicSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        motivo = serializer.validated_data.get("motivo", "")

        # 6. Ejecutar rechazo atómico
        with transaction.atomic():
            ahora = timezone.now()
            ip_cliente = get_client_ip(request)

            # Marcar solicitante
            solicitante.aprobo = False
            solicitante.token_usado = True
            solicitante.fecha_respuesta = ahora
            solicitante.ip_respuesta = ip_cliente
            solicitante.motivo_rechazo = motivo or None
            solicitante.save(
                update_fields=[
                    "aprobo",
                    "token_usado",
                    "fecha_respuesta",
                    "ip_respuesta",
                    "motivo_rechazo",
                ]
            )

            # Cambiar estado cotización
            cotizacion.estado = "rechazada"
            cotizacion.save(update_fields=["estado"])

            # Hook FCM N3: cotización rechazada vía link público (silencioso)
            try:
                from notificaciones.services import notificar_cotizacion_rechazada
                notificar_cotizacion_rechazada(cotizacion, usuario_actor=None)
            except Exception:
                import logging
                logging.getLogger(__name__).exception(
                    "Hook FCM N3 (cotizacion rechazada publica) fallo (silencioso)."
                )

            # Crear seguimiento
            comentario = f"Cotización rechazada vía email por {solicitante.get_nombre()} ({solicitante.get_email()})."
            if motivo:
                comentario += f" Motivo: {motivo}"

            crear_seguimiento_cotizacion(
                cotizacion_id=cotizacion.id,
                usuario_id=None,
                comentario=comentario,
                tipo="rechazo",
            )

        # 7. Notificar al emisor (async)
        from .tasks import notificar_respuesta_cotizacion

        try:
            notificar_respuesta_cotizacion.delay(
                cotizacion_id=cotizacion.id,
                accion="rechazada",
                solicitante_nombre=solicitante.get_nombre(),
                solicitante_email=solicitante.get_email(),
                motivo_rechazo=motivo,
            )
        except Exception as e:
            logger.warning(f"No se pudo encolar notificación de rechazo: {e}")

        return Response(
            {
                "detail": "Cotización rechazada.",
                "numero_cotizacion": cotizacion.numero_cotizacion,
            },
            status=status.HTTP_200_OK,
        )
