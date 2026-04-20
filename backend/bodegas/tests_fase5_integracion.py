"""Suite de integración Fase 5 alineada al modelo real de bodegas."""

from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError, transaction
from django.test import TransactionTestCase

from bodegas.models import (
    Bodega,
    GuiaSalida,
    ItemOrdenCompraEnStock,
    ItemsGuiaSalida,
    MovimientoStock,
    SerieItem,
    StockItemEnBodega,
)
from bodegas.movimientos import registrar_ajuste_manual, registrar_entrada, registrar_salida
from bodegas.series import (
    agregar_serie_a_stock,
    liberar_series_por_item_guia,
    obtener_series_disponibles,
    reservar_serie,
)
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa
from items.models import Categoria, ItemEmpresa

User = get_user_model()


class SetupComunFase5(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.empresa = Empresa.objects.create(
            nombre="Empresa Fase 5", rut_empresa="11111111-1", direccion_principal="Dir"
        )
        self.empresa_cliente = Empresa.objects.create(
            nombre="Cliente Fase 5", rut_empresa="22222222-2", direccion_principal="Dir cliente"
        )
        self.sucursal = SucursalEmpresa.objects.create(nombre="Sucursal", empresa=self.empresa)

        self.user_1 = User.objects.create_user(email="fase5-1@test.com", password="test1234")
        self.user_2 = User.objects.create_user(email="fase5-2@test.com", password="test1234")
        self.usuario_empresa1 = UsuarioEmpresa.objects.create(usuario=self.user_1, sucursal=self.sucursal)
        self.usuario_empresa2 = UsuarioEmpresa.objects.create(usuario=self.user_2, sucursal=self.sucursal)

        self.categoria = Categoria.objects.create(nombre="Equipos")
        self.item_seriado = ItemEmpresa.objects.create(
            nombre="Laptop", categoria=self.categoria, empresa=self.empresa, requiere_serie=True
        )
        self.item_no_seriado = ItemEmpresa.objects.create(
            nombre="Cable", categoria=self.categoria, empresa=self.empresa, requiere_serie=False
        )

        self.bodega = Bodega.objects.create(nombre="Bodega Central", sucursal=self.sucursal)
        self.stock_seriado = StockItemEnBodega.objects.create(
            bodega=self.bodega, item=self.item_seriado, cantidad=3, cantidad_no_disponible=0
        )
        self.stock_no_seriado = StockItemEnBodega.objects.create(
            bodega=self.bodega, item=self.item_no_seriado, cantidad=100, cantidad_no_disponible=0
        )

        ct = ContentType.objects.get_for_model(StockItemEnBodega)
        self.oc_stock = ItemOrdenCompraEnStock.objects.create(
            content_type=ct,
            item_oc_id=self.stock_seriado.pk,
            stock_item=self.stock_seriado,
            cantidad=3,
            numeros_serie={"numeros_serie": []},
        )

        for serie in ["SERIE-001", "SERIE-002", "SERIE-003"]:
            agregar_serie_a_stock(self.oc_stock, serie)

    def crear_guia(self, estado="P"):
        return GuiaSalida.objects.create(
            bodega=self.bodega,
            cliente=self.empresa_cliente,
            creado_por=self.usuario_empresa1,
            estado=estado,
        )

    def crear_item_guia_seriado(self, guia, serie):
        item_guia = ItemsGuiaSalida.objects.create(
            guia=guia,
            stock_item=self.stock_seriado,
            cantidad_original=self.stock_seriado.cantidad,
            cantidad_rebajada=1,
            individualizado=True,
        )
        ok, msg = reservar_serie(self.stock_seriado, serie, item_guia.id)
        self.assertTrue(ok, msg)
        item_guia.numero_serie = {
            "serie": serie,
            "modelo": "itemsguiasalida",
            "object_id": item_guia.id,
        }
        item_guia.save(update_fields=["numero_serie"])
        registrar_salida(
            stock_item=self.stock_seriado,
            cantidad=1,
            usuario=self.usuario_empresa1,
            origen=item_guia,
            descripcion=f"Salida de {serie} en guía {guia.id}",
        )
        return item_guia


class TestFlujosIntegrales(SetupComunFase5):
    def test_recepcion_incrementa_stock_seriado(self):
        stock_antes = self.stock_seriado.cantidad
        registrar_entrada(
            stock_item=self.stock_seriado,
            cantidad=2,
            usuario=self.usuario_empresa1,
            origen=None,
            descripcion="Recepción inicial",
        )
        self.stock_seriado.refresh_from_db()
        self.assertEqual(self.stock_seriado.cantidad, stock_antes + 2)

    def test_despacho_reserva_serie_y_genera_movimiento(self):
        guia = self.crear_guia()
        item_guia = self.crear_item_guia_seriado(guia, "SERIE-001")

        self.stock_seriado.refresh_from_db()
        serie = SerieItem.objects.get(serie="SERIE-001", empresa=self.empresa)
        movimiento = MovimientoStock.objects.filter(
            stock_item=self.stock_seriado,
            tipo_movimiento="SALIDA",
            content_type=ContentType.objects.get_for_model(ItemsGuiaSalida),
            object_id=item_guia.id,
        ).last()

        self.assertEqual(self.stock_seriado.cantidad, 2)
        self.assertEqual(serie.estado, "reservada")
        self.assertEqual(serie.item_guia_salida_id, item_guia.id)
        self.assertIsNotNone(movimiento)

    def test_devolucion_libera_serie_y_reintegra_stock(self):
        guia = self.crear_guia()
        item_guia = self.crear_item_guia_seriado(guia, "SERIE-001")

        liberadas = liberar_series_por_item_guia(self.stock_seriado, item_guia.id)
        self.assertTrue(liberadas)
        registrar_entrada(
            stock_item=self.stock_seriado,
            cantidad=1,
            usuario=self.usuario_empresa1,
            origen=item_guia,
            descripcion="Devolución de guía",
        )

        self.stock_seriado.refresh_from_db()
        serie = SerieItem.objects.get(serie="SERIE-001", empresa=self.empresa)
        self.assertEqual(self.stock_seriado.cantidad, 3)
        self.assertEqual(serie.estado, "disponible")
        self.assertIsNone(serie.item_guia_salida)

    def test_ajuste_manual_exige_motivo_y_registra_movimiento(self):
        with self.assertRaises(ValueError):
            registrar_ajuste_manual(
                stock_item=self.stock_no_seriado,
                cantidad_delta=-5,
                usuario=self.usuario_empresa1,
                descripcion="",
            )

        registrar_ajuste_manual(
            stock_item=self.stock_no_seriado,
            cantidad_delta=-5,
            usuario=self.usuario_empresa1,
            descripcion="Ajuste manual por conteo",
        )
        self.stock_no_seriado.refresh_from_db()
        movimiento = MovimientoStock.objects.filter(
            stock_item=self.stock_no_seriado,
            tipo_movimiento="AJUSTE",
        ).last()

        self.assertEqual(self.stock_no_seriado.cantidad, 95)
        self.assertIsNotNone(movimiento)
        self.assertIn("Ajuste manual", movimiento.descripcion)


class TestConcurrencia(SetupComunFase5):
    def test_dos_usuarios_no_pueden_reservar_la_misma_serie(self):
        guia = self.crear_guia()
        resultados = []
        lock = Lock()

        def reservar(usuario, serie):
            try:
                with transaction.atomic():
                    item_guia = ItemsGuiaSalida.objects.create(
                        guia=guia,
                        stock_item=self.stock_seriado,
                        cantidad_original=self.stock_seriado.cantidad,
                        cantidad_rebajada=1,
                        individualizado=True,
                    )
                    ok, msg = reservar_serie(self.stock_seriado, serie, item_guia.id)
                    with lock:
                        resultados.append((ok, msg))
            except Exception as exc:
                with lock:
                    resultados.append((False, str(exc)))

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(reservar, self.usuario_empresa1, "SERIE-001"),
                executor.submit(reservar, self.usuario_empresa2, "SERIE-001"),
            ]
            for future in as_completed(futures):
                future.result()

        exitos = sum(1 for ok, _ in resultados if ok)
        self.assertEqual(exitos, 1, resultados)

        serie = SerieItem.objects.get(serie="SERIE-001", empresa=self.empresa)
        self.assertEqual(serie.estado, "reservada")


