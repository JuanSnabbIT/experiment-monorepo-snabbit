"""
Sincroniza el catalogo de roles (Group + DescripcionGrupo) usado por el motor
de autorizacion (core.permissions.TienePermisoDeRol).

Idempotente: usa get_or_create, seguro de correr multiples veces.

Uso:
    python manage.py sync_roles_catalogo
"""

from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand

from core.models import DescripcionGrupo

ROLES = [
    ("staff", "Personal interno de Snabbit con acceso administrativo amplio."),
    ("superadmin", "Administrador con acceso total al sistema."),
    ("rrhh", "Recursos Humanos: contratos laborales, vacaciones, RRHH."),
    ("multi-empresas", "Usuario con acceso a mas de una empresa prestadora."),
    ("contratos", "Gestion de contratos comerciales B2B."),
    ("finanzas", "Facturacion, cobranza y reportes financieros."),
    ("tecnico", "Tecnico de terreno: ordenes de trabajo, visitas."),
    ("ventas", "Gestion de cotizaciones y ventas."),
    ("comprador", "Ordenes de compra y abastecimiento."),
    ("bodega", "Gestion de inventario y bodegas."),
    ("operaciones", "Coordinacion operativa de ordenes de trabajo."),
    ("representante_legal", "Representante legal de una empresa cliente."),
]


class Command(BaseCommand):
    help = "Sincroniza el catalogo de roles (Group + DescripcionGrupo) conocido por el sistema."

    def handle(self, *args, **options):
        creados = actualizados = 0
        for nombre, descripcion in ROLES:
            group, group_creado = Group.objects.get_or_create(name=nombre)
            _, desc_creada = DescripcionGrupo.objects.get_or_create(
                group=group,
                defaults={"descripcion": descripcion, "activo": True},
            )
            if group_creado or desc_creada:
                creados += 1
            else:
                actualizados += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Catalogo de roles sincronizado: {creados} creados, {actualizados} ya existentes."
            )
        )
