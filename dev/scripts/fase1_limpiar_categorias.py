"""
Script para LIMPIAR categorías de CategoriaGastoRendicion
BLOQUE 6 - Fase 1: Limpieza de Categorías

ACCIONES:
1. Eliminar categorías de materiales
2. Consolidar duplicados (mantener versión con tildes correctas)
3. Crear categorías faltantes si es necesario

EJECUTAR CON: backend\ENV\Scripts\python.exe dev\scripts\fase1_limpiar_categorias.py
"""

import os
import sys

import django

# Setup Django
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")
django.setup()

from ordentrabajov2.models import RendicionEnOt
from rendiciones.models import CategoriaGastoRendicion, DetalleGastoRendicion

print("=" * 80)
print("BLOQUE 6 - FASE 1: LIMPIEZA DE CATEGORÍAS")
print("=" * 80)
print()

# =============================================================================
# PASO 1: Eliminar categorías de MATERIALES
# =============================================================================
print("PASO 1: Eliminando categorías de MATERIALES...")
print("-" * 80)

ids_materiales = [13, 14, 15, 16, 17, 28, 29, 30]
cats_eliminadas = []

for cat_id in ids_materiales:
    try:
        cat = CategoriaGastoRendicion.objects.get(id=cat_id)
        nombre = cat.nombre
        cat.delete()
        cats_eliminadas.append(f"  ✓ ID {cat_id:2d} - {nombre}")
        print(f"  ✓ Eliminado: ID {cat_id:2d} - {nombre}")
    except CategoriaGastoRendicion.DoesNotExist:
        print(f"  ⚠  ID {cat_id} no existe")

print(f"\n✓ Eliminadas {len(cats_eliminadas)} categorías de materiales\n")

# =============================================================================
# PASO 2: Consolidar DUPLICADOS
# =============================================================================
print("PASO 2: Consolidando duplicados...")
print("-" * 80)

# Definir mapeo: (IDs a eliminar) -> (ID a mantener, nombre correcto)
consolidaciones = [
    # Transporte
    ([25], 6, "Arriendo de Vehículo"),  # Mantener con tilde
    ([24], 5, "Transporte Público (Metro/Bus)"),  # Mantener con tildes
    # Alimentación
    ([26], 7, "Desayuno"),  # Eliminar "Desayuno / Almuerzo / Cena", mantener individual
    ([27], 10, "Colación"),  # Mantener con tilde
    ([33], 20, "Capacitación"),  # Mantener con tilde
    # Comunicaciones
    ([32], 19, "Internet Móvil"),  # Mantener con tilde
    ([31], 18, "Llamadas Telefónicas"),  # Mantener con tildes
    # Servicios
    ([34], 22, "Envío de Documentos"),  # Mantener con tilde
]

migradas = 0
eliminadas_dupl = 0

for ids_eliminar, id_mantener, nombre_final in consolidaciones:
    try:
        cat_mantener = CategoriaGastoRendicion.objects.get(id=id_mantener)

        # Actualizar nombre si es necesario
        if cat_mantener.nombre != nombre_final:
            cat_mantener.nombre = nombre_final
            cat_mantener.save()
            print(f"  ✓ Actualizado nombre: ID {id_mantener} → '{nombre_final}'")

        # Migrar referencias y eliminar duplicados
        for id_elim in ids_eliminar:
            try:
                cat_elim = CategoriaGastoRendicion.objects.get(id=id_elim)

                # Migrar DetalleGastoRendicion
                detalles = DetalleGastoRendicion.objects.filter(categoria=cat_elim)
                count_detalles = detalles.count()
                if count_detalles > 0:
                    detalles.update(categoria=cat_mantener)
                    migradas += count_detalles

                # Migrar RendicionEnOt
                rend_ot = RendicionEnOt.objects.filter(categoria=cat_elim)
                count_rend = rend_ot.count()
                if count_rend > 0:
                    rend_ot.update(categoria=cat_mantener)
                    migradas += count_rend

                # Eliminar duplicado
                nombre_elim = cat_elim.nombre
                cat_elim.delete()
                eliminadas_dupl += 1
                print(
                    f"  ✓ Eliminado duplicado: ID {id_elim} '{nombre_elim}' → ID {id_mantener}"
                )

            except CategoriaGastoRendicion.DoesNotExist:
                pass

    except CategoriaGastoRendicion.DoesNotExist:
        print(f"  ⚠  ID {id_mantener} no existe, no se puede consolidar")

print(f"\n✓ Eliminados {eliminadas_dupl} duplicados")
print(f"✓ Migradas {migradas} referencias")
print()

# =============================================================================
# PASO 3: Verificar categorías finales
# =============================================================================
print("PASO 3: Categorías finales (OPERATIVAS)...")
print("-" * 80)

categorias_finales = CategoriaGastoRendicion.objects.all().order_by("nombre")

print(f"\n✓ Total categorías: {categorias_finales.count()}\n")

for cat in categorias_finales:
    detalles_count = DetalleGastoRendicion.objects.filter(categoria=cat).count()
    rend_ot_count = RendicionEnOt.objects.filter(categoria=cat).count()
    total_uso = detalles_count + rend_ot_count
    print(f"  ID {cat.id:2d} - {cat.nombre:45s} [Uso: {total_uso:3d}]")

print("\n" + "=" * 80)
print("✓ LIMPIEZA COMPLETADA")
print("=" * 80)
print()
print("Resumen:")
print(f"  - Categorías de materiales eliminadas: {len(cats_eliminadas)}")
print(f"  - Duplicados eliminados: {eliminadas_dupl}")
print(f"  - Referencias migradas: {migradas}")
print(f"  - Categorías operativas finales: {categorias_finales.count()}")
print()
print("=" * 80)
