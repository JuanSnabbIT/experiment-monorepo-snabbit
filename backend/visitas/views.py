from rest_framework import viewsets
from rest_framework.response import Response
from core.models import PersonalizacionUsuario
from .models import AsistenciaUsuario, EntregaDeEquipo, VisitaSoporte
from .serializers import AsistenciaUsuarioSerializer, EntregaDeEquipoSerializer, VisitaSoporteSerializer
from rest_framework import viewsets, status
from rest_framework.decorators import action


class AsistenciaUsuarioViewSet(viewsets.ModelViewSet):
    queryset = AsistenciaUsuario.objects.all()
    serializer_class = AsistenciaUsuarioSerializer

    def get_queryset(self):
        return super().get_queryset().filter(visita_id=self.kwargs.get('visita_soporte_pk'))

class VisitaSoporteViewSet(viewsets.ModelViewSet):
    queryset = VisitaSoporte.objects.all()
    serializer_class = VisitaSoporteSerializer

    def get_queryset(self):
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if personalizacion and personalizacion.sucursal_principal:
            return VisitaSoporte.objects.filter(empresa=personalizacion.sucursal_principal.empresa)
        return VisitaSoporte.objects.none()

    # @action(detail=False, methods=['get'], url_path='asistencias-por-detalle-trabajo')
    # def asistencias_por_detalle_trabajo(self, request):
    #     asistencias = AsistenciaUsuario.objects.all()
    #     serializer = AsistenciaUsuarioSerializer(asistencias, many=True)
    #     return Response(serializer.data)

    # @action(detail=False, methods=['get'], url_path='guias-disponibles')
    # def guias_disponibles(self, request):
    #     bodega_id = request.query_params.get('bodega_id')
    #     if not bodega_id:
    #         return Response(
    #             {"detail": "El parámetro 'bodega_id' es requerido."},
    #             status=status.HTTP_400_BAD_REQUEST
    #         )
    #     # Filtra las guías con estado "ET" y de la bodega especificada
    #     guias = GuiaSalida.objects.filter(estado="ET", bodega_id=bodega_id)
    #     # Excluye las que ya están asociadas a una visita
    #     guias = guias.exclude(
    #         id__in=InsumoEnVisitaSoporte.objects.values_list('guia_id', flat=True)
    #     )
    #     serializer = GuiaSalidaSerializer(guias, many=True)
    #     return Response(serializer.data)

    # @action(detail=True, methods=['patch'], url_path='asistencias-por-detalle-trabajo')
    # def asistencias_por_detalle_trabajo(self, request, pk=None):
    #     try:
    #         asistencia = AsistenciaUsuario.objects.get(id=pk)
    #         serializer = AsistenciaUsuarioSerializer(asistencia, data=request.data, partial=True)
    #         if serializer.is_valid():
    #             serializer.save()
    #             return Response(serializer.data, status=status.HTTP_200_OK)
    #         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    #     except AsistenciaUsuario.DoesNotExist:
    #         return Response({"error": "Asistencia no encontrada"}, status=status.HTTP_404_NOT_FOUND)

class EntregaDeEquipoViewSet(viewsets.ModelViewSet):
    queryset = EntregaDeEquipo.objects.all()
    serializer_class = EntregaDeEquipoSerializer

    def get_queryset(self):
        return super().get_queryset().filter(visita_id=self.kwargs.get('visita_soporte_pk'))

    def perform_destroy(self, instance):
        """
        Antes de borrar la Entrega:
        1. Vaciar el campo `cliente` del equipo asociado (si lo hay).
        2. Guardar el equipo.
        3. Eliminar la EntregaDeEquipo de forma segura.
        """
        equipo = instance.equipo
        if equipo:
            equipo.cliente = None      # Asegúrate de que `cliente` tenga null=True
            equipo.save(update_fields=["cliente"])
        instance.delete()

    @action(detail=False, methods=['post'], url_path='crear-con-item-guia')
    def crear_con_item_guia(self, request, visita_soporte_pk=None):
        # 1. Obtener la VisitaSoporte según el parámetro de la URL
        try:
            visita = VisitaSoporte.objects.get(pk=visita_soporte_pk)
        except VisitaSoporte.DoesNotExist:
            return Response({'error': 'Visita no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        # 2. Crear la EntregaDeEquipo
        data = request.data.copy()
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        entrega = serializer.save(visita=visita)

        equipo = entrega.equipo
        equipo.cliente = entrega.visita.cliente
        equipo.save()

        return Response(self.get_serializer(entrega).data, status=status.HTTP_201_CREATED)

# class InsumoEnVisitaSoporteViewSet(viewsets.ModelViewSet):
#     queryset = InsumoEnVisitaSoporte.objects.all()
#     serializer_class = InsumoEnVisitaSoporteSerializer

#     def get_queryset(self):
#         return super().get_queryset().filter(visita_id=self.kwargs.get('visita_soporte_pk'))

#     @action(detail=False, methods=['post'], url_path='crear-insumo')
#     def crear_insumo(self, request, visita_soporte_pk=None):
#         # Se valida y crea el InsumoEnVisitaSoporte
#         serializer = self.get_serializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         # Se asocia la visita usando el parámetro de la URL
#         insumo = serializer.save(visita_id=visita_soporte_pk)
#         usuario_empresa = get_object_or_404(UsuarioEmpresa, usuario=request.user.id)

#         # Obtenemos la guía asociada al insumo
#         guia = insumo.guia

#         # Buscamos los items individualizados en la guía.
#         # Se asume que la relación se maneja mediante el modelo ItemsGuiaSalida.
#         items_individualizados = ItemsGuiaSalida.objects.filter(guia=guia, individualizado=True)

#         for item in items_individualizados:
#             # Extraemos el dato "serie" del JSON almacenado en el campo numero_serie
#             # Ejemplo de estructura: {"serie": "234", "modelo": "itemsguiasalida", "object_id": 28}
#             numero_serie_data = item.numero_serie or {}
#             serie = numero_serie_data.get("serie")

#             if serie:
#                 # Creamos el nuevo Equipo.
#                 # Es importante completar los campos obligatorios del modelo Equipo. Aquí se asume que:
#                 # - El usuario autenticado posee una relación con una Empresa (request.user.empresa)
#                 # - Se asignan valores por defecto en otros campos.
#                 equipo, created = Equipo.objects.get_or_create(
#                     numero_serie=serie,
#                     cliente=insumo.visita.cliente,       # Asegúrate de tener este atributo en tu usuario
#                     registrado_por=usuario_empresa,
#                     # tipo_equipo="ESCRITORIO",             # O el valor que corresponda
#                     # marca="OTRA",                       # Ajustar según corresponda
#                     # modelo="Nuevo Modelo",              # Valor temporal, ya que se actualizará el JSON
#                     # Puedes agregar aquí otros campos requeridos según tu modelo
#                 )

#                 # Actualizamos el JSON del campo numero_serie para reflejar que el item ahora
#                 # se encuentra asociado al nuevo Equipo.
#                 numero_serie_data['modelo'] = "equipo"
#                 numero_serie_data['object_id'] = equipo.id
#                 item.numero_serie = numero_serie_data
#                 item.save()
#             else:
#                 # Opcional: podrías registrar un log o manejar el caso en que no se encuentre la serie.
#                 pass

#         return Response(serializer.data, status=status.HTTP_201_CREATED)