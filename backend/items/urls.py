from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedSimpleRouter
from .views import *

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet, basename='categoria')
router.register(r'fabricantes', FabricanteViewSet, basename='fabricante')
# router.register(r'proveedores', ProveedorViewSet, basename='proveedor')
router.register(r'proveedores-empresa', ProveedorEmpresaViewSet, basename='proveedorempresa')
# router.register(r'items', ItemViewSet, basename='item')
router.register(r'imagenes-item', ImagenItemViewSet, basename='imagenitem')
router.register(r'items-empresa', ItemEmpresaViewset, basename='itemempresa')
router.register(r'campos-adicionales-items', CampoAdicionalItemViewSet, basename='campo-adicional-item')

# router_item = NestedSimpleRouter(router, r'items', lookup="items")

urlpatterns = router.urls
