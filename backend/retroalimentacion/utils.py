from retroalimentacion.models import Retroalimentacion, RetroalimentacionAplicada
from ordentrabajo.models import DetalleTrabajo, UsuarioAsignadoOT
from django.contrib.contenttypes.models import ContentType
from core.models import PreguntaEnRetroalimentacion
from core.tasks import send_email_task
import os
from dotenv import load_dotenv
load_dotenv()


def crear_retroalimentacion_y_enviar_correo(orden):
    detalles = DetalleTrabajo.objects.filter(orden=orden)

    for asignado in UsuarioAsignadoOT.objects.filter(orden=orden):
        retro = Retroalimentacion.objects.create(
            orden_trabajo=orden,
            usuario_empresa=asignado.usuario_empresa,
            usuario_externo=asignado.usuario_externo,
            correo_usuario_externo=asignado.correo_usuario_externo,
            cantidad_visitas=0
        )

        for detalle in detalles:
            trabajo = detalle.trabajo
            if not trabajo:
                continue
            preguntas = PreguntaEnRetroalimentacion.objects.para_modelo(trabajo)
            ct = ContentType.objects.get_for_model(trabajo)

            for pregunta in preguntas:
                RetroalimentacionAplicada.objects.get_or_create(
                    retroalimentacion=retro,
                    content_type=ct,
                    object_id=trabajo.pk,
                    pregunta=pregunta
                )
        urldev = os.getenv("FRONTEND_URL", 'http://127.0.0.1:8000')
        # Construir URL
        url = f"{urldev}/retroalimentacion-orden-trabajo/{retro.uuid}"

        # Determinar destinatario
        email = asignado.correo_usuario_externo or (
            asignado.usuario_empresa and asignado.usuario_empresa.usuario.email
        )
        if not email:
            continue

        # Preparar contenido dinámico del correo
        html_body = f"<p>Se ha completado la orden de trabajo <strong>#{orden.id}</strong>.</p>" \
                    "<p>Te invitamos a completar la retroalimentación correspondiente.</p>"
        titulo = "Evaluación de Orden de Trabajo"
        subject = f"Por favor responde la retroalimentación de la OT #{orden.id}"

        # Llamar a la tarea Celery para enviar
        send_email_task.delay(
            subject=subject,
            recipient_list=[email],
            html_body=html_body,
            titulo=titulo,
            url_boton=url,
            text_boton="Responder ahora"
        )
