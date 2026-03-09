from django.test import TestCase
from datetime import date, timedelta
from contratos.models import (
    ContratoEmpresaCliente,
    ContratoVisita,
    ContratoLicencia,
    ContratoCondicionEspecial,
    UsuarioVinculadoContrato,
    Servicio,
    Visita,
    Licencia,
    CondicionEspecial,
)
from empresas.models import Empresa, SucursalEmpresa


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
        """El constraint de BD impide fecha_fin < fecha_inicio."""
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
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
