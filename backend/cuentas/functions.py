from empresas.models import UsuarioEmpresa
from django.shortcuts import get_object_or_404

def obtener_usuario_empresa(user):
    return get_object_or_404(
        UsuarioEmpresa,
        usuario=user,
    )

