import uuid
from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from cuentas.models import User
from core.models import AcuerdoConfidencialidadBase, PersonalizacionUsuario
from contratos.models import (
    ContratoEmpresaCliente,
    ContratoItemComercial,
    ContratoVisita,
    ContratoLicencia,
    ContratoCondicionEspecial,
    EnvioContratoAprobacion,
    FacturaContrato,
    UsuarioVinculadoLicencia,
    UsuarioVinculadoContrato,
    PersonaLicenciataria,
    CorreoPersonaLicenciataria,
    AcuerdoConfidencialidadContrato,
    EnvioContratoFirmaUsuario,
    Servicio,
    ServicioCaracteristica,
    PlanServicio,
    CaracteristicaServicio,
    Visita,
    Licencia,
    CondicionEspecial,
    PlantillaContrato,
    SeccionPlantilla,
    SeccionContratoGenerada,
)
from contratos.flow_helpers import construir_pdf_contrato
from contratos.funciones import generar_contrato_desde_plantilla
from contratos.serializers import ContratoEmpresaClienteSerializer
from cotizaciones.models import Cotizacion, ItemCotizacion
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa

VALID_SIGNATURE_DATA_URL = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zx6kAAAAASUVORK5CYII="
)


class ContratoAPITestBase(APITestCase):
    """Base class con setup multi-tenancy para tests de API de contratos."""

    def setUp(self):
        # Empresa prestadora + sucursal
        self.empresa_prestadora = Empresa.objects.create(nombre="Prestadora Test")
        self.sucursal_prestadora = SucursalEmpresa.objects.create(
            nombre="Sucursal Principal",
            empresa=self.empresa_prestadora,
        )

        # Empresa cliente
        self.empresa_cliente = Empresa.objects.create(nombre="Cliente Test")
        self.sucursal_cliente = SucursalEmpresa.objects.create(
            nombre="Sucursal Cliente",
            empresa=self.empresa_cliente,
        )

        # Segunda empresa (para tests multi-tenancy)
        self.empresa_otra = Empresa.objects.create(nombre="Otra Empresa")
        self.sucursal_otra = SucursalEmpresa.objects.create(
            nombre="Sucursal Otra",
            empresa=self.empresa_otra,
        )

        # Usuario con multi-tenancy: empresa prestadora
        # NOTA: El signal post_save en core.signals crea PersonalizacionUsuario
        # automáticamente, por lo que usamos get() en vez de create().
        self.user = User.objects.create_user(
            email="test@prestadora.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )
        self.personalizacion = PersonalizacionUsuario.objects.get(usuario=self.user)
        self.personalizacion.sucursal_principal = self.sucursal_prestadora
        self.personalizacion.save()

        self.usuario_empresa = UsuarioEmpresa.objects.create(
            usuario=self.user,
            sucursal=self.sucursal_prestadora,
        )

        # Usuario de otra empresa
        self.user_otro = User.objects.create_user(
            email="test@otra.com",
            password="testpass123",
            first_name="Otro",
            last_name="User",
        )
        self.personalizacion_otro = PersonalizacionUsuario.objects.get(usuario=self.user_otro)
        self.personalizacion_otro.sucursal_principal = self.sucursal_otra
        self.personalizacion_otro.save()

        # Autenticar usuario por defecto
        self.client.force_authenticate(user=self.user)

        # Contrato base para tests
        self.contrato = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            fecha_fin=date.today() + timedelta(days=365),
            nombre="Contrato Base Test",
            estado="borrador",
            tipo="servicios",
        )

        # Catálogos
        self.visita = Visita.objects.create(descripcion="Visita Preventiva")
        self.licencia = Licencia.objects.create(nombre="Microsoft 365", proveedor="Microsoft")
        self.condicion = CondicionEspecial.objects.create(
            titulo="SLA Premium",
            descripcion="Tiempo de respuesta: 4 horas",
        )


