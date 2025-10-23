from rest_framework_nested import routers
from .views import *

router = routers.DefaultRouter()
router.register(r'cotizaciones', CotizacionViewSet)
router.register(r'items-cotizacion', ItemCotizacionViewSet)
router.register(r'seguimientos-cotizacion', SeguimientoCotizacionViewSet)
router.register(r'solicitantes-cotizacion', SolicitanteCotizacionViewSet)
router.register(r'solicitantes-externos', SolicitanteExternoViewSet)
router.register(r'comentarios-cotizacion', ComentarioCotizacionViewSet)

cotizaciones_router = routers.NestedDefaultRouter(router, r'cotizaciones', lookup='cotizacion')
cotizaciones_router.register(r'items', ItemCotizacionViewSet, basename='cotizacion-items')
cotizaciones_router.register(r'seguimientos', SeguimientoCotizacionViewSet, basename='cotizacion-seguimientos')
cotizaciones_router.register(r'solicitantes-cotizacion', SolicitanteCotizacionViewSet, basename='cotizacion-solicitantes-cotizacion')
cotizaciones_router.register(r'comentarios-cotizacion', ComentarioCotizacionViewSet, basename='cotizacion-comentario-cotizacion')

urlpatterns = router.urls + cotizaciones_router.urls