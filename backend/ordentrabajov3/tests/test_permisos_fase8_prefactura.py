"""Fase 8: regresion de permisos tras migrar PrefacturaOTV3ViewSet de
requiere_roles(...) a TienePermisoPorAccion. superadmin/staff/finanzas
siguen accediendo, cualquier otro rol sigue recibiendo 403.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from core.factories import crear_usuario_en_rol
from empresas.models import Empresa, SucursalEmpresa


class PrefacturaOTV3Fase8PermisosTest(TestCase):
    URL = "/api/v3/prefacturas-otv3/"

    def setUp(self):
        self.client = APIClient()
        self.empresa = Empresa.objects.create(nombre="Empresa Prefactura Fase8", direccion_principal="Dir")
        self.sucursal = SucursalEmpresa.objects.create(nombre="Casa Matriz", empresa=self.empresa)

    def test_rol_finanzas_puede_listar(self):
        user, _ = crear_usuario_en_rol(self.sucursal, "finanzas", sufijo="fase8-prefactura-finanzas")
        self.client.force_authenticate(user=user)

        response = self.client.get(self.URL)

        self.assertEqual(response.status_code, 200)

    def test_rol_sin_permiso_recibe_403(self):
        user, _ = crear_usuario_en_rol(self.sucursal, "tecnico", sufijo="fase8-prefactura-403")
        self.client.force_authenticate(user=user)

        response = self.client.get(self.URL)

        self.assertEqual(response.status_code, 403)

    def test_finalizar_rol_finanzas_pasa_el_permiso(self):
        user, _ = crear_usuario_en_rol(self.sucursal, "finanzas", sufijo="fase8-prefactura-finalizar-ok")
        self.client.force_authenticate(user=user)

        response = self.client.post(f"{self.URL}999999/finalizar/", {}, format="json")

        self.assertEqual(response.status_code, 404)

    def test_finalizar_rol_sin_permiso_recibe_403(self):
        user, _ = crear_usuario_en_rol(self.sucursal, "tecnico", sufijo="fase8-prefactura-finalizar-403")
        self.client.force_authenticate(user=user)

        response = self.client.post(f"{self.URL}999999/finalizar/", {}, format="json")

        self.assertEqual(response.status_code, 403)
