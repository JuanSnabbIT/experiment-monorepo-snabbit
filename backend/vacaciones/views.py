from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from core.models import PersonalizacionUsuario
from .models import *
from .serializers import *


class SolicitudVacacionesViewSet(viewsets.ModelViewSet):
    queryset = SolicitudVacaciones.objects.all()
    serializer_class = SolicitudVacacionesSerializer
    
    def get_queryset(self):
        user = self.request.user
        try:
            personalizacion = PersonalizacionUsuario.objects.get(usuario=user)
            sucursal = personalizacion.sucursal_principal
        except PersonalizacionUsuario.DoesNotExist:
            return SolicitudVacaciones.objects.none()
        except AttributeError:
            return SolicitudVacaciones.objects.none()
        return SolicitudVacaciones.objects.filter(usuario_empresa__sucursal=sucursal)

    @action(detail=False, methods=['get'], url_path='mis-solicitudes')
    def mis_solicitudes(self, request):
        user = request.user
        solicitudes_usuario = SolicitudVacaciones.objects.filter(usuario_empresa__usuario=user)
        serializer = self.get_serializer(solicitudes_usuario, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='por-usuario')
    def por_usuarioempresa(self, request):
        usuario_empresa_id = request.query_params.get('usuario_empresa')
        if not usuario_empresa_id:
            return Response(
                {"detail": "Debes proporcionar el parámetro usuario_empresa."},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = SolicitudVacaciones.objects.filter(usuario_empresa_id=usuario_empresa_id)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)