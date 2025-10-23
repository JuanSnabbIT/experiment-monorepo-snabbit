from rest_framework_nested import routers
from contratos.views import (
    ContratoEmpresaClienteViewSet,
    EnvioContratoFirmaUsuarioViewSet,
    UsuarioVinculadoContratoViewSet,
    ContratoServicioViewSet,
    ContratoVisitaViewSet,
    ContratoLicenciaViewSet,
    ContratoCondicionEspecialViewSet,
    AcuerdoConfidencialidadContratoViewSet,
    ServicioViewSet,
    PlanServicioViewSet,
    CaracteristicaServicioViewSet,
    UsuarioVinculadoLicenciaViewSet,
    VisitaViewSet,
    LicenciaViewSet,
    CondicionEspecialViewSet,
    obtener_acuerdos_por_envio,
    firmar_envio
)
from django.urls import path

# Router principal para contratos
router = routers.DefaultRouter()
router.register(r'contratos', ContratoEmpresaClienteViewSet, basename='contrato')

# Router anidado para contratos
contrato_router = routers.NestedDefaultRouter(router, r'contratos', lookup='contrato')
contrato_router.register(r'usuarios-vinculados', UsuarioVinculadoContratoViewSet, basename='contrato-usuarios')
contrato_router.register(r'servicios', ContratoServicioViewSet, basename='contrato-servicios')
contrato_router.register(r'visitas', ContratoVisitaViewSet, basename='contrato-visitas')
contrato_router.register(r'licencias', ContratoLicenciaViewSet, basename='contrato-licencias')
contrato_router.register(r'condiciones-especiales', ContratoCondicionEspecialViewSet, basename='contrato-condiciones')
contrato_router.register(r'firmas', AcuerdoConfidencialidadContratoViewSet, basename='contrato-firmas')

usuarios_vinculados_router = routers.NestedDefaultRouter(contrato_router, r'usuarios-vinculados', lookup='usuario_vinculado')
usuarios_vinculados_router.register(r'envio-firma', EnvioContratoFirmaUsuarioViewSet, basename='contrato-usuarios-firma')

# Router principal para otros catálogos (si lo requieres)
router.register(r'servicios', ServicioViewSet, basename='servicio')
router.register(r'planes-servicio', PlanServicioViewSet, basename='plan-servicio')
router.register(r'caracteristicas-servicio', CaracteristicaServicioViewSet, basename='caracteristica-servicio')
router.register(r'visitas', VisitaViewSet, basename='visita')
router.register(r'licencias', LicenciaViewSet, basename='licencia')
router.register(r'condiciones-especiales', CondicionEspecialViewSet, basename='condicion-especial')
router.register(r'contrato-licencias', ContratoLicenciaViewSet, basename='contrato-licencias')

licencia_router = routers.NestedDefaultRouter(router, r'contrato-licencias', lookup='licencia')
licencia_router.register(r'usuarios-vinculados', UsuarioVinculadoLicenciaViewSet, basename='contrato-licencia-usuarios')

urlpatterns = (
    router.urls +
    contrato_router.urls +
    licencia_router.urls +
    usuarios_vinculados_router.urls +
    [
        path(
            'acuerdos-por-envio/<uuid:uuid>/',
            obtener_acuerdos_por_envio,
            name='acuerdos-por-envio'
        ),
        path(
            'envio-firma/<uuid:uuid>/firmar/',
            firmar_envio,
            name='firmar-envio'
        ),
    ]
)
