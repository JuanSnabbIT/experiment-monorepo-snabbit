"""Fase 8: regresion de permisos tras migrar los 10 ViewSets de RRHH de
IsAdminOrRRHH a TienePermisoPorAccion (motor de permisos por accion desde
BD). Confirma que el comportamiento no cambio: superadmin/rrhh/staff
siguen accediendo, cualquier otro rol sigue recibiendo 403.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from core.factories import crear_usuario_en_rol
from empresas.models import Empresa, SucursalEmpresa


class RRHHFase8PermisosTest(TestCase):
    ENDPOINTS = [
        "/api/rrhh/cargos-catalogo/",
        "/api/rrhh/afp-catalogo/",
        "/api/rrhh/banco-catalogo/",
        "/api/rrhh/nacionalidad-catalogo/",
        "/api/rrhh/configuracion-laboral/",
        "/api/rrhh/turnos-laborales/",
        "/api/rrhh/grupos-turno/",
        "/api/rrhh/anexos-contrato/",
        "/api/rrhh/contratos-trabajador/",
        "/api/rrhh/finiquitos-contrato/",
    ]

    def setUp(self):
        self.client = APIClient()
        self.empresa = Empresa.objects.create(nombre="Empresa RRHH Fase8", direccion_principal="Dir")
        self.sucursal = SucursalEmpresa.objects.create(nombre="Casa Matriz", empresa=self.empresa)

    def test_rol_rrhh_puede_listar_todos_los_endpoints(self):
        user, _ = crear_usuario_en_rol(self.sucursal, "rrhh", sufijo="fase8-rrhh")
        self.client.force_authenticate(user=user)
        for url in self.ENDPOINTS:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200)

    def test_rol_sin_permiso_recibe_403_en_todos_los_endpoints(self):
        user, _ = crear_usuario_en_rol(self.sucursal, "tecnico", sufijo="fase8-sin-permiso")
        self.client.force_authenticate(user=user)
        for url in self.ENDPOINTS:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 403)

    def test_sin_autenticacion_recibe_401_en_todos_los_endpoints(self):
        for url in self.ENDPOINTS:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 401)


class ContratoTrabajadorAccionesPersonalizadasFase8Test(TestCase):
    """Verifica que una accion personalizada (no list/retrieve estandar)
    tambien queda protegida por el nuevo motor — el permiso se evalua
    antes de la busqueda del objeto, asi que un rol sin permiso recibe 403
    incluso sobre un id inexistente, y un rol permitido pasa a 404 (no
    encontrado) en vez de 403 (no autorizado)."""

    def setUp(self):
        self.client = APIClient()
        self.empresa = Empresa.objects.create(nombre="Empresa RRHH Fase8 Acciones", direccion_principal="Dir")
        self.sucursal = SucursalEmpresa.objects.create(nombre="Casa Matriz", empresa=self.empresa)

    def test_cambiar_estado_contrato_trabajador_rol_permitido_pasa_el_permiso(self):
        user, _ = crear_usuario_en_rol(self.sucursal, "rrhh", sufijo="fase8-cambiar-estado-ok")
        self.client.force_authenticate(user=user)

        response = self.client.post("/api/rrhh/contratos-trabajador/999999/cambiar-estado/", {}, format="json")

        self.assertEqual(response.status_code, 404)

    def test_cambiar_estado_contrato_trabajador_rol_no_permitido_recibe_403(self):
        user, _ = crear_usuario_en_rol(self.sucursal, "tecnico", sufijo="fase8-cambiar-estado-403")
        self.client.force_authenticate(user=user)

        response = self.client.post("/api/rrhh/contratos-trabajador/999999/cambiar-estado/", {}, format="json")

        self.assertEqual(response.status_code, 403)

    def test_aprobar_finiquito_rol_permitido_pasa_el_permiso(self):
        user, _ = crear_usuario_en_rol(self.sucursal, "staff", sufijo="fase8-aprobar-finiquito-ok")
        self.client.force_authenticate(user=user)

        response = self.client.post("/api/rrhh/finiquitos-contrato/999999/aprobar/", {}, format="multipart")

        self.assertEqual(response.status_code, 404)

    def test_aprobar_finiquito_rol_no_permitido_recibe_403(self):
        user, _ = crear_usuario_en_rol(self.sucursal, "tecnico", sufijo="fase8-aprobar-finiquito-403")
        self.client.force_authenticate(user=user)

        response = self.client.post("/api/rrhh/finiquitos-contrato/999999/aprobar/", {}, format="multipart")

        self.assertEqual(response.status_code, 403)
