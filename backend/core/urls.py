from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *


router = DefaultRouter()
router.register(r'personalizacion-usuarios', PersonalizacionUsuarioViewSet)
router.register(r'content-types', ContentTypeViewSet, basename='contenttype')
router.register(r'softwares', SoftwareViewSet)
router.register(r'acuerdos-base', AcuerdoConfidencialidadBaseViewSet, basename='acuerdos-base')
router.register(r'indicadores-economicos', IndicadorEconomicoViewSet, basename='indicadores-economicos')
router.register(r'actividad-reciente', ActividadRecienteViewSet, basename='actividad-reciente')

urlpatterns = [
    path('', include(router.urls)),
]