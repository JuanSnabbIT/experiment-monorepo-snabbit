from rest_framework import generics, viewsets, status
from .models import Retroalimentacion, LogDeAccesoRetroalimentacion, RetroalimentacionAplicada
from .serializers import RetroalimentacionAplicadaSerializer, RetroalimentacionPublicaSerializer, RetroalimentacionSerializer
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from django.db.models import F
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone


class RetroalimentacionPorTokenView(generics.RetrieveUpdateAPIView):
    queryset = Retroalimentacion.objects.select_related(
        'orden_trabajo__empresa',
        'orden_trabajo__tecnico_responsable_ot__usuario',
        'orden_trabajo_v3__empresa',
        'orden_trabajo_v3__tecnico_responsable',
        'usuario_empresa__usuario',
    ).prefetch_related('retroalimentacion_aplicada__pregunta')
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

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.fecha_retroalimentacion:
            return Response(
                {"detail": "Esta encuesta ya fue respondida. Gracias por su retroalimentacion."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Verificar vencimiento para V3
        if instance.fecha_vencimiento and timezone.now() > instance.fecha_vencimiento:
            return Response(
                {"detail": "Esta encuesta ha vencido y ya no puede ser respondida."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

class RetroalimentacionAplicadaViewSet(viewsets.GenericViewSet):
    """
    ViewSet mínimo para exponer la acción de actualizaciones en masa (bulk patch)
    sobre las instancias de RetroalimentacionAplicada.
    """
    queryset = RetroalimentacionAplicada.objects.all()
    serializer_class = RetroalimentacionAplicadaSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['patch'], url_path='bulk-update', permission_classes=[])
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

            # Para retroalimentaciones V3: avanzar la OT a "completada"
            from ordentrabajov3.estados_modelo import ESTADO_RETROALIMENTACION, ESTADO_POR_FACTURAR
            from ordentrabajov3.models import HistorialEstadoOTV3
            retros_v3 = Retroalimentacion.objects.filter(
                id__in=padres_actualizados,
                orden_trabajo_v3__isnull=False,
                orden_trabajo_v3__estado=ESTADO_RETROALIMENTACION,
            ).select_related("orden_trabajo_v3")
            for retro in retros_v3:
                otv3 = retro.orden_trabajo_v3
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


class RetroalimentacionResponderPorTokenView(APIView):
    """
    POST /api/retroalimentacion/pub/<uuid>/responder/

    Endpoint seguro para enviar respuestas a una encuesta de retroalimentacion.
    El UUID del token va en la URL (igual que el patron de aprobacion de contratos).
    Valida:
      - Que el UUID corresponde a una encuesta real.
      - Que la encuesta no haya sido respondida previamente.
      - Que la encuesta no haya vencido (aplica a V3).
      - Que cada item enviado pertenezca a ESA encuesta (evita manipulacion de IDs ajenos).
    """
    permission_classes = [AllowAny]

    def post(self, request, uuid):
        # 1. Resolver el token
        try:
            retro = Retroalimentacion.objects.prefetch_related(
                'retroalimentacion_aplicada'
            ).get(uuid=uuid)
        except Retroalimentacion.DoesNotExist:
            return Response(
                {"detail": "Token no valido o encuesta no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 2. Guard: ya respondida
        if retro.fecha_retroalimentacion:
            return Response(
                {"detail": "Esta encuesta ya fue respondida. Gracias por su retroalimentacion."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Guard: vencida (V3)
        if retro.fecha_vencimiento and timezone.now() > retro.fecha_vencimiento:
            return Response(
                {"detail": "Esta encuesta ha vencido y ya no puede ser respondida."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 4. Validar estructura del payload
        items = request.data.get("items", [])
        if not isinstance(items, list) or len(items) == 0:
            return Response(
                {"detail": "Se requiere un arreglo 'items' con al menos un elemento."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Obtener los IDs validos que pertenecen a esta retroalimentacion
        ids_validos = set(
            retro.retroalimentacion_aplicada.values_list("id", flat=True)
        )

        resultados = []
        errores = []

        for entry in items:
            pk = entry.get("id")
            if pk is None:
                errores.append({"id": None, "errors": {"id": ["Campo obligatorio."]}})
                continue

            # 5. Verificar pertenencia: el item debe ser de ESTA encuesta
            if pk not in ids_validos:
                errores.append({
                    "id": pk,
                    "errors": {"id": [f"El item {pk} no pertenece a esta encuesta."]},
                })
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
                {"updated": resultados, "errors": errores},
                status=status.HTTP_207_MULTI_STATUS,
            )

        # 6. Marcar como respondida
        retro.fecha_retroalimentacion = timezone.now()
        retro.save(update_fields=["fecha_retroalimentacion"])

        # 7. Avanzar OT V3 a completada si aplica
        if retro.orden_trabajo_v3_id:
            from ordentrabajov3.estados_modelo import ESTADO_RETROALIMENTACION, ESTADO_POR_FACTURAR
            from ordentrabajov3.models import HistorialEstadoOTV3
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
