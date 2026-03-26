import json

from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from rest_framework.test import APIClient

from bodegas.models import (
    Bodega,
    GuiaSalida,
    ItemEnOrdenCompra,
    ItemOrdenCompraEnStock,
    ItemsGuiaSalida,
    MovimientoStock,
    OrdenCompra,
    StockItemEnBodega,
)
from empresas.models import Empresa, SucursalEmpresa, RelacionEmpresa, UsuarioEmpresa
from items.models import ItemEmpresa, Categoria
from core.models import PersonalizacionUsuario

User = get_user_model()


class EliminarGuiaSalidaTestBase(TransactionTestCase):
    """Base para tests de eliminacion de GuiaSalida con stock y series."""

    def setUp(self):
        # --- Empresa prestador ---
        self.empresa = Empresa.objects.create(
            nombre="Empresa Test", rut_empresa="11111111-1", direccion_principal="Dir Test"
        )
        self.sucursal = SucursalEmpresa.objects.create(nombre="Sucursal Central", empresa=self.empresa)

        # --- Empresa cliente ---
        self.empresa_cliente = Empresa.objects.create(
            nombre="Cliente Test", rut_empresa="22222222-2", direccion_principal="Dir Cliente"
        )
        RelacionEmpresa.objects.create(prestador_servicios=self.empresa, cliente=self.empresa_cliente)

        # --- Usuario ---
        self.user = User.objects.create_user(email="test@test.com", password="test1234")
        self.usuario_empresa = UsuarioEmpresa.objects.create(
            usuario=self.user, sucursal=self.sucursal
        )
        pers = PersonalizacionUsuario.objects.filter(usuario=self.user).first()
        if pers:
            pers.sucursal_principal = self.sucursal
            pers.save()
        else:
            PersonalizacionUsuario.objects.create(
                usuario=self.user, sucursal_principal=self.sucursal
            )

        # --- Categoria e Item ---
        self.categoria = Categoria.objects.create(nombre="Cat Test")
        self.item_empresa = ItemEmpresa.objects.create(
            nombre="Item Test", categoria=self.categoria, empresa=self.empresa
        )

        # --- Bodega y Stock ---
        self.bodega = Bodega.objects.create(nombre="Bodega Central", sucursal=self.sucursal)
        self.stock = StockItemEnBodega.objects.create(
            bodega=self.bodega, item=self.item_empresa, cantidad=100, cantidad_no_disponible=0
        )

    def _crear_guia(self, estado="P"):
        return GuiaSalida.objects.create(
            bodega=self.bodega,
            cliente=self.empresa_cliente,
            creado_por=self.usuario_empresa,
            estado=estado,
        )

    def _agregar_item_no_serializado(self, guia, cantidad=5):
        """Simula lo que hace agregar_item: crea ItemsGuiaSalida + reserva stock."""
        from bodegas.movimientos import registrar_salida

        item_guia = ItemsGuiaSalida.objects.create(
            guia=guia,
            stock_item=self.stock,
            cantidad_original=self.stock.cantidad,
            cantidad_rebajada=cantidad,
            individualizado=False,
        )
        self.stock.cantidad_no_disponible += cantidad
        self.stock.save(update_fields=["cantidad_no_disponible"])
        registrar_salida(
            stock_item=self.stock,
            cantidad=cantidad,
            usuario=self.usuario_empresa,
            origen=item_guia,
            descripcion="Test: item agregado a guia",
        )
        self.stock.refresh_from_db()
        return item_guia

    def _agregar_item_serializado(self, guia, serie="SN-001"):
        """Simula agregar item individualizado con serie."""
        from bodegas.movimientos import registrar_salida
        from django.contrib.contenttypes.models import ContentType

        item_guia = ItemsGuiaSalida.objects.create(
            guia=guia,
            stock_item=self.stock,
            cantidad_original=self.stock.cantidad,
            cantidad_rebajada=1,
            individualizado=True,
            numero_serie={"serie": serie, "modelo": "itemsguiasalida", "object_id": 0},
        )
        # Actualizar object_id tras creacion
        item_guia.numero_serie["object_id"] = item_guia.id
        item_guia.save()

        # Crear ItemOrdenCompraEnStock con la serie
        ct = ContentType.objects.get_for_model(item_guia)
        self.oc_stock = ItemOrdenCompraEnStock.objects.create(
            content_type=ct,
            item_oc_id=item_guia.id,
            stock_item=self.stock,
            cantidad=1,
            numeros_serie={
                "numeros_serie": [
                    {"serie": serie, "modelo": "itemsguiasalida", "object_id": item_guia.id}
                ]
            },
        )

        # Crear SerieItem correspondiente (modelo relacional)
        from bodegas.models import SerieItem
        SerieItem.objects.create(
            serie=serie,
            stock_item=self.stock,
            item_orden_compra_en_stock=self.oc_stock,
            item_guia_salida=item_guia,
            empresa=self.empresa,
            estado="reservada",
        )

        self.stock.cantidad_no_disponible += 1
        self.stock.save(update_fields=["cantidad_no_disponible"])
        registrar_salida(
            stock_item=self.stock,
            cantidad=1,
            usuario=self.usuario_empresa,
            origen=item_guia,
            descripcion="Test: item serializado agregado a guia",
        )
        self.stock.refresh_from_db()
        return item_guia


