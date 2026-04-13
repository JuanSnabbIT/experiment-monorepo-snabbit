from rest_framework_nested import routers

from .views import (
    AdjuntoOTV3ViewSet,
    AsignacionTecnicoOTV3ViewSet,
    ChecklistItemOTV3ViewSet,
    GastoOTV3ViewSet,
    HistorialEstadoOTV3ViewSet,
    OrdenDeTrabajoV3ViewSet,
    PrefacturaOTV3ViewSet,
    SeguimientoOTV3ViewSet,
    TareaOTV3ViewSet,
)

# Router principal: /api/v3/ordenes/
router = routers.DefaultRouter()
router.register(r"ordenes", OrdenDeTrabajoV3ViewSet, basename="ordentrabajov3")
router.register(r"prefacturas-otv3", PrefacturaOTV3ViewSet, basename="prefacturas-otv3")

# Nested: /api/v3/ordenes/{orden_pk}/tareas/
orden_router = routers.NestedDefaultRouter(router, r"ordenes", lookup="orden")
orden_router.register(r"tareas", TareaOTV3ViewSet, basename="ordentrabajov3-tareas")
orden_router.register(r"asignaciones", AsignacionTecnicoOTV3ViewSet, basename="ordentrabajov3-asignaciones")
orden_router.register(r"seguimientos", SeguimientoOTV3ViewSet, basename="ordentrabajov3-seguimientos")
orden_router.register(r"gastos", GastoOTV3ViewSet, basename="ordentrabajov3-gastos")
orden_router.register(r"adjuntos", AdjuntoOTV3ViewSet, basename="ordentrabajov3-adjuntos")
orden_router.register(r"historial", HistorialEstadoOTV3ViewSet, basename="ordentrabajov3-historial")

# Nested de tarea: /api/v3/ordenes/{orden_pk}/tareas/{tarea_pk}/checklist/
tarea_router = routers.NestedDefaultRouter(orden_router, r"tareas", lookup="tarea")
tarea_router.register(r"checklist", ChecklistItemOTV3ViewSet, basename="ordentrabajov3-tareas-checklist")
tarea_router.register(r"seguimientos", SeguimientoOTV3ViewSet, basename="ordentrabajov3-tareas-seguimientos")

urlpatterns = router.urls + orden_router.urls + tarea_router.urls
