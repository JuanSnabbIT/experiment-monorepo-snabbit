from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from .views import AsistenciaUsuarioViewSet, EntregaDeEquipoViewSet, VisitaSoporteViewSet

router = DefaultRouter()
router.register(r'visitas-soporte', VisitaSoporteViewSet)

visita_router = NestedDefaultRouter(router, r'visitas-soporte', lookup="visita_soporte")
visita_router.register(r'asistencias-usuarios', AsistenciaUsuarioViewSet, basename="visitas-soporte-asistencias-usuarios")
visita_router.register(r'entregas-equipos', EntregaDeEquipoViewSet, basename="visitas-soporte-entregas-equipos")
# visita_router.register(r'insumos-visitas', InsumoEnVisitaSoporteViewSet, basename="visitas-soporte-insumos-visitas")


urlpatterns = router.urls + visita_router.urls