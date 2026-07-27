from rest_framework.permissions import BasePermission

from empresas.models import UsuarioEmpresa


class TienePermisoDeRol(BasePermission):
    """
    Motor de autorización por rol. Permite acceso solo a usuarios cuyo
    UsuarioEmpresa (en cualquier sucursal) pertenece a alguno de los grupos
    en `roles_permitidos`.

    Sigue el patrón multi-tenancy estándar del proyecto:
    request.user → UsuarioEmpresa.grupos (transversal a sucursales)
    La visibilidad de datos sigue protegida por multi-tenancy en get_queryset() —
    esta clase SOLO autoriza por rol, no filtra por empresa.

    Uso directo (rol fijo para toda la vista):
        class MiPermiso(TienePermisoDeRol):
            roles_permitidos = ["superadmin", "staff"]

    Uso inline (rol fijo vía factory, para permission_classes):
        permission_classes = [IsAuthenticated, requiere_roles("superadmin", "staff")]

    Uso por acción (rol variable según el método/action del ViewSet):
        def get_permissions(self):
            if self.action == "destroy":
                return [IsAuthenticated(), requiere_roles("superadmin")()]
            return super().get_permissions()
    """

    roles_permitidos: list[str] = []
    message = "No tienes permisos para realizar esta acción. Contacta al administrador."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        roles = getattr(view, "roles_permitidos", None) or self.roles_permitidos
        return UsuarioEmpresa.objects.filter(
            usuario=request.user,
            grupos__name__in=roles,
        ).exists()


def requiere_roles(*roles):
    """Factory: subclase de TienePermisoDeRol con `roles` fijos, para uso inline
    en `permission_classes` sin tener que declarar una clase nombrada aparte."""
    return type("TienePermisoDeRolDinamico", (TienePermisoDeRol,), {"roles_permitidos": list(roles)})


class IsAdminOrRRHH(TienePermisoDeRol):
    """
    Permite acceso a usuarios con grupo 'superadmin', 'rrhh' o 'staff'.

    Los nombres de grupos coinciden con los definidos en pages.config.ts:
    authority: ['staff', 'superadmin', 'rrhh']
    """

    roles_permitidos = ["superadmin", "rrhh", "staff"]


class IsSuperAdmin(TienePermisoDeRol):
    """
    Solo superadmin y staff — para acciones de configuración del sistema
    que no debe poder hacer un usuario de RRHH.
    """

    roles_permitidos = ["superadmin", "staff"]
    message = "Esta acción requiere permisos de administrador."
