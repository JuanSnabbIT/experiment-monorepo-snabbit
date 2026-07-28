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


class SoftwareViewSetPermisosTest(TestCase):
    def setUp(self):
        from empresas.models import Empresa, SucursalEmpresa
        from rest_framework.test import APIClient

        self.client = APIClient()
        self.empresa = Empresa.objects.create(nombre="Empresa Permisos Core", direccion_principal="Dir")
        self.sucursal = SucursalEmpresa.objects.create(nombre="Casa Matriz", empresa=self.empresa)

    def test_usuario_sin_rol_permitido_recibe_403(self):
        from core.factories import crear_usuario_en_rol

        user, _ = crear_usuario_en_rol(self.sucursal, "tecnico", sufijo="core-sin-rol")
        self.client.force_authenticate(user=user)

        response = self.client.get("/api/softwares/")

        self.assertEqual(response.status_code, 403)

    def test_usuario_con_rol_staff_puede_listar(self):
        from core.factories import crear_usuario_en_rol

        user, _ = crear_usuario_en_rol(self.sucursal, "staff", sufijo="core-con-rol")
        self.client.force_authenticate(user=user)

        response = self.client.get("/api/softwares/")

        self.assertEqual(response.status_code, 200)


class TienePermisoPorAccionTest(TestCase):
    """Fase 7: motor de permisos por acción gestionable desde BD (RecursoAccion)."""

    def setUp(self):
        from django.contrib.auth.models import Group
        from empresas.models import Empresa, SucursalEmpresa
        from core.models import RecursoAccion

        self.empresa = Empresa.objects.create(nombre="Empresa Fase7", direccion_principal="Dir")
        self.sucursal = SucursalEmpresa.objects.create(nombre="Casa Matriz", empresa=self.empresa)
        self.grupo_permitido, _ = Group.objects.get_or_create(name="rol-con-permiso")
        self.recurso_accion = RecursoAccion.objects.create(
            recurso="core.recurso_de_prueba", accion="list", descripcion="test"
        )
        self.recurso_accion.grupos.add(self.grupo_permitido)

    def _fake_view(self, recurso="core.recurso_de_prueba", accion="list"):
        class FakeView:
            recurso_permiso = recurso
            action = accion

        return FakeView()

    def _fake_request(self, user):
        class FakeRequest:
            pass

        req = FakeRequest()
        req.user = user
        return req

    def test_usuario_con_rol_permitido_pasa(self):
        from core.permissions import TienePermisoPorAccion
        from core.factories import crear_usuario_en_rol

        user, _ = crear_usuario_en_rol(self.sucursal, "rol-con-permiso", sufijo="fase7-con-rol")
        permiso = TienePermisoPorAccion()

        self.assertTrue(permiso.has_permission(self._fake_request(user), self._fake_view()))

    def test_usuario_sin_rol_permitido_no_pasa(self):
        from core.permissions import TienePermisoPorAccion
        from core.factories import crear_usuario_en_rol

        user, _ = crear_usuario_en_rol(self.sucursal, "otro-rol", sufijo="fase7-sin-rol")
        permiso = TienePermisoPorAccion()

        self.assertFalse(permiso.has_permission(self._fake_request(user), self._fake_view()))

    def test_accion_no_catalogada_falla_cerrado(self):
        """Una acción sin fila RecursoAccion se deniega (fail-closed), no se asume acceso."""
        from core.permissions import TienePermisoPorAccion
        from core.factories import crear_usuario_en_rol

        user, _ = crear_usuario_en_rol(self.sucursal, "rol-con-permiso", sufijo="fase7-accion-no-cat")
        permiso = TienePermisoPorAccion()

        self.assertFalse(
            permiso.has_permission(self._fake_request(user), self._fake_view(accion="destroy"))
        )

    def test_sin_recurso_permiso_declarado_no_pasa(self):
        from core.permissions import TienePermisoPorAccion
        from core.factories import crear_usuario_en_rol

        user, _ = crear_usuario_en_rol(self.sucursal, "rol-con-permiso", sufijo="fase7-sin-recurso")
        permiso = TienePermisoPorAccion()

        self.assertFalse(
            permiso.has_permission(self._fake_request(user), self._fake_view(recurso=None))
        )


class CondicionEspecialViewSetPilotoFase7Test(TestCase):
    """Regresión end-to-end del piloto de migración: CondicionEspecialViewSet
    debe comportarse igual que antes (solo superadmin/staff) tras pasar de
    requiere_roles(...) a TienePermisoPorAccion + RecursoAccion sembrada."""

    def setUp(self):
        from empresas.models import Empresa, SucursalEmpresa
        from rest_framework.test import APIClient

        self.client = APIClient()
        self.empresa = Empresa.objects.create(nombre="Empresa Piloto Fase7", direccion_principal="Dir")
        self.sucursal = SucursalEmpresa.objects.create(nombre="Casa Matriz", empresa=self.empresa)

    def test_staff_puede_listar_condiciones_especiales(self):
        from core.factories import crear_usuario_en_rol

        user, _ = crear_usuario_en_rol(self.sucursal, "staff", sufijo="piloto-staff")
        self.client.force_authenticate(user=user)

        response = self.client.get("/api/condiciones-especiales/")

        self.assertEqual(response.status_code, 200)

    def test_rol_sin_permiso_recibe_403(self):
        from core.factories import crear_usuario_en_rol

        user, _ = crear_usuario_en_rol(self.sucursal, "tecnico", sufijo="piloto-sin-permiso")
        self.client.force_authenticate(user=user)

        response = self.client.get("/api/condiciones-especiales/")

        self.assertEqual(response.status_code, 403)
