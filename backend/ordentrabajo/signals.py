from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from rendiciones.models import ItemRendicion
from .models import OrdenDeTrabajo, DetalleGastoRendicionOT, UsuarioAsignadoOT
from django.contrib.contenttypes.models import ContentType
from retroalimentacion.tasks import task_gestionar_retroalimentacion_para_orden
from dotenv import load_dotenv
load_dotenv()


@receiver(post_save, sender=OrdenDeTrabajo)
def trigger_retroalimentacion(sender, instance, **kwargs):
    if instance.estado == "completada":
        task_gestionar_retroalimentacion_para_orden.delay(instance.id)

@receiver(post_save, sender=OrdenDeTrabajo)
def crear_asignado_solicitante(sender, instance, created, **kwargs):
    """
    Cada vez que se cree una OrdenDeTrabajo:
    - Si tiene `solicitante_empresa` (no es None), creamos un UsuarioAsignadoOT
      cuyo campo `usuario_empresa` sea igual a `instance.solicitante_empresa`.
    """
    if created and instance.solicitante_empresa:
        # Evitamos duplicados: solo si no existe ya uno idéntico para esta orden
        existe = UsuarioAsignadoOT.objects.filter(
            orden=instance,
            usuario_empresa=instance.solicitante_empresa
        ).exists()
        if not existe:
            UsuarioAsignadoOT.objects.create(
                orden=instance,
                usuario_empresa=instance.solicitante_empresa
            )

# @receiver(pre_save, sender=DetalleTrabajo)
# def crear_seguimiento_cambio_estado(sender, instance, **kwargs):
#     """
#     Signal que se ejecuta antes de guardar un DetalleTrabajo.
#     Si el campo 'estado' cambió, se crea un SeguimientoDetalleTrabajo
#     con un comentario automático indicando el cambio de estado.
#     """
#     # Si es una creación (no existe aún en BD), no hacemos nada.
#     if not instance.pk:
#         return

#     try:
#         # Obtenemos el estado anterior desde la BD
#         detalle_prev = sender.objects.get(pk=instance.pk)
#     except sender.DoesNotExist:
#         return

#     if detalle_prev.estado != instance.estado:
#         comentario = f"El estado cambió de '{detalle_prev.estado}' a '{instance.estado}'."

#         # Se crea el seguimiento. Se asume que en las opciones de 'tipo' existe un valor
#         # que identifique un cambio de estado, por ejemplo 'cambio_estado'.
#         SeguimientoDetalleTrabajo.objects.create(
#             detalle_trabajo=instance,
#             tipo='cambio_estado',  # Ajusta este valor según tus choices en TIPO_SEGUIMIENTO
#             comentario=comentario,
#         )

# @receiver(post_save, sender=OrdenDeTrabajo)
# def enviar_email(sender, instance, **kwargs):
#     # Verificar si el estado de la orden es "en_proceso"
#     if instance.estado == "en_proceso":
#         # Suponiendo que el modelo OrdenDeTrabajo tiene una relación 'solicitante_empresa'
#         # y que esta relación posee el campo 'email'
#         recipient_email = instance.solicitante_empresa.usuario.email

#         # Definir parámetros para el email
#         subject = "Su orden de trabajo está en proceso"
#         html_body = (
#             "<p>Estimado usuario,</p>"
#             "<p>Su orden de trabajo ha cambiado a estado <strong>en proceso</strong>. "
#             "Por favor, revise los detalles en el siguiente enlace.</p>"
#         )
#         titulo = "Orden de Trabajo en Proceso"
#         url_boton = f"{os.getenv('FRONTEND_URL')}/orden-trabajo/detalle-orden-trabajo/{instance.id}/"
#         text_boton = "Ver Detalles"

#         # Llamar a la tarea de envío de correo de forma asíncrona
#         send_email_task.delay(subject, [recipient_email], html_body, titulo, url_boton, text_boton)

# @receiver(post_save, sender=DetalleTrabajo)
# def cerrar_la_orden(sender, instance, **kwargs):
#     orden = instance.orden
#     # Filtramos los detalles que aún estén en estado 'en_proceso' o 'pendiente'
#     detalles_pendientes = orden.detalletrabajo_set.filter(estado__in=["en_proceso", "pendiente"])
#     # Si no hay detalles pendientes, actualizamos el estado de la orden a 'completada'
#     if not detalles_pendientes.exists():
#         if orden.estado != "completada":
#             orden.estado = "completada"

@receiver(pre_delete, sender=DetalleGastoRendicionOT)
def borrar_items_relacionados(sender, instance, **kwargs):
    # identifica el ContentType de DetalleGastoRendicionOT
    ctype = ContentType.objects.get_for_model(DetalleGastoRendicionOT)
    # borra todos los ItemRendicion que tengan ese content_type y object_id igual al pk del detalle
    ItemRendicion.objects.filter(
        content_type=ctype,
        detalle_id=instance.pk
    ).delete()
