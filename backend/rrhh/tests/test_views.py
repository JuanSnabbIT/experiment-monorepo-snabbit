"""
Tests de multi-tenancy, acciones y logica de negocio del modulo RRHH.

Cubre:
- ContratoTrabajadorViewSet: aislamiento por empresa
- AnexoContratoViewSet: aislamiento por empresa
- cambiar_estado: transiciones validas e invalidas
- subir_pdf: validacion de extension
- crear_con_trabajador: creacion atomica de UsuarioEmpresa + ContratoTrabajador
"""

import io
import datetime

from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import PersonalizacionUsuario
from cuentas.models import User
from empresas.models import Empresa, RelacionEmpresa, SucursalEmpresa, UsuarioEmpresa
from rrhh.models import AnexoContrato, ContratoTrabajador, EnvioAprobacionEmpleador


# ---------------------------------------------------------------------------
# Helpers de setup
# ---------------------------------------------------------------------------

def _crear_empresa(nombre):
    return Empresa.objects.create(
        nombre=nombre,
        direccion_principal="Calle Test 1",
    )


def _crear_sucursal(empresa, nombre="Casa Matriz"):
    return SucursalEmpresa.objects.create(
        nombre=nombre,
        empresa=empresa,
        direccion="Calle Test 1",
    )


def _crear_user(email, first_name="Test", last_name="User"):
    return User.objects.create(
        email=email,
        first_name=first_name,
        last_name=last_name,
        is_active=True,
    )


def _crear_usuario_empresa(sucursal, email_sufijo):
    """Crea User + UsuarioEmpresa asociado a la sucursal."""
    user = _crear_user(f"ue_{email_sufijo}@test.com", first_name="UE", last_name=email_sufijo)
    ue = UsuarioEmpresa.objects.create(usuario=user, sucursal=sucursal)
    return ue


def _setup_administrador(sucursal, email):
    """Crea User + PersonalizacionUsuario apuntando a sucursal_principal."""
    user = _crear_user(email)
    PersonalizacionUsuario.objects.create(usuario=user, sucursal_principal=sucursal)
    return user


def _contrato_base(usuario_empresa):
    """Crea un ContratoTrabajador minimo en estado borrador."""
    return ContratoTrabajador.objects.create(
        usuario_empresa=usuario_empresa,
        tipo_contrato="indefinido",
        fecha_inicio=datetime.date.today(),
        cargo="Desarrollador",
        jornada="completa",
        sueldo_base=1000000,
        moneda="CLP",
    )


# ---------------------------------------------------------------------------
# Multi-tenancy: ContratoTrabajador
# ---------------------------------------------------------------------------

