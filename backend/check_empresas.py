import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
django.setup()

from empresas.models import Empresa

print("=== EMPRESAS EXISTENTES ===")
for e in Empresa.objects.all():
    print(f"ID={e.id}, Nombre={e.nombre}")
