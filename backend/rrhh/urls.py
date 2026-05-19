from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ContratoTrabajadorViewSet,
    PublicContratoTrabajadorFirmaDetailView,
    PublicContratoTrabajadorFirmaPDFView,
    PublicFirmarContratoTrabajadorView,
)

router = DefaultRouter()
router.register(
    r"rrhh/contratos-trabajador",
    ContratoTrabajadorViewSet,
    basename="contratos-trabajador",
)

urlpatterns = [
    path("", include(router.urls)),
    # Vistas publicas de firma laboral (sin autenticacion)
    path(
        "public/contrato-trabajador-firma/<uuid:token>/",
        PublicContratoTrabajadorFirmaDetailView.as_view(),
        name="public-contrato-trabajador-firma-detail",
    ),
    path(
        "public/contrato-trabajador-firma/<uuid:token>/pdf/",
        PublicContratoTrabajadorFirmaPDFView.as_view(),
        name="public-contrato-trabajador-firma-pdf",
    ),
    path(
        "public/contrato-trabajador-firma/<uuid:token>/firmar/",
        PublicFirmarContratoTrabajadorView.as_view(),
        name="public-contrato-trabajador-firmar",
    ),
]
