from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from .views import (
    DetalleGastoRendicionOTViewSet,
    OrdenDeTrabajoViewSet,
    DetalleTrabajoViewSet,
    RetroalimentacionViewset,
    SeguimientoDetalleTrabajoViewSet,
    HistorialCambiosOrdenViewSet,
    AdjuntoDeOrdenViewSet,
    UsuarioAsignadoOTViewSet
)
from django.urls import path, include


# Crear el router principal
router = DefaultRouter()
router.register(r'ordenes-trabajo', OrdenDeTrabajoViewSet)
router.register(r'detalles-gastos', DetalleGastoRendicionOTViewSet)

# Crear routers anidados
ordenes_trabajo_router = NestedDefaultRouter(router, r'ordenes-trabajo', lookup='orden_trabajo')
ordenes_trabajo_router.register(r'detalles-trabajo', DetalleTrabajoViewSet, basename='orden-trabajo-detalles-trabajo')
ordenes_trabajo_router.register(r'adjuntos', AdjuntoDeOrdenViewSet, basename='orden-trabajo-adjuntos')
ordenes_trabajo_router.register(r'historial-cambios-orden', HistorialCambiosOrdenViewSet, basename="orden-trabajo-historial-cambios")
#ordenes_trabajo_router.register(r'retroalimentaciones', RetroalimentacionOTViewSet, basename="orden-trabajo-retroalimentaciones")
ordenes_trabajo_router.register(r'detalles-gastos', DetalleGastoRendicionOTViewSet, basename="orden-trabajo-detalle-gasto")
ordenes_trabajo_router.register(r'usuarios-vinculados', UsuarioAsignadoOTViewSet, basename="orden-trabajo-usuarios-vinculados")
ordenes_trabajo_router.register(r'retroalimentaciones', RetroalimentacionViewset, basename="orden-trabajo-retroalimentaciones")
# ordenes_trabajo_router.register(r'insumos', InsumosOrdenDeTrabajoViewSet, basename='orden-trabajo-insumos')

detalle_orden_trabajo = NestedDefaultRouter(ordenes_trabajo_router, r'detalles-trabajo', DetalleTrabajoViewSet, lookup='detalle_trabajo')
detalle_orden_trabajo.register(r'seguimientos', SeguimientoDetalleTrabajoViewSet, basename='detalle-trabajo-seguimiento')

# Incluir las URLs del router principal y los routers anidados
urlpatterns = [
    # Todas las rutas de los routers, bajo /api/
    path('', include(router.urls)),
    path('', include(ordenes_trabajo_router.urls)),
    path('', include(detalle_orden_trabajo.urls)),

    # # Tus endpoints “sueltos” por UUID, sin autenticación
    # path(
    #     'retroalimentacion/<uuid:uuid>/',
    #     RetroalimentacionOTDetailAPIView.as_view(),
    #     name='retroalimentacion-detail'
    # ),
    # path(
    #     'retroalimentacion/<uuid:uuid>/edit/',
    #     RetroalimentacionOTPatchAPIView.as_view(),
    #     name='retroalimentacion-patch'
    # ),
]