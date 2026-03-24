from django.core.management.base import BaseCommand
from contratos.models import EtiquetaPlantilla
from empresas.models import Empresa


ETIQUETAS_PREDEFINIDAS = [
    # proveedor
    {"clave": "nombre_proveedor", "nombre_display": "Nombre del Proveedor", "categoria": "proveedor", "origen_dato": "empresa_prestadora.nombre"},
    {"clave": "rut_proveedor", "nombre_display": "RUT del Proveedor", "categoria": "proveedor", "origen_dato": "empresa_prestadora.rut_empresa"},
    {"clave": "domicilio_proveedor", "nombre_display": "Domicilio del Proveedor", "categoria": "proveedor", "origen_dato": "empresa_prestadora.direccion_principal"},
    {"clave": "fantasia_proveedor", "nombre_display": "Nombre Fantasía Proveedor", "categoria": "proveedor", "origen_dato": "empresa_prestadora.nombre_fantasia"},
    {"clave": "giro_proveedor", "nombre_display": "Giro del Proveedor", "categoria": "proveedor", "origen_dato": "empresa_prestadora.giro"},
    {"clave": "representante_proveedor", "nombre_display": "Representante Legal Proveedor", "categoria": "proveedor", "origen_dato": "representante_proveedor.usuario.get_nombre_completo"},
    {"clave": "rut_representante_proveedor", "nombre_display": "RUT Representante Proveedor", "categoria": "proveedor", "origen_dato": "representante_proveedor.rut"},
    {"clave": "cargo_representante_proveedor", "nombre_display": "Cargo Representante Proveedor", "categoria": "proveedor", "origen_dato": "representante_proveedor.cargo"},
    # cliente
    {"clave": "nombre_cliente", "nombre_display": "Nombre del Cliente", "categoria": "cliente", "origen_dato": "empresa_cliente.nombre"},
    {"clave": "rut_cliente", "nombre_display": "RUT del Cliente", "categoria": "cliente", "origen_dato": "empresa_cliente.rut_empresa"},
    {"clave": "domicilio_cliente", "nombre_display": "Domicilio del Cliente", "categoria": "cliente", "origen_dato": "empresa_cliente.direccion_principal"},
    {"clave": "giro_cliente", "nombre_display": "Giro del Cliente", "categoria": "cliente", "origen_dato": "empresa_cliente.giro"},
    {"clave": "email_cliente", "nombre_display": "Email del Cliente", "categoria": "cliente", "origen_dato": "empresa_cliente.email"},
    {"clave": "telefono_cliente", "nombre_display": "Teléfono del Cliente", "categoria": "cliente", "origen_dato": "empresa_cliente.telefono"},
    {"clave": "representante_cliente", "nombre_display": "Representante Legal Cliente", "categoria": "cliente", "origen_dato": "representante_cliente.usuario.get_nombre_completo"},
    {"clave": "rut_representante_cliente", "nombre_display": "RUT Representante Cliente", "categoria": "cliente", "origen_dato": "representante_cliente.rut"},
    # contrato
    {"clave": "fecha_contrato", "nombre_display": "Fecha del Contrato", "categoria": "contrato", "origen_dato": "contrato.fecha_inicio"},
    {"clave": "lugar_firma", "nombre_display": "Lugar de Firma", "categoria": "contrato", "origen_dato": "contrato.lugar_firma"},
    {"clave": "fecha_inicio", "nombre_display": "Fecha de Inicio", "categoria": "contrato", "origen_dato": "contrato.fecha_inicio"},
    {"clave": "fecha_fin", "nombre_display": "Fecha de Término", "categoria": "contrato", "origen_dato": "contrato.fecha_fin"},
    {"clave": "vigencia_meses", "nombre_display": "Vigencia en Meses", "categoria": "contrato", "origen_dato": "calculado:vigencia_meses"},
    {"clave": "dias_aviso_termino", "nombre_display": "Días de Aviso para Término", "categoria": "contrato", "origen_dato": "contrato.dias_aviso_termino"},
    {"clave": "renovacion_automatica", "nombre_display": "Renovación Automática", "categoria": "contrato", "origen_dato": "contrato.renovacion_automatica"},
    # economico
    {"clave": "moneda", "nombre_display": "Moneda", "categoria": "economico", "origen_dato": "contrato.get_moneda_cobro_display"},
    {"clave": "valor_total", "nombre_display": "Valor Total", "categoria": "economico", "origen_dato": "contrato.total_items_comerciales"},
    {"clave": "forma_pago", "nombre_display": "Forma de Pago", "categoria": "economico", "origen_dato": "contrato.get_forma_pago_contractual_display"},
    {"clave": "dia_facturacion", "nombre_display": "Día de Facturación", "categoria": "economico", "origen_dato": "contrato.dia_facturacion"},
    # servicio
    {"clave": "nombre_plan", "nombre_display": "Nombre del Plan/Servicio", "categoria": "servicio", "origen_dato": "items_comerciales[0].snapshot_nombre"},
    {"clave": "descripcion_servicio", "nombre_display": "Descripción del Servicio", "categoria": "servicio", "origen_dato": "items_comerciales[0].snapshot_descripcion"},
    {"clave": "incluye_servicio", "nombre_display": "Lo que Incluye", "categoria": "servicio", "origen_dato": "items_comerciales[0].snapshot_incluye"},
    {"clave": "no_incluye_servicio", "nombre_display": "Lo que No Incluye", "categoria": "servicio", "origen_dato": "items_comerciales[0].snapshot_no_incluye"},
]


class Command(BaseCommand):
    help = "Crea etiquetas predefinidas globales del sistema de plantillas."

    def add_arguments(self, parser):
        parser.add_argument(
            "--empresa_id", type=int, required=False, default=None,
            help="(Opcional) ID de empresa. Si se omite, crea etiquetas globales.",
        )

    def handle(self, *args, **options):
        empresa_id = options["empresa_id"]
        empresa = None
        if empresa_id:
            try:
                empresa = Empresa.objects.get(pk=empresa_id)
            except Empresa.DoesNotExist:
                self.stderr.write(self.style.ERROR(f"Empresa con id={empresa_id} no existe."))
                return

        creadas = 0
        existentes = 0
        for etiqueta_data in ETIQUETAS_PREDEFINIDAS:
            _, created = EtiquetaPlantilla.objects.get_or_create(
                empresa_prestadora=empresa,
                clave=etiqueta_data["clave"],
                defaults={
                    "nombre_display": etiqueta_data["nombre_display"],
                    "categoria": etiqueta_data["categoria"],
                    "origen_dato": etiqueta_data["origen_dato"],
                },
            )
            if created:
                creadas += 1
            else:
                existentes += 1

        scope = f"Empresa '{empresa.nombre}'" if empresa else "Globales"
        self.stdout.write(
            self.style.SUCCESS(
                f"{scope}: {creadas} etiquetas creadas, {existentes} ya existían."
            )
        )
