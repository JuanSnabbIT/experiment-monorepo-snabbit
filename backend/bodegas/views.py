import os
from io import BytesIO

from core.models import PersonalizacionUsuario
from core.tasks import send_email_task
from cuentas.functions import obtener_usuario_empresa
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Count, F, Q
from django.http import HttpResponse
from django.utils.timezone import now, timedelta
from django_filters.rest_framework import DjangoFilterBackend
from dotenv import load_dotenv
from empresas.models import Empresa, RelacionEmpresa, UsuarioEmpresa
from items.models import ItemEmpresa
from items.serializers import ImagenItemSerializer, ItemEmpresaSerializer
from ordentrabajov2.models import OrdenDeTrabajo, SoporteTecnico
from recursos.models import Equipo
from recursos.serializers import EquipoSerializer
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .estados_modelo import ESTADOS_OC
from .filters import TomaInventarioFilter
from .functions import (
    crear_equipos_para_items_guia,
    generar_orden_de_compra,
    generar_pdf_bodega,
    generar_pdf_bodega_resumido,
)
from .models import (
    ArchivoCompra,
    Bodega,
    Compra,
    EstadoTomaInventario,
    GuiaSalida,
    ImagenDeItemEnTomaInventario,
    ItemEnCompra,
    ItemEnOrdenCompra,
    ItemEnTomaInventario,
    ItemOrdenCompraEnStock,
    ItemsGuiaSalida,
    MovimientoStock,
    OrdenCompra,
    StockItemEnBodega,
    TomaInventario,
    VoucherDevolucion,
    MovimientoEnVoucher,
)
from .movimientos import (
    registrar_ajuste_inventario,
    registrar_devolucion,
    registrar_entrada,
    registrar_salida,
)
from .serializers import (
    AjusteStockSerializer,
    ArchivoCompraSerializer,
    BodegaSerializer,
    CompraCreateSerializer,
    CompraSerializer,
    EstadoTomaInventarioSerializer,
    GuiaSalidaSerializer,
    ImagenDeItemEnTomaInventarioSerializer,
    ItemEnCompraSerializer,
    ItemEnOrdenCompraSerializer,
    ItemEnTomaInventarioSerializer,
    ItemOrdenCompraEnStockSerializer,
    ItemsGuiaSalidaSerializer,
    MovimientoStockSerializer,
    MultipleImagenesSerializer,
    OrdenCompraCreateSerializer,
    OrdenCompraSerializer,
    StockInicialSerializer,
    StockItemEnBodegaSerializer,
    TomaInventarioCrearSerializer,
    TomaInventarioSerializer,
    VoucherDevolucionSerializer,
    MovimientoEnVoucherSerializer,
)

load_dotenv()


