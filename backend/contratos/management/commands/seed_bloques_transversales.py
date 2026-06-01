"""Seed idempotente de BloqueTransversalContrato.

Ejecutar con:
    python manage.py seed_bloques_transversales

Es seguro ejecutar mas de una vez: usa get_or_create para cada bloque.
"""
from django.core.management.base import BaseCommand

from contratos.models import BloqueTransversalContrato

BLOQUES = [
    # tipo_contrato, codigo, titulo, descripcion, posicion_default
    (
        "servicios",
        "identificacion_cliente",
        "Identificacion del Cliente",
        "Datos de la empresa cliente: razon social, RUT, domicilio, representante.",
        0,
    ),
    (
        "servicios",
        "tabla_servicios",
        "Tabla de Servicios",
        "Listado de servicios contratados con descripcion, cantidad y precio.",
        1,
    ),
    (
        "servicios",
        "resumen_comercial",
        "Resumen Comercial",
        "Totales del contrato: subtotal, descuento, impuesto y total final.",
        2,
    ),
    (
        "licencia",
        "identificacion_cliente",
        "Identificacion del Cliente",
        "Datos de la empresa cliente: razon social, RUT, domicilio, representante.",
        0,
    ),
    (
        "licencia",
        "tabla_licencias",
        "Tabla de Licencias",
        "Listado de licencias: software, version, cantidad, modalidad.",
        1,
    ),
    (
        "licencia",
        "resumen_comercial",
        "Resumen Comercial",
        "Totales del contrato: subtotal, descuento, impuesto y total final.",
        2,
    ),
    (
        "venta",
        "identificacion_cliente",
        "Identificacion del Cliente",
        "Datos de la empresa cliente: razon social, RUT, domicilio, representante.",
        0,
    ),
    (
        "venta",
        "tabla_servicios",
        "Tabla de Productos / Servicios",
        "Listado de items vendidos con descripcion, cantidad y precio unitario.",
        1,
    ),
    (
        "venta",
        "tabla_cuotas",
        "Plan de Cuotas",
        "Cronograma de pagos: numero de cuota, fecha de vencimiento y monto.",
        2,
    ),
    (
        "venta",
        "resumen_comercial",
        "Resumen Comercial",
        "Totales del contrato: subtotal, descuento, impuesto y total final.",
        3,
    ),
    (
        "trabajador",
        "identificacion_cliente",
        "Datos del Trabajador",
        "Nombre completo, RUT, cargo, fecha de ingreso.",
        0,
    ),
    (
        "trabajador",
        "resumen_comercial",
        "Condiciones Economicas",
        "Remuneracion, bonos, beneficios y forma de pago.",
        1,
    ),
]


class Command(BaseCommand):
    help = "Seed idempotente de BloqueTransversalContrato"

    def handle(self, *args, **options):
        creados = 0
        existentes = 0

        for tipo, codigo, titulo, descripcion, posicion in BLOQUES:
            _, created = BloqueTransversalContrato.objects.get_or_create(
                tipo_contrato=tipo,
                codigo=codigo,
                defaults={
                    "titulo": titulo,
                    "descripcion": descripcion,
                    "posicion_default": posicion,
                    "activo": True,
                },
            )
            if created:
                creados += 1
                self.stdout.write(f"  [+] {tipo} / {codigo}")
            else:
                existentes += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"seed_bloques_transversales completado: {creados} creados, {existentes} ya existian."
            )
        )
