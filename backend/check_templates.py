import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
django.setup()

from contratos.models import PlantillaContrato

print("=== TODAS LAS PLANTILLAS ===")
for p in PlantillaContrato.objects.all():
    print(f"[{p.tipo_contrato}] {p.titulo} (ID={p.id}, Empresa={p.empresa_prestadora.nombre}, Activa={p.activa})")

print("\n=== PLANTILLAS TIPO 'TRABAJADOR' ===")
laborales = PlantillaContrato.objects.filter(tipo_contrato='trabajador')
print(f"Total: {laborales.count()}")
for p in laborales:
    print(f"  - {p.titulo} (ID={p.id}, Empresa={p.empresa_prestadora.nombre})")