class EliminarGuiaPendienteNoSerializadoTest(EliminarGuiaSalidaTestBase):
    """Caso 1: Guia Pendiente con items no serializados."""

    def test_eliminar_guia_pendiente_revierte_stock(self):
        guia = self._crear_guia(estado="P")
        guia_pk = guia.pk
        cantidad_antes = self.stock.cantidad
        self._agregar_item_no_serializado(guia, cantidad=5)
        self.stock.refresh_from_db()

        # Despues de agregar: cantidad baja 5, no_disponible sube 5
        self.assertEqual(self.stock.cantidad, cantidad_antes - 5)
        self.assertEqual(self.stock.cantidad_no_disponible, 5)

        movimientos_antes = MovimientoStock.objects.count()

        # Eliminar guia
        guia.delete()

        self.stock.refresh_from_db()
        # Stock debe volver al valor original
        self.assertEqual(self.stock.cantidad, cantidad_antes)
        self.assertEqual(self.stock.cantidad_no_disponible, 0)
        # Debe haber un nuevo movimiento de devolucion
        self.assertGreater(MovimientoStock.objects.count(), movimientos_antes)
        # La guia no debe existir
        self.assertFalse(GuiaSalida.objects.filter(pk=guia_pk).exists())
        self.assertFalse(ItemsGuiaSalida.objects.filter(guia_id=guia_pk).exists())


class EliminarGuiaPendienteSerializadoTest(EliminarGuiaSalidaTestBase):
    """Caso 2: Guia Pendiente con items serializados."""

    def test_eliminar_guia_pendiente_libera_series(self):
        guia = self._crear_guia(estado="P")
        cantidad_antes = self.stock.cantidad
        item_guia = self._agregar_item_serializado(guia, serie="SN-TEST-001")

        self.stock.refresh_from_db()
        self.assertEqual(self.stock.cantidad, cantidad_antes - 1)
        self.assertEqual(self.stock.cantidad_no_disponible, 1)

        # Verificar serie ocupada antes de eliminar
        self.oc_stock.refresh_from_db()
        series = self.oc_stock.numeros_serie["numeros_serie"]
        self.assertEqual(series[0]["modelo"], "itemsguiasalida")
        self.assertNotEqual(series[0]["object_id"], 0)

        # Eliminar guia
        guia.delete()

        self.stock.refresh_from_db()
        self.assertEqual(self.stock.cantidad, cantidad_antes)
        self.assertEqual(self.stock.cantidad_no_disponible, 0)

        # Serie debe estar libre
        self.oc_stock.refresh_from_db()
        series = self.oc_stock.numeros_serie["numeros_serie"]
        self.assertEqual(series[0]["modelo"], "")
        self.assertEqual(series[0]["object_id"], 0)


