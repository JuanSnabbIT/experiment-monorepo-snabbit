import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError, transaction
from django.test import TransactionTestCase
from rest_framework.test import APIClient

from bodegas.models import (
    Bodega,
    GuiaSalida,
    ItemEnOrdenCompra,
    ItemOrdenCompraEnStock,
    ItemsGuiaSalida,
    OrdenCompra,
    SerieEvento,
    SerieItem,
    StockItemEnBodega,
)
from bodegas.servicios_stock_series import despachar_items_guia_de_guia, devolver_item_guia
from core.models import PersonalizacionUsuario
from empresas.models import Empresa, RelacionEmpresa, SucursalEmpresa, UsuarioEmpresa
from items.models import Categoria, ItemEmpresa, ProveedorEmpresa

User = get_user_model()


class StockCanonicoConstraintTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.empresa = Empresa.objects.create(
            nombre="Empresa Stock",
            rut_empresa="10101010-1",
            direccion_principal="Dir",
        )
        self.sucursal = SucursalEmpresa.objects.create(
            nombre="Sucursal Stock",
            empresa=self.empresa,
        )
        self.bodega_a = Bodega.objects.create(nombre="Bodega A", sucursal=self.sucursal)
        self.bodega_b = Bodega.objects.create(nombre="Bodega B", sucursal=self.sucursal)
        self.item = ItemEmpresa.objects.create(
            nombre="Item canonico",
            categoria=Categoria.objects.create(nombre="Categoria canonica"),
            empresa=self.empresa,
        )

    def test_permite_mismo_item_en_dos_bodegas(self):
        a = StockItemEnBodega.objects.create(bodega=self.bodega_a, item=self.item, cantidad=5)
        b = StockItemEnBodega.objects.create(bodega=self.bodega_b, item=self.item, cantidad=7)
        self.assertIsNotNone(a.pk)
        self.assertIsNotNone(b.pk)

    def test_restringe_duplicado_misma_bodega_item(self):
        StockItemEnBodega.objects.create(bodega=self.bodega_a, item=self.item, cantidad=1)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                StockItemEnBodega.objects.create(
                    bodega=self.bodega_a,
                    item=self.item,
                    cantidad=2,
                )


class GuiaTenancyAndSeriesLifecycleTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.client = APIClient()

        # Tenant A
        self.empresa_a = Empresa.objects.create(
            nombre="Empresa A",
            rut_empresa="11111111-1",
            direccion_principal="Dir A",
        )
        self.sucursal_a = SucursalEmpresa.objects.create(
            nombre="Sucursal A",
            empresa=self.empresa_a,
        )
        self.user_a = User.objects.create_user(email="a@test.com", password="test1234")
        self.usuario_empresa_a = UsuarioEmpresa.objects.create(
            usuario=self.user_a,
            sucursal=self.sucursal_a,
        )
        # Reutiliza el grupo 'superadmin' (sembrado por migracion, ya existe de forma
        # estable) en vez de crear uno nuevo: TransactionTestCase + reset_sequences
        # no garantiza el flush de auth_group entre metodos, y un Group.objects
        # .get_or_create("bodega") nuevo puede chocar de PK con filas sembradas.
        grupo_superadmin, _ = Group.objects.get_or_create(name="superadmin")
        self.usuario_empresa_a.grupos.add(grupo_superadmin)
        PersonalizacionUsuario.objects.update_or_create(
            usuario=self.user_a,
            defaults={"sucursal_principal": self.sucursal_a},
        )

        # Tenant B
        self.empresa_b = Empresa.objects.create(
            nombre="Empresa B",
            rut_empresa="22222222-2",
            direccion_principal="Dir B",
        )
        self.sucursal_b = SucursalEmpresa.objects.create(
            nombre="Sucursal B",
            empresa=self.empresa_b,
        )
        self.user_b = User.objects.create_user(email="b@test.com", password="test1234")
        self.usuario_empresa_b = UsuarioEmpresa.objects.create(
            usuario=self.user_b,
            sucursal=self.sucursal_b,
        )
        PersonalizacionUsuario.objects.update_or_create(
            usuario=self.user_b,
            defaults={"sucursal_principal": self.sucursal_b},
        )

        self.bodega_a = Bodega.objects.create(nombre="Bodega A", sucursal=self.sucursal_a)
        self.bodega_b = Bodega.objects.create(nombre="Bodega B", sucursal=self.sucursal_b)
        self.categoria = Categoria.objects.create(nombre="Categoria general")
        self.item_a = ItemEmpresa.objects.create(
            nombre="Item A",
            categoria=self.categoria,
            empresa=self.empresa_a,
        )
        self.proveedor_a = ProveedorEmpresa.objects.create(
            nombre="Proveedor A",
            rut="76543210-1",
            empresa=self.empresa_a,
        )
        self.item_b = ItemEmpresa.objects.create(
            nombre="Item B",
            categoria=self.categoria,
            empresa=self.empresa_b,
        )
        self.stock_a = StockItemEnBodega.objects.create(
            bodega=self.bodega_a,
            item=self.item_a,
            cantidad=10,
            cantidad_no_disponible=0,
        )
        self.stock_b = StockItemEnBodega.objects.create(
            bodega=self.bodega_b,
            item=self.item_b,
            cantidad=10,
            cantidad_no_disponible=0,
        )

        self.cliente_a = Empresa.objects.create(
            nombre="Cliente A",
            rut_empresa="33333333-3",
            direccion_principal="Dir C",
        )
        RelacionEmpresa.objects.create(
            prestador_servicios=self.empresa_a,
            cliente=self.cliente_a,
        )
        self.guia_a = GuiaSalida.objects.create(
            bodega=self.bodega_a,
            cliente=self.cliente_a,
            creado_por=self.usuario_empresa_a,
            estado="P",
        )

        self.guia_b = GuiaSalida.objects.create(
            bodega=self.bodega_b,
            cliente=self.empresa_b,
            creado_por=self.usuario_empresa_b,
            estado="P",
        )

    def test_get_guia_cross_tenant_retorna_404(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(f"/api/guia-salida/{self.guia_b.id}/")
        self.assertEqual(response.status_code, 404)

    def test_agregar_item_cross_tenant_stock_retorna_404(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(
            f"/api/guia-salida/{self.guia_a.id}/agregar-item/",
            data=json.dumps({"stock_item_id": self.stock_b.id, "cantidad_rebajada": 1}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)

    def test_filtrar_por_cliente_no_filtra_fuera_del_tenant(self):
        item_b = ItemsGuiaSalida.objects.create(
            guia=self.guia_b,
            stock_item=self.stock_b,
            cantidad_original=1,
            cantidad_rebajada=1,
        )
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(
            f"/api/items-guia/filtrar-por-cliente/?cliente_id={self.guia_b.cliente_id}"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])
        self.assertTrue(ItemsGuiaSalida.objects.filter(pk=item_b.id).exists())

    def test_ciclo_serie_reservada_despachada_devuelta_genera_bitacora(self):
        self.client.force_authenticate(user=self.user_a)
        item_guia = ItemsGuiaSalida.objects.create(
            guia=self.guia_a,
            stock_item=self.stock_a,
            cantidad_original=10,
            cantidad_rebajada=1,
            individualizado=True,
            numero_serie={"serie": "SER-LIFE-001", "modelo": "itemsguiasalida", "object_id": 0},
        )
        item_guia.numero_serie["object_id"] = item_guia.id
        item_guia.save(update_fields=["numero_serie"])

        self.stock_a.cantidad = 9
        self.stock_a.cantidad_no_disponible = 1
        self.stock_a.save(update_fields=["cantidad", "cantidad_no_disponible"])

        orden = OrdenCompra.objects.create(
            codigo="OC-LIFE",
            oc_empresa=self.empresa_a,
            oc_cliente=self.cliente_a,
            proveedor=self.proveedor_a,
            creado_por=self.usuario_empresa_a,
            estado="3",
            fecha_compra="2026-04-21",
        )
        item_oc = ItemEnOrdenCompra.objects.create(
            orden_compra=orden,
            item=self.item_a,
            cantidad=1,
            precio=1000,
        )
        ioc = ItemOrdenCompraEnStock.objects.create(
            content_type=ContentType.objects.get_for_model(ItemEnOrdenCompra),
            item_oc_id=item_oc.id,
            stock_item=self.stock_a,
            cantidad=1,
            numeros_serie={"numeros_serie": [{"serie": "SER-LIFE-001", "modelo": "", "object_id": 0}]},
        )
        SerieItem.objects.create(
            serie="SER-LIFE-001",
            stock_item=self.stock_a,
            item_orden_compra_en_stock=ioc,
            item_guia_salida=item_guia,
            empresa=self.empresa_a,
            estado="reservada",
        )

        despachar_items_guia_de_guia(guia=self.guia_a, usuario=self.usuario_empresa_a)
        serie = SerieItem.objects.get(serie="SER-LIFE-001", empresa=self.empresa_a)
        self.assertEqual(serie.estado, "despachada")

        devolver_item_guia(
            item_guia=item_guia,
            cantidad=1,
            usuario=self.usuario_empresa_a,
            causa="Test devolucion",
        )
        serie.refresh_from_db()
        self.assertEqual(serie.estado, "devuelta")
        self.assertTrue(
            SerieEvento.objects.filter(
                serie="SER-LIFE-001",
                tipo_evento__in=("DESPACHO", "DEVOLUCION"),
            ).exists()
        )
