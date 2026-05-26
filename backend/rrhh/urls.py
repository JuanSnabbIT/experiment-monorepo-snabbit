from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CargoCatalogoViewSet,
    ContratoTrabajadorViewSet,
)

router = DefaultRouter()
router.register(
    r"rrhh/contratos-trabajador",
    ContratoTrabajadorViewSet,
    basename="contratos-trabajador",
)
router.register(
    r"rrhh/cargos-catalogo",
    CargoCatalogoViewSet,
    basename="cargos-catalogo",
)

urlpatterns = [
    path("", include(router.urls)),
]
