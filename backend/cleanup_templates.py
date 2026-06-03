import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
django.setup()

from contratos.models import PlantillaContrato

# Eliminar plantillas tipo trabajador que tienen empresa (las duplicadas)
deleted = PlantillaContrato.objects.filter(
    tipo_contrato='trabajador'
).exclude(
    empresa_prestadora=None
).delete()

print(f"Eliminadas {deleted[0]} plantillas duplicadas de tipo 'trabajador'")
