from django.contrib.auth import get_user_model
from django.test import TestCase

from bodegas.models import Bodega, GuiaSalida
from core.models import PersonalizacionUsuario
from cotizaciones.models import Cotizacion
from empresas.models import Empresa, RelacionEmpresa, SucursalEmpresa, UsuarioEmpresa
from ordentrabajov2.functions import vincular_cotizaciones_generar_guias
from ordentrabajov2.models import OrdenDeTrabajo

User = get_user_model()


class VincularCotizacionesGenerarGuiasTest(TestCase):
    def setUp(self):
        self.empresa = Empresa.objects.create(
            nombre="Empresa OT", rut_empresa="95959595-5", direccion_principal="Dir"
        )
        self.sucursal = SucursalEmpresa.objects.create(
            nombre="Sucursal OT", empresa=self.empresa
        )
        self.cliente = Empresa.objects.create(
            nombre="Cliente OT", rut_empresa="96969696-6", direccion_principal="Dir"
        )
        RelacionEmpresa.objects.create(
            prestador_servicios=self.empresa, cliente=self.cliente
        )

        self.user = User.objects.create_user(email="otv2@test.com", password="test1234")
        self.usuario = UsuarioEmpresa.objects.create(usuario=self.user, sucursal=self.sucursal)
        PersonalizacionUsuario.objects.update_or_create(
            usuario=self.user,
            defaults={"sucursal_principal": self.sucursal},
        )

        self.bodega = Bodega.objects.create(nombre="Bodega OT", sucursal=self.sucursal)
        self.orden = OrdenDeTrabajo.objects.create(
            empresa=self.empresa,
            cliente=self.cliente,
            descripcion="OT de prueba",
            estado="pendiente",
        )

    def test_crea_guias_manual_separadas_por_cotizacion_sin_ocs(self):
        cotizacion_1 = Cotizacion.objects.create(
            empresa=self.empresa,
            cliente=self.cliente,
            nombre="Cotizacion 1",
            estado="aceptada",
        )
        cotizacion_2 = Cotizacion.objects.create(
            empresa=self.empresa,
            cliente=self.cliente,
            nombre="Cotizacion 2",
            estado="aceptada",
        )

        resultado = vincular_cotizaciones_generar_guias(
            self.orden,
            [cotizacion_1.id, cotizacion_2.id],
            usuario=self.usuario,
            bodega_id=self.bodega.id,
        )

        guias = GuiaSalida.objects.filter(orden_trabajo=self.orden).order_by("id")

        self.assertEqual(guias.count(), 2)
        self.assertSetEqual(
            set(guias.values_list("cotizacion_origen_id", flat=True)),
            {cotizacion_1.id, cotizacion_2.id},
        )
        self.assertSetEqual(
            set(self.orden.cotizaciones.values_list("id", flat=True)),
            {cotizacion_1.id, cotizacion_2.id},
        )
        self.assertEqual(sorted(resultado["guias_vinculadas"]), list(guias.values_list("id", flat=True)))
        self.assertEqual(
            {detalle["modo"] for detalle in resultado["detalle"]},
            {"manual_sin_oc"},
        )

    def test_falla_si_falta_bodega_para_cotizacion_sin_ocs(self):
        cotizacion = Cotizacion.objects.create(
            empresa=self.empresa,
            cliente=self.cliente,
            nombre="Cotizacion sin OC",
            estado="aceptada",
        )

        with self.assertRaisesMessage(ValueError, "Debes indicar una bodega"):
            vincular_cotizaciones_generar_guias(
                self.orden,
                [cotizacion.id],
                usuario=self.usuario,
            )
