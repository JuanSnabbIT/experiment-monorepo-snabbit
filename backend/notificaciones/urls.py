from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FCMTokenViewSet, NotificacionViewSet

router = DefaultRouter()
router.register(r"fcm-tokens", FCMTokenViewSet, basename="fcm-tokens")
router.register(r"notificaciones", NotificacionViewSet, basename="notificaciones")

urlpatterns = [
    path("", include(router.urls)),
]
