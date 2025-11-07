#!/usr/bin/env python
"""
Script para poblar servicios y planes de servicio en la base de datos.

Qué hace:
- Crea servicios de ejemplo (instalación, mantenimiento, soporte)
- Crea planes de servicio (paquetes con múltiples servicios)
- Crea características de servicio
- Útil para testing del módulo de contratos

Cuándo usar:
- Después de setup inicial cuando necesites crear contratos
- Para testing de módulo de contratos
- Para demos del sistema

Prerequisitos:
- Base de datos migrada
- Empresa base configurada (setup_superuser.py)

Uso:
    backend\\ENV\\Scripts\\python.exe scripts\\setup\\seed_servicios.py
"""
import os
import sys
from decimal import Decimal

import django

# Setup Django
backend_path = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
sys.path.insert(0, os.path.join(backend_path, "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")
django.setup()

from contratos.estados_modelo import CATEGORIAS_SERVICIO
from contratos.models import CaracteristicaServicio, PlanServicio, Servicio
from empresas.models import Empresa


def crear_servicios():
    """Crea servicios de ejemplo usando las categorías del sistema."""
    # Categorías disponibles: mantencion, desarrollo, soporte, capacitacion, datacenter
    servicios_data = [
        {
            "nombre": "Mantención Preventiva de Infraestructura",
            "descripcion": "Revisión mensual de servidores, redes y equipos críticos",
            "categoria": "mantencion",
        },
        {
            "nombre": "Desarrollo de Aplicación Web Personalizada",
            "descripcion": "Desarrollo de software a medida según requerimientos del cliente",
            "categoria": "desarrollo",
        },
        {
            "nombre": "Soporte Técnico Nivel 2",
            "descripcion": "Asistencia técnica especializada para resolución de incidentes",
            "categoria": "soporte",
        },
        {
            "nombre": "Capacitación en Nuevas Tecnologías",
            "descripcion": "Cursos y talleres de capacitación para equipos técnicos",
            "categoria": "capacitacion",
        },
        {
            "nombre": "Hosting y Almacenamiento en Datacenter",
            "descripcion": "Servicios de alojamiento de servidores y almacenamiento de datos",
            "categoria": "datacenter",
        },
        {
            "nombre": "Migración de Sistemas Legacy",
            "descripcion": "Migración de aplicaciones antiguas a plataformas modernas",
            "categoria": "desarrollo",
        },
        {
            "nombre": "Monitoreo 24/7 de Infraestructura",
            "descripcion": "Servicio de monitoreo continuo de servidores y aplicaciones críticas",
            "categoria": "datacenter",
        },
    ]

    servicios = []
    for data in servicios_data:
        servicio, created = Servicio.objects.get_or_create(
            nombre=data["nombre"],
            defaults={
                "descripcion": data["descripcion"],
                "categoria": data["categoria"],
            },
        )
        servicios.append(servicio)
        if created:
            print(
                f"✓ Servicio '{servicio.nombre}' creado (categoría: {servicio.get_categoria_display()})"
            )
        else:
            print(f"  Servicio '{servicio.nombre}' ya existe")

    return servicios


def crear_caracteristicas():
    """Crea características de servicio."""
    caracteristicas_data = [
        {
            "nombre": "Incluye materiales",
            "descripcion": "El servicio incluye todos los materiales necesarios",
        },
        {
            "nombre": "24/7 Disponibilidad",
            "descripcion": "Servicio disponible las 24 horas, 7 días a la semana",
        },
        {
            "nombre": "Garantía extendida",
            "descripcion": "Garantía extendida de 12 meses en reparaciones",
        },
        {
            "nombre": "Respuesta prioritaria",
            "descripcion": "Tiempo de respuesta menor a 2 horas",
        },
        {
            "nombre": "Informe técnico",
            "descripcion": "Incluye informe técnico detallado del servicio realizado",
        },
    ]

    caracteristicas = []
    for data in caracteristicas_data:
        caracteristica, created = CaracteristicaServicio.objects.get_or_create(
            nombre=data["nombre"],
            defaults={
                "descripcion": data["descripcion"],
            },
        )
        caracteristicas.append(caracteristica)
        if created:
            print(f"✓ Característica '{caracteristica.nombre}' creada")
        else:
            print(f"  Característica '{caracteristica.nombre}' ya existe")

    return caracteristicas


def crear_planes_servicio(servicios, caracteristicas):
    """\
    Crea planes de servicio pre-definidos.
    
    Un plan de servicio es un paquete que agrupa varios servicios
    relacionados. En el modelo actual, PlanServicio solo tiene:
    - nombre: Nombre del plan
    - descripcion: Descripción del plan
    - servicios: ManyToMany con Servicio
    
    Nota: El modelo no tiene campos de precio ni características.
    Si se requiere, deben agregarse al modelo en contratos/models.py.
    
    Returns:
        list: Lista de PlanServicio creados
    """
    planes_data = [
        {
            "nombre": "Plan Infraestructura Básica",
            "descripcion": "Paquete básico con mantenimiento preventivo y soporte técnico nivel 2",
            "servicios_idx": [0, 2],  # Mantención Preventiva + Soporte Técnico
        },
        {
            "nombre": "Plan Desarrollo Completo",
            "descripcion": "Solución integral para desarrollo de software con capacitación incluida",
            "servicios_idx": [1, 3],  # Desarrollo Web + Capacitación
        },
        {
            "nombre": "Plan Datacenter Premium",
            "descripcion": "Hosting, monitoreo 24/7 y migración de sistemas legacy",
            "servicios_idx": [4, 5, 6],  # Hosting + Migración + Monitoreo
        },
    ]

    planes = []
    for data in planes_data:
        plan, created = PlanServicio.objects.get_or_create(
            nombre=data["nombre"],
            defaults={
                "descripcion": data["descripcion"],
            },
        )

        if created or not plan.servicios.exists():
            # Agregar servicios al plan
            servicios_plan = [servicios[i] for i in data["servicios_idx"]]
            plan.servicios.set(servicios_plan)
            plan.save()

        planes.append(plan)
        if created:
            servicios_nombres = ", ".join(
                [servicios[i].nombre for i in data["servicios_idx"]]
            )
            print(f"✓ Plan '{plan.nombre}' creado")
            print(f"  - {plan.servicios.count()} servicios incluidos")
        else:
            print(f"  Plan '{plan.nombre}' ya existe")

    return planes


def main():
    print("=" * 60)
    print("Población de Servicios y Planes de Servicio")
    print("=" * 60)
    print()

    print("--- Creando servicios ---")
    servicios = crear_servicios()
    print()

    print("--- Creando características de servicio ---")
    caracteristicas = crear_caracteristicas()
    print()

    print("--- Creando planes de servicio ---")
    planes = crear_planes_servicio(servicios, caracteristicas)
    print()

    print("=" * 60)
    print("✓ Servicios y planes creados exitosamente")
    print("=" * 60)
    print()
    print("Resumen:")
    print(f"- Servicios: {len(servicios)}")
    print(f"- Características: {len(caracteristicas)}")
    print(f"- Planes de servicio: {len(planes)}")
    print()
    print("Ahora puedes agregar servicios/planes a tus contratos.")
    print()


if __name__ == "__main__":
    main()
