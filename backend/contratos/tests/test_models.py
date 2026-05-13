from django.test import TestCase
from datetime import date, timedelta
from django.core.exceptions import ValidationError
from unittest.mock import patch
from cuentas.models import User
from contratos.forms import UsuarioVinculadoLicenciaForm
from contratos.models import (
    ContratoEmpresaCliente,
    ContratoItemComercial,
    ContratoVisita,
    ContratoLicencia,
    ContratoCondicionEspecial,
    NotificacionVentanaLicencia,
    UsuarioVinculadoLicencia,
    UsuarioVinculadoContrato,
    PersonaLicenciataria,
    CorreoPersonaLicenciataria,
    Servicio,
    ServicioCaracteristica,
    PlanServicio,
    PlanServicioDetalle,
    CaracteristicaServicio,
    Visita,
    Licencia,
    CondicionEspecial,
)
from contratos.serializers import ContratoItemComercialSerializer
from contratos.tasks import notificar_ventana_edicion_licencias
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa


class ContratoEmpresaClienteModelTest(TestCase):
    """Tests para el modelo ContratoEmpresaCliente."""

    def setUp(self):
        self.empresa_prestadora = Empresa.objects.create(nombre="Prestadora Test")
        self.empresa_cliente = Empresa.objects.create(nombre="Cliente Test")

    def test_str_representation(self):
        contrato = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            nombre="Contrato Test",
        )
        self.assertIn("Prestadora Test", str(contrato))
        self.assertIn("Cliente Test", str(contrato))
        self.assertIn("borrador", str(contrato))

    def test_estado_default_borrador(self):
        contrato = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            nombre="Contrato Default",
        )
        self.assertEqual(contrato.estado, "borrador")

    def test_tipo_default_servicios(self):
        contrato = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            nombre="Contrato Tipo Default",
        )
        self.assertEqual(contrato.tipo, "servicios")

    def test_hereda_modelo_base_historico(self):
        contrato = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            nombre="Contrato Herencia",
        )
        self.assertTrue(hasattr(contrato, "fecha_creacion"))
        self.assertTrue(hasattr(contrato, "fecha_modificacion"))

    def test_actualizar_estado_finalizado_si_vencido(self):
        """Si fecha_fin < hoy, save() debe marcar como finalizado."""
        contrato = ContratoEmpresaCliente(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today() - timedelta(days=60),
            fecha_fin=date.today() - timedelta(days=1),
            nombre="Contrato Vencido",
            estado="activo",
        )
        contrato.save()
        self.assertEqual(contrato.estado, "finalizado")

    def test_no_cambia_estado_si_fecha_fin_futura(self):
        contrato = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            fecha_fin=date.today() + timedelta(days=30),
            nombre="Contrato Vigente",
            estado="activo",
        )
        self.assertEqual(contrato.estado, "activo")

    def test_constraint_fecha_fin_mayor_igual_fecha_inicio(self):
        """El constraint impide fecha_fin < fecha_inicio (ValidationError via clean() en save())."""
        from django.core.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            ContratoEmpresaCliente.objects.create(
                empresa_prestadora=self.empresa_prestadora,
                empresa_cliente=self.empresa_cliente,
                fecha_inicio=date.today(),
                fecha_fin=date.today() - timedelta(days=1),
                nombre="Contrato Inválido",
            )

    def test_fecha_fin_nula_permitida(self):
        contrato = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            fecha_fin=None,
            nombre="Contrato Indefinido",
        )
        self.assertIsNone(contrato.fecha_fin)

    def test_item_comercial_subtotal_usa_forma_pago_contractual(self):
        contrato = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            nombre="Contrato Anual",
            forma_pago_contractual="anual",
        )
        servicio = Servicio.objects.create(nombre="Soporte TI", categoria="soporte")
        item = ContratoItemComercial.objects.create(
            contrato=contrato,
            tipo_origen="servicio",
            servicio_version=servicio,
            snapshot_nombre="Soporte TI",
            cantidad=1,
            veces_por_mes=1,
            forma_pago="mensual",
            moneda="CLP",
            precio_unitario_contratado=100,
        )
        item.recalcular_totales()

        serializer = ContratoItemComercialSerializer(item)
        self.assertEqual(serializer.data["subtotal"], 1200.0)

    def test_item_comercial_descuento_anual_porcentaje_aplica_en_total_anual(self):
        """Con descuento_anual_porcentaje=10 y precio=100, total_anual = 100*12*0.90 = 1080."""
        contrato = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            nombre="Contrato Descuento",
            forma_pago_contractual="anual",
        )
        servicio = Servicio.objects.create(nombre="Soporte TI v2", categoria="soporte")
        item = ContratoItemComercial.objects.create(
            contrato=contrato,
            tipo_origen="servicio",
            servicio_version=servicio,
            snapshot_nombre="Soporte TI v2",
            cantidad=1,
            veces_por_mes=1,
            forma_pago="anual",
            moneda="CLP",
            precio_unitario_contratado=100,
            descuento_anual_porcentaje=10,
        )
        item.recalcular_totales()
        self.assertAlmostEqual(float(item.total_anual), 1080.0, places=2)
        # total_mensual no cambia con el descuento anual
        self.assertAlmostEqual(float(item.total_mensual), 100.0, places=2)


