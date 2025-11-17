from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.decorators import action

from .models import (
    OrdenDeTrabajo,
    SoporteTecnico,
    UsuarioAsignadoSoporte,
    ServicioEnOT,
    HistorialCambiosOrden,
    AdjuntoDeOrden,
    RendicionEnOt,
    CierreAdministrativoOT,
)
from .serializers import (
    OrdenDeTrabajoSerializer,
    SoporteTecnicoSerializer,
    UsuarioAsignadoSoporteSerializer,
    ServicioEnOTSerializer,
    HistorialCambiosOrdenSerializer,
    AdjuntoDeOrdenSerializer,
    RendicionEnOtSerializer,
    CierreAdministrativoOTSerializer,
)


class BaseWriteViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]


class OrdenDeTrabajoViewSet(BaseWriteViewSet):
    queryset = OrdenDeTrabajo.objects.all().order_by('-fecha_creacion')
    serializer_class = OrdenDeTrabajoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        tipo_servicio = self.request.query_params.get('tipo_servicio')
        estado = self.request.query_params.get('estado')
        empresa = self.request.query_params.get('empresa')
        cliente = self.request.query_params.get('cliente')
        if tipo_servicio:
            qs = qs.filter(tipo_servicio=tipo_servicio)
        if estado:
            qs = qs.filter(estado=estado)
        if empresa:
            qs = qs.filter(empresa_id=empresa)
        if cliente:
            qs = qs.filter(cliente_id=cliente)
        return qs

    @action(detail=True, methods=['post'], url_path='cambiar-estado')
    def cambiar_estado(self, request, pk=None):
        orden = self.get_object()
        nuevo_estado = request.data.get('estado')
        if not nuevo_estado:
            return Response({'detail': 'Debe indicar "estado"'}, status=400)
        orden.estado = nuevo_estado
        orden.save()
        return Response(self.get_serializer(orden).data)


class SoporteTecnicoViewSet(BaseWriteViewSet):
    queryset = SoporteTecnico.objects.select_related('orden').all().order_by('-fecha_creacion')
    serializer_class = SoporteTecnicoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Soporte para URLs anidadas bajo /ordenes-trabajo/{orden_trabajo_pk}/soportes/
        orden_trabajo_pk = self.kwargs.get('orden_trabajo_pk')
        if orden_trabajo_pk:
            qs = qs.filter(orden_id=orden_trabajo_pk)
        # Fallback a query param si no es anidado
        orden = self.request.query_params.get('orden')
        if orden:
            qs = qs.filter(orden_id=orden)
        return qs

    def perform_create(self, serializer):
        # Si es ruta anidada, asignar automáticamente la orden
        orden_trabajo_pk = self.kwargs.get('orden_trabajo_pk')
        if orden_trabajo_pk:
            serializer.save(orden_id=orden_trabajo_pk)
        else:
            serializer.save()

    @action(detail=True, methods=['post'], url_path='actualizar-estado')
    def actualizar_estado(self, request, pk=None, orden_trabajo_pk=None):
        soporte = self.get_object()
        nuevo_estado = request.data.get('estado')
        if not nuevo_estado:
            return Response({'detail': 'Debe indicar "estado"'}, status=400)
        soporte.estado = nuevo_estado
        soporte.save()
        return Response(self.get_serializer(soporte).data)


class UsuarioAsignadoSoporteViewSet(BaseWriteViewSet):
    queryset = UsuarioAsignadoSoporte.objects.select_related('soporte_tecnico').all().order_by('-fecha_creacion')
    serializer_class = UsuarioAsignadoSoporteSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Soporte para URLs anidadas bajo /soportes-tecnicos/{soporte_tecnico_pk}/usuarios-asignados/
        soporte_tecnico_pk = self.kwargs.get('soporte_tecnico_pk')
        if soporte_tecnico_pk:
            qs = qs.filter(soporte_tecnico_id=soporte_tecnico_pk)
        # Fallback a query param
        soporte = self.request.query_params.get('soporte')
        if soporte:
            qs = qs.filter(soporte_tecnico_id=soporte)
        return qs

    def perform_create(self, serializer):
        soporte_tecnico_pk = self.kwargs.get('soporte_tecnico_pk')
        if soporte_tecnico_pk:
            serializer.save(soporte_tecnico_id=soporte_tecnico_pk)
        else:
            serializer.save()


