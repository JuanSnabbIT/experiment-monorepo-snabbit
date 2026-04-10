from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RetroalimentacionViewSet,
    RetroalimentacionAplicadaViewSet,
    RetroalimentacionPorTokenView,
    RetroalimentacionResponderPorTokenView,
)
from .public_views import (
    PublicRetroalimentacionOTV3DetailView,
    PublicRetroalimentacionOTV3ResponderView,
)

router = DefaultRouter()
# Registramos el ViewSet principal de Retroalimentacion
router.register(
    r'retroalimentacion', 
    RetroalimentacionViewSet, 
    basename='retroalimentacion'
)
# Registramos el ViewSet de RetroalimentacionAplicada para las acciones "standard"
router.register(
    r'retroalimentacion_aplicada', 
    RetroalimentacionAplicadaViewSet, 
    basename='retroalimentacion_aplicada'
)

urlpatterns = [
    # URLs publicas (sin autenticacion) para retroalimentacion OT V3 via email
    # Frontend debe montar pagina en: {FRONTEND_URL}/retroalimentacion-orden-trabajo-v3/{token}
    path(
        "public/retroalimentacion-otv3/<uuid:token>/",
        PublicRetroalimentacionOTV3DetailView.as_view(),
        name="public-retroalimentacion-otv3-detail",
    ),
    path(
        "public/retroalimentacion-otv3/<uuid:token>/responder/",
        PublicRetroalimentacionOTV3ResponderView.as_view(),
        name="public-retroalimentacion-otv3-responder",
    ),
    path(
        "retroalimentacion/pub/<uuid:uuid>/",
        RetroalimentacionPorTokenView.as_view(),
        name="retroalimentacion-publica"
    ),
    path(
        "retroalimentacion/pub/<uuid:uuid>/responder/",
        RetroalimentacionResponderPorTokenView.as_view(),
        name="retroalimentacion-responder"
    ),
    path("", include(router.urls)),
]
