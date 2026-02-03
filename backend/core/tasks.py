import os

from celery import shared_task
from django.apps import apps
from django.core.mail import EmailMessage
from dotenv import load_dotenv

load_dotenv()


@shared_task
def send_email_task(
    subject,
    recipient_list,
    html_body,
    titulo,
    url_boton,
    text_boton,
    cc=[],
    pdf_attachment=None,
    on_success_cotizacion_id=None,
    on_success_correos_externos=None,
):
    """
    Tarea compartida para enviar correos electrónicos con variables dinámicas.
    """
    body = """
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>{subject}</title>
                <style>
                    body {{
                        margin: 0;
                        padding: 0;
                        font-family: Arial, sans-serif;
                        background-color: rgb(240, 240, 240);
                        color: rgb(50, 50, 50);
                    }}
                    table {{
                        border-spacing: 0;
                        border-collapse: collapse;
                        margin: 0 auto;
                        width: 100%;
                        max-width: 600px;
                    }}
                    img {{
                        display: block;
                        max-width: 100%;
                        height: auto;
                        border: 0;
                    }}
                    .email-container {{
                        background-color: rgb(255, 255, 255);
                        border-radius: 8px;
                        overflow: hidden;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    }}
                    .header {{
                        position: relative;
                        text-align: center;
                        color: #ffffff;
                    }}
                    .header img {{
                        width: 100%;
                        height: auto;
                    }}
                    .header h1 {{
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        font-size: 28px;
                        font-weight: bold;
                        color: rgb(255, 255, 255);
                        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
                    }}
                    .body {{
                        padding: 20px;
                        color: rgb(50, 50, 50);
                        font-size: 16px;
                        line-height: 1.6;
                    }}
                    .body h2 {{
                        color: rgb(0, 123, 255);
                        font-size: 20px;
                        margin-bottom: 10px;
                    }}
                    .cta-button {{
                        display: inline-block;
                        background-color: rgb(0, 123, 255);
                        color: #ffffff;
                        text-decoration: none;
                        padding: 12px 25px;
                        border-radius: 25px;
                        margin-top: 20px;
                        font-size: 16px;
                        font-weight: bold;
                        text-align: center;
                    }}
                    .cta-button:hover {{
                        background-color: rgb(0, 100, 204);
                    }}
                    .footer {{
                        text-align: center;
                        background-color: rgb(240, 240, 240);
                        color: rgb(100, 100, 100);
                        padding: 15px;
                        font-size: 14px;
                    }}
                    .footer a {{
                        color: rgb(0, 123, 255);
                        text-decoration: none;
                    }}
                </style>
            </head>
            <body>
                <table class="email-container">
                    <!-- Header Section with Image and Title -->
                    <tr>
                        <td class="header">
                            <img src="{img}" alt="Header Image">
                            <h1>{titulo}</h1>
                        </td>
                    </tr>
                    <!-- Body Section -->
                    <tr>
                        <td class="body">
                            <h2>Hola,</h2>
                            {html_body}
                            <div style="text-align: center;">
                                <a href="{url_boton}" class="cta-button">{text_boton}</a>
                            </div>
                            <p>Si tienes alguna pregunta, no dudes en contactarnos. ¡Estamos aquí para ayudarte!</p>
                            <p>Gracias,</p>
                            <p><strong>El Equipo de {site_name}</strong></p>
                        </td>
                    </tr>
                    <!-- Footer Section -->
                    <tr>
                        <td class="footer">
                            <p>© 2025 {site_name}. Todos los derechos reservados.</p>
                            <p><a href="#">Política de Privacidad</a></p>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
    """

    formatted_body = body.format(
        img=f"{os.getenv('FRONTEND_URL')}/logo192.png",
        subject=subject,
        site_name="Gestion Snabb-it",
        titulo=titulo,
        html_body=html_body,
        url_boton=url_boton,
        text_boton=text_boton,
    )

    try:
        email = EmailMessage(
            subject=subject,
            body=formatted_body,
            from_email=os.getenv("CORREO_APPWEB") or "appweb@teloinvento.cl",
            to=recipient_list,
            cc=cc,
        )
        email.content_subtype = "html"  # Especificar que el contenido es HTML

        # Adjuntar el PDF si se proporciona
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
