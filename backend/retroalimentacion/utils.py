from retroalimentacion.models import Retroalimentacion, RetroalimentacionAplicada
from ordentrabajov2.models import SoporteTecnico
from django.contrib.contenttypes.models import ContentType
from core.models import PreguntaEnRetroalimentacion
from core.tasks import send_email_task
import os
from dotenv import load_dotenv
load_dotenv()


def crear_retroalimentacion_y_enviar_correo(orden):
    """
    Crea UNA retroalimentación por OT dirigida al cliente_solicitante.
    Genera preguntas aplicadas por cada SoporteTecnico de la OT.
    Envía email con enlace público para que el cliente evalúe el servicio.
    """
    # Determinar destinatario: cliente_solicitante de la OT
    cliente_solicitante = orden.cliente_solicitante
    if not cliente_solicitante:
        return

    email = getattr(cliente_solicitante.usuario, 'email', None)
    nombre_cliente = cliente_solicitante.usuario.get_nombre_completo() if hasattr(cliente_solicitante.usuario, 'get_nombre_completo') else str(cliente_solicitante)

    if not email:
        # Fallback: email de la empresa cliente
        email = getattr(orden.cliente, 'email', None)
        if not email:
            return

    # Evitar duplicados: si ya existe retroalimentación para esta OT, no crear otra
    if Retroalimentacion.objects.filter(orden_trabajo=orden).exists():
        return

    # Crear una sola retroalimentación dirigida al cliente
    retro = Retroalimentacion.objects.create(
        orden_trabajo=orden,
        usuario_empresa=cliente_solicitante,
        usuario_externo=None,
        correo_usuario_externo=email,
        cantidad_visitas=0,
    )

    # Generar preguntas aplicadas por cada SoporteTecnico
    soportes = SoporteTecnico.objects.filter(orden=orden)
    for soporte in soportes:
        preguntas = PreguntaEnRetroalimentacion.objects.para_modelo(soporte)
        ct = ContentType.objects.get_for_model(soporte)

        for pregunta in preguntas:
            RetroalimentacionAplicada.objects.get_or_create(
                retroalimentacion=retro,
                content_type=ct,
                object_id=soporte.pk,
                pregunta=pregunta,
            )

    # Construir URL pública
    urldev = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
    url = f"{urldev}/retroalimentacion-orden-trabajo/{retro.uuid}"

    # Datos de la empresa prestadora para el email
    empresa_nombre = getattr(orden.empresa, 'nombre', 'Nuestra empresa')

    html_body = (
        f"<p>Estimado/a <strong>{nombre_cliente}</strong>,</p>"
        f"<p>La orden de trabajo <strong>N°{orden.id}</strong> ha sido completada por "
        f"<strong>{empresa_nombre}</strong>.</p>"
        "<p>Nos gustaría conocer su opinión sobre el servicio recibido. "
        "Su retroalimentación nos ayuda a mejorar continuamente.</p>"
        "<p>La encuesta toma menos de 2 minutos.</p>"
    )
    titulo = f"Encuesta de Satisfacción - OT N°{orden.id}"
    subject = f"📋 {empresa_nombre} - Evalúe nuestro servicio (OT N°{orden.id})"

    send_email_task.delay(
        subject=subject,
        recipient_list=[email],
        html_body=html_body,
        titulo=titulo,
        url_boton=url,
        text_boton="Evaluar Servicio",
    )
