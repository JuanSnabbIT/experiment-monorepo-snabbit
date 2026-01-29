from retroalimentacion.models import Retroalimentacion, RetroalimentacionAplicada
from ordentrabajov2.models import SoporteTecnico, UsuarioAsignadoSoporte
from django.contrib.contenttypes.models import ContentType
from core.models import PreguntaEnRetroalimentacion
from core.tasks import send_email_task
import os
from dotenv import load_dotenv
load_dotenv()


def crear_retroalimentacion_y_enviar_correo(orden):
    """
    Crea retroalimentación para una OrdenDeTrabajo v2.
    En v2, los usuarios se asignan a SoporteTecnico (UsuarioAsignadoSoporte),
    no directamente a la OT.
    """
    # Obtener todos los soportes técnicos de la orden
    soportes = SoporteTecnico.objects.filter(orden=orden)
    
    # Obtener usuarios asignados a través de los soportes
    asignados = UsuarioAsignadoSoporte.objects.filter(
        soporte_tecnico__orden=orden
    ).select_related('usuario_empresa', 'usuario_empresa__usuario')
    
    for asignado in asignados:
        retro = Retroalimentacion.objects.create(
            orden_trabajo=orden,
            usuario_empresa=asignado.usuario_empresa,
            usuario_externo=None,  # v2 no tiene usuario_externo en UsuarioAsignadoSoporte
            correo_usuario_externo=None,
            cantidad_visitas=0
        )

        # En v2, el "trabajo" es el SoporteTecnico mismo
        for soporte in soportes:
            preguntas = PreguntaEnRetroalimentacion.objects.para_modelo(soporte)
            ct = ContentType.objects.get_for_model(soporte)

            for pregunta in preguntas:
                RetroalimentacionAplicada.objects.get_or_create(
                    retroalimentacion=retro,
                    content_type=ct,
                    object_id=soporte.pk,
                    pregunta=pregunta
                )

        urldev = os.getenv("FRONTEND_URL", 'http://127.0.0.1:8000')
        # Construir URL
        url = f"{urldev}/retroalimentacion-orden-trabajo/{retro.uuid}"

        # Determinar destinatario
        email = asignado.usuario_empresa.usuario.email if asignado.usuario_empresa else None
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
