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
    logo_empresa_b64=None,
    empresa_nombre=None,
):
    """
    Tarea compartida para enviar correos electrónicos con variables dinámicas.
    """
    cc = cc or []
    site_name = os.getenv("EMAIL_SITE_NAME", "Gestion Snabb-it")
    display_name = empresa_nombre or site_name
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    # Si hay logo de empresa se muestra como imagen; si no, solo el nombre del sistema como texto.
    if logo_empresa_b64:
        header_content = (
            f'<a href="{frontend_url}" target="_blank" style="display:inline-block;">'
            f'<img src="{logo_empresa_b64}" alt="{display_name}" width="180" style="display:block; max-width:100%; height:auto;" />'
            f'</a>'
        )
    else:
        header_content = (
            f'<span style="font-family:Arial,sans-serif; font-size:20px; font-weight:bold; color:#ffffff;">'
            f'{display_name}'
            f'</span>'
        )
    privacy_url = os.getenv("PRIVACY_POLICY_URL", f"{frontend_url}/politica-de-privacidad")
    support_email = os.getenv("SUPPORT_EMAIL") or os.getenv("CORREO_APPWEB")
    support_phone = os.getenv("SUPPORT_PHONE")
    preheader = os.getenv(
        "EMAIL_PREHEADER",
        "Te informamos sobre una actualización importante de tu cuenta o cotización.",
    )

    # Linea de soporte pre-computada para el footer
    if support_email:
        _phone_part = f" o llamanos al {support_phone}" if support_phone else ""
        _footer_support = (
            f'<p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;'
            f'color:#6b7280;mso-line-height-rule:exactly;">'
            f'¿Necesitas ayuda? Escríbenos a '
            f'<a href="mailto:{support_email}" style="color:#006bdb;text-decoration:none;">{support_email}</a>'
            f'{_phone_part}.</p>'
        )
    else:
        _footer_support = ""

    _outer_bg        = "#f5f7fb"
    _header_bg       = "#006bdb"
    _btn_bg          = "#006bdb"
    _btn_border_clr  = "#005fcc"
    _btn_arcsize     = "50%"
    _btn_radius      = "24px"
    _footer_bg       = "#f3f4f6"
    _footer_text_clr = "#6b7280"
    _footer_link_clr = "#006bdb"

    html_template = f"""<!DOCTYPE html>
<html lang="es" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>{subject}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  #outlook a {{ padding: 0; }}
  body {{ margin: 0; padding: 0; background-color: {_outer_bg}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
  table, td {{ border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
  img {{ border: 0; outline: none; text-decoration: none; display: block; -ms-interpolation-mode: bicubic; }}
  a {{ color: #006bdb; text-decoration: none; }}
</style>
</head>
<body style="margin:0;padding:0;background-color:{_outer_bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="{_outer_bg}"><tr><td><![endif]-->
<span style="display:none;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">{preheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="{_outer_bg}" style="background-color:{_outer_bg};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
        <tr>
          <td align="center" bgcolor="{_header_bg}"
              style="background-color:{_header_bg};padding:28px 32px;border-radius:8px 8px 0 0;mso-padding-alt:28px 32px;">
            {header_content}
          </td>
        </tr>
        <tr>
          <td bgcolor="#ffffff" align="left"
              style="background-color:#ffffff;padding:32px 32px 0 32px;">
            <h1 style="margin:0;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:22px;line-height:30px;font-weight:700;color:#0f172a;mso-line-height-rule:exactly;">{titulo}</h1>
          </td>
        </tr>
        <tr>
          <td bgcolor="#ffffff" align="left"
              style="background-color:#ffffff;padding:20px 32px 32px 32px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;mso-line-height-rule:exactly;">
            {html_body}
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0 0 0;">
              <tr>
                <td align="center">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                    href="{url_boton}"
                    style="height:48px;v-text-anchor:middle;width:240px;"
                    arcsize="{_btn_arcsize}" strokecolor="{_btn_border_clr}" fillcolor="{_btn_bg}">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;">{text_boton}</center>
                  </v:roundrect>
                  <![endif]--><!--[if !mso]><!-->
                  <a href="{url_boton}" target="_blank"
                     style="background-color:{_btn_bg};border-radius:{_btn_radius};color:#ffffff;display:inline-block;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1;padding:14px 32px;text-decoration:none;-webkit-text-size-adjust:none;">
                    {text_boton}
                  </a><!--<![endif]-->
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 8px 0;font-size:14px;line-height:21px;color:#6b7280;font-family:Arial,sans-serif;mso-line-height-rule:exactly;">Si tienes alguna pregunta, no dudes en contactarnos. Estamos aquí para ayudarte.</p>
            <p style="margin:0 0 4px 0;font-size:15px;color:#374151;font-family:Arial,sans-serif;">Gracias,</p>
            <p style="margin:0;font-size:15px;color:#374151;font-family:Arial,sans-serif;"><strong>El Equipo de {display_name}</strong></p>
          </td>
        </tr>
        <tr>
          <td bgcolor="{_footer_bg}" align="center"
              style="background-color:{_footer_bg};padding:20px 32px;border-radius:0 0 8px 8px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:12px;line-height:18px;color:{_footer_text_clr};mso-line-height-rule:exactly;">
            {_footer_support}<p style="margin:0 0 6px 0;">&copy; {display_name}. Todos los derechos reservados.</p>
            <p style="margin:0;"><a href="{privacy_url}" target="_blank" style="color:{_footer_link_clr};text-decoration:none;">Política de Privacidad</a></p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<!--[if mso | IE]></td></tr></table><![endif]-->
</body>
</html>"""

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
                f"El Equipo de {display_name}",
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
