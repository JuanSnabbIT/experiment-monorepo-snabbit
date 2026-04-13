from datetime import timedelta

from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from cuentas.models import User
from core.models import PreguntaEnRetroalimentacion
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa
from ordentrabajov3.estados_modelo import ESTADO_POR_FACTURAR, ESTADO_RETROALIMENTACION
from ordentrabajov3.models import OrdenDeTrabajoV3
from retroalimentacion.models import (
    LogDeAccesoRetroalimentacion,
    Retroalimentacion,
    RetroalimentacionAplicada,
)


class PublicRetroalimentacionOTV3Test(APITestCase):
    def setUp(self):
        super().setUp()

        self.empresa_prestadora = Empresa.objects.create(
            nombre="Prestador",
            direccion_principal="Calle 123",
        )
        self.empresa_cliente = Empresa.objects.create(
            nombre="Cliente",
            direccion_principal="Av. 456",
        )

        self.sucursal_cliente = SucursalEmpresa.objects.create(
            nombre="Casa matriz",
            empresa=self.empresa_cliente,
        )

        self.user_cliente = User.objects.create_user(
            email="cliente@test.com",
            password="testpass123",
            first_name="Cliente",
            last_name="Test",
        )
        self.usuario_empresa_cliente = UsuarioEmpresa.objects.create(
            usuario=self.user_cliente,
            sucursal=self.sucursal_cliente,
        )

        self.user_tecnico = User.objects.create_user(
            email="tecnico@test.com",
            password="testpass123",
            first_name="Tecnico",
            last_name="Test",
        )

        self.otv3 = OrdenDeTrabajoV3.objects.create(
            empresa=self.empresa_prestadora,
            cliente=self.empresa_cliente,
            titulo="OT V3 Test",
            estado=ESTADO_RETROALIMENTACION,
            tecnico_responsable=self.user_tecnico,
            cliente_solicitante=self.usuario_empresa_cliente,
            fecha_inicio_real=timezone.now(),
            fecha_finalizacion_real=timezone.now(),
        )

        ct = ContentType.objects.get_for_model(OrdenDeTrabajoV3)
        self.preguntas = [
            PreguntaEnRetroalimentacion.objects.create(
                texto=f"Pregunta {idx + 1}",
                content_type=ct,
                activo=True,
            )
            for idx in range(5)
        ]

        self.retro = Retroalimentacion.objects.create(
            orden_trabajo_v3=self.otv3,
            usuario_empresa=self.usuario_empresa_cliente,
            correo_usuario_externo=self.user_cliente.email,
            cantidad_visitas=0,
            fecha_vencimiento=timezone.now() + timedelta(hours=72),
        )

        self.aplicadas = [
            RetroalimentacionAplicada.objects.create(
                retroalimentacion=self.retro,
                content_type=ct,
                object_id=self.otv3.pk,
                pregunta=pregunta,
            )
            for pregunta in self.preguntas
        ]

    def test_get_publico_ok_incrementa_visitas_y_log(self):
        response = self.client.get(f"/api/public/retroalimentacion-otv3/{self.retro.uuid}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.retro.refresh_from_db()
        self.assertEqual(self.retro.cantidad_visitas, 1)
        self.assertEqual(
            LogDeAccesoRetroalimentacion.objects.filter(retroalimentacion=self.retro).count(),
            1,
        )

    def test_get_publico_vencida_retorna_410(self):
        self.retro.fecha_vencimiento = timezone.now() - timedelta(hours=1)
        self.retro.save(update_fields=["fecha_vencimiento"])

        response = self.client.get(f"/api/public/retroalimentacion-otv3/{self.retro.uuid}/")

        self.assertEqual(response.status_code, status.HTTP_410_GONE)

    def test_get_publico_fuera_estado_retorna_400_si_no_respondida(self):
        self.otv3.estado = ESTADO_POR_FACTURAR
        self.otv3.save(update_fields=["estado"])

        response = self.client.get(f"/api/public/retroalimentacion-otv3/{self.retro.uuid}/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_publico_fuera_estado_permite_ver_si_ya_respondida(self):
        self.retro.fecha_retroalimentacion = timezone.now()
        self.retro.save(update_fields=["fecha_retroalimentacion"])
        self.otv3.estado = ESTADO_POR_FACTURAR
        self.otv3.save(update_fields=["estado"])

        response = self.client.get(f"/api/public/retroalimentacion-otv3/{self.retro.uuid}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_post_responder_ok_marcar_respondida_y_avanzar_ot(self):
        payload = {
            "items": [
                {"id": aplic.id, "cantidad_estrellas": 5, "observaciones": ""}
                for aplic in self.aplicadas
            ]
        }

        response = self.client.post(
            f"/api/public/retroalimentacion-otv3/{self.retro.uuid}/responder/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.retro.refresh_from_db()
        self.otv3.refresh_from_db()
        self.assertIsNotNone(self.retro.fecha_retroalimentacion)
        self.assertEqual(self.otv3.estado, ESTADO_POR_FACTURAR)

    def test_post_responder_ok_con_4_estrellas_sin_comentario_global(self):
        payload = {
            "items": [
                {"id": aplic.id, "cantidad_estrellas": 4, "observaciones": ""}
                for aplic in self.aplicadas
            ]
        }

        response = self.client.post(
            f"/api/public/retroalimentacion-otv3/{self.retro.uuid}/responder/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_post_responder_falla_si_2_estrellas_sin_comentario_global(self):
        payload = {
            "items": [
                {
                    "id": self.aplicadas[0].id,
                    "cantidad_estrellas": 2,
                    "observaciones": "",
                },
                *[
                    {"id": aplic.id, "cantidad_estrellas": 5, "observaciones": ""}
                    for aplic in self.aplicadas[1:]
                ],
            ],
            # observacion_retroalimentacion omitida a proposito
        }

        response = self.client.post(
            f"/api/public/retroalimentacion-otv3/{self.retro.uuid}/responder/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # No debe guardar parcialmente
        self.retro.refresh_from_db()
        self.assertIsNone(self.retro.fecha_retroalimentacion)
        self.aplicadas[0].refresh_from_db()
        self.assertIsNone(self.aplicadas[0].cantidad_estrellas)

    def test_post_responder_falla_si_item_no_pertenece(self):
        payload = {"items": [{"id": 999999, "cantidad_estrellas": 5, "observaciones": ""}]}

        response = self.client.post(
            f"/api/public/retroalimentacion-otv3/{self.retro.uuid}/responder/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_post_responder_falla_si_payload_incompleto_en_formato_estandar(self):
        payload = {
            "items": [
                {"id": self.aplicadas[0].id, "cantidad_estrellas": 5, "observaciones": ""}
            ]
        }

        response = self.client.post(
            f"/api/public/retroalimentacion-otv3/{self.retro.uuid}/responder/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_post_responder_falla_y_no_guarda_parcial_si_rating_fuera_de_rango(self):
        payload = {
            "items": [
                {"id": self.aplicadas[0].id, "cantidad_estrellas": 6, "observaciones": ""},
                *[
                    {"id": aplic.id, "cantidad_estrellas": 5, "observaciones": ""}
                    for aplic in self.aplicadas[1:]
                ],
            ]
        }

        response = self.client.post(
            f"/api/public/retroalimentacion-otv3/{self.retro.uuid}/responder/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.retro.refresh_from_db()
        self.assertIsNone(self.retro.fecha_retroalimentacion)
        for aplic in self.aplicadas:
            aplic.refresh_from_db()
            self.assertIsNone(aplic.cantidad_estrellas)

    def test_post_responder_falla_si_vencida(self):
        self.retro.fecha_vencimiento = timezone.now() - timedelta(hours=1)
        self.retro.save(update_fields=["fecha_vencimiento"])

        payload = {
            "items": [
                {"id": aplic.id, "cantidad_estrellas": 5, "observaciones": ""}
                for aplic in self.aplicadas
            ]
        }
        response = self.client.post(
            f"/api/public/retroalimentacion-otv3/{self.retro.uuid}/responder/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_410_GONE)

    def test_post_responder_falla_si_ot_no_disponible(self):
        self.otv3.estado = ESTADO_POR_FACTURAR
        self.otv3.save(update_fields=["estado"])

        payload = {
            "items": [
                {"id": aplic.id, "cantidad_estrellas": 5, "observaciones": ""}
                for aplic in self.aplicadas
            ]
        }
        response = self.client.post(
            f"/api/public/retroalimentacion-otv3/{self.retro.uuid}/responder/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
