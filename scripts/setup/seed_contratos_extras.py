#!/usr/bin/env python
"""
Script para poblar catálogos extras de contratos: Visitas, Licencias, Condiciones Especiales.

Qué hace:
- Crea catálogo de Visitas (tipos de visitas programadas)
- Crea catálogo de Licencias (software licensiable)
- Crea catálogo de Condiciones Especiales (cláusulas contractuales)

Cuándo usar:
- Después de seed_servicios.py
- Antes de crear contratos completos
- CRÍTICO: Sin estos catálogos, no se pueden configurar visitas, licencias ni condiciones en contratos

Prerequisitos:
- Base de datos migrada
- Empresa base (11111111-1) creada por setup_superuser.py

Uso:
    cd backend
    backend\\ENV\\Scripts\\python.exe ..\\scripts\\setup\\seed_contratos_extras.py
"""
import os
import sys

import django

# Setup Django
backend_path = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
sys.path.insert(0, os.path.join(backend_path, "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")
django.setup()

from contratos.models import CondicionEspecial, Licencia, Visita


def crear_visitas():
    """Crea catálogo de tipos de visitas programadas."""
    print("\n--- Creando catálogo de Visitas ---")

    visitas_data = [
        {
            "descripcion": "Visita de Mantenimiento Mensual",
        },
        {
            "descripcion": "Visita de Mantenimiento Trimestral",
        },
        {
            "descripcion": "Visita de Mantenimiento Semestral",
        },
        {
            "descripcion": "Visita de Mantenimiento Anual",
        },
        {
            "descripcion": "Visita de Soporte Técnico",
        },
        {
            "descripcion": "Visita de Inspección de Equipos",
        },
        {
            "descripcion": "Visita de Instalación de Software",
        },
        {
            "descripcion": "Visita de Capacitación de Usuarios",
        },
    ]

    visitas = []
    for data in visitas_data:
        visita, created = Visita.objects.get_or_create(
            descripcion=data["descripcion"],
        )
        visitas.append(visita)
        if created:
            print(f"✓ Visita '{visita.descripcion}' creada")
        else:
            print(f"  Visita '{visita.descripcion}' ya existe")

    return visitas


def crear_licencias():
    """Crea catálogo de licencias de software."""
    print("\n--- Creando catálogo de Licencias ---")

    licencias_data = [
        {
            "nombre": "Microsoft 365 Business Standard",
            "proveedor": "Microsoft",
        },
        {
            "nombre": "Microsoft 365 E3",
            "proveedor": "Microsoft",
        },
        {
            "nombre": "AutoCAD",
            "proveedor": "Autodesk",
        },
        {
            "nombre": "Adobe Creative Cloud All Apps",
            "proveedor": "Adobe",
        },
        {
            "nombre": "Adobe Acrobat Pro",
            "proveedor": "Adobe",
        },
        {
            "nombre": "Windows 10 Pro",
            "proveedor": "Microsoft",
        },
        {
            "nombre": "Windows 11 Pro",
            "proveedor": "Microsoft",
        },
        {
            "nombre": "Slack Business+",
            "proveedor": "Slack",
        },
        {
            "nombre": "Zoom Pro",
            "proveedor": "Zoom",
        },
        {
            "nombre": "Antivirus Kaspersky Endpoint",
            "proveedor": "Kaspersky",
        },
        {
            "nombre": "TeamViewer Corporate",
            "proveedor": "TeamViewer",
        },
        {
            "nombre": "SolidWorks Professional",
            "proveedor": "Dassault Systèmes",
        },
    ]

    licencias = []
    for data in licencias_data:
        licencia, created = Licencia.objects.get_or_create(
            nombre=data["nombre"],
            defaults={
                "proveedor": data["proveedor"],
            },
        )
        licencias.append(licencia)
        if created:
            print(f"✓ Licencia '{licencia.nombre}' de {licencia.proveedor} creada")
        else:
            print(f"  Licencia '{licencia.nombre}' ya existe")

    return licencias


def crear_condiciones_especiales():
    """Crea catálogo de condiciones especiales contractuales."""
    print("\n--- Creando catálogo de Condiciones Especiales ---")

    condiciones_data = [
        {
            "titulo": "SLA 24/7 - Tiempo de Respuesta 2 horas",
            "descripcion": "El proveedor se compromete a responder solicitudes de soporte dentro de 2 horas, las 24 horas del día, los 7 días de la semana, incluyendo días festivos.",
        },
        {
            "titulo": "SLA 8x5 - Tiempo de Respuesta 4 horas",
            "descripcion": "El proveedor responderá solicitudes de soporte dentro de 4 horas, en horario laboral de lunes a viernes de 9:00 a 18:00 horas.",
        },
        {
            "titulo": "Garantía Extendida 3 años",
            "descripcion": "El proveedor garantiza el correcto funcionamiento de los equipos y servicios por un período de 3 años desde la fecha de inicio del contrato.",
        },
        {
            "titulo": "Garantía Extendida 5 años",
            "descripcion": "El proveedor garantiza el correcto funcionamiento de los equipos y servicios por un período de 5 años desde la fecha de inicio del contrato.",
        },
        {
            "titulo": "Reemplazo de Equipos en Caso de Falla",
            "descripcion": "En caso de falla irreparable de equipos, el proveedor se compromete a proporcionar un equipo de reemplazo de características similares o superiores en un plazo máximo de 48 horas.",
        },
        {
            "titulo": "Capacitación de Usuarios Incluida",
            "descripcion": "El contrato incluye capacitación para hasta 20 usuarios en el uso de los sistemas y equipos proporcionados, con sesiones de 4 horas cada una.",
        },
        {
            "titulo": "Actualización de Software Incluida",
            "descripcion": "El proveedor proporcionará actualizaciones de software sin costo adicional durante la vigencia del contrato, incluyendo nuevas versiones y parches de seguridad.",
        },
        {
            "titulo": "Penalización por Incumplimiento de SLA",
            "descripcion": "En caso de incumplimiento de los tiempos de respuesta establecidos, el cliente recibirá un descuento del 5% en la facturación mensual por cada incidente no atendido en tiempo.",
        },
        {
            "titulo": "Confidencialidad y NDA",
            "descripcion": "Ambas partes se comprometen a mantener confidencialidad sobre información sensible compartida durante la vigencia del contrato y hasta 2 años después de su finalización.",
        },
        {
            "titulo": "Cláusula de Terminación Anticipada",
            "descripcion": "El cliente puede terminar el contrato anticipadamente con 60 días de aviso previo por escrito, sin penalización alguna si el motivo es incumplimiento del proveedor.",
        },
    ]

    condiciones = []
    for data in condiciones_data:
        condicion, created = CondicionEspecial.objects.get_or_create(
            titulo=data["titulo"],
            defaults={
                "descripcion": data["descripcion"],
            },
        )
        condiciones.append(condicion)
        if created:
            print(f"✓ Condición '{condicion.titulo}' creada")
        else:
            print(f"  Condición '{condicion.titulo}' ya existe")

    return condiciones


def main():
    print("=" * 70)
    print(
        "SEED CONTRATOS EXTRAS - Poblando catálogos de Visitas, Licencias y Condiciones"
    )
    print("=" * 70)

    try:
        # Crear catálogos
        visitas = crear_visitas()
        licencias = crear_licencias()
        condiciones = crear_condiciones_especiales()

        # Resumen
        print("\n" + "=" * 70)
        print("RESUMEN DE CREACIÓN")
        print("=" * 70)
        print(
            f"Visitas creadas:              {len([v for v in visitas if v.id is not None])}"
        )
        print(
            f"Licencias creadas:            {len([l for l in licencias if l.id is not None])}"
        )
        print(
            f"Condiciones especiales:       {len([c for c in condiciones if c.id is not None])}"
        )
        print("=" * 70)
        print("✅ SEED CONTRATOS EXTRAS COMPLETADO CON ÉXITO")
        print("=" * 70)

        # Verificación
        print("\n📊 Totales en base de datos:")
        print(f"   - Visitas: {Visita.objects.count()}")
        print(f"   - Licencias: {Licencia.objects.count()}")
        print(f"   - Condiciones Especiales: {CondicionEspecial.objects.count()}")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
