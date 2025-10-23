from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from .views import (ArchivoCompraViewSet, BodegaViewSet, CompraViewSet, EstadoTomaInventarioViewSet, ImagenDeItemEnTomaInventarioViewSet, ItemEnCompraViewSet, ItemEnTomaInventarioViewSet, ItemsGuiaSalidaViewSet, GuiaSalidaViewSet, MovimientoStockViewSet, TomaInventarioViewSet, 
                        OrdenCompraViewSet, ItemEnOrdenCompraViewSet, StockItemEnBodegaViewSet, ItemOrdenCompraEnStockViewSet)

router = DefaultRouter()
router.register(r'bodegas', BodegaViewSet, basename='bodega')
router.register(r'tomas-inventario', TomaInventarioViewSet, basename='toma-inventario')
# router.register(r'imagenes-toma-inventario', ImagenesTomaInventarioViewSet, basename='imagenes-toma-inventario')
router.register(r'ordenes-compra', OrdenCompraViewSet, basename='orden-compra')
router.register(r'items-orden-compra-en-stock', ItemOrdenCompraEnStockViewSet, basename='item-orden-compra-en-stock')
router.register(r'guia-salida', GuiaSalidaViewSet, basename='guia-salida')
router.register(r'items-guia', ItemsGuiaSalidaViewSet, basename='items-guias')
router.register(r'compras', CompraViewSet, basename='compras')
router.register(r'archivos-compras', ArchivoCompraViewSet, basename='archivos-compras')
router.register(r'movimientos-stock', MovimientoStockViewSet, basename='movimientos-stock')
router.register(r'items-en-toma-inventario', ItemEnTomaInventarioViewSet, basename='item-en-toma-inventario')
router.register(r'estados-toma-inventario', EstadoTomaInventarioViewSet, basename='estado-toma-inventario')
router.register(r'imagenes-item-en-toma-inventario', ImagenDeItemEnTomaInventarioViewSet, basename='imagenes-item-en-toma-inventario')

bodegas_router = NestedDefaultRouter(router, r'bodegas', lookup='bodega')
bodegas_router.register(r'stock-items-en-bodega', StockItemEnBodegaViewSet, basename='bodega-stock-items')
bodegas_router.register(r'tomas-inventario', TomaInventarioViewSet, basename='toma-inventario-stock')

ordenes_compra_router = NestedDefaultRouter(router, r'ordenes-compra', lookup='orden_compra')
ordenes_compra_router.register(r'items-en-orden-compra', ItemEnOrdenCompraViewSet, basename='orden-compra-items')
ordenes_compra_router.register(r'items-orden-compra-en-stock', ItemOrdenCompraEnStockViewSet, basename='orden-item-orden-compra-en-stock')

guia_router = NestedDefaultRouter(router, r'guia-salida', lookup="guia_salida_bodega")
guia_router.register(r'items-guia', ItemsGuiaSalidaViewSet, basename="items-guias-bodega")

compras_router = NestedDefaultRouter(router, r'compras', lookup='compras')
compras_router.register(r'items-compras', ItemEnCompraViewSet, basename='compras-items')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(bodegas_router.urls)),
    path('', include(ordenes_compra_router.urls)),
    path('', include(guia_router.urls)),
    path('', include(compras_router.urls))
]