class TestRegresionYConsistencia(SetupComunFase5):
    def test_anular_guia_revierte_movimientos_y_libera_series(self):
        guia = self.crear_guia()
        item_guia = self.crear_item_guia_seriado(guia, "SERIE-001")

        guia.estado = "R"
        guia.save(update_fields=["estado"])
        liberar_series_por_item_guia(self.stock_seriado, item_guia.id)
        registrar_entrada(
            stock_item=self.stock_seriado,
            cantidad=1,
            usuario=self.usuario_empresa1,
            origen=item_guia,
            descripcion="Reverso por guía revertida",
        )

        self.stock_seriado.refresh_from_db()
        serie = SerieItem.objects.get(serie="SERIE-001", empresa=self.empresa)
        self.assertEqual(self.stock_seriado.cantidad, 3)
        self.assertEqual(serie.estado, "disponible")

    def test_item_individualizado_requiere_cantidad_uno(self):
        guia = self.crear_guia()
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ItemsGuiaSalida.objects.create(
                    guia=guia,
                    stock_item=self.stock_seriado,
                    cantidad_original=self.stock_seriado.cantidad,
                    cantidad_rebajada=2,
                    individualizado=True,
                )

    def test_stock_seriado_coincide_con_series_disponibles(self):
        series_disponibles = SerieItem.objects.filter(
            stock_item=self.stock_seriado,
            estado="disponible",
        ).count()
        self.assertEqual(series_disponibles, self.stock_seriado.cantidad)

    def test_detecta_discrepancia_manualmente(self):
        self.stock_seriado.cantidad = 1
        self.stock_seriado.save(update_fields=["cantidad"])

        series_disponibles = SerieItem.objects.filter(
            stock_item=self.stock_seriado,
            estado="disponible",
        ).count()
        self.assertNotEqual(series_disponibles, self.stock_seriado.cantidad)


