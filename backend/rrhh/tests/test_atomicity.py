"""
Tests para garantizar atomicidad de operaciones críticas en contratos laborales.

Valida que cambios múltiples se ejecuten juntos o no se ejecuten.
"""

from django.test import TransactionTestCase
from django.db import IntegrityError
from django.utils import timezone
from django.core.exceptions import ValidationError
from unittest.mock import patch

from rrhh.models import ContratoTrabajador, EnvioAprobacionEmpleador, AnexoContrato
from rrhh.services import RRHHContratosService
from empresas.models import UsuarioEmpresa, SucursalEmpresa, Empresa
from cuentas.models import User


class TestCambiarEstadoAVigenteAtomicity(TransactionTestCase):
    """Tests para cambiar_estado_a_vigente() - operación crítica"""

    def setUp(self):
        """Preparar datos de prueba"""
        self.empresa = Empresa.objects.create(nombre="Test Co")
        self.sucursal = SucursalEmpresa.objects.create(
            empresa=self.empresa,
            nombre="Oficina Central"
        )
        self.user_trabajador = User.objects.create_user(
            email="trabajador@empresa.com",
            first_name="Juan",
            last_name="Pérez"
        )
        self.ue = UsuarioEmpresa.objects.create(
            usuario=self.user_trabajador,
            sucursal=self.sucursal
        )
        self.user_rrhh = User.objects.create_user(
            email="rrhh@empresa.com"
        )

        self.contrato = ContratoTrabajador.objects.create(
            usuario_empresa=self.ue,
            estado="pendiente_aprobacion",
            tipo_contrato="indefinido",
            fecha_inicio="2025-06-01",
            cargo="Ingeniero",
            jornada="completa"
        )

        # Crear envío aprobado
        self.envio = EnvioAprobacionEmpleador.objects.create(
            contrato=self.contrato,
            pdf_congelado=b"pdf_data",
            enviado_a="gerente@empresa.com",
            enviado_por=self.user_rrhh,
            decision="aprobado",
            fecha_respuesta=timezone.now()
        )

    def test_cambiar_a_vigente_exito(self):
        """Test: Cambiar a vigente EXITOSAMENTE actualiza contrato + UsuarioEmpresa"""
        contrato = RRHHContratosService.cambiar_estado_a_vigente(
            contrato_id=self.contrato.id,
            usuario=self.user_rrhh
        )

        # Validar contrato
        self.assertEqual(contrato.estado, "vigente")
        self.assertEqual(contrato.aceptado_por, self.user_rrhh)
        self.assertIsNotNone(contrato.fecha_aprobacion)

        # Validar sincronización UsuarioEmpresa
        self.ue.refresh_from_db()
        self.assertEqual(self.ue.cargo, "Ingeniero")
        self.assertIsNotNone(self.ue.fecha_contrato)

    def test_cambiar_a_vigente_rollback_si_ue_falla(self):
        """
        Test CRÍTICO: Si ue.save() falla, contrato DEBE volver a pendiente
        (Atomicidad garantizada por @transaction.atomic)
        """
        with patch.object(UsuarioEmpresa, 'save', side_effect=IntegrityError("DB Error")):
            with self.assertRaises(IntegrityError):
                RRHHContratosService.cambiar_estado_a_vigente(
                    contrato_id=self.contrato.id,
                    usuario=self.user_rrhh
                )

        # Validar rollback: contrato sigue en pendiente
        self.contrato.refresh_from_db()
        self.assertEqual(self.contrato.estado, "pendiente_aprobacion")
        self.assertIsNone(self.contrato.aceptado_por)

    def test_cambiar_a_vigente_sin_aprobacion_falla(self):
        """Test: No cambia si empleador no aprobó"""
        # Cambiar decisión a rechazado
        self.envio.decision = "rechazado"
        self.envio.save()

        with self.assertRaises(ValidationError):
            RRHHContratosService.cambiar_estado_a_vigente(
                contrato_id=self.contrato.id,
                usuario=self.user_rrhh
            )

    def test_cambiar_a_vigente_estado_incorrecto_falla(self):
        """Test: No cambia si no está en pendiente_aprobacion"""
        self.contrato.estado = "borrador"
        self.contrato.save()

        with self.assertRaises(ValidationError):
            RRHHContratosService.cambiar_estado_a_vigente(
                contrato_id=self.contrato.id,
                usuario=self.user_rrhh
            )


