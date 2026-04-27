from retroalimentacion.models import Retroalimentacion, RetroalimentacionAplicada
from ordentrabajov2.models import SoporteTecnico
from django.contrib.contenttypes.models import ContentType
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from core.models import PreguntaEnRetroalimentacion
from core.pdf.canvas_utils import get_logo_empresa_b64
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

    logo_b64 = get_logo_empresa_b64(getattr(orden, 'empresa', None))

    send_email_task.delay(
        subject=subject,
        recipient_list=[email],
        html_body=html_body,
        titulo=titulo,
        url_boton=url,
        text_boton="Evaluar Servicio",
        logo_empresa_b64=logo_b64,
        empresa_nombre=empresa_nombre,
    )


def crear_retroalimentacion_y_enviar_correo_otv3(otv3_id):
    """
    Crea UNA retroalimentacion por OT V3 dirigida al cliente_solicitante.
    Genera preguntas genericas aplicadas por la OT (max 5).
    Envia email con enlace publico para que el cliente evalue el servicio.
    Tiene vencimiento de 72 horas.
    """
    from ordentrabajov3.models import OrdenDeTrabajoV3  # evitar circular import

    try:
        otv3 = OrdenDeTrabajoV3.objects.select_related(
            "cliente_solicitante__usuario",
            "empresa",
        ).get(pk=otv3_id)
    except OrdenDeTrabajoV3.DoesNotExist:
        return

    # Determinar destinatario: cliente_solicitante de la OT V3
    cliente_solicitante = otv3.cliente_solicitante
    if not cliente_solicitante:
        return

    email = getattr(cliente_solicitante.usuario, "email", None)
    if not email:
        return

    nombre_cliente = (
        cliente_solicitante.usuario.get_nombre_completo()
        if hasattr(cliente_solicitante.usuario, "get_nombre_completo")
        else str(cliente_solicitante)
    )

    # Evitar duplicados
    if Retroalimentacion.objects.filter(orden_trabajo_v3=otv3).exists():
        return

    retro = Retroalimentacion.objects.create(
        orden_trabajo_v3=otv3,
        usuario_empresa=cliente_solicitante,
        correo_usuario_externo=email,
        cantidad_visitas=0,
        fecha_vencimiento=timezone.now() + timedelta(hours=72),
    )

    # Generar preguntas genericas aplicadas por la OT V3 (max 5)
    preguntas = (
        PreguntaEnRetroalimentacion.objects.para_modelo(otv3)
        .order_by("id")[:5]
    )
    ct = ContentType.objects.get_for_model(otv3)
    for pregunta in preguntas:
        RetroalimentacionAplicada.objects.get_or_create(
            retroalimentacion=retro,
            content_type=ct,
            object_id=otv3.pk,
            pregunta=pregunta,
        )

    # Construir URL publica
    frontend_url = getattr(settings, "FRONTEND_URL", os.getenv("FRONTEND_URL", "http://127.0.0.1:5173"))
    url = f"{frontend_url}/retroalimentacion-orden-trabajo-v3/{retro.uuid}"

    empresa_nombre = getattr(otv3.empresa, "nombre", "Nuestra empresa")
    html_body = (
        f"<p>Estimado/a <strong>{nombre_cliente}</strong>,</p>"
        f"<p>La orden de trabajo <strong>\"{otv3.titulo}\"</strong> ha sido completada por "
        f"<strong>{empresa_nombre}</strong>.</p>"
        "<p>Nos gustaria conocer su opinion sobre el servicio recibido. "
        "Su retroalimentacion nos ayuda a mejorar continuamente.</p>"
        "<p>La encuesta es breve (5 preguntas) y expira en 72 horas.</p>"
        f"<p style='font-size:12px;color:#888;word-break:break-all;'>Si el boton no funciona, copie este enlace en su navegador:<br>"
        f"<a href='{url}'>{url}</a></p>"
    )
    titulo = f"Encuesta de Satisfaccion - {otv3.titulo}"
    subject = f"Evalue nuestro servicio - {otv3.titulo}"

    logo_b64 = get_logo_empresa_b64(getattr(otv3, 'empresa', None))

    send_email_task.delay(
        subject=subject,
        recipient_list=[email],
        html_body=html_body,
        titulo=titulo,
        url_boton=url,
        text_boton="Evaluar Servicio",
        logo_empresa_b64=logo_b64,
        empresa_nombre=empresa_nombre,
    )


def reenviar_correo_retroalimentacion_v3(otv3):
    """
    Reenvía el correo de retroalimentación a la OT V3 cuya Retroalimentacion ya existe.
    Llamado desde el botón 'Reenviar correo' en el panel interno.
    """
    from core.tasks import send_email_task
    import os
    from django.conf import settings

    retro = Retroalimentacion.objects.filter(orden_trabajo_v3=otv3).first()
    if not retro:
        return

    cliente_solicitante = otv3.cliente_solicitante
    if not cliente_solicitante:
        return

    email = getattr(cliente_solicitante.usuario, "email", None)
    if not email:
        return

    nombre_cliente = (
        cliente_solicitante.usuario.get_nombre_completo()
        if hasattr(cliente_solicitante.usuario, "get_nombre_completo")
        else str(cliente_solicitante)
    )

    frontend_url = getattr(settings, "FRONTEND_URL", os.getenv("FRONTEND_URL", "http://127.0.0.1:5173"))
    url = f"{frontend_url}/retroalimentacion-orden-trabajo-v3/{retro.uuid}"

    empresa_nombre = getattr(otv3.empresa, "nombre", "Nuestra empresa")
    html_body = (
        f"<p>Estimado/a <strong>{nombre_cliente}</strong>,</p>"
        f"<p>Le recordamos que tiene pendiente evaluar el servicio de la orden "
        f"<strong>\"{otv3.titulo}\"</strong> realizado por "
        f"<strong>{empresa_nombre}</strong>.</p>"
        "<p>Su retroalimentacion nos ayuda a mejorar continuamente. "
        "La encuesta toma menos de 2 minutos.</p>"
        f"<p style='font-size:12px;color:#888;word-break:break-all;'>Si el boton no funciona, copie este enlace en su navegador:<br>"
        f"<a href='{url}'>{url}</a></p>"
    )
    titulo = f"Recordatorio: Encuesta de Satisfaccion - {otv3.titulo}"
    subject = f"Recordatorio - Evalue nuestro servicio: {otv3.titulo}"

    logo_b64 = get_logo_empresa_b64(getattr(otv3, 'empresa', None))

    send_email_task.delay(
        subject=subject,
        recipient_list=[email],
        html_body=html_body,
        titulo=titulo,
        url_boton=url,
        text_boton="Evaluar Servicio",
        logo_empresa_b64=logo_b64,
        empresa_nombre=empresa_nombre,
    )
