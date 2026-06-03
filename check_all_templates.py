import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
django.setup()

from contratos.models import PlantillaContrato

print("=== VERIFICACION COMPLETA DE PLANTILLAS ===\n")

# TODAS las plantillas
print("TODAS LAS PLANTILLAS EN LA BD:")
print("=" * 70)
todas = PlantillaContrato.objects.all()
print(f"Total: {todas.count()}\n")

for p in todas:
    empresa = p.empresa_prestadora.nombre if p.empresa_prestadora else "GLOBAL (None)"
    print(f"ID={p.id:2d} | {p.tipo_contrato:10s} | {p.titulo:45s} | {empresa}")

print("\n" + "=" * 70)
print("\nTIPO 'trabajador' - DESGLOSE:")
print("=" * 70)

globales = PlantillaContrato.objects.filter(tipo_contrato='trabajador', empresa_prestadora=None)
con_empresa = PlantillaContrato.objects.filter(tipo_contrato='trabajador').exclude(empresa_prestadora=None)

print(f"\nGlobales (empresa_prestadora=None): {globales.count()}")
for p in globales:
    print(f"  ID={p.id} | {p.titulo}")

print(f"\nCon empresa asignada: {con_empresa.count()}")
if con_empresa.exists():
    for p in con_empresa:
        print(f"  ID={p.id} | {p.titulo} | Empresa={p.empresa_prestadora.nombre}")
else:
    print("  (ninguna - correcto)")
