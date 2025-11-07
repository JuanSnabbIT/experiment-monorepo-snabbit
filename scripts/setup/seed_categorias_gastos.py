#!/usr/bin/env python
"""
Script para poblar catálogo de Categorías de Gastos para Rendiciones.

Qué hace:
- Crea categorías de gastos típicas para rendiciones de técnicos
- Incluye categorías de transporte, alimentación, hospedaje, materiales, etc.

Cuándo usar:
- Antes de que usuarios creen Rendiciones
- CRÍTICO: Sin estas categorías, no se pueden crear DetalleGastoRendicion

Prerequisitos:
- Base de datos migrada

Uso:
    cd backend
    backend\\ENV\\Scripts\\python.exe ..\\scripts\\setup\\seed_categorias_gastos.py
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

from rendiciones.models import CategoriaGastoRendicion


def crear_categorias_gastos():
    """Crea catálogo de categorías de gastos para rendiciones."""
    print("\n--- Creando catálogo de Categorías de Gastos ---")

    categorias_data = [
        # Transporte
        {"nombre": "Combustible"},
        {"nombre": "Peaje"},
        {"nombre": "Estacionamiento"},
        {"nombre": "Taxi/Uber"},
        {"nombre": "Transporte Público (Metro/Bus)"},
        {"nombre": "Arriendo de Vehículo"},
        # Alimentación
        {"nombre": "Desayuno"},
        {"nombre": "Almuerzo"},
        {"nombre": "Cena"},
        {"nombre": "Colación"},
        # Hospedaje
        {"nombre": "Hotel"},
        {"nombre": "Hostal"},
        # Materiales y Herramientas
        {"nombre": "Cables y Conectores"},
        {"nombre": "Herramientas"},
        {"nombre": "Material Eléctrico"},
        {"nombre": "Tornillería"},
        {"nombre": "Consumibles (cinta, pegamento, etc.)"},
        # Comunicaciones
        {"nombre": "Llamadas Telefónicas"},
        {"nombre": "Internet Móvil"},
        # Otros
        {"nombre": "Capacitación"},
        {"nombre": "Impresiones y Fotocopias"},
        {"nombre": "Envío de Documentos"},
        {"nombre": "Gastos Varios"},
    ]

    categorias = []
    for data in categorias_data:
        categoria, created = CategoriaGastoRendicion.objects.get_or_create(
            nombre=data["nombre"],
        )
        categorias.append(categoria)
        if created:
            print(f"✓ Categoría '{categoria.nombre}' creada")
        else:
            print(f"  Categoría '{categoria.nombre}' ya existe")

    return categorias


def main():
    print("=" * 70)
    print("SEED CATEGORÍAS DE GASTOS - Poblando catálogo para Rendiciones")
    print("=" * 70)

    try:
        # Crear categorías
        categorias = crear_categorias_gastos()

        # Resumen
        print("\n" + "=" * 70)
        print("RESUMEN DE CREACIÓN")
        print("=" * 70)
        print(
            f"Categorías de gastos creadas:  {len([c for c in categorias if c.id is not None])}"
        )
        print("=" * 70)
        print("✅ SEED CATEGORÍAS DE GASTOS COMPLETADO CON ÉXITO")
        print("=" * 70)

        # Verificación
        print(
            f"\n📊 Total en base de datos: {CategoriaGastoRendicion.objects.count()} categorías"
        )

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
