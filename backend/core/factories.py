"""Helpers compartidos para tests que necesitan usuarios con un rol especifico.

No es una app de tests en si — vive en core/ para poder importarse desde
cualquier app sin depender de notificaciones/tests.py (su origen).
"""

from django.contrib.auth.models import Group

from cuentas.models import User
from empresas.models import SucursalEmpresa, UsuarioEmpresa


def crear_usuario_en_rol(sucursal: SucursalEmpresa, grupo_nombre: str, sufijo: str = "user") -> tuple[User, UsuarioEmpresa]:
    """Crea un User + UsuarioEmpresa vinculado a `sucursal`, con el grupo `grupo_nombre`
    (se crea el Group si no existe). Util en tests de permisos por rol."""
    user = User.objects.create_user(email=f"{sufijo}@test.com", password="x", is_active=True)
    ue = UsuarioEmpresa.objects.create(usuario=user, sucursal=sucursal)
    grupo, _ = Group.objects.get_or_create(name=grupo_nombre)
    ue.grupos.add(grupo)
    return user, ue
