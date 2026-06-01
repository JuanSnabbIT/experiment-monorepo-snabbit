"""
Tests para el Motor Plantillas V2 — PlantillaContratoV2ViewSet y SeccionPlantillaV2ViewSet.

Cubre:
  - Multi-tenancy: empresa A no ve plantillas de empresa B
  - CRUD: crear inyecta empresa_prestadora, listar, actualizar, eliminar, duplicar
  - Scope wizard: ordenamiento cliente-especifica primero
  - SeccionV2: POST sin plantilla en body -> 201; plantilla de otra empresa -> 404
"""

from rest_framework import status
from rest_framework.test import APITestCase

from contratos.models import PlantillaContrato, SeccionPlantilla
from cuentas.models import User
from core.models import PersonalizacionUsuario
from empresas.models import Empresa, SucursalEmpresa


class PlantillaV2TestBase(APITestCase):
    """Base con setup de dos empresas para tests multi-tenancy."""

    def _crear_empresa_usuario(self, nombre_empresa, email):
        empresa = Empresa.objects.create(nombre=nombre_empresa)
        sucursal = SucursalEmpresa.objects.create(
            nombre=f"Sucursal {nombre_empresa}",
            empresa=empresa,
        )
        user = User.objects.create_user(email=email, password="testpass123")
        pers = PersonalizacionUsuario.objects.get(usuario=user)
        pers.sucursal_principal = sucursal
        pers.save()
        return empresa, sucursal, user

    def setUp(self):
        self.empresa_a, self.sucursal_a, self.user_a = self._crear_empresa_usuario(
            "Empresa A", "a@test.com"
        )
        self.empresa_b, self.sucursal_b, self.user_b = self._crear_empresa_usuario(
            "Empresa B", "b@test.com"
        )
        self.empresa_cliente = Empresa.objects.create(nombre="Cliente XYZ")

        # Plantilla de empresa A
        self.plantilla_a = PlantillaContrato.objects.create(
            empresa_prestadora=self.empresa_a,
            titulo="Plantilla A",
            tipo_contrato="servicios",
        )
        # Plantilla de empresa B (no debe ser visible para A)
        self.plantilla_b = PlantillaContrato.objects.create(
            empresa_prestadora=self.empresa_b,
            titulo="Plantilla B",
            tipo_contrato="servicios",
        )

    BASE_URL = "/api/contratos/plantillas-contrato-v2/"


