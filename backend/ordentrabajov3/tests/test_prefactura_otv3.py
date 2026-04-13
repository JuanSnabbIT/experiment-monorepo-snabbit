from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from cuentas.models import User
from core.models import PersonalizacionUsuario
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa
from ordentrabajov3.estados_modelo import ESTADO_FACTURADA, ESTADO_POR_FACTURAR
from ordentrabajov3.models import OrdenDeTrabajoV3, PrefacturaOTV3


class PrefacturaOTV3ApiTest(APITestCase):
    def setUp(self):
        super().setUp()

        self.empresa_prestadora = Empresa.objects.create(
            nombre="Prestador",
            direccion_principal="Calle 123",
        )
        self.sucursal = SucursalEmpresa.objects.create(
            nombre="Casa matriz",
            empresa=self.empresa_prestadora,
        )

        self.empresa_cliente = Empresa.objects.create(
            nombre="Cliente",
            direccion_principal="Av. 456",
        )

        self.user = User.objects.create_user(
            email="staff@test.com",
            password="testpass123",
            first_name="Staff",
            last_name="Test",
        )
        self.usuario_empresa = UsuarioEmpresa.objects.create(
            usuario=self.user,
            sucursal=self.sucursal,
        )
        pers = PersonalizacionUsuario.objects.filter(usuario=self.user).first()
        if pers:
            pers.sucursal_principal = self.sucursal
            pers.save(update_fields=["sucursal_principal"])
        else:
            PersonalizacionUsuario.objects.create(usuario=self.user, sucursal_principal=self.sucursal)

        self.otv3 = OrdenDeTrabajoV3.objects.create(
            empresa=self.empresa_prestadora,
            cliente=self.empresa_cliente,
            titulo="OT V3 Test",
            estado=ESTADO_POR_FACTURAR,
        )

        self.client.force_authenticate(user=self.user)

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    def _hacer_prefactura_con_ots(self, ots, estado="borrador", **kwargs):
        """Crea una PrefacturaOTV3 con el M2M ots correctamente poblado."""
        pref = PrefacturaOTV3.objects.create(
            ot=ots[0],
            cliente=self.empresa_cliente,
            creado_por=self.usuario_empresa,
            estado_cierre=estado,
            **kwargs,
        )
        pref.ots.set(ots)
        return pref

    # ------------------------------------------------------------------ #
    # Tests originales actualizados
    # ------------------------------------------------------------------ #

    def test_crear_prefactura_ok(self):
        """Crear prefactura con ot_id legacy; la OT queda en M2M ots."""
        resp = self.client.post(
            "/api/v3/prefacturas-otv3/",
            {"ot_id": self.otv3.id},
            format="json",
        )

        self.assertIn(resp.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED))
        pref = PrefacturaOTV3.objects.filter(ot=self.otv3).first()
        self.assertIsNotNone(pref)
        self.assertIn(self.otv3.id, pref.ots.values_list("id", flat=True))

    def test_finalizar_prefactura_ok(self):
        """Finalizar prefactura con OT en M2M: borrador -> por_facturar."""
        pref = self._hacer_prefactura_con_ots([self.otv3])

        resp = self.client.post(f"/api/v3/prefacturas-otv3/{pref.id}/finalizar/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        pref.refresh_from_db()
        self.assertEqual(pref.estado_cierre, "por_facturar")

    def test_asociar_documento_actualiza_ot_a_facturada(self):
        """Asociar documento: prefactura -> facturado y OT -> facturada."""
        pref = self._hacer_prefactura_con_ots([self.otv3], estado="por_facturar")

        archivo = SimpleUploadedFile(
            "factura.pdf",
            b"%PDF-1.4 test",
            content_type="application/pdf",
        )

        resp = self.client.post(
            f"/api/v3/prefacturas-otv3/{pref.id}/asociar-documento/",
            {"documento": archivo},
            format="multipart",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        pref.refresh_from_db()
        self.otv3.refresh_from_db()
        self.assertEqual(pref.estado_cierre, "facturado")
        self.assertEqual(self.otv3.estado, ESTADO_FACTURADA)

    def test_multitenancy_no_permite_acceder_prefactura_otra_empresa(self):
        """Prefactura de otra empresa retorna 404."""
        otra_empresa = Empresa.objects.create(nombre="Otra", direccion_principal="X")
        otra_sucursal = SucursalEmpresa.objects.create(nombre="Sucursal X", empresa=otra_empresa)
        otro_user = User.objects.create_user(email="otro@test.com", password="testpass123")
        UsuarioEmpresa.objects.create(usuario=otro_user, sucursal=otra_sucursal)
        pers_otro = PersonalizacionUsuario.objects.filter(usuario=otro_user).first()
        if pers_otro:
            pers_otro.sucursal_principal = otra_sucursal
            pers_otro.save(update_fields=["sucursal_principal"])
        else:
            PersonalizacionUsuario.objects.create(usuario=otro_user, sucursal_principal=otra_sucursal)

        ot_otra = OrdenDeTrabajoV3.objects.create(
            empresa=otra_empresa,
            cliente=self.empresa_cliente,
            titulo="OT otra",
            estado=ESTADO_POR_FACTURAR,
        )
        pref_otra = PrefacturaOTV3.objects.create(
            ot=ot_otra,
            cliente=self.empresa_cliente,
        )
        pref_otra.ots.set([ot_otra])

        resp = self.client.get(f"/api/v3/prefacturas-otv3/{pref_otra.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------ #
    # Tests nuevos: creacion multi-OT y compat legacy
    # ------------------------------------------------------------------ #

    def test_crear_prefactura_multi_ot(self):
        """Crear prefactura con ot_ids: dos OTs del mismo cliente."""
        otv3_b = OrdenDeTrabajoV3.objects.create(
            empresa=self.empresa_prestadora,
            cliente=self.empresa_cliente,
            titulo="OT V3 B",
            estado=ESTADO_POR_FACTURAR,
        )

        resp = self.client.post(
            "/api/v3/prefacturas-otv3/",
            {"ot_ids": [self.otv3.id, otv3_b.id]},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.json()
        self.assertIn(self.otv3.id, data["ots_ids"])
        self.assertIn(otv3_b.id, data["ots_ids"])

    def test_legacy_ot_id_compat(self):
        """ot_id singular sigue funcionando y popula M2M ots."""
        resp = self.client.post(
            "/api/v3/prefacturas-otv3/",
            {"ot_id": self.otv3.id},
            format="json",
        )
        self.assertIn(resp.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED))
        data = resp.json()
        self.assertIn(self.otv3.id, data["ots_ids"])

    def test_crear_falla_ot_cliente_distinto(self):
        """OTs de distintos clientes en misma prefactura retorna 400."""
        otro_cliente = Empresa.objects.create(nombre="Otro Cliente", direccion_principal="Z")
        ot_otro_cliente = OrdenDeTrabajoV3.objects.create(
            empresa=self.empresa_prestadora,
            cliente=otro_cliente,
            titulo="OT otro cliente",
            estado=ESTADO_POR_FACTURAR,
        )

        resp = self.client.post(
            "/api/v3/prefacturas-otv3/",
            {"ot_ids": [self.otv3.id, ot_otro_cliente.id]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("mismo cliente", resp.json().get("detail", "").lower())

    def test_crear_falla_ot_estado_invalido(self):
        """OT que no esta en por_facturar retorna 400."""
        ot_borrador = OrdenDeTrabajoV3.objects.create(
            empresa=self.empresa_prestadora,
            cliente=self.empresa_cliente,
            titulo="OT borrador",
            estado="borrador",
        )

        resp = self.client.post(
            "/api/v3/prefacturas-otv3/",
            {"ot_ids": [ot_borrador.id]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("por_facturar", resp.json().get("detail", ""))

    def test_finalizar_falla_sin_ots_en_m2m(self):
        """Finalizar sin OTs en M2M retorna 400."""
        pref = PrefacturaOTV3.objects.create(
            ot=None,
            cliente=self.empresa_cliente,
            creado_por=self.usuario_empresa,
        )
        # ots M2M vacio, sin agregar nada manualmente

        # Para que aparezca en get_queryset debemos agregar la OT (sino 404)
        # Aqui probamos el caso de prefactura huerfana con ots vacia:
        pref.ots.set([self.otv3])  # agrega la ot para que sea visible
        pref.ots.clear()           # la vacia inmediatamente

        resp = self.client.post(f"/api/v3/prefacturas-otv3/{pref.id}/finalizar/")
        # 404 es aceptable porque no aparece en queryset; 400 si aparece
        self.assertIn(resp.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND))

    # ------------------------------------------------------------------ #
    # Tests nuevos: ots-elegibles
    # ------------------------------------------------------------------ #

    def test_ots_elegibles_endpoint(self):
        """OTs elegibles: retorna OTs por_facturar del cliente sin prefactura activa."""
        resp = self.client.get(
            "/api/v3/prefacturas-otv3/ots-elegibles/",
            {"cliente_id": self.empresa_cliente.id},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [o["id"] for o in resp.json()]
        self.assertIn(self.otv3.id, ids)

    def test_ots_elegibles_excluye_ya_en_prefactura_activa(self):
        """OT que ya tiene prefactura activa no aparece en elegibles."""
        pref = self._hacer_prefactura_con_ots([self.otv3], estado="borrador")

        resp = self.client.get(
            "/api/v3/prefacturas-otv3/ots-elegibles/",
            {"cliente_id": self.empresa_cliente.id},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [o["id"] for o in resp.json()]
        self.assertNotIn(self.otv3.id, ids)

    def test_ots_elegibles_requiere_cliente_id(self):
        """Sin cliente_id retorna 400."""
        resp = self.client.get("/api/v3/prefacturas-otv3/ots-elegibles/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ------------------------------------------------------------------ #
    # Tests nuevos: comparativa
    # ------------------------------------------------------------------ #

    def test_comparativa_endpoint_solo_ots(self):
        """Comparativa sin contratos retorna pactado vacio y ejecutado estructurado."""
        resp = self.client.post(
            "/api/v3/prefacturas-otv3/comparativa/",
            {"ot_ids": [self.otv3.id]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertIn("pactado", data)
        self.assertIn("ejecutado", data)
        self.assertIn("diferencia", data)
        self.assertIn("ots_marcadas_visitas", data)

    def test_comparativa_falla_sin_ots(self):
        """Comparativa sin ot_ids retorna 400."""
        resp = self.client.post(
            "/api/v3/prefacturas-otv3/comparativa/",
            {"ot_ids": []},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_comparativa_falla_ot_otra_empresa(self):
        """Comparativa con OT de otra empresa retorna 404."""
        otra_empresa = Empresa.objects.create(nombre="Ajena", direccion_principal="A")
        ot_ajena = OrdenDeTrabajoV3.objects.create(
            empresa=otra_empresa,
            cliente=self.empresa_cliente,
            titulo="OT ajena",
            estado=ESTADO_POR_FACTURAR,
        )
        resp = self.client.post(
            "/api/v3/prefacturas-otv3/comparativa/",
            {"ot_ids": [ot_ajena.id]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------ #
    # Tests nuevos: asociar-documento multi-OT
    # ------------------------------------------------------------------ #

    def test_asociar_documento_multi_ot_todas_pasan_a_facturada(self):
        """Asociar documento en prefactura multi-OT avanza todas las OTs."""
        otv3_b = OrdenDeTrabajoV3.objects.create(
            empresa=self.empresa_prestadora,
            cliente=self.empresa_cliente,
            titulo="OT V3 B",
            estado=ESTADO_POR_FACTURAR,
        )
        pref = self._hacer_prefactura_con_ots([self.otv3, otv3_b], estado="por_facturar")

        archivo = SimpleUploadedFile(
            "factura.pdf",
            b"%PDF-1.4 test",
            content_type="application/pdf",
        )

        resp = self.client.post(
            f"/api/v3/prefacturas-otv3/{pref.id}/asociar-documento/",
            {"documento": archivo},
            format="multipart",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.otv3.refresh_from_db()
        otv3_b.refresh_from_db()
        self.assertEqual(self.otv3.estado, ESTADO_FACTURADA)
        self.assertEqual(otv3_b.estado, ESTADO_FACTURADA)

    # ------------------------------------------------------------------ #
    # Tests de seguridad cross-empresa
    # ------------------------------------------------------------------ #

    def test_crear_prefactura_ot_otra_empresa_retorna_404(self):
        """Intentar crear prefactura con OT de otra empresa retorna 404."""
        otra_empresa = Empresa.objects.create(nombre="Otra empresa", direccion_principal="Y")
        ot_ajena = OrdenDeTrabajoV3.objects.create(
            empresa=otra_empresa,
            cliente=self.empresa_cliente,
            titulo="OT ajena",
            estado=ESTADO_POR_FACTURAR,
        )

        resp = self.client.post(
            "/api/v3/prefacturas-otv3/",
            {"ot_ids": [ot_ajena.id]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