class ContratoMultiTenancyTest(ContratoAPITestBase):
    """Verifica que el filtro multi-tenancy funciona correctamente."""

    def test_listar_solo_contratos_de_mi_empresa(self):
        """Solo debe ver contratos donde su empresa es prestadora o cliente."""
        # Contrato de otra empresa (no debe ser visible)
        ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_otra,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            nombre="Contrato Ajeno",
        )

        response = self.client.get("/api/contratos/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        ids = [c["id"] for c in response.data]
        self.assertIn(self.contrato.id, ids)
        # El contrato ajeno NO debe estar en la lista
        contrato_ajeno = ContratoEmpresaCliente.objects.get(nombre="Contrato Ajeno")
        self.assertNotIn(contrato_ajeno.id, ids)

    def test_detalle_contrato_propio(self):
        response = self.client.get(f"/api/contratos/{self.contrato.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.contrato.id)

    def test_usuario_otra_empresa_no_ve_contratos_ajenos(self):
        """Un usuario de otra empresa no debe ver el contrato de empresa_prestadora."""
        self.client.force_authenticate(user=self.user_otro)
        response = self.client.get("/api/contratos/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [c["id"] for c in response.data]
        self.assertNotIn(self.contrato.id, ids)

    def test_usuario_sin_sucursal_recibe_lista_vacia(self):
        """Sin PersonalizacionUsuario.sucursal_principal, get_queryset() retorna none()."""
        self.personalizacion.sucursal_principal = None
        self.personalizacion.save()
        response = self.client.get("/api/contratos/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(list(response.data), [])


class FacturaContratoListTest(ContratoAPITestBase):
    def test_list_facturas_contrato_sin_datos_devuelve_lista_vacia(self):
        response = self.client.get("/api/facturas-contrato/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_list_factura_contrato_con_contrato_sin_items_comerciales(self):
        FacturaContrato.objects.create(
            contrato=self.contrato,
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            periodo_inicio=date.today(),
            periodo_fin=date.today() + timedelta(days=30),
            monto_total=0,
            moneda="USD",
        )

        response = self.client.get("/api/facturas-contrato/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["monto_calculado"], "0")


class LicenciaViewSetTest(ContratoAPITestBase):
    def test_list_licencias_solo_de_empresa_prestadora_o_publicas(self):
        Licencia.objects.create(
            nombre="Licencia Pres",
            proveedor="Proveedor A",
            empresa_prestadora=self.empresa_prestadora,
        )
        Licencia.objects.create(
            nombre="Licencia Publica",
            proveedor="Proveedor Global",
            empresa_prestadora=None,
        )
        Licencia.objects.create(
            nombre="Licencia Ajena",
            proveedor="Proveedor Otro",
            empresa_prestadora=self.empresa_otra,
        )

        response = self.client.get("/api/licencias/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        nombres = [item["nombre"] for item in response.data]
        self.assertIn("Licencia Pres", nombres)
        self.assertIn("Licencia Publica", nombres)
        self.assertNotIn("Licencia Ajena", nombres)

    def test_create_licencia_asigna_empresa_prestadora(self):
        payload = {
            "nombre": "Licencia Nueva",
            "numero_parte": "NP-001",
            "proveedor": "Proveedor Nuevo",
            "descripcion": "Una prueba",
            "modalidad_base": "P1Y",
            "modalidad_anual_forma_pago": "PAGO_MENSUAL",
            "precio_partner": 10.0,
            "precio_venta": 15.0,
            "moneda": "CLP",
            "activo": True,
        }

        response = self.client.post("/api/licencias/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["empresa_prestadora"], self.empresa_prestadora.id)
        self.assertEqual(response.data["nombre"], "Licencia Nueva")
        self.assertEqual(response.data["modalidad_base"], "P1Y")
        self.assertEqual(response.data["modalidad_anual_forma_pago"], "PAGO_MENSUAL")

    def test_create_licencia_requiere_modalidad_anual_forma_pago_si_base_p1y(self):
        payload = {
            "nombre": "Licencia Sin Modalidad",
            "numero_parte": "NP-002",
            "proveedor": "Proveedor Nuevo",
            "descripcion": "Sin modalidad activa",
            "modalidad_base": "P1Y",
            "precio_partner": 10.0,
            "precio_venta": 15.0,
            "moneda": "CLP",
            "activo": True,
        }

        response = self.client.post("/api/licencias/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("modalidad_anual_forma_pago", response.data)

    def test_create_licencia_rechaza_payload_legacy(self):
        payload = {
            "nombre": "Licencia Legacy",
            "numero_parte": "NP-003",
            "modalidad_base": "P1M",
            "precio_partner": 5.0,
            "precio_venta": 8.0,
            "precio_modalidad_p1m": 11.0,
            "moneda": "USD",
            "activo": True,
        }

        response = self.client.post("/api/licencias/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("precio_modalidad_p1m", response.data)


class PlantillaContratoReordenarTest(ContratoAPITestBase):
    def setUp(self):
        super().setUp()
        self.plantilla = PlantillaContrato.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            titulo="Plantilla Servicios",
            version=1,
            activa=True,
            tipo_contrato="servicios",
        )
        self.seccion_intro = SeccionPlantilla.objects.create(
            plantilla=self.plantilla,
            titulo="Introducción",
            tipo="encabezado",
            contenido_template="Intro",
            orden=1,
        )
        self.seccion_base = SeccionPlantilla.objects.create(
            plantilla=self.plantilla,
            titulo="Base Comercial",
            tipo="clausula",
            contenido_template="Base",
            orden=2,
        )
        self.seccion_operacion = SeccionPlantilla.objects.create(
            plantilla=self.plantilla,
            titulo="Operación",
            tipo="libre",
            contenido_template="Operación",
            orden=3,
        )
        self.seccion_condiciones = SeccionPlantilla.objects.create(
            plantilla=self.plantilla,
            titulo="Condiciones",
            tipo="condiciones_generales",
            contenido_template="Condiciones",
            orden=4,
        )

    def test_reordenar_plantilla_con_slots_persiste_posicion_documental(self):
        response = self.client.post(
            f"/api/plantillas-contrato/{self.plantilla.id}/secciones/reordenar/",
            {
                "secciones": [
                    {
                        "id": self.seccion_intro.id,
                        "slot_documental": "antes_alcance",
                        "orden_en_slot": 1,
                    },
                    {
                        "id": self.seccion_base.id,
                        "slot_documental": "entre_alcance_y_operacion",
                        "orden_en_slot": 1,
                    },
                    {
                        "id": self.seccion_operacion.id,
                        "slot_documental": "entre_operacion_y_condiciones",
                        "orden_en_slot": 1,
                    },
                    {
                        "id": self.seccion_condiciones.id,
                        "slot_documental": "despues_condiciones",
                        "orden_en_slot": 1,
                    },
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.seccion_intro.refresh_from_db()
        self.seccion_base.refresh_from_db()
        self.seccion_operacion.refresh_from_db()
        self.seccion_condiciones.refresh_from_db()

        self.assertEqual(self.seccion_intro.slot_documental, "antes_alcance")
        self.assertEqual(self.seccion_intro.orden_en_slot, 1)
        self.assertEqual(self.seccion_intro.orden, 1)

        self.assertEqual(
            self.seccion_base.slot_documental,
            "entre_alcance_y_operacion",
        )
        self.assertEqual(self.seccion_base.orden_en_slot, 1)
        self.assertEqual(self.seccion_base.orden, 2)

        self.assertEqual(
            self.seccion_operacion.slot_documental,
            "entre_operacion_y_condiciones",
        )
        self.assertEqual(self.seccion_operacion.orden_en_slot, 1)
        self.assertEqual(self.seccion_operacion.orden, 3)

        self.assertEqual(self.seccion_condiciones.slot_documental, "despues_condiciones")
        self.assertEqual(self.seccion_condiciones.orden_en_slot, 1)
        self.assertEqual(self.seccion_condiciones.orden, 4)

    def test_reordenar_plantilla_acepta_payload_legado_y_genera_slots(self):
        response = self.client.post(
            f"/api/plantillas-contrato/{self.plantilla.id}/secciones/reordenar/",
            {
                "secciones": [
                    {"id": self.seccion_base.id, "orden": 1},
                    {"id": self.seccion_intro.id, "orden": 2},
                    {"id": self.seccion_operacion.id, "orden": 3},
                    {"id": self.seccion_condiciones.id, "orden": 4},
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.seccion_base.refresh_from_db()
        self.seccion_intro.refresh_from_db()
        self.seccion_operacion.refresh_from_db()
        self.seccion_condiciones.refresh_from_db()

        self.assertEqual(self.seccion_base.slot_documental, "antes_alcance")
        self.assertEqual(self.seccion_base.orden_en_slot, 1)
        self.assertEqual(self.seccion_base.orden, 1)

        self.assertEqual(
            self.seccion_intro.slot_documental,
            "antes_alcance",
        )
        self.assertEqual(self.seccion_intro.orden_en_slot, 2)
        self.assertEqual(self.seccion_intro.orden, 2)

        self.assertEqual(
            self.seccion_operacion.slot_documental,
            "antes_alcance",
        )
        self.assertEqual(self.seccion_operacion.orden_en_slot, 3)
        self.assertEqual(self.seccion_operacion.orden, 3)

        self.assertEqual(
            self.seccion_condiciones.slot_documental,
            "antes_alcance",
        )
        self.assertEqual(self.seccion_condiciones.orden_en_slot, 4)
        self.assertEqual(self.seccion_condiciones.orden, 4)

    def test_usuario_sin_personalizacion_ve_lista_vacia(self):
        """Sin PersonalizacionUsuario, el queryset devuelve vacío."""
        user_sin = User.objects.create_user(
            email="sin@config.com",
            password="testpass123",
            first_name="Sin",
            last_name="Config",
        )
        self.client.force_authenticate(user=user_sin)

        response = self.client.get("/api/contratos/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class PlantillaContratoDefaultEditableTest(ContratoAPITestBase):
    def setUp(self):
        super().setUp()
        self.plantilla_default = PlantillaContrato.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            titulo="Plantilla Sistema Editable",
            version=1,
            activa=True,
            tipo_contrato="servicios",
            es_default=True,
        )
        self.seccion_a = SeccionPlantilla.objects.create(
            plantilla=self.plantilla_default,
            titulo="Seccion A",
            tipo="clausula",
            contenido_template="Contenido A",
            orden=1,
        )
        self.seccion_b = SeccionPlantilla.objects.create(
            plantilla=self.plantilla_default,
            titulo="Seccion B",
            tipo="clausula",
            contenido_template="Contenido B",
            orden=2,
        )

    def test_default_permite_editar_plantilla(self):
        response = self.client.patch(
            f"/api/plantillas-contrato/{self.plantilla_default.id}/",
            {"titulo": "Plantilla Sistema Actualizada"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.plantilla_default.refresh_from_db()
        self.assertEqual(self.plantilla_default.titulo, "Plantilla Sistema Actualizada")

    def test_default_permite_crear_y_editar_seccion(self):
        crear_response = self.client.post(
            f"/api/plantillas-contrato/{self.plantilla_default.id}/secciones/",
            {
                "titulo": "Seccion Nueva",
                "tipo": "clausula",
                "contenido_template": "Texto de prueba",
                "orden": 3,
                "es_editable_en_contrato": True,
                "es_obligatoria": False,
            },
            format="json",
        )
        self.assertEqual(crear_response.status_code, status.HTTP_201_CREATED)

        seccion_id = crear_response.data["id"]
        editar_response = self.client.patch(
            f"/api/plantillas-contrato/{self.plantilla_default.id}/secciones/{seccion_id}/",
            {"titulo": "Seccion Nueva Editada"},
            format="json",
        )
        self.assertEqual(editar_response.status_code, status.HTTP_200_OK)
        self.assertEqual(editar_response.data["titulo"], "Seccion Nueva Editada")

    def test_default_permite_eliminar_seccion(self):
        eliminar_response = self.client.delete(
            f"/api/plantillas-contrato/{self.plantilla_default.id}/secciones/{self.seccion_a.id}/",
        )
        self.assertEqual(eliminar_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SeccionPlantilla.objects.filter(id=self.seccion_a.id).exists())

    def test_default_permite_reordenar_secciones(self):
        response = self.client.post(
            f"/api/plantillas-contrato/{self.plantilla_default.id}/secciones/reordenar/",
            {
                "secciones": [
                    {"id": self.seccion_a.id, "orden": 2},
                    {"id": self.seccion_b.id, "orden": 1},
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.seccion_a.refresh_from_db()
        self.seccion_b.refresh_from_db()
        self.assertEqual(self.seccion_a.orden, 2)
        self.assertEqual(self.seccion_b.orden, 1)


class ContratoCRUDTest(ContratoAPITestBase):
    """Tests CRUD básicos."""

    def test_crear_contrato(self):
        response = self.client.post(
            "/api/contratos/",
            {
                "empresa_prestadora": self.empresa_prestadora.id,
                "empresa_cliente": self.empresa_cliente.id,
                "fecha_inicio": date.today().isoformat(),
                "nombre": "Contrato Nuevo",
                "tipo": "servicios",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["nombre"], "Contrato Nuevo")
        self.assertEqual(response.data["estado"], "borrador")

    def test_obtener_detalle(self):
        response = self.client.get(f"/api/contratos/{self.contrato.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["nombre"], "Contrato Base Test")
        # Verificar serializer devuelve campos calculados
        self.assertIn("estado_label", response.data)
        self.assertIn("datos_empresa", response.data)
        self.assertIn("datos_cliente", response.data)
        self.assertIn("tipo_label", response.data)

    def test_listar_contratos(self):
        response = self.client.get("/api/contratos/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)

    def test_generar_pdf_contrato_regenera_secciones_si_faltan(self):
        plantilla = PlantillaContrato.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            titulo="Plantilla Test Servicios",
            descripcion="Plantilla de servicios para tests",
            tipo_contrato="servicios",
            es_default=False,
            activa=True,
            version=1,
        )
        SeccionPlantilla.objects.create(
            plantilla=plantilla,
            titulo="Identificación del Cliente",
            tipo="identificacion_cliente",
            contenido_template="Nombre: [nombre_cliente]",
            orden=1,
            es_editable_en_contrato=False,
            es_obligatoria=True,
        )

        self.contrato.plantilla = plantilla
        self.contrato.plantilla_version_usada = None
        self.contrato.save(update_fields=["plantilla", "plantilla_version_usada"])

        # Confirmar que no existen secciones generadas antes de la generación.
        self.assertFalse(self.contrato.secciones_generadas.exists())

        pdf_bytes = construir_pdf_contrato(self.contrato)

        self.assertIsInstance(pdf_bytes, (bytes, bytearray))
        self.assertGreater(len(pdf_bytes), 0)
        self.assertTrue(self.contrato.secciones_generadas.exists())

    def test_generar_contrato_desde_plantilla_reordena_secciones_si_hay_cambio(self):
        plantilla = PlantillaContrato.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            titulo="Plantilla Test Servicios",
            descripcion="Plantilla de servicios orden test",
            tipo_contrato="servicios",
            es_default=False,
            activa=True,
            version=1,
        )
        seccion_a = SeccionPlantilla.objects.create(
            plantilla=plantilla,
            titulo="Primera Sección",
            tipo="clausula",
            contenido_template="A",
            orden=1,
            es_editable_en_contrato=False,
            es_obligatoria=True,
        )
        seccion_b = SeccionPlantilla.objects.create(
            plantilla=plantilla,
            titulo="Segunda Sección",
            tipo="clausula",
            contenido_template="B",
            orden=2,
            es_editable_en_contrato=False,
            es_obligatoria=True,
        )

        self.contrato.plantilla = plantilla
        self.contrato.plantilla_version_usada = None
        self.contrato.save(update_fields=["plantilla", "plantilla_version_usada"])

        # Crear secciones generadas en orden inverso para simular un contrato viejo.
        SeccionContratoGenerada.objects.create(
            contrato=self.contrato,
            seccion_plantilla=seccion_a,
            titulo=seccion_a.titulo,
            contenido_renderizado="A",
            orden=2,
        )
        SeccionContratoGenerada.objects.create(
            contrato=self.contrato,
            seccion_plantilla=seccion_b,
            titulo=seccion_b.titulo,
            contenido_renderizado="B",
            orden=1,
        )

        generar_contrato_desde_plantilla(self.contrato)

        ordenes = list(self.contrato.secciones_generadas.order_by("orden").values_list("seccion_plantilla_id", flat=True))
        self.assertEqual(ordenes, [seccion_a.id, seccion_b.id])

    def test_filtrar_por_empresa_cliente(self):
        response = self.client.get(
            f"/api/contratos/filtrar-por-empresa-cliente/"
            f"{self.empresa_prestadora.id}/{self.empresa_cliente.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_crear_completo_acepta_fechas_string_en_licencias(self):
        response = self.client.post(
            "/api/contratos/crear-completo/",
            {
                "contrato": {
                    "empresa_cliente": self.empresa_cliente.id,
                    "fecha_inicio": date.today().isoformat(),
                    "fecha_fin": (date.today() + timedelta(days=365)).isoformat(),
                    "nombre": "Contrato Completo con Licencia",
                    "tipo": "servicios",
                },
                "licencias": [
                    {
                        "licencia_id": self.licencia.id,
                        "cantidad": 5,
                        "fecha_inicio": date.today().isoformat(),
                        "fecha_fin": (date.today() + timedelta(days=30)).isoformat(),
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        contrato = ContratoEmpresaCliente.objects.get(nombre="Contrato Completo con Licencia")
        licencia_contrato = ContratoLicencia.objects.get(contrato=contrato, licencia=self.licencia)
        self.assertEqual(licencia_contrato.fecha_inicio, date.today())
        self.assertEqual(licencia_contrato.fecha_fin, date.today() + timedelta(days=30))

    def test_crear_completo_usa_precio_catalogo_si_no_se_indica_precio(self):
        self.licencia.precio_partner = 12000
        self.licencia.precio_venta = 12000
        self.licencia.moneda = "USD"
        self.licencia.save()

        response = self.client.post(
            "/api/contratos/crear-completo/",
            {
                "contrato": {
                    "empresa_cliente": self.empresa_cliente.id,
                    "fecha_inicio": date.today().isoformat(),
                    "fecha_fin": (date.today() + timedelta(days=365)).isoformat(),
                    "nombre": "Contrato Completo con Licencia Catalogo",
                    "tipo": "servicios",
                },
                "licencias": [
                    {
                        "licencia_id": self.licencia.id,
                        "cantidad": 5,
                        "fecha_inicio": date.today().isoformat(),
                        "fecha_fin": (date.today() + timedelta(days=30)).isoformat(),
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        contrato = ContratoEmpresaCliente.objects.get(nombre="Contrato Completo con Licencia Catalogo")
        licencia_contrato = ContratoLicencia.objects.get(contrato=contrato, licencia=self.licencia)
        self.assertEqual(float(licencia_contrato.precio_unitario_snapshot), 12000.0)
        self.assertEqual(licencia_contrato.moneda_snapshot, "USD")

    def test_crear_completo_usa_modalidad_catalogo_y_ignora_payload(self):
        self.licencia.modalidad_base = "P1Y"
        self.licencia.modalidad_anual_forma_pago = "PAGO_MENSUAL"
        self.licencia.precio_partner = 15000
        self.licencia.precio_venta = 15000
        self.licencia.moneda = "USD"
        self.licencia.save()

        response = self.client.post(
            "/api/contratos/crear-completo/",
            {
                "contrato": {
                    "empresa_cliente": self.empresa_cliente.id,
                    "fecha_inicio": date.today().isoformat(),
                    "fecha_fin": (date.today() + timedelta(days=365)).isoformat(),
                    "nombre": "Contrato Completo con Modalidad Catalogo",
                    "tipo": "servicios",
                },
                "licencias": [
                    {
                        "licencia_id": self.licencia.id,
                        "cantidad": 5,
                        "fecha_inicio": date.today().isoformat(),
                        "fecha_fin": (date.today() + timedelta(days=30)).isoformat(),
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        contrato = ContratoEmpresaCliente.objects.get(nombre="Contrato Completo con Modalidad Catalogo")
        licencia_contrato = ContratoLicencia.objects.get(contrato=contrato, licencia=self.licencia)
        self.assertEqual(licencia_contrato.modalidad_snapshot, "P1Y")
        self.assertEqual(float(licencia_contrato.precio_unitario_snapshot), 15000.0)
        self.assertEqual(licencia_contrato.moneda_snapshot, "USD")

    def test_crear_completo_tipo_licencia_rechaza_si_no_hay_licencias(self):
        response = self.client.post(
            "/api/contratos/crear-completo/",
            {
                "contrato": {
                    "empresa_cliente": self.empresa_cliente.id,
                    "fecha_inicio": date.today().isoformat(),
                    "fecha_fin": (date.today() + timedelta(days=365)).isoformat(),
                    "nombre": "Contrato Licencia Sin Licencias",
                    "tipo": "licencia",
                    "moneda_cobro": "USD",
                },
                "licencias": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("licencias", response.data)

    def test_crear_completo_licencia_usa_moneda_catalogo(self):
        self.licencia.precio_venta = 20000
        self.licencia.moneda = "USD"
        self.licencia.modalidad_base = "P1M"
        self.licencia.save()

        response = self.client.post(
            "/api/contratos/crear-completo/",
            {
                "contrato": {
                    "empresa_cliente": self.empresa_cliente.id,
                    "fecha_inicio": date.today().isoformat(),
                    "fecha_fin": (date.today() + timedelta(days=365)).isoformat(),
                    "nombre": "Contrato Licencia Moneda Catalogo",
                    "tipo": "licencia",
                    "moneda_cobro": "CLP",
                },
                "licencias": [
                    {
                        "licencia_id": self.licencia.id,
                        "cantidad": 1,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        contrato = ContratoEmpresaCliente.objects.get(nombre="Contrato Licencia Moneda Catalogo")
        licencia_contrato = ContratoLicencia.objects.get(contrato=contrato, licencia=self.licencia)
        self.assertEqual(licencia_contrato.modalidad_snapshot, "P1M")
        self.assertEqual(licencia_contrato.moneda_snapshot, "USD")


class ContratoVentaCotizacionesTest(ContratoAPITestBase):
    def setUp(self):
        super().setUp()
        self.contrato_venta = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            fecha_fin=date.today() + timedelta(days=365),
            nombre="Contrato Venta",
            estado="borrador",
            tipo="venta",
            moneda_cobro="CLP",
            forma_pago_contractual="pago_unico",
            forma_pago_venta="cuotas",
            cuotas_venta=[
                {
                    "orden": 1,
                    "porcentaje": 40,
                    "hito_pago_tipo": "inicio",
                    "hito_pago_descripcion": "Inicio",
                },
                {
                    "orden": 2,
                    "porcentaje": 60,
                    "hito_pago_tipo": "entrega_final",
                    "hito_pago_descripcion": "Entrega final",
                },
            ],
        )

        self.user_cliente = User.objects.create_user(
            email="cliente.venta@test.com",
            password="testpass123",
            first_name="Cliente",
            last_name="Venta",
        )
        self.usuario_empresa_cliente = UsuarioEmpresa.objects.create(
            usuario=self.user_cliente,
            sucursal=self.sucursal_cliente,
        )
        UsuarioVinculadoContrato.objects.create(
            usuario=self.usuario_empresa_cliente,
            contrato=self.contrato_venta,
            es_destinatario_principal=True,
        )
        acuerdo_base = AcuerdoConfidencialidadBase.objects.create(
            titulo="NDA Venta",
            contenido="Acuerdo base para contrato de venta.",
        )
        AcuerdoConfidencialidadContrato.objects.create(
            contrato=self.contrato_venta,
            acuerdo_base=acuerdo_base,
        )

        self.cotizacion_usd = self._crear_cotizacion(
            nombre="Equipamiento en USD",
            tipo_moneda="1",
            precio_unitario=9000,
            dolar_observado=900,
        )
        self.cotizacion_clp = self._crear_cotizacion(
            nombre="Servicios locales",
            tipo_moneda="2",
            precio_unitario=15000,
        )
        self.cotizacion_uf = self._crear_cotizacion(
            nombre="Puesta en marcha UF",
            tipo_moneda="3",
            precio_unitario=76000,
            valor_uf=38000,
        )
        Cotizacion.objects.filter(
            pk__in=[
                self.cotizacion_usd.id,
                self.cotizacion_clp.id,
                self.cotizacion_uf.id,
            ]
        ).update(contrato=self.contrato_venta)

    def _crear_cotizacion(
        self,
        *,
        nombre,
        tipo_moneda,
        precio_unitario,
        item_tipo_moneda=None,
        dolar_observado=None,
        valor_uf=None,
    ):
        cotizacion = Cotizacion.objects.create(
            nombre=nombre,
            empresa=self.empresa_prestadora,
            cliente=self.empresa_cliente,
            estado="aceptada",
            tipo_moneda=tipo_moneda,
            dolar_observado=dolar_observado,
            valor_uf=valor_uf,
        )
        ItemCotizacion.objects.create(
            cotizacion=cotizacion,
            nombre=f"Item {nombre}",
            cantidad=1,
            precio_unitario=precio_unitario,
            tipo_moneda=item_tipo_moneda or "2",
        )
        return cotizacion

    def test_serializer_venta_calcula_total_convertido_y_valido(self):
        self.contrato_venta.estado = "activo"
        self.contrato_venta.save(update_fields=["estado", "fecha_modificacion"])

        serializer = ContratoEmpresaClienteSerializer(self.contrato_venta)

        self.assertEqual(serializer.data["total_contrato"], 100000.0)
        self.assertTrue(serializer.data["valido"])
        self.assertEqual(serializer.data["resumen_comercial"]["tipo_resumen"], "venta")
        self.assertEqual(serializer.data["resumen_comercial"]["forma_pago_venta"], "cuotas")
        self.assertEqual(
            serializer.data["resumen_comercial"]["cuotas_venta_resumen"],
            [
                {
                    "orden": 1,
                    "porcentaje": 40.0,
                    "monto": 40000.0,
                    "hito_pago_tipo": "inicio",
                    "hito_pago_descripcion": "Inicio",
                    "hito_pago_label": "Inicio",
                },
                {
                    "orden": 2,
                    "porcentaje": 60.0,
                    "monto": 60000.0,
                    "hito_pago_tipo": "entrega_final",
                    "hito_pago_descripcion": "Entrega final",
                    "hito_pago_label": "Entrega final",
                },
            ],
        )
        self.assertEqual(
            serializer.data["resumen_comercial"]["cotizaciones_vinculadas_count"],
            3,
        )
        self.assertEqual(serializer.data["cotizaciones_vinculadas"][0]["moneda_contrato"], "CLP")
        self.assertTrue(
            any(
                cotizacion["total_convertido"] is not None
                for cotizacion in serializer.data["cotizaciones_vinculadas"]
            )
        )
        self.assertIn(
            900.0,
            [cotizacion["dolar_observado"] for cotizacion in serializer.data["cotizaciones_vinculadas"]],
        )

    def test_enviar_aprobacion_congela_snapshot_venta_con_total_convertido(self):
        response = self.client.post(f"/api/contratos/{self.contrato_venta.id}/enviar-aprobacion/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        envio = EnvioContratoAprobacion.objects.get(pk=response.data["id"])
        self.assertEqual(envio.snapshot_contrato["total_contrato"], 100000.0)
        self.assertEqual(
            envio.snapshot_contrato["resumen_comercial"]["tipo_resumen"],
            "venta",
        )
        self.assertEqual(
            envio.snapshot_contrato["resumen_comercial"]["forma_pago_venta"],
            "cuotas",
        )
        self.assertEqual(len(envio.snapshot_contrato["cotizaciones_vinculadas"]), 3)

    def test_enviar_firma_congela_snapshot_venta_con_total_convertido(self):
        self.contrato_venta.estado = "aprobado_cliente"
        self.contrato_venta.save(update_fields=["estado", "fecha_modificacion"])
        self.empresa_prestadora.firma_empresa = VALID_SIGNATURE_DATA_URL
        self.empresa_prestadora.save(update_fields=["firma_empresa"])

        response = self.client.post(f"/api/contratos/{self.contrato_venta.id}/enviar-firma/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        envio = EnvioContratoFirmaUsuario.objects.get(pk=response.data["id"])
        self.assertEqual(envio.snapshot_contrato["total_contrato"], 100000.0)
        self.assertEqual(
            envio.snapshot_contrato["resumen_comercial"]["tipo_resumen"],
            "venta",
        )
        self.assertEqual(
            envio.snapshot_contrato["resumen_comercial"]["cuotas_venta_resumen"][0]["monto"],
            40000.0,
        )
        self.assertEqual(
            envio.snapshot_contrato["resumen_comercial"]["cuotas_venta_resumen"][0][
                "hito_pago_descripcion"
            ],
            "Inicio",
        )
        self.assertEqual(len(envio.snapshot_contrato["cotizaciones_vinculadas"]), 3)

    def test_serializer_venta_rechaza_cuota_sin_hito_pago(self):
        serializer = ContratoEmpresaClienteSerializer(
            instance=self.contrato_venta,
            data={
                "cuotas_venta": [
                    {"orden": 1, "porcentaje": 50},
                    {
                        "orden": 2,
                        "porcentaje": 50,
                        "hito_pago_tipo": "entrega_final",
                        "hito_pago_descripcion": "Entrega final",
                    },
                ]
            },
            partial=True,
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("cuotas_venta", serializer.errors)

    def test_serializer_venta_rechaza_hito_personalizado_sin_descripcion(self):
        serializer = ContratoEmpresaClienteSerializer(
            instance=self.contrato_venta,
            data={
                "cuotas_venta": [
                    {
                        "orden": 1,
                        "porcentaje": 100,
                        "hito_pago_tipo": "personalizado",
                        "hito_pago_descripcion": "",
                    }
                ]
            },
            partial=True,
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("cuotas_venta", serializer.errors)

    def test_serializer_venta_legacy_infiere_hitos_para_cuotas_antiguas(self):
        contrato_legacy = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            fecha_fin=date.today() + timedelta(days=365),
            nombre="Contrato Venta Legacy",
            estado="activo",
            tipo="venta",
            moneda_cobro="CLP",
            forma_pago_contractual="pago_unico",
            forma_pago_venta="cuotas",
            cuotas_venta=[
                {"orden": 1, "porcentaje": 60},
                {"orden": 2, "porcentaje": 20},
                {"orden": 3, "porcentaje": 20},
            ],
        )
        Cotizacion.objects.filter(
            pk__in=[
                self.cotizacion_usd.id,
                self.cotizacion_clp.id,
                self.cotizacion_uf.id,
            ]
        ).update(contrato=contrato_legacy)

        serializer = ContratoEmpresaClienteSerializer(contrato_legacy)
        cuotas_resumen = serializer.data["resumen_comercial"]["cuotas_venta_resumen"]

        self.assertEqual(cuotas_resumen[0]["hito_pago_descripcion"], "Inicio")
        self.assertEqual(cuotas_resumen[1]["hito_pago_descripcion"], "Entrega intermedia")
        self.assertEqual(cuotas_resumen[2]["hito_pago_descripcion"], "Entrega final")

    def test_actualizar_borrador_venta_rechaza_cotizacion_sin_tipo_cambio(self):
        contrato = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            fecha_fin=date.today() + timedelta(days=30),
            nombre="Contrato Venta Invalido",
            estado="borrador",
            tipo="venta",
            moneda_cobro="CLP",
            forma_pago_contractual="pago_unico",
        )
        cotizacion_sin_tipo_cambio = self._crear_cotizacion(
            nombre="Cotizacion sin dolar",
            tipo_moneda="1",
            precio_unitario=9000,
        )

        response = self.client.put(
            f"/api/contratos/{contrato.id}/actualizar-borrador/",
            {
                "contrato": {"nombre": contrato.nombre},
                "cotizaciones_ids": [cotizacion_sin_tipo_cambio.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cotizaciones", response.data)

    def test_actualizar_borrador_acepta_fechas_string_en_licencias(self):
        response = self.client.put(
            f"/api/contratos/{self.contrato.id}/actualizar-borrador/",
            {
                "licencias": [
                    {
                        "licencia_id": self.licencia.id,
                        "cantidad": 3,
                        "fecha_inicio": date.today().isoformat(),
                        "fecha_fin": (date.today() + timedelta(days=60)).isoformat(),
                    }
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        licencia_contrato = ContratoLicencia.objects.get(contrato=self.contrato, licencia=self.licencia)
        self.assertEqual(licencia_contrato.fecha_inicio, date.today())
        self.assertEqual(licencia_contrato.fecha_fin, date.today() + timedelta(days=60))

    def test_actualizar_borrador_rechaza_fecha_invalida_en_licencias(self):
        response = self.client.put(
            f"/api/contratos/{self.contrato.id}/actualizar-borrador/",
            {
                "licencias": [
                    {
                        "licencia_id": self.licencia.id,
                        "cantidad": 3,
                        "fecha_inicio": date.today().isoformat(),
                        "fecha_fin": "2026-99-99",
                    }
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("licencias", response.data)
        self.assertIn("fecha_fin", response.data["licencias"])

    def test_serializer_venta_respeta_item_uf_cotizacion_usd_contrato_clp(self):
        contrato = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            fecha_fin=date.today() + timedelta(days=30),
            nombre="Contrato Mixto UF USD CLP",
            estado="activo",
            tipo="venta",
            moneda_cobro="CLP",
            forma_pago_contractual="pago_unico",
            forma_pago_venta="contado",
        )
        cotizacion = self._crear_cotizacion(
            nombre="Cotizacion item UF en USD",
            tipo_moneda="1",
            item_tipo_moneda="3",
            precio_unitario=2,
            dolar_observado=950,
            valor_uf=38000,
        )
        cotizacion.contrato = contrato
        cotizacion.save(update_fields=["contrato"])

        serializer = ContratoEmpresaClienteSerializer(contrato)
        cotizacion_serializada = serializer.data["cotizaciones_vinculadas"][0]
        item_serializado = cotizacion_serializada["items"][0]

        self.assertEqual(serializer.data["total_contrato"], 76000.0)
        self.assertEqual(cotizacion_serializada["total_estimado"], 80.0)
        self.assertEqual(cotizacion_serializada["total_convertido"], 76000.0)
        self.assertTrue(cotizacion_serializada["tiene_items_moneda_mixta"])
        self.assertEqual(cotizacion_serializada["monedas_items"], ["UF"])
        self.assertEqual(item_serializado["tipo_moneda"], "3")
        self.assertEqual(item_serializado["precio_unitario_origen"], "2.00")
        self.assertEqual(item_serializado["precio_unitario"], 80.0)

    def test_enviar_aprobacion_venta_sin_cotizaciones_retorna_400(self):
        """Un contrato tipo venta sin cotizaciones aceptadas no puede enviarse a aprobacion."""
        contrato_sin_cotizaciones = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            fecha_fin=date.today() + timedelta(days=365),
            nombre="Contrato Venta Sin Cotizaciones",
            estado="borrador",
            tipo="venta",
            moneda_cobro="CLP",
            forma_pago_contractual="pago_unico",
        )

        response = self.client.post(
            f"/api/contratos/{contrato_sin_cotizaciones.id}/enviar-aprobacion/"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(
            "cotizaci",
            str(response.data.get("detail", "")).lower(),
        )

    def test_enviar_aprobacion_venta_con_cotizacion_pendiente_retorna_400(self):
        """Un contrato tipo venta con cotizaciones pero ninguna 'aceptada' debe retornar 400."""
        contrato = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            fecha_fin=date.today() + timedelta(days=365),
            nombre="Contrato Venta Cotizacion Pendiente",
            estado="borrador",
            tipo="venta",
            moneda_cobro="CLP",
            forma_pago_contractual="pago_unico",
        )
        cotizacion_pendiente = Cotizacion.objects.create(
            nombre="Cotizacion pendiente",
            empresa=self.empresa_prestadora,
            cliente=self.empresa_cliente,
            estado="pendiente",
            tipo_moneda="2",
            contrato=contrato,
        )
        ItemCotizacion.objects.create(
            cotizacion=cotizacion_pendiente,
            nombre="Item pendiente",
            cantidad=1,
            precio_unitario=50000,
            tipo_moneda="2",
        )

        response = self.client.post(
            f"/api/contratos/{contrato.id}/enviar-aprobacion/"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(
            "cotizaci",
            str(response.data.get("detail", "")).lower(),
        )


class ContratoBorradorLicenciaConsistenciaTest(ContratoAPITestBase):
    def setUp(self):
        super().setUp()
        self.contrato_licencia = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            fecha_fin=date.today() + timedelta(days=365),
            nombre="Contrato Borrador Licenciamiento",
            estado="borrador",
            tipo="licencia",
            moneda_cobro="USD",
        )

    def test_actualizar_borrador_rechaza_tipo_licencia_sin_licencias(self):
        response = self.client.put(
            f"/api/contratos/{self.contrato_licencia.id}/actualizar-borrador/",
            {
                "contrato": {"nombre": "Contrato sin licencias"},
                "licencias": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("licencias", response.data)

    def test_actualizar_borrador_licencia_aplica_snapshot_catalogo(self):
        self.licencia.modalidad_base = "P1Y"
        self.licencia.modalidad_anual_forma_pago = "PAGO_MENSUAL"
        self.licencia.precio_partner = 9900
        self.licencia.precio_venta = 9900
        self.licencia.moneda = "USD"
        self.licencia.save()

        response = self.client.put(
            f"/api/contratos/{self.contrato_licencia.id}/actualizar-borrador/",
            {
                "licencias": [
                    {
                        "licencia_id": self.licencia.id,
                        "cantidad": 2,
                    }
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        vinculada = ContratoLicencia.objects.get(
            contrato=self.contrato_licencia,
            licencia=self.licencia,
        )
        self.assertEqual(vinculada.modalidad_snapshot, "P1Y")
        self.assertEqual(vinculada.moneda_snapshot, "USD")
        self.assertEqual(float(vinculada.precio_unitario_snapshot), 9900.0)


class CatalogoServiciosAPITest(ContratoAPITestBase):
    def test_crear_servicio_con_alcance_structurado(self):
        caracteristica = CaracteristicaServicio.objects.create(
            nombre="Monitoreo continuo",
            empresa_prestadora=self.empresa_prestadora,
        )

        response = self.client.post(
            "/api/servicios/",
            {
                "nombre": "Soporte Gestionado",
                "categoria": "soporte",
                "precio": "10000",
                "tipo_moneda": "CLP",
                "alcance_config": [
                    {
                        "caracteristica_id": caracteristica.id,
                        "modo": "incluye",
                        "orden": 0,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["alcance_caracteristicas"]), 1)
        self.assertEqual(response.data["alcance_caracteristicas"][0]["modo"], "incluye")
        self.assertIn("Monitoreo continuo", response.data["incluye"])

    def test_plan_devuelve_precios_sugeridos_y_alcance_heredado(self):
        caracteristica = CaracteristicaServicio.objects.create(
            nombre="Atencion remota",
            empresa_prestadora=self.empresa_prestadora,
        )
        servicio = Servicio.objects.create(
            nombre="Mesa de ayuda",
            categoria="soporte",
            empresa_prestadora=self.empresa_prestadora,
            precio="25000",
            tipo_moneda="CLP",
        )
        ServicioCaracteristica.objects.create(
            servicio=servicio,
            caracteristica=caracteristica,
            modo=ServicioCaracteristica.MODO_INCLUYE,
            orden=0,
        )
        servicio.caracteristicas.add(caracteristica)
        plan = PlanServicio.objects.create(
            nombre="Plan Plus",
            empresa_prestadora=self.empresa_prestadora,
        )
        plan.servicios.add(servicio)

        response = self.client.get(f"/api/planes-servicio/{plan.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["precio_sugerido"], 25000.0)
        self.assertEqual(response.data["tipo_moneda_sugerido"], "CLP")
        self.assertEqual(len(response.data["alcance_heredado"]), 1)
        self.assertEqual(
            response.data["alcance_heredado"][0]["caracteristica"]["nombre"],
            "Atencion remota",
        )

    def test_actualizar_servicio_en_plan_genera_nueva_version(self):
        servicio = Servicio.objects.create(
            nombre="Servicio Base",
            categoria="soporte",
            empresa_prestadora=self.empresa_prestadora,
            precio="20000",
            tipo_moneda="CLP",
        )
        plan = PlanServicio.objects.create(
            nombre="Plan Base",
            empresa_prestadora=self.empresa_prestadora,
        )
        plan.servicios.add(servicio)

        response = self.client.patch(
            f"/api/servicios/{servicio.id}/",
            {"nombre": "Servicio Actualizado", "precio": "25000"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["version"], 2)
        self.assertEqual(response.data["nombre"], "Servicio Actualizado")
        self.assertEqual(str(response.data["precio"]), "25000")

        servicio.refresh_from_db()
        self.assertFalse(servicio.es_vigente)
        nueva_version = Servicio.objects.get(version=2, servicio_origen=servicio)
        self.assertTrue(nueva_version.es_vigente)
        self.assertEqual(nueva_version.nombre, "Servicio Actualizado")


class ContratoTransicionEstadoTest(ContratoAPITestBase):
    """Tests para la acción cambiar-estado."""

    def test_borrador_a_activo(self):
        response = self.client.post(
            f"/api/contratos/{self.contrato.id}/cambiar-estado/",
            {"estado": "activo"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["estado"], "activo")

    def test_activo_a_suspendido(self):
        self.contrato.estado = "activo"
        self.contrato.save()

        response = self.client.post(
            f"/api/contratos/{self.contrato.id}/cambiar-estado/",
            {"estado": "suspendido"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["estado"], "suspendido")

    def test_activo_a_finalizado(self):
        self.contrato.estado = "activo"
        self.contrato.save()

        response = self.client.post(
            f"/api/contratos/{self.contrato.id}/cambiar-estado/",
            {"estado": "finalizado"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["estado"], "finalizado")

    def test_suspendido_a_activo(self):
        self.contrato.estado = "suspendido"
        self.contrato.save()

        response = self.client.post(
            f"/api/contratos/{self.contrato.id}/cambiar-estado/",
            {"estado": "activo"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["estado"], "activo")

    def test_transicion_invalida_borrador_a_suspendido(self):
        response = self.client.post(
            f"/api/contratos/{self.contrato.id}/cambiar-estado/",
            {"estado": "suspendido"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_transicion_invalida_finalizado_no_puede_cambiar(self):
        self.contrato.estado = "finalizado"
        # Evitar que save() reescriba el estado
        ContratoEmpresaCliente.objects.filter(pk=self.contrato.pk).update(estado="finalizado")
        self.contrato.refresh_from_db()

        response = self.client.post(
            f"/api/contratos/{self.contrato.id}/cambiar-estado/",
            {"estado": "activo"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sin_campo_estado(self):
        response = self.client.post(
            f"/api/contratos/{self.contrato.id}/cambiar-estado/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ContratoRenovarTest(ContratoAPITestBase):
    """Tests para la acción renovar."""

    def test_renovar_contrato_activo(self):
        self.contrato.estado = "activo"
        self.contrato.save()

        # Añadir relaciones para verificar que se copian
        ContratoVisita.objects.create(
            contrato=self.contrato,
            visita=self.visita,
            frecuencia="mensual",
            cantidad=2,
        )
        ContratoCondicionEspecial.objects.create(
            contrato=self.contrato,
            condicion=self.condicion,
        )

        response = self.client.post(
            f"/api/contratos/{self.contrato.id}/renovar/",
            {"nombre": "Contrato Renovado"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["estado"], "borrador")
        self.assertEqual(response.data["nombre"], "Contrato Renovado")

        # Verificar que se copiaron las relaciones
        nuevo_id = response.data["id"]
        nuevo = ContratoEmpresaCliente.objects.get(pk=nuevo_id)
        self.assertEqual(nuevo.contrato_visitas.count(), 1)
        self.assertEqual(nuevo.contrato_condiciones_especiales.count(), 1)

    def test_renovar_contrato_borrador_falla(self):
        response = self.client.post(
            f"/api/contratos/{self.contrato.id}/renovar/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ContratoActualizarTransaccionalTest(ContratoAPITestBase):
    """Tests para la acción PUT actualizar (transaccional)."""

    def test_actualizar_contrato_con_visitas(self):
        response = self.client.put(
            f"/api/contratos/{self.contrato.id}/actualizar/",
            {
                "contrato": {
                    "nombre": "Contrato Actualizado",
                    "fecha_inicio": self.contrato.fecha_inicio.isoformat(),
                },
                "visitas": [
                    {
                        "visita_id": self.visita.id,
                        "frecuencia": "mensual",
                        "cantidad": 3,
                    }
                ],
                "eliminar_visitas": [],
                "licencias": [],
                "eliminar_licencias": [],
                "condiciones_especiales": [],
                "eliminar_condiciones": [],
                "usuarios_vinculados": [],
                "eliminar_usuarios": [],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["nombre"], "Contrato Actualizado")
        self.assertEqual(
            ContratoVisita.objects.filter(contrato=self.contrato).count(), 1
        )

    def test_actualizar_eliminar_visita(self):
        cv = ContratoVisita.objects.create(
            contrato=self.contrato,
            visita=self.visita,
            frecuencia="mensual",
            cantidad=1,
        )

        response = self.client.put(
            f"/api/contratos/{self.contrato.id}/actualizar/",
            {
                "contrato": {"nombre": self.contrato.nombre},
                "visitas": [],
                "eliminar_visitas": [cv.id],
                "licencias": [],
                "eliminar_licencias": [],
                "condiciones_especiales": [],
                "eliminar_condiciones": [],
                "usuarios_vinculados": [],
                "eliminar_usuarios": [],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            ContratoVisita.objects.filter(contrato=self.contrato).count(), 0
        )

    def test_actualizar_contrato_acepta_fecha_string_en_licencia_existente(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia,
            cantidad=2,
            fecha_inicio=date.today(),
            fecha_fin=date.today() + timedelta(days=30),
            estado="activa",
        )

        response = self.client.put(
            f"/api/contratos/{self.contrato.id}/actualizar/",
            {
                "contrato": {"nombre": self.contrato.nombre},
                "visitas": [],
                "eliminar_visitas": [],
                "licencias": [
                    {
                        "id": contrato_licencia.id,
                        "cantidad": 4,
                        "fecha_inicio": contrato_licencia.fecha_inicio.isoformat(),
                        "fecha_fin": (date.today() + timedelta(days=90)).isoformat(),
                    }
                ],
                "eliminar_licencias": [],
                "condiciones_especiales": [],
                "eliminar_condiciones": [],
                "usuarios_vinculados": [],
                "eliminar_usuarios": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contrato_licencia.refresh_from_db()
        self.assertEqual(contrato_licencia.fecha_fin, date.today() + timedelta(days=90))

    def test_actualizar_contrato_aplica_snapshot_catalogo(self):
        self.contrato.moneda_cobro = "CLP"
        self.contrato.tipo = "licencia"
        self.contrato.save(update_fields=["moneda_cobro", "tipo"])

        self.licencia.modalidad_base = "P1Y"
        self.licencia.modalidad_anual_forma_pago = "PAGO_MENSUAL"
        self.licencia.precio_venta = 11000
        self.licencia.moneda = "USD"
        self.licencia.save()

        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia,
            cantidad=2,
            fecha_inicio=date.today(),
            fecha_fin=date.today() + timedelta(days=30),
            estado="activa",
        )

        response = self.client.put(
            f"/api/contratos/{self.contrato.id}/actualizar/",
            {
                "contrato": {"nombre": self.contrato.nombre},
                "visitas": [],
                "eliminar_visitas": [],
                "licencias": [
                    {
                        "id": contrato_licencia.id,
                        "cantidad": 3,
                    }
                ],
                "eliminar_licencias": [],
                "condiciones_especiales": [],
                "eliminar_condiciones": [],
                "usuarios_vinculados": [],
                "eliminar_usuarios": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contrato_licencia.refresh_from_db()
        self.assertEqual(contrato_licencia.modalidad_snapshot, "P1Y")
        self.assertEqual(contrato_licencia.moneda_snapshot, "USD")

    def test_actualizar_contrato_tipo_licencia_rechaza_quedar_sin_licencias(self):
        self.contrato.tipo = "licencia"
        self.contrato.save(update_fields=["tipo"])

        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia,
            cantidad=1,
            estado="activa",
        )

        response = self.client.put(
            f"/api/contratos/{self.contrato.id}/actualizar/",
            {
                "contrato": {"nombre": self.contrato.nombre},
                "visitas": [],
                "eliminar_visitas": [],
                "licencias": [],
                "eliminar_licencias": [contrato_licencia.id],
                "condiciones_especiales": [],
                "eliminar_condiciones": [],
                "usuarios_vinculados": [],
                "eliminar_usuarios": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("licencias", response.data)

    def test_actualizar_contrato_acepta_fechas_string_en_nueva_licencia(self):
        response = self.client.put(
            f"/api/contratos/{self.contrato.id}/actualizar/",
            {
                "contrato": {"nombre": self.contrato.nombre},
                "visitas": [],
                "eliminar_visitas": [],
                "licencias": [
                    {
                        "licencia_id": self.licencia.id,
                        "cantidad": 2,
                        "fecha_inicio": date.today().isoformat(),
                        "fecha_fin": (date.today() + timedelta(days=45)).isoformat(),
                    }
                ],
                "eliminar_licencias": [],
                "condiciones_especiales": [],
                "eliminar_condiciones": [],
                "usuarios_vinculados": [],
                "eliminar_usuarios": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        licencia_contrato = ContratoLicencia.objects.get(contrato=self.contrato, licencia=self.licencia)
        self.assertEqual(licencia_contrato.fecha_inicio, date.today())
        self.assertEqual(licencia_contrato.fecha_fin, date.today() + timedelta(days=45))


class ContratoAuthTest(ContratoAPITestBase):
    """Tests de autenticación.
    
    NOTA: El ViewSet no tiene permission_classes explícito y
    DEFAULT_PERMISSION_CLASSES es AllowAny, por lo que get_queryset()
    recibe AnonymousUser. Estos tests documentan el comportamiento actual.
    Idealmente se debería agregar IsAuthenticated al ViewSet.
    """

    def test_sin_auth_listar_falla_por_anonymous_user(self):
        """Sin auth, get_queryset() falla al filtrar con AnonymousUser."""
        self.client.force_authenticate(user=None)
        with self.assertRaises(TypeError):
            self.client.get("/api/contratos/")

    def test_sin_auth_detalle_falla_por_anonymous_user(self):
        """Sin auth, get_queryset() falla al filtrar con AnonymousUser."""
        self.client.force_authenticate(user=None)
        with self.assertRaises(TypeError):
            self.client.get(f"/api/contratos/{self.contrato.id}/")


class RutasPublicasTest(APITestCase):
    """Tests para las rutas públicas (firma de contratos)."""

    def setUp(self):
        self.empresa_prestadora = Empresa.objects.create(nombre="Prestadora")
        self.empresa_cliente = Empresa.objects.create(nombre="Cliente")
        self.sucursal = SucursalEmpresa.objects.create(
            nombre="Sucursal",
            empresa=self.empresa_cliente,
        )
        self.user = User.objects.create_user(
            email="firma@test.com",
            password="testpass123",
            first_name="Firma",
            last_name="User",
        )
        self.usuario_empresa = UsuarioEmpresa.objects.create(
            usuario=self.user,
            sucursal=self.sucursal,
        )
        self.contrato = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            nombre="Contrato Firma",
        )
        self.vinculo = UsuarioVinculadoContrato.objects.create(
            usuario=self.usuario_empresa,
            contrato=self.contrato,
        )
        self.envio = EnvioContratoFirmaUsuario.objects.create(
            usuario=self.vinculo,
            enviado=True,
        )

    def test_obtener_acuerdos_por_uuid_valido(self):
        response = self.client.get(f"/api/acuerdos-por-envio/{self.envio.uuid}/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("acuerdos_confidencialidad", response.json())

    def test_obtener_acuerdos_uuid_inexistente(self):
        fake_uuid = uuid.uuid4()
        response = self.client.get(f"/api/acuerdos-por-envio/{fake_uuid}/")
        self.assertEqual(response.status_code, 404)

    def test_firmar_envio(self):
        import json
        from django.utils import timezone

        response = self.client.patch(
            f"/api/envio-firma/{self.envio.uuid}/firmar/",
            data=json.dumps({
                "firma": VALID_SIGNATURE_DATA_URL,
                "fecha_firma": timezone.now().isoformat(),
                "firmado": True,
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["firmado"])

    def test_firmar_envio_uuid_inexistente(self):
        import json
        from django.utils import timezone

        fake_uuid = uuid.uuid4()
        response = self.client.patch(
            f"/api/envio-firma/{fake_uuid}/firmar/",
            data=json.dumps({
                "firma": "test",
                "fecha_firma": timezone.now().isoformat(),
                "firmado": True,
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)

    def test_firmar_envio_sin_campos_requeridos(self):
        import json

        response = self.client.patch(
            f"/api/envio-firma/{self.envio.uuid}/firmar/",
            data=json.dumps({"firma": "test"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_firmar_envio_rechaza_firma_no_imagen(self):
        import json
        from django.utils import timezone

        response = self.client.patch(
            f"/api/envio-firma/{self.envio.uuid}/firmar/",
            data=json.dumps(
                {
                    "firma": "firma-plana",
                    "fecha_firma": timezone.now().isoformat(),
                    "firmado": True,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)


class ContratoVolverABorradorTest(ContratoAPITestBase):
    def setUp(self):
        super().setUp()
        self.contrato.estado = "en_aprobacion_cliente"
        self.contrato.save(update_fields=["estado", "fecha_modificacion"])

        self.user_cliente = User.objects.create_user(
            email="cliente.rollback@test.com",
            password="testpass123",
            first_name="Cliente",
            last_name="Rollback",
        )
        self.usuario_empresa_cliente = UsuarioEmpresa.objects.create(
            usuario=self.user_cliente,
            sucursal=self.sucursal_cliente,
        )
        self.vinculo_principal = UsuarioVinculadoContrato.objects.create(
            usuario=self.usuario_empresa_cliente,
            contrato=self.contrato,
            es_destinatario_principal=True,
        )
        self.envio_aprobacion = EnvioContratoAprobacion.objects.create(
            contrato=self.contrato,
            destinatario=self.vinculo_principal,
            enviado=True,
            version_envio=1,
            snapshot_contrato={"id": self.contrato.id, "nombre": self.contrato.nombre},
        )
        # Requerido para que enviar-aprobacion no rechace el contrato de tipo servicios
        servicio_test = Servicio.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            nombre="Servicio de prueba",
            precio=10000,
            tipo_moneda="CLP",
        )
        ContratoItemComercial.objects.create(
            contrato=self.contrato,
            tipo_origen="servicio",
            servicio_version=servicio_test,
            snapshot_nombre="Servicio de prueba",
            cantidad=1,
            forma_pago="mensual",
            moneda="CLP",
        )
        # Requerido para que enviar-aprobacion no rechace por falta de secciones generadas
        SeccionContratoGenerada.objects.create(
            contrato=self.contrato,
            titulo="Sección de prueba",
            contenido_renderizado="Contenido de prueba",
            orden=1,
        )

    def test_volver_a_borrador_depreca_envio_pendiente(self):
        response = self.client.post(f"/api/contratos/{self.contrato.id}/volver-a-borrador/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.contrato.refresh_from_db()
        self.envio_aprobacion.refresh_from_db()
        self.assertEqual(self.contrato.estado, "borrador")
        self.assertTrue(self.envio_aprobacion.deprecado)
        self.assertIsNotNone(self.envio_aprobacion.fecha_deprecacion)
        self.assertEqual(
            self.envio_aprobacion.motivo_deprecacion,
            "Contrato devuelto a borrador",
        )
        self.assertEqual(response.data["envios_deprecados"], 1)
        self.assertEqual(response.data["contrato"]["estado"], "borrador")

    def test_volver_a_borrador_falla_fuera_de_revision_cliente(self):
        self.contrato.estado = "borrador"
        self.contrato.save(update_fields=["estado", "fecha_modificacion"])

        response = self.client.post(f"/api/contratos/{self.contrato.id}/volver-a-borrador/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("revision del cliente", response.data["detail"])

    @patch("contratos.flow_helpers.send_email_task.delay")
    def test_reenviar_aprobacion_post_rollback_crea_nuevo_uuid_y_version(self, mocked_delay):
        rollback_response = self.client.post(f"/api/contratos/{self.contrato.id}/volver-a-borrador/")
        self.assertEqual(rollback_response.status_code, status.HTTP_200_OK)

        response = self.client.post(f"/api/contratos/{self.contrato.id}/enviar-aprobacion/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.envio_aprobacion.refresh_from_db()
        self.assertTrue(self.envio_aprobacion.deprecado)

        nuevo_envio = EnvioContratoAprobacion.objects.exclude(id=self.envio_aprobacion.id).get()
        self.assertNotEqual(nuevo_envio.uuid, self.envio_aprobacion.uuid)
        self.assertEqual(nuevo_envio.version_envio, 2)
        self.assertFalse(nuevo_envio.deprecado)
        self.assertEqual(mocked_delay.call_count, 1)

        old_detail_response = self.client.get(
            f"/api/public/contrato-aprobacion/{self.envio_aprobacion.uuid}/"
        )
        self.assertEqual(old_detail_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalidado", old_detail_response.data["detail"])


class ContratoRevisionPublicaTest(ContratoAPITestBase):
    def setUp(self):
        super().setUp()
        self.contrato.estado = "en_aprobacion_cliente"
        self.contrato.save(update_fields=["estado", "fecha_modificacion"])

        self.user_cliente = User.objects.create_user(
            email="cliente.aprueba@test.com",
            password="testpass123",
            first_name="Cliente",
            last_name="Aprobacion",
        )
        self.usuario_empresa_cliente = UsuarioEmpresa.objects.create(
            usuario=self.user_cliente,
            sucursal=self.sucursal_cliente,
        )
        self.vinculo_principal = UsuarioVinculadoContrato.objects.create(
            usuario=self.usuario_empresa_cliente,
            contrato=self.contrato,
            es_destinatario_principal=True,
        )
        self.envio_aprobacion = EnvioContratoAprobacion.objects.create(
            contrato=self.contrato,
            destinatario=self.vinculo_principal,
            enviado=True,
            snapshot_contrato={"id": self.contrato.id, "nombre": self.contrato.nombre},
        )

    def test_detalle_publico_rechaza_token_deprecado(self):
        from django.utils import timezone

        self.envio_aprobacion.deprecado = True
        self.envio_aprobacion.fecha_deprecacion = timezone.now()
        self.envio_aprobacion.motivo_deprecacion = "Contrato devuelto a borrador"
        self.envio_aprobacion.save(
            update_fields=["deprecado", "fecha_deprecacion", "motivo_deprecacion"]
        )

        response = self.client.get(f"/api/public/contrato-aprobacion/{self.envio_aprobacion.uuid}/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalidado", response.data["detail"])

    def test_pdf_publico_rechaza_token_deprecado(self):
        from django.utils import timezone

        self.envio_aprobacion.deprecado = True
        self.envio_aprobacion.fecha_deprecacion = timezone.now()
        self.envio_aprobacion.motivo_deprecacion = "Contrato devuelto a borrador"
        self.envio_aprobacion.save(
            update_fields=["deprecado", "fecha_deprecacion", "motivo_deprecacion"]
        )

        response = self.client.get(
            f"/api/public/contrato-aprobacion/{self.envio_aprobacion.uuid}/pdf/"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalidado", response.data["detail"])

    def test_pdf_publico_usa_pdf_congelado_inmutable(self):
        pdf_congelado = b"PDF_CONGELADO_BYTES"
        self.envio_aprobacion.pdf_congelado = pdf_congelado
        self.envio_aprobacion.save(update_fields=["pdf_congelado"])

        self.contrato.nombre = "Contrato modificado despues del envio"
        self.contrato.save(update_fields=["nombre", "fecha_modificacion"])

        response = self.client.get(
            f"/api/public/contrato-aprobacion/{self.envio_aprobacion.uuid}/pdf/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.content, pdf_congelado)

    def test_respuestas_publicas_rechazan_token_deprecado(self):
        from django.utils import timezone

        self.envio_aprobacion.deprecado = True
        self.envio_aprobacion.fecha_deprecacion = timezone.now()
        self.envio_aprobacion.motivo_deprecacion = "Contrato devuelto a borrador"
        self.envio_aprobacion.save(
            update_fields=["deprecado", "fecha_deprecacion", "motivo_deprecacion"]
        )

        payloads = {
            "aprobar": {},
            "rechazar": {"comentario": "Necesito cambios"},
            "rechazar-definitivo": {"comentario": "No avanzaremos"},
        }
        for accion, payload in payloads.items():
            response = self.client.post(
                f"/api/public/contrato-aprobacion/{self.envio_aprobacion.uuid}/{accion}/",
                payload,
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("invalidado", response.data["detail"])

    def test_rechazo_definitivo_cierra_contrato(self):
        response = self.client.post(
            f"/api/public/contrato-aprobacion/{self.envio_aprobacion.uuid}/rechazar-definitivo/",
            {"comentario": "No continuaremos con esta propuesta."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.contrato.refresh_from_db()
        self.envio_aprobacion.refresh_from_db()
        self.assertEqual(self.contrato.estado, "rechazado_cliente")
        self.assertTrue(self.envio_aprobacion.respondido)
        self.assertFalse(self.envio_aprobacion.aprobado)
        self.assertIn("cerrado", response.data["detail"])


class ContratoPlanDetalleSnapshotTest(ContratoAPITestBase):
    def setUp(self):
        super().setUp()
        self.contrato.moneda_cobro = "CLP"
        self.contrato.save(update_fields=["moneda_cobro", "fecha_modificacion"])

        self.user_cliente = User.objects.create_user(
            email="cliente.plan@test.com",
            password="testpass123",
            first_name="Cliente",
            last_name="Plan",
        )
        self.usuario_empresa_cliente = UsuarioEmpresa.objects.create(
            usuario=self.user_cliente,
            sucursal=self.sucursal_cliente,
        )
        self.vinculo_principal = UsuarioVinculadoContrato.objects.create(
            usuario=self.usuario_empresa_cliente,
            contrato=self.contrato,
            es_destinatario_principal=True,
        )

        self.caracteristica_incluida = CaracteristicaServicio.objects.create(
            nombre="Monitoreo 24/7",
            descripcion="Seguimiento continuo del servicio",
            empresa_prestadora=self.empresa_prestadora,
        )
        self.caracteristica_excluida = CaracteristicaServicio.objects.create(
            nombre="Soporte on-site fuera de horario",
            descripcion="Atencion fuera de SLA normal",
            empresa_prestadora=self.empresa_prestadora,
        )
        self.servicio = Servicio.objects.create(
            nombre="Mesa de ayuda avanzada",
            descripcion="Soporte remoto y seguimiento operativo.",
            categoria="soporte",
            empresa_prestadora=self.empresa_prestadora,
            precio="45000",
            tipo_moneda="CLP",
            incluye="Mesa de ayuda remota",
            no_incluye="Hardware",
            clausulas_especiales="Atencion prioritaria en horario habil.",
        )
        self.servicio.caracteristicas.add(self.caracteristica_incluida)
        ServicioCaracteristica.objects.create(
            servicio=self.servicio,
            caracteristica=self.caracteristica_incluida,
            modo=ServicioCaracteristica.MODO_INCLUYE,
            orden=0,
        )
        ServicioCaracteristica.objects.create(
            servicio=self.servicio,
            caracteristica=self.caracteristica_excluida,
            modo=ServicioCaracteristica.MODO_NO_INCLUYE,
            orden=1,
        )

        self.plan = PlanServicio.objects.create(
            nombre="Plan Soporte Integral",
            descripcion="Cobertura principal para clientes con SLA extendido.",
            empresa_prestadora=self.empresa_prestadora,
            precio="45000",
            tipo_moneda="CLP",
            num_visitas_mensuales=2,
            incluye="Coordinacion operativa",
            no_incluye="Cambios de infraestructura mayor",
            clausulas_especiales="Se agenda con 48 horas de anticipacion.",
        )
        self.plan.servicios.add(self.servicio)
        detalle = self.plan.detalles_servicio.get(servicio_version=self.servicio)
        detalle.cantidad_default = 1
        detalle.veces_por_mes_default = 2
        detalle.save(update_fields=["cantidad_default", "veces_por_mes_default", "fecha_modificacion"])

    def test_item_plan_guarda_snapshot_componentes_enriquecido(self):
        item = ContratoItemComercial.objects.create(
            contrato=self.contrato,
            tipo_origen="plan",
            plan_version=self.plan,
            snapshot_nombre=self.plan.nombre,
            cantidad=1,
            forma_pago="mensual",
            moneda="CLP",
        )

        self.assertEqual(len(item.snapshot_componentes_plan), 1)
        componente = item.snapshot_componentes_plan[0]
        self.assertEqual(componente["nombre"], "Mesa de ayuda avanzada")
        self.assertEqual(componente["descripcion"], "Soporte remoto y seguimiento operativo.")
        self.assertEqual(componente["categoria_label"], "Soporte")
        self.assertEqual(componente["veces_por_mes_default"], 2)
        self.assertEqual(componente["caracteristicas"][0]["nombre"], "Monitoreo 24/7")
        self.assertEqual(componente["alcance_caracteristicas"][0]["modo"], "incluye")
        self.assertIn("Monitoreo 24/7", componente["incluye"])
        self.assertIn("Soporte on-site fuera de horario", componente["no_incluye"])
        self.assertIn("Atencion prioritaria", componente["clausulas_especiales"])

    def test_enviar_aprobacion_y_firma_congelan_detalle_de_plan(self):
        ContratoItemComercial.objects.create(
            contrato=self.contrato,
            tipo_origen="plan",
            plan_version=self.plan,
            snapshot_nombre=self.plan.nombre,
            cantidad=1,
            forma_pago="mensual",
            moneda="CLP",
        )

        respuesta_aprobacion = self.client.post(
            f"/api/contratos/{self.contrato.id}/enviar-aprobacion/"
        )
        self.assertEqual(respuesta_aprobacion.status_code, status.HTTP_201_CREATED)
        envio_aprobacion = EnvioContratoAprobacion.objects.get(
            pk=respuesta_aprobacion.data["id"]
        )
        componente_aprobacion = envio_aprobacion.snapshot_contrato["items_comerciales"][0][
            "snapshot_componentes_plan"
        ][0]
        self.assertEqual(componente_aprobacion["nombre"], "Mesa de ayuda avanzada")
        self.assertIn("Monitoreo 24/7", componente_aprobacion["incluye"])

        self.contrato.estado = "aprobado_cliente"
        self.contrato.save(update_fields=["estado", "fecha_modificacion"])
        self.empresa_prestadora.firma_empresa = VALID_SIGNATURE_DATA_URL
        self.empresa_prestadora.save(update_fields=["firma_empresa"])

        respuesta_firma = self.client.post(f"/api/contratos/{self.contrato.id}/enviar-firma/")
        self.assertEqual(respuesta_firma.status_code, status.HTTP_201_CREATED)
        envio_firma = EnvioContratoFirmaUsuario.objects.get(pk=respuesta_firma.data["id"])
        componente_firma = envio_firma.snapshot_contrato["items_comerciales"][0][
            "snapshot_componentes_plan"
        ][0]
        self.assertEqual(componente_firma["categoria_label"], "Soporte")
        self.assertIn("Soporte on-site fuera de horario", componente_firma["no_incluye"])
        self.assertTrue(bool(envio_firma.pdf_congelado))


class ContratoFirmaPreviewTest(ContratoAPITestBase):
    def setUp(self):
        super().setUp()
        self.contrato.estado = "aprobado_cliente"
        self.contrato.save(update_fields=["estado", "fecha_modificacion"])

        self.user_cliente = User.objects.create_user(
            email="cliente@firma.com",
            password="testpass123",
            first_name="Cliente",
            last_name="Firma",
        )
        self.usuario_empresa_cliente = UsuarioEmpresa.objects.create(
            usuario=self.user_cliente,
            sucursal=self.sucursal_cliente,
        )
        self.vinculo_principal = UsuarioVinculadoContrato.objects.create(
            usuario=self.usuario_empresa_cliente,
            contrato=self.contrato,
            es_destinatario_principal=True,
        )
        self.acuerdo_base = AcuerdoConfidencialidadBase.objects.create(
            titulo="NDA Base",
            contenido="Contenido confidencial",
        )
        AcuerdoConfidencialidadContrato.objects.create(
            contrato=self.contrato,
            acuerdo_base=self.acuerdo_base,
        )

    def test_preview_firma_devuelve_metadata_y_confidencialidad(self):
        self.empresa_prestadora.firma_empresa = VALID_SIGNATURE_DATA_URL
        self.empresa_prestadora.save(update_fields=["firma_empresa"])

        response = self.client.get(f"/api/contratos/{self.contrato.id}/preview-firma/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["firma_prestadora_disponible"])
        self.assertFalse(response.data["es_version_enviada"])
        self.assertEqual(
            response.data["contrato"]["firmas_confidencialidad"][0]["titulo_acuerdo"],
            "NDA Base",
        )

    def test_enviar_firma_falla_si_falta_firma_prestadora(self):
        response = self.client.post(f"/api/contratos/{self.contrato.id}/enviar-firma/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("firma configurada", response.data["detail"])

    def test_enviar_firma_crea_snapshot_con_pdf_y_version_enviada(self):
        self.empresa_prestadora.firma_empresa = VALID_SIGNATURE_DATA_URL
        self.empresa_prestadora.save(update_fields=["firma_empresa"])

        response = self.client.post(f"/api/contratos/{self.contrato.id}/enviar-firma/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        envio = EnvioContratoFirmaUsuario.objects.get(pk=response.data["id"])
        self.assertTrue(bool(envio.pdf_congelado))
        self.assertEqual(
            envio.snapshot_contrato["firmas_confidencialidad"][0]["titulo_acuerdo"],
            "NDA Base",
        )

        preview_response = self.client.get(f"/api/contratos/{self.contrato.id}/preview-firma/")
        self.assertEqual(preview_response.status_code, status.HTTP_200_OK)
        self.assertTrue(preview_response.data["es_version_enviada"])

    def test_firma_publica_actualiza_pdf_con_firma_cliente(self):
        from django.utils import timezone

        self.empresa_prestadora.firma_empresa = VALID_SIGNATURE_DATA_URL
        self.empresa_prestadora.save(update_fields=["firma_empresa"])

        response = self.client.post(f"/api/contratos/{self.contrato.id}/enviar-firma/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        envio = EnvioContratoFirmaUsuario.objects.get(pk=response.data["id"])
        pdf_original = bytes(envio.pdf_congelado or b"")

        firma_response = self.client.patch(
            f"/api/public/contrato-firma/{envio.uuid}/firmar/",
            {
                "firma": VALID_SIGNATURE_DATA_URL,
                "fecha_firma": timezone.now().isoformat(),
                "firmado": True,
            },
            format="json",
        )

        self.assertEqual(firma_response.status_code, status.HTTP_200_OK)

        envio.refresh_from_db()
        self.assertTrue(envio.firmado)
        self.assertTrue(bool(envio.pdf_congelado))
        self.assertNotEqual(bytes(envio.pdf_congelado), pdf_original)

        pdf_response = self.client.get(f"/api/public/contrato-firma/{envio.uuid}/pdf/")
        self.assertEqual(pdf_response.status_code, status.HTTP_200_OK)
        self.assertEqual(pdf_response.content, bytes(envio.pdf_congelado))


class EnvioContratoFirmaUsuarioReenvioTest(ContratoAPITestBase):
    def setUp(self):
        super().setUp()
        self.contrato.estado = "en_firma"
        self.contrato.save(update_fields=["estado", "fecha_modificacion"])

        self.user_cliente = User.objects.create_user(
            email="cliente.reenvio@firma.com",
            password="testpass123",
            first_name="Cliente",
            last_name="Reenvio",
        )
        self.usuario_empresa_cliente = UsuarioEmpresa.objects.create(
            usuario=self.user_cliente,
            sucursal=self.sucursal_cliente,
        )
        self.vinculo_principal = UsuarioVinculadoContrato.objects.create(
            usuario=self.usuario_empresa_cliente,
            contrato=self.contrato,
            es_destinatario_principal=True,
        )
        self.envio = EnvioContratoFirmaUsuario.objects.create(
            usuario=self.vinculo_principal,
            enviado=True,
        )
        self.url_reenvio = (
            f"/api/contratos/{self.contrato.id}/usuarios-vinculados/"
            f"{self.vinculo_principal.id}/envio-firma/{self.envio.id}/reenviar/"
        )

    def test_reenvio_permitido_para_envio_pendiente(self):
        response = self.client.post(self.url_reenvio)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("reenviado correctamente", response.data["detail"])

    def test_reenvio_rechazado_si_documento_ya_fue_firmado(self):
        self.envio.firmado = True
        self.envio.save(update_fields=["firmado"])

        response = self.client.post(self.url_reenvio)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ya fue firmado", response.data["detail"])

    def test_reenvio_rechazado_si_contrato_ya_no_esta_en_firma(self):
        self.contrato.estado = "activo"
        self.contrato.save(update_fields=["estado", "fecha_modificacion"])

        response = self.client.post(self.url_reenvio)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ya no esta disponible", response.data["detail"])


class ContratoHistorialViewTest(ContratoAPITestBase):
    def setUp(self):
        super().setUp()
        from django.utils import timezone

        self.user_cliente = User.objects.create_user(
            email="cliente.historial@test.com",
            password="testpass123",
            first_name="Cliente",
            last_name="Historial",
        )
        self.usuario_empresa_cliente = UsuarioEmpresa.objects.create(
            usuario=self.user_cliente,
            sucursal=self.sucursal_cliente,
        )
        self.vinculo_principal = UsuarioVinculadoContrato.objects.create(
            usuario=self.usuario_empresa_cliente,
            contrato=self.contrato,
            es_destinatario_principal=True,
        )
        EnvioContratoAprobacion.objects.create(
            contrato=self.contrato,
            destinatario=self.vinculo_principal,
            enviado=True,
            respondido=True,
            aprobado=True,
        )
        EnvioContratoFirmaUsuario.objects.create(
            usuario=self.vinculo_principal,
            enviado=True,
            firmado=True,
            fecha_firma=timezone.now(),
            firma=VALID_SIGNATURE_DATA_URL,
        )

    def test_historial_contrato_incluye_eventos_operativos(self):
        response = self.client.get(f"/api/contratos/{self.contrato.id}/historial/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 3)
        origenes = {evento["origen"] for evento in response.data}
        self.assertIn("contrato", origenes)
        self.assertIn("aprobacion", origenes)
        self.assertIn("firma", origenes)

    def test_historial_contrato_muestra_envio_deprecado_en_ver_todo(self):
        from django.utils import timezone

        EnvioContratoAprobacion.objects.create(
            contrato=self.contrato,
            destinatario=self.vinculo_principal,
            enviado=True,
            deprecado=True,
            fecha_deprecacion=timezone.now(),
            motivo_deprecacion="Contrato devuelto a borrador",
        )

        response = self.client.get(f"/api/contratos/{self.contrato.id}/historial/?solo_cliente=false")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        detalles = [evento["detalle"] for evento in response.data]
        self.assertTrue(
            any("volvio a borrador" in detalle.lower() for detalle in detalles)
        )


class ContratoLicenciaHistorialTest(ContratoAPITestBase):
    def setUp(self):
        super().setUp()
        self.contrato.tipo = "licencia"
        self.contrato.save()
        self.contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia,
            cantidad=2,
            estado="activa",
        )

    def test_historial_licencia_incluye_eventos_de_vinculacion(self):
        vinculo = UsuarioVinculadoLicencia.objects.create(
            licencia=self.contrato_licencia,
            usuario=self.usuario_empresa,
        )
        vinculo.delete()

        response = self.client.get(
            f"/api/contrato-licencias/{self.contrato_licencia.id}/historial/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            any(item["origen"] == "licencia" for item in response.data)
        )
        self.assertTrue(
            any(
                item["origen"] == "vinculo_usuario"
                and item["tipo"] == "Usuario vinculado"
                for item in response.data
            )
        )
        self.assertTrue(
            any(
                item["origen"] == "vinculo_usuario"
                and item["tipo"] == "Usuario desvinculado"
                for item in response.data
            )
        )


class ContratoLicenciaReglasViewTest(ContratoAPITestBase):
    def setUp(self):
        super().setUp()
        self.contrato.tipo = "licencia"
        self.contrato.estado = "activo"
        self.contrato.save()

    def test_cancelar_licencia_fuera_de_ventana_falla(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia,
            cantidad=2,
            fecha_inicio=date.today() - timedelta(days=40),
            estado="activa",
        )

        response = self.client.post(
            f"/api/contrato-licencias/{contrato_licencia.id}/cambiar-estado/",
            {"estado": "cancelada"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancelar_licencia_dentro_de_ventana_se_permite(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia,
            cantidad=2,
            fecha_inicio=date.today(),
            estado="activa",
        )

        response = self.client.post(
            f"/api/contrato-licencias/{contrato_licencia.id}/cambiar-estado/",
            {"estado": "cancelada"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contrato_licencia.refresh_from_db()
        self.assertEqual(contrato_licencia.estado, "cancelada")

    def test_desvincular_usuario_fuera_de_ventana_falla(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia,
            cantidad=2,
            fecha_inicio=date.today() - timedelta(days=40),
            estado="activa",
        )
        vinculo = UsuarioVinculadoLicencia.objects.create(
            licencia=contrato_licencia,
            usuario=self.usuario_empresa,
        )

        response = self.client.delete(
            f"/api/contrato-licencias/{contrato_licencia.id}/usuarios-vinculados/{vinculo.id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_actualizar_contrato_permite_aumentar_cupos_fuera_de_ventana(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia,
            cantidad=2,
            fecha_inicio=date.today() - timedelta(days=40),
            estado="activa",
        )

        response = self.client.put(
            f"/api/contratos/{self.contrato.id}/actualizar/",
            {
                "contrato": {"nombre": self.contrato.nombre},
                "visitas": [],
                "eliminar_visitas": [],
                "licencias": [
                    {
                        "id": contrato_licencia.id,
                        "cantidad": 4,
                        "fecha_inicio": contrato_licencia.fecha_inicio.isoformat(),
                        "fecha_fin": contrato_licencia.fecha_fin,
                    }
                ],
                "eliminar_licencias": [],
                "condiciones_especiales": [],
                "eliminar_condiciones": [],
                "usuarios_vinculados": [],
                "eliminar_usuarios": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contrato_licencia.refresh_from_db()
        self.assertEqual(contrato_licencia.cantidad, 4)

    def test_actualizar_contrato_bloquea_reducir_cupos_fuera_de_ventana(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia,
            cantidad=3,
            fecha_inicio=date.today() - timedelta(days=40),
            estado="activa",
        )

        response = self.client.put(
            f"/api/contratos/{self.contrato.id}/actualizar/",
            {
                "contrato": {"nombre": self.contrato.nombre},
                "visitas": [],
                "eliminar_visitas": [],
                "licencias": [
                    {
                        "id": contrato_licencia.id,
                        "cantidad": 2,
                        "fecha_inicio": contrato_licencia.fecha_inicio.isoformat(),
                        "fecha_fin": contrato_licencia.fecha_fin,
                    }
                ],
                "eliminar_licencias": [],
                "condiciones_especiales": [],
                "eliminar_condiciones": [],
                "usuarios_vinculados": [],
                "eliminar_usuarios": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_licencia_permite_aumentar_cupos_fuera_de_ventana(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia,
            cantidad=3,
            fecha_inicio=date.today() - timedelta(days=40),
            estado="activa",
        )

        response = self.client.patch(
            f"/api/contrato-licencias/{contrato_licencia.id}/",
            {"cantidad": 5},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contrato_licencia.refresh_from_db()
        self.assertEqual(contrato_licencia.cantidad, 5)

    def test_patch_licencia_bloquea_reducir_cupos_fuera_de_ventana(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia,
            cantidad=3,
            fecha_inicio=date.today() - timedelta(days=40),
            estado="activa",
        )

        response = self.client.patch(
            f"/api/contrato-licencias/{contrato_licencia.id}/",
            {"cantidad": 2},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_licencia_dentro_de_ventana_permite_disminuir(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia,
            cantidad=3,
            fecha_inicio=date.today(),
            estado="activa",
        )

        response = self.client.patch(
            f"/api/contrato-licencias/{contrato_licencia.id}/",
            {"cantidad": 2},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contrato_licencia.refresh_from_db()
        self.assertEqual(contrato_licencia.cantidad, 2)

    def test_patch_licencia_rechaza_campos_distintos_a_cantidad(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia,
            cantidad=3,
            fecha_inicio=date.today(),
            estado="activa",
        )

        response = self.client.patch(
            f"/api/contrato-licencias/{contrato_licencia.id}/",
            {"cantidad": 4, "precio_unitario": "100"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_crear_vinculo_por_correo_persona(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia,
            cantidad=3,
            fecha_inicio=date.today(),
            estado="activa",
        )
        persona, _ = PersonaLicenciataria.sincronizar_desde_usuario_empresa(
            self.usuario_empresa,
            empresa=self.contrato.empresa_cliente,
        )
        correo = CorreoPersonaLicenciataria.obtener_o_crear_para_persona(
            persona=persona,
            correo="test+alt@prestadora.com",
            es_principal=False,
            es_corporativo=True,
        )

        response = self.client.post(
            f"/api/contrato-licencias/{contrato_licencia.id}/usuarios-vinculados/",
            {"licencia": contrato_licencia.id, "correo_persona": correo.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["correo_display"], "test+alt@prestadora.com")

    def test_correos_disponibles_retorna_correos_canonicos(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia,
            cantidad=3,
            fecha_inicio=date.today(),
            estado="activa",
        )

        response = self.client.get(
            f"/api/contrato-licencias/{contrato_licencia.id}/usuarios-vinculados/empresa/{self.empresa_prestadora.id}/correos-disponibles/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item["correo"] == "test@prestadora.com" for item in response.data))

    def test_crear_vinculo_externo_por_correo(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia,
            cantidad=3,
            fecha_inicio=date.today(),
            estado="activa",
        )

        response = self.client.post(
            f"/api/contrato-licencias/{contrato_licencia.id}/usuarios-vinculados/",
            {
                "licencia": contrato_licencia.id,
                "nombre": "Externo Cliente",
                "correo_generico": "externo@cliente.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["correo_display"], "externo@cliente.com")


class MetricasDashboardTest(ContratoAPITestBase):
    """Tests para la acción metricas-dashboard."""

    def test_metricas_dashboard_retorna_estructura_correcta(self):
        response = self.client.get("/api/contratos/metricas-dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("resumen", response.data)
        self.assertIn("por_estado", response.data)
        self.assertIn("contratos_por_vencer", response.data)
        self.assertIn("licencias_por_vencer", response.data)
        self.assertIn("top_clientes", response.data)

    def test_metricas_resumen_campos(self):
        response = self.client.get("/api/contratos/metricas-dashboard/")
        resumen = response.data["resumen"]
        self.assertIn("total_contratos", resumen)
        self.assertIn("contratos_activos", resumen)
        self.assertIn("contratos_vencidos", resumen)
        self.assertIn("firmas_pendientes", resumen)


class SeparacionFlujosLicenciaServiciosTest(ContratoAPITestBase):
    """
    FASE 2 — Tests de separacion de flujos: contratos licencia vs servicios.

    Verifica que las guardias de tipo impiden mezclar items de flujos distintos
    tanto a nivel de API (B1) como a nivel de modelo (A2, A3).
    """

    def _crear_contrato_licencia(self):
        return ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            fecha_fin=date.today() + timedelta(days=365),
            nombre="Contrato Licencia Test",
            estado="borrador",
            tipo="licencia",
        )

    def test_crear_licencia_en_contrato_servicios_retorna_400(self):
        """B1: POST de ContratoLicencia en contrato tipo=servicios debe retornar 400."""
        response = self.client.post(
            f"/api/contratos/{self.contrato.id}/licencias/",
            {"licencia": self.licencia.id, "cantidad": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_crear_licencia_en_contrato_licencia_retorna_201(self):
        """B1: POST de ContratoLicencia en contrato tipo=licencia debe retornar 201."""
        contrato_lic = self._crear_contrato_licencia()
        response = self.client.post(
            f"/api/contratos/{contrato_lic.id}/licencias/",
            {"licencia": self.licencia.id, "cantidad": 2},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_contrato_licencia_clean_rechaza_contrato_tipo_servicios(self):
        """A2: ContratoLicencia.clean() debe lanzar ValidationError si contrato.tipo != licencia."""
        from django.core.exceptions import ValidationError as DjangoValidationError

        cl = ContratoLicencia(
            contrato=self.contrato,  # tipo=servicios
            licencia=self.licencia,
            cantidad=1,
        )
        with self.assertRaises(DjangoValidationError):
            cl.clean()

    def test_item_servicio_en_contrato_licencia_lanza_validation_error(self):
        """A3: ContratoItemComercial.clean() debe rechazar tipo_origen=servicio en contrato tipo=licencia."""
        from django.core.exceptions import ValidationError as DjangoValidationError

        contrato_lic = self._crear_contrato_licencia()
        item = ContratoItemComercial(
            contrato=contrato_lic,
            tipo_origen="servicio",
        )
        with self.assertRaises(DjangoValidationError):
            item.clean()


class SnapshotTasasCambioTest(ContratoAPITestBase):
    """
    Tests de congelamiento de tasas y totales al enviar a aprobacion.

    Verifica que snapshot_tasa_uf, snapshot_tasa_dolar y snapshot_total_servicios
    se guardan correctamente al llamar enviar-aprobacion en contratos de tipo
    servicios, y que el serializer usa esos valores congelados en estados
    post-borrador.
    """

    def _preparar_contrato_servicios_uf(self):
        """Crea un contrato tipo=servicios con un item en UF, secciones y destinatario."""
        # Usar CLP como moneda de cobro para simplificar la conversion: UF*tasa → CLP
        self.contrato.moneda_cobro = "CLP"
        self.contrato.save(update_fields=["moneda_cobro", "fecha_modificacion"])

        servicio = Servicio.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            nombre="Servicio UF",
            precio=2,
            tipo_moneda="UF",
        )
        # total_mensual = precio * cantidad (2 UF); se establece manualmente porque
        # recalcular_totales() no se llama automaticamente en create().
        ContratoItemComercial.objects.create(
            contrato=self.contrato,
            tipo_origen="servicio",
            servicio_version=servicio,
            snapshot_nombre="Servicio UF",
            cantidad=1,
            forma_pago="mensual",
            moneda="UF",
            precio_unitario_contratado=2,
            total_mensual=2,
        )
        SeccionContratoGenerada.objects.create(
            contrato=self.contrato,
            titulo="Seccion generada",
            contenido_renderizado="Contenido",
            orden=1,
        )
        user_destinatario = User.objects.create_user(
            email="destinatario@cliente.com",
            password="testpass123",
            first_name="Dest",
            last_name="Test",
        )
        usuario_destinatario = UsuarioEmpresa.objects.create(
            usuario=user_destinatario,
            sucursal=self.sucursal_cliente,
        )
        UsuarioVinculadoContrato.objects.create(
            usuario=usuario_destinatario,
            contrato=self.contrato,
            es_destinatario_principal=True,
        )

    @patch("contratos.flow_helpers.send_email_task.delay")
    @patch("contratos.currency_utils.obtener_tipos_cambio_actuales")
    def test_enviar_aprobacion_servicios_uf_guarda_snapshot_tasa_y_total(self, mock_tasas, mock_email):
        """
        Al enviar a aprobacion un contrato tipo=servicios con item en UF,
        se deben guardar snapshot_tasa_uf y snapshot_total_servicios.
        El total congelado debe ser 2 UF * 38000 CLP/UF = 76000 CLP.
        """
        self._preparar_contrato_servicios_uf()
        uf_fijo = 38000
        mock_tasas.return_value = (None, uf_fijo)

        response = self.client.post(
            f"/api/contratos/{self.contrato.id}/enviar-aprobacion/"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.contrato.refresh_from_db()
        self.assertEqual(self.contrato.snapshot_tasa_uf, uf_fijo)
        self.assertIsNotNone(self.contrato.snapshot_total_servicios)
        # 2 UF * 38000 CLP/UF = 76000 CLP
        self.assertAlmostEqual(float(self.contrato.snapshot_total_servicios), 76000.0, places=1)

    @patch("contratos.flow_helpers.send_email_task.delay")
    @patch("contratos.currency_utils.obtener_tipos_cambio_actuales")
    def test_serializer_usa_snapshot_en_estado_no_editable(self, mock_tasas, mock_email):
        """
        En estado en_aprobacion_cliente, el serializer debe devolver el total
        congelado (snapshot_total_servicios), no recalcular con la tasa actual.
        """
        self._preparar_contrato_servicios_uf()
        mock_tasas.return_value = (None, 38000)

        self.client.post(f"/api/contratos/{self.contrato.id}/enviar-aprobacion/")
        self.contrato.refresh_from_db()
        self.assertEqual(self.contrato.estado, "en_aprobacion_cliente")

        # Simular que la tasa cambio: el serializer debe ignorar la nueva tasa
        mock_tasas.return_value = (None, 50000)
        serializer = ContratoEmpresaClienteSerializer(self.contrato)
        total = serializer.data["total_contrato"]

        # Debe seguir siendo 76000 (congelado), no 100000 (2 UF * 50000)
        self.assertAlmostEqual(total, 76000.0, places=1)

    @patch("contratos.currency_utils.obtener_tipos_cambio_actuales")
    def test_serializer_recalcula_en_estado_borrador(self, mock_tasas):
        """
        En estado borrador, el serializer debe calcular dinamicamente con
        la tasa actual, ignorando snapshots.
        """
        self._preparar_contrato_servicios_uf()
        self.contrato.snapshot_total_servicios = 76000
        self.contrato.snapshot_tasa_uf = 38000
        self.contrato.save(
            update_fields=["snapshot_total_servicios", "snapshot_tasa_uf", "fecha_modificacion"]
        )
        self.assertEqual(self.contrato.estado, "borrador")

        mock_tasas.return_value = (None, 50000)
        serializer = ContratoEmpresaClienteSerializer(self.contrato)
        total = serializer.data["total_contrato"]

        # En borrador debe recalcular: 2 UF * 50000 = 100000
        self.assertAlmostEqual(total, 100000.0, places=1)

    @patch("contratos.flow_helpers.send_email_task.delay")
    @patch("contratos.currency_utils.obtener_tipos_cambio_actuales")
    def test_snapshot_tasa_dolar_se_guarda_si_esta_disponible(self, mock_tasas, mock_email):
        """
        Si obtener_tipos_cambio_actuales retorna un valor para dolar,
        debe guardarse en snapshot_tasa_dolar.
        """
        self._preparar_contrato_servicios_uf()
        dolar_fijo = 950
        mock_tasas.return_value = (dolar_fijo, 38000)

        response = self.client.post(
            f"/api/contratos/{self.contrato.id}/enviar-aprobacion/"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.contrato.refresh_from_db()
        self.assertEqual(self.contrato.snapshot_tasa_dolar, dolar_fijo)
