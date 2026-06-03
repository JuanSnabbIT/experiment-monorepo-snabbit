from django.core.management.base import BaseCommand

from rrhh.models import TurnoLaboral

TURNOS_GLOBALES = [
    {
        "nombre": "Manana",
        "hora_inicio": "06:00",
        "hora_fin": "14:00",
        "dias_semana": ["L", "M", "X", "J", "V"],
    },
    {
        "nombre": "Tarde",
        "hora_inicio": "14:00",
        "hora_fin": "22:00",
        "dias_semana": ["L", "M", "X", "J", "V"],
    },
    {
        "nombre": "Noche",
        "hora_inicio": "22:00",
        "hora_fin": "06:00",
        "dias_semana": ["L", "M", "X", "J", "V"],
    },
]


class Command(BaseCommand):
    help = "Seed de turnos laborales globales (empresa=null), disponibles para todas las empresas."

    def handle(self, *args, **options):
        creados = 0
        for data in TURNOS_GLOBALES:
            _, created = TurnoLaboral.objects.get_or_create(
                empresa=None,
                nombre=data["nombre"],
                defaults={
                    "hora_inicio": data["hora_inicio"],
                    "hora_fin": data["hora_fin"],
                    "dias_semana": data["dias_semana"],
                },
            )
            if created:
                creados += 1
        self.stdout.write(self.style.SUCCESS(f"{creados} turnos globales creados (idempotente)."))
