from rest_framework import status
from rest_framework.test import APITestCase

from core.factories import crear_usuario_en_rol
from empresas.models import Empresa, SucursalEmpresa


class UserViewSetPermisosTest(APITestCase):
    def setUp(self):
        self.empresa = Empresa.objects.create(nombre="Empresa Permisos Cuentas", direccion_principal="Dir")
        self.sucursal = SucursalEmpresa.objects.create(nombre="Casa Matriz", empresa=self.empresa)

    def test_usuario_sin_rol_permitido_recibe_403(self):
        user, _ = crear_usuario_en_rol(self.sucursal, "tecnico", sufijo="cuentas-sin-rol")
        self.client.force_authenticate(user=user)

        response = self.client.get("/api/users/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_usuario_con_rol_staff_puede_listar(self):
        user, _ = crear_usuario_en_rol(self.sucursal, "staff", sufijo="cuentas-con-rol")
        self.client.force_authenticate(user=user)

        response = self.client.get("/api/users/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
