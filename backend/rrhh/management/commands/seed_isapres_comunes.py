"""
Seed idempotente: crea el catalogo global de Isapres chilenas comunes
(empresa=None), para que el select de "Nombre Isapre" del wizard de
contratos (StepPrevisionBanco.tsx) no arranque vacio.

Uso:
    python manage.py seed_isapres_comunes
"""

from django.core.management.base import BaseCommand

from rrhh.models import IsapreCatalogo


ISAPRES_COMUNES = [
    "Banmédica",
    "Colmena Golden Cross",
    "Consalud",
    "Cruz Blanca",
    "Nueva Masvida",
    "Vida Tres",
    "Esencial",
]


class Command(BaseCommand):
    help = "Crea el catalogo global de Isapres comunes (idempotente)."

    def handle(self, *args, **options):
        for nombre in ISAPRES_COMUNES:
            isapre, created = IsapreCatalogo.objects.get_or_create(
                empresa=None,
                nombre=nombre,
            )
            accion = self.style.SUCCESS("Creada") if created else "Ya existía"
            self.stdout.write(f"{accion}: '{isapre.nombre}' (id={isapre.id})")

        self.stdout.write(
            self.style.SUCCESS(f"Seed completo: {len(ISAPRES_COMUNES)} Isapres globales.")
        )
