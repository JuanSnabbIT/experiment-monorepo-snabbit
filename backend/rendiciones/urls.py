from rest_framework_nested import routers
from .views import CategoriaGastoRendicionViewSet, DetalleGastoRendicionViewSet, ItemRendicionViewSet, RendicionViewSet

# Router principal
router = routers.DefaultRouter()
router.register(r'categorias-gasto', CategoriaGastoRendicionViewSet)
router.register(r'rendiciones', RendicionViewSet)
router.register(r'detalles-gasto', DetalleGastoRendicionViewSet)

# Router anidado para DetalleGasto dentro de Rendicion
rendicion_router = routers.NestedDefaultRouter(router, r'rendiciones', lookup='rendicion')
rendicion_router.register(r'items-rendicion', ItemRendicionViewSet, basename='rendicion-items-rendicion')
# rendicion_router.register(r'detalles-gasto', DetalleGastoRendicionViewSet, basename='rendicion-detalles-gasto')

urlpatterns = router.urls + rendicion_router.urls