class CatalogoModelTest(TestCase):
    """Tests para modelos de catálogo (Servicio, Visita, Licencia, CondicionEspecial)."""

    def test_servicio_str(self):
        servicio = Servicio.objects.create(nombre="Soporte TI", categoria="soporte")
        self.assertEqual(str(servicio), "Soporte TI")

    def test_visita_str(self):
        visita = Visita.objects.create(descripcion="Visita Mensual Preventiva")
        self.assertEqual(str(visita), "Visita Mensual Preventiva")

    def test_licencia_str(self):
        licencia = Licencia.objects.create(nombre="Microsoft 365", proveedor="Microsoft")
        self.assertIn("Microsoft 365", str(licencia))
        self.assertIn("Microsoft", str(licencia))

    def test_condicion_especial_str(self):
        condicion = CondicionEspecial.objects.create(
            titulo="SLA Premium",
            descripcion="Tiempo de respuesta: 4 horas",
        )
        self.assertEqual(str(condicion), "SLA Premium")

    def test_servicio_construye_resumen_desde_alcance_structurado(self):
        servicio = Servicio.objects.create(nombre="Monitoreo", categoria="soporte")
        disponibilidad = CaracteristicaServicio.objects.create(nombre="Disponibilidad 24/7")
        respaldo = CaracteristicaServicio.objects.create(nombre="Respaldo diario")

        ServicioCaracteristica.objects.create(
            servicio=servicio,
            caracteristica=disponibilidad,
            modo=ServicioCaracteristica.MODO_INCLUYE,
            orden=0,
        )
        ServicioCaracteristica.objects.create(
            servicio=servicio,
            caracteristica=respaldo,
            modo=ServicioCaracteristica.MODO_NO_INCLUYE,
            orden=1,
        )

        self.assertIn("Disponibilidad 24/7", servicio.construir_texto_alcance("incluye"))
        self.assertIn("Respaldo diario", servicio.construir_texto_alcance("no_incluye"))

    def test_plan_resuelve_alcance_heredado_desde_servicios(self):
        servicio = Servicio.objects.create(nombre="Mesa de ayuda", categoria="soporte")
        caracteristica = CaracteristicaServicio.objects.create(nombre="Atencion remota")
        ServicioCaracteristica.objects.create(
            servicio=servicio,
            caracteristica=caracteristica,
            modo=ServicioCaracteristica.MODO_INCLUYE,
            orden=0,
        )
        plan = PlanServicio.objects.create(nombre="Plan Base")
        PlanServicioDetalle.objects.create(plan=plan, servicio_version=servicio, orden=0)

        resumen = plan.obtener_items_alcance_resueltos()

        self.assertEqual(len(resumen), 1)
        self.assertEqual(resumen[0]["caracteristica"].nombre, "Atencion remota")
        self.assertEqual(sorted(resumen[0]["incluye"]), ["Mesa de ayuda"])


