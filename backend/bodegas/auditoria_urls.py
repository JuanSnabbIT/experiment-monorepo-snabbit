"""
URL routing para endpoints de auditoría y trazabilidad.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .auditoria_views import (
    BitácoraMovimientoViewSet,
    BitácoraSerieMovimientoViewSet,
    TrazabilidadSerieViewSet,
    ConciliacionViewSet,
    AnomalíaMovimientoViewSet
)

router = DefaultRouter()
router.register(r'bitacora-movimientos', BitácoraMovimientoViewSet, basename='bitacora-movimiento')
router.register(r'bitacora-series', BitácoraSerieMovimientoViewSet, basename='bitacora-serie')
router.register(r'trazabilidad-series', TrazabilidadSerieViewSet, basename='trazabilidad-serie')
router.register(r'conciliacion', ConciliacionViewSet, basename='conciliacion')
router.register(r'anomalias', AnomalíaMovimientoViewSet, basename='anomalia')

urlpatterns = [
    path('', include(router.urls)),
]