class TestCasosExcepcionales(SetupComunFase5):
    def test_serie_duplicada_en_misma_empresa_falla_por_constraint(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                SerieItem.objects.create(
                    serie="SERIE-001",
                    stock_item=self.stock_seriado,
                    item_orden_compra_en_stock=self.oc_stock,
                    empresa=self.empresa,
                    estado="disponible",
                )

    def test_serie_igual_en_otra_empresa_es_valida(self):
        empresa_2 = Empresa.objects.create(
            nombre="Otra Empresa", rut_empresa="33333333-3", direccion_principal="Dir 2"
        )
        sucursal_2 = SucursalEmpresa.objects.create(nombre="Sucursal 2", empresa=empresa_2)
        bodega_2 = Bodega.objects.create(nombre="Bodega 2", sucursal=sucursal_2)
        item_2 = ItemEmpresa.objects.create(
            nombre="Laptop 2", categoria=self.categoria, empresa=empresa_2, requiere_serie=True
        )
        stock_2 = StockItemEnBodega.objects.create(bodega=bodega_2, item=item_2, cantidad=1)

        serie = SerieItem.objects.create(
            serie="SERIE-001",
            stock_item=stock_2,
            empresa=empresa_2,
            estado="disponible",
        )
        self.assertIsNotNone(serie.pk)

    def test_obtener_series_disponibles_refleja_reservas(self):
        guia = self.crear_guia()
        item_guia = ItemsGuiaSalida.objects.create(
            guia=guia,
            stock_item=self.stock_seriado,
            cantidad_original=self.stock_seriado.cantidad,
            cantidad_rebajada=1,
            individualizado=True,
        )
        ok, msg = reservar_serie(self.stock_seriado, "SERIE-001", item_guia.id)
        self.assertTrue(ok, msg)

        disponibles = obtener_series_disponibles(self.stock_seriado)
        self.assertEqual(disponibles, ["SERIE-002", "SERIE-003"])
