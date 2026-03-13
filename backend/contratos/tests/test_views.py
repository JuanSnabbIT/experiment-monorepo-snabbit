import uuid
from datetime import date, timedelta

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from cuentas.models import User
from core.models import PersonalizacionUsuario
from contratos.models import (
    ContratoEmpresaCliente,
    ContratoVisita,
    ContratoLicencia,
    ContratoCondicionEspecial,
    UsuarioVinculadoLicencia,
    UsuarioVinculadoContrato,
    AcuerdoConfidencialidadContrato,
    EnvioContratoFirmaUsuario,
    Servicio,
    Visita,
    Licencia,
    CondicionEspecial,
)
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa


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

    def test_filtrar_por_empresa_cliente(self):
        response = self.client.get(
            f"/api/contratos/filtrar-por-empresa-cliente/"
            f"{self.empresa_prestadora.id}/{self.empresa_cliente.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)


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
                "firma": "data:image/png;base64,iVBOR...",
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
            tipo_modalidad="p1y-m",
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
            tipo_modalidad="p1y-m",
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
            tipo_modalidad="p1y-m",
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
            tipo_modalidad="p1y-m",
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
                        "tipo_modalidad": contrato_licencia.tipo_modalidad,
                        "precio_unitario": str(contrato_licencia.precio_unitario),
                        "fecha_inicio": contrato_licencia.fecha_inicio.isoformat(),
                        "fecha_fin": contrato_licencia.fecha_fin,
                        "tipo_moneda": contrato_licencia.tipo_moneda,
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
            tipo_modalidad="p1y-m",
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
                        "tipo_modalidad": contrato_licencia.tipo_modalidad,
                        "precio_unitario": str(contrato_licencia.precio_unitario),
                        "fecha_inicio": contrato_licencia.fecha_inicio.isoformat(),
                        "fecha_fin": contrato_licencia.fecha_fin,
                        "tipo_moneda": contrato_licencia.tipo_moneda,
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
            tipo_modalidad="p1y-m",
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
            tipo_modalidad="p1y-m",
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
            tipo_modalidad="p1y-m",
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
            tipo_modalidad="p1y-m",
            fecha_inicio=date.today(),
            estado="activa",
        )

        response = self.client.patch(
            f"/api/contrato-licencias/{contrato_licencia.id}/",
            {"cantidad": 4, "precio_unitario": "100"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


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
