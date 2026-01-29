from celery import shared_task
from ordentrabajov2.models import OrdenDeTrabajo
from retroalimentacion.utils import crear_retroalimentacion_y_enviar_correo

@shared_task
def task_gestionar_retroalimentacion_para_orden(orden_id):
    try:
        orden = OrdenDeTrabajo.objects.get(pk=orden_id)
        crear_retroalimentacion_y_enviar_correo(orden)
        return f"Retroalimentación creada y correo enviado para OT #{orden.id}"
    except OrdenDeTrabajo.DoesNotExist:
        return f"Orden {orden_id} no encontrada"
