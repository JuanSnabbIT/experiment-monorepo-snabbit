from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'equipos', EquipoViewSet)
router.register(r'usuarios-equipo', UsuarioEquipoViewSet)
router.register(r'almacenamientos-equipo', AlmacenamientoEquipoViewSet)
router.register(r'softwares-instalados', SoftwareInstaladoViewSet)
router.register(r'monitores-equipo', MonitorEquipoViewSet)
router.register(r'software-empresa', SoftwareDeEmpresaViewSet)

equipo_router = NestedDefaultRouter(router, r'equipos', lookup="equipo")
equipo_router.register(r'usuarios-equipo', UsuarioEquipoViewSet, basename="equipo-usuario-equipo")
equipo_router.register(r'almacenamientos-equipo', AlmacenamientoEquipoViewSet, basename="equipo-almacenamiento-equipo")
equipo_router.register(r'softwares-instalados', SoftwareInstaladoViewSet, basename="equipo-software-instalado")
equipo_router.register(r'monitores-equipo', MonitorEquipoViewSet, basename="equipo-monitor-equipo")


urlpatterns = router.urls + equipo_router.urls
