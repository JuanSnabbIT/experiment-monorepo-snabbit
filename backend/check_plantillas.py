import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
django.setup()

from contratos.models import PlantillaContrato

# Buscar plantillas tipo 'trabajador'
plantillas_trabajador = PlantillaContrato.objects.filter(tipo_contrato='trabajador')
print(f"Plantillas laborales (tipo='trabajador'): {plantillas_trabajador.count()}")

if plantillas_trabajador.exists():
    for p in plantillas_trabajador:
        empresa_nombre = p.empresa_prestadora.nombre if p.empresa_prestadora else 'GLOBAL'
        print(f"  ✓ {p.titulo} (Empresa: {empresa_nombre})")
else:
    print("  ❌ No hay plantillas laborales creadas")

# También mostrar TODAS las plantillas para contexto
print("\n--- TODAS las plantillas en la BD ---")
todas = PlantillaContrato.objects.all()
print(f"Total de plantillas: {todas.count()}")
for p in todas:
    empresa_nombre = p.empresa_prestadora.nombre if p.empresa_prestadora else 'GLOBAL'
    print(f"  [{p.tipo_contrato}] {p.titulo} - {empresa_nombre}")