class PlantillaV2MultiTenancyTest(PlantillaV2TestBase):
    """Empresa A no debe ver plantillas de empresa B."""

    def test_lista_solo_devuelve_plantillas_propias(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [p["id"] for p in response.data]
        self.assertIn(self.plantilla_a.id, ids)
        self.assertNotIn(self.plantilla_b.id, ids)

    def test_detalle_otra_empresa_retorna_404(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(f"{self.BASE_URL}{self.plantilla_b.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_sin_autenticacion_retorna_401(self):
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PlantillaV2CRUDTest(PlantillaV2TestBase):
    """CRUD basico: crear inyecta empresa_prestadora; actualizar y eliminar funcionan."""

    def test_crear_plantilla_inyecta_empresa_prestadora(self):
        self.client.force_authenticate(user=self.user_a)
        payload = {
            "titulo": "Nueva Plantilla",
            "tipo_contrato": "licencia",
        }
        response = self.client.post(self.BASE_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        nueva = PlantillaContrato.objects.get(id=response.data["id"])
        self.assertEqual(nueva.empresa_prestadora, self.empresa_a)

    def test_crear_plantilla_con_empresa_cliente(self):
        self.client.force_authenticate(user=self.user_a)
        payload = {
            "titulo": "Plantilla Scoped",
            "tipo_contrato": "servicios",
            "empresa_cliente": self.empresa_cliente.id,
        }
        response = self.client.post(self.BASE_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        nueva = PlantillaContrato.objects.get(id=response.data["id"])
        self.assertEqual(nueva.empresa_cliente, self.empresa_cliente)

    def test_actualizar_plantilla_propia(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.patch(
            f"{self.BASE_URL}{self.plantilla_a.id}/",
            {"titulo": "Titulo Actualizado"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.plantilla_a.refresh_from_db()
        self.assertEqual(self.plantilla_a.titulo, "Titulo Actualizado")

    def test_eliminar_plantilla_propia(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.delete(f"{self.BASE_URL}{self.plantilla_a.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PlantillaContrato.objects.filter(id=self.plantilla_a.id).exists())

    def test_duplicar_crea_nueva_plantilla_misma_empresa(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(f"{self.BASE_URL}{self.plantilla_a.id}/duplicar/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        nueva_id = response.data["id"]
        self.assertNotEqual(nueva_id, self.plantilla_a.id)
        nueva = PlantillaContrato.objects.get(id=nueva_id)
        self.assertEqual(nueva.empresa_prestadora, self.empresa_a)


class PlantillaV2ScopeWizardTest(PlantillaV2TestBase):
    """scope=wizard devuelve plantillas activas; cliente-especifica aparece primero."""

    def setUp(self):
        super().setUp()
        # Plantilla global de empresa A (activa)
        self.plantilla_global = PlantillaContrato.objects.create(
            empresa_prestadora=self.empresa_a,
            titulo="Global",
            tipo_contrato="servicios",
            activa=True,
            empresa_cliente=None,
        )
        # Plantilla especifica para empresa_cliente
        self.plantilla_scoped = PlantillaContrato.objects.create(
            empresa_prestadora=self.empresa_a,
            titulo="Especifica Cliente",
            tipo_contrato="servicios",
            activa=True,
            empresa_cliente=self.empresa_cliente,
        )
        # Plantilla inactiva (no debe aparecer)
        self.plantilla_inactiva = PlantillaContrato.objects.create(
            empresa_prestadora=self.empresa_a,
            titulo="Inactiva",
            tipo_contrato="servicios",
            activa=False,
        )

    def test_scope_wizard_excluye_plantillas_inactivas(self):
        self.client.force_authenticate(user=self.user_a)
        url = f"{self.BASE_URL}?scope=wizard&empresa_cliente={self.empresa_cliente.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [p["id"] for p in response.data]
        self.assertNotIn(self.plantilla_inactiva.id, ids)

    def test_scope_wizard_cliente_especifica_aparece_primero(self):
        self.client.force_authenticate(user=self.user_a)
        url = f"{self.BASE_URL}?scope=wizard&empresa_cliente={self.empresa_cliente.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [p["id"] for p in response.data]
        self.assertIn(self.plantilla_scoped.id, ids)
        self.assertIn(self.plantilla_global.id, ids)
        # La especifica debe aparecer antes que la global
        idx_scoped = ids.index(self.plantilla_scoped.id)
        idx_global = ids.index(self.plantilla_global.id)
        self.assertLess(idx_scoped, idx_global)


class SeccionV2InjeccionTest(PlantillaV2TestBase):
    """POST sin `plantilla` en body inyecta desde URL; plantilla de otra empresa -> 404."""

    def setUp(self):
        super().setUp()
        self.base_url = (
            f"/api/contratos/plantillas-contrato-v2/{self.plantilla_a.id}/secciones-v2/"
        )

    def test_crear_seccion_inyecta_plantilla_desde_url(self):
        self.client.force_authenticate(user=self.user_a)
        payload = {
            "titulo": "Clausula de prueba",
            "contenido_template": "Texto de prueba.",
            "tipo": "clausula",
            "orden": 1,
        }
        response = self.client.post(self.base_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        seccion = SeccionPlantilla.objects.get(id=response.data["id"])
        self.assertEqual(seccion.plantilla, self.plantilla_a)

    def test_acceso_secciones_plantilla_otra_empresa_retorna_404(self):
        self.client.force_authenticate(user=self.user_a)
        url = f"/api/contratos/plantillas-contrato-v2/{self.plantilla_b.id}/secciones-v2/"
        response = self.client.get(url)
        # El ViewSet filtra por empresa, por lo que la plantilla no existe en el queryset
        self.assertIn(
            response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND],
        )
