from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import FCMToken, Notificacion
from .serializers import (
    FCMTokenRegistroSerializer,
    NotificacionSerializer,
)


class FCMTokenViewSet(viewsets.GenericViewSet):
    """Endpoints para registrar/desregistrar tokens FCM del usuario autenticado."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FCMTokenRegistroSerializer

    def get_queryset(self):
        return FCMToken.objects.filter(usuario=self.request.user)

    @action(detail=False, methods=["post"], url_path="registrar")
    def registrar(self, request):
        """Crea (o reactiva) un token FCM para el usuario autenticado."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["token"]
        user_agent = serializer.validated_data.get("user_agent", "")[:255]

        instancia, _ = FCMToken.objects.update_or_create(
            token=token,
            defaults={
                "usuario": request.user,
                "user_agent": user_agent,
                "activo": True,
            },
        )
        return Response(
            {"id": instancia.id, "activo": instancia.activo},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="eliminar")
    def eliminar(self, request):
        """Elimina (logout) un token FCM del usuario autenticado."""
        token = (request.data.get("token") or "").strip()
        if not token:
            return Response(
                {"detail": "El campo 'token' es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        FCMToken.objects.filter(usuario=request.user, token=token).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificacionViewSet(viewsets.ReadOnlyModelViewSet):
    """Historial de notificaciones del usuario autenticado."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificacionSerializer

    def get_queryset(self):
        return Notificacion.objects.filter(usuario=self.request.user)

    @action(detail=False, methods=["get"], url_path="no-leidas-count")
    def no_leidas_count(self, request):
        """Cuenta de notificaciones no leidas (para el badge de la campana)."""
        count = self.get_queryset().filter(leida=False).count()
        return Response({"no_leidas": count})

    @action(detail=True, methods=["patch"], url_path="marcar-leida")
    def marcar_leida(self, request, pk=None):
        notif = self.get_object()
        if not notif.leida:
            notif.leida = True
            notif.fecha_lectura = timezone.now()
            notif.save(update_fields=["leida", "fecha_lectura"])
        return Response(NotificacionSerializer(notif).data)

    @action(detail=False, methods=["post"], url_path="marcar-todas-leidas")
    def marcar_todas_leidas(self, request):
        ahora = timezone.now()
        actualizadas = self.get_queryset().filter(leida=False).update(
            leida=True, fecha_lectura=ahora
        )
        return Response({"actualizadas": actualizadas})
