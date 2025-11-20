import io

from bodegas.models import Compra
from core.models import PersonalizacionUsuario
from cuentas.functions import obtener_usuario_empresa
from django.contrib.contenttypes.models import ContentType
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from empresas.models import UsuarioEmpresa

# from ordentrabajo.models import DetalleGastoRendicionOT  # TEMPORAL - V1 desactivada
# from ordentrabajo.serializers import DetalleGastoRendicionOTSerializer  # TEMPORAL - V1 desactivada
from ordentrabajov2.models import RendicionEnOt  # V2
from ordentrabajov2.serializers import RendicionEnOtSerializer  # V2
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .functions import generar_rendicion_pdf
from .models import (
    CategoriaGastoRendicion,
    DetalleGastoRendicion,
    ItemRendicion,
    Rendicion,
)
from .serializers import (
    CategoriaGastoRendicionSerializer,
    CompraRendicionSerializer,
    DetalleGastoRendicionSerializer,
    ItemRendicionSerializer,
    RendicionSerializer,
)


class CategoriaGastoRendicionViewSet(viewsets.ModelViewSet):
    queryset = CategoriaGastoRendicion.objects.all()
    serializer_class = CategoriaGastoRendicionSerializer


class DetalleGastoRendicionViewSet(viewsets.ModelViewSet):
    queryset = DetalleGastoRendicion.objects.all()
    serializer_class = DetalleGastoRendicionSerializer


class RendicionViewSet(viewsets.ModelViewSet):
    queryset = Rendicion.objects.all()
    serializer_class = RendicionSerializer

    @action(detail=False, methods=["get"], url_path="mis-rendiciones")
    def mis_rendiciones(self, request):
        usuario = request.user
        try:
            usuario_empresa = UsuarioEmpresa.objects.get(usuario=usuario)
        except UsuarioEmpresa.DoesNotExist:
            return Response({"detail": "UsuarioEmpresa no encontrado."}, status=404)

        rendiciones = self.queryset.filter(usuario=usuario_empresa)
        serializer = self.get_serializer(rendiciones, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="rendiciones-sucursal")
    def rendiciones_sucursal(self, request):
        usuario = request.user
        try:
            personalizacion = PersonalizacionUsuario.objects.get(usuario=usuario)
            sucursal = personalizacion.sucursal_principal
            if not sucursal:
                return Response(
                    {"detail": "Sucursal principal no seleccionada."}, status=400
                )
        except PersonalizacionUsuario.DoesNotExist:
            return Response(
                {"detail": "Personalización del usuario no encontrada."}, status=404
            )

        rendiciones = self.queryset.filter(usuario__sucursal=sucursal)
        serializer = self.get_serializer(rendiciones, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="descargar-pdf")
    def descargar_pdf(self, request, pk=None):
        """
        Genera y devuelve el PDF de la rendición solicitada.
        """
        # Obtenemos la rendición a través del detalle
        rendicion = self.get_object()
        try:
            usuario_empresa = UsuarioEmpresa.objects.get(usuario=request.user)
        except UsuarioEmpresa.DoesNotExist:
            return Response({"detail": "UsuarioEmpresa no encontrado."}, status=404)

        # Creamos un buffer para almacenar el PDF
        buffer = io.BytesIO()

        # Preparar los datos de la tabla para la rendición.
        # La primera fila es el encabezado y luego cada detalle se agrega en una fila.
        header = [
            "Categoría",
            "Detalle",
            "Cantidad",
            "Monto Unitario",
            "Monto Total",
            "Fecha Gasto",
        ]
        datos_tabla = [header]
        for detalle in rendicion.detallegastorendicion_set.all():
            row = [
                str(detalle.categoria.nombre) if detalle.categoria else "",
                detalle.detalle or "",
                str(detalle.cantidad),
                f"${detalle.monto_unitario:.2f}",
                f"${detalle.monto_total:.2f}",
                detalle.fecha_gasto.strftime("%d-%m-%Y") if detalle.fecha_gasto else "",
            ]
            datos_tabla.append(row)

        # Datos de la empresa (puedes extraerlos de otro modelo o configuración)
        nombre_empresa = usuario_empresa.sucursal.empresa.nombre
        rut_empresa = usuario_empresa.sucursal.empresa.rut_empresa
        direccion_empresa = usuario_empresa.sucursal.empresa.direccion_principal
        telefono_empresa = usuario_empresa.sucursal.empresa.telefono
        email_empresa = usuario_empresa.sucursal.empresa.email
        sitio_web_empresa = usuario_empresa.sucursal.empresa.sitio_web

        # Fecha de la rendición e ID (u otro identificador)
        fecha_rendicion = (
            rendicion.fecha_rendicion.strftime("%d-%m-%Y")
            if rendicion.fecha_rendicion
            else ""
        )
        id_rendicion = str(rendicion.id)

        # Llamamos a la función que genera el PDF
        generar_rendicion_pdf(
            nombre_empresa,
            rut_empresa,
            direccion_empresa,
            telefono_empresa,
            email_empresa,
            sitio_web_empresa,
            fecha_rendicion,
            id_rendicion,
            usuario_empresa,
            rendicion,
            datos_tabla,
            buffer,
        )

        buffer.seek(0)
        response = HttpResponse(buffer, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="rendicion_{id_rendicion}.pdf"'
        )
        return response

    @action(detail=False, methods=["get"], url_path="detalles-ot-libres")
    def detalles_ot_libres(self, request):
        """
        Listado de RendicionEnOt (V2) que aún no han sido rendidos
        (es decir, no existen en ningún ItemRendicion).
        """
        # obtengo el ContentType para RendicionEnOt
        ct_ot = ContentType.objects.get_for_model(RendicionEnOt)
        # IDs de RendicionEnOt ya usados en algún ItemRendicion
        usados = ItemRendicion.objects.filter(content_type=ct_ot).values_list(
            "detalle_id", flat=True
        )
        # filtro los que NO estén en esa lista
        libres = RendicionEnOt.objects.exclude(pk__in=usados)

        serializer = RendicionEnOtSerializer(libres, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="compras-libres")
    def compras_libres(self, request):
        """
        Lista las Compras (bodegas.Compra) con estado='1'
        que NO están referenciadas en ningún ItemRendicion.
        """
        # 1. Obtén el ContentType para Compra
        ct_compra = ContentType.objects.get(app_label="bodegas", model="compra")
        user = obtener_usuario_empresa(request.user)

        # 2. Averigua qué IDs de Compra ya están en ItemRendicion
        usados = ItemRendicion.objects.filter(content_type=ct_compra).values_list(
            "detalle_id", flat=True
        )

        # 3. Filtra las Compras con estado='1' y excluye las ya usadas
        compras_disponibles = Compra.objects.filter(
            estado="1", sucursal=user.sucursal
        ).exclude(pk__in=usados)

        serializer = CompraRendicionSerializer(compras_disponibles, many=True)
        return Response(serializer.data)