class ContratoTrabajadorMultitenancyTest(APITestCase):
    """Verifica que cada empresa solo ve sus propios contratos."""

    URL = "/api/rrhh/contratos-trabajador/"

    def setUp(self):
        # Empresa A
        self.empresa_a = _crear_empresa("Empresa A")
        self.sucursal_a = _crear_sucursal(self.empresa_a)
        self.admin_a = _setup_administrador(self.sucursal_a, "admin_a@test.com")
        ue_a = _crear_usuario_empresa(self.sucursal_a, "trabajador_a")
        self.contrato_a = _contrato_base(ue_a)

        # Empresa B
        self.empresa_b = _crear_empresa("Empresa B")
        self.sucursal_b = _crear_sucursal(self.empresa_b)
        self.admin_b = _setup_administrador(self.sucursal_b, "admin_b@test.com")
        ue_b = _crear_usuario_empresa(self.sucursal_b, "trabajador_b")
        self.contrato_b = _contrato_base(ue_b)

    def test_admin_a_solo_ve_contratos_empresa_a(self):
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [c["id"] for c in response.data]
        self.assertIn(self.contrato_a.id, ids)
        self.assertNotIn(self.contrato_b.id, ids)

    def test_admin_b_solo_ve_contratos_empresa_b(self):
        self.client.force_authenticate(user=self.admin_b)
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [c["id"] for c in response.data]
        self.assertIn(self.contrato_b.id, ids)
        self.assertNotIn(self.contrato_a.id, ids)

    def test_sin_autenticacion_retorna_401(self):
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_usuario_sin_personalizacion_retorna_lista_vacia(self):
        user_sin_config = _crear_user("sin_config@test.com")
        self.client.force_authenticate(user=user_sin_config)
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class ContratoTrabajadorEmpresaClienteFilterTest(APITestCase):
    """Verifica filtro ?empresa_cliente en contratos RRHH para distintos origenes de datos."""

    URL = "/api/rrhh/contratos-trabajador/"

    def setUp(self):
        # Prestadora autenticada
        self.prestadora = _crear_empresa("Prestadora RRHH")
        self.sucursal_prestadora = _crear_sucursal(self.prestadora, "Casa Matriz Prestadora")
        self.admin_prestadora = _setup_administrador(
            self.sucursal_prestadora,
            "admin_prestadora_filtro_cliente@test.com",
        )

        # Cliente visible para la prestadora
        self.cliente = _crear_empresa("Cliente Visible")
        self.sucursal_cliente = _crear_sucursal(self.cliente, "Casa Matriz Cliente")
        RelacionEmpresa.objects.create(
            prestador_servicios=self.prestadora,
            cliente=self.cliente,
            tipo_relacion="prestador-cliente",
        )

        # Empresa externa que no debe aparecer
        self.empresa_externa = _crear_empresa("Empresa Externa")
        self.sucursal_externa = _crear_sucursal(self.empresa_externa, "Casa Matriz Externa")

        # Contrato de trabajador existente (usuario_empresa) en empresa cliente
        ue_cliente = _crear_usuario_empresa(self.sucursal_cliente, "trab_cliente_visible")
        self.contrato_usuario_empresa_cliente = _contrato_base(ue_cliente)

        # Contratos con trabajador nuevo en JSON (int y string)
        self.contrato_json_int_cliente = ContratoTrabajador.objects.create(
            usuario_empresa=None,
            datos_trabajador_nuevo={
                "nombres": "Alex",
                "apellido_paterno": "Mora",
                "rut": "11111111-1",
                "sucursal_id": self.sucursal_cliente.id,
            },
            tipo_contrato="plazo_fijo",
            fecha_inicio=datetime.date.today(),
            cargo="Tecnico",
            jornada="completa",
            sueldo_base=750000,
            moneda="CLP",
        )
        self.contrato_json_str_cliente = ContratoTrabajador.objects.create(
            usuario_empresa=None,
            datos_trabajador_nuevo={
                "nombres": "Camila",
                "apellido_paterno": "Fuentes",
                "rut": "22222222-2",
                "sucursal_id": str(self.sucursal_cliente.id),
            },
            tipo_contrato="plazo_fijo",
            fecha_inicio=datetime.date.today(),
            cargo="Analista",
            jornada="completa",
            sueldo_base=760000,
            moneda="CLP",
        )

        # Contratos fuera del cliente filtrado
        ue_externo = _crear_usuario_empresa(self.sucursal_externa, "trab_externo_oculto")
        self.contrato_externo = _contrato_base(ue_externo)
        self.contrato_json_externo = ContratoTrabajador.objects.create(
            usuario_empresa=None,
            datos_trabajador_nuevo={
                "nombres": "Diego",
                "apellido_paterno": "Rivas",
                "rut": "33333333-3",
                "sucursal_id": self.sucursal_externa.id,
            },
            tipo_contrato="plazo_fijo",
            fecha_inicio=datetime.date.today(),
            cargo="Coordinador",
            jornada="completa",
            sueldo_base=780000,
            moneda="CLP",
        )

    def test_filtro_empresa_cliente_incluye_usuario_empresa_y_json_int_string(self):
        self.client.force_authenticate(user=self.admin_prestadora)
        response = self.client.get(self.URL, {"empresa_cliente": self.cliente.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {c["id"] for c in response.data}

        self.assertIn(self.contrato_usuario_empresa_cliente.id, ids)
        self.assertIn(self.contrato_json_int_cliente.id, ids)
        self.assertIn(self.contrato_json_str_cliente.id, ids)

    def test_filtro_empresa_cliente_excluye_contratos_fuera_del_cliente(self):
        self.client.force_authenticate(user=self.admin_prestadora)
        response = self.client.get(self.URL, {"empresa_cliente": self.cliente.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {c["id"] for c in response.data}

        self.assertNotIn(self.contrato_externo.id, ids)
        self.assertNotIn(self.contrato_json_externo.id, ids)


# ---------------------------------------------------------------------------
# Multi-tenancy: AnexoContrato
# ---------------------------------------------------------------------------

class AnexoContratoMultitenancyTest(APITestCase):
    """Verifica que cada empresa solo ve sus propios anexos."""

    URL = "/api/rrhh/anexos-contrato/"

    def setUp(self):
        self.empresa_a = _crear_empresa("Empresa Anexos A")
        self.sucursal_a = _crear_sucursal(self.empresa_a)
        self.admin_a = _setup_administrador(self.sucursal_a, "admin_anex_a@test.com")
        ue_a = _crear_usuario_empresa(self.sucursal_a, "trab_anex_a")
        contrato_a = _contrato_base(ue_a)
        self.anexo_a = AnexoContrato.objects.create(
            contrato=contrato_a,
            tipo="prorroga",
            fecha_efectiva=datetime.date.today(),
            descripcion="Prorroga empresa A",
        )

        self.empresa_b = _crear_empresa("Empresa Anexos B")
        self.sucursal_b = _crear_sucursal(self.empresa_b)
        self.admin_b = _setup_administrador(self.sucursal_b, "admin_anex_b@test.com")
        ue_b = _crear_usuario_empresa(self.sucursal_b, "trab_anex_b")
        contrato_b = _contrato_base(ue_b)
        self.anexo_b = AnexoContrato.objects.create(
            contrato=contrato_b,
            tipo="otro",
            fecha_efectiva=datetime.date.today(),
            descripcion="Anexo empresa B",
        )

    def test_admin_a_solo_ve_anexos_empresa_a(self):
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [a["id"] for a in response.data]
        self.assertIn(self.anexo_a.id, ids)
        self.assertNotIn(self.anexo_b.id, ids)

    def test_filtro_por_contrato(self):
        """El parametro ?contrato= filtra correctamente."""
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get(self.URL, {"contrato": self.anexo_a.contrato_id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [a["id"] for a in response.data]
        self.assertIn(self.anexo_a.id, ids)


# ---------------------------------------------------------------------------
# Accion cambiar_estado
# ---------------------------------------------------------------------------

class CambiarEstadoContratoTest(APITestCase):
    """Verifica transiciones validas e invalidas en cambiar_estado."""

    def setUp(self):
        empresa = _crear_empresa("Empresa Estado")
        sucursal = _crear_sucursal(empresa)
        self.admin = _setup_administrador(sucursal, "admin_estado@test.com")
        ue = _crear_usuario_empresa(sucursal, "trab_estado")
        self.contrato = _contrato_base(ue)
        self.url = f"/api/rrhh/contratos-trabajador/{self.contrato.id}/cambiar-estado/"

    def test_borrador_a_pendiente_aprobacion(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.url, {"estado": "pendiente_aprobacion"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.contrato.refresh_from_db()
        self.assertEqual(self.contrato.estado, "pendiente_aprobacion")

    def test_borrador_a_vigente_directo(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.url, {"estado": "vigente"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.contrato.refresh_from_db()
        self.assertEqual(self.contrato.estado, "vigente")

    def test_transicion_invalida_retorna_400(self):
        """borrador -> terminado no esta permitido."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.url, {"estado": "terminado"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sin_estado_retorna_400(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_terminado_guarda_fecha_y_motivo(self):
        """Desde vigente se puede terminar y se guardan campos extra."""
        self.contrato.estado = "vigente"
        self.contrato.save(update_fields=["estado"])
        self.client.force_authenticate(user=self.admin)
        hoy = datetime.date.today().isoformat()
        response = self.client.post(
            self.url,
            {
                "estado": "terminado",
                "fecha_termino_real": hoy,
                "motivo_termino": "renuncia",
                "observaciones_termino": "Se fue voluntariamente",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.contrato.refresh_from_db()
        self.assertEqual(self.contrato.estado, "terminado")
        self.assertEqual(self.contrato.motivo_termino, "renuncia")
        self.assertEqual(str(self.contrato.fecha_termino_real), hoy)

    def test_estado_terminal_no_permite_transicion(self):
        """Un contrato terminado no puede cambiar de estado."""
        self.contrato.estado = "terminado"
        self.contrato.save(update_fields=["estado"])
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.url, {"estado": "vigente"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Accion subir_pdf
# ---------------------------------------------------------------------------

class SubirPdfContratoTest(APITestCase):
    """Verifica validacion de extension en subir_pdf."""

    def setUp(self):
        empresa = _crear_empresa("Empresa PDF")
        sucursal = _crear_sucursal(empresa)
        self.admin = _setup_administrador(sucursal, "admin_pdf@test.com")
        ue = _crear_usuario_empresa(sucursal, "trab_pdf")
        self.contrato = _contrato_base(ue)
        self.url = f"/api/rrhh/contratos-trabajador/{self.contrato.id}/subir-pdf/"

    def _pdf_file(self, name="contrato.pdf"):
        content = b"%PDF-1.4 test content"
        return SimpleUploadedFile(name, content, content_type="application/pdf")

    def _txt_file(self):
        return SimpleUploadedFile("contrato.txt", b"no es pdf", content_type="text/plain")

    def test_subir_pdf_valido(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            self.url,
            {"archivo_pdf": self._pdf_file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.contrato.refresh_from_db()
        self.assertTrue(bool(self.contrato.archivo_pdf))

    def test_extension_no_pdf_retorna_400(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            self.url,
            {"archivo_pdf": self._txt_file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sin_archivo_retorna_400(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.url, {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sin_auth_retorna_401(self):
        response = self.client.post(
            self.url,
            {"archivo_pdf": self._pdf_file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ContratoAprobacionPublicaExpirationTest(APITestCase):
    """Verifica expiracion por tiempo de los envios de aprobacion RRHH."""

    def setUp(self):
        self.empresa = _crear_empresa("Empresa Expiracion")
        self.sucursal = _crear_sucursal(self.empresa)
        self.admin = _setup_administrador(self.sucursal, "admin_expiracion@test.com")
        ue = _crear_usuario_empresa(self.sucursal, "trab_expiracion")
        self.contrato = _contrato_base(ue)
        self.envio = EnvioAprobacionEmpleador.objects.create(
            contrato=self.contrato,
            pdf_congelado=b"%PDF-1.4 contenido de prueba",
            enviado_a="empleador_expiracion@test.com",
            enviado_por=self.admin,
        )
        self.envio.fecha_envio = timezone.now() - datetime.timedelta(days=15)
        self.envio.save(update_fields=["fecha_envio"])

    def test_get_publico_expirado_por_tiempo(self):
        response = self.client.get(f"/api/public/rrhh/contrato-aprobacion/{self.envio.uuid}/")
        self.assertEqual(response.status_code, status.HTTP_410_GONE)
        self.assertEqual(response.data.get("detail"), "Este enlace ha expirado.")


# ---------------------------------------------------------------------------
# Accion crear_con_trabajador
# ---------------------------------------------------------------------------

class CrearConTrabajadorTest(APITestCase):
    """Verifica la creacion atomica de UsuarioEmpresa + ContratoTrabajador."""

    URL = "/api/rrhh/contratos-trabajador/crear-con-trabajador/"

    def setUp(self):
        self.empresa = _crear_empresa("Empresa Creacion")
        self.sucursal = _crear_sucursal(self.empresa)
        self.admin = _setup_administrador(self.sucursal, "admin_crear@test.com")

    def _payload(self, email="nuevo_trabajador@test.com"):
        return {
            "email": email,
            "first_name": "Juan",
            "last_name": "Perez",
            "sucursal_id": self.sucursal.id,
            "tipo_contrato": "indefinido",
            "fecha_inicio": datetime.date.today().isoformat(),
            "cargo": "Analista",
            "jornada": "completa",
            "sueldo_base": "800000",
            "moneda": "CLP",
        }

    def test_crea_usuario_empresa_y_contrato(self):
        self.client.force_authenticate(user=self.admin)
        payload = self._payload()
        response = self.client.post(self.URL, payload, format="json")
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        # Verifica que se creo al menos un contrato para la sucursal
        self.assertTrue(
            ContratoTrabajador.objects.filter(
                usuario_empresa__sucursal=self.sucursal
            ).exists()
        )

    def test_crea_contrato_nuevo_con_fecha_nacimiento_serializable(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "trabajador": {
                "modo": "nuevo",
                "email": "nuevo_trabajador2@test.com",
                "first_name": "Ana",
                "last_name": "Gomez",
                "rut": "11.111.111-1",
                "sucursal_id": self.sucursal.id,
                "fecha_nacimiento": datetime.date.today().isoformat(),
            },
            "contrato": {
                "tipo_contrato": "indefinido",
                "fecha_inicio": datetime.date.today().isoformat(),
                "cargo": "Analista",
                "jornada": "completa",
                "sueldo_base": "800000",
                "moneda": "CLP",
            },
        }
        response = self.client.post(self.URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("contrato", response.data)
        self.assertIsNotNone(response.data["contrato"].get("id"))

    def test_email_duplicado_retorna_error(self):
        """Si el email ya existe, la respuesta debe indicar el error."""
        _crear_user("duplicado@test.com")
        self.client.force_authenticate(user=self.admin)
        payload = self._payload(email="duplicado@test.com")
        response = self.client.post(self.URL, payload, format="json")
        # Debe retornar un error (400 o 409 segun implementacion)
        self.assertNotIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_sin_auth_retorna_401(self):
        response = self.client.post(self.URL, self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class SnapshotDocumentoBlockActionsTest(APITestCase):
    """Valida lectura y edicion por bloques de snapshot_documento."""

    def setUp(self):
        empresa = _crear_empresa("Empresa Snapshot")
        sucursal = _crear_sucursal(empresa)
        self.admin = _setup_administrador(sucursal, "admin_snapshot@test.com")
        ue = _crear_usuario_empresa(sucursal, "trab_snapshot")
        self.contrato = _contrato_base(ue)
        self.contrato.snapshot_documento = {
            "razon_social_empresa": "Empresa Snapshot",
            "rut_empresa": "76.123.456-7",
            "direccion_empresa": "Calle Inicial 123",
            "representante_legal": "Ana Ruiz",
            "nombre_trabajador": "UE trab_snapshot",
            "rut_trabajador": "11.111.111-1",
            "direccion_trabajador": "Pasaje Uno 20",
        }
        self.contrato.save(update_fields=["snapshot_documento"])

        self.get_url = f"/api/rrhh/contratos-trabajador/{self.contrato.id}/get-block/"
        self.update_url = f"/api/rrhh/contratos-trabajador/{self.contrato.id}/update-block/"

    def test_get_block_ok(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.get_url, {"path": "direccion_empresa"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["value"], "Calle Inicial 123")

    def test_get_block_path_no_permitido_retorna_400(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.get_url, {"path": "rut_empresa"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_block_ok_estado_borrador(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            self.update_url,
            {"path": "direccion_trabajador", "value": "Nueva Direccion 456"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.contrato.refresh_from_db()
        self.assertEqual(
            self.contrato.snapshot_documento["direccion_trabajador"],
            "Nueva Direccion 456",
        )

    def test_update_block_path_no_permitido_retorna_400(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            self.update_url,
            {"path": "rut_empresa", "value": "99.999.999-9"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_block_tipo_invalido_retorna_400(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            self.update_url,
            {"path": "direccion_empresa", "value": {"calle": "obj-no-valido"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_block_bloqueado_fuera_de_borrador(self):
        self.contrato.estado = "pendiente_aprobacion"
        self.contrato.save(update_fields=["estado"])
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            self.update_url,
            {"path": "direccion_empresa", "value": "No Debe Guardar"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.contrato.refresh_from_db()
        self.assertNotEqual(self.contrato.snapshot_documento["direccion_empresa"], "No Debe Guardar")
