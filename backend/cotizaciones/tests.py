from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa
from core.models import PersonalizacionUsuario
from .models import Cotizacion, ItemCotizacion, SolicitanteCotizacion
from django.contrib.contenttypes.models import ContentType

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
        self.assertIn("Copia", seguimiento.comentario)
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
        UsuarioEmpresa.objects.create(
            usuario=self.user,
            sucursal=self.sucursal,
        )
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
