"""
Script para verificar categorías de materiales en CategoriaGastoRendicion
Parte de BLOQUE 6 - Fase 1: Limpieza de Categorías
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

# Palabras clave para categorías de materiales (deben eliminarse)
keywords_materiales = ["cable", "herramienta", "material", "tornill", "consumible"]

print("=" * 80)
print("BLOQUE 6 - FASE 1: Verificación de Categorías de Materiales")
print("=" * 80)

# Buscar categorías de materiales
cats_materiales = []
for keyword in keywords_materiales:
    cats = CategoriaGastoRendicion.objects.filter(nombre__icontains=keyword)
    cats_materiales.extend(cats)

# Eliminar duplicados
cats_materiales = list(set(cats_materiales))
cats_materiales.sort(key=lambda x: x.id)

print(f"\n✓ Total categorías encontradas: {CategoriaGastoRendicion.objects.count()}")
print(f"✗ Categorías de MATERIALES (a eliminar): {len(cats_materiales)}\n")

# Verificar referencias
referencias_encontradas = False
for cat in cats_materiales:
    detalles_count = DetalleGastoRendicion.objects.filter(categoria=cat).count()
    rend_ot_count = RendicionEnOt.objects.filter(categoria=cat).count()

    print(f"  ID {cat.id:2d} - {cat.nombre}")
    if detalles_count > 0 or rend_ot_count > 0:
        print(
            f"       ⚠️  REFERENCIAS: {detalles_count} DetalleGastoRendicion, {rend_ot_count} RendicionEnOt"
        )
        referencias_encontradas = True

print("\n" + "=" * 80)
if referencias_encontradas:
    print("⚠️  ADVERTENCIA: Existen gastos usando categorías de materiales")
    print("   Recomendación: Migrar gastos a Compras antes de eliminar categorías")
else:
    print("✓ SEGURO: No hay referencias, se pueden eliminar las categorías")

print("=" * 80)

# Listar categorías operativas (las que SE MANTIENEN)
print("\n\nCategorías OPERATIVAS (se mantienen):")
print("-" * 80)

cats_operativas = CategoriaGastoRendicion.objects.exclude(
    id__in=[c.id for c in cats_materiales]
).order_by("nombre")

for cat in cats_operativas:
    detalles_count = DetalleGastoRendicion.objects.filter(categoria=cat).count()
    rend_ot_count = RendicionEnOt.objects.filter(categoria=cat).count()
    total_uso = detalles_count + rend_ot_count
    print(f"  ID {cat.id:2d} - {cat.nombre:40s} [Uso: {total_uso:3d} gastos]")

print("\n" + "=" * 80)
print("FIN DE VERIFICACIÓN")
print("=" * 80)