class ContratoLicenciaModelTest(TestCase):
    def setUp(self):
        self.empresa_prestadora = Empresa.objects.create(nombre="Prestadora Licencia")
        self.empresa_cliente = Empresa.objects.create(nombre="Cliente Licencia")
        self.sucursal = SucursalEmpresa.objects.create(
            nombre="Sucursal Cliente",
            empresa=self.empresa_cliente,
        )
        self.user = User.objects.create_user(
            email="licencias@test.com",
            password="testpass123",
            first_name="Licencia",
            last_name="Test",
        )
        self.usuario_empresa = UsuarioEmpresa.objects.create(
            usuario=self.user,
            sucursal=self.sucursal,
        )
        self.contrato = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today() - timedelta(days=40),
            fecha_fin=date.today() + timedelta(days=400),
            nombre="Contrato Licencias",
            tipo="licencia",
            estado="activo",
        )
        self.licencia_catalogo = Licencia.objects.create(
            nombre="Microsoft 365",
            proveedor="Microsoft",
            modalidad_base="P1Y",
            precio_venta=100,
        )

    def test_modalidad_anual_pago_mensual_reabre_solo_por_bloque_anual(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia_catalogo,
            cantidad=3,
            fecha_inicio=date.today() - timedelta(days=40),
        )

        self.assertEqual(
            contrato_licencia.inicio_periodo_actual,
            date.today() - timedelta(days=40),
        )
        self.assertFalse(contrato_licencia.en_ventana_edicion)

    def test_reducir_cupos_fuera_de_ventana_falla(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia_catalogo,
            cantidad=3,
            fecha_inicio=date.today() - timedelta(days=40),
        )

        contrato_licencia.cantidad = 2
        with self.assertRaises(ValidationError):
            contrato_licencia.full_clean()

    def test_aumentar_cupos_fuera_de_ventana_se_permite(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia_catalogo,
            cantidad=3,
            fecha_inicio=date.today() - timedelta(days=40),
        )

        contrato_licencia.cantidad = 5
        contrato_licencia.full_clean()

    def test_no_reducir_bajo_usuarios_vinculados(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia_catalogo,
            cantidad=2,
            fecha_inicio=date.today(),
        )
        UsuarioVinculadoLicencia.objects.create(
            licencia=contrato_licencia,
            usuario=self.usuario_empresa,
        )

        contrato_licencia.cantidad = 0
        with self.assertRaises(ValidationError):
            contrato_licencia.full_clean()

    def test_dias_hasta_fin_edicion_en_ventana(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia_catalogo,
            cantidad=2,
            fecha_inicio=date.today(),
        )

        self.assertEqual(contrato_licencia.dias_hasta_fin_edicion, 7)

    def test_vinculo_interno_crea_persona_y_correo_canonico(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia_catalogo,
            cantidad=2,
            fecha_inicio=date.today(),
        )

        vinculo = UsuarioVinculadoLicencia.objects.create(
            licencia=contrato_licencia,
            usuario=self.usuario_empresa,
        )

        self.assertIsNotNone(vinculo.correo_persona)
        self.assertEqual(vinculo.correo_persona.correo, "licencias@test.com")
        self.assertEqual(vinculo.persona_licenciataria.usuario_empresa_id, self.usuario_empresa.id)

    def test_vinculo_externo_crea_persona_y_correo_canonico(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia_catalogo,
            cantidad=2,
            fecha_inicio=date.today(),
        )

        vinculo = UsuarioVinculadoLicencia.objects.create(
            licencia=contrato_licencia,
            nombre="Contacto Externo",
            correo_generico="externo@cliente.com",
        )

        self.assertIsNone(vinculo.usuario)
        self.assertIsNotNone(vinculo.correo_persona)
        self.assertEqual(vinculo.correo_persona.correo, "externo@cliente.com")
        self.assertEqual(vinculo.persona_licenciataria.nombre, "Contacto Externo")

    def test_mismo_usuario_puede_vincular_distinto_correo(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia_catalogo,
            cantidad=3,
            fecha_inicio=date.today(),
        )
        persona, _ = PersonaLicenciataria.sincronizar_desde_usuario_empresa(
            self.usuario_empresa,
            empresa=self.contrato.empresa_cliente,
        )
        correo_alterno = CorreoPersonaLicenciataria.obtener_o_crear_para_persona(
            persona=persona,
            correo="licencias+alt@test.com",
            es_principal=False,
            es_corporativo=True,
        )

        vinculo = UsuarioVinculadoLicencia.objects.create(
            licencia=contrato_licencia,
            correo_persona=correo_alterno,
        )

        self.assertEqual(vinculo.usuario_id, self.usuario_empresa.id)
        self.assertEqual(vinculo.correo_asignado, "licencias+alt@test.com")

    def test_mismo_correo_puede_vincularse_a_licencias_distintas(self):
        licencia_catalogo_adicional = Licencia.objects.create(
            nombre="Google Workspace",
            proveedor="Google",
            modalidad_base="P1Y",
        )
        contrato_licencia_uno = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia_catalogo,
            cantidad=3,
            fecha_inicio=date.today(),
        )
        contrato_licencia_dos = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=licencia_catalogo_adicional,
            cantidad=3,
            fecha_inicio=date.today(),
        )

        vinculo_uno = UsuarioVinculadoLicencia.objects.create(
            licencia=contrato_licencia_uno,
            usuario=self.usuario_empresa,
        )
        vinculo_dos = UsuarioVinculadoLicencia.objects.create(
            licencia=contrato_licencia_dos,
            correo_persona=vinculo_uno.correo_persona,
        )

        self.assertEqual(vinculo_uno.correo_asignado, vinculo_dos.correo_asignado)
        self.assertEqual(vinculo_uno.correo_persona_id, vinculo_dos.correo_persona_id)
        self.assertEqual(
            UsuarioVinculadoLicencia.objects.filter(
                correo_persona=vinculo_uno.correo_persona
            ).count(),
            2,
        )

    def test_form_filtra_usuario_y_correo_por_empresa_de_licencia(self):
        contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia_catalogo,
            cantidad=2,
            fecha_inicio=date.today(),
        )

        otra_empresa = Empresa.objects.create(nombre="Otra Empresa")
        otra_sucursal = SucursalEmpresa.objects.create(
            nombre="Otra Sucursal",
            empresa=otra_empresa,
        )
        otro_usuario = User.objects.create_user(
            email="otro@test.com",
            password="testpass123",
            first_name="Otro",
            last_name="Usuario",
        )
        usuario_empresa_otro = UsuarioEmpresa.objects.create(
            usuario=otro_usuario,
            sucursal=otra_sucursal,
        )
        correo_otro = CorreoPersonaLicenciataria.objects.create(
            empresa=otra_empresa,
            correo="otro@empresa.com",
        )

        form = UsuarioVinculadoLicenciaForm(
            data={
                'licencia': contrato_licencia.pk,
                'usuario': usuario_empresa_otro.pk,
                'correo_persona': correo_otro.pk,
            }
        )

        self.assertFalse(form.is_valid())
        self.assertIn('usuario', form.errors)
        self.assertIn('correo_persona', form.errors)


