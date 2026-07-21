from datetime import date

from django.test import SimpleTestCase, TestCase

from contratos.models import (
    ContratoCondicionEspecial,
    ContratoEmpresaCliente,
    ContratoItemComercial,
    ContratoLicencia,
    Licencia,
    Servicio,
)
from contratos.motor_v29 import _bloque_dinamico_html, _envolver_en_html, _nodo_a_html
from empresas.models import Empresa


class EnvolverEnHtmlFragmentacionTest(SimpleTestCase):
    """CSS de fragmentacion (orphans/widows/break-inside) compartido entre
    preview (Paged.js) y PDF real (WeasyPrint) — ver `_envolver_en_html`.
    """

    def _html(self, config=None):
        return _envolver_en_html("<p>cuerpo</p>", config or {}, adaptador=None, contrato=None)

    def test_incluye_orphans_y_widows(self):
        html = self._html()
        self.assertIn("orphans: 3", html)
        self.assertIn("widows: 3", html)

    def test_incluye_break_inside_avoid_en_bloques(self):
        html = self._html()
        self.assertIn("break-inside: avoid", html)
        self.assertIn("p, li, tr,", html)

    def test_no_rompe_el_page_break_after_de_salto_pagina(self):
        # El salto de pagina manual sigue siendo CSS2.1 (page-break-after),
        # no se migra a `break-after` como parte de este cambio.
        html = _nodo_a_html({"type": "salto_pagina"}, adaptador=None, contrato=None)
        self.assertIn("page-break-after:always", html)

    def test_conserva_tamano_fuente_y_margenes_existentes(self):
        html = self._html({"tamano": "carta", "fuente": "Georgia, serif"})
        self.assertIn("size: letter", html)
        self.assertIn("font-family: Georgia, serif", html)
        self.assertIn("margin: 2.5cm 2.5cm 2cm 2.5cm", html)


class NodoFirmaBreakInsideTest(SimpleTestCase):
    """El bloque de firma no debe cortarse a mitad de pagina."""

    def test_div_contenedor_tiene_marcador_data_bloque_firma(self):
        nodo = {"type": "firma", "firmantes": [{"rol": "Empleador"}, {"rol": "Trabajador"}]}
        html = _nodo_a_html(nodo, adaptador=None, contrato=None)
        self.assertIn('data-bloque="firma"', html)
        # El marcador va en el div CONTENEDOR externo, no en cada firmante individual.
        self.assertEqual(html.count('data-bloque="firma"'), 1)

    def test_firma_sin_firmantes_no_rompe(self):
        html = _nodo_a_html({"type": "firma"}, adaptador=None, contrato=None)
        self.assertEqual(html, "")


class EnvolverEnHtmlOverridesTest(SimpleTestCase):
    """`overrides` (simulador de condicionales) debe propagarse tambien al
    encabezado/pie del documento completo de preview, no solo al cuerpo.
    """

    def test_overrides_llega_al_encabezado(self):
        # Sin contrato real (preview) y sin override, `_evaluar_condicion_v29`
        # usa el fail-safe "mostrar" — el override es lo unico que puede OCULTAR
        # la rama condicional en este escenario.
        config = {
            "encabezado": {
                "activo": True,
                "contenido": [
                    {
                        "type": "parrafo",
                        "children": [
                            {"text": "oculto_si_override_false", "condicional": "mi_condicion"},
                        ],
                    }
                ],
            }
        }
        html_sin_override = _envolver_en_html(
            "<p>cuerpo</p>", config, adaptador=None, contrato=None
        )
        html_con_override_false = _envolver_en_html(
            "<p>cuerpo</p>", config, adaptador=None, contrato=None,
            overrides={"mi_condicion": False},
        )
        self.assertIn("oculto_si_override_false", html_sin_override)
        self.assertNotIn("oculto_si_override_false", html_con_override_false)


