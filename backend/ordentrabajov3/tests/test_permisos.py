from rest_framework import status
from rest_framework.test import APITestCase

from core.factories import crear_usuario_en_rol
from empresas.models import Empresa, SucursalEmpresa


class OrdenDeTrabajoV3PermisosTest(APITestCase):
    def setUp(self):
        self.empresa = Empresa.objects.create(nombre="Empresa Permisos OTV3", direccion_principal="Dir")
        self.sucursal = SucursalEmpresa.objects.create(nombre="Casa Matriz", empresa=self.empresa)

    def test_usuario_sin_rol_permitido_recibe_403(self):
        user, _ = crear_usuario_en_rol(self.sucursal, "ventas", sufijo="otv3-sin-rol")
        self.client.force_authenticate(user=user)

        response = self.client.get("/api/v3/ordenes/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_usuario_finanzas_puede_listar_pero_no_crear(self):
        user, _ = crear_usuario_en_rol(self.sucursal, "finanzas", sufijo="otv3-finanzas")
        self.client.force_authenticate(user=user)

        response_list = self.client.get("/api/v3/ordenes/")
        self.assertEqual(response_list.status_code, status.HTTP_200_OK)

        response_create = self.client.post("/api/v3/ordenes/", {}, format="json")
        self.assertEqual(response_create.status_code, status.HTTP_403_FORBIDDEN)
