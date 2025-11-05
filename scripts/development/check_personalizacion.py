"""Script temporal para verificar PersonalizacionUsuario en entorno Django.

Ejecutar desde la carpeta backend con el entorno virtual activado:

    backend\\ENV\\Scripts\\python.exe manage.py shell < scripts/development/check_personalizacion.py
"""

from cuentas.models import User
from core.models import PersonalizacionUsuario
from empresas.models import SucursalEmpresa

# Obtener primer usuario
user = User.objects.first()
print(f"Usuario: {user.email} (ID: {user.id})")

# Verificar PersonalizacionUsuario
pers = PersonalizacionUsuario.objects.filter(usuario=user).first()
print(f"PersonalizacionUsuario existente: {pers}")

if pers:
    print(f"  - Sucursal principal: {pers.sucursal_principal}")
else:
    print("  - NO existe PersonalizacionUsuario para este usuario")

# Verificar sucursales disponibles
sucursales = SucursalEmpresa.objects.all()
print(f"\nSucursales disponibles: {sucursales.count()}")
for suc in sucursales[:5]:
    empresa = suc.empresa.nombre if hasattr(suc.empresa, "nombre") else getattr(suc.empresa, "razon_social", "N/A")
    print(f"  - {suc} (ID: {suc.id}, Empresa: {empresa})")
