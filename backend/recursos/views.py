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
            return Equipo.objects.filter(empresa_propietaria_id=empresa_id)

        usuario_empresa = getattr(self.request.user, "usuarioempresa", None)
        if usuario_empresa and getattr(usuario_empresa, "sucursal", None):
            return Equipo.objects.filter(empresa_propietaria=usuario_empresa.sucursal.empresa)

        return Equipo.objects.none()

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

    @action(detail=False, methods=['get'], url_path='disponibles-para-entrega')
    def disponibles_para_entrega(self, request):
        """
        Devuelve equipos activos de la empresa del usuario que NO tienen
        un UsuarioEquipo activo (estado=True), es decir, estan libres para asignar.
        """
        from django.db.models import Q
        qs = self.get_queryset().filter(estado=True).exclude(
            usuario_equipo__estado=True
        ).distinct()
        serializer = self.get_serializer(qs, many=True)
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

    @action(detail=False, methods=['get'], url_path='por-usuario-empresa/(?P<usuario_empresa_pk>[^/.]+)')
    def por_usuario_empresa(self, request, usuario_empresa_pk=None):
        """
        Lista todos los UsuarioEquipo (equipos asignados) de un UsuarioEmpresa específico.
        Endpoint: GET /api/usuarios-equipo/por-usuario-empresa/{usuario_empresa_pk}/
        """
        from empresas.models import UsuarioEmpresa
        try:
            usuario_empresa = UsuarioEmpresa.objects.get(pk=usuario_empresa_pk)
        except UsuarioEmpresa.DoesNotExist:
            return Response(
                {"error": f"UsuarioEmpresa con id {usuario_empresa_pk} no existe"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Filtrar UsuarioEquipo por el usuario_empresa
        usuario_equipos = UsuarioEquipo.objects.filter(
            usuario=usuario_empresa
        ).select_related('equipo', 'usuario__usuario', 'usuario__sucursal__empresa')

        # Usar el serializer simplificado
        from .serializers import UsuarioEquipoListSerializer
        serializer = UsuarioEquipoListSerializer(usuario_equipos, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='equipo-detalle')
    def equipo_detalle(self, request, pk=None):
        """
        Obtiene el detalle completo del Equipo asociado a un UsuarioEquipo específico.
        Incluye almacenamientos, monitores, software, fotos y usuario actual.
        Endpoint: GET /api/usuarios-equipo/{pk}/equipo-detalle/
        """
        try:
            usuario_equipo = UsuarioEquipo.objects.select_related(
                'equipo', 'usuario__usuario'
            ).get(pk=pk)
        except UsuarioEquipo.DoesNotExist:
            return Response(
                {"error": f"UsuarioEquipo con id {pk} no existe"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Obtener el equipo y serializarlo con información completa
        equipo = usuario_equipo.equipo
        from .serializers import EquipoDetalleCompletoSerializer
        serializer = EquipoDetalleCompletoSerializer(equipo)
        
        # Agregar información del UsuarioEquipo actual
        data = serializer.data
        data['usuario_equipo_info'] = {
            'id': usuario_equipo.id,
            'fecha_asignacion': usuario_equipo.fecha_asignacion,
            'fecha_devolucion': usuario_equipo.fecha_devolucion,
            'estado': usuario_equipo.estado,
            'observaciones': usuario_equipo.observaciones
        }
        
        return Response(data, status=status.HTTP_200_OK)

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
