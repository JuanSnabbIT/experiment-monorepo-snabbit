import os

from django.core import mail
from django.test import TestCase, override_settings

from core.tasks import send_email_task


class SendEmailTaskTest(TestCase):
    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_send_email_task_renders_es_language_and_presentation_roles(self):
        subject = 'Prueba de correo'
        recipient_list = ['cliente@example.com']
        html_body = '<p>Este es el contenido del correo.</p>'
        titulo = 'Notificación importante'
        url_boton = 'https://example.com/accion'
        text_boton = 'Ver detalle'

        result = send_email_task.run(
            subject,
            recipient_list,
            html_body,
            titulo,
            url_boton,
            text_boton,
        )

        self.assertEqual(result, f'Correo enviado a: {recipient_list}')
        self.assertEqual(len(mail.outbox), 1)

        message = mail.outbox[0]
        self.assertEqual(message.subject, subject)
        self.assertEqual(message.to, recipient_list)
        self.assertEqual(message.content_subtype, 'plain')
        self.assertTrue(any(part[1] == 'text/html' for part in message.alternatives))

        html_content = message.alternatives[0][0]
        self.assertIn('lang="es"', html_content)
        self.assertIn('role="presentation"', html_content)
        self.assertIn('<span style="display:none', html_content)
        self.assertIn('Este es el contenido del correo.', html_content)
        self.assertIn('Politica de Privacidad', html_content.replace('í', 'i'))
        self.assertIn(url_boton, html_content)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_send_email_task_cc_default_is_not_mutable(self):
        send_email_task.run(
            'Prueba 1',
            ['uno@example.com'],
            '<p>Mensaje 1</p>',
            'Prueba 1',
            'https://app.example.com/1',
            'Ir',
            cc=None,
        )
        send_email_task.run(
            'Prueba 2',
            ['dos@example.com'],
            '<p>Mensaje 2</p>',
            'Prueba 2',
            'https://app.example.com/2',
            'Ir',
            cc=None,
        )

        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(mail.outbox[0].cc, [])
        self.assertEqual(mail.outbox[1].cc, [])

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_send_email_task_uses_support_info_when_available(self):
        os.environ['SUPPORT_EMAIL'] = 'soporte@example.com'
        os.environ['SUPPORT_PHONE'] = '+56912345678'

        send_email_task.run(
            'Soporte',
            ['cliente2@example.com'],
            '<p>Contenido</p>',
            'Soporte técnico',
            'https://example.com/soporte',
            'Acceder',
        )

        message = mail.outbox[-1]
        html_content = message.alternatives[0][0]
        self.assertIn('soporte@example.com', html_content)
        self.assertIn('+56912345678', html_content)

        del os.environ['SUPPORT_EMAIL']
        del os.environ['SUPPORT_PHONE']

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_send_email_task_uses_company_name_when_logo_is_missing(self):
        send_email_task.run(
            'Prueba empresa',
            ['empresa@example.com'],
            '<p>Contenido</p>',
            'Notificación',
            'https://example.com',
            'Ir',
            empresa_nombre='ACME S.A.',
        )

        message = mail.outbox[-1]
        html_content = message.alternatives[0][0]
        self.assertIn('ACME S.A.', html_content)
        self.assertIn('El Equipo de ACME S.A.', html_content)
