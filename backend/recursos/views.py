from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import *
from .serializers import *


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
    permission_classes = [IsAuthenticated]

    def _empresa_autenticada(self):
        from core.models import PersonalizacionUsuario

        personalizacion = PersonalizacionUsuario.objects.filter(
            usuario=self.request.user
        ).select_related("sucursal_principal__empresa").first()
        if not personalizacion or not personalizacion.sucursal_principal:
            return None
        return personalizacion.sucursal_principal.empresa

    def _tiene_acceso_empresa_objetivo(self, empresa_autenticada, empresa_objetivo):
        from empresas.models import RelacionEmpresa

        if not empresa_autenticada or not empresa_objetivo:
            return False
        if empresa_autenticada.id == empresa_objetivo.id:
            return True
        return RelacionEmpresa.objects.filter(
            prestador_servicios=empresa_autenticada,
            cliente=empresa_objetivo,
        ).exists()

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

        empresa_autenticada = self._empresa_autenticada()
        if not empresa_autenticada:
            return Response(
                {"detail": "Sin permisos para consultar este recurso."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            usuario_empresa = UsuarioEmpresa.objects.select_related(
                "sucursal__empresa"
            ).get(pk=usuario_empresa_pk)
        except UsuarioEmpresa.DoesNotExist:
            return Response(
                {"detail": f"UsuarioEmpresa con id {usuario_empresa_pk} no existe."},
                status=status.HTTP_404_NOT_FOUND
            )

        empresa_usuario_objetivo = getattr(usuario_empresa.sucursal, "empresa", None)
        if not self._tiene_acceso_empresa_objetivo(
            empresa_autenticada=empresa_autenticada,
            empresa_objetivo=empresa_usuario_objetivo,
        ):
            return Response(
                {"detail": "No tiene permisos para ver estos equipos."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Filtrar UsuarioEquipo por el usuario_empresa
        usuario_equipos = UsuarioEquipo.objects.filter(
            usuario=usuario_empresa
        ).select_related('equipo', 'usuario__usuario', 'usuario__sucursal__empresa')

        # Usar el serializer simplificado
        from .serializers import UsuarioEquipoListSerializer
        serializer = UsuarioEquipoListSerializer(usuario_equipos, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="desvincular-desde-detalle")
    def desvincular_desde_detalle(self, request, pk=None):
        from django.contrib.contenttypes.models import ContentType

        from bodegas.models import Bodega, MovimientoStock, SerieItem, StockItemEnBodega
        from bodegas.movimientos import registrar_devolucion
        from empresas.models import UsuarioEmpresa
        from items.models import ItemEmpresa

        try:
            usuario_equipo = UsuarioEquipo.objects.select_related(
                "equipo",
                "usuario__sucursal__empresa",
            ).get(pk=pk)
        except UsuarioEquipo.DoesNotExist:
            return Response(
                {"detail": "UsuarioEquipo no existe."},
                status=status.HTTP_404_NOT_FOUND,
            )

        empresa_autenticada = self._empresa_autenticada()
        if not empresa_autenticada:
            return Response(
                {"detail": "Sin permisos para ejecutar esta accion."},
                status=status.HTTP_403_FORBIDDEN,
            )

        empresa_cliente = getattr(usuario_equipo.usuario.sucursal, "empresa", None)
        if not self._tiene_acceso_empresa_objetivo(
            empresa_autenticada=empresa_autenticada,
            empresa_objetivo=empresa_cliente,
        ):
            return Response(
                {"detail": "No tiene permisos para desvincular este equipo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not usuario_equipo.estado:
            return Response(
                {"detail": "El vinculo de equipo ya esta inactivo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bodega_destino_id = request.data.get("bodega_destino_id")
        if not bodega_destino_id:
            return Response(
                {"detail": 'Debe indicar "bodega_destino_id".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            bodega_destino_id = int(bodega_destino_id)
        except (TypeError, ValueError):
            return Response(
                {"detail": "La bodega destino es invalida."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bodega_destino = Bodega.objects.filter(
            pk=bodega_destino_id,
            sucursal__empresa=empresa_cliente,
        ).select_related("sucursal__empresa").first()
        if not bodega_destino:
            return Response(
                {"detail": "La bodega destino es invalida para este cliente."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        motivo = (request.data.get("motivo") or "").strip()
        serie_equipo = (usuario_equipo.equipo.numero_serie or "").strip()
        serie_resuelta = serie_equipo or f"EQUIPO-{usuario_equipo.equipo_id}-{usuario_equipo.id}"

        with transaction.atomic():
            serie_item = SerieItem.objects.select_related(
                "stock_item__bodega",
                "stock_item__item",
            ).filter(
                serie=serie_resuelta,
                empresa=empresa_cliente,
            ).first()

            autocreado = False
            if serie_item:
                stock_item = serie_item.stock_item
                item_empresa = stock_item.item
                if stock_item.bodega_id != bodega_destino.id:
                    return Response(
                        {"detail": "La traza del equipo existe en una bodega distinta."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                autocreado = True
                nombre_item = " ".join(
                    part
                    for part in [
                        "Equipo",
                        usuario_equipo.equipo.get_tipo_equipo_display(),
                        usuario_equipo.equipo.get_marca_display(),
                        usuario_equipo.equipo.modelo or "",
                    ]
                    if part
                )
                item_empresa = ItemEmpresa.objects.create(
                    nombre=(nombre_item[:250] or f"Equipo {usuario_equipo.equipo_id}"),
                    descripcion_corta=f"Autocreado por devolucion desde UsuarioEquipo #{usuario_equipo.id}",
                    comentarios=f"Serie asociada: {serie_resuelta}",
                    empresa=empresa_cliente,
                    es_equipo=True,
                )
                stock_item = StockItemEnBodega.objects.create(
                    bodega=bodega_destino,
                    item=item_empresa,
                    cantidad=0,
                    cantidad_no_disponible=0,
                )
                serie_item = SerieItem.objects.create(
                    serie=serie_resuelta,
                    stock_item=stock_item,
                    empresa=empresa_cliente,
                    estado="devuelta",
                )

            usuario_solicitante = UsuarioEmpresa.objects.filter(usuario=request.user).first()
            registrar_devolucion(
                stock_item=stock_item,
                cantidad=1,
                usuario=usuario_solicitante,
                origen=usuario_equipo,
                descripcion="Devolucion registrada desde Detalle Usuario Cliente",
            )

            if serie_item.estado != "devuelta":
                serie_item.estado = "devuelta"
                serie_item.save(update_fields=["estado", "fecha_modificacion"])

            usuario_equipo.estado = False
            usuario_equipo.fecha_devolucion = timezone.localdate()
            update_fields = ["estado", "fecha_devolucion", "fecha_modificacion"]
            if motivo:
                observacion_actual = (usuario_equipo.observaciones or "").strip()
                nueva_observacion = (
                    f"[Desvinculacion detalle {timezone.localdate().isoformat()}] {motivo}"
                )
                usuario_equipo.observaciones = (
                    f"{observacion_actual}\n{nueva_observacion}".strip()
                    if observacion_actual
                    else nueva_observacion
                )
                update_fields.append("observaciones")
            usuario_equipo.save(update_fields=update_fields)

            content_type = ContentType.objects.get_for_model(UsuarioEquipo)
            movimiento = MovimientoStock.objects.filter(
                stock_item=stock_item,
                tipo_movimiento="DEVOLUCION",
                content_type=content_type,
                object_id=usuario_equipo.id,
            ).order_by("-fecha_creacion").first()

        return Response(
            {
                "detail": "Equipo desvinculado e ingresado en bodega correctamente.",
                "usuario_equipo": UsuarioEquipoSerializer(usuario_equipo).data,
                "ingreso_bodega": {
                    "bodega_id": bodega_destino.id,
                    "stock_item_id": stock_item.id,
                    "item_id": item_empresa.id,
                    "serie": serie_item.serie,
                    "autocreado": autocreado,
                    "movimiento_stock_id": movimiento.id if movimiento else None,
                    "cantidad_ingresada": 1,
                },
            },
            status=status.HTTP_200_OK,
        )

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
