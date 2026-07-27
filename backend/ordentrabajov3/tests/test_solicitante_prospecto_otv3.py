from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.test import APITestCase

from cuentas.models import User
from core.models import PersonalizacionUsuario
from empresas.models import Empresa, RelacionEmpresa, SucursalEmpresa, UsuarioEmpresa
from ordentrabajov3.models import OrdenDeTrabajoV3


class CrearSolicitanteProspectoOTV3ApiTest(APITestCase):
    def setUp(self):
        super().setUp()

        self.empresa_prestadora = Empresa.objects.create(
            nombre="Prestador",
            direccion_principal="Calle 123",
        )
        self.sucursal_prestadora = SucursalEmpresa.objects.create(
            nombre="Casa matriz",
            empresa=self.empresa_prestadora,
        )

        self.empresa_prospecto = Empresa.objects.create(
            nombre="Prospecto",
            direccion_principal="Av. 456",
        )
        self.sucursal_prospecto = SucursalEmpresa.objects.create(
            nombre="Casa Matriz",
            empresa=self.empresa_prospecto,
        )
        RelacionEmpresa.objects.create(
            prestador_servicios=self.empresa_prestadora,
            cliente=self.empresa_prospecto,
            tipo_relacion="prospecto",
        )

        self.user = User.objects.create_user(
            email="staff@test.com",
            password="testpass123",
            first_name="Staff",
            last_name="Test",
        )
        usuario_empresa = UsuarioEmpresa.objects.create(usuario=self.user, sucursal=self.sucursal_prestadora)
        grupo_staff, _ = Group.objects.get_or_create(name="staff")
        usuario_empresa.grupos.add(grupo_staff)

        pers = PersonalizacionUsuario.objects.filter(usuario=self.user).first()
        if pers:
            pers.sucursal_principal = self.sucursal_prestadora
            pers.save(update_fields=["sucursal_principal"])
        else:
            PersonalizacionUsuario.objects.create(usuario=self.user, sucursal_principal=self.sucursal_prestadora)

        self.client.force_authenticate(user=self.user)

    def test_crear_solicitante_prospecto_ok(self):
        ot = OrdenDeTrabajoV3.objects.create(
            empresa=self.empresa_prestadora,
            cliente=self.empresa_prospecto,
            titulo="OT V3 Prospecto",
            estado="borrador",
        )

        resp = self.client.post(
            f"/api/v3/ordenes/{ot.id}/crear-solicitante-prospecto/",
            {
                "email": "contacto@prospecto.test",
                "first_name": "Contacto",
                "last_name": "Prospecto",
                "celular": "+56911111111",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ot.refresh_from_db()
        self.assertIsNotNone(ot.cliente_solicitante_id)
        self.assertEqual(ot.cliente_solicitante.sucursal.empresa_id, self.empresa_prospecto.id)
        self.assertEqual(ot.cliente_solicitante.usuario.email, "contacto@prospecto.test")

    def test_no_permite_crear_si_no_borrador(self):
        ot = OrdenDeTrabajoV3.objects.create(
            empresa=self.empresa_prestadora,
            cliente=self.empresa_prospecto,
            titulo="OT V3 Prospecto",
            estado="preparacion",
        )

        resp = self.client.post(
            f"/api/v3/ordenes/{ot.id}/crear-solicitante-prospecto/",
            {"email": "a@b.com", "first_name": "A", "last_name": "B"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_permite_crear_si_cliente_no_es_prospecto(self):
        empresa_cliente = Empresa.objects.create(
            nombre="Cliente normal",
            direccion_principal="Calle 999",
        )
        SucursalEmpresa.objects.create(nombre="Casa Matriz", empresa=empresa_cliente)
        RelacionEmpresa.objects.create(
            prestador_servicios=self.empresa_prestadora,
            cliente=empresa_cliente,
            tipo_relacion="prestador-cliente",
        )

        ot = OrdenDeTrabajoV3.objects.create(
            empresa=self.empresa_prestadora,
            cliente=empresa_cliente,
            titulo="OT V3 Normal",
            estado="borrador",
        )

        resp = self.client.post(
            f"/api/v3/ordenes/{ot.id}/crear-solicitante-prospecto/",
            {"email": "a@b.com", "first_name": "A", "last_name": "B"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_email_duplicado_rechaza(self):
        ot = OrdenDeTrabajoV3.objects.create(
            empresa=self.empresa_prestadora,
            cliente=self.empresa_prospecto,
            titulo="OT V3 Prospecto",
            estado="borrador",
        )

        User.objects.create_user(
            email="dup@test.com",
            password="x",
            first_name="Dup",
            last_name="User",
        )

        resp = self.client.post(
            f"/api/v3/ordenes/{ot.id}/crear-solicitante-prospecto/",
            {"email": "dup@test.com", "first_name": "A", "last_name": "B"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
