from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from .views import (
    OrdenDeTrabajoViewSet,
    SoporteTecnicoViewSet,
    UsuarioAsignadoSoporteViewSet,
    ServicioEnOTViewSet,
    HistorialCambiosOrdenViewSet,
    AdjuntoDeOrdenViewSet,
    RendicionEnOtViewSet,
    CierreAdministrativoOTViewSet,
)

# Router principal para OrdenDeTrabajo V2
router = DefaultRouter()
router.register(r'ordenes-de-trabajo', OrdenDeTrabajoViewSet, basename='orden-de-trabajo-v2')

# Routers anidados bajo /ordenes-de-trabajo/{orden_trabajo_pk}/
ordenes_router = NestedDefaultRouter(router, r'ordenes-de-trabajo', lookup='orden_trabajo')
ordenes_router.register(r'soportes-tecnicos', SoporteTecnicoViewSet, basename='orden-v2-soportes')
ordenes_router.register(r'servicios-generales', ServicioEnOTViewSet, basename='orden-v2-servicios')
ordenes_router.register(r'historial-cambios', HistorialCambiosOrdenViewSet, basename='orden-v2-historial')
ordenes_router.register(r'archivos-adjuntos', AdjuntoDeOrdenViewSet, basename='orden-v2-adjuntos')
ordenes_router.register(r'gastos-rendicion', RendicionEnOtViewSet, basename='orden-v2-rendiciones')
ordenes_router.register(r'cierre-administrativo', CierreAdministrativoOTViewSet, basename='orden-v2-cierre')

# Router anidado bajo /soportes-v2/{soporte_tecnico_pk}/ para usuarios asignados
# (Mantenemos el endpoint top-level también para flexibilidad)
router.register(r'soportes-v2', SoporteTecnicoViewSet, basename='soporte-tecnico-v2')
soportes_router = NestedDefaultRouter(router, r'soportes-v2', lookup='soporte_tecnico')
soportes_router.register(r'usuarios-asignados-soporte', UsuarioAsignadoSoporteViewSet, basename='soporte-v2-usuarios-asignados')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(ordenes_router.urls)),
    path('', include(soportes_router.urls)),
]