class EliminarGuiaERVolverPendienteTest(EliminarGuiaSalidaTestBase):
    """Caso 3: Guia ER -> volver a pendiente -> eliminar."""

    def test_guia_er_volver_pendiente_y_eliminar(self):
        guia = self._crear_guia(estado="P")
        cantidad_antes = self.stock.cantidad
        self._agregar_item_no_serializado(guia, cantidad=3)

        # Simular que la guia paso a ER (comprobar_guia)
        guia.estado = "ER"
        guia.save()

        # Simular volver_pendiente
        guia.estado = "P"
        guia.save()

        self.stock.refresh_from_db()
        self.assertEqual(self.stock.cantidad, cantidad_antes - 3)
        self.assertEqual(self.stock.cantidad_no_disponible, 3)

        # Eliminar
        guia.delete()

        self.stock.refresh_from_db()
        self.assertEqual(self.stock.cantidad, cantidad_antes)
        self.assertEqual(self.stock.cantidad_no_disponible, 0)
        self.assertFalse(GuiaSalida.objects.filter(pk=guia.pk).exists())


class EliminarGuiaEstadoNoPermitidoTest(EliminarGuiaSalidaTestBase):
    """Caso 4: Intento de eliminar guia en estado no permitido (via API)."""

    def test_destroy_api_rechaza_estado_er(self):
        self.client.force_login(self.user)
        guia = self._crear_guia(estado="ER")
        self._agregar_item_no_serializado(guia, cantidad=2)
        cantidad_antes_delete = self.stock.cantidad

        response = self.client.delete(f"/api/guia-salida/{guia.pk}/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("No se puede eliminar", response.json()["detail"])

        # Stock no debe haber cambiado
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.cantidad, cantidad_antes_delete)
        # Guia sigue existiendo
        self.assertTrue(GuiaSalida.objects.filter(pk=guia.pk).exists())

    def test_destroy_api_rechaza_estado_et(self):
        self.client.force_login(self.user)
        guia = self._crear_guia(estado="ET")

        response = self.client.delete(f"/api/guia-salida/{guia.pk}/")
        self.assertEqual(response.status_code, 400)
        self.assertTrue(GuiaSalida.objects.filter(pk=guia.pk).exists())

    def test_destroy_api_permite_estado_pendiente(self):
        self.client.force_login(self.user)
        guia = self._crear_guia(estado="P")

        response = self.client.delete(f"/api/guia-salida/{guia.pk}/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(GuiaSalida.objects.filter(pk=guia.pk).exists())


# ---------------------------------------------------------------------------
# Tests para series.py (funciones centralizadas)
# ---------------------------------------------------------------------------

class SeriesFuncionesTest(TransactionTestCase):
    """Tests para las funciones centralizadas en bodegas/series.py."""

    def setUp(self):
        from django.contrib.contenttypes.models import ContentType

        self.empresa = Empresa.objects.create(
            nombre="Empresa Serie Test", rut_empresa="33333333-3", direccion_principal="Dir"
        )
        self.sucursal = SucursalEmpresa.objects.create(
            nombre="Sucursal Test", empresa=self.empresa
        )
        self.user = User.objects.create_user(email="serie@test.com", password="test1234")
        self.usuario_empresa = UsuarioEmpresa.objects.create(
            usuario=self.user, sucursal=self.sucursal
        )
        PersonalizacionUsuario.objects.get_or_create(
            usuario=self.user,
            defaults={"sucursal_principal": self.sucursal},
        )
        self.categoria = Categoria.objects.create(nombre="Cat Serie")
        self.item = ItemEmpresa.objects.create(
            nombre="Item Serie", categoria=self.categoria, empresa=self.empresa
        )
        self.bodega = Bodega.objects.create(nombre="Bodega Serie", sucursal=self.sucursal)
        self.stock = StockItemEnBodega.objects.create(
            bodega=self.bodega, item=self.item, cantidad=50, cantidad_no_disponible=0
        )
        # Crear ItemOrdenCompraEnStock base
        ct = ContentType.objects.get_for_model(StockItemEnBodega)
        self.oc_stock = ItemOrdenCompraEnStock.objects.create(
            content_type=ct,
            item_oc_id=self.stock.pk,
            stock_item=self.stock,
            cantidad=10,
            numeros_serie={"numeros_serie": []},
        )

    def test_agregar_serie_a_stock(self):
        from bodegas.series import agregar_serie_a_stock, serie_existe_en_stock
        from bodegas.models import SerieItem

        agregar_serie_a_stock(self.oc_stock, "SN-001")

        # Verifica modelo relacional
        self.assertTrue(SerieItem.objects.filter(serie="SN-001", empresa=self.empresa).exists())
        serie_obj = SerieItem.objects.get(serie="SN-001")
        self.assertEqual(serie_obj.estado, "disponible")
        self.assertEqual(serie_obj.stock_item, self.stock)

        # Verifica JSON legacy
        self.oc_stock.refresh_from_db()
        series = self.oc_stock.numeros_serie["numeros_serie"]
        self.assertEqual(len(series), 1)
        self.assertEqual(series[0]["serie"], "SN-001")

        # Verifica consulta
        self.assertTrue(serie_existe_en_stock(self.stock, "SN-001"))
        self.assertFalse(serie_existe_en_stock(self.stock, "SN-999"))

    def test_eliminar_serie_disponible(self):
        from bodegas.series import agregar_serie_a_stock, eliminar_serie_de_stock
        from bodegas.models import SerieItem

        agregar_serie_a_stock(self.oc_stock, "SN-DEL")
        ok, msg = eliminar_serie_de_stock(self.stock, "SN-DEL")
        self.assertTrue(ok)
        self.assertEqual(msg, "")
        self.assertFalse(SerieItem.objects.filter(serie="SN-DEL").exists())

        # JSON también debe estar vacío
        self.oc_stock.refresh_from_db()
        self.assertEqual(len(self.oc_stock.numeros_serie["numeros_serie"]), 0)

    def test_eliminar_serie_asignada_falla(self):
        from bodegas.series import agregar_serie_a_stock, eliminar_serie_de_stock
        from bodegas.models import SerieItem

        agregar_serie_a_stock(self.oc_stock, "SN-BUSY")
        serie_obj = SerieItem.objects.get(serie="SN-BUSY")
        serie_obj.estado = "reservada"
        serie_obj.save()

        ok, msg = eliminar_serie_de_stock(self.stock, "SN-BUSY")
        self.assertFalse(ok)
        self.assertIn("asignada", msg)
        self.assertTrue(SerieItem.objects.filter(serie="SN-BUSY").exists())

    def test_eliminar_serie_inexistente(self):
        from bodegas.series import eliminar_serie_de_stock

        ok, msg = eliminar_serie_de_stock(self.stock, "NO-EXISTE")
        self.assertFalse(ok)
        self.assertIn("no encontrada", msg)

    def test_reservar_y_liberar_serie(self):
        from bodegas.series import agregar_serie_a_stock, reservar_serie, liberar_serie
        from bodegas.models import SerieItem

        agregar_serie_a_stock(self.oc_stock, "SN-RES")

        # Crear un ItemsGuiaSalida para reservar
        self.empresa_cliente = Empresa.objects.create(
            nombre="Cliente Res", rut_empresa="44444444-4", direccion_principal="Dir"
        )
        guia = GuiaSalida.objects.create(
            bodega=self.bodega, cliente=self.empresa_cliente,
            creado_por=self.usuario_empresa, estado="P"
        )
        item_guia = ItemsGuiaSalida.objects.create(
            guia=guia, stock_item=self.stock,
            cantidad_original=50, cantidad_rebajada=1, individualizado=True,
        )

        # Reservar
        ok, msg = reservar_serie(self.stock, "SN-RES", item_guia.id)
        self.assertTrue(ok)

        serie_obj = SerieItem.objects.get(serie="SN-RES")
        self.assertEqual(serie_obj.estado, "reservada")
        self.assertEqual(serie_obj.item_guia_salida, item_guia)

        # JSON legacy debe reflejar reserva
        self.oc_stock.refresh_from_db()
        entry = self.oc_stock.numeros_serie["numeros_serie"][0]
        self.assertEqual(entry["modelo"], "itemsguiasalida")
        self.assertEqual(entry["object_id"], item_guia.id)

        # Liberar
        ok = liberar_serie(self.stock, "SN-RES", item_guia.id)
        self.assertTrue(ok)

        serie_obj.refresh_from_db()
        self.assertEqual(serie_obj.estado, "disponible")
        self.assertIsNone(serie_obj.item_guia_salida)

        # JSON legacy debe reflejar liberación
        self.oc_stock.refresh_from_db()
        entry = self.oc_stock.numeros_serie["numeros_serie"][0]
        self.assertEqual(entry["modelo"], "")
        self.assertEqual(entry["object_id"], 0)

    def test_liberar_series_por_item_guia(self):
        from bodegas.series import agregar_serie_a_stock, reservar_serie, liberar_series_por_item_guia
        from bodegas.models import SerieItem

        # Agregar dos series
        agregar_serie_a_stock(self.oc_stock, "SN-A")
        agregar_serie_a_stock(self.oc_stock, "SN-B")

        self.empresa_cliente = Empresa.objects.create(
            nombre="Cliente LIB", rut_empresa="55555555-5", direccion_principal="Dir"
        )
        guia = GuiaSalida.objects.create(
            bodega=self.bodega, cliente=self.empresa_cliente,
            creado_por=self.usuario_empresa, estado="P"
        )
        item_guia = ItemsGuiaSalida.objects.create(
            guia=guia, stock_item=self.stock,
            cantidad_original=50, cantidad_rebajada=1, individualizado=True,
        )

        # Reservar SN-A para item_guia
        reservar_serie(self.stock, "SN-A", item_guia.id)

        # Liberar por item_guia_id
        ok = liberar_series_por_item_guia(self.stock, item_guia.id)
        self.assertTrue(ok)

        serie_a = SerieItem.objects.get(serie="SN-A")
        self.assertEqual(serie_a.estado, "disponible")
        self.assertIsNone(serie_a.item_guia_salida)

        # SN-B no debe haber cambiado (sigue disponible)
        serie_b = SerieItem.objects.get(serie="SN-B")
        self.assertEqual(serie_b.estado, "disponible")

    def test_obtener_series_disponibles(self):
        from bodegas.series import agregar_serie_a_stock, obtener_series_disponibles
        from bodegas.models import SerieItem

        agregar_serie_a_stock(self.oc_stock, "SN-DISP-1")
        agregar_serie_a_stock(self.oc_stock, "SN-DISP-2")

        # Marcar una como reservada
        s = SerieItem.objects.get(serie="SN-DISP-1")
        s.estado = "reservada"
        s.save()

        disponibles = obtener_series_disponibles(self.stock)
        self.assertEqual(disponibles, ["SN-DISP-2"])

    def test_reservar_serie_ya_asignada_a_otro_falla(self):
        from bodegas.series import agregar_serie_a_stock, reservar_serie

        agregar_serie_a_stock(self.oc_stock, "SN-CONFLICT")

        self.empresa_cliente = Empresa.objects.create(
            nombre="Cliente CF", rut_empresa="66666666-6", direccion_principal="Dir"
        )
        guia = GuiaSalida.objects.create(
            bodega=self.bodega, cliente=self.empresa_cliente,
            creado_por=self.usuario_empresa, estado="P"
        )
        ig1 = ItemsGuiaSalida.objects.create(
            guia=guia, stock_item=self.stock,
            cantidad_original=50, cantidad_rebajada=1, individualizado=True,
        )
        ig2 = ItemsGuiaSalida.objects.create(
            guia=guia, stock_item=self.stock,
            cantidad_original=50, cantidad_rebajada=1, individualizado=True,
        )

        # Reservar para ig1
        ok, _ = reservar_serie(self.stock, "SN-CONFLICT", ig1.id)
        self.assertTrue(ok)

        # Intentar reservar para ig2 — debe fallar
        ok, msg = reservar_serie(self.stock, "SN-CONFLICT", ig2.id)
        self.assertFalse(ok)
        self.assertIn("asignada", msg)


# ---------------------------------------------------------------------------
# Tests para CheckConstraint individualizado
# ---------------------------------------------------------------------------

class CheckConstraintIndividualizadoTest(TransactionTestCase):
    """Verifica que el CheckConstraint impida individualizado=True con cantidad != 1."""

    def setUp(self):
        self.empresa = Empresa.objects.create(
            nombre="Empresa CK", rut_empresa="77777777-7", direccion_principal="Dir"
        )
        self.sucursal = SucursalEmpresa.objects.create(
            nombre="Sucursal CK", empresa=self.empresa
        )
        self.user = User.objects.create_user(email="ck@test.com", password="test1234")
        self.usuario = UsuarioEmpresa.objects.create(
            usuario=self.user, sucursal=self.sucursal
        )
        self.categoria = Categoria.objects.create(nombre="Cat CK")
        self.item = ItemEmpresa.objects.create(
            nombre="Item CK", categoria=self.categoria, empresa=self.empresa
        )
        self.bodega = Bodega.objects.create(nombre="Bodega CK", sucursal=self.sucursal)
        self.stock = StockItemEnBodega.objects.create(
            bodega=self.bodega, item=self.item, cantidad=100
        )
        self.empresa_cliente = Empresa.objects.create(
            nombre="Cliente CK", rut_empresa="88888888-8", direccion_principal="Dir"
        )
        self.guia = GuiaSalida.objects.create(
            bodega=self.bodega, cliente=self.empresa_cliente,
            creado_por=self.usuario, estado="P"
        )

    def test_individualizado_cantidad_1_ok(self):
        """individualizado=True con cantidad_rebajada=1 debe funcionar."""
        item = ItemsGuiaSalida.objects.create(
            guia=self.guia, stock_item=self.stock,
            cantidad_rebajada=1, individualizado=True,
        )
        self.assertIsNotNone(item.pk)

    def test_no_individualizado_cantidad_mayor_ok(self):
        """individualizado=False con cualquier cantidad debe funcionar."""
        item = ItemsGuiaSalida.objects.create(
            guia=self.guia, stock_item=self.stock,
            cantidad_rebajada=5, individualizado=False,
        )
        self.assertIsNotNone(item.pk)

    def test_individualizado_cantidad_mayor_falla(self):
        """individualizado=True con cantidad_rebajada > 1 debe fallar."""
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            ItemsGuiaSalida.objects.create(
                guia=self.guia, stock_item=self.stock,
                cantidad_rebajada=3, individualizado=True,
            )


class GuiaSerializacionUnitariaTest(TransactionTestCase):
    """Regresiones para creación y despiece unitario de items serializables."""

    def setUp(self):
        from bodegas.series import agregar_serie_a_stock

        self.empresa = Empresa.objects.create(
            nombre="Empresa GUIA", rut_empresa="91919191-1", direccion_principal="Dir"
        )
        self.sucursal = SucursalEmpresa.objects.create(
            nombre="Sucursal GUIA", empresa=self.empresa
        )
        self.user = User.objects.create_user(email="guia@test.com", password="test1234")
        self.usuario = UsuarioEmpresa.objects.create(
            usuario=self.user, sucursal=self.sucursal
        )
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=self.user).first()
        if personalizacion:
            personalizacion.sucursal_principal = self.sucursal
            personalizacion.save(update_fields=["sucursal_principal"])
        else:
            PersonalizacionUsuario.objects.create(
                usuario=self.user,
                sucursal_principal=self.sucursal,
            )

        self.empresa_cliente = Empresa.objects.create(
            nombre="Cliente GUIA", rut_empresa="92929292-2", direccion_principal="Dir"
        )
        RelacionEmpresa.objects.create(
            prestador_servicios=self.empresa, cliente=self.empresa_cliente
        )

        self.categoria = Categoria.objects.create(nombre="Cat GUIA")
        self.item = ItemEmpresa.objects.create(
            nombre="Item Serial", categoria=self.categoria, empresa=self.empresa
        )
        self.bodega = Bodega.objects.create(nombre="Bodega GUIA", sucursal=self.sucursal)
        self.stock = StockItemEnBodega.objects.create(
            bodega=self.bodega, item=self.item, cantidad=10, cantidad_no_disponible=0
        )
        self.guia = GuiaSalida.objects.create(
            bodega=self.bodega,
            cliente=self.empresa_cliente,
            creado_por=self.usuario,
            estado="P",
        )
        self.orden_compra = OrdenCompra.objects.create(
            oc_empresa=self.empresa,
            creado_por=self.usuario,
            fecha_compra="2026-03-26",
        )
        self.item_oc = ItemEnOrdenCompra.objects.create(
            orden_compra=self.orden_compra,
            item=self.item,
            cantidad=3,
            precio=1000,
        )
        self.oc_stock = ItemOrdenCompraEnStock.objects.create(
            content_type=ContentType.objects.get_for_model(ItemEnOrdenCompra),
            item_oc_id=self.item_oc.id,
            stock_item=self.stock,
            bodega_temporal=self.bodega,
            cantidad=3,
            numeros_serie={"numeros_serie": []},
        )
        self.api_client = APIClient()
        self.api_client.force_authenticate(user=self.user)
        for serie in ("SER-001", "SER-002", "SER-003", "SER-004"):
            agregar_serie_a_stock(self.oc_stock, serie)

    def test_add_oc_items_to_guia_crea_filas_unitarias_para_serializados(self):
        from bodegas.functions import add_oc_items_to_guia

        resultado = add_oc_items_to_guia(
            self.guia,
            self.orden_compra,
            usuario=self.usuario,
            cantidades_map={self.item_oc.id: 3},
        )

        items = ItemsGuiaSalida.objects.filter(
            guia=self.guia, source_item=self.item_oc
        ).order_by("id")
        self.stock.refresh_from_db()

        self.assertEqual(resultado["errors"], [])
        self.assertEqual(resultado["added"], 3)
        self.assertEqual(items.count(), 3)
        self.assertTrue(all(item.individualizado for item in items))
        self.assertTrue(all(item.cantidad_rebajada == 1 for item in items))
        self.assertEqual(self.stock.cantidad, 7)
        self.assertEqual(self.stock.cantidad_no_disponible, 3)

    def test_agregar_item_manual_serializable_crea_filas_unitarias(self):
        response = self.api_client.post(
            f"/api/guia-salida/{self.guia.id}/agregar-item/",
            data=json.dumps(
                {"stock_item_id": self.stock.id, "cantidad_rebajada": 3}
            ),
            content_type="application/json",
        )

        items = ItemsGuiaSalida.objects.filter(
            guia=self.guia, stock_item=self.stock
        ).order_by("id")
        self.stock.refresh_from_db()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(items.count(), 3)
        self.assertTrue(all(item.individualizado for item in items))
        self.assertTrue(all(item.cantidad_rebajada == 1 for item in items))
        self.assertEqual(self.stock.cantidad, 7)
        self.assertEqual(self.stock.cantidad_no_disponible, 3)

    def test_toggle_individualizado_descompone_item_legacy_agrupado(self):
        item_guia = ItemsGuiaSalida.objects.create(
            guia=self.guia,
            stock_item=self.stock,
            cantidad_original=10,
            cantidad_rebajada=3,
            individualizado=False,
            source_item=self.item_oc,
        )
        cantidad_antes = self.stock.cantidad
        no_disponible_antes = self.stock.cantidad_no_disponible

        response = self.api_client.patch(
            f"/api/guia-salida/{self.guia.id}/items-guia/{item_guia.id}/toggle-individualizado/",
            data=json.dumps({}),
            content_type="application/json",
        )

        items = ItemsGuiaSalida.objects.filter(
            guia=self.guia, stock_item=self.stock
        ).order_by("id")
        self.stock.refresh_from_db()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(items.count(), 3)
        self.assertTrue(all(item.individualizado for item in items))
        self.assertTrue(all(item.cantidad_rebajada == 1 for item in items))
        self.assertTrue(ItemsGuiaSalida.objects.filter(pk=item_guia.id).exists())
        self.assertEqual(self.stock.cantidad, cantidad_antes)
        self.assertEqual(self.stock.cantidad_no_disponible, no_disponible_antes)

    def test_permite_multiples_items_guia_con_mismo_source_item(self):
        item_1 = ItemsGuiaSalida.objects.create(
            guia=self.guia,
            stock_item=self.stock,
            cantidad_original=10,
            cantidad_rebajada=1,
            individualizado=True,
            source_item=self.item_oc,
        )
        item_2 = ItemsGuiaSalida.objects.create(
            guia=self.guia,
            stock_item=self.stock,
            cantidad_original=10,
            cantidad_rebajada=1,
            individualizado=True,
            source_item=self.item_oc,
        )

        self.assertIsNotNone(item_1.pk)
        self.assertIsNotNone(item_2.pk)
        self.assertEqual(
            ItemsGuiaSalida.objects.filter(
                guia=self.guia, source_item=self.item_oc
            ).count(),
            2,
        )
