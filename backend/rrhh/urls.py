from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ContratoTrabajadorViewSet

router = DefaultRouter()
router.register(
    r"rrhh/contratos-trabajador",
    ContratoTrabajadorViewSet,
    basename="contratos-trabajador",
)

urlpatterns = [
    path("", include(router.urls)),
]
