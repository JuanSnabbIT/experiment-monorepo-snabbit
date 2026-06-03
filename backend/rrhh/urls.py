from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AfpCatalogoViewSet,
    AnexoContratoViewSet,
    BancoCatalogoViewSet,
    CargoCatalogoViewSet,
    ConfiguracionLaboralViewSet,
    ContratoAprobacionPDFView,
    ContratoAprobacionPublicaView,
    ContratoAprobacionResponderView,
    ContratoTrabajadorViewSet,
    TurnoLaboralViewSet,
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
router.register(
    r"rrhh/afp-catalogo",
    AfpCatalogoViewSet,
    basename="afp-catalogo",
)
router.register(
    r"rrhh/banco-catalogo",
    BancoCatalogoViewSet,
    basename="banco-catalogo",
)
router.register(
    r"rrhh/anexos-contrato",
    AnexoContratoViewSet,
    basename="anexos-contrato",
)
router.register(
    r"rrhh/turnos-laborales",
    TurnoLaboralViewSet,
    basename="turnos-laborales",
)
router.register(
    r"rrhh/configuracion-laboral",
    ConfiguracionLaboralViewSet,
    basename="configuracion-laboral",
)

urlpatterns = [
    path("", include(router.urls)),
    # Vistas publicas para aprobacion del empleador (sin autenticacion)
    path(
        "public/rrhh/contrato-aprobacion/<uuid:uuid>/",
        ContratoAprobacionPublicaView.as_view(),
        name="contrato-aprobacion-publica",
    ),
    path(
        "public/rrhh/contrato-aprobacion/<uuid:uuid>/pdf/",
        ContratoAprobacionPDFView.as_view(),
        name="contrato-aprobacion-pdf",
    ),
    path(
        "public/rrhh/contrato-aprobacion/<uuid:uuid>/responder/",
        ContratoAprobacionResponderView.as_view(),
        name="contrato-aprobacion-responder",
    ),
]
