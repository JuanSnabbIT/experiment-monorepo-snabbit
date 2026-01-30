from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter

from .views import (
    AdjuntoDeOrdenViewSet,
    CierreAdministrativoOTViewSet,
    GastoOperativoEnOtViewSet,
    HistorialCambiosOrdenViewSet,
    InsumoViewSet,
    OrdenDeTrabajoViewSet,
    SeguimientoItemOTViewSet,
    ServicioEnOTViewSet,
    SoporteTecnicoViewSet,
    UsuarioAsignadoSoporteViewSet,
    UsuariosVinculadosOrdenAPIView,
    RetroalimentacionesOrdenAPIView,
)

# Router principal para OrdenDeTrabajo V2
router = DefaultRouter()
router.register(
    r"ordenes-de-trabajo", OrdenDeTrabajoViewSet, basename="orden-de-trabajo-v2"
)
# Alias para compatibilidad con clientes que usan "ordenes-trabajo"
router.register(
    r"ordenes-trabajo", OrdenDeTrabajoViewSet, basename="orden-trabajo-v2-alias"
)
# Cierres de facturación por contrato (top-level, no requieren OT)
router.register(
    r"cierres-facturacion",
    CierreAdministrativoOTViewSet,
    basename="cierres-facturacion",
)
# Alias para compatibilidad con frontend (cierres-administrativos)
router.register(
    r"cierres-administrativos",
    CierreAdministrativoOTViewSet,
    basename="cierres-administrativos",
)

# Routers anidados bajo /ordenes-de-trabajo/{orden_trabajo_pk}/
ordenes_router = NestedDefaultRouter(
    router, r"ordenes-de-trabajo", lookup="orden_trabajo"
)
ordenes_router.register(
    r"soportes-tecnicos", SoporteTecnicoViewSet, basename="orden-v2-soportes"
)
ordenes_router.register(
    r"servicios-generales", ServicioEnOTViewSet, basename="orden-v2-servicios"
)
ordenes_router.register(
    r"historial-cambios", HistorialCambiosOrdenViewSet, basename="orden-v2-historial"
)
ordenes_router.register(
    r"archivos-adjuntos", AdjuntoDeOrdenViewSet, basename="orden-v2-adjuntos"
)
ordenes_router.register(
    r"gastos-operativos",
    GastoOperativoEnOtViewSet,
    basename="orden-v2-gastos-operativos",
)
ordenes_router.register(
    r"cierre-administrativo", CierreAdministrativoOTViewSet, basename="orden-v2-cierre"
)
ordenes_router.register(
    r"insumos", InsumoViewSet, basename="orden-v2-insumos"
)

# Seguimientos anidados bajo servicios y soportes (OT V2)
servicios_router = NestedDefaultRouter(
    ordenes_router, r"servicios-generales", lookup="servicio_general"
)
servicios_router.register(
    r"seguimientos", SeguimientoItemOTViewSet, basename="orden-v2-servicio-seguimientos"
)

soportes_en_orden_router = NestedDefaultRouter(
    ordenes_router, r"soportes-tecnicos", lookup="soporte_tecnico"
)
soportes_en_orden_router.register(
    r"seguimientos", SeguimientoItemOTViewSet, basename="orden-v2-soporte-seguimientos"
)

# Nested router for SoporteTecnico -> UsuarioAsignadoSoporte within an order
soportes_en_orden_router.register(
    r"usuarios-asignados",
    UsuarioAsignadoSoporteViewSet,
    basename="orden-v2-soporte-usuarios",
)

# Router anidado bajo /soportes-v2/{soporte_tecnico_pk}/ para usuarios asignados
# (Mantenemos el endpoint top-level también para flexibilidad)
router.register(r"soportes-v2", SoporteTecnicoViewSet, basename="soporte-tecnico-v2")
soportes_router = NestedDefaultRouter(router, r"soportes-v2", lookup="soporte_tecnico")
soportes_router.register(
    r"usuarios-asignados-soporte",
    UsuarioAsignadoSoporteViewSet,
    basename="soporte-v2-usuarios-asignados",
)

urlpatterns = [
    path("", include(router.urls)),
    path("", include(ordenes_router.urls)),
    path("", include(servicios_router.urls)),
    path("", include(soportes_en_orden_router.urls)),
    path("", include(soportes_router.urls)),
    # Compatibilidad: rutas antiguas usadas por frontend (v1)
    path(
        "ordenes-de-trabajo/<int:orden_pk>/usuarios-vinculados/",
        UsuariosVinculadosOrdenAPIView.as_view(),
    ),
    path(
        "ordenes-de-trabajo/<int:orden_pk>/retroalimentaciones/",
        RetroalimentacionesOrdenAPIView.as_view(),
    ),
]
