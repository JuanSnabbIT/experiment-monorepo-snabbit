import os
import re

from celery import shared_task
from django.apps import apps
from django.core.mail import EmailMultiAlternatives
from dotenv import load_dotenv

load_dotenv()


def _strip_html_to_text(html_value: str) -> str:
    if not html_value:
        return ""
    text = re.sub(r'<br\s*/?>', '\n', html_value, flags=re.IGNORECASE)
    text = re.sub(r'</p\s*>', '\n\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


@shared_task
def send_email_task(
    subject,
    recipient_list,
    html_body,
    titulo,
    url_boton,
    text_boton,
    cc=None,
    pdf_attachment=None,
    on_success_cotizacion_id=None,
    on_success_correos_externos=None,
):
    """
    Tarea compartida para enviar correos electrónicos con variables dinámicas.
    """
    cc = cc or []
    site_name = os.getenv("EMAIL_SITE_NAME", "Gestion Snabb-it")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    logo_url = f"{frontend_url}/images/logosnabbit.gif"
    privacy_url = os.getenv("PRIVACY_POLICY_URL", f"{frontend_url}/politica-de-privacidad")
    support_email = os.getenv("SUPPORT_EMAIL") or os.getenv("CORREO_APPWEB")
    support_phone = os.getenv("SUPPORT_PHONE")
    preheader = os.getenv(
        "EMAIL_PREHEADER",
        "Te informamos sobre una actualización importante de tu cuenta o cotización.",
    )

    html_template = f"""
        <!DOCTYPE html>
        <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="X-UA-Compatible" content="IE=edge" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>{subject}</title>
                <style>
                    body {{ margin: 0; padding: 0; background-color: #f5f7fb; }}
                    table {{ border-collapse: collapse; border-spacing: 0; }}
                    img {{ border: 0; outline: none; text-decoration: none; display: block; }}
                    a {{ color: #006bdb; text-decoration: none; }}
                    .button {{ background-color: #006bdb; color: #ffffff; padding: 12px 24px; border-radius: 24px; display: inline-block; font-weight: bold; }}
                </style>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f5f7fb;">
                <span style="display:none;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">{preheader}</span>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f5f7fb">
                    <tr>
                        <td align="center" style="padding: 20px 10px;">
                            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:10px; overflow:hidden;">
                                <tr>
                                    <td align="center" style="padding: 24px 20px; background-color:#0f172a;">
                                        <a href="{frontend_url}" target="_blank" style="display:inline-block;">
                                            <img src="{logo_url}" alt="Logo Gestion Snabb-it" width="180" style="display:block; max-width:100%; height:auto;" />
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="left" style="padding: 24px 24px 0 24px; font-family:Arial, sans-serif; color:#1f2937;">
                                        <h1 style="margin:0 0 16px 0; font-size:26px; line-height:32px; color:#0f172a;">{titulo}</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="left" style="padding: 0 24px 24px 24px; font-family:Arial, sans-serif; color:#374151; font-size:16px; line-height:24px;">
                                        <p style="margin:0 0 16px 0;">Hola,</p>
                                        {html_body}
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0 0 0;">
                                            <tr>
                                                <td align="center">
                                                    <a href="{url_boton}" target="_blank" class="button">{text_boton}</a>
                                                </td>
                                            </tr>
                                        </table>
                                        <p style="margin:24px 0 8px 0;">Si tienes alguna pregunta, no dudes en contactarnos. Estamos aquí para ayudarte.</p>
                                        <p style="margin:0 0 4px 0;">Gracias,</p>
                                        <p style="margin:0 0 0 0;"><strong>El Equipo de {site_name}</strong></p>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 20px 24px 24px 24px; font-family:Arial, sans-serif; font-size:14px; line-height:20px; color:#6b7280; background-color:#f3f4f6;">
                                        <p style="margin:0 0 8px 0;">¿Necesitas ayuda? Escríbenos a <a href="mailto:{support_email}">{support_email}</a>{' o llámanos al ' + support_phone if support_phone else ''}.</p>
                                        <p style="margin:0 0 8px 0;">© {site_name}. Todos los derechos reservados.</p>
                                        <p style="margin:0;"><a href="{privacy_url}" target="_blank">Política de Privacidad</a></p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
    """

    text_body = "\n".join(
        filter(
            None,
            [
                titulo,
                "",
                _strip_html_to_text(html_body),
                "",
                f"{text_boton}: {url_boton}",
                "",
                "Si tienes alguna pregunta, no dudes en contactarnos.",
                f"Email: {support_email}" if support_email else None,
                f"Teléfono: {support_phone}" if support_phone else None,
                "",
                "Gracias,",
                f"El Equipo de {site_name}",
            ],
        )
    )

    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=os.getenv("CORREO_APPWEB") or "appweb@teloinvento.cl",
            to=recipient_list,
            cc=cc,
        )
        email.attach_alternative(html_template, "text/html")

        if pdf_attachment:
            email.attach(pdf_attachment[0], pdf_attachment[1], "application/pdf")

        email.send()

        if on_success_cotizacion_id:
            Cotizacion = apps.get_model("cotizaciones", "Cotizacion")
            EnvioCorreoCotizacion = apps.get_model(
                "cotizaciones", "EnvioCorreoCotizacion"
            )
            correos_externos = on_success_correos_externos or ""
            if isinstance(correos_externos, list):
                correos_externos = ", ".join(
                    [email for email in correos_externos if email]
                )
            Cotizacion.objects.filter(id=on_success_cotizacion_id).update(
                estado="enviada"
            )
            EnvioCorreoCotizacion.objects.create(
                cotizacion_id=on_success_cotizacion_id,
                correos_externos=correos_externos,
            )
        return f"Correo enviado a: {recipient_list}"
    except Exception as e:
        return f"Error enviando correo: {str(e)}"
