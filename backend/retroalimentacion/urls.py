from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RetroalimentacionViewSet,
    RetroalimentacionAplicadaViewSet,
    RetroalimentacionPorTokenView,
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
    path(
        "retroalimentacion/pub/<uuid:uuid>/",
        RetroalimentacionPorTokenView.as_view(),
        name="retroalimentacion-publica"
    ),
    path("", include(router.urls)),
]