class ContratoItemComercialDetalleCobro(TestCase):
    """Tests para el campo detalle_cobro en ContratoItemComercialSerializer."""

    def setUp(self):
        self.empresa_prestadora = Empresa.objects.create(nombre="Prestadora DC")
        self.empresa_cliente = Empresa.objects.create(nombre="Cliente DC")
        self.servicio = Servicio.objects.create(nombre="Servicio Test DC", categoria="soporte")
        self.contrato_clp = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            nombre="Contrato CLP",
            forma_pago_contractual="mensual",
            moneda_cobro="CLP",
        )

    def _crear_item(self, contrato, moneda="CLP", precio=100, cantidad=1, veces=1, descuento=None):
        item = ContratoItemComercial.objects.create(
            contrato=contrato,
            tipo_origen="servicio",
            servicio_version=self.servicio,
            snapshot_nombre="Servicio Test DC",
            cantidad=cantidad,
            veces_por_mes=veces,
            forma_pago=contrato.forma_pago_contractual,
            moneda=moneda,
            precio_unitario_contratado=precio,
            descuento_anual_porcentaje=descuento,
        )
        item.recalcular_totales()
        item.save()
        return item

    def test_misma_moneda(self):
        """Item CLP en contrato CLP: estado_conversion=misma_moneda, subtotal_convertido==subtotal_cobro."""
        item = self._crear_item(self.contrato_clp, moneda="CLP", precio=100)
        serializer = ContratoItemComercialSerializer(item)
        dc = serializer.data["detalle_cobro"]
        self.assertEqual(dc["estado_conversion"], "misma_moneda")
        self.assertEqual(dc["subtotal_convertido"], dc["subtotal_cobro"])
        self.assertEqual(dc["moneda_item"], "CLP")
        self.assertEqual(dc["moneda_cobro"], "CLP")

    @patch("contratos.currency_utils.obtener_tipos_cambio_actuales", return_value=(1000, None))
    def test_convertido_usd_a_clp(self, mock_tasa):
        """Item USD en contrato CLP con tasa disponible: estado_conversion=convertido."""
        item = self._crear_item(self.contrato_clp, moneda="USD", precio=10)
        serializer = ContratoItemComercialSerializer(item)
        dc = serializer.data["detalle_cobro"]
        self.assertEqual(dc["estado_conversion"], "convertido")
        self.assertIsNotNone(dc["subtotal_convertido"])
        self.assertEqual(dc["moneda_item"], "USD")
        self.assertEqual(dc["moneda_cobro"], "CLP")
        self.assertAlmostEqual(dc["subtotal_convertido"], 10000.0, places=0)

    @patch("contratos.currency_utils.obtener_tipos_cambio_actuales", return_value=(None, None))
    def test_sin_tipo_cambio(self, mock_tasa):
        """Item USD en contrato CLP sin tasa disponible: estado_conversion=sin_tipo_cambio."""
        item = self._crear_item(self.contrato_clp, moneda="USD", precio=10)
        serializer = ContratoItemComercialSerializer(item)
        dc = serializer.data["detalle_cobro"]
        self.assertEqual(dc["estado_conversion"], "sin_tipo_cambio")
        self.assertIsNone(dc["subtotal_convertido"])

    def test_anual_con_descuento(self):
        """descuento_anual_porcentaje=10, forma_pago anual: subtotal_anual = mensual*12*0.9."""
        contrato_anual = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            nombre="Contrato Anual DC",
            forma_pago_contractual="anual",
            moneda_cobro="CLP",
        )
        item = self._crear_item(contrato_anual, moneda="CLP", precio=100, descuento=10)
        serializer = ContratoItemComercialSerializer(item)
        dc = serializer.data["detalle_cobro"]
        self.assertAlmostEqual(dc["subtotal_mensual"], 100.0, places=2)
        self.assertAlmostEqual(dc["subtotal_anual"], 1080.0, places=2)
        self.assertAlmostEqual(dc["subtotal_cobro"], 1080.0, places=2)
        self.assertEqual(dc["forma_pago_contractual"], "anual")

    def test_pago_unico(self):
        """forma_pago pago_unico: subtotal_cobro == subtotal_pago_unico."""
        contrato_unico = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            nombre="Contrato Unico DC",
            forma_pago_contractual="pago_unico",
            moneda_cobro="CLP",
        )
        item = self._crear_item(contrato_unico, moneda="CLP", precio=500, cantidad=2)
        serializer = ContratoItemComercialSerializer(item)
        dc = serializer.data["detalle_cobro"]
        self.assertEqual(dc["forma_pago_contractual"], "pago_unico")
        self.assertAlmostEqual(dc["subtotal_cobro"], dc["subtotal_pago_unico"], places=2)
        self.assertAlmostEqual(dc["subtotal_pago_unico"], 1000.0, places=2)


