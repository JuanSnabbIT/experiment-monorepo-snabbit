from rest_framework import status
from rest_framework.test import APITestCase

from core.factories import crear_usuario_en_rol
from empresas.models import Empresa, SucursalEmpresa


class RetroalimentacionPermisosTest(APITestCase):
    def setUp(self):
        self.empresa = Empresa.objects.create(nombre="Empresa Permisos RT", direccion_principal="Dir")
        self.sucursal = SucursalEmpresa.objects.create(nombre="Casa Matriz", empresa=self.empresa)

    def test_usuario_sin_rol_permitido_recibe_403(self):
        user, _ = crear_usuario_en_rol(self.sucursal, "tecnico", sufijo="rt-sin-rol")
        self.client.force_authenticate(user=user)

        response = self.client.get("/api/retroalimentacion/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_usuario_con_rol_rrhh_puede_listar(self):
        user, _ = crear_usuario_en_rol(self.sucursal, "rrhh", sufijo="rt-con-rol")
        self.client.force_authenticate(user=user)

        response = self.client.get("/api/retroalimentacion/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
