"""Script para crear usuario de prueba RRHH. Ejecutar con manage.py shell < scripts/crear_usuario_rrhh_test.py"""
import django
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")
django.setup()

from django.contrib.auth.models import Group
from cuentas.models import User
from empresas.models import SucursalEmpresa, UsuarioEmpresa
from core.models import PersonalizacionUsuario

EMAIL = "rrhh_test@snabbit.cl"
PASSWORD = "Snabbit2026!"
SUCURSAL_ID = 91  # Casa Matriz -> Snabbit

sucursal = SucursalEmpresa.objects.get(id=SUCURSAL_ID)
print(f"Sucursal: {sucursal} ({sucursal.empresa})")

user, created = User.objects.get_or_create(
    email=EMAIL,
    defaults={"first_name": "Test", "last_name": "RRHH", "is_active": True},
)
user.set_password(PASSWORD)
user.save()
print(f"Usuario: {user.email} ({'creado' if created else 'actualizado'})")

p = PersonalizacionUsuario.objects.get(usuario=user)
p.sucursal_principal = sucursal
p.save()
print(f"sucursal_principal: {p.sucursal_principal}")

ue, ue_created = UsuarioEmpresa.objects.get_or_create(usuario=user, sucursal=sucursal)
grupo_rrhh = Group.objects.get(name="rrhh")
ue.grupos.set([grupo_rrhh])
print(f"UsuarioEmpresa: {'creado' if ue_created else 'ya existia'}")
print(f"Grupos: {list(ue.grupos.values_list('name', flat=True))}")

print()
print("=== USUARIO LISTO ===")
print(f"Email:    {EMAIL}")
print(f"Password: {PASSWORD}")
print(f"Empresa:  {sucursal.empresa.nombre}")
print(f"Rol:      rrhh")