class NotificacionVentanaLicenciaTaskTest(TestCase):
    def setUp(self):
        self.empresa_prestadora = Empresa.objects.create(nombre="Prestadora Ventana")
        self.empresa_cliente = Empresa.objects.create(nombre="Cliente Ventana")
        self.sucursal = SucursalEmpresa.objects.create(
            nombre="Sucursal Ventana",
            empresa=self.empresa_cliente,
        )
        self.user = User.objects.create_user(
            email="firmante@test.com",
            password="testpass123",
            first_name="Firmante",
            last_name="Contrato",
        )
        self.usuario_empresa = UsuarioEmpresa.objects.create(
            usuario=self.user,
            sucursal=self.sucursal,
        )
        self.contrato = ContratoEmpresaCliente.objects.create(
            empresa_prestadora=self.empresa_prestadora,
            empresa_cliente=self.empresa_cliente,
            fecha_inicio=date.today(),
            fecha_fin=date.today() + timedelta(days=365),
            nombre="Contrato Notificacion",
            tipo="licencia",
            estado="activo",
        )
        UsuarioVinculadoContrato.objects.create(
            contrato=self.contrato,
            usuario=self.usuario_empresa,
            tipo_usuario="gerencia",
        )
        self.licencia_catalogo = Licencia.objects.create(
            nombre="Licencia Correo",
            proveedor="Microsoft",
            modalidad_base="P1Y",
        )
        self.contrato_licencia = ContratoLicencia.objects.create(
            contrato=self.contrato,
            licencia=self.licencia_catalogo,
            cantidad=5,
            fecha_inicio=date.today(),
            estado="activa",
        )

    @patch("contratos.tasks.send_email_task.delay")
    def test_tarea_envia_correo_una_vez_por_ciclo(self, mocked_delay):
        notificar_ventana_edicion_licencias()

        mocked_delay.assert_called_once()
        self.assertTrue(
            NotificacionVentanaLicencia.objects.filter(
                licencia=self.contrato_licencia,
                ciclo_inicio=date.today(),
            ).exists()
        )

        notificar_ventana_edicion_licencias()
        mocked_delay.assert_called_once()