class BloqueDinamicoTest(TestCase):
    """Bloques dinámicos v2.9 (servicios/licencias/condiciones/resumen) —
    equivalente v2.9 de TIPOS_BLOQUE_DINAMICO del motor viejo: nunca
    almacenan texto, siempre se resuelven contra datos reales del contrato.
    """

    def setUp(self):
        self.empresa_prestadora = Empresa.objects.create(nombre="Prestadora Test")
        self.empresa_cliente = Empresa.objects.create(nombre="Cliente Test")
        self.contrato = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            nombre="Contrato Test Bloques Dinamicos",
            estado="borrador",
            tipo="servicios",
            moneda_cobro="USD",
        )

    def test_contrato_none_no_rompe(self):
        self.assertEqual(_bloque_dinamico_html("servicios", None), "")

    def test_subtipo_desconocido_no_rompe(self):
        self.assertEqual(_bloque_dinamico_html("subtipo_inexistente", self.contrato), "")

    def test_servicios_sin_items_muestra_mensaje_vacio(self):
        html = _bloque_dinamico_html("servicios", self.contrato)
        self.assertIn("Sin datos registrados", html)

    def test_servicios_con_item_real_calcula_total(self):
        servicio = Servicio.objects.create(nombre="Soporte Tecnico")
        ContratoItemComercial.objects.create(
            contrato=self.contrato,
            tipo_origen="servicio",
            servicio_version=servicio,
            snapshot_nombre="Soporte Tecnico Mensual",
            cantidad=2,
            forma_pago="mensual",
            moneda="USD",
            precio_unitario_contratado=150,
            total_mensual=300,
        )
        html = _bloque_dinamico_html("servicios", self.contrato)
        self.assertIn("Soporte Tecnico Mensual", html)
        self.assertIn("USD 300.00", html)
        self.assertIn('data-bloque="dinamico"', html)

    def test_licencias_con_dato_real(self):
        licencia_catalogo = Licencia.objects.create(nombre="Microsoft 365", proveedor="Microsoft")
        ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=licencia_catalogo,
            cantidad=5,
            nombre_snapshot="Microsoft 365 Business",
        )
        html = _bloque_dinamico_html("licencias", self.contrato)
        self.assertIn("Microsoft 365 Business", html)
        self.assertIn(">5<", html)

    def test_condiciones_especiales_usa_titulo_y_detalle_personalizados(self):
        ContratoCondicionEspecial.objects.create(
            contrato=self.contrato,
            titulo_personalizado="Confidencialidad",
            detalle_personalizado="Las partes mantienen confidencialidad.",
        )
        html = _bloque_dinamico_html("condiciones_especiales", self.contrato)
        self.assertIn("Confidencialidad", html)
        self.assertIn("Las partes mantienen confidencialidad.", html)

    def test_resumen_comercial_sin_items_no_rompe(self):
        html = _bloque_dinamico_html("resumen_comercial", self.contrato)
        self.assertTrue(html)  # no lanza excepción, devuelve algo (mensaje o total en 0)

    def test_nodo_bloque_dinamico_delega_correctamente(self):
        nodo = {"type": "bloque_dinamico", "subtipo": "servicios"}
        html = _nodo_a_html(nodo, adaptador=None, contrato=self.contrato)
        self.assertIn("Sin datos registrados", html)

    def test_cotizacion_venta_no_usa_items_comerciales(self):
        # Los contratos de venta NO tienen ContratoItemComercial — sus ítems
        # viven en Cotizacion.items (ItemCotizacion), vía la cotización
        # aceptada vinculada. Confirma que el bloque "servicios" (que sí lee
        # items_comerciales) no aplica acá, y que "cotizacion_venta" sí.
        from cotizaciones.models import Cotizacion, ItemCotizacion

        contrato_venta = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            nombre="Contrato Venta Test",
            estado="borrador",
            tipo="venta",
            moneda_cobro="CLP",
        )
        cotizacion = Cotizacion.objects.create(
            nombre="Cotizacion equipamiento",
            empresa=self.empresa_prestadora,
            cliente=self.empresa_cliente,
            estado="aceptada",
            contrato=contrato_venta,
            tipo_moneda="2",
        )
        ItemCotizacion.objects.create(
            cotizacion=cotizacion,
            nombre="Notebook Dell Latitude",
            cantidad=3,
            precio_unitario=500000,
            costo_total=1500000,
            tipo_moneda="2",
        )

        html_servicios = _bloque_dinamico_html("servicios", contrato_venta)
        self.assertIn("Sin datos registrados", html_servicios)

        html_venta = _bloque_dinamico_html("cotizacion_venta", contrato_venta)
        self.assertIn("Notebook Dell Latitude", html_venta)
        self.assertIn("CLP 1,500,000.00", html_venta)
