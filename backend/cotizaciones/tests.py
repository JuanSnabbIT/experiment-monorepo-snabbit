import uuid
from datetime import date, timedelta

from django.contrib.auth.models import Group
from django.contrib.contenttypes.models import ContentType
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa
from core.models import PersonalizacionUsuario
from .models import Cotizacion, ItemCotizacion, SolicitanteCotizacion

User = get_user_model()


class CrearCopiaRechazadaTestCase(TestCase):
    """
    Tests para verificar la creación de copias de cotizaciones rechazadas.
    """

    def setUp(self):
        """Configurar datos de prueba"""
        self.client = APIClient()

        # Crear empresa principal
        self.empresa = Empresa.objects.create(
            nombre="Empresa Test",
        )

        # Crear cliente
        self.cliente = Empresa.objects.create(
            nombre="Cliente Test",
        )
        self.sucursal = SucursalEmpresa.objects.create(
            nombre="Casa Matriz",
            empresa=self.empresa,
        )

        # Crear usuario
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
        )

        # Crear personalización de usuario
        self.personalizacion, _ = PersonalizacionUsuario.objects.get_or_create(
            usuario=self.user,
            defaults={"sucursal_principal": self.sucursal},
        )

        # Crear UsuarioEmpresa
        self.usuario_empresa = UsuarioEmpresa.objects.create(
            usuario=self.user,
            sucursal=self.sucursal,
        )
        grupo_ventas, _ = Group.objects.get_or_create(name="ventas")
        self.usuario_empresa.grupos.add(grupo_ventas)

        # Crear cotización rechazada
        self.cotizacion_rechazada = Cotizacion.objects.create(
            nombre="Cotización Test",
            empresa=self.empresa,
            cliente=self.cliente,
            estado="rechazada",
            total_estimado=100.00,
            tipo_moneda="2",
        )

        # Crear items para la cotización
        self.item = ItemCotizacion.objects.create(
            cotizacion=self.cotizacion_rechazada,
            nombre="Item Test",
            descripcion="Descripción test",
            cantidad=1,
            precio_unitario=100.00,
            tipo_moneda="2",
        )

        # Crear solicitante
        content_type = ContentType.objects.get_for_model(User)
        self.solicitante = SolicitanteCotizacion.objects.create(
            cotizacion=self.cotizacion_rechazada,
            content_type=content_type,
            usuario=self.user,
        )

    def test_crear_copia_rechazada_exito(self):
        """Test: Crear copia de cotización rechazada exitosamente"""
        self.client.force_authenticate(user=self.user)

        url = f"/api/cotizaciones/{self.cotizacion_rechazada.id}/crear-copia-rechazada/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("numero_cotizacion", response.data)

        # Verificar que la copia fue creada
        nueva_cotizacion = Cotizacion.objects.get(
            numero_cotizacion=response.data["numero_cotizacion"]
        )
        self.assertEqual(nueva_cotizacion.estado, "pendiente")
        self.assertEqual(nueva_cotizacion.copia_de_id, self.cotizacion_rechazada.id)
        self.assertEqual(nueva_cotizacion.nombre, self.cotizacion_rechazada.nombre)
        self.assertEqual(nueva_cotizacion.cliente_id, self.cotizacion_rechazada.cliente_id)

    def test_crear_copia_no_rechazada(self):
        """Test: Error al intentar crear copia de cotización no rechazada"""
        self.client.force_authenticate(user=self.user)

        # Crear cotización pendiente
        cotizacion_pendiente = Cotizacion.objects.create(
            nombre="Cotización Pendiente",
            empresa=self.empresa,
            cliente=self.cliente,
            estado="pendiente",
        )

        url = f"/api/cotizaciones/{cotizacion_pendiente.id}/crear-copia-rechazada/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
        self.assertIn("rechazada", response.data["detail"].lower())

    def test_items_copiados_correctamente(self):
        """Test: Verificar que los items se copian correctamente"""
        self.client.force_authenticate(user=self.user)

        url = f"/api/cotizaciones/{self.cotizacion_rechazada.id}/crear-copia-rechazada/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        nueva_cotizacion = Cotizacion.objects.get(
            numero_cotizacion=response.data["numero_cotizacion"]
        )

        # Verificar items
        items_originales = self.cotizacion_rechazada.items.count()
        items_nuevos = nueva_cotizacion.items.count()
        self.assertEqual(items_originales, items_nuevos)

        # Verificar que los datos son iguales
        item_original = self.cotizacion_rechazada.items.first()
        item_nuevo = nueva_cotizacion.items.first()
        self.assertEqual(item_original.nombre, item_nuevo.nombre)
        self.assertEqual(item_original.cantidad, item_nuevo.cantidad)
        self.assertEqual(item_original.precio_unitario, item_nuevo.precio_unitario)
        self.assertEqual(item_original.tipo_moneda, item_nuevo.tipo_moneda)

    def test_solicitantes_copiados_correctamente(self):
        """Test: Verificar que los solicitantes se copian correctamente"""
        self.client.force_authenticate(user=self.user)

        url = f"/api/cotizaciones/{self.cotizacion_rechazada.id}/crear-copia-rechazada/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        nueva_cotizacion = Cotizacion.objects.get(
            numero_cotizacion=response.data["numero_cotizacion"]
        )

        # Verificar solicitantes
        solicitantes_originales = self.cotizacion_rechazada.solicitantes.count()
        solicitantes_nuevos = nueva_cotizacion.solicitantes.count()
        self.assertEqual(solicitantes_originales, solicitantes_nuevos)

    def test_estado_pendiente_en_copia(self):
        """Test: La copia siempre queda en estado pendiente"""
        self.client.force_authenticate(user=self.user)

        url = f"/api/cotizaciones/{self.cotizacion_rechazada.id}/crear-copia-rechazada/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["estado"], "pendiente")

    def test_seguimiento_creado(self):
        """Test: Se crea seguimiento de la copia"""
        self.client.force_authenticate(user=self.user)

        url = f"/api/cotizaciones/{self.cotizacion_rechazada.id}/crear-copia-rechazada/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        nueva_cotizacion = Cotizacion.objects.get(
            numero_cotizacion=response.data["numero_cotizacion"]
        )

        # Verificar que hay seguimiento
        self.assertGreater(nueva_cotizacion.seguimientos.count(), 0)

        seguimiento = nueva_cotizacion.seguimientos.first()
        self.assertIn("reformulacion", seguimiento.comentario)
        self.assertIn("creada", seguimiento.comentario)


class MonedaItemCotizacionTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.empresa = Empresa.objects.create(
            nombre="Empresa Test",
        )
        self.cliente = Empresa.objects.create(
            nombre="Cliente Test",
        )
        self.sucursal = SucursalEmpresa.objects.create(
            nombre="Casa Matriz",
            empresa=self.empresa,
        )
        self.user = User.objects.create_user(
            email="testmoneda@example.com",
            password="testpass123",
        )
        PersonalizacionUsuario.objects.get_or_create(
            usuario=self.user,
            defaults={"sucursal_principal": self.sucursal},
        )
        usuario_empresa = UsuarioEmpresa.objects.create(
            usuario=self.user,
            sucursal=self.sucursal,
        )
        grupo_ventas, _ = Group.objects.get_or_create(name="ventas")
        usuario_empresa.grupos.add(grupo_ventas)
        self.client.force_authenticate(user=self.user)

    def test_crear_item_rechaza_moneda_uf_sin_tasas(self):
        cotizacion = Cotizacion.objects.create(
            nombre="Cotización USD sin tasas",
            empresa=self.empresa,
            cliente=self.cliente,
            tipo_moneda="1",
            dolar_observado=None,
            valor_uf=None,
        )

        response = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/items/",
            {
                "cotizacion": cotizacion.id,
                "nombre": "Item UF",
                "cantidad": 1,
                "precio_unitario": "2.00",
                "tipo_moneda": "3",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("dolar_observado", response.data)
        self.assertIn("valor_uf", response.data)

    def test_actualizar_cotizacion_rechaza_tasas_faltantes_con_items_configurados(self):
        cotizacion = Cotizacion.objects.create(
            nombre="Cotización USD válida",
            empresa=self.empresa,
            cliente=self.cliente,
            tipo_moneda="1",
            dolar_observado=950,
            valor_uf=38000,
        )
        ItemCotizacion.objects.create(
            cotizacion=cotizacion,
            nombre="Item UF",
            cantidad=1,
            precio_unitario="2.00",
            tipo_moneda="3",
        )

        response = self.client.patch(
            f"/api/cotizaciones/{cotizacion.id}/",
            {
                "dolar_observado": None,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("dolar_observado", response.data)


class FlujoCotizacionPublicaTestCase(TestCase):
    """
    Tests de integracion para el flujo publico de cotizacion (SEB-238).

    Cubre los endpoints:
        GET  /api/public/cotizacion/{token}/
        POST /api/public/cotizacion/{token}/aprobar/
        POST /api/public/cotizacion/{token}/rechazar/
    """

    def setUp(self):
        self.client = APIClient()

        self.empresa = Empresa.objects.create(nombre="Empresa Prueba Publica")
        self.cliente = Empresa.objects.create(nombre="Cliente Prueba Publica")
        self.sucursal = SucursalEmpresa.objects.create(
            nombre="Casa Matriz", empresa=self.empresa
        )
        self.user = User.objects.create_user(
            email="publico@test.com", password="testpass123"
        )
        PersonalizacionUsuario.objects.get_or_create(
            usuario=self.user,
            defaults={"sucursal_principal": self.sucursal},
        )
        self.usuario_empresa = UsuarioEmpresa.objects.create(
            usuario=self.user, sucursal=self.sucursal
        )

        self.cotizacion = Cotizacion.objects.create(
            nombre="Cotizacion Prueba Publica",
            empresa=self.empresa,
            cliente=self.cliente,
            estado="enviada",
            total_estimado=500.00,
            tipo_moneda="2",
            fecha_vencimiento=date.today() + timedelta(days=14),
        )
        self.item = ItemCotizacion.objects.create(
            cotizacion=self.cotizacion,
            nombre="Servicio de red",
            descripcion="Instalacion de red",
            cantidad=1,
            precio_unitario=500.00,
            costo_total=500.00,
            tipo_moneda="2",
        )

        content_type = ContentType.objects.get_for_model(UsuarioEmpresa)
        self.solicitante = SolicitanteCotizacion.objects.create(
            cotizacion=self.cotizacion,
            content_type=content_type,
            usuario_id=self.usuario_empresa.id,
        )
        self.token = self.solicitante.token

    # ------------------------------------------------------------------
    # GET /api/public/cotizacion/{token}/
    # ------------------------------------------------------------------

    def test_get_detalle_token_valido_retorna_200(self):
        """Un token valido retorna datos de la cotizacion."""
        response = self.client.get(f"/api/public/cotizacion/{self.token}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("numero_cotizacion", response.data)

    def test_get_detalle_token_invalido_retorna_404(self):
        """Un token inexistente retorna 404."""
        token_falso = uuid.uuid4()
        response = self.client.get(f"/api/public/cotizacion/{token_falso}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_detalle_registra_primera_vista(self):
        """El primer GET registra fecha_primera_vista en el solicitante."""
        self.assertIsNone(self.solicitante.fecha_primera_vista)
        self.client.get(f"/api/public/cotizacion/{self.token}/")
        self.solicitante.refresh_from_db()
        self.assertIsNotNone(self.solicitante.fecha_primera_vista)

    def test_get_detalle_no_requiere_autenticacion(self):
        """El endpoint es publico (no requiere JWT)."""
        self.client.credentials()
        response = self.client.get(f"/api/public/cotizacion/{self.token}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ------------------------------------------------------------------
    # POST /api/public/cotizacion/{token}/aprobar/
    # ------------------------------------------------------------------

    def test_aprobar_cotizacion_exitosamente(self):
        """Una cotizacion en estado 'enviada' puede aprobarse via token."""
        response = self.client.post(f"/api/public/cotizacion/{self.token}/aprobar/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("detail", response.data)
        self.cotizacion.refresh_from_db()
        self.assertEqual(self.cotizacion.estado, "aceptada")

    def test_aprobar_marca_token_como_usado(self):
        """Despues de aprobar el token queda marcado como usado."""
        self.client.post(f"/api/public/cotizacion/{self.token}/aprobar/")
        self.solicitante.refresh_from_db()
        self.assertTrue(self.solicitante.token_usado)

    def test_aprobar_token_ya_usado_retorna_400(self):
        """Intentar aprobar con un token ya usado retorna 400."""
        self.solicitante.token_usado = True
        self.solicitante.save(update_fields=["token_usado"])
        response = self.client.post(f"/api/public/cotizacion/{self.token}/aprobar/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_aprobar_cotizacion_estado_invalido_retorna_400(self):
        """Aprobar una cotizacion no en estado 'enviada' retorna 400."""
        self.cotizacion.estado = "pendiente"
        self.cotizacion.save(update_fields=["estado"])
        response = self.client.post(f"/api/public/cotizacion/{self.token}/aprobar/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_aprobar_cotizacion_expirada_retorna_410(self):
        """Aprobar una cotizacion vencida retorna 410 Gone."""
        self.cotizacion.fecha_vencimiento = date.today() - timedelta(days=1)
        self.cotizacion.save(update_fields=["fecha_vencimiento"])
        response = self.client.post(f"/api/public/cotizacion/{self.token}/aprobar/")
        self.assertEqual(response.status_code, status.HTTP_410_GONE)

    def test_aprobar_items_especificos(self):
        """Se puede aprobar solo un subconjunto de items."""
        response = self.client.post(
            f"/api/public/cotizacion/{self.token}/aprobar/",
            {"item_ids": [self.item.id]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertTrue(self.item.aprobado)

    def test_aprobar_items_invalidos_retorna_400(self):
        """Pasar ids de items de otra cotizacion retorna 400."""
        response = self.client.post(
            f"/api/public/cotizacion/{self.token}/aprobar/",
            {"item_ids": [99999]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_aprobar_token_invalido_retorna_404(self):
        """Token inexistente retorna 404 al aprobar."""
        token_falso = uuid.uuid4()
        response = self.client.post(f"/api/public/cotizacion/{token_falso}/aprobar/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------
    # POST /api/public/cotizacion/{token}/rechazar/
    # ------------------------------------------------------------------

    def test_rechazar_cotizacion_exitosamente(self):
        """Una cotizacion en estado 'enviada' puede rechazarse via token."""
        response = self.client.post(
            f"/api/public/cotizacion/{self.token}/rechazar/",
            {"motivo": "Precio fuera de presupuesto"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.cotizacion.refresh_from_db()
        self.assertEqual(self.cotizacion.estado, "rechazada")

    def test_rechazar_sin_motivo_es_valido(self):
        """Rechazar sin motivo (body vacio) es un caso valido."""
        response = self.client.post(f"/api/public/cotizacion/{self.token}/rechazar/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rechazar_guarda_motivo(self):
        """El motivo de rechazo queda persistido en el solicitante."""
        motivo = "No cumple los requisitos tecnicos"
        self.client.post(
            f"/api/public/cotizacion/{self.token}/rechazar/",
            {"motivo": motivo},
            format="json",
        )
        self.solicitante.refresh_from_db()
        self.assertEqual(self.solicitante.motivo_rechazo, motivo)

    def test_rechazar_token_ya_usado_retorna_400(self):
        """Intentar rechazar con un token ya usado retorna 400."""
        self.solicitante.token_usado = True
        self.solicitante.save(update_fields=["token_usado"])
        response = self.client.post(f"/api/public/cotizacion/{self.token}/rechazar/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rechazar_cotizacion_estado_invalido_retorna_400(self):
        """Rechazar una cotizacion en estado 'pendiente' retorna 400."""
        self.cotizacion.estado = "pendiente"
        self.cotizacion.save(update_fields=["estado"])
        response = self.client.post(f"/api/public/cotizacion/{self.token}/rechazar/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rechazar_cotizacion_expirada_retorna_410(self):
        """Rechazar una cotizacion vencida retorna 410 Gone."""
        self.cotizacion.fecha_vencimiento = date.today() - timedelta(days=1)
        self.cotizacion.save(update_fields=["fecha_vencimiento"])
        response = self.client.post(f"/api/public/cotizacion/{self.token}/rechazar/")
        self.assertEqual(response.status_code, status.HTTP_410_GONE)

    def test_rechazar_token_invalido_retorna_404(self):
        """Token inexistente retorna 404 al rechazar."""
        token_falso = uuid.uuid4()
        response = self.client.post(f"/api/public/cotizacion/{token_falso}/rechazar/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CotizacionPermisosTest(TestCase):
    def setUp(self):
        from core.factories import crear_usuario_en_rol

        self.empresa = Empresa.objects.create(nombre="Empresa Permisos Cot")
        self.sucursal = SucursalEmpresa.objects.create(nombre="Casa Matriz", empresa=self.empresa)
        self.client = APIClient()
        self._crear_usuario_en_rol = crear_usuario_en_rol

    def test_usuario_sin_rol_permitido_recibe_403(self):
        user, _ = self._crear_usuario_en_rol(self.sucursal, "bodega", sufijo="cot-sin-rol")
        self.client.force_authenticate(user=user)

        response = self.client.get("/api/cotizaciones/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_usuario_con_rol_ventas_puede_listar(self):
        user, _ = self._crear_usuario_en_rol(self.sucursal, "ventas", sufijo="cot-con-rol")
        self.client.force_authenticate(user=user)

        response = self.client.get("/api/cotizaciones/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_usuario_tecnico_puede_listar_pero_no_crear(self):
        user, _ = self._crear_usuario_en_rol(self.sucursal, "tecnico", sufijo="cot-tecnico")
        self.client.force_authenticate(user=user)

        response_list = self.client.get("/api/cotizaciones/")
        self.assertEqual(response_list.status_code, status.HTTP_200_OK)

        response_create = self.client.post("/api/cotizaciones/", {}, format="json")
        self.assertEqual(response_create.status_code, status.HTTP_403_FORBIDDEN)