class BodegaViewSet(viewsets.ModelViewSet):
    queryset = Bodega.objects.all()
    serializer_class = BodegaSerializer

    def get_queryset(self):
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if personalizacion and personalizacion.sucursal_principal:
            return Bodega.objects.filter(sucursal=personalizacion.sucursal_principal)
        return Bodega.objects.none()

    @action(
        detail=False, methods=["get"], url_path="por-empresa/(?P<empresa_id>[^/.]+)"
    )
    def por_empresa(self, request, empresa_id=None):
        try:
            # Validar que la empresa exista
            empresa = Empresa.objects.get(pk=empresa_id)
        except Empresa.DoesNotExist:
            return Response(
                {"detail": "La empresa especificada no existe."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Filtrar las bodegas relacionadas con las sucursales de la empresa
        bodegas = Bodega.objects.filter(sucursal__empresa=empresa)
        serializer = self.get_serializer(bodegas, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="guias-salida")
    def listar_guias_salida(self, request, pk=None):
        """
        Listar las guías de salida de una bodega específica.
        """
        try:
            bodega = self.get_object()  # Obtiene la bodega según el `pk`
            guias_salida = GuiaSalida.objects.filter(bodega=bodega)
            serializer = GuiaSalidaSerializer(guias_salida, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Bodega.DoesNotExist:
            return Response(
                {"error": "Bodega no encontrada."}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=["get"], url_path="generar-pdf")
    def generar_pdf(self, request, pk=None):
        # Validaciones y obtención de datos
        try:
            bodega = self.get_object()
        except Bodega.DoesNotExist:
            return Response({"detail": "Bodega no encontrada."}, status=404)

        stock_items = StockItemEnBodega.objects.filter(bodega=bodega).select_related(
            "item__fabricante", "item__categoria"
        )
        if not stock_items.exists():
            return Response(
                {"detail": "La bodega no tiene items en stock."}, status=400
            )

        # Procesar datos
        datos_bodega = {"nombre": bodega.nombre, "items": []}
        for stock in stock_items:
            item = stock.item
            proveedores = ", ".join([p.nombre for p in item.proveedores_empresa.all()])
            datos_bodega["items"].append(
                {
                    "nombre": item.nombre,
                    "categoria": (
                        item.categoria.nombre if item.categoria else "Sin categoría"
                    ),
                    "fabricante": (
                        item.fabricante.nombre if item.fabricante else "Sin fabricante"
                    ),
                    "cantidad": stock.cantidad,
                    "pmp": stock.pmp,
                    "proveedores": proveedores,
                }
            )

        # Generar el PDF
        pdf_buffer = generar_pdf_bodega(datos_bodega)

        # Devolver el PDF como respuesta
        response = HttpResponse(pdf_buffer, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="bodega_{bodega.nombre}.pdf"'
        )
        return response

    @action(detail=True, methods=["get"], url_path="generar-pdf-resumido")
    def generar_pdf_resumido(self, request, pk=None):
        """
        Genera un PDF agrupando los ítems de la bodega por categoría.
        """
        # Validación: Verificar si la bodega existe
        try:
            bodega = self.get_object()
        except Bodega.DoesNotExist:
            return Response({"detail": "Bodega no encontrada."}, status=404)

        # Validación: Verificar si tiene items en stock
        stock_items = StockItemEnBodega.objects.filter(bodega=bodega).select_related(
            "item__fabricante", "item__categoria"
        )
        if not stock_items.exists():
            return Response(
                {"detail": "La bodega no tiene ítems en stock."}, status=400
            )

        # Procesar datos
        datos_bodega = {"nombre": bodega.nombre, "items": []}
        for stock in stock_items:
            item = stock.item
            datos_bodega["items"].append(
                {
                    "nombre": item.nombre,
                    "categoria": (
                        item.categoria.nombre if item.categoria else "Sin categoría"
                    ),
                    "cantidad": stock.cantidad,
                    "pmp": stock.pmp,
                }
            )

        # Generar el PDF
        pdf_buffer = generar_pdf_bodega_resumido(datos_bodega)

        # Devolver el PDF como respuesta
        response = HttpResponse(pdf_buffer, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="reporte_categorias_bodega_{bodega.nombre}.pdf"'
        )
        return response


class TomaInventarioViewSet(viewsets.ModelViewSet):
    queryset = TomaInventario.objects.all().prefetch_related(
        "bodegas", "creado_por__usuario"
    )
    serializer_class = TomaInventarioSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = TomaInventarioFilter

    def get_queryset(self):
        bodega_id = self.kwargs.get("bodega_pk")
        if bodega_id is not None:
            return TomaInventario.objects.filter(bodegas__pk=bodega_id).distinct()
        return super().get_queryset()

    @action(detail=False, methods=["post"], url_path="crear")
    def crear_toma_inventario(self, request):
        usuario = obtener_usuario_empresa(request.user)
        data = {
            "bodegas": request.data.get("bodegas"),
            "motivo": request.data.get("motivo"),
        }
        serializer = TomaInventarioCrearSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        #  ➜ IDs de bodegas que vienen en el body
        bodegas_ids = serializer.validated_data.pop("bodegas")

        with transaction.atomic():
            # 1️⃣ Crear la toma
            toma = TomaInventario.objects.create(
                creado_por=usuario, **serializer.validated_data
            )
            toma.bodegas.set(bodegas_ids)

            # 2️⃣ Buscar stock > 0
            stock_qs = StockItemEnBodega.objects.filter(
                bodega__in=bodegas_ids, cantidad__gt=0
            ).select_related("bodega", "item")

            # 3️⃣ Bulk-create de items en la toma
            ItemEnTomaInventario.objects.bulk_create(
                [
                    ItemEnTomaInventario(
                        toma_inventario=toma,
                        stock_item=stock,
                        cantidad_original=stock.cantidad,
                        cantidad_encontrada=0,  # se llenará más adelante
                    )
                    for stock in stock_qs
                ]
            )

            # 4️⃣ Primer estado “pendiente”
            EstadoTomaInventario.objects.create(
                toma_inventario=toma,
                estado="pendiente",
                usuario=usuario,
                fecha_cambio=request.data.get("fecha_cambio"),
            )

        # 5️⃣ Respuesta
        out = self.get_serializer(toma)
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="items")
    def items_en_toma(self, request, pk=None):
        """
        Devuelve los ItemEnTomaInventario asociados a esta TomaInventario
        GET /tomas-inventario/{pk}/items/?estado=por_inventariar
        """
        toma = self.get_object()

        qs = (
            ItemEnTomaInventario.objects.filter(toma_inventario=toma)
            .select_related("stock_item__item", "stock_item__bodega")
            .order_by("stock_item__item__nombre")
        )

        # Filtro opcional por estado (?estado=xx)
        estado = request.query_params.get("estado")
        if estado:
            qs = qs.filter(estado=estado)

        # Paginación estándar DRF
        page = self.paginate_queryset(qs)
        serializer = ItemEnTomaInventarioSerializer(page or qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)

        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="estados")
    def estados_en_toma(self, request, pk=None):
        """
        Devuelve los EstadosTomaInventario de esta toma.
        GET /tomas-inventario/{pk}/estados/?estado=finalizado
        """
        toma = self.get_object()

        # Traemos los estados de esa toma
        qs = toma.estados.select_related(
            "usuario__usuario"
        ).order_by(  # optimiza la FK a UsuarioEmpresa → User
            "-fecha_creacion"
        )  # los más recientes primero

        # Filtro opcional por ?estado=<valor>
        estado_param = request.query_params.get("estado")
        if estado_param:
            qs = qs.filter(estado=estado_param)

        # Paginación estándar DRF
        page = self.paginate_queryset(qs)
        serializer = EstadoTomaInventarioSerializer(page or qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)

        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="cerrar")
    def cerrar(self, request, pk=None, *args, **kwargs):
        """
        Cierra definitivamente la toma de inventario.
        Espera en el body:
        {
          "fecha_cambio": "2025-05-02T15:40:00-04:00",   # opcional
          "observaciones": "Comentario del cierre"       # opcional
        }
        """
        toma = self.get_object()

        # Datos del cuerpo
        fecha_cambio = request.data.get("fecha_cambio") or timezone.now()
        observaciones = request.data.get("observaciones", "")
        # Ajusta según tu autenticación: suponemos que request.user -> UsuarioEmpresa
        usuario = obtener_usuario_empresa(request.user)

        # ContentType para relacionar cada MovimientoStock con el ItemEnTomaInventario
        ct_item_toma = ContentType.objects.get_for_model(ItemEnTomaInventario)

        with transaction.atomic():
            # 1) Registrar estado "cerrado"
            EstadoTomaInventario.objects.create(
                toma_inventario=toma,
                estado="cerrado",
                usuario=usuario,
                fecha_cambio=fecha_cambio,
                observaciones=observaciones,
            )

            # 2–3) Recorrer los ítems inventariados y ajustar stock
            for item_toma in toma.itementomainventario_set.select_related("stock_item"):
                stock_item: StockItemEnBodega = item_toma.stock_item
                if item_toma.cantidad_encontrada != stock_item.cantidad:
                    diferencia = item_toma.cantidad_encontrada - stock_item.cantidad

                    # Actualizar el stock
                    stock_item.cantidad = item_toma.cantidad_encontrada
                    stock_item.save(update_fields=["cantidad"])

                    # Registrar movimiento de ajuste
                    registrar_ajuste_inventario(
                        stock_item=stock_item,
                        usuario=usuario,
                        origen=item_toma,
                        cantidad=item_toma.cantidad_encontrada,
                        descripcion="Items ajustados desde una toma de inventario",
                    )
                    # MovimientoStock.objects.create(
                    #     stock_item=stock_item,
                    #     tipo_movimiento="AJUSTE_INVENTARIO",
                    #     cantidad=diferencia,
                    #     descripcion=f"Ajuste inventario (Toma #{toma.pk})",
                    #     usuario=usuario,
                    #     content_type=ct_item_toma,
                    #     object_id=item_toma.pk,
                    # )

            # 4) Marcar fecha_termino (opcional pero recomendable)
            toma.fecha_termino = fecha_cambio
            toma.save(update_fields=["fecha_termino"])

        # Devuelve la toma con el serializer habitual
        serializer = self.get_serializer(toma)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ItemEnTomaInventarioViewSet(viewsets.ModelViewSet):
    queryset = ItemEnTomaInventario.objects.select_related(
        "stock_item__item", "stock_item__bodega", "toma_inventario"
    )
    serializer_class = ItemEnTomaInventarioSerializer

    @action(
        detail=False,
        methods=["get"],
        url_path="buscar",
        url_name="buscar-por-toma-y-codigo",
    )
    def buscar_por_toma_y_codigo(self, request):
        """
        Devuelve los ItemEnTomaInventario que:
        1. pertenezcan a la toma_inventario indicada,
        2. tengan el código de barras indicado,
        3. sigan con estado 'por_inventariar'.
        Si no hay coincidencias, responde 404.
        """
        # ── Validamos y extraemos parámetros ────────────────────────
        toma_id = request.query_params.get("toma_id")
        codigo = request.query_params.get("codigo")

        if not toma_id or not codigo:
            return Response(
                {"detail": "Debes enviar los parámetros 'toma_id' y 'codigo'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Filtrado principal ──────────────────────────────────────
        qs = self.get_queryset().filter(
            toma_inventario_id=toma_id,
            stock_item__item__codigo_barras=codigo,
            estado="por_inventariar",
        )

        if not qs.exists():
            return Response(
                {
                    "detail": (
                        "No se encontraron ítems con ese código "
                        "en la toma indicada o ya fueron inventariados."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="imagenes")
    def create_imagenes(self, request, pk=None):
        """
        POST /item_en_toma_inventario/{id}/imagenes/
        Body: { "imagenes": ["<base64>", "<base64>", …] }
        """
        item = self.get_object()
        data_serializer = MultipleImagenesSerializer(data=request.data)
        data_serializer.is_valid(raise_exception=True)

        imagenes_data = data_serializer.validated_data["imagenes"]

        with transaction.atomic():
            nuevas_imagenes = [
                ImagenDeItemEnTomaInventario(item=item, imagen=img)
                for img in imagenes_data
            ]
            ImagenDeItemEnTomaInventario.objects.bulk_create(nuevas_imagenes)

        # Refresca para tener los IDs generados
        created_qs = item.imagenes.order_by("-fecha_creacion")[: len(imagenes_data)]
        out_serializer = ImagenDeItemEnTomaInventarioSerializer(
            created_qs, many=True, context=self.get_serializer_context()
        )
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)


class EstadoTomaInventarioViewSet(viewsets.ModelViewSet):
    queryset = EstadoTomaInventario.objects.all()
    serializer_class = EstadoTomaInventarioSerializer


class ImagenDeItemEnTomaInventarioViewSet(viewsets.ModelViewSet):
    queryset = ImagenDeItemEnTomaInventario.objects.all()
    serializer_class = ImagenDeItemEnTomaInventarioSerializer


class OrdenCompraViewSet(viewsets.ModelViewSet):
    queryset = OrdenCompra.objects.all()
    serializer_class = OrdenCompraSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        # Usa un serializador diferente al crear
        if self.action == "create":
            return OrdenCompraCreateSerializer  # Serializador que excluye el campo 'codigo'
        return OrdenCompraSerializer  # Serializador principal para las demás acciones

    @action(detail=False, methods=["get"], url_path="ultimos-eventos")
    def ultimos_eventos(self, request):
        """
        Devuelve los últimos eventos de las últimas 10 Órdenes de Compra.
        """
        # Obtener las últimas 10 órdenes de compra
        ultimas_ordenes = OrdenCompra.objects.order_by("-fecha_modificacion")[:10]

        # Obtener los eventos relevantes
        eventos = []

        for orden_compra in ultimas_ordenes:
            # Agregar eventos de creación de items en la orden de compra
            items_oc = ItemEnOrdenCompra.objects.filter(orden_compra=orden_compra)
            for item in items_oc:
                eventos.append(
                    {
                        "codigo_orden": orden_compra.codigo,
                        "tipo": "Item Agregado",
                        "fecha": item.fecha_creacion,
                        "detalle": f"Item {item.item.nombre} agregado con cantidad {item.cantidad} y precio {item.precio}",
                        "usuario": (
                            orden_compra.creado_por.usuario.get_nombre()
                            if orden_compra.creado_por
                            and orden_compra.creado_por.usuario
                            else "Desconocido"
                        ),
                    }
                )

            # Agregar eventos históricos de la orden de compra
            for history in orden_compra.historia.all():
                eventos.append(
                    {
                        "codigo_orden": orden_compra.codigo,
                        "tipo": "Cambio en Orden de Compra",
                        "fecha": history.history_date,
                        "detalle": f"El estado fue cambiado de {dict(ESTADOS_OC).get(history.prev_record.estado, 'N/A') if history.prev_record else 'N/A'} a {dict(ESTADOS_OC).get(history.estado, 'N/A')}",
                        "usuario": (
                            orden_compra.creado_por.usuario.get_nombre()
                            if orden_compra.creado_por
                            and orden_compra.creado_por.usuario
                            else "Desconocido"
                        ),
                        "observacion": history.history_change_reason,
                    }
                )

        # Ordenar los eventos por fecha (descendente) y limitar a los últimos 10 eventos
        eventos = sorted(eventos, key=lambda x: x["fecha"], reverse=True)[:10]

        return Response(eventos, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def add_item(self, request, pk=None):
        try:
            # Obtener la orden de compra
            orden_compra = self.get_object()

            # Validar los datos del item
            item_id = request.data.get("item")
            cantidad = request.data.get("cantidad")
            precio = request.data.get("precio")

            if not item_id:
                return Response(
                    {"error": "Se requiere item, cantidad y precio"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Crear el ItemEnOrdenCompra
            item_en_orden = ItemEnOrdenCompra.objects.create(
                orden_compra=orden_compra,
                item_id=item_id,
                cantidad=cantidad,
                precio=precio,
            )

            return Response(
                {
                    "message": "Item agregado con éxito",
                    "item_en_orden": {
                        "id": item_en_orden.id,
                        "item": item_en_orden.item.id,
                        "cantidad": item_en_orden.cantidad,
                        "precio": item_en_orden.precio,
                    },
                },
                status=status.HTTP_201_CREATED,
            )
        except OrdenCompra.DoesNotExist:
            return Response(
                {"error": "Orden de compra no encontrada"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"])
    def mis_ordenes(self, request):
        """
        Devuelve las órdenes de compra creadas por el usuario autenticado.
        """
        usuario_empresa = obtener_usuario_empresa(request.user)

        # Filtrar las órdenes de compra creadas por el UsuarioEmpresa
        queryset = self.get_queryset().filter(creado_por=usuario_empresa)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(
        detail=False, methods=["get"], url_path="por-empresa/(?P<empresa_id>[^/.]+)"
    )
    def ordenes_por_empresa(self, request, empresa_id=None):
        """
        Devuelve las órdenes de compra de una empresa específica, con opción de filtrar por estado(s) y cliente(s).
        """
        # Obtener parámetros opcionales de filtro
        estados = request.query_params.getlist(
            "estado", []
        )  # List para permitir múltiples valores
        oc_clientes = request.query_params.getlist(
            "oc_cliente", []
        )  # List para múltiples clientes

        # Construir el queryset base
        queryset = self.get_queryset().filter(
            Q(oc_cliente_id=empresa_id) | Q(oc_empresa_id=empresa_id)
        )

        # Aplicar filtro por estados si se especifica
        if estados:
            queryset = queryset.filter(estado__in=estados)

        # Aplicar filtro por clientes si se especifica
        if oc_clientes:
            queryset = queryset.filter(oc_cliente_id__in=oc_clientes)

        # Serializar y devolver el resultado
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def pasar_enviado_proveedor(self, request, pk=None):
        orden = self.get_object()
        email_destinatario = request.data.get("email")
        reenviar = request.data.get(
            "reenviar", False
        )  # Se espera un booleano para indicar si es un reenvío

        if not email_destinatario:
            return Response(
                {"error": "El campo email es requerido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Construir el mensaje del correo con los detalles de la orden de compra
        asunto = f"Orden de Compra #{orden.codigo}"
        mensaje = f"Estimado, \n\nAdjunto los detalles de la Orden de Compra #{orden.codigo}.\n\n"

        # Obtener los items de la orden de compra
        items = ItemEnOrdenCompra.objects.filter(orden_compra=orden)
        if items.exists():
            mensaje += "<p>Detalles de los items:</p>\n"
            for item in items:
                mensaje += (
                    f"<p>- Item: {item.item.nombre}</p>\n"
                    f"  <p>Cantidad: {item.cantidad}</p>\n"
                    f"  <p>Precio: ${item.precio}</p>\n\n"
                )
        else:
            mensaje += "<p>No se encontraron ítems en la orden de compra.</p>\n"

        # mensaje += "Gracias.\n"

        # remitente = 'tu-correo@ejemplo.com'  # Definir aquí el remitente

        url_boton = f"{os.getenv('FRONTEND_URL')}/detalle-orden-compra/{orden.pk}"

        try:
            send_email_task(
                asunto,
                [email_destinatario],
                mensaje,
                asunto,
                url_boton,
                "Ir a la Orden",
                [],
            )
            # send_email_task(
            #     asunto,
            #     mensaje,
            #     remitente,
            #     [email_destinatario],
            #     fail_silently=False,
            # )
            if not reenviar:  # Cambiar el estado solo si no es un reenvío
                orden.estado = "3"
                orden.save()
            return Response(
                {"message": f"Correo enviado exitosamente a {email_destinatario}"},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {"error": f"Error enviando el correo: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def completar_orden_compra(self, request, pk=None):
        orden = self.get_object()
        estado = request.data.get("estado")
        usuario_empresa = obtener_usuario_empresa(request.user)

        # Validar estado
        if estado not in ["4", "5"]:
            return Response(
                {"error": 'Estado inválido. Debe ser "4" (parcial) o "5" (completa).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Obtener los items de la orden
        items_oc = ItemEnOrdenCompra.objects.filter(orden_compra=orden)
        if not items_oc.exists():
            return Response(
                {"error": "La orden no tiene ítems asociados."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Si es parcial, validar las cantidades
        items_data = request.data.get("items", []) if estado == "4" else []
        items_map = {}
        if estado == "4":
            for item in items_data:
                item_oc_id = item.get("item_oc_id")
                cantidad = item.get("cantidad")
                if not item_oc_id or cantidad is None:
                    return Response(
                        {"error": "Cada item debe tener item_oc_id y cantidad."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                items_map[str(item_oc_id)] = cantidad

        # Validar y procesar cada ítem asociado
        for ioc in items_oc:
            # Obtener el registro correspondiente en ItemOrdenCompraEnStock
            item_oc_en_stock = ItemOrdenCompraEnStock.objects.filter(
                item_oc_id=ioc.id,
                content_type=ContentType.objects.get_for_model(ItemEnOrdenCompra),
            ).first()
            if not item_oc_en_stock:
                return Response(
                    {
                        "error": f"No se encontró un registro en ItemOrdenCompraEnStock para el ítem {ioc.id}"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Obtener la bodega desde bodega_temporal
            bodega = item_oc_en_stock.bodega_temporal
            if not bodega:
                return Response(
                    {
                        "error": f"El ítem {ioc.id} no tiene una bodega temporal asociada."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Determinar la cantidad a ingresar
            cantidad_a_ingresar = (
                ioc.cantidad if estado == "5" else items_map.get(str(ioc.id))
            )
            if cantidad_a_ingresar is None:
                return Response(
                    {
                        "error": f"No se proporcionó cantidad parcial para el ítem {ioc.id}"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                cantidad_a_ingresar = int(cantidad_a_ingresar)
            except ValueError:
                return Response(
                    {
                        "error": f"La cantidad para el ítem {ioc.id} no es un número válido."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Obtener o crear el stock del ítem en la bodega
            stock_item, created = StockItemEnBodega.objects.get_or_create(
                bodega=bodega, item=ioc.item, defaults={"cantidad": 0, "pmp": 0}
            )

            # Actualizar la relación de ItemOrdenCompraEnStock con el nuevo StockItemEnBodega
            item_oc_en_stock.stock_item = stock_item
            item_oc_en_stock.save()

            # BUG FIX: registrar_entrada actualiza stock_item.cantidad automáticamente
            # No hacer stock_item.cantidad += cantidad_a_ingresar antes
            registrar_entrada(
                stock_item=stock_item,
                cantidad=cantidad_a_ingresar,  # BUG FIX: Pasar delta, no saldo total
                usuario=usuario_empresa,
                origen=item_oc_en_stock,
                descripcion="Items añadidos desde una orden de compra",
            )

        # Actualizar el estado de la orden
        orden.estado = estado
        orden.save()

        return Response(
            {"message": "Orden completada con éxito", "estado": estado},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="recientes-por-item")
    def recientes_por_item(self, request):
        """
        Devuelve las órdenes de compra recientes relacionadas con un ítem específico.
        """
        item_id = request.query_params.get("item_id")
        dias = request.query_params.get("dias", 30)  # Por defecto 30 días

        if not item_id:
            return Response(
                {"error": 'El parámetro "item_id" es obligatorio.'}, status=400
            )

        try:
            dias = int(dias)
        except ValueError:
            return Response(
                {"error": 'El parámetro "dias" debe ser un número entero.'}, status=400
            )

        # Obtener la sucursal principal del usuario
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if not personalizacion or not personalizacion.sucursal_principal:
            return Response(
                {"error": "No tiene una sucursal principal asignada."}, status=403
            )

        fecha_limite = now() - timedelta(days=dias)

        # Filtrar las órdenes de compra
        ordenes = OrdenCompra.objects.filter(
            oc_empresa=personalizacion.sucursal_principal.empresa,  # Filtrado por sucursal principal
            itemenordencompra__item_id=item_id,
            fecha_creacion__gte=fecha_limite,
        ).distinct()

        serializer = self.get_serializer(ordenes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def add_item_no_proveedor(self, request, pk=None):
        """
        Agrega un item a una orden de compra específica asociándolo con un proveedor.
        Si el item no está asociado al proveedor, se realiza la asociación automáticamente.
        """
        orden_compra = self.get_object()
        item_id = request.data.get("item_id")
        cantidad = request.data.get("cantidad")
        precio = request.data.get("precio")

        # Validaciones
        if not item_id or not cantidad or not precio:
            raise ValidationError("item_id, cantidad y precio son obligatorios.")

        try:
            item = ItemEmpresa.objects.get(pk=item_id)
        except ItemEmpresa.DoesNotExist:
            return Response(
                {"error": "El item especificado no existe."},
                status=status.HTTP_404_NOT_FOUND,
            )

        proveedor = orden_compra.proveedor

        if not proveedor:
            return Response(
                {"error": "La orden de compra no tiene un proveedor asociado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Asociar el item al proveedor si no está asociado
        if not item.proveedores_empresa.filter(pk=proveedor.pk).exists():
            item.proveedores_empresa.add(proveedor)

        # Crear el ItemEnOrdenCompra
        item_en_orden_compra = ItemEnOrdenCompra.objects.create(
            orden_compra=orden_compra, item=item, cantidad=cantidad, precio=precio
        )

        return Response(
            {
                "message": "Item agregado exitosamente a la orden de compra y asociado al proveedor si era necesario.",
                "item_en_orden_compra": {
                    "id": item_en_orden_compra.id,
                    "item": item.nombre,
                    "cantidad": item_en_orden_compra.cantidad,
                    "precio": item_en_orden_compra.precio,
                },
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="pdf")
    def get_pdf(self, request, pk=None):
        # Obtener la instancia de la orden de compra
        try:
            orden = self.get_object()
        except OrdenCompra.DoesNotExist:
            return Response({"detail": "Orden de compra no encontrada."}, status=404)

        # Obtener los ítems relacionados con la orden de compra
        items = ItemEnOrdenCompra.objects.filter(orden_compra=orden)

        # Crear la tabla de datos dinámicamente
        datos_tabla = [
            ["ARTÍCULO", "DESCRIPCIÓN", "CANTIDAD", "PRECIO UNITARIO", "TOTAL"]
        ]
        for item in items:
            datos_tabla.append(
                [
                    item.item.pk,  # ID o código del artículo
                    item.item.nombre,  # Nombre del artículo
                    item.cantidad,  # Cantidad del artículo
                    f"${item.precio:,.0f}",  # Precio unitario formateado
                    f"${item.cantidad * item.precio:,.0f}",  # Total por artículo formateado
                ]
            )

        # Calcular totales
        neto_orden = sum(item.cantidad * item.precio for item in items)
        iva_orden = neto_orden * 0.19  # Suponiendo 19% de IVA
        total_orden = neto_orden + iva_orden

        # Llamar a la función `generar_orden_de_compra`
        buffer = BytesIO()  # Crear el buffer para el PDF
        generar_orden_de_compra(
            nombre_empresa=orden.oc_empresa.nombre,
            rut_empresa=orden.oc_empresa.rut_empresa,
            direccion_empresa=orden.oc_empresa.direccion_principal,
            telefono_empresa=orden.oc_empresa.telefono,
            email_empresa=orden.oc_empresa.email,
            sitio_web_empresa=orden.oc_empresa.sitio_web,
            fecha_orden=orden.fecha_creacion.strftime("%d-%m-%Y"),
            codigo_orden=orden.codigo,
            nombre_cliente=orden.oc_cliente.nombre,
            telefono_cliente=orden.oc_cliente.telefono,
            direccion_cliente=orden.oc_cliente.direccion_principal,
            rut_cliente=orden.oc_cliente.rut_empresa,
            email_cliente=orden.oc_cliente.email,
            datos_tabla=datos_tabla,
            neto_orden=f"${neto_orden:,.0f}",
            subtotal_orden=f"${neto_orden:,.0f}",  # En este caso el neto y subtotal son iguales
            iva_orden=f"${iva_orden:,.0f}",
            total_orden=f"${total_orden:,.0f}",
            comentarios_orden=orden.observaciones or "Sin observaciones",
            buffer=buffer,
        )

        # Devolver el PDF como respuesta
        buffer.seek(0)
        response = HttpResponse(buffer, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="orden_{orden.pk}.pdf"'

        return response

    @action(detail=False, methods=["get"], url_path="recientes-por-proveedor")
    def recientes_por_proveedor(self, request):
        """
        Devuelve las órdenes de compra recientes relacionadas con un proveedor específico.
        """
        proveedor_id = request.query_params.get("proveedor_id")
        dias = request.query_params.get("dias", 30)  # Por defecto 30 días

        if not proveedor_id:
            return Response(
                {"error": 'El parámetro "proveedor_id" es obligatorio.'}, status=400
            )

        try:
            dias = int(dias)
        except ValueError:
            return Response(
                {"error": 'El parámetro "dias" debe ser un número entero.'}, status=400
            )

        # Obtener la sucursal principal del usuario
        user = request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if not personalizacion or not personalizacion.sucursal_principal:
            return Response(
                {"error": "No tiene una sucursal principal asignada."}, status=403
            )

        fecha_limite = now() - timedelta(days=dias)

        # Filtrar las órdenes de compra asociadas al proveedor especificado
        ordenes = OrdenCompra.objects.filter(
            oc_empresa=personalizacion.sucursal_principal.empresa,  # Filtrado por la empresa de la sucursal principal
            proveedor_id=proveedor_id,
            fecha_creacion__gte=fecha_limite,
        ).distinct()

        serializer = self.get_serializer(ordenes, many=True)
        return Response(serializer.data)


class ItemEnOrdenCompraViewSet(viewsets.ModelViewSet):
    queryset = ItemEnOrdenCompra.objects.all()
    serializer_class = ItemEnOrdenCompraSerializer

    def get_queryset(self):
        return ItemEnOrdenCompra.objects.filter(
            orden_compra_id=self.kwargs["orden_compra_pk"]
        )


class StockItemEnBodegaViewSet(viewsets.ModelViewSet):
    queryset = StockItemEnBodega.objects.all()
    serializer_class = StockItemEnBodegaSerializer

    def get_queryset(self):
        return StockItemEnBodega.objects.filter(bodega_id=self.kwargs["bodega_pk"])

    @action(detail=True, methods=["get"], url_path="ordenes-compra")
    def ordenes_compra(self, request, pk=None, bodega_pk=None):
        """
        Action que retorna los registros de ItemOrdenCompraEnStock asociados al stock item especificado.
        """
        # Obtenemos el stock item a partir del pk y el filtro de bodega.
        stock_item = self.get_object()

        # Filtramos los ItemOrdenCompraEnStock asociados a este stock item.
        ordenes = ItemOrdenCompraEnStock.objects.filter(stock_item=stock_item)

        # Serializamos los datos utilizando el serializer correspondiente.
        serializer = ItemOrdenCompraEnStockSerializer(ordenes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ItemOrdenCompraEnStockViewSet(viewsets.ModelViewSet):
    queryset = ItemOrdenCompraEnStock.objects.all()
    serializer_class = ItemOrdenCompraEnStockSerializer

    @action(detail=False, methods=["get"], url_path="por-orden")
    def por_orden(self, request, orden_compra_pk=None):
        """
        Action para obtener todos los ItemOrdenCompraEnStock de una orden de compra específica.
        """
        # Obtener el ContentType para ItemEnOrdenCompra
        content_type_oc = ContentType.objects.get(
            app_label="bodegas", model="itemenordencompra"
        )

        # Obtener los IDs de los items en la orden de compra específica
        item_en_orden_ids = ItemEnOrdenCompra.objects.filter(
            orden_compra_id=orden_compra_pk
        ).values_list("id", flat=True)

        # Filtrar los elementos de ItemOrdenCompraEnStock que coincidan con estos IDs
        items_oc = self.get_queryset().filter(
            content_type=content_type_oc, item_oc_id__in=item_en_orden_ids
        )

        # Serializar y devolver la respuesta
        serializer = self.get_serializer(items_oc, many=True)
        return Response(serializer.data)


class GuiaSalidaViewSet(viewsets.ModelViewSet):
    queryset = GuiaSalida.objects.all()
    serializer_class = GuiaSalidaSerializer

    def update(self, request, *args, **kwargs):
        """
        Actualiza la guía. Se eliminó la creación automática de OT para permitir
        asociación manual desde trabajos (Soportes/Servicios).
        """
        parcial = kwargs.pop("partial", False)
        return super().update(request, *args, partial=parcial, **kwargs)

    def _validar_cliente_entrega(self, guia: GuiaSalida, usuario: UsuarioEmpresa):
        """
        Valida que el destinatario pertenezca a un cliente del prestador activo.
        Si no hay destinatario, retorna None para permitir flujos donde se define al entregar.
        """
        if not guia.entregado_a:
            return None, None

        empresa_cliente = guia.entregado_a.sucursal.empresa
        empresa_prestador = usuario.sucursal.empresa

        es_cliente = RelacionEmpresa.objects.filter(
            prestador_servicios=empresa_prestador,
            cliente=empresa_cliente,
        ).exists()

        if not es_cliente:
            raise ValidationError(
                "El usuario seleccionado no pertenece a un cliente asociado a tu empresa."
            )

        return empresa_cliente, empresa_prestador

    def _asegurar_ot_desde_guia(self, guia: GuiaSalida, usuario: UsuarioEmpresa):
        """
        Crea (si no existe) la OT y el soporte tecnico inicial vinculados a la guia.
        """
        empresa_cliente, empresa_prestador = self._validar_cliente_entrega(
            guia, usuario
        )
        if not empresa_cliente or not empresa_prestador:
            # Aún no se ha definido el cliente receptor; se pospone la creación de la OT.
            return

        if guia.orden_trabajo_id:
            orden_trabajo = guia.orden_trabajo
        else:
            orden_trabajo = OrdenDeTrabajo.objects.create(
                empresa=empresa_prestador,
                cliente=empresa_cliente,
                tipo_servicio="soporte_p",
                descripcion=f"OT creada automaticamente desde Guia de Salida #{guia.pk}",
                tecnico_responsable_ot=guia.recibido_por,
                cliente_solicitante=guia.entregado_a,
            )
            guia.orden_trabajo = orden_trabajo
            guia.save(update_fields=["orden_trabajo"])

        # Reutilizar el soporte inicial creado por la señal si aún no tiene guía asociada
        soporte = None
        creado = False

        soporte_inicial = (
            SoporteTecnico.objects.filter(orden=orden_trabajo, guia_salida__isnull=True)
            .order_by("id")
            .first()
        )

        if soporte_inicial:
            soporte = soporte_inicial
            soporte.guia_salida = guia
            soporte.nombre = f"Soporte tecnico Guia #{guia.pk}"
            soporte.descripcion = f"Trabajo generado desde Guia de Salida #{guia.pk}"
            soporte.tecnico_asignado = guia.recibido_por
            soporte.save(
                update_fields=[
                    "guia_salida",
                    "nombre",
                    "descripcion",
                    "tecnico_asignado",
                ]
            )
        else:
            soporte, creado = SoporteTecnico.objects.get_or_create(
                guia_salida=guia,
                defaults={
                    "orden": orden_trabajo,
                    "nombre": f"Soporte tecnico Guia #{guia.pk}",
                    "descripcion": f"Trabajo generado desde Guia de Salida #{guia.pk}",
                    "tecnico_asignado": guia.recibido_por,
                },
            )

        if soporte and not creado and soporte.orden_id != orden_trabajo.id:
            soporte.orden = orden_trabajo
            soporte.save(update_fields=["orden"])

    @action(detail=True, methods=["post"], url_path="aprobar-guia")
    def aprobar_guia(self, request, pk=None):
        """
        Aprueba la guía de salida:
        - Verifica que la cantidad rebajada no supere el stock reservado.
        - Rebaja solo `cantidad_no_disponible` en el stock.
        - Registra la salida de inventario.
        - Cambia el estado a 'FR' (Firmada) y guarda la firma de quien recibe.
        (La creación de Equipo se realiza ahora en `comprobar_guia`).
        """
        guia_salida = self.get_object()
        firma_recibido_por = request.data.get("firma_recibido_por", "").strip()
        recibido_por = request.data.get("recibido_por")

        if not firma_recibido_por:
            return Response(
                {"detail": "El campo 'firma_recibido_por' es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario_empresa = obtener_usuario_empresa(request.user)

        try:
            with transaction.atomic():
                if not ItemsGuiaSalida.objects.filter(guia=guia_salida).exists():
                    return Response(
                        {"detail": "No puedes aprobar una guía sin items."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if not guia_salida.entregado_a_id and not recibido_por:
                    return Response(
                        {
                            "detail": "Debes definir un destinatario antes de aprobar la guía."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                soporte = SoporteTecnico.objects.filter(guia_salida=guia_salida).first()
                if soporte:
                    faltantes = []
                    if not soporte.tecnico_asignado_id:
                        faltantes.append("técnico")
                    if not soporte.fecha_soporte:
                        faltantes.append("fecha de soporte")
                    if faltantes:
                        return Response(
                            {
                                "detail": (
                                    "Faltan datos en el soporte ligado: "
                                    + ", ".join(faltantes)
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                # 1) Validar cantidades
                for item_guia in ItemsGuiaSalida.objects.filter(
                    guia=guia_salida
                ).select_related("stock_item"):
                    if (
                        item_guia.cantidad_rebajada
                        > item_guia.stock_item.cantidad_no_disponible
                    ):
                        return Response(
                            {
                                "detail": (
                                    f"La cantidad a rebajar ({item_guia.cantidad_rebajada}) "
                                    f"excede el stock reservado "
                                    f"({item_guia.stock_item.cantidad_no_disponible}) "
                                    f"para el item {item_guia.stock_item.item}."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                # 2) Rebajar cantidad_no_disponible (ya NO se registra salida aquí, se hizo al agregar items)
                for item_guia in ItemsGuiaSalida.objects.filter(guia=guia_salida):
                    stock_item = item_guia.stock_item


                    stock_item.cantidad_no_disponible = max(
                        0,
                        stock_item.cantidad_no_disponible - item_guia.cantidad_rebajada,
                    )
                    stock_item.save()
                    item_guia.save()

                    # NO registrar_salida aquí: ya se registró al agregar el item a la guía

                # 3) Marcar guía firmada (el tránsito lo dispara el inicio del trabajo) y guardar firma
                guia_salida.estado = "FR"
                guia_salida.firma_recibido_por = firma_recibido_por
                if recibido_por:
                    user_recibido = UsuarioEmpresa.objects.get(pk=recibido_por)
                    guia_salida.recibido_por = user_recibido
                guia_salida.save()

            serializer = self.get_serializer(guia_salida)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except ItemsGuiaSalida.DoesNotExist:
            return Response(
                {"detail": "Uno o más ítems no existen en esta guía de salida."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError:
            return Response(
                {"detail": "Cantidad inválida proporcionada."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["post"], url_path="comprobar-guia")
    def comprobar_guia(self, request, pk=None):
        guia_salida = self.get_object()
        usuario = obtener_usuario_empresa(request.user)
        try:
            with transaction.atomic():
                # ---------- VALIDACIONES ----------
                if not guia_salida.itemsguiasalida_set.exists():
                    return Response(
                        {
                            "detail": "La guía no tiene items. Agrega items antes de continuar."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if not guia_salida.entregado_a_id:
                    return Response(
                        {
                            "detail": "Debes asignar un destinatario antes de comprobar la guía."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                for item_guia in guia_salida.itemsguiasalida_set.select_related(
                    "stock_item"
                ):
                    if (
                        item_guia.cantidad_rebajada
                        > item_guia.stock_item.cantidad_no_disponible
                    ):
                        return Response(
                            {
                                "detail": f"La cantidad a rebajar ({item_guia.cantidad_rebajada}) excede el "
                                f"stock comprometido ({item_guia.stock_item.cantidad_no_disponible}) "
                                f"del item {item_guia.stock_item.item}."
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    if item_guia.individualizado:
                        numero_serie = item_guia.numero_serie or {}
                        if not (
                            numero_serie.get("serie")
                            and numero_serie.get("modelo")
                            and numero_serie.get("object_id")
                        ):
                            return Response(
                                {
                                    "detail": f"El item {item_guia.stock_item.item} es individualizado pero su serie "
                                    f"no está completa (serie/modelo/object_id)."
                                },
                                status=status.HTTP_400_BAD_REQUEST,
                            )

                # ---------- CREAR EQUIPOS ----------
                crear_equipos_para_items_guia(guia_salida, usuario)

                # ---------- ACTUALIZAR ESTADO ----------
                guia_salida.estado = "ER"
                guia_salida.save()

            serializer = self.get_serializer(guia_salida)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except ItemsGuiaSalida.DoesNotExist:
            return Response(
                {"detail": "Uno o más ítems no existen en esta guía de salida."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError as e:
            return Response(
                {"detail": "Cantidad inválida proporcionada."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # @action(detail=True, methods=["post"])
    # def devolver_a_bodega(self, request, pk=None):
    #     """
    #     Endpoint personalizado para devolver items a la bodega.
    #     Si no se especifican items, se devuelven todos los items en la guía.
    #     Si se especifican items, solo se devuelven los indicados con sus cantidades.

    #     Espera en el body:
    #     {
    #         "items": [
    #             {"item_guia_id": <id del item en la guía>, "cantidad_a_devolver": <int>},
    #             ...
    #         ]
    #     }
    #     """
    #     guia_salida = self.get_object()
    #     items_data = request.data.get("items", None)

    #     usuario_empresa = obtener_usuario_empresa(request.user)

    #     try:
    #         if items_data is None:
    #             # Devolver todos los items en la guía
    #             for item_guia in ItemsGuiaSalida.objects.filter(guia=guia_salida):
    #                 stock_item = item_guia.stock_item
    #                 stock_item.cantidad += item_guia.cantidad_rebajada
    #                 stock_item.save()

    #                 # Actualizar el registro del ítem
    #                 item_guia.cantidad_devuelta += item_guia.cantidad_rebajada
    #                 # item_guia.cantidad_rebajada = 0
    #                 item_guia.save()

    #                 registrar_devolucion(stock_item=stock_item, cantidad=stock_item.cantidad, usuario=usuario_empresa, origen=item_guia, descripcion="Items devueltos desde una guia de salida")

    #             guia_salida.estado = "R"
    #             guia_salida.save()
    #         else:
    #             # Devolver solo los items especificados
    #             for item_data in items_data:
    #                 item_guia_id = item_data.get("item_guia_id")
    #                 cantidad_a_devolver = item_data.get("cantidad_a_devolver")

    #                 if item_guia_id is None or cantidad_a_devolver is None:
    #                     return Response({"detail": "Cada item debe tener item_guia_id y cantidad_a_devolver."}, status=status.HTTP_400_BAD_REQUEST)

    #                 cantidad_a_devolver = int(cantidad_a_devolver)

    #                 item_guia = ItemsGuiaSalida.objects.get(pk=item_guia_id, guia=guia_salida)
    #                 if cantidad_a_devolver > item_guia.cantidad_rebajada:
    #                     return Response({
    #                         "detail": f"No puedes devolver más de lo que se ha rebajado para el item {item_guia.stock_item.item}."
    #                     }, status=status.HTTP_400_BAD_REQUEST)

    #                 stock_item = item_guia.stock_item
    #                 stock_item.cantidad += cantidad_a_devolver
    #                 stock_item.save()

    #                 # Actualizar el registro del ítem
    #                 item_guia.cantidad_devuelta += cantidad_a_devolver
    #                 # item_guia.cantidad_rebajada -= cantidad_a_devolver
    #                 item_guia.save()

    #                 registrar_devolucion(stock_item=stock_item, cantidad=stock_item.cantidad, usuario=usuario_empresa, origen=item_guia, descripcion="Items devueltos desde una guia de salida")

    #             guia_salida.estado = "PR"
    #             guia_salida.save()

    #         serializer = self.get_serializer(guia_salida)
    #         return Response(serializer.data, status=status.HTTP_200_OK)

    #     except ItemsGuiaSalida.DoesNotExist:
    #         return Response({"detail": "Uno o más items no existen en esta guía de salida."}, status=status.HTTP_404_NOT_FOUND)
    #     except ValueError:
    #         return Response({"detail": "Cantidad inválida proporcionada."}, status=status.HTTP_400_BAD_REQUEST)
    #     except Exception as e:
    #         return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def devolver_a_bodega(self, request, pk=None):
        """
        Devuelve items y libera series de forma atómica.

        - Si no se envía 'items' en el body, devuelve todos los items con su cantidad_rebajada.
        - Si se envía 'items', devuelve sólo los indicados y con la cantidad especificada.
        """
        # Bloqueamos la guía para evitar concurrencia
        guia = GuiaSalida.objects.select_for_update().get(pk=pk)
        items_data = request.data.get("items", None)
        usuario = obtener_usuario_empresa(request.user)

        # Preparamos queryset bloqueado de ItemsGuiaSalida
        if items_data is None:
            items_qs = ItemsGuiaSalida.objects.select_for_update().filter(guia=guia)
        else:
            ids = [int(d.get("item_guia_id")) for d in items_data]
            items_qs = ItemsGuiaSalida.objects.select_for_update().filter(
                guia=guia, pk__in=ids
            )

        try:
            for item in items_qs:
                # Determinar cantidad a devolver
                if items_data is None:
                    devolver = item.cantidad_rebajada
                else:
                    data = next(
                        (
                            d
                            for d in items_data
                            if int(d.get("item_guia_id")) == item.pk
                        ),
                        None,
                    )
                    if not data:
                        return Response(
                            {"detail": f"Item {item.pk} no enviado correctamente."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    devolver = int(data.get("cantidad_a_devolver", 0))
                    max_dev = item.cantidad_rebajada - item.cantidad_devuelta
                    if devolver > max_dev:
                        return Response(
                            {
                                "detail": f"No puedes devolver más de lo rebajado en item {item.pk}."
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                stock = item.stock_item

                # 1) Actualizar registro en ItemsGuiaSalida
                item.cantidad_devuelta += devolver
                item.save()

                # 2) Registrar devolución (suma automática al stock + movimiento)
                registrar_devolucion(
                    stock_item=stock,
                    cantidad=devolver,
                    usuario=usuario,
                    origen=item,
                    descripcion="Devolución desde guía de salida",
                )

                # 3) Eliminar el Equipo asociado a este número de serie
                serie = item.numero_serie.get("serie")
                if serie:
                    Equipo.objects.filter(numero_serie=serie).delete()

                    # 4) Liberar solo 'modelo' y 'object_id' en ItemOrdenCompraEnStock, sin quitar la serie
                    oc_qs = ItemOrdenCompraEnStock.objects.select_for_update().filter(
                        numeros_serie__icontains=serie
                    )
                    for oc in oc_qs:
                        series_list = oc.numeros_serie.get("numeros_serie", [])
                        for s in series_list:
                            if (
                                s.get("serie") == serie
                                and s.get("modelo") == item._meta.model_name
                                and s.get("object_id") == item.pk
                            ):
                                s["modelo"] = ""
                                s["object_id"] = 0
                        oc.numeros_serie["numeros_serie"] = series_list
                        oc.save()

            # 5) Recalcular y guardar estado de la guía basada en ItemsGuiaSalida
            all_items = ItemsGuiaSalida.objects.filter(guia=guia)
            total_reb = sum(i.cantidad_rebajada for i in all_items)
            total_dev = sum(i.cantidad_devuelta for i in all_items)
            if total_dev == total_reb:
                guia.estado = "R"
            elif 0 < total_dev < total_reb:
                guia.estado = "PR"
            guia.save()

            serializer = GuiaSalidaSerializer(guia, context={"request": request})
            return Response(serializer.data, status=status.HTTP_200_OK)

        except ItemsGuiaSalida.DoesNotExist:
            return Response(
                {"detail": "Item(s) no existen en esta guía."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError:
            return Response(
                {"detail": "Cantidad inválida."}, status=status.HTTP_400_BAD_REQUEST
            )
        # Cualquier otra excepción provocará rollback automático

    @action(detail=True, methods=["post"], url_path="agregar-item")
    def agregar_item(self, request, pk=None):
        """
        Agregar un ítem a la guía de salida especificada.
        Espera en el body:
        {
            "stock_item_id": <id del stock item>,
            "cantidad_rebajada": <cantidad>,
            "individualizado": <booleano opcional>
        }
        """
        guia_salida = self.get_object()
        stock_item_id = request.data.get("stock_item_id")
        cantidad_rebajada = request.data.get("cantidad_rebajada")
        individualizado = request.data.get(
            "individualizado", False
        )  # Valor por defecto False
        usuario_empresa = obtener_usuario_empresa(request.user)

        # Validar datos de entrada
        if stock_item_id is None or cantidad_rebajada is None:
            return Response(
                {"detail": "Debes proporcionar stock_item_id y cantidad_rebajada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            cantidad_rebajada = int(cantidad_rebajada)
        except ValueError:
            return Response(
                {"detail": "cantidad_rebajada debe ser un número."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            stock_item = StockItemEnBodega.objects.get(pk=stock_item_id)
        except StockItemEnBodega.DoesNotExist:
            return Response(
                {"detail": "El stock_item_id proporcionado no existe."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if cantidad_rebajada > stock_item.cantidad:
            return Response(
                {"detail": "No puedes rebajar más cantidad de la disponible en stock."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Crear el ítem en la guía de salida incluyendo el campo individualizado
        try:
            item_guia = ItemsGuiaSalida.objects.create(
                guia=guia_salida,
                stock_item=stock_item,
                cantidad_original=stock_item.cantidad,
                cantidad_rebajada=cantidad_rebajada,
                individualizado=individualizado,  # Nuevo campo agregado
            )
            # Actualizar cantidad no disponible (reservada)
            stock_item.cantidad_no_disponible = (
                stock_item.cantidad_no_disponible + cantidad_rebajada
            )
            stock_item.save(update_fields=["cantidad_no_disponible"])

            # BUG FIX: registrar_salida actualiza stock_item.cantidad automáticamente
            registrar_salida(
                stock_item=stock_item,
                cantidad=cantidad_rebajada,
                origen=item_guia,
                usuario=usuario_empresa,
                descripcion="Items añadidos a la guia",
            )

            serializer = ItemsGuiaSalidaSerializer(item_guia)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"detail": f"Error al crear el ítem: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(
        detail=False, methods=["get"], url_path=r"(?P<empresa_id>[^/.]+)/disponibles"
    )
    def guias_disponibles(self, request, empresa_id=None):
        guias = (
            self.get_queryset()
            .filter(estado="ER")
            .filter(bodega__sucursal__empresa=empresa_id)
            .filter(detalletrabajo__isnull=True)
            .filter(visitasoporte__isnull=True)
        )

        serializer = self.get_serializer(guias, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="equipos-guia")
    def equipos_guia(self, request, pk=None):
        guia = self.get_object()

        # 1. Tomamos los ítems de la guía y extraemos sus números de serie
        items = ItemsGuiaSalida.objects.filter(guia=guia)

        # Si usas PostgreSQL ≥ 12 puedes hacerlo en una sola query:
        seriales = list(items.values_list("numero_serie__serie", flat=True))
        # Si tu DB no soporta la lookup de JSONField, itera:
        # seriales = [
        #     it.numero_serie.get("serie")
        #     for it in items
        #     if it.numero_serie and it.numero_serie.get("serie")
        # ]

        # 2. Filtramos equipos:
        #    • estado=True
        #    • cuyo número de serie está en la guía
        #    • que NO tengan usos activos (UsuarioEquipo.estado=True)
        equipos = (
            Equipo.objects.filter(
                numero_serie__in=seriales, estado=True, cliente__isnull=True
            )
            .annotate(
                usos_activos=Count(
                    "usuario_equipo", filter=Q(usuario_equipo__estado=True)
                )
            )
            .filter(usos_activos=0)
            .distinct()
        )

        # 3. Serializamos y devolvemos
        serializer = EquipoSerializer(equipos, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="volver-pendiente")
    @transaction.atomic
    def volver_pendiente(self, request, pk=None):
        guia = self.get_object()

        # 1. Resetear estado de la guía a "P"
        guia.estado = "P"
        guia.save(update_fields=["estado"])

        # 2. Para cada ítem individualizado, borrar el Equipo con esa serie
        items = ItemsGuiaSalida.objects.filter(guia=guia, individualizado=True)
        series_borradas = []

        for item in items:
            data = item.numero_serie or {}
            serie = data.get("serie")
            if not serie:
                continue  # nada que borrar si no hay clave 'serie'

            qs = Equipo.objects.filter(numero_serie=serie)
            if qs.exists():
                # eliminamos y registramos la serie
                qs.delete()
                series_borradas.append(serie)

        return Response(
            {
                "mensaje": 'Guía devuelta a estado "P" y equipos individualizados eliminados.',
                "series_eliminadas": series_borradas,
            },
            status=status.HTTP_200_OK,
        )


class ItemsGuiaSalidaViewSet(viewsets.ModelViewSet):
    queryset = ItemsGuiaSalida.objects.all()
    serializer_class = ItemsGuiaSalidaSerializer

    def get_queryset(self):
        guia = self.kwargs.get("guia_salida_bodega_pk")
        if guia:
            return ItemsGuiaSalida.objects.filter(guia_id=guia)
        return ItemsGuiaSalida.objects.all()

    @action(detail=False, methods=["get"], url_path="filtrar-por-cliente")
    def filtrar_por_cliente(self, request):
        """
        Filtra los items de guía de salida que coincidan con los equipos del cliente.
        """
        cliente_id = request.query_params.get("cliente_id")

        if not cliente_id:
            return Response(
                {"detail": "El parámetro 'cliente_id' es requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Filtrar los items de guía de salida que coinciden con el cliente
        items_guia = ItemsGuiaSalida.objects.filter(guia__cliente_id=cliente_id)
        serializer = self.get_serializer(items_guia, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["delete"], url_path="eliminar-item")
    def eliminar_item(self, request, pk=None, guia_salida_bodega_pk=None):
        """
        Action para eliminar un item de la guía de salida, actualizar el stock en bodega
        y, si el item posee un número de serie, actualizar el JSON en ItemOrdenCompraEnStock
        estableciendo el default (modelo: "", object_id: 0).

        Pasos:
          1. Obtiene el item de la guía.
          2. Actualiza el StockItemEnBodega:
             - Suma a 'cantidad' la cantidad rebajada.
             - Resta a 'cantidad_no_disponible' la misma cantidad.
          3. Si el item posee un número de serie, se busca en ItemOrdenCompraEnStock el registro
             que lo contiene y se resetean 'modelo' y 'object_id' a sus valores default.
          4. Elimina el item de la guía.
        """
        try:
            item_guia = self.get_object()
        except ItemsGuiaSalida.DoesNotExist:
            return Response(
                {"detail": "Item de guía no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        usuario_empresa = obtener_usuario_empresa(request.user)

        # NOTA: No llamamos registrar_devolucion aquí porque el signal pre_delete
        # de ItemsGuiaSalida ya maneja la devolución del stock automáticamente

        # Si el item posee un número de serie en su campo JSON, se resetea en ItemOrdenCompraEnStock
        numero_serie = (
            item_guia.numero_serie
        )  # Estructura simple: { "serie": string, "modelo": string, "object_id": number }
        if numero_serie and numero_serie.get("serie"):
            serie = numero_serie.get("serie")
            # Se buscan los registros de ItemOrdenCompraEnStock asociados al stock
            qs_oc = ItemOrdenCompraEnStock.objects.filter(stock_item=stock_item)
            serie_actualizada = False
            for oc in qs_oc:
                # Se espera que el campo tenga la estructura: {"numeros_serie": [ { "serie": ..., "modelo": ..., "object_id": ... }, ... ]}
                numeros_serie = oc.numeros_serie or {}
                lista_series = numeros_serie.get("numeros_serie", [])
                for entry in lista_series:
                    if (
                        entry.get("serie") == serie
                        and entry.get("modelo") == "itemsguiasalida"
                        and entry.get("object_id") == item_guia.id
                    ):
                        # Se restablece al default
                        entry["modelo"] = ""
                        entry["object_id"] = 0
                        serie_actualizada = True
                if serie_actualizada:
                    numeros_serie["numeros_serie"] = lista_series
                    oc.numeros_serie = numeros_serie
                    oc.save()
                    break

        # Se elimina el item de la guía
        item_guia.delete()

        return Response(
            {
                "detail": "Item eliminado, stock actualizado y serie restablecida correctamente."
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["patch"], url_path="editar-item")
    def editar_item(self, request, pk=None, guia_salida_bodega_pk=None):
        """
        Action para editar un ítem de la guía de salida y actualizar el stock en bodega.

        Se espera recibir en el request un campo 'nueva_cantidad' (entero) que representa
        la nueva cantidad de ítems rebajados.

        Dependiendo de la diferencia (delta) entre la nueva cantidad y la cantidad actual:

        - Si delta es positivo, se toma más stock:
          * Se verifica que haya suficiente stock disponible.
          * Se resta la diferencia de stock_item.cantidad y se suma a stock_item.cantidad_no_disponible.

        - Si delta es negativo, se devuelven ítems al stock:
          * Se suma la diferencia a stock_item.cantidad y se resta de stock_item.cantidad_no_disponible.

        Finalmente, se actualiza el campo 'cantidad_rebajada' del ítem de la guía.
        """
        try:
            item_guia = self.get_object()
        except ItemsGuiaSalida.DoesNotExist:
            return Response(
                {"detail": "Item de guía no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        usuario_empresa = obtener_usuario_empresa(request.user)

        # Validar que se envíe la nueva cantidad
        nueva_cantidad = request.data.get("nueva_cantidad")
        if nueva_cantidad is None:
            return Response(
                {"detail": "El campo 'nueva_cantidad' es requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            nueva_cantidad = int(nueva_cantidad)
        except ValueError:
            return Response(
                {"detail": "El campo 'nueva_cantidad' debe ser un entero."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calcular la diferencia (delta) respecto a la cantidad actual rebajada
        current_cantidad = item_guia.cantidad_rebajada
        delta = nueva_cantidad - current_cantidad

        stock_item = item_guia.stock_item

        # Si se incrementa la cantidad, se requiere tomar más stock
        if delta > 0:
            if stock_item.cantidad < delta:
                return Response(
                    {
                        "detail": "No hay suficiente stock disponible para incrementar la cantidad."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Incrementar cantidad no disponible (reservada)
            stock_item.cantidad_no_disponible += delta
            stock_item.save(update_fields=["cantidad_no_disponible"])
            # BUG FIX: registrar_salida actualiza stock_item.cantidad automáticamente
            registrar_salida(
                stock_item=stock_item,
                cantidad=delta,
                usuario=usuario_empresa,
                origen=item_guia,
                descripcion="Items aumentados en la guia de salida",
            )
        # Si se reduce la cantidad, se devuelven ítems al stock
        elif delta < 0:
            # Liberar cantidad no disponible (reservada)
            stock_item.cantidad_no_disponible = max(
                0, stock_item.cantidad_no_disponible - abs(delta)
            )
            stock_item.save(update_fields=["cantidad_no_disponible"])
            # BUG FIX: registrar_devolucion actualiza stock_item.cantidad automáticamente
            # Usar DEVOLUCION en lugar de ENTRADA para mayor claridad
            registrar_devolucion(
                stock_item=stock_item,
                cantidad=abs(delta),
                usuario=usuario_empresa,
                origen=item_guia,
                descripcion="Items reducidos en la guia de salida (devolución parcial)",
            )
        # Si delta es 0, no hay cambios en el stock

        # Actualizar la cantidad rebajada en el registro del ítem en la guía
        item_guia.cantidad_rebajada = nueva_cantidad
        item_guia.save()

        serializer = self.get_serializer(item_guia)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["patch"], url_path="actualizar-serie")
    def actualizar_serie(self, request, pk=None, guia_salida_bodega_pk=None):
        """
        Action para actualizar el número de serie en el JSON de ItemOrdenCompraEnStock y
        en el campo JSON de ItemsGuiaSalida.

        Se espera recibir en el request:
            { "serie": "<valor_del_numero_de_serie>" }

        En ItemOrdenCompraEnStock se busca la serie dentro de la lista en la clave "numeros_serie".
        En ItemsGuiaSalida, el JSON es una estructura simple:
            { "serie": string, "modelo": string, "object_id": number }

        Antes de actualizar la nueva serie, si existe alguna entrada en cualquier
        ItemOrdenCompraEnStock con 'object_id' igual al id del ItemsGuiaSalida, se resetea a default:
            - modelo: ""
            - object_id: 0

        Luego, se actualiza la entrada que corresponde a la serie enviada.
        """
        serie = request.data.get("serie")
        if not serie:
            return Response(
                {"detail": "El campo 'serie' es requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Obtenemos el ItemsGuiaSalida actual y su stock asociado.
        item_guia = self.get_object()
        stock_item = item_guia.stock_item

        # Consultamos los registros de ItemOrdenCompraEnStock asociados a este stock.
        qs_oc = ItemOrdenCompraEnStock.objects.filter(stock_item=stock_item)

        # Primero: Reseteamos a default cualquier entrada que tenga object_id igual a item_guia.id.
        for oc in qs_oc:
            numeros_serie = oc.numeros_serie or {}
            lista_series = numeros_serie.get("numeros_serie", [])
            modified = False
            for entry in lista_series:
                if entry.get("object_id") == item_guia.id:
                    entry["modelo"] = ""
                    entry["object_id"] = 0
                    modified = True
            if modified:
                numeros_serie["numeros_serie"] = lista_series
                oc.numeros_serie = numeros_serie
                oc.save()

        # Segundo: Buscamos la entrada que corresponde a la serie enviada.
        serie_actualizada = False
        for oc in qs_oc:
            numeros_serie = oc.numeros_serie or {}
            lista_series = numeros_serie.get("numeros_serie", [])
            for entry in lista_series:
                if entry.get("serie") == serie:
                    entry["modelo"] = "itemsguiasalida"
                    entry["object_id"] = item_guia.id
                    serie_actualizada = True
            if serie_actualizada:
                numeros_serie["numeros_serie"] = lista_series
                oc.numeros_serie = numeros_serie
                oc.save()
                break

        if not serie_actualizada:
            return Response(
                {"detail": "Serie no encontrada en ItemOrdenCompraEnStock."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Actualizamos el JSON del ItemsGuiaSalida con la estructura simple.
        item_guia.numero_serie = {
            "serie": serie,
            "modelo": "itemsguiasalida",
            "object_id": item_guia.id,
        }
        item_guia.save()

        return Response(
            {
                "detail": "Serie actualizada correctamente.",
                "data": {
                    "serie": serie,
                    "modelo": "itemsguiasalida",
                    "object_id": item_guia.id,
                },
            },
            status=status.HTTP_200_OK,
        )


class CompraViewSet(viewsets.ModelViewSet):
    queryset = Compra.objects.all()
    serializer_class = CompraSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        # Usa un serializador diferente al crear
        if self.action == "create":
            return CompraCreateSerializer  # Serializador que excluye el campo 'codigo'
        return CompraSerializer  # Serializador principal para las demás acciones

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Compra.objects.none()
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if personalizacion and personalizacion.sucursal_principal:
            qs = Compra.objects.filter(sucursal=personalizacion.sucursal_principal)
        else:
            qs = Compra.objects.none()

        orden_trabajo = self.request.query_params.get("orden_trabajo")
        if orden_trabajo:
            qs = qs.filter(orden_trabajo_id=orden_trabajo)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        usuario_empresa = obtener_usuario_empresa(user)
        sucursal = serializer.validated_data.get("sucursal")

        if not sucursal:
            if usuario_empresa and getattr(usuario_empresa, "sucursal_id", None):
                sucursal = usuario_empresa.sucursal
            else:
                personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
                sucursal = personalizacion.sucursal_principal if personalizacion else None

        if not sucursal:
            raise ValidationError({"sucursal": "No se pudo determinar la sucursal."})

        creado_por = usuario_empresa or serializer.validated_data.get("creado_por")
        serializer.save(creado_por=creado_por, sucursal=sucursal)

    @action(detail=True, methods=["post"], url_path="completar")
    def completar(self, request, pk=None):
        """
        Cambia el estado de la Compra a "1" (Completada).

        Si la compra esta asociada a una OT, solo se cambia el estado.
        Si no esta asociada a OT, se debe indicar la bodega destino para ingresar stock.
        """
        compra = self.get_object()
        usuario_empresa = obtener_usuario_empresa(request.user)
        items_compra = ItemEnCompra.objects.filter(compra=compra)

        if not items_compra.exists():
            raise ValidationError({"detail": "La compra no tiene items para completar."})

        if items_compra.filter(Q(cantidad__lte=0) | Q(precio__lte=0)).exists():
            raise ValidationError(
                {"detail": "Todos los items deben tener cantidad y precio mayor a 0."}
            )

        with transaction.atomic():
            compra.estado = "1"
            compra.save(update_fields=["estado"])

            if compra.orden_trabajo_id:
                serializer = self.get_serializer(compra)
                return Response(serializer.data, status=status.HTTP_200_OK)

            bodega_id = request.data.get("bodega")
            if not bodega_id:
                raise ValidationError({"detail": "Debe indicar bodega para completar la compra."})

            bodega = Bodega.objects.filter(pk=bodega_id).first()
            if not bodega:
                raise ValidationError({"detail": "Bodega no encontrada."})

            for item_en_compra in items_compra:
                articulo = item_en_compra.item
                cantidad = item_en_compra.cantidad

                # Obtener o crear stock_item (SIN modificar cantidad aqui)
                stock_item, created = StockItemEnBodega.objects.get_or_create(
                    item=articulo,
                    bodega=bodega,
                    defaults={
                        "cantidad": 0,
                        "cantidad_no_disponible": 0,
                        "pmp": item_en_compra.precio,
                    },
                )

                # Registrar entrada: SOLO aqui se modifica el stock
                # registrar_entrada espera el DELTA (cantidad a sumar), no el saldo
                registrar_entrada(
                    stock_item=stock_item,
                    cantidad=cantidad,
                    usuario=usuario_empresa,
                    origen=item_en_compra,
                    descripcion="Items anadidos desde una compra",
                )

        serializer = self.get_serializer(compra)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="devolver-a-bodega")
    @transaction.atomic
    def devolver_a_bodega(self, request, pk=None):
        """
        Registra devoluciones de items de una compra hacia una bodega.

        Body esperado:
        {
            "bodega": <id>,
            "items": [
                {"item_en_compra_id": <id>, "cantidad_a_devolver": <int>},
                ...
            ]
        }
        """
        compra = self.get_object()
        usuario_empresa = obtener_usuario_empresa(request.user)
        bodega_id = request.data.get("bodega")
        items_data = request.data.get("items", [])

        if not bodega_id:
            raise ValidationError({"detail": "Debe indicar bodega para devolver items."})

        if not isinstance(items_data, list) or not items_data:
            raise ValidationError({"detail": "Debe enviar items a devolver."})

        bodega = Bodega.objects.filter(pk=bodega_id).first()
        if not bodega:
            raise ValidationError({"detail": "Bodega no encontrada."})

        item_ids = [int(item.get("item_en_compra_id")) for item in items_data]
        items_qs = ItemEnCompra.objects.select_for_update().filter(
            compra=compra, pk__in=item_ids
        )

        if items_qs.count() != len(item_ids):
            raise ValidationError({"detail": "Uno o mas items no existen en esta compra."})

        for item in items_qs:
            data = next(
                (x for x in items_data if int(x.get("item_en_compra_id")) == item.pk),
                None,
            )
            if not data:
                raise ValidationError(
                    {"detail": f"Item {item.pk} no enviado correctamente."}
                )

            cantidad = int(data.get("cantidad_a_devolver", 0))
            if cantidad <= 0:
                raise ValidationError(
                    {"detail": f"La cantidad a devolver debe ser mayor a 0 para item {item.pk}."}
                )

            if cantidad > item.cantidad:
                raise ValidationError(
                    {
                        "detail": f"No puedes devolver mas de lo comprado en item {item.pk}."
                    }
                )

            stock_item, created = StockItemEnBodega.objects.get_or_create(
                item=item.item,
                bodega=bodega,
                defaults={
                    "cantidad": 0,
                    "cantidad_no_disponible": 0,
                    "pmp": item.precio,
                },
            )

            registrar_devolucion(
                stock_item=stock_item,
                cantidad=cantidad,
                usuario=usuario_empresa,
                origen=item,
                descripcion="Devolucion desde compra en OT",
            )

        serializer = self.get_serializer(compra)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ItemEnCompraViewSet(viewsets.ModelViewSet):
    queryset = ItemEnCompra.objects.all()
    serializer_class = ItemEnCompraSerializer

    def get_queryset(self):
        compra = self.kwargs.get("compras_pk")
        if compra:
            return ItemEnCompra.objects.filter(compra=compra)
        return ItemEnCompra.objects.all()

    @action(detail=False, methods=["post"], url_path="crear-item-empresa")
    def crear_item_empresa(self, request, compras_pk=None):
        # Obtiene la compra a partir del parámetro de la URL
        with transaction.atomic():
            compra_pk = self.kwargs.get("compras_pk")
            try:
                compra = Compra.objects.get(pk=compra_pk)
            except Compra.DoesNotExist:
                return Response(
                    {"error": "Compra no encontrada"}, status=status.HTTP_404_NOT_FOUND
                )

            # Se asume que los datos del ItemEmpresa llegan dentro de una key "item_empresa"
            item_empresa_data = request.data.get("item_empresa")
            if not item_empresa_data:
                return Response(
                    {"error": "No se han proporcionado datos para ItemEmpresa."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Crear el ItemEmpresa a partir de sus datos
            item_empresa_serializer = ItemEmpresaSerializer(data=item_empresa_data)
            if item_empresa_serializer.is_valid():
                nuevo_item_empresa = item_empresa_serializer.save()
            else:
                return Response(
                    item_empresa_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                )

            imagenes = request.data.get("imagenes")
            if imagenes:
                for x in imagenes:
                    imagen_serializer = ImagenItemSerializer(
                        data={"imagen": x, "item": nuevo_item_empresa.pk}
                    )
                    if imagen_serializer.is_valid():
                        imagen = imagen_serializer.save()
                    else:
                        return Response(
                            imagen_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                        )

            # Se recuperan los datos adicionales para el ItemEnCompra (por ejemplo, cantidad y precio)
            cantidad = request.data.get("cantidad")
            precio = request.data.get("precio")

            if cantidad is None or precio is None:
                return Response(
                    {
                        "error": "Se requieren los campos cantidad y precio para el ItemEnCompra."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Preparar los datos para el ItemEnCompra
            item_en_compra_data = {
                "compra": compra.pk,
                "item": nuevo_item_empresa.pk,
                "cantidad": cantidad,
                "precio": precio,
            }

            # Serializar y guardar el ItemEnCompra
            item_en_compra_serializer = self.get_serializer(data=item_en_compra_data)
            if item_en_compra_serializer.is_valid():
                item_en_compra_serializer.save()
                return Response(
                    item_en_compra_serializer.data, status=status.HTTP_201_CREATED
                )
            else:
                return Response(
                    item_en_compra_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                )


class ArchivoCompraViewSet(viewsets.ModelViewSet):
    queryset = ArchivoCompra.objects.all()
    serializer_class = ArchivoCompraSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @action(detail=False, methods=["post"], url_path="subir-imagenes")
    def upload_base64_images(self, request):
        """
        Recibe:
          - compra: ID de la Compra a la que se asocian las imágenes.
          - imagenes: lista de strings en base64.
          - (opcional) observaciones: texto.
        Crea un ArchivoCompra por cada base64 con tipo='2'.
        """
        compra_id = request.data.get("compra")
        imagenes = request.data.get("imagenes", [])
        observaciones = request.data.get("observaciones", "")
        opcion = request.data.get("opcion", "boleta")
        user = obtener_usuario_empresa(request.user)

        if not compra_id or not isinstance(imagenes, list) or not imagenes:
            return Response(
                {"detail": "Debe enviar 'compra' y una lista no vacía 'imagenes'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        creados = []
        for b64 in imagenes:
            archivo = ArchivoCompra.objects.create(
                compra_id=compra_id,
                opcion=opcion,
                tipo="2",
                imagen=b64,
                creado_por=user,
                observaciones=observaciones,
            )
            creados.append(archivo)

        serializer = self.get_serializer(creados, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # @action(detail=False, methods=['POST'], url_path='upload')
    # def upload_file(self, request):
    #     """
    #     Acción personalizada que permite subir un archivo o imagen.
    #     Se espera que el frontend envíe un archivo en la clave 'archivo'
    #     o una imagen en la clave 'imagen'. Se pueden validar ambos o definir una
    #     prioridad.
    #     """
    #     # Ejemplo para aceptar 'archivo'; si también deseas procesar 'imagen', puedes agregar lógica similar.
    #     archivo_subido = request.FILES.get('archivo', None)
    #     imagen_data = request.data.get('imagen', None)  # En caso de enviar datos (por ejemplo, base64)

    #     if not archivo_subido and not imagen_data:
    #         return Response(
    #             {"error": "Debe enviar al menos un archivo o una imagen."},
    #             status=status.HTTP_400_BAD_REQUEST
    #         )

    #     # Crear el objeto; en este ejemplo se usa el archivo si se envía, de lo contrario la imagen.
    #     data_to_create = {
    #         "opcion": request.data.get("opcion"),
    #         "compra": request.data.get("compra"),  # Asegúrate de enviar la compra en los datos o definir un valor predeterminado
    #         "tipo": request.data.get("tipo", "1"),
    #         "observaciones": request.data.get("observaciones")
    #     }

    #     if archivo_subido:
    #         data_to_create["archivo"] = archivo_subido
    #     else:
    #         data_to_create["imagen"] = imagen_data

    #     # Si es necesario, agrega el usuario creador a partir del request.user, por ejemplo:
    #     if request.user.is_authenticated:
    #         data_to_create["creado_por"] = request.user.id

    #     serializer = self.get_serializer(data=data_to_create)
    #     if serializer.is_valid():
    #         serializer.save()
    #         return Response(serializer.data, status=status.HTTP_201_CREATED)
    #     else:
    #         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MovimientoStockViewSet(viewsets.ModelViewSet):
    queryset = MovimientoStock.objects.all()
    serializer_class = MovimientoStockSerializer

    @action(detail=False, methods=["post"], url_path="crear-inicial")
    @transaction.atomic
    def crear_inicial(self, request):
        """
        Crea el StockItemEnBodega (si no existe) y registra un movimiento
        de tipo INICIAL con la cantidad indicada.
        """
        s = StockInicialSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        data = s.validated_data
        user = obtener_usuario_empresa(request.user)

        # 1️⃣  Crear el registro de stock
        stock_item = StockItemEnBodega.objects.create(
            bodega=data["bodega"],
            item=data["item"],
            cantidad=data["cantidad"],
            cantidad_no_disponible=0,
        )

        # 2️⃣  Registrar el movimiento tipo INICIAL
        movimiento = MovimientoStock.objects.create(
            stock_item=stock_item,
            tipo_movimiento="INICIAL",
            cantidad=data["cantidad"],
            descripcion="Item iniciado en la bodega",
            usuario=user,
        )

        return Response(
            MovimientoStockSerializer(
                movimiento, context=self.get_serializer_context()
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="crear-ajuste")
    @transaction.atomic
    def crear_ajuste(self, request):
        """
        Registra un movimiento tipo AJUSTE sobre un StockItemEnBodega existente.
        La cantidad puede ser positiva o negativa.
        """
        s = AjusteStockSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        data = s.validated_data
        stock_item = data["stock_item"]
        qty_change = data["cantidad"]
        user = obtener_usuario_empresa(request.user)

        # 1️⃣  Actualizar la cantidad en StockItemEnBodega de forma segura
        StockItemEnBodega.objects.filter(pk=stock_item.pk).update(cantidad=qty_change)

        # Refrescamos para reflejar el nuevo valor
        stock_item.refresh_from_db()

        # 2️⃣  Registrar el movimiento tipo AJUSTE
        movimiento = MovimientoStock.objects.create(
            stock_item=stock_item,
            tipo_movimiento="AJUSTE",
            cantidad=qty_change,
            descripcion=data.get(
                "descripcion", "Item ajustado manualmente en la bodega"
            ),
            usuario=user,
        )

        return Response(
            MovimientoStockSerializer(
                movimiento, context=self.get_serializer_context()
            ).data,
            status=status.HTTP_201_CREATED,
        )


class VoucherDevolucionViewSet(viewsets.ModelViewSet):
    """
    ViewSet de solo lectura para VoucherDevolucion.
    
    Endpoints:
    - GET /api/vouchers-devolucion/ → listar (filtrable por orden_trabajo)
    - GET /api/vouchers-devolucion/{id}/ → detalle JSON
    - GET /api/vouchers-devolucion/{id}/html/ → vista HTML previa
    - GET /api/vouchers-devolucion/{id}/pdf/ → descarga PDF
    """

    class VoucherDevolucionPagination(PageNumberPagination):
        page_size = 20
        page_size_query_param = "page_size"
        max_page_size = 100

    queryset = VoucherDevolucion.objects.select_related('orden_trabajo').prefetch_related(
        'movimientos_voucher__movimiento__stock_item__item',
        'movimientos_voucher__movimiento__stock_item__bodega',
        'movimientos_voucher__movimiento__usuario__usuario'
    )
    serializer_class = VoucherDevolucionSerializer
    pagination_class = VoucherDevolucionPagination
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['orden_trabajo']
    search_fields = ['numero', 'orden_trabajo__id']
    http_method_names = ["get", "post", "head", "options"]
    
    def get_queryset(self):
        """Retorna todos los vouchers de devolución."""
        qs = self.queryset
        try:
            sample = list(qs.values_list('id', flat=True)[:5])
            print(f"[DEBUG] vouchers queryset count={qs.count()} sample_ids={sample}")
        except Exception as exc:  # pragma: no cover
            print(f"[DEBUG] vouchers queryset error: {exc}")
        return qs
    
    def _movimientos_para_orden(self, orden: OrdenDeTrabajo):
        """Obtiene movimientos de devolución asociados a la OT y no ligados a vouchers."""
        ct_guia = ContentType.objects.get_for_model(ItemsGuiaSalida)
        ct_compra = ContentType.objects.get_for_model(ItemEnCompra)

        guia_ids = ItemsGuiaSalida.objects.filter(guia__orden_trabajo=orden).values_list('id', flat=True)
        compra_ids = ItemEnCompra.objects.filter(compra__orden_trabajo=orden).values_list('id', flat=True)

        return (
            MovimientoStock.objects.filter(tipo_movimiento='DEVOLUCION')
            .filter(
                Q(content_type=ct_guia, object_id__in=guia_ids)
                | Q(content_type=ct_compra, object_id__in=compra_ids)
            )
            .exclude(vouchers__orden_trabajo=orden)
            .select_related(
                'stock_item__item', 'stock_item__bodega', 'usuario__usuario'
            )
            .order_by('fecha_creacion', 'id')
        )

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        orden_id = request.data.get('orden_trabajo')
        observaciones = request.data.get('observaciones', '')

        if not orden_id:
            return Response(
                {'detail': 'Debe indicar orden_trabajo'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            orden = OrdenDeTrabajo.objects.get(pk=orden_id)
        except OrdenDeTrabajo.DoesNotExist:
            return Response(
                {'detail': 'Orden de trabajo no encontrada'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if hasattr(orden, 'voucher_devolucion'):
            return Response(
                {
                    'detail': 'Ya existe un voucher para esta orden',
                    'voucher_id': orden.voucher_devolucion.id,
                },
                status=status.HTTP_409_CONFLICT,
            )

        movimientos = list(self._movimientos_para_orden(orden))

        if not movimientos:
            return Response(
                {'detail': 'No hay devoluciones registradas para esta orden de trabajo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        voucher = VoucherDevolucion.objects.create(
            orden_trabajo=orden,
            observaciones=observaciones,
        )

        MovimientoEnVoucher.objects.bulk_create(
            [
                MovimientoEnVoucher(
                    voucher=voucher,
                    movimiento=movimiento,
                    orden=idx,
                )
                for idx, movimiento in enumerate(movimientos, start=1)
            ]
        )

        serializer = self.get_serializer(voucher)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['get'])
    def html(self, request, pk=None):
        """
        Retorna vista HTML previa del voucher.
        
        GET /api/vouchers-devolucion/{id}/html/
        """
        voucher = self.get_object()
        serializer = self.get_serializer(voucher)
        
        # Renderizar template HTML
        from django.template.loader import render_to_string
        from django.http import HttpResponse
        
        html_content = render_to_string('vouchers/devolucion.html', {
            'voucher': voucher,
            'movimientos_agrupados': serializer.data['movimientos_agrupados'],
            'total_items': serializer.data['total_items_devueltos'],
        })
        
        return HttpResponse(html_content, content_type='text/html')
    
    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """
        Genera y descarga PDF del voucher.
        
        GET /api/vouchers-devolucion/{id}/pdf/
        """
        voucher = self.get_object()
        
        # Importar función desde functions.py (patrón del sistema)
        try:
            from bodegas.functions import generar_voucher_devolucion
        except ImportError:
            return Response(
                {'error': 'Módulo de generación PDF no disponible'},
                status=status.HTTP_501_NOT_IMPLEMENTED
            )
        
        # Generar PDF
        try:
            pdf_buffer = generar_voucher_devolucion(voucher.id)
            
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="voucher_{voucher.numero}.pdf"'
            return response
        
        except Exception as e:
            return Response(
                {'error': f'Error al generar PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