class ItemRendicionViewSet(viewsets.ModelViewSet):
    queryset = ItemRendicion.objects.all()
    serializer_class = ItemRendicionSerializer

    def get_queryset(self):
        rendicion_id = self.kwargs.get("rendicion_pk")
        if rendicion_id:
            return ItemRendicion.objects.filter(rendicion_id=rendicion_id)
        return ItemRendicion.objects.all()

    @action(detail=False, methods=["post"], url_path="crear-item")
    def create_item(self, request, rendicion_pk=None):
        rendicion = get_object_or_404(Rendicion, pk=rendicion_pk)
        ct_id = request.data.get("content_type")

        if ct_id:
            ct = get_object_or_404(ContentType, pk=ct_id)
            # Compra: buscamos por 'codigo' en lugar de por ID
            if ct.app_label == "bodegas" and ct.model == "compra":
                codigo = request.data.get("detalle_id")
                if not codigo:
                    return Response(
                        {"detail": "Debe enviar el campo 'codigo' para una Compra."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                compra = get_object_or_404(Compra, codigo=codigo)
                item = ItemRendicion.objects.create(
                    rendicion=rendicion, content_type=ct, detalle_id=compra.pk
                )
                return Response(
                    ItemRendicionSerializer(item).data, status=status.HTTP_201_CREATED
                )

            # Gastos OT V2 o internos: uso directo de detalle_id
            if (ct.app_label, ct.model) in {
                ("ordentrabajov2", "rendicionenot"),  # V2
                ("rendiciones", "detallegastorendicion"),
            }:
                detalle_id = request.data.get("detalle_id")
                if not detalle_id:
                    return Response(
                        {"detail": "Debe enviar 'detalle_id' para este tipo de item."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                item = ItemRendicion.objects.create(
                    rendicion=rendicion, content_type=ct, detalle_id=detalle_id
                )
                return Response(
                    ItemRendicionSerializer(item).data, status=status.HTTP_201_CREATED
                )

            return Response(
                {"detail": "ContentType no válido para ItemRendicion."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Caso B: creación de DetalleGastoRendicion
        det_data = {
            "categoria": request.data.get("categoria"),
            "detalle": request.data.get("detalle"),
            "cantidad": request.data.get("cantidad"),
            "monto_unitario": request.data.get("monto_unitario"),
            "fecha_gasto": request.data.get("fecha_gasto"),
        }
        det_ser = DetalleGastoRendicionSerializer(data=det_data)
        det_ser.is_valid(raise_exception=True)
        nuevo = det_ser.save()

        ct_det = ContentType.objects.get_for_model(DetalleGastoRendicion)
        item = ItemRendicion.objects.create(
            rendicion=rendicion, content_type=ct_det, detalle_id=nuevo.pk
        )
        return Response(
            ItemRendicionSerializer(item).data, status=status.HTTP_201_CREATED
        )
