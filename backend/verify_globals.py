import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
django.setup()

from contratos.models import PlantillaContrato

print("=== VERIFICACION: PLANTILLAS GLOBALES VS DE EMPRESA ===\n")

# Globales
globales = PlantillaContrato.objects.filter(
    tipo_contrato='trabajador',
    empresa_prestadora=None
)
print(f"PLANTILLAS GLOBALES (disponibles para TODAS las empresas):")
print(f"Total: {globales.count()}")
for p in globales:
    print(f"  [ID={p.id}] {p.titulo} | activa={p.activa}")

print("\nPLANTILLAS POR EMPRESA (solo para su empresa):")
por_empresa = PlantillaContrato.objects.filter(
    tipo_contrato='trabajador'
).exclude(
    empresa_prestadora=None
)
print(f"Total: {por_empresa.count()}")
if por_empresa.count() > 0:
    for p in por_empresa:
        print(f"  [ID={p.id}] {p.titulo} | Empresa={p.empresa_prestadora.nombre}")
else:
    print("  (ninguna)")

print("\n=== TEST API: es_global en respuesta ===")
from contratos.serializers import PlantillaContratoSerializer

plantilla_global = globales.first()
if plantilla_global:
    serializer = PlantillaContratoSerializer(plantilla_global)
    data = serializer.data
    print(f"Plantilla: {data['titulo']}")
    print(f"  empresa_prestadora: {data['empresa_prestadora']}")
    print(f"  es_global: {data['es_global']}")
    if data['es_global']:
        print("  ✓ CORRECTO: es_global=true")
    else:
        print("  ✗ ERROR: es_global deberia ser true")
