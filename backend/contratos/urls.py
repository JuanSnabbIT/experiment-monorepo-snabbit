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
    PersonaLicenciatariaViewSet,
    CorreoPersonaLicenciatariaViewSet,
    VisitaViewSet,
    LicenciaViewSet,
    CondicionEspecialViewSet,
    FacturaContratoViewSet,
    PlantillaContratoViewSet,
    SeccionPlantillaViewSet,
    EtiquetaPlantillaViewSet,
    SeccionContratoGeneradaViewSet,
    obtener_acuerdos_por_envio,
    firmar_envio,
    # V2
    PlantillaContratoV2ViewSet,
    SeccionPlantillaV2ViewSet,
    BloqueTransversalContratoV2ViewSet,
    EtiquetaPlantillaV2ViewSet,
    etiquetas_disponibles,
)
from django.urls import path
from contratos.public_views import (
    PublicAprobarContratoView,
    PublicContratoAprobacionDetailView,
    PublicContratoAprobacionPDFView,
    PublicContratoFirmaDetailView,
    PublicContratoFirmaPDFView,
    PublicFirmarContratoView,
    PublicRechazarDefinitivoContratoView,
    PublicRechazarContratoView,
    PublicContratoResumenDetailView,
    PublicContratoResumenPDFView,
)

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
contrato_router.register(r'secciones-generadas', SeccionContratoGeneradaViewSet, basename='contrato-secciones-generadas')

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
router.register(r'personas-licenciatarias', PersonaLicenciatariaViewSet, basename='persona-licenciataria')
router.register(r'facturas-contrato', FacturaContratoViewSet, basename='factura-contrato')

# Plantillas de contrato (V1)
router.register(r'plantillas-contrato', PlantillaContratoViewSet, basename='plantilla-contrato')
router.register(r'etiquetas-plantilla', EtiquetaPlantillaViewSet, basename='etiqueta-plantilla')

plantilla_router = routers.NestedDefaultRouter(router, r'plantillas-contrato', lookup='plantilla')
plantilla_router.register(r'secciones', SeccionPlantillaViewSet, basename='seccion-plantilla')

# Plantillas de contrato V2 (Motor Slate)
router_v2 = routers.DefaultRouter()
router_v2.register(r'plantillas-contrato-v2', PlantillaContratoV2ViewSet, basename='plantilla-contrato-v2')
router_v2.register(r'bloques-transversales', BloqueTransversalContratoV2ViewSet, basename='bloque-transversal')
router_v2.register(r'etiquetas-plantilla-v2', EtiquetaPlantillaV2ViewSet, basename='etiqueta-plantilla-v2')

plantilla_v2_router = routers.NestedDefaultRouter(router_v2, r'plantillas-contrato-v2', lookup='plantilla')
plantilla_v2_router.register(r'secciones-v2', SeccionPlantillaV2ViewSet, basename='seccion-plantilla-v2')

licencia_router = routers.NestedDefaultRouter(router, r'contrato-licencias', lookup='licencia')
licencia_router.register(r'usuarios-vinculados', UsuarioVinculadoLicenciaViewSet, basename='contrato-licencia-usuarios')
persona_router = routers.NestedDefaultRouter(router, r'personas-licenciatarias', lookup='persona')
persona_router.register(r'correos', CorreoPersonaLicenciatariaViewSet, basename='persona-licenciataria-correos')

urlpatterns = (
    router.urls +
    router_v2.urls +
    contrato_router.urls +
    plantilla_router.urls +
    plantilla_v2_router.urls +
    licencia_router.urls +
    persona_router.urls +
    usuarios_vinculados_router.urls +
    [
        path(
            'public/contrato-aprobacion/<uuid:token>/',
            PublicContratoAprobacionDetailView.as_view(),
            name='public-contrato-aprobacion-detail'
        ),
        path(
            'public/contrato-aprobacion/<uuid:token>/pdf/',
            PublicContratoAprobacionPDFView.as_view(),
            name='public-contrato-aprobacion-pdf'
        ),
        path(
            'public/contrato-aprobacion/<uuid:token>/aprobar/',
            PublicAprobarContratoView.as_view(),
            name='public-contrato-aprobacion-aprobar'
        ),
        path(
            'public/contrato-aprobacion/<uuid:token>/rechazar/',
            PublicRechazarContratoView.as_view(),
            name='public-contrato-aprobacion-rechazar'
        ),
        path(
            'public/contrato-aprobacion/<uuid:token>/rechazar-definitivo/',
            PublicRechazarDefinitivoContratoView.as_view(),
            name='public-contrato-aprobacion-rechazar-definitivo'
        ),
        path(
            'public/contrato-firma/<uuid:token>/',
            PublicContratoFirmaDetailView.as_view(),
            name='public-contrato-firma-detail'
        ),
        path(
            'public/contrato-firma/<uuid:token>/pdf/',
            PublicContratoFirmaPDFView.as_view(),
            name='public-contrato-firma-pdf'
        ),
        path(
            'public/contrato-firma/<uuid:token>/firmar/',
            PublicFirmarContratoView.as_view(),
            name='public-contrato-firma-firmar'
        ),
        path(
            'public/contrato-resumen/<uuid:token>/',
            PublicContratoResumenDetailView.as_view(),
            name='public-contrato-resumen-detail'
        ),
        path(
            'public/contrato-resumen/<uuid:token>/pdf/',
            PublicContratoResumenPDFView.as_view(),
            name='public-contrato-resumen-pdf'
        ),
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
        path(
            'etiquetas-disponibles/',
            etiquetas_disponibles,
            name='etiquetas-disponibles'
        ),
    ]
)
