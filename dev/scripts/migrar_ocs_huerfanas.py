"""
Script de migracion de datos: wrappear OCs huerfanas en OrdenCompraAgrupada (1:N).

Criterio de agrupacion:
  - OCs con misma (oc_empresa, oc_cliente, relacion_cotizacion) → una sola OCA.
  - OCs con relacion_cotizacion=None → cada una crea su propia OCA (1:1).

Uso:
  cd backend
  python ..\dev\scripts\migrar_ocs_huerfanas.py
"""

import os
import sys
import django

# Ajustar path para encontrar el proyecto Django
BACKEND_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'backend')
sys.path.insert(0, os.path.abspath(BACKEND_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
django.setup()

from django.db import transaction
from bodegas.models import OrdenCompra, OrdenCompraAgrupada


def run():
    huerfanas = list(
        OrdenCompra.objects.filter(oc_agrupada__isnull=True)
        .select_related('oc_empresa', 'oc_cliente', 'relacion_cotizacion')
        .order_by('id')
    )

    if not huerfanas:
        print("No hay OCs huerfanas. Nada que migrar.")
        return

    print(f"OCs huerfanas encontradas: {len(huerfanas)}")

    # Agrupar por (empresa_id, cliente_id, cotizacion_id)
    # cotizacion_id=None => cada OC es su propio grupo (None no agrupa)
    grupos: dict = {}
    sin_cotizacion: list = []

    for oc in huerfanas:
        if oc.relacion_cotizacion_id is None:
            sin_cotizacion.append(oc)
        else:
            key = (oc.oc_empresa_id, oc.oc_cliente_id, oc.relacion_cotizacion_id)
            grupos.setdefault(key, []).append(oc)

    # OCs sin cotizacion => 1:1
    for oc in sin_cotizacion:
        grupos[(oc.oc_empresa_id, oc.oc_cliente_id, None, oc.id)] = [oc]

    creadas = 0
    with transaction.atomic():
        for key, ocs_grupo in grupos.items():
            empresa_id = ocs_grupo[0].oc_empresa_id
            cliente_id = ocs_grupo[0].oc_cliente_id
            cotizacion_id = ocs_grupo[0].relacion_cotizacion_id if len(key) == 3 else None

            agrupada = OrdenCompraAgrupada.objects.create(
                oc_empresa_id=empresa_id,
                oc_cliente_id=cliente_id,
                observaciones='[Migrada automaticamente desde OC individual]',
            )

            if cotizacion_id:
                agrupada.cotizaciones.set([cotizacion_id])

            for oc in ocs_grupo:
                oc.oc_agrupada = agrupada
                oc.save(update_fields=['oc_agrupada'])

            ids = [oc.id for oc in ocs_grupo]
            print(f"  OCA {agrupada.codigo}: engloba OC(s) {ids} | cot={cotizacion_id}")
            creadas += 1

    print(f"\nMigracion completada. OCAs creadas: {creadas}")
    print(f"Total OCs migradas: {len(huerfanas)}")


if __name__ == '__main__':
    run()
