from bodegas.models import MovimientoStock
from bodegas.serializers import MovimientoStockSerializer
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import *
from .serializers import *


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer


class FabricanteViewSet(viewsets.ModelViewSet):
    queryset = Fabricante.objects.all()
    serializer_class = FabricanteSerializer


# class ProveedorViewSet(viewsets.ModelViewSet):
#     queryset = Proveedor.objects.all()
#     serializer_class = ProveedorSerializer

#     @action(detail=False, methods=['get'], url_path='no-asociados/(?P<empresa_pk>[^/.]+)')
#     def no_asociados(self, request, empresa_pk=None):
#         # Obtener los proveedores que no están asociados a la empresa
#         proveedores_asociados = ProveedorEmpresa.objects.filter(empresa_id=empresa_pk).values_list('proveedor_id', flat=True)
#         proveedores_no_asociados = Proveedor.objects.exclude(id__in=proveedores_asociados)

#         # Serializar y devolver la respuesta
#         serializer = self.get_serializer(proveedores_no_asociados, many=True)
#         return Response(serializer.data)


class ProveedorEmpresaViewSet(viewsets.ModelViewSet):
    serializer_class = ProveedorEmpresaSerializer

    def get_queryset(self):
        empresa_pk = self.kwargs.get("empresa_pk")
        if empresa_pk:
            return ProveedorEmpresa.objects.filter(empresa_id=empresa_pk)
        return ProveedorEmpresa.objects.all()

    @action(detail=True, methods=["post"], url_path="asociar-items")
    def asociar_items(self, request, pk=None):
        # Obtener el proveedor especificado
        proveedor = get_object_or_404(ProveedorEmpresa, pk=pk)

        # Obtener los pks de los items desde el body de la solicitud
        items_pks = request.data.get("items", [])

        if not items_pks or not isinstance(items_pks, list):
            return Response(
                {"detail": "Se debe proporcionar una lista de IDs de items válida."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Obtener los items y asociarlos al proveedor
        items = ItemEmpresa.objects.filter(pk__in=items_pks, empresa=proveedor.empresa)

        if not items.exists():
            return Response(
                {"detail": "No se encontraron items válidos para asociar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Asociar los items al proveedor
        for item in items:
            item.proveedores_empresa.add(proveedor)

        return Response(
            {
                "detail": f"Se asociaron {items.count()} items al proveedor {proveedor.nombre}."
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def no_asociados_a_item(self, request):
        """
        Devuelve los proveedores que no están asociados a un item específico.
        """
        item_id = request.query_params.get("item_id")
        if not item_id:
            return Response(
                {"error": "Debe proporcionar un 'item_id' como parámetro."}, status=400
            )

        proveedores = ProveedorEmpresa.objects.exclude(items_proveedor__id=item_id)
        serializer = self.get_serializer(proveedores, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def asociar_item(self, request, pk=None):
        """
        Asocia un item a un proveedor específico.
        """
        proveedor = self.get_object()
        item_id = request.data.get("item_id")

        if not item_id:
            return Response(
                {
                    "error": "Debe proporcionar un 'item_id' en el cuerpo de la solicitud."
                },
                status=400,
            )
        try:
            item = ItemEmpresa.objects.get(id=item_id)
        except ItemEmpresa.DoesNotExist:
            return Response({"error": "Item no encontrado."}, status=404)

        proveedor.items_proveedor.add(item)
        return Response(
            {
                "message": f"Item '{item.nombre}' asociado al proveedor '{proveedor.nombre}'."
            },
            status=200,
        )

    @action(detail=True, methods=["post"], url_path="desasociar_item")
    def desasociar_item(self, request, pk=None):
        """
        Desasocia un item de un proveedor específico.
        """
        proveedor = get_object_or_404(ProveedorEmpresa, pk=pk)
        item_id = request.data.get("item_id")

        if not item_id:
            return Response(
                {
                    "error": "Debe proporcionar un 'item_id' en el cuerpo de la solicitud."
                },
                status=400,
            )

        try:
            item = ItemEmpresa.objects.get(id=item_id)
        except ItemEmpresa.DoesNotExist:
            return Response({"error": "Item no encontrado."}, status=404)

        if item not in proveedor.items_proveedor.all():
            return Response(
                {"error": "El item no está asociado a este proveedor."}, status=400
            )

        proveedor.items_proveedor.remove(item)
        return Response(
            {
                "message": f"Item '{item.nombre}' desasociado del proveedor '{proveedor.nombre}'."
            },
            status=200,
        )

    # @action(detail=False, methods=['post'], url_path='crear-multiples')
    # def crear_multiples_proveedores_empresa(self, request, *args, **kwargs):
    #     # Esperamos una lista de proveedores con sus datos necesarios en el cuerpo del request
    #     proveedores_data = request.data.get('proveedores', [])

    #     if not isinstance(proveedores_data, list):
    #         return Response({"detail": "Datos Invalidos se esperaba una lista"}, status=status.HTTP_400_BAD_REQUEST)

    #     created_proveedores = []
    #     errors = []

    #     for proveedor_data in proveedores_data:
    #         serializer = ProveedorEmpresaSerializer(data=proveedor_data)
    #         if serializer.is_valid():
    #             serializer.save()
    #             created_proveedores.append(serializer.data)
    #         else:
    #             errors.append({"data": proveedor_data, "errors": serializer.errors})

    #     if errors:
    #         return Response({"created": created_proveedores, "errors": errors}, status=status.HTTP_207_MULTI_STATUS)

    #     return Response({"created": created_proveedores}, status=status.HTTP_201_CREATED)

    # @action(detail=False, methods=['get'], url_path='no-asociados-item')
    # def proveedores_no_asociados_item(self, request, *args, **kwargs):
    #     empresa_pk = request.query_params.get('empresa_pk')
    #     item_empresa_pk = request.query_params.get('item_empresa_pk')

    #     if not empresa_pk or not item_empresa_pk:
    #         return Response({"detail": "Debe proporcionar empresa_pk e item_empresa_pk"}, status=status.HTTP_400_BAD_REQUEST)

    #     item_empresa = ItemEmpresa.objects.filter(pk=item_empresa_pk).first()
    #     if not item_empresa:
    #         return Response({"detail": "ItemEmpresa no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    #     proveedores_asociados_ids = item_empresa.proveedores_empresa.values_list('id', flat=True)
    #     proveedores_no_asociados = ProveedorEmpresa.objects.filter(empresa_id=empresa_pk).exclude(id__in=proveedores_asociados_ids)

    #     serializer = self.get_serializer(proveedores_no_asociados, many=True)
    #     return Response(serializer.data, status=status.HTTP_200_OK)

    # @action(detail=False, methods=['post'], url_path='asociar-proveedores-item')
    # def asociar_proveedores_a_item(self, request, pk=None, *args, **kwargs):
    #     item_empresa_pk = request.data.get('item_empresa_pk')
    #     proveedores_ids = request.data.get('proveedores_ids', [])

    #     if not item_empresa_pk or not isinstance(proveedores_ids, list):
    #         return Response({"detail": "Debe proporcionar item_empresa_pk y una lista de proveedores_ids"}, status=status.HTTP_400_BAD_REQUEST)

    #     item_empresa = ItemEmpresa.objects.filter(pk=item_empresa_pk).first()
    #     if not item_empresa:
    #         return Response({"detail": "ItemEmpresa no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    #     proveedores = ProveedorEmpresa.objects.filter(id__in=proveedores_ids, empresa=item_empresa.empresa)
    #     item_empresa.proveedores_empresa.add(*proveedores)

    #     return Response({"detail": "Proveedores asociados exitosamente"}, status=status.HTTP_200_OK)


# class ItemViewSet(viewsets.ModelViewSet):
#     queryset = Item.objects.all()
#     serializer_class = ItemSerializer

#     @action(detail=False, methods=['get'], url_path='no-asociados/(?P<empresa_pk>[^/.]+)')
#     def no_asociados(self, request, empresa_pk=None):
#         # Obtener los proveedores que no están asociados a la empresa
#         items_asociados = ItemEmpresa.objects.filter(empresa_id=empresa_pk).values_list('item_id', flat=True)
#         items_no_asociados = Item.objects.exclude(id__in=items_asociados)

#         # Serializar y devolver la respuesta
#         serializer = self.get_serializer(items_no_asociados, many=True)
#         return Response(serializer.data)


class ImagenItemViewSet(viewsets.ModelViewSet):
    queryset = ImagenItem.objects.all()
    serializer_class = ImagenItemSerializer

    @action(detail=False, methods=["post"], url_path="bulk-create")
    def bulk_create(self, request, *args, **kwargs):
        """
        Crea varias imágenes para un mismo ItemEmpresa.
        Body esperado ⇢ {"item": <id>, "imagenes": [<base64>, …]}
        """
        in_serializer = BulkImagenItemInputSerializer(data=request.data)
        in_serializer.is_valid(raise_exception=True)

        item = in_serializer.validated_data["item"]
        imagenes = in_serializer.validated_data["imagenes"]

        with transaction.atomic():
            objs = [ImagenItem(item=item, imagen=b64) for b64 in imagenes]
            ImagenItem.objects.bulk_create(objs)

        # Podemos reutilizar el serializer de salida
        out_serializer = self.get_serializer(objs, many=True)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)


class ItemEmpresaViewset(viewsets.ModelViewSet):
    queryset = ItemEmpresa.objects.all()
    serializer_class = ItemEmpresaSerializer

    def get_queryset(self):
        empresa_pk = self.kwargs.get("empresa_pk")
        queryset = ItemEmpresa.objects.all()

        if empresa_pk:
            queryset = queryset.filter(empresa_id=empresa_pk)

        categoria_id = self.request.query_params.get("categoria_id")
        if categoria_id:
            queryset = queryset.filter(categoria_id=categoria_id)

        codigo_barras = self.request.query_params.get("codigo_barras")
        if codigo_barras:
            queryset = queryset.filter(codigo_barras=codigo_barras)

        # valor = self.request.query_params.get('valor')
        # if valor:
        #     queryset = queryset.filter(
        #         campoadicionalitem__valor__icontains=valor
        #     ).distinct()

        return queryset

    @action(detail=False, methods=["get"], url_path="items-sin-proveedor")
    def items_sin_proveedor(self, request, *args, **kwargs):
        # Esperamos recibir un proveedor_id en los parámetros del query
        proveedor_id = request.query_params.get("proveedor_id")

        if not proveedor_id:
            return Response(
                {"detail": "El campo 'proveedor_id' es requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            proveedor = ProveedorEmpresa.objects.get(id=proveedor_id)
        except ProveedorEmpresa.DoesNotExist:
            return Response(
                {"detail": "Proveedor no encontrado."}, status=status.HTTP_404_NOT_FOUND
            )

        # Obtener el queryset basado en la empresa actual
        queryset = self.get_queryset().exclude(proveedores_empresa=proveedor)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def asociar_proveedor(self, request, pk=None):
        """
        Asocia un proveedor a un item específico.
        """
        item = self.get_object()
        proveedor_id = request.data.get("proveedor_id")

        if not proveedor_id:
            return Response(
                {
                    "error": "Debe proporcionar un 'proveedor_id' en el cuerpo de la solicitud."
                },
                status=400,
            )

        try:
            proveedor = ProveedorEmpresa.objects.get(id=proveedor_id)
        except ProveedorEmpresa.DoesNotExist:
            return Response({"error": "Proveedor no encontrado."}, status=404)

        item.proveedores_empresa.add(proveedor)
        return Response(
            {
                "message": f"Proveedor '{proveedor.nombre}' asociado al item '{item.nombre}'."
            },
            status=200,
        )

    @action(detail=True, methods=["post"])
    def desasociar_proveedor(self, request, pk=None):
        """
        Desasocia un proveedor de un item específico.
        """
        item = self.get_object()
        proveedor_id = request.data.get("proveedor_id")

        if not proveedor_id:
            return Response(
                {
                    "error": "Debe proporcionar un 'proveedor_id' en el cuerpo de la solicitud."
                },
                status=400,
            )

        try:
            proveedor = ProveedorEmpresa.objects.get(id=proveedor_id)
        except ProveedorEmpresa.DoesNotExist:
            return Response({"error": "Proveedor no encontrado."}, status=404)

        if proveedor not in item.proveedores_empresa.all():
            return Response(
                {"error": "El proveedor no está asociado a este item."}, status=400
            )

        item.proveedores_empresa.remove(proveedor)
        return Response(
            {
                "message": f"Proveedor '{proveedor.nombre}' desasociado del item '{item.nombre}'."
            },
            status=200,
        )

    @action(detail=True, methods=["get"], url_path="movimientos")
    def movimientos_stock(self, request, pk=None, empresa_pk=None):
        """
        Devuelve todos los MovimientoStock que afectan a este ItemEmpresa.
        Si la vista está anidada bajo /empresas/<empresa_pk>/  se filtran
        únicamente los movimientos de las bodegas de esa empresa.

        IMPORTANTE: Este endpoint calcula el saldo acumulado para cada movimiento,
        para que el frontend pueda graficar el stock en el tiempo correctamente.
        """
        item = self.get_object()
        empresa_pk = self.kwargs.get("empresa_pk")

        # Query base: todos los movimientos cuyo stock_item apunte a este ítem
        movimientos_qs = (
            MovimientoStock.objects.filter(stock_item__item=item)
            .select_related(  # para evitar N+1
                "stock_item",
                "stock_item__bodega",
                "stock_item__bodega__sucursal",
                "usuario",
            )
            .order_by("fecha_creacion")  # Ordenar cronológicamente para calcular saldo
        )

        # Si la vista es anidada bajo empresa/<empresa_pk>/, filtra
        if empresa_pk:
            movimientos_qs = movimientos_qs.filter(
                stock_item__bodega__sucursal__empresa_id=empresa_pk
            )

        # Calcular saldo acumulado en cada movimiento
        # IMPORTANTE: Partir del stock inicial real, no de 0
        movimientos_list = list(movimientos_qs)

        if not movimientos_list:
            return Response([])

        # Obtener stock actual y calcular saldo inicial
        # Stock inicial = Stock actual - suma de todos los deltas
        stock_actual = movimientos_list[0].stock_item.cantidad
        suma_deltas = sum(m.cantidad for m in movimientos_list)
        saldo_inicial = stock_actual - suma_deltas

        # Construir respuesta con saldos acumulados
        saldo_acumulado = saldo_inicial
        movimientos_con_saldo = []

        for movimiento in movimientos_list:
            saldo_acumulado += movimiento.cantidad  # cantidad es el delta

            # Serializar movimiento
            serializer = MovimientoStockSerializer(
                movimiento, context={"request": request}
            )
            data = serializer.data

            # Agregar campos adicionales para el gráfico
            data["cantidad_delta"] = movimiento.cantidad
            data["saldo_acumulado"] = saldo_acumulado

            movimientos_con_saldo.append(data)

        return Response(movimientos_con_saldo)

    @action(detail=True, methods=["get"], url_path="proveedores")
    def obtener_proveedores(self, request, pk=None):
        return Response(
            ProveedorEmpresaSerializer(
                self.get_object().proveedores_empresa.all(), many=True
            ).data,
            status=status.HTTP_200_OK,
        )

    # @action(detail=False, methods=['get'], url_path='buscar_por_campo')
    # def buscar_por_campo(self, request, *args, **kwargs):
    #     """
    #     Busca los ítems de la empresa indicada (empresa_pk) cuyo valor en algún
    #     CampoAdicionalItem contenga (case-insensitive) la cadena pasada por ?valor=...
    #     """
    #     empresa_pk = self.kwargs.get('empresa_pk')
    #     valor_busqueda = request.query_params.get('valor')

    #     if not valor_busqueda:
    #         return Response(
    #             {"detail": "Debe proporcionar el parámetro 'valor' en la querystring."},
    #             status=status.HTTP_400_BAD_REQUEST
    #         )

    #     # Partimos del queryset base (ya filtrado por empresa, categoría, código de barras, etc.)
    #     queryset = self.get_queryset()
    #     if not empresa_pk:
    #         return Response(
    #             {"detail": "Esta ruta requiere 'empresa_pk' en la URL."},
    #             status=status.HTTP_400_BAD_REQUEST
    #         )

    #     # Filtramos los ítems cuyo valor de CampoAdicionalItem sea parecido al parámetro
    #     # --------------------------------------------------------------
    #     # Como la relación ManyToMany usa el modelo intermedio CampoAdicionalItem,
    #     # para filtrar por el campo `valor` de la tabla intermedia hacemos:
    #     #     campoadicionalitem__valor__icontains=valor_busqueda
    #     #
    #     # Hay que usar distinct() para evitar duplicados si un ítem tiene varias coincidencias.
    #     queryset = queryset.filter(
    #         campoadicionalitem__valor__icontains=valor_busqueda
    #     ).distinct()

    #     serializer = self.get_serializer(queryset, many=True)
    #     return Response(serializer.data, status=status.HTTP_200_OK)


class ProveedorEmpresaItemViewSet(viewsets.ModelViewSet):
    serializer_class = ItemEmpresaSerializer

    def get_queryset(self):
        proveedor_empresa_pk = self.kwargs.get("proveedor_empresa_pk")
        if proveedor_empresa_pk:
            return ItemEmpresa.objects.filter(
                proveedores_empresa__id=proveedor_empresa_pk
            )
        return ItemEmpresa.objects.none()


class CampoAdicionalItemViewSet(viewsets.ModelViewSet):
    queryset = CampoAdicionalItem.objects.all()
    serializer_class = CampoAdicionalItemSerializer

    @action(detail=False, methods=["get"], url_path=r"por-empresa/(?P<empresa_pk>\d+)")
    def por_empresa(self, request, empresa_pk=None):
        """
        Devuelve todos los campos adicionales de ítems cuya empresa tenga id=empresa_pk.
        URL: /api/campoadicionalitem/por-empresa/<empresa_pk>/
        """
        # Filtramos CampoAdicionalItem por el campo relacionado item__empresa
        qs = self.queryset.filter(item__empresa_id=empresa_pk)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