class ServicioEnOTViewSet(BaseWriteViewSet):
    queryset = ServicioEnOT.objects.select_related('orden').all().order_by('-fecha_creacion')
    serializer_class = ServicioEnOTSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Soporte para URLs anidadas bajo /ordenes-trabajo/{orden_trabajo_pk}/servicios/
        orden_trabajo_pk = self.kwargs.get('orden_trabajo_pk')
        if orden_trabajo_pk:
            qs = qs.filter(orden_id=orden_trabajo_pk)
        # Fallback a query param
        orden = self.request.query_params.get('orden')
        if orden:
            qs = qs.filter(orden_id=orden)
        return qs

    def perform_create(self, serializer):
        orden_trabajo_pk = self.kwargs.get('orden_trabajo_pk')
        if orden_trabajo_pk:
            serializer.save(orden_id=orden_trabajo_pk)
        else:
            serializer.save()

    @action(detail=True, methods=['post'], url_path='actualizar-estado')
    def actualizar_estado(self, request, pk=None, orden_trabajo_pk=None):
        servicio = self.get_object()
        nuevo_estado = request.data.get('estado')
        if not nuevo_estado:
            return Response({'detail': 'Debe indicar "estado"'}, status=400)
        servicio.estado = nuevo_estado
        servicio.save()
        return Response(self.get_serializer(servicio).data)


class HistorialCambiosOrdenViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = HistorialCambiosOrden.objects.select_related('orden').all().order_by('-fecha_creacion')
    serializer_class = HistorialCambiosOrdenSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Soporte para URLs anidadas bajo /ordenes-trabajo/{orden_trabajo_pk}/historial/
        orden_trabajo_pk = self.kwargs.get('orden_trabajo_pk')
        if orden_trabajo_pk:
            qs = qs.filter(orden_id=orden_trabajo_pk)
        # Fallback a query param
        orden = self.request.query_params.get('orden')
        if orden:
            qs = qs.filter(orden_id=orden)
        return qs


class AdjuntoDeOrdenViewSet(BaseWriteViewSet):
    queryset = AdjuntoDeOrden.objects.select_related('orden').all().order_by('-fecha_creacion')
    serializer_class = AdjuntoDeOrdenSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Soporte para URLs anidadas bajo /ordenes-trabajo/{orden_trabajo_pk}/adjuntos/
        orden_trabajo_pk = self.kwargs.get('orden_trabajo_pk')
        if orden_trabajo_pk:
            qs = qs.filter(orden_id=orden_trabajo_pk)
        # Fallback a query param
        orden = self.request.query_params.get('orden')
        if orden:
            qs = qs.filter(orden_id=orden)
        return qs

    def perform_create(self, serializer):
        orden_trabajo_pk = self.kwargs.get('orden_trabajo_pk')
        if orden_trabajo_pk:
            serializer.save(orden_id=orden_trabajo_pk)
        else:
            serializer.save()


class RendicionEnOtViewSet(BaseWriteViewSet):
    queryset = RendicionEnOt.objects.select_related('orden').all().order_by('-fecha_creacion')
    serializer_class = RendicionEnOtSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Soporte para URLs anidadas bajo /ordenes-trabajo/{orden_trabajo_pk}/rendiciones/
        orden_trabajo_pk = self.kwargs.get('orden_trabajo_pk')
        if orden_trabajo_pk:
            qs = qs.filter(orden_id=orden_trabajo_pk)
        # Fallback a query param
        orden = self.request.query_params.get('orden')
        if orden:
            qs = qs.filter(orden_id=orden)
        return qs

    def perform_create(self, serializer):
        orden_trabajo_pk = self.kwargs.get('orden_trabajo_pk')
        if orden_trabajo_pk:
            serializer.save(orden_id=orden_trabajo_pk)
        else:
            serializer.save()


class CierreAdministrativoOTViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = CierreAdministrativoOT.objects.select_related('orden').all().order_by('-fecha_creacion')
    serializer_class = CierreAdministrativoOTSerializer

    http_method_names = ['get', 'patch', 'head', 'options']  # evitar crear/borrar manualmente

    def get_queryset(self):
        qs = super().get_queryset()
        # Soporte para URLs anidadas bajo /ordenes-trabajo/{orden_trabajo_pk}/cierre/
        orden_trabajo_pk = self.kwargs.get('orden_trabajo_pk')
        if orden_trabajo_pk:
            qs = qs.filter(orden_id=orden_trabajo_pk)
        # Fallback a query param
        orden = self.request.query_params.get('orden')
        if orden:
            qs = qs.filter(orden_id=orden)
        return qs
