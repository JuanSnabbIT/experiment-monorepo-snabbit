from django.urls import path
from rest_framework_nested import routers
from .views import *
from .public_views import (
    PublicCotizacionDetailView,
    PublicCotizacionPDFView,
    PublicAprobarCotizacionView,
    PublicRechazarCotizacionView,
)

router = routers.DefaultRouter()
router.register(r'cotizaciones', CotizacionViewSet)
router.register(r'items-cotizacion', ItemCotizacionViewSet)
router.register(r'seguimientos-cotizacion', SeguimientoCotizacionViewSet)
router.register(r'solicitantes-cotizacion', SolicitanteCotizacionViewSet)
router.register(r'solicitantes-externos', SolicitanteExternoViewSet)

cotizaciones_router = routers.NestedDefaultRouter(router, r'cotizaciones', lookup='cotizacion')
cotizaciones_router.register(r'items', ItemCotizacionViewSet, basename='cotizacion-items')
cotizaciones_router.register(r'seguimientos', SeguimientoCotizacionViewSet, basename='cotizacion-seguimientos')
cotizaciones_router.register(r'solicitantes-cotizacion', SolicitanteCotizacionViewSet, basename='cotizacion-solicitantes-cotizacion')

# URLs públicas (sin autenticación) para aprobación/rechazo vía email.
#
# Patrón canónico de URLs públicas:
#   Backend:  /api/public/{dominio}/{token}/{accion}/
#   Frontend: /{dominio}/public/{accion}/{token}
#
# Ejemplos cotizaciones:
#   Backend:  GET  /api/public/cotizacion/{token}/
#             POST /api/public/cotizacion/{token}/aprobar/
#             POST /api/public/cotizacion/{token}/rechazar/
#   Frontend: /cotizacion/public/responder/{token}
#
# Ejemplos contratos (referencia, definidos en contratos/urls.py):
#   Backend:  GET  /api/public/contrato-aprobacion/{token}/
#             POST /api/public/contrato-aprobacion/{token}/aprobar/
#             GET  /api/public/contrato-firma/{token}/
#             POST /api/public/contrato-firma/{token}/firmar/
#   Frontend: /contrato/public/aprobacion/{token}
#             /contrato/public/firma/{token}
public_urlpatterns = [
    path('public/cotizacion/<uuid:token>/', PublicCotizacionDetailView.as_view(), name='public-cotizacion-detail'),
    path('public/cotizacion/<uuid:token>/pdf/', PublicCotizacionPDFView.as_view(), name='public-cotizacion-pdf'),
    path('public/cotizacion/<uuid:token>/aprobar/', PublicAprobarCotizacionView.as_view(), name='public-cotizacion-aprobar'),
    path('public/cotizacion/<uuid:token>/rechazar/', PublicRechazarCotizacionView.as_view(), name='public-cotizacion-rechazar'),
]

urlpatterns = router.urls + cotizaciones_router.urls + public_urlpatterns
