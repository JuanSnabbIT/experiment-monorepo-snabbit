#!/usr/bin/env python
import os
import sys
import django

def bootstrap_django():
    this_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.abspath(os.path.join(this_dir, "..", "..", ".."))
    backend_path = os.path.join(repo_root, "backend")
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
    try:
        os.chdir(backend_path)
    except Exception:
        pass
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")
    django.setup()

bootstrap_django()

from django.contrib.auth import get_user_model
User = get_user_model()

# import models
from empresas.models import Empresa, SucursalEmpresa
from bodegas.models import Bodega
from items.models import ItemEmpresa
from core.models import Software

def main():
    empresa_exists = Empresa.objects.filter(rut_empresa="11111111-1").exists()
    sucursal_exists = SucursalEmpresa.objects.filter(nombre="Casa Matriz").exists()
    bodega_exists = Bodega.objects.filter(nombre="Bodega Principal").exists()
    items_qs = ItemEmpresa.objects.filter(empresa__rut_empresa="11111111-1")
    items_count = items_qs.count()
    items_list = list(items_qs.values_list("nombre", flat=True)[:20])
    software_count = Software.objects.filter(nombre__in=["Windows", "Office", "Antivirus"]).count()
    super_exists = User.objects.filter(is_superuser=True).exists()

    print(f"Empresa exists: {empresa_exists}")
    print(f"Sucursal exists: {sucursal_exists}")
    print(f"Bodega exists: {bodega_exists}")
    print(f"Items count: {items_count}")
    print(f"Items list (up to 20): {items_list}")
    print(f"Software entries found: {software_count}")
    print(f"Superuser exists: {super_exists}")

if __name__ == '__main__':
    main()
