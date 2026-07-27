"""Tests unitarios para notificaciones/services.py.

Estrategia:
- Se mockea `notificaciones.tasks.send_fcm_push_task` (Celery task).
  _disparar() hace `from .tasks import send_fcm_push_task` en cada llamada,
  por lo que parchear el atributo del modulo es suficiente.
- Cada test verifica:
    1. Happy path: delay() se llama con los argumentos correctos.
    2. Gating desactivado: ConfiguracionNotificacionEmpresa(activo=False) -> sin llamada.
    3. Sin destinatarios: grupo vacio -> sin llamada.
    4. Exclusion del actor: actor en grupo -> NO aparece en usuario_ids.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.contrib.auth.models import Group
from django.test import TestCase

from core.factories import crear_usuario_en_rol
from cuentas.models import User
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa
from notificaciones.models import ConfiguracionNotificacionEmpresa, Notificacion, TipoEventoNotificacion
from notificaciones.serializers import NotificacionSerializer
from notificaciones.services import (
    GRUPO_BODEGA,
    GRUPO_CONTRATOS,
    GRUPO_FINANZAS,
    GRUPO_OPERACIONES,
    GRUPO_RRHH,
    GRUPO_TECNICO,
    notificar_contrato_activado,
    notificar_contrato_factura_generada,
    notificar_contrato_resolucion_cliente,
    notificar_cotizacion_aprobada,
    notificar_cotizacion_por_vencer,
    notificar_cotizacion_rechazada,
    notificar_guia_salida_hito,
    notificar_oc_mercaderia_recibida,
    notificar_ot_asignada_tecnico,
    notificar_ot_cambio_estado,
    notificar_ot_cerrada_facturada,
    notificar_rendicion_actualizada,
    notificar_rendicion_pendiente_aprobacion,
    notificar_retroalimentacion_plazo_vencido,
    notificar_vacaciones_resolucion,
    notificar_vacaciones_solicitud_creada,
    notificar_visita_asignada,
)

PATCH_TASK = "notificaciones.tasks.send_fcm_push_task"


# ---------------------------------------------------------------------------
# Fixture base compartida
# ---------------------------------------------------------------------------

class NotificacionesTestBase(TestCase):
    """Crea la infra minima: empresa, sucursal, usuarios con grupos."""

    @classmethod
    def setUpTestData(cls):
        # Grupos requeridos
        nombres_grupos = [
            GRUPO_TECNICO, GRUPO_OPERACIONES, GRUPO_FINANZAS, GRUPO_RRHH,
            GRUPO_CONTRATOS, GRUPO_BODEGA, "ventas", "comprador", "contabilidad",
        ]
        cls.grupos = {n: Group.objects.get_or_create(name=n)[0] for n in nombres_grupos}

        # Empresa y sucursal
        cls.empresa = Empresa.objects.create(
            nombre="TestCorp SA", direccion_principal="Av. Siempre Viva 1"
        )
        cls.sucursal = SucursalEmpresa.objects.create(
            nombre="Casa Matriz", empresa=cls.empresa
        )

        # Usuario actor (quien dispara la accion â€” debe ser excluido)
        cls.actor = User.objects.create_user(email="actor@test.com", password="x", is_active=True)

        # Helpers para crear usuarios en rol
        cls.users = {}
        cls.ues = {}

    @classmethod
    def _crear_usuario_en_rol(cls, sufijo: str, grupo_nombre: str) -> tuple[User, UsuarioEmpresa]:
        return crear_usuario_en_rol(cls.sucursal, grupo_nombre, sufijo)

    def _deshabilitar_tipo(self, tipo: str):
        """Inserta registro de gating desactivado para la empresa del test."""
        ConfiguracionNotificacionEmpresa.objects.create(
            empresa=self.empresa, tipo=tipo, activo=False
        )

    def assertDelayCalled(self, mock_task, tipo: str, expected_user_ids: list[int]):
        """Verifica que delay() fue llamado una vez y que los destinatarios son los esperados."""
        mock_task.delay.assert_called_once()
        kwargs = mock_task.delay.call_args.kwargs
        # delay puede llamarse con args posicionales segun la firma de la task
        call_args = mock_task.delay.call_args
        usuario_ids = (
            kwargs.get("usuario_ids")
            or (call_args.args[0] if call_args.args else None)
        )
        self.assertIsNotNone(usuario_ids, "usuario_ids no encontrado en llamada a delay()")
        self.assertEqual(
            set(usuario_ids), set(expected_user_ids),
            f"usuario_ids esperados: {expected_user_ids}, recibidos: {usuario_ids}",
        )
        tipo_enviado = kwargs.get("tipo") or (call_args.args[1] if len(call_args.args) > 1 else None)
        self.assertEqual(tipo_enviado, tipo)

    def assertDelayNotCalled(self, mock_task):
        mock_task.delay.assert_not_called()


class TestNotificacionSerializer(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(email="invalidtipo@test.com", password="x", is_active=True)
        cls.notificacion = Notificacion.objects.create(
            usuario=cls.user,
            tipo="TEST",
            titulo="Notificación inválida",
            cuerpo="Contenido de prueba",
        )

    def test_tipo_label_invalid_value_does_not_raise(self):
        serializer = NotificacionSerializer(instance=self.notificacion)
        self.assertEqual(serializer.data["tipo_label"], "TEST")


# ---------------------------------------------------------------------------
# N1 â€” notificar_ot_asignada_tecnico
# ---------------------------------------------------------------------------

class TestNotificarOtAsignadaTecnico(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.tecnico, cls.ue_tecnico = cls._crear_usuario_en_rol("tecnico1", GRUPO_TECNICO)
        cls.ot = SimpleNamespace(id=10, empresa=cls.empresa)

    @patch(PATCH_TASK)
    def test_happy_path_notifica_tecnico(self, mock_task):
        notificar_ot_asignada_tecnico(
            self.ot, tecnico_user_id=self.tecnico.id, usuario_actor=self.actor
        )
        self.assertDelayCalled(
            mock_task,
            TipoEventoNotificacion.OT_ASIGNADA_TECNICO.value,
            [self.tecnico.id],
        )

    @patch(PATCH_TASK)
    def test_gating_desactivado(self, mock_task):
        self._deshabilitar_tipo(TipoEventoNotificacion.OT_ASIGNADA_TECNICO.value)
        notificar_ot_asignada_tecnico(
            self.ot, tecnico_user_id=self.tecnico.id, usuario_actor=self.actor
        )
        self.assertDelayNotCalled(mock_task)

    @patch(PATCH_TASK)
    def test_actor_excluido(self, mock_task):
        """Si el actor es el mismo que el tecnico, no debe recibir notificacion."""
        notificar_ot_asignada_tecnico(
            self.ot, tecnico_user_id=self.actor.id, usuario_actor=self.actor
        )
        self.assertDelayNotCalled(mock_task)

    @patch(PATCH_TASK)
    def test_sin_empresa(self, mock_task):
        ot = SimpleNamespace(id=99, empresa=None)
        notificar_ot_asignada_tecnico(
            ot, tecnico_user_id=self.tecnico.id, usuario_actor=self.actor
        )
        self.assertDelayNotCalled(mock_task)


# ---------------------------------------------------------------------------
# N10 â€” notificar_ot_cambio_estado (transicion completada -> cerrada)
# ---------------------------------------------------------------------------

class TestNotificarOtCambioEstado(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user_ops, _ = cls._crear_usuario_en_rol("ops1", GRUPO_OPERACIONES)
        cls.user_fin, _ = cls._crear_usuario_en_rol("fin1", GRUPO_FINANZAS)
        cls.ot = SimpleNamespace(id=20, empresa=cls.empresa, tecnico_responsable_ot=None, tecnico_responsable=None)

    @patch(PATCH_TASK)
    def test_completada_cerrada_notifica_operaciones(self, mock_task):
        notificar_ot_cambio_estado(
            self.ot, estado_anterior="completada", estado_nuevo="cerrada",
            usuario_actor=self.actor
        )
        mock_task.delay.assert_called_once()
        call = mock_task.delay.call_args
        ids = call.kwargs.get("usuario_ids") or (call.args[0] if call.args else [])
        self.assertIn(self.user_ops.id, ids)
        self.assertNotIn(self.user_fin.id, ids)

    @patch(PATCH_TASK)
    def test_en_proceso_completada_notifica_operaciones(self, mock_task):
        notificar_ot_cambio_estado(
            self.ot, estado_anterior="en_proceso", estado_nuevo="completada",
            usuario_actor=self.actor
        )
        mock_task.delay.assert_called_once()
        call = mock_task.delay.call_args
        ids = call.kwargs.get("usuario_ids") or (call.args[0] if call.args else [])
        self.assertIn(self.user_ops.id, ids)

    @patch(PATCH_TASK)
    def test_gating_desactivado(self, mock_task):
        self._deshabilitar_tipo(TipoEventoNotificacion.OT_CAMBIO_ESTADO.value)
        notificar_ot_cambio_estado(
            self.ot, estado_anterior="completada", estado_nuevo="cerrada",
            usuario_actor=self.actor
        )
        self.assertDelayNotCalled(mock_task)

    @patch(PATCH_TASK)
    def test_transicion_no_mapeada_sin_llamada(self, mock_task):
        notificar_ot_cambio_estado(
            self.ot, estado_anterior="pendiente", estado_nuevo="pendiente",
            usuario_actor=self.actor
        )
        self.assertDelayNotCalled(mock_task)


# ---------------------------------------------------------------------------
# N11 â€” notificar_ot_cerrada_facturada
# ---------------------------------------------------------------------------

class TestNotificarOtCerradaFacturada(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user_fin, _ = cls._crear_usuario_en_rol("fin2", GRUPO_FINANZAS)
        cls.user_ops, _ = cls._crear_usuario_en_rol("ops_n11", GRUPO_OPERACIONES)
        cls.ot = SimpleNamespace(id=30, empresa=cls.empresa)

    @patch(PATCH_TASK)
    def test_notifica_finanzas_y_operaciones(self, mock_task):
        notificar_ot_cerrada_facturada(self.ot, usuario_actor=self.actor)
        self.assertEqual(mock_task.delay.call_count, 2)
        todos_ids = []
        for call in mock_task.delay.call_args_list:
            ids = call.kwargs.get("usuario_ids") or (call.args[0] if call.args else [])
            todos_ids.extend(ids)
        self.assertIn(self.user_fin.id, todos_ids)
        self.assertIn(self.user_ops.id, todos_ids)

    @patch(PATCH_TASK)
    def test_gating_desactivado(self, mock_task):
        self._deshabilitar_tipo(TipoEventoNotificacion.OT_CERRADA_FACTURADA.value)
        notificar_ot_cerrada_facturada(self.ot, usuario_actor=self.actor)
        self.assertDelayNotCalled(mock_task)


# ---------------------------------------------------------------------------
# N2 â€” notificar_cotizacion_aprobada
# ---------------------------------------------------------------------------

class TestNotificarCotizacionAprobada(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user_ventas, _ = cls._crear_usuario_en_rol("ventas1", "ventas")
        cls.cotizacion = SimpleNamespace(id=40, empresa=cls.empresa, numero_cotizacion=None)

    @patch(PATCH_TASK)
    def test_notifica_ventas(self, mock_task):
        notificar_cotizacion_aprobada(self.cotizacion, usuario_actor=self.actor)
        self.assertDelayCalled(
            mock_task, TipoEventoNotificacion.COTIZACION_APROBADA.value, [self.user_ventas.id]
        )

    @patch(PATCH_TASK)
    def test_gating_desactivado(self, mock_task):
        self._deshabilitar_tipo(TipoEventoNotificacion.COTIZACION_APROBADA.value)
        notificar_cotizacion_aprobada(self.cotizacion)
        self.assertDelayNotCalled(mock_task)

    @patch(PATCH_TASK)
    def test_actor_en_ventas_excluido(self, mock_task):
        """Actor pertenece al grupo ventas -> debe ser excluido."""
        ue_actor = UsuarioEmpresa.objects.create(usuario=self.actor, sucursal=self.sucursal)
        ue_actor.grupos.add(self.grupos["ventas"])
        notificar_cotizacion_aprobada(self.cotizacion, usuario_actor=self.actor)
        call = mock_task.delay.call_args
        if call:
            ids = call.kwargs.get("usuario_ids") or (call.args[0] if call.args else [])
            self.assertNotIn(self.actor.id, ids)
        ue_actor.delete()


# ---------------------------------------------------------------------------
# N3 â€” notificar_cotizacion_rechazada
# ---------------------------------------------------------------------------

class TestNotificarCotizacionRechazada(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user_ventas, _ = cls._crear_usuario_en_rol("ventas2", "ventas")
        cls.cotizacion = SimpleNamespace(id=41, empresa=cls.empresa, numero_cotizacion=None)

    @patch(PATCH_TASK)
    def test_notifica_ventas(self, mock_task):
        notificar_cotizacion_rechazada(self.cotizacion, usuario_actor=self.actor)
        self.assertDelayCalled(
            mock_task, TipoEventoNotificacion.COTIZACION_RECHAZADA.value, [self.user_ventas.id]
        )


# ---------------------------------------------------------------------------
# N4 â€” notificar_cotizacion_por_vencer
# ---------------------------------------------------------------------------

class TestNotificarCotizacionPorVencer(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user_ventas, _ = cls._crear_usuario_en_rol("ventas3", "ventas")
        cls.cotizacion = SimpleNamespace(id=42, empresa=cls.empresa, numero_cotizacion=None, fecha_vencimiento=None, save=lambda **kw: None)

    @patch(PATCH_TASK)
    def test_notifica_ventas(self, mock_task):
        notificar_cotizacion_por_vencer(self.cotizacion)
        self.assertDelayCalled(
            mock_task, TipoEventoNotificacion.COTIZACION_POR_VENCER.value, [self.user_ventas.id]
        )

    @patch(PATCH_TASK)
    def test_grupo_vacio_sin_llamada(self, mock_task):
        """Si no hay usuarios en ventas, no debe llamar delay."""
        empresa2 = Empresa.objects.create(nombre="OtrosCorp", direccion_principal="X")
        cot2 = SimpleNamespace(id=43, empresa=empresa2, numero_cotizacion=None, fecha_vencimiento=None, save=lambda **kw: None)
        notificar_cotizacion_por_vencer(cot2)
        self.assertDelayNotCalled(mock_task)


# ---------------------------------------------------------------------------
# N5 â€” notificar_rendicion_pendiente_aprobacion
# ---------------------------------------------------------------------------

class TestNotificarRendicionPendienteAprobacion(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user_fin, _ = cls._crear_usuario_en_rol("fin3", GRUPO_FINANZAS)
        _ue_fin_stub = SimpleNamespace(sucursal=cls.sucursal)
        cls.rendicion = SimpleNamespace(id=50, usuario=_ue_fin_stub)

    @patch(PATCH_TASK)
    def test_notifica_finanzas(self, mock_task):
        notificar_rendicion_pendiente_aprobacion(self.rendicion, usuario_actor=self.actor)
        self.assertDelayCalled(
            mock_task, TipoEventoNotificacion.RENDICION_PENDIENTE_APROBACION.value, [self.user_fin.id]
        )

    @patch(PATCH_TASK)
    def test_gating_desactivado(self, mock_task):
        self._deshabilitar_tipo(TipoEventoNotificacion.RENDICION_PENDIENTE_APROBACION.value)
        notificar_rendicion_pendiente_aprobacion(self.rendicion)
        self.assertDelayNotCalled(mock_task)


# ---------------------------------------------------------------------------
# N6 â€” notificar_rendicion_actualizada (notifica al solicitante)
# ---------------------------------------------------------------------------

class TestNotificarRendicionActualizada(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user_sol = User.objects.create_user(email="sol1@test.com", password="x", is_active=True)
        cls.ue_sol = UsuarioEmpresa.objects.create(
            usuario=cls.user_sol, sucursal=cls.sucursal
        )
        # service accede rendicion.usuario.sucursal.empresa y rendicion.usuario.usuario_id
        # donde rendicion.usuario es el UsuarioEmpresa (FK en el modelo Rendicion)
        cls.rendicion = SimpleNamespace(
            id=51,
            usuario=cls.ue_sol,
        )

    @patch(PATCH_TASK)
    def test_notifica_solicitante_rechazada(self, mock_task):
        notificar_rendicion_actualizada(self.rendicion, accion="rechazada", usuario_actor=self.actor)
        self.assertDelayCalled(
            mock_task, TipoEventoNotificacion.RENDICION_ACTUALIZADA.value, [self.user_sol.id]
        )


# ---------------------------------------------------------------------------
# N8 â€” notificar_oc_mercaderia_recibida (notifica al creador de la OC)
# ---------------------------------------------------------------------------

class TestNotificarOcMercaderiaRecibida(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user_comp = User.objects.create_user(email="comp1@test.com", password="x", is_active=True)
        cls.ue_comp = UsuarioEmpresa.objects.create(usuario=cls.user_comp, sucursal=cls.sucursal)
        cls.orden = SimpleNamespace(
            id=60,
            oc_empresa=cls.empresa,
            creado_por=cls.ue_comp,
        )

    @patch(PATCH_TASK)
    def test_notifica_creador(self, mock_task):
        notificar_oc_mercaderia_recibida(self.orden, usuario_actor=self.actor)
        self.assertDelayCalled(
            mock_task, TipoEventoNotificacion.OC_MERCADERIA_RECIBIDA.value, [self.user_comp.id]
        )

    @patch(PATCH_TASK)
    def test_creador_es_actor_excluido(self, mock_task):
        orden = SimpleNamespace(id=61, oc_empresa=self.empresa, creado_por=SimpleNamespace(usuario=self.actor))
        notificar_oc_mercaderia_recibida(orden, usuario_actor=self.actor)
        self.assertDelayNotCalled(mock_task)

    @patch(PATCH_TASK)
    def test_gating_desactivado(self, mock_task):
        self._deshabilitar_tipo(TipoEventoNotificacion.OC_MERCADERIA_RECIBIDA.value)
        notificar_oc_mercaderia_recibida(self.orden, usuario_actor=self.actor)
        self.assertDelayNotCalled(mock_task)


# ---------------------------------------------------------------------------
# N23 â€” notificar_guia_salida_hito (notifica a grupo bodega)
# ---------------------------------------------------------------------------

class TestNotificarGuiaSalidaHito(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user_bod, _ = cls._crear_usuario_en_rol("bod1", GRUPO_BODEGA)
        # guia.bodega.sucursal.empresa
        sucursal_stub = SimpleNamespace(empresa=cls.empresa)
        bodega_stub = SimpleNamespace(sucursal=sucursal_stub)
        cls.guia = SimpleNamespace(id=70, bodega=bodega_stub)

    @patch(PATCH_TASK)
    def test_hito_aprobada_notifica_bodega(self, mock_task):
        notificar_guia_salida_hito(self.guia, hito="aprobada", usuario_actor=self.actor)
        self.assertDelayCalled(
            mock_task, TipoEventoNotificacion.GUIA_SALIDA_HITO.value, [self.user_bod.id]
        )

    @patch(PATCH_TASK)
    def test_destinatarios_directos(self, mock_task):
        """Con destinatarios_user_ids se bypasea la resolucion por grupo."""
        user_extra = User.objects.create_user(email="extra1@test.com", password="x", is_active=True)
        notificar_guia_salida_hito(
            self.guia, hito="devuelta",
            destinatarios_user_ids=[user_extra.id],
            usuario_actor=self.actor,
        )
        self.assertDelayCalled(
            mock_task, TipoEventoNotificacion.GUIA_SALIDA_HITO.value, [user_extra.id]
        )

    @patch(PATCH_TASK)
    def test_gating_desactivado(self, mock_task):
        self._deshabilitar_tipo(TipoEventoNotificacion.GUIA_SALIDA_HITO.value)
        notificar_guia_salida_hito(self.guia, hito="aprobada", usuario_actor=self.actor)
        self.assertDelayNotCalled(mock_task)


# ---------------------------------------------------------------------------
# N12 â€” notificar_vacaciones_solicitud_creada
# ---------------------------------------------------------------------------

class TestNotificarVacacionesSolicitudCreada(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user_rrhh_v, _ = cls._crear_usuario_en_rol("rrhh1", GRUPO_RRHH)
        sucursal_stub = SimpleNamespace(empresa=cls.empresa)
        ue_stub = SimpleNamespace(sucursal=sucursal_stub)
        import datetime
        cls.solicitud = SimpleNamespace(
            id=80,
            usuario_empresa=ue_stub,
            fecha_inicio=datetime.date(2026, 8, 1),
            fecha_fin=datetime.date(2026, 8, 10),
        )

    @patch(PATCH_TASK)
    def test_notifica_rrhh(self, mock_task):
        notificar_vacaciones_solicitud_creada(self.solicitud, usuario_actor=self.actor)
        self.assertDelayCalled(
            mock_task, TipoEventoNotificacion.VACACIONES_SOLICITUD_CREADA.value, [self.user_rrhh_v.id]
        )

    @patch(PATCH_TASK)
    def test_gating_desactivado(self, mock_task):
        self._deshabilitar_tipo(TipoEventoNotificacion.VACACIONES_SOLICITUD_CREADA.value)
        notificar_vacaciones_solicitud_creada(self.solicitud)
        self.assertDelayNotCalled(mock_task)


# ---------------------------------------------------------------------------
# N13 â€” notificar_vacaciones_resolucion (infiere accion desde solicitud.estado)
# ---------------------------------------------------------------------------

class TestNotificarVacacionesResolucion(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user_sol = User.objects.create_user(email="sol2@test.com", password="x", is_active=True)
        cls.ue_sol = UsuarioEmpresa.objects.create(usuario=cls.user_sol, sucursal=cls.sucursal)
        sucursal_stub = SimpleNamespace(empresa=cls.empresa)
        ue_stub = SimpleNamespace(sucursal=sucursal_stub, usuario_id=cls.user_sol.id)
        import datetime
        cls.solicitud_aprobada = SimpleNamespace(
            id=81, estado="2", usuario_empresa=ue_stub,
            fecha_inicio=datetime.date(2026, 8, 1), fecha_fin=datetime.date(2026, 8, 10),
        )
        cls.solicitud_rechazada = SimpleNamespace(
            id=82, estado="3", usuario_empresa=ue_stub,
            fecha_inicio=datetime.date(2026, 8, 1), fecha_fin=datetime.date(2026, 8, 10),
        )

    @patch(PATCH_TASK)
    def test_aprobada_notifica_solicitante(self, mock_task):
        notificar_vacaciones_resolucion(self.solicitud_aprobada, usuario_actor=self.actor)
        mock_task.delay.assert_called_once()

    @patch(PATCH_TASK)
    def test_rechazada_notifica_solicitante(self, mock_task):
        notificar_vacaciones_resolucion(self.solicitud_rechazada, usuario_actor=self.actor)
        mock_task.delay.assert_called_once()

    @patch(PATCH_TASK)
    def test_accion_explicita(self, mock_task):
        """accion puede pasarse explicitamente."""
        notificar_vacaciones_resolucion(
            self.solicitud_aprobada, accion="aprobada con dias extra", usuario_actor=self.actor
        )
        mock_task.delay.assert_called_once()

    @patch(PATCH_TASK)
    def test_gating_desactivado(self, mock_task):
        self._deshabilitar_tipo(TipoEventoNotificacion.VACACIONES_RESOLUCION.value)
        notificar_vacaciones_resolucion(self.solicitud_aprobada)
        self.assertDelayNotCalled(mock_task)


# ---------------------------------------------------------------------------
# N14 â€” notificar_visita_asignada
# ---------------------------------------------------------------------------

class TestNotificarVisitaAsignada(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user_tec = User.objects.create_user(email="tec2@test.com", password="x", is_active=True)
        cls.visita = SimpleNamespace(id=90, empresa=cls.empresa)

    @patch(PATCH_TASK)
    def test_notifica_tecnico_directo(self, mock_task):
        notificar_visita_asignada(
            self.visita, tecnico_user_id=self.user_tec.id, usuario_actor=self.actor
        )
        self.assertDelayCalled(
            mock_task, TipoEventoNotificacion.VISITA_ASIGNADA.value, [self.user_tec.id]
        )

    @patch(PATCH_TASK)
    def test_tecnico_es_actor_excluido(self, mock_task):
        notificar_visita_asignada(
            self.visita, tecnico_user_id=self.actor.id, usuario_actor=self.actor
        )
        self.assertDelayNotCalled(mock_task)

    @patch(PATCH_TASK)
    def test_gating_desactivado(self, mock_task):
        self._deshabilitar_tipo(TipoEventoNotificacion.VISITA_ASIGNADA.value)
        notificar_visita_asignada(
            self.visita, tecnico_user_id=self.user_tec.id, usuario_actor=self.actor
        )
        self.assertDelayNotCalled(mock_task)


# ---------------------------------------------------------------------------
# N17 â€” notificar_contrato_resolucion_cliente
# ---------------------------------------------------------------------------

class TestNotificarContratoResolucionCliente(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user_cont, _ = cls._crear_usuario_en_rol("cont1", GRUPO_CONTRATOS)
        cls.contrato = SimpleNamespace(id=100, nombre="Contrato Anual", empresa_prestadora=cls.empresa)

    @patch(PATCH_TASK)
    def test_notifica_contratos(self, mock_task):
        notificar_contrato_resolucion_cliente(
            self.contrato, accion="firmado", usuario_actor=self.actor
        )
        self.assertDelayCalled(
            mock_task, TipoEventoNotificacion.CONTRATO_RESOLUCION_CLIENTE.value, [self.user_cont.id]
        )

    @patch(PATCH_TASK)
    def test_gating_desactivado(self, mock_task):
        self._deshabilitar_tipo(TipoEventoNotificacion.CONTRATO_RESOLUCION_CLIENTE.value)
        notificar_contrato_resolucion_cliente(self.contrato, accion="firmado")
        self.assertDelayNotCalled(mock_task)


# ---------------------------------------------------------------------------
# N18 â€” notificar_contrato_activado (notifica contratos + finanzas, 2 llamadas)
# ---------------------------------------------------------------------------

class TestNotificarContratoActivado(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user_cont, _ = cls._crear_usuario_en_rol("cont2", GRUPO_CONTRATOS)
        cls.user_fin, _ = cls._crear_usuario_en_rol("fin4", GRUPO_FINANZAS)
        cls.contrato = SimpleNamespace(id=101, nombre="Contrato SaaS", empresa_prestadora=cls.empresa)

    @patch(PATCH_TASK)
    def test_notifica_contratos_y_finanzas(self, mock_task):
        notificar_contrato_activado(self.contrato, usuario_actor=self.actor)
        self.assertEqual(mock_task.delay.call_count, 2)
        todos_ids = []
        for call in mock_task.delay.call_args_list:
            ids = call.kwargs.get("usuario_ids") or (call.args[0] if call.args else [])
            todos_ids.extend(ids)
        self.assertIn(self.user_cont.id, todos_ids)
        self.assertIn(self.user_fin.id, todos_ids)

    @patch(PATCH_TASK)
    def test_gating_desactivado(self, mock_task):
        self._deshabilitar_tipo(TipoEventoNotificacion.CONTRATO_ACTIVADO.value)
        notificar_contrato_activado(self.contrato)
        self.assertDelayNotCalled(mock_task)


# ---------------------------------------------------------------------------
# N19 â€” notificar_contrato_factura_generada
# ---------------------------------------------------------------------------

class TestNotificarContratoFacturaGenerada(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user_fin, _ = cls._crear_usuario_en_rol("fin5", GRUPO_FINANZAS)
        contrato_stub = SimpleNamespace(id=102, empresa_prestadora=cls.empresa)
        cls.factura = SimpleNamespace(id=200, contrato=contrato_stub)

    @patch(PATCH_TASK)
    def test_notifica_finanzas(self, mock_task):
        notificar_contrato_factura_generada(self.factura)
        self.assertDelayCalled(
            mock_task, TipoEventoNotificacion.CONTRATO_FACTURA_GENERADA.value, [self.user_fin.id]
        )

    @patch(PATCH_TASK)
    def test_gating_desactivado(self, mock_task):
        self._deshabilitar_tipo(TipoEventoNotificacion.CONTRATO_FACTURA_GENERADA.value)
        notificar_contrato_factura_generada(self.factura)
        self.assertDelayNotCalled(mock_task)


# ---------------------------------------------------------------------------
# N20 â€” notificar_retroalimentacion_plazo_vencido
# ---------------------------------------------------------------------------

class TestNotificarRetroalimentacionPlazoVencido(NotificacionesTestBase):

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user_tec = User.objects.create_user(email="tec3@test.com", password="x", is_active=True)
        cls.user_ops, _ = cls._crear_usuario_en_rol("ops2", GRUPO_OPERACIONES)
        otv3_stub = SimpleNamespace(
            id=110,
            empresa=cls.empresa,
            tecnico_responsable=cls.user_tec,
        )
        cls.retro = SimpleNamespace(id=300, orden_trabajo_v3=otv3_stub)

    @patch(PATCH_TASK)
    def test_notifica_tecnico_y_operaciones(self, mock_task):
        notificar_retroalimentacion_plazo_vencido(self.retro)
        # 2 llamadas: tecnico (directo) + operaciones (grupo)
        self.assertEqual(mock_task.delay.call_count, 2)
        todos_ids = []
        for call in mock_task.delay.call_args_list:
            ids = call.kwargs.get("usuario_ids") or (call.args[0] if call.args else [])
            todos_ids.extend(ids)
        self.assertIn(self.user_tec.id, todos_ids)
        self.assertIn(self.user_ops.id, todos_ids)

    @patch(PATCH_TASK)
    def test_sin_otv3_sin_llamada(self, mock_task):
        retro = SimpleNamespace(id=301, orden_trabajo_v3=None)
        notificar_retroalimentacion_plazo_vencido(retro)
        self.assertDelayNotCalled(mock_task)

    @patch(PATCH_TASK)
    def test_gating_desactivado(self, mock_task):
        self._deshabilitar_tipo(TipoEventoNotificacion.RETROALIMENTACION_PLAZO_VENCIDO.value)
        notificar_retroalimentacion_plazo_vencido(self.retro)
        self.assertDelayNotCalled(mock_task)


# ---------------------------------------------------------------------------
# Tests de gating: esta_activo()
# ---------------------------------------------------------------------------

class TestConfiguracionNotificacionEmpresaGating(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.empresa = Empresa.objects.create(
            nombre="GatingCorp", direccion_principal="X"
        )

    def test_sin_registro_activo_por_defecto(self):
        self.assertTrue(
            ConfiguracionNotificacionEmpresa.esta_activo(
                self.empresa, TipoEventoNotificacion.OT_ASIGNADA_TECNICO.value
            )
        )

    def test_registro_activo_false_deshabilita(self):
        ConfiguracionNotificacionEmpresa.objects.create(
            empresa=self.empresa,
            tipo=TipoEventoNotificacion.OT_ASIGNADA_TECNICO.value,
            activo=False,
        )
        self.assertFalse(
            ConfiguracionNotificacionEmpresa.esta_activo(
                self.empresa, TipoEventoNotificacion.OT_ASIGNADA_TECNICO.value
            )
        )

    def test_registro_activo_true_habilita(self):
        ConfiguracionNotificacionEmpresa.objects.create(
            empresa=self.empresa,
            tipo=TipoEventoNotificacion.COTIZACION_APROBADA.value,
            activo=True,
        )
        self.assertTrue(
            ConfiguracionNotificacionEmpresa.esta_activo(
                self.empresa, TipoEventoNotificacion.COTIZACION_APROBADA.value
            )
        )

    def test_empresa_none_retorna_false(self):
        self.assertFalse(
            ConfiguracionNotificacionEmpresa.esta_activo(None, TipoEventoNotificacion.OT_ASIGNADA_TECNICO.value)
        )

