from rest_framework import viewsets, status
from .filters import *
from .models import *
from .serializers import *
from rest_framework.response import Response
from django.contrib.contenttypes.models import ContentType


class PersonalizacionUsuarioViewSet(viewsets.ModelViewSet):
    queryset = PersonalizacionUsuario.objects.all()
    serializer_class = PersonalizacionUsuarioSerializer
    filterset_class = PersonalizacionUsuarioFilter

    def get_queryset(self):
        return PersonalizacionUsuario.objects.filter(usuario=self.request.user)

    def create(self, request, *args, **kwargs):
        return Response({"detail": "Method 'POST' not allowed."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


class ContentTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ContentType.objects.all()
    serializer_class = ContentTypeSerializer

class SoftwareViewSet(viewsets.ModelViewSet):
    queryset = Software.objects.all()
    serializer_class = SoftwareSerializer

class AcuerdoConfidencialidadBaseViewSet(viewsets.ModelViewSet):
    queryset = AcuerdoConfidencialidadBase.objects.all()
    serializer_class = AcuerdoConfidencialidadBaseSerializer