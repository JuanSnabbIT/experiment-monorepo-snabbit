from django.urls import path, include
from rest_framework.routers import DefaultRouter
# from rest_framework_nested.routers import NestedSimpleRouter
from .views import *


router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'invitaciones-empresa', InvitacionEmpresaViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('get_grupos_user/', get_grupos_user, name='get_info_user'),
    path('activar-cuenta/<uuid:token>/', activate_account, name='activate_account'),
]
