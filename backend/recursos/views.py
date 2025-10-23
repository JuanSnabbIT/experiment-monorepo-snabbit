from rest_framework import viewsets
from rest_framework.response import Response
from .serializers import *
from .models import *
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


class EquipoViewSet(viewsets.ModelViewSet):
    queryset = Equipo.objects.all()
    serializer_class = EquipoSerializer

    def get_queryset(self):
        empresa_id = self.kwargs.get('empresa_pk')  # Obtener empresa_id desde la URL
        if empresa_id:
            return Equipo.objects.filter(cliente__relaciones_como_cliente__prestador_servicios=empresa_id)
        return Equipo.objects.all()

    @action(detail=True, methods=['get'], url_path='usuario-equipo')
    def usuario_equipo(self, request, pk=None):
        equipo = self.get_object()
        usuarios_equipo = equipo.usuario_equipo.all()
        serializer = UsuarioEquipoSerializer(usuarios_equipo, many=True)
        return Response(serializer.data)

    # @action(detail=False, methods=["get"], url_path="lista-para-entregas")
    # def lista_equipos_sin_clientes(self, request, *args, **kwargs):
    #     """
    #     Devuelve los equipos activos listos para entrega:
    #     • sin cliente, o
    #     • con UsuarioEquipo inactivo, o
    #     • sin ningún UsuarioEquipo.
    #     """
    #     equipos = (
    #         self.get_queryset()
    #         .filter(estado=True)
    #         .filter(
    #             Q(cliente__isnull=True) |
    #             Q(usuario_equipo__estado=False) |
    #             Q(usuario_equipo__isnull=True)
    #         )
    #         .distinct()
    #     )

    #     serializer = self.get_serializer(equipos, many=True)
    #     return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='por-cliente')
    def equipos_por_cliente(self, request):
        cliente_id = request.query_params.get('cliente_id')

        if not cliente_id:
            return Response({"error": "Debe proporcionar un cliente_id"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cliente_id = int(cliente_id)
        except ValueError:
            return Response({"error": "cliente_id debe ser un número válido."}, status=status.HTTP_400_BAD_REQUEST)

        # Filtramos por cliente_id asegurando que solo obtenemos equipos del cliente correcto
        equipos = Equipo.objects.filter(cliente_id=cliente_id)

        serializer = EquipoSerializer(equipos, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='fotos')
    def lista_fotos(self, request, pk=None):
        equipo = self.get_object()
        fotos = FotoEquipo.objects.filter(usuario_equipo__equipo=equipo)
        serializer = FotoEquipoSerializer(fotos, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class SoftwareInstaladoViewSet(viewsets.ModelViewSet):
    queryset = SoftwareInstalado.objects.all()
    serializer_class = SoftwareInstaladoSerializer

class MonitorEquipoViewSet(viewsets.ModelViewSet):
    queryset = MonitorEquipo.objects.all()
    serializer_class = MonitorEquipoSerializer

class UsuarioEquipoViewSet(viewsets.ModelViewSet):
    queryset = UsuarioEquipo.objects.all()
    serializer_class = UsuarioEquipoSerializer

    @action(detail=False, methods=['get'], url_path='por-cliente')
    def por_cliente(self, request):
        cliente_id = request.query_params.get('cliente_id')
        if cliente_id is not None:
            usuario_equipo = UsuarioEquipo.objects.filter(equipo__cliente_id=cliente_id)
            serializer = UsuarioEquipoSerializer(usuario_equipo, many=True)
            return Response(serializer.data)
        else:
            return Response({"error": "El cliente_id es requerido"}, status=400)

class AlmacenamientoEquipoViewSet(viewsets.ModelViewSet):
    queryset = AlmacenamientoEquipo.objects.all()
    serializer_class = AlmacenamientoEquipoSerializer

class FotoEquipoViewSet(viewsets.ModelViewSet):
    queryset = FotoEquipo.objects.all()
    serializer_class = FotoEquipoSerializer

class SoftwareDeEmpresaViewSet(viewsets.ModelViewSet):
    queryset = SoftwareDeEmpresa.objects.all()
    serializer_class = SoftwareDeEmpresaSerializer

    @action(detail=False, methods=['get'], url_path="empresa/(?P<empresa_id>[^/.]+)")
    def software_segun_empresa(self, request, empresa_id=None):
        # Filtramos los softwares de empresa por el ID de la empresa
        softwares = self.get_queryset().filter(empresa_id=empresa_id)
        serializer = self.get_serializer(softwares, many=True)
        return Response(serializer.data)
