from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from bodegas.models import Bodega, SerieItem, StockItemEnBodega
from core.models import PersonalizacionUsuario
from empresas.models import Empresa, RelacionEmpresa, SucursalEmpresa, UsuarioEmpresa
from items.models import ItemEmpresa
from ordentrabajov3.models import OrdenDeTrabajoV3, TareaOTV3
from recursos.models import Equipo, UsuarioEquipo

User = get_user_model()


class UsuarioEquipoDetalleFlowAPITest(APITestCase):
    def setUp(self):
        self.empresa_prestadora = Empresa.objects.create(
            nombre="Prestadora QA",
            direccion_principal="Direccion prestadora",
        )
        self.empresa_cliente = Empresa.objects.create(
            nombre="Cliente QA",
            direccion_principal="Direccion cliente",
        )
        self.empresa_externa = Empresa.objects.create(
            nombre="Externa QA",
            direccion_principal="Direccion externa",
        )

        RelacionEmpresa.objects.create(
            prestador_servicios=self.empresa_prestadora,
            cliente=self.empresa_cliente,
        )

        self.sucursal_prestadora = SucursalEmpresa.objects.create(
            nombre="Sucursal Prestadora",
            empresa=self.empresa_prestadora,
        )
        self.sucursal_cliente = SucursalEmpresa.objects.create(
            nombre="Sucursal Cliente",
            empresa=self.empresa_cliente,
        )
        self.sucursal_cliente_secundaria = SucursalEmpresa.objects.create(
            nombre="Sucursal Cliente Secundaria",
            empresa=self.empresa_cliente,
        )
        self.sucursal_externa = SucursalEmpresa.objects.create(
            nombre="Sucursal Externa",
            empresa=self.empresa_externa,
        )

        self.user_prestadora = User.objects.create_user(
            email="prestadora@test.com",
            password="testpass123",
            first_name="Prestadora",
            last_name="User",
        )
        self.usuario_empresa_prestadora = UsuarioEmpresa.objects.create(
            usuario=self.user_prestadora,
            sucursal=self.sucursal_prestadora,
        )
        personalizacion_prestadora = PersonalizacionUsuario.objects.get(
            usuario=self.user_prestadora
        )
        personalizacion_prestadora.sucursal_principal = self.sucursal_prestadora
        personalizacion_prestadora.save()

        self.user_cliente = User.objects.create_user(
            email="cliente-user@test.com",
            password="testpass123",
            first_name="Cliente",
            last_name="User",
        )
        self.usuario_empresa_cliente = UsuarioEmpresa.objects.create(
            usuario=self.user_cliente,
            sucursal=self.sucursal_cliente,
        )
        personalizacion_cliente = PersonalizacionUsuario.objects.get(
            usuario=self.user_cliente
        )
        personalizacion_cliente.sucursal_principal = self.sucursal_cliente
        personalizacion_cliente.save()

        self.user_externo = User.objects.create_user(
            email="externo@test.com",
            password="testpass123",
            first_name="Externo",
            last_name="User",
        )
        self.usuario_empresa_externo = UsuarioEmpresa.objects.create(
            usuario=self.user_externo,
            sucursal=self.sucursal_externa,
        )
        personalizacion_externo = PersonalizacionUsuario.objects.get(
            usuario=self.user_externo
        )
        personalizacion_externo.sucursal_principal = self.sucursal_externa
        personalizacion_externo.save()

        self.bodega_cliente = Bodega.objects.create(
            nombre="Bodega Cliente",
            sucursal=self.sucursal_cliente,
        )
        self.bodega_cliente_secundaria = Bodega.objects.create(
            nombre="Bodega Cliente Secundaria",
            sucursal=self.sucursal_cliente_secundaria,
        )

        self.equipo = Equipo.objects.create(
            cliente=self.empresa_cliente,
            empresa_propietaria=self.empresa_prestadora,
            registrado_por=self.usuario_empresa_prestadora,
            numero_serie="SN-DET-001",
        )
        self.usuario_equipo = UsuarioEquipo.objects.create(
            equipo=self.equipo,
            usuario=self.usuario_empresa_cliente,
            estado=True,
        )

        self.url_desvincular = (
            f"/api/usuarios-equipo/{self.usuario_equipo.id}/desvincular-desde-detalle/"
        )
        self.url_listado = (
            f"/api/usuarios-equipo/por-usuario-empresa/{self.usuario_empresa_cliente.id}/"
        )
        self.client.force_authenticate(user=self.user_prestadora)

    def _crear_traza(self, bodega):
        item = ItemEmpresa.objects.create(
            nombre="Notebook QA",
            empresa=self.empresa_cliente,
            es_equipo=True,
        )
        stock = StockItemEnBodega.objects.create(
            bodega=bodega,
            item=item,
            cantidad=0,
            cantidad_no_disponible=0,
        )
        serie = SerieItem.objects.create(
            serie=self.equipo.numero_serie,
            stock_item=stock,
            empresa=self.empresa_cliente,
            estado="despachada",
        )
        return item, stock, serie

    def test_desvincular_exito_con_traza_valida(self):
        _item, stock, serie = self._crear_traza(self.bodega_cliente)

        response = self.client.post(
            self.url_desvincular,
            {"bodega_destino_id": self.bodega_cliente.id, "motivo": "Devolucion por recambio"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.usuario_equipo.refresh_from_db()
        stock.refresh_from_db()
        serie.refresh_from_db()

        self.assertFalse(self.usuario_equipo.estado)
        self.assertIsNotNone(self.usuario_equipo.fecha_devolucion)
        self.assertIn("Devolucion por recambio", self.usuario_equipo.observaciones)
        self.assertEqual(stock.cantidad, 1)
        self.assertEqual(serie.estado, "devuelta")
        self.assertEqual(response.data["ingreso_bodega"]["bodega_id"], self.bodega_cliente.id)

    def test_desvincular_bloquea_traza_en_bodega_distinta(self):
        _item, stock, _serie = self._crear_traza(self.bodega_cliente_secundaria)

        response = self.client.post(
            self.url_desvincular,
            {"bodega_destino_id": self.bodega_cliente.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("bodega distinta", response.data["detail"])
        self.usuario_equipo.refresh_from_db()
        stock.refresh_from_db()

        self.assertTrue(self.usuario_equipo.estado)
        self.assertIsNone(self.usuario_equipo.fecha_devolucion)
        self.assertEqual(stock.cantidad, 0)

    def test_desvincular_exito_autocreacion_si_no_hay_traza(self):
        self.assertFalse(
            SerieItem.objects.filter(
                serie=self.equipo.numero_serie,
                empresa=self.empresa_cliente,
            ).exists()
        )

        response = self.client.post(
            self.url_desvincular,
            {"bodega_destino_id": self.bodega_cliente.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["ingreso_bodega"]["autocreado"])

        self.usuario_equipo.refresh_from_db()
        self.assertFalse(self.usuario_equipo.estado)

        serie = SerieItem.objects.get(
            serie=self.equipo.numero_serie,
            empresa=self.empresa_cliente,
        )
        self.assertEqual(serie.stock_item.bodega_id, self.bodega_cliente.id)
        self.assertEqual(serie.stock_item.cantidad, 1)
        self.assertTrue(serie.stock_item.item.es_equipo)

    def test_desvincular_rechaza_vinculo_inactivo(self):
        self.usuario_equipo.estado = False
        self.usuario_equipo.save(update_fields=["estado"])

        response = self.client.post(
            self.url_desvincular,
            {"bodega_destino_id": self.bodega_cliente.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("inactivo", response.data["detail"])

    def test_desvincular_rechaza_acceso_fuera_de_tenant(self):
        self.client.force_authenticate(user=self.user_externo)

        response = self.client.post(
            self.url_desvincular,
            {"bodega_destino_id": self.bodega_cliente.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_listado_por_usuario_empresa_aplica_multi_tenant(self):
        self.client.force_authenticate(user=self.user_externo)
        response_forbidden = self.client.get(self.url_listado)
        self.assertEqual(response_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.user_prestadora)
        response_ok = self.client.get(self.url_listado)
        self.assertEqual(response_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_ok.data), 1)
        self.assertEqual(response_ok.data[0]["id"], self.usuario_equipo.id)
        self.assertIn("datos_equipo", response_ok.data[0])

    def test_listado_por_usuario_empresa_incluye_origen_otv3(self):
        orden = OrdenDeTrabajoV3.objects.create(
            empresa=self.empresa_prestadora,
            cliente=self.empresa_cliente,
            titulo="OT QA Origen",
        )
        tarea = TareaOTV3.objects.create(
            orden=orden,
            titulo="Entrega equipo OT",
            usuario_receptor=self.usuario_empresa_cliente,
            tipo_tarea="entrega_equipo",
        )
        self.usuario_equipo.tarea_otv3 = tarea
        self.usuario_equipo.save(update_fields=["tarea_otv3"])

        response = self.client.get(self.url_listado)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["tarea_otv3"]["id"], tarea.id)
        self.assertEqual(response.data[0]["tarea_otv3"]["titulo"], tarea.titulo)
        self.assertEqual(response.data[0]["tarea_otv3"]["orden_id"], orden.id)
