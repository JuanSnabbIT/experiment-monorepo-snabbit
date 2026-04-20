"""
Tests unitarios para bodegas/validaciones.py

Ejecutar:
    cd backend
    python manage.py test bodegas.tests_validaciones --verbosity=2
"""
from unittest.mock import MagicMock, patch, PropertyMock

from django.test import TestCase
from rest_framework.exceptions import ValidationError

from bodegas.validaciones import (
    validar_ajuste_no_negativo,
    validar_cantidad_vs_series,
    validar_estado_guia_permite_edicion,
    validar_estado_guia_permite_reversion,
    validar_motivo_ajuste,
    validar_no_series_duplicadas_en_lista,
    validar_stock_disponible,
)


def _make_stock_item(nombre="TestItem", cantidad=10):
    si = MagicMock()
    si.cantidad = cantidad
    si.item.nombre = nombre
    return si


def _make_guia(estado="P"):
    g = MagicMock()
    g.pk = 1
    g.estado = estado
    return g


# ---------------------------------------------------------------------------
# validar_stock_disponible
# ---------------------------------------------------------------------------
class StockDisponibleTests(TestCase):
    def test_ok(self):
        si = _make_stock_item(cantidad=10)
        validar_stock_disponible(si, 5)  # no lanza

    def test_exacto(self):
        si = _make_stock_item(cantidad=5)
        validar_stock_disponible(si, 5)  # no lanza

    def test_insuficiente(self):
        si = _make_stock_item(cantidad=3)
        with self.assertRaises(ValidationError) as ctx:
            validar_stock_disponible(si, 5)
        self.assertIn("Stock insuficiente", str(ctx.exception))

    def test_cantidad_cero(self):
        si = _make_stock_item(cantidad=10)
        with self.assertRaises(ValidationError):
            validar_stock_disponible(si, 0)

    def test_cantidad_negativa(self):
        si = _make_stock_item(cantidad=10)
        with self.assertRaises(ValidationError):
            validar_stock_disponible(si, -1)


# ---------------------------------------------------------------------------
# validar_ajuste_no_negativo
# ---------------------------------------------------------------------------
class AjusteNoNegativoTests(TestCase):
    def test_suma_positiva_ok(self):
        si = _make_stock_item(cantidad=5)
        validar_ajuste_no_negativo(si, 3)

    def test_resta_en_rango_ok(self):
        si = _make_stock_item(cantidad=10)
        validar_ajuste_no_negativo(si, -10)  # resultado = 0, ok

    def test_resta_negativa_error(self):
        si = _make_stock_item(cantidad=5)
        with self.assertRaises(ValidationError) as ctx:
            validar_ajuste_no_negativo(si, -6)
        self.assertIn("negativo", str(ctx.exception))

    def test_cero_error(self):
        si = _make_stock_item(cantidad=5)
        with self.assertRaises(ValidationError):
            validar_ajuste_no_negativo(si, 0)


# ---------------------------------------------------------------------------
# validar_motivo_ajuste
# ---------------------------------------------------------------------------
class MotivoAjusteTests(TestCase):
    def test_ok(self):
        validar_motivo_ajuste("Corrección de inventario físico")

    def test_vacio_error(self):
        with self.assertRaises(ValidationError):
            validar_motivo_ajuste("")

    def test_espacios_error(self):
        with self.assertRaises(ValidationError):
            validar_motivo_ajuste("   ")

    def test_none_error(self):
        with self.assertRaises(ValidationError):
            validar_motivo_ajuste(None)


# ---------------------------------------------------------------------------
# validar_estado_guia_permite_edicion
# ---------------------------------------------------------------------------
class EstadoGuiaEdicionTests(TestCase):
    def test_estados_permitidos(self):
        for estado in ("P", "ER", "FR", "R", "PR"):
            validar_estado_guia_permite_edicion(_make_guia(estado))  # no lanza

    def test_estados_bloqueados(self):
        for estado in ("ET", "E", "T"):
            with self.assertRaises(ValidationError):
                validar_estado_guia_permite_edicion(_make_guia(estado))


# ---------------------------------------------------------------------------
# validar_estado_guia_permite_reversion
# ---------------------------------------------------------------------------
class EstadoGuiaReversionTests(TestCase):
    def test_estados_permitidos(self):
        for estado in ("P", "ER", "FR", "ET", "R", "PR"):
            validar_estado_guia_permite_reversion(_make_guia(estado))  # no lanza

    def test_estados_bloqueados(self):
        for estado in ("E", "T"):
            with self.assertRaises(ValidationError):
                validar_estado_guia_permite_reversion(_make_guia(estado))


# ---------------------------------------------------------------------------
# validar_cantidad_vs_series
# ---------------------------------------------------------------------------
class CantidadVsSeriesTests(TestCase):
    def test_ok(self):
        validar_cantidad_vs_series(3, ["S1", "S2", "S3"])

    def test_sin_series_ok(self):
        validar_cantidad_vs_series(5, [])  # sin series → sin validación

    def test_discrepancia_error(self):
        with self.assertRaises(ValidationError) as ctx:
            validar_cantidad_vs_series(3, ["S1", "S2"])
        self.assertIn("no coincide", str(ctx.exception))


# ---------------------------------------------------------------------------
# validar_no_series_duplicadas_en_lista
# ---------------------------------------------------------------------------
class SeriesDuplicadasListaTests(TestCase):
    def test_ok(self):
        validar_no_series_duplicadas_en_lista(["A", "B", "C"])

    def test_duplicado_error(self):
        with self.assertRaises(ValidationError) as ctx:
            validar_no_series_duplicadas_en_lista(["A", "B", "A"])
        self.assertIn("duplicadas", str(ctx.exception))