class TestCambiarEstadoAtomicity(TransactionTestCase):
    """Tests para cambiar_estado() - máquina de estados"""

    def setUp(self):
        self.empresa = Empresa.objects.create(nombre="Test Co")
        self.sucursal = SucursalEmpresa.objects.create(
            empresa=self.empresa,
            nombre="Oficina"
        )
        self.user_rrhh = User.objects.create_user(email="rrhh@test.com")
        self.user_trab = User.objects.create_user(
            email="trab@test.com",
            first_name="Carlos",
            last_name="Ruiz"
        )
        self.ue = UsuarioEmpresa.objects.create(
            usuario=self.user_trab,
            sucursal=self.sucursal
        )
        self.contrato = ContratoTrabajador.objects.create(
            usuario_empresa=self.ue,
            estado="vigente",
            tipo_contrato="indefinido",
            fecha_inicio="2025-01-01",
            cargo="Ingeniero"
        )

    def test_terminar_contrato_exito(self):
        """Test: Terminar vigente con motivo"""
        contrato = RRHHContratosService.cambiar_estado(
            contrato_id=self.contrato.id,
            nuevo_estado="terminado",
            motivo_termino="renuncia",
            fecha_termino_real="2025-06-01",
            usuario=self.user_rrhh
        )

        self.assertEqual(contrato.estado, "terminado")
        self.assertEqual(contrato.motivo_termino, "renuncia")
        self.assertEqual(str(contrato.fecha_termino_real), "2025-06-01")

    def test_terminar_sin_motivo_falla(self):
        """Test: motivo_termino es obligatorio"""
        with self.assertRaises(ValidationError):
            RRHHContratosService.cambiar_estado(
                contrato_id=self.contrato.id,
                nuevo_estado="terminado",
                usuario=self.user_rrhh
                # motivo_termino: OMITIDO
            )

        # Validar que contrato no cambió
        self.contrato.refresh_from_db()
        self.assertEqual(self.contrato.estado, "vigente")

    def test_anular_contrato_exito(self):
        """Test: Anular vigente con motivo"""
        contrato = RRHHContratosService.cambiar_estado(
            contrato_id=self.contrato.id,
            nuevo_estado="anulado",
            motivo_anulacion="Mutuo acuerdo",
            usuario=self.user_rrhh
        )

        self.assertEqual(contrato.estado, "anulado")
        self.assertEqual(contrato.motivo_anulacion, "Mutuo acuerdo")

    def test_transicion_no_permitida_falla(self):
        """Test: Vigente no puede ir a borrador"""
        with self.assertRaises(ValidationError):
            RRHHContratosService.cambiar_estado(
                contrato_id=self.contrato.id,
                nuevo_estado="borrador",  # No permitido desde vigente
                usuario=self.user_rrhh
            )


