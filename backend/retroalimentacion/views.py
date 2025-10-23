from rest_framework import generics, viewsets, status
from .models import Retroalimentacion, LogDeAccesoRetroalimentacion, RetroalimentacionAplicada
from .serializers import RetroalimentacionAplicadaSerializer, RetroalimentacionPublicaSerializer, RetroalimentacionSerializer
from rest_framework.permissions import AllowAny
from django.db.models import F
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone


class RetroalimentacionPorTokenView(generics.RetrieveUpdateAPIView):
    queryset = Retroalimentacion.objects.all()
    serializer_class = RetroalimentacionPublicaSerializer
    lookup_field = "uuid"
    permission_classes = [AllowAny]

    def get_client_ip(self, request):
        ip = request.META.get('HTTP_X_FORWARDED_FOR')
        if ip:
            ip = ip.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def get_object(self):
        obj = super().get_object()

        # Incrementar cantidad de visitas
        Retroalimentacion.objects.filter(pk=obj.pk).update(cantidad_visitas=F("cantidad_visitas") + 1)
        obj.refresh_from_db(fields=["cantidad_visitas"])

        ip = self.get_client_ip(self.request)
        user_agent = self.request.META.get('HTTP_USER_AGENT', '')

        # Registrar el log
        LogDeAccesoRetroalimentacion.objects.create(
            retroalimentacion=obj,
            ip=ip,
            user_agent=user_agent
        )

        return obj

class RetroalimentacionAplicadaViewSet(viewsets.GenericViewSet):
    """
    ViewSet mínimo para exponer la acción de actualizaciones en masa (bulk patch)
    sobre las instancias de RetroalimentacionAplicada.
    """
    queryset = RetroalimentacionAplicada.objects.all()
    serializer_class = RetroalimentacionAplicadaSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['patch'], url_path='bulk_update', permission_classes=[])
    def bulk_update(self, request):
        """
        Recibe un JSON con la clave "items" conteniendo una lista de objetos:
        [
            {
                "id": <id_de_RetroalimentacionAplicada>,
                "cantidad_estrellas": <decimal>,
                "observaciones": "<texto>"
            },
            ...
        ]
        Para cada ítem válido, actualiza sus campos. Una vez procesados, fija
        la fecha_retroalimentacion de cada Retroalimentacion padre al momento actual.
        """
        items = request.data.get('items', [])
        if not isinstance(items, list):
            return Response(
                {"detail": "Se requiere un arreglo bajo la clave 'items'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        resultados = []
        errores = []
        padres_actualizados = set()  # aquí guardaremos las Retroalimentacion.id afectadas

        for entry in items:
            pk = entry.get('id')
            if pk is None:
                errores.append({
                    "id": None,
                    "errors": {"id": ["Este campo es obligatorio para identificar el objeto."]}
                })
                continue

            try:
                instancia = RetroalimentacionAplicada.objects.get(pk=pk)
            except RetroalimentacionAplicada.DoesNotExist:
                errores.append({
                    "id": pk,
                    "errors": {"id": [f"No se encontró RetroalimentacionAplicada con id={pk}."]}
                })
                continue

            serializer = self.get_serializer(instance=instancia, data=entry, partial=True)
            if serializer.is_valid():
                serializer.save()
                resultados.append(serializer.data)
                # Guardamos el id de la Retroalimentacion padre para luego actualizar su fecha
                padres_actualizados.add(instancia.retroalimentacion_id)
            else:
                errores.append({
                    "id": pk,
                    "errors": serializer.errors
                })

        # Si al menos un hijo se actualizó, fijamos fecha_retroalimentacion = ahora()
        if padres_actualizados:
            ahora = timezone.now()
            Retroalimentacion.objects.filter(
                id__in=padres_actualizados
            ).update(fecha_retroalimentacion=ahora)

        # Si hubo errores parciales, devolvemos 207 Multi‐Status
        if errores:
            return Response(
                {
                    "updated": resultados,
                    "errors": errores
                },
                status=status.HTTP_207_MULTI_STATUS
            )

        return Response({"updated": resultados}, status=status.HTTP_200_OK)

class RetroalimentacionViewSet(viewsets.ModelViewSet):
    queryset = Retroalimentacion.objects.all()
    serializer_class = RetroalimentacionSerializer


