from django.urls import path, include
from rest_framework import routers
from .views import *

router = routers.DefaultRouter()
router.register(r'solicitudes-vacaciones', SolicitudVacacionesViewSet, basename='solicitudes-vacaciones')

urlpatterns = [
    path('', include(router.urls)),
]