class TestEnviarAprobacionAtomicity(TransactionTestCase):
    """Tests para enviar_a_aprobacion_empleador()"""

    def setUp(self):
        self.empresa = Empresa.objects.create(nombre="Test Co")
        self.sucursal = SucursalEmpresa.objects.create(
            empresa=self.empresa,
            nombre="Oficina"
        )
        self.user_rrhh = User.objects.create_user(email="rrhh2@test.com")
        self.user_trab = User.objects.create_user(
            email="ana@test.com",
            first_name="Ana",
            last_name="García"
        )
        self.ue = UsuarioEmpresa.objects.create(
            usuario=self.user_trab,
            sucursal=self.sucursal
        )
        self.contrato = ContratoTrabajador.objects.create(
            usuario_empresa=self.ue,
            estado="borrador",
            tipo_contrato="indefinido",
            fecha_inicio="2025-06-01",
            cargo="Ingeniero",
            jornada="completa",
            plantilla_contrato_id=None
        )

    @patch('rrhh.services._enviar_email_aprobacion_async')
    @patch('rrhh.services._generar_pdf')
    def test_enviar_aprobacion_exito(self, mock_generar, mock_email):
        """Test: Envío crea EnvioAprobacionEmpleador + cambio estado + email"""
        # Mock para simular que se generó el PDF
        from django.core.files.base import ContentFile
        pdf_content = ContentFile(b"pdf_data", name="test.pdf")

        def side_effect_generar(contrato, persistir=False):
            if persistir:
                contrato.archivo_pdf.save("test.pdf", pdf_content, save=True)
            return b"pdf_data"

        mock_generar.side_effect = side_effect_generar

        envio = RRHHContratosService.enviar_a_aprobacion_empleador(
            contrato_id=self.contrato.id,
            email_empleador="gerente@empresa.com",
            usuario=self.user_rrhh
        )

        # Validar envío creado
        self.assertEqual(envio.enviado_a, "gerente@empresa.com")
        self.assertEqual(envio.decision, "pendiente")

        # Validar contrato cambió estado
        self.contrato.refresh_from_db()
        self.assertEqual(self.contrato.estado, "pendiente_aprobacion")

        # Validar email scheduled
        mock_email.assert_called_once()

    def test_enviar_aprobacion_no_en_borrador_falla(self):
        """Test: Solo borrador puede enviarse"""
        self.contrato.estado = "vigente"
        self.contrato.save()

        with self.assertRaises(ValidationError):
            RRHHContratosService.enviar_a_aprobacion_empleador(
                contrato_id=self.contrato.id,
                email_empleador="gerente@empresa.com",
                usuario=self.user_rrhh
            )

    @patch('rrhh.services._generar_pdf')
    def test_enviar_aprobacion_rollback_si_falla(self, mock_generar):
        """Test CRÍTICO: Si PDF generation falla, EnvioAprobacionEmpleador se elimina"""
        mock_generar.side_effect = Exception("PDF Error")

        with self.assertRaises(ValidationError):
            RRHHContratosService.enviar_a_aprobacion_empleador(
                contrato_id=self.contrato.id,
                email_empleador="gerente@empresa.com",
                usuario=self.user_rrhh
            )

        # Validar rollback: no hay envío creado
        self.assertFalse(EnvioAprobacionEmpleador.objects.filter(
            contrato_id=self.contrato.id
        ).exists())

        # Contrato sigue en borrador
        self.contrato.refresh_from_db()
        self.assertEqual(self.contrato.estado, "borrador")


class TestCrearAnexoAtomicity(TransactionTestCase):
    """Tests para crear_anexo()"""

    def setUp(self):
        self.empresa = Empresa.objects.create(nombre="Test Co")
        self.sucursal = SucursalEmpresa.objects.create(
            empresa=self.empresa,
            nombre="Oficina"
        )
        self.user_rrhh = User.objects.create_user(email="rrhh3@test.com")
        self.user_trab = User.objects.create_user(
            email="pedro@test.com",
            first_name="Pedro",
            last_name="López"
        )
        self.ue = UsuarioEmpresa.objects.create(
            usuario=self.user_trab,
            sucursal=self.sucursal
        )
        self.contrato = ContratoTrabajador.objects.create(
            usuario_empresa=self.ue,
            estado="vigente",
            tipo_contrato="indefinido",
            fecha_inicio="2025-01-01",
            fecha_termino="2026-01-01",
            cargo="Ingeniero"
        )

    def test_crear_anexo_vigente_exito(self):
        """Test: Crear anexo en contrato vigente"""
        anexo = RRHHContratosService.crear_anexo(
            contrato_id=self.contrato.id,
            tipo="modificacion_sueldo",
            fecha_efectiva="2025-06-01",
            descripcion="Aumento de sueldo",
            usuario=self.user_rrhh
        )

        self.assertEqual(anexo.contrato_id, self.contrato.id)
        self.assertEqual(anexo.tipo, "modificacion_sueldo")
        self.assertEqual(anexo.estado, "borrador")

    def test_crear_anexo_no_vigente_falla(self):
        """Test: Anexo solo en vigente"""
        self.contrato.estado = "borrador"
        self.contrato.save()

        with self.assertRaises(ValidationError):
            RRHHContratosService.crear_anexo(
                contrato_id=self.contrato.id,
                tipo="modificacion_sueldo",
                fecha_efectiva="2025-06-01",
                descripcion="Aumento",
                usuario=self.user_rrhh
            )

    def test_crear_anexo_prorroga_actualiza_fecha(self):
        """Test: Prórroga actualiza fecha_termino del contrato"""
        nueva_fecha = "2027-01-01"

        anexo = RRHHContratosService.crear_anexo(
            contrato_id=self.contrato.id,
            tipo="prorroga",
            fecha_efectiva="2025-12-15",
            descripcion="Prórroga 1 año",
            usuario=self.user_rrhh,
            nueva_fecha_termino=nueva_fecha
        )

        self.contrato.refresh_from_db()
        self.assertEqual(str(self.contrato.fecha_termino), nueva_fecha)
