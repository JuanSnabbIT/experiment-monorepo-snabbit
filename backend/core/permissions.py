from rest_framework.permissions import BasePermission

from empresas.models import UsuarioEmpresa


class IsAdminOrRRHH(BasePermission):
    """
    Permite acceso a usuarios con grupo 'superadmin', 'rrhh' o 'staff'
    en la sucursal_principal activa.

    Sigue el patrón multi-tenancy estándar del proyecto:
    request.user → PersonalizacionUsuario → sucursal_principal → UsuarioEmpresa.grupos

    Los nombres de grupos coinciden con los definidos en pages.config.ts:
    authority: ['staff', 'superadmin', 'rrhh']
    """

    grupos_permitidos = ["superadmin", "rrhh", "staff"]
    message = "No tienes permisos para realizar esta acción. Contacta al administrador."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Los grupos son transversales a sucursales — coherente con get_grupos_user.
        # La visibilidad de datos sigue protegida por multi-tenancy en get_queryset().
        return UsuarioEmpresa.objects.filter(
            usuario=request.user,
            grupos__name__in=self.grupos_permitidos,
        ).exists()


class IsSuperAdmin(IsAdminOrRRHH):
    """
    Solo superadmin y staff — para acciones de configuración del sistema
    que no debe poder hacer un usuario de RRHH.
    """

    grupos_permitidos = ["superadmin", "staff"]
    message = "Esta acción requiere permisos de administrador."
