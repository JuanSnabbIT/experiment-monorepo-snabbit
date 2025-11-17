#!/usr/bin/env python
"""
Prueba rápida del flujo de cierre OT usando utilidades internas (sin HTTP).
- Lista algunas OTs visibles por empresa dominante (si aplica) o simplemente toma las últimas 10.
- Ejecuta validar_cierre_ot.
- Si puede cerrar, intenta cierre normal; si no, intenta cierre forzado con comentario.
- Vuelve a intentar un cierre normal para confirmar que se bloquearía (equivalente a 409 en la vista).
Imprime un resumen por OT.
"""
import os
import sys
from datetime import datetime

# Agregar path del backend al PYTHONPATH
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPTS_DIR))  # .../Monorepo-ERP-Snabbit
BACKEND_PATH = os.path.join(PROJECT_ROOT, 'backend')
sys.path.insert(0, BACKEND_PATH)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
import django

django.setup()

from django.contrib.auth import get_user_model
from core.models import PersonalizacionUsuario
from empresas.models import SucursalEmpresa, UsuarioEmpresa
from ordentrabajo.models import OrdenDeTrabajo, CierreAdministrativoOT
from ordentrabajo.utils import validar_cierre_ot, cerrar_ot

User = get_user_model()


def ensure_personalizacion_for(user, empresa=None):
    p = PersonalizacionUsuario.objects.filter(usuario=user).first()
    if p and p.sucursal_principal:
        return p
    # Elegir una sucursal: si hay empresa dada, usar su primera sucursal; si no, alguna existente
    suc = None
    if empresa is not None:
        suc = empresa.sucursales.first()
    if not suc:
        suc = SucursalEmpresa.objects.first()
    if not suc:
        return None
    return PersonalizacionUsuario.objects.update_or_create(
        usuario=user,
        defaults={
            'sucursal_principal': suc,
            'tema': '3',
            'font_size': 14,
        }
    )[0]


def get_usuario_empresa(user):
    return UsuarioEmpresa.objects.filter(usuario=user).first()


def main():
    user = User.objects.filter(is_superuser=True).first() or User.objects.first()
    if not user:
        print("No hay usuarios en el sistema.")
        return 1

    # Elegir OTs: últimas 10
    ots = list(OrdenDeTrabajo.objects.all().order_by('-id')[:10])
    if not ots:
        print("No hay OTs en la base de datos.")
        return 0

    print(f"Probando {len(ots)} OTs como {user.email} ({'superuser' if user.is_superuser else 'user'})")

    # Asegurar personalización para la empresa de la primera OT
    ensure_personalizacion_for(user, empresa=ots[0].empresa)
    ue = get_usuario_empresa(user)

    filas = []
    for ot in ots:
        res = validar_cierre_ot(ot.id)
        puede = bool(res.get('puede_cerrar'))
        hubo_409 = False
        creado = False
        valido_cierre = None

        # Si ya tiene cierre, marcamos 409 esperado para intento normal
        cierre_existente = None
        try:
            cierre_existente = ot.cierre_administrativo
        except CierreAdministrativoOT.DoesNotExist:
            cierre_existente = None

        if cierre_existente is None:
            # Crear cierre normal o forzado
            if puede:
                cierre = cerrar_ot(ot.id, usuario_empresa=ue, comentario='Cierre normal (script)', forzar=False)
                creado = True
                valido_cierre = cierre.valido
            else:
                cierre = cerrar_ot(ot.id, usuario_empresa=ue, comentario='Cierre forzado (script)', forzar=True)
                creado = True
                valido_cierre = cierre.valido
                res['forzado'] = True
        else:
            # Ya existía: intento normal equivale a 409 en la vista
            hubo_409 = True
            valido_cierre = cierre_existente.valido

        # Segundo intento sin forzar para simular 409 (si recién creamos cierre)
        if creado:
            try:
                _ = cerrar_ot(ot.id, usuario_empresa=ue, comentario='Reintento (debería 409 en vista)', forzar=False)
            except Exception:
                hubo_409 = True

        filas.append({
            'ot': ot.id,
            'puede_cerrar': puede,
            'valido_cierre': valido_cierre,
            'forzado_flag_resultado': bool(res.get('forzado', False)),
            '409_simulado': hubo_409,
            'validaciones': res.get('validaciones', {}),
            'obs_count': len(res.get('observaciones', [])),
        })

    # Imprimir resumen
    print("\nResumen:")
    for f in filas:
        print(
            f"OT {f['ot']}: puede={f['puede_cerrar']}, cierre_valido={f['valido_cierre']}, "
            f"forzado={f['forzado_flag_resultado']}, 409={f['409_simulado']}, "
            f"obs={f['obs_count']}"
        )

    # Métricas simples
    tot = len(filas)
    validos = sum(1 for f in filas if f['valido_cierre'] is True)
    observados = sum(1 for f in filas if f['valido_cierre'] is False)
    bloqueados = sum(1 for f in filas if f['409_simulado'])
    print("\nMétricas:")
    print(f"- Total OT procesadas: {tot}")
    print(f"- Cierres válidos: {validos}")
    print(f"- Cierres observados (forzados): {observados}")
    print(f"- Reintentos bloqueados (simulan 409): {bloqueados}")

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
