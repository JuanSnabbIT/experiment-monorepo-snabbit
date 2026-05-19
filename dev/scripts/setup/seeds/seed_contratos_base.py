"""
Seed: CaracteristicaServicio, Servicio (+M2M caracteristicas), PlanServicio (+detalles).

Lee desde: dev/scripts/datos_exportados/seed_datos.json
Exportado por: dev/scripts/exportar_seed_postgres.py

Idempotente: puede ejecutarse multiples veces sin duplicar datos.
  - CaracteristicaServicio -> update_or_create por (empresa_prestadora, nombre)
  - Servicio               -> update_or_create por (empresa_prestadora, nombre)
  - PlanServicio           -> update_or_create por (empresa_prestadora, nombre)
  - PlanServicioDetalle    -> recreado en cada ejecucion (delete + create)

Uso directo:
    cd backend
    python ..\\dev\\scripts\\setup\\seeds\\seed_contratos_base.py

Uso via seed_all:
    python ..\\dev\\scripts\\setup\\seeds\\seed_all.py
"""
from __future__ import annotations

import json
import os
import sys
from decimal import Decimal
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
BACKEND_PATH = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_PATH))
os.chdir(BACKEND_PATH)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")

import django
django.setup()

from django.db import transaction

DATA_FILE = REPO_ROOT / "dev" / "scripts" / "datos_exportados" / "seed_datos.json"


def print_seccion(titulo: str):
    print(f"\n{'=' * 60}")
    print(f"  {titulo}")
    print("=" * 60)


def print_paso(msg: str, creados: int, actualizados: int):
    total = creados + actualizados
    print(f"  {msg}: {total} registros  ({creados} nuevos, {actualizados} actualizados)")


def cargar_datos() -> dict:
    if not DATA_FILE.exists():
        print(f"ERROR: No se encontro {DATA_FILE}")
        print("       Ejecuta primero: dev/scripts/exportar_seed_postgres.py")
        sys.exit(1)
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


def construir_mapa_empresas() -> dict[str, object]:
    from empresas.models import Empresa
    return {e.rut_empresa: e for e in Empresa.objects.all() if e.rut_empresa}


# ---------------------------------------------------------------------------
# CaracteristicaServicio
# ---------------------------------------------------------------------------

def seed_caracteristicas(datos: list, mapa_empresas: dict) -> dict[int, object]:
    """
    Retorna mapa {id_original: instancia} para que Servicio pueda reconstruir M2M.
    """
    from contratos.models import CaracteristicaServicio

    creados = actualizados = 0
    mapa_resultado: dict[int, object] = {}

    for row in datos:
        empresa = mapa_empresas.get(row.get("empresa_prestadora_rut") or "") if row.get("empresa_prestadora_rut") else None
        # fallback: buscar por id si no hay rut
        if empresa is None and row.get("empresa_prestadora_id"):
            from empresas.models import Empresa
            empresa = Empresa.objects.filter(id=row["empresa_prestadora_id"]).first()

        obj, created = CaracteristicaServicio.objects.update_or_create(
            empresa_prestadora=empresa,
            nombre=row["nombre"],
            defaults={
                "descripcion": row.get("descripcion") or "",
                "activo": row.get("activo", True),
            },
        )
        mapa_resultado[row["id"]] = obj
        if created:
            creados += 1
        else:
            actualizados += 1

    print_paso("CaracteristicaServicio", creados, actualizados)
    return mapa_resultado


# ---------------------------------------------------------------------------
# Servicio
# ---------------------------------------------------------------------------

def seed_servicios(datos: list, mapa_empresas: dict, mapa_caracteristicas: dict) -> dict[int, object]:
    """
    Retorna mapa {id_original: instancia} para que PlanServicio pueda
    reconstruir PlanServicioDetalle.
    """
    from contratos.models import Servicio

    creados = actualizados = 0
    mapa_resultado: dict[int, object] = {}

    for row in datos:
        empresa = mapa_empresas.get(row.get("empresa_prestadora_rut") or "") if row.get("empresa_prestadora_rut") else None
        if empresa is None and row.get("empresa_prestadora_id"):
            from empresas.models import Empresa
            empresa = Empresa.objects.filter(id=row["empresa_prestadora_id"]).first()

        defaults = {
            "descripcion": row.get("descripcion") or "",
            "categoria": row.get("categoria", "soporte"),
            "version": row.get("version", 1),
            "activo": row.get("activo", True),
            "es_vigente": row.get("es_vigente", True),
            "precio": Decimal(str(row.get("precio", 0))),
            "tipo_moneda": row.get("tipo_moneda", "USD"),
            "veces_por_mes_default": row.get("veces_por_mes_default", 1),
            "formas_pago_permitidas": row.get("formas_pago_permitidas") or [],
            "incluye": row.get("incluye") or "",
            "no_incluye": row.get("no_incluye") or "",
            "clausulas_especiales": row.get("clausulas_especiales") or "",
        }

        obj, created = Servicio.objects.update_or_create(
            empresa_prestadora=empresa,
            nombre=row["nombre"],
            defaults=defaults,
        )

        # Reconstruir M2M caracteristicas
        caracteristicas_ids_originales = row.get("caracteristicas_ids", [])
        nuevas_caracteristicas = [
            mapa_caracteristicas[orig_id]
            for orig_id in caracteristicas_ids_originales
            if orig_id in mapa_caracteristicas
        ]
        obj.caracteristicas.set(nuevas_caracteristicas)

        mapa_resultado[row["id"]] = obj
        if created:
            creados += 1
        else:
            actualizados += 1

    print_paso("Servicio", creados, actualizados)
    return mapa_resultado


# ---------------------------------------------------------------------------
# PlanServicio + PlanServicioDetalle
# ---------------------------------------------------------------------------

def seed_planes(datos: list, mapa_empresas: dict, mapa_servicios: dict) -> None:
    from contratos.models import PlanServicio, PlanServicioDetalle

    creados = actualizados = 0

    for row in datos:
        empresa = mapa_empresas.get(row.get("empresa_prestadora_rut") or "") if row.get("empresa_prestadora_rut") else None
        if empresa is None and row.get("empresa_prestadora_id"):
            from empresas.models import Empresa
            empresa = Empresa.objects.filter(id=row["empresa_prestadora_id"]).first()

        precio_anual = row.get("precio_anual")
        defaults = {
            "descripcion": row.get("descripcion") or "",
            "version": row.get("version", 1),
            "activo": row.get("activo", True),
            "es_vigente": row.get("es_vigente", True),
            "precio": Decimal(str(row.get("precio", 0))),
            "precio_anual": Decimal(str(precio_anual)) if precio_anual is not None else None,
            "tipo_moneda": row.get("tipo_moneda", "USD"),
            "veces_por_mes_default": row.get("veces_por_mes_default", 1),
            "num_visitas_mensuales": row.get("num_visitas_mensuales"),
            "formas_pago_permitidas": row.get("formas_pago_permitidas") or [],
            "incluye": row.get("incluye") or "",
            "no_incluye": row.get("no_incluye") or "",
            "clausulas_especiales": row.get("clausulas_especiales") or "",
        }

        plan, created = PlanServicio.objects.update_or_create(
            empresa_prestadora=empresa,
            nombre=row["nombre"],
            defaults=defaults,
        )

        # Recrear detalles (PlanServicioDetalle)
        plan.detalles_servicio.all().delete()
        for detalle in row.get("detalles", []):
            servicio_orig_id = detalle.get("servicio_version_id")
            servicio = mapa_servicios.get(servicio_orig_id)
            if servicio is None:
                continue
            PlanServicioDetalle.objects.create(
                plan=plan,
                servicio_version=servicio,
                orden=detalle.get("orden", 0),
                obligatorio=detalle.get("obligatorio", True),
                cantidad_default=detalle.get("cantidad_default", 1),
                veces_por_mes_default=detalle.get("veces_por_mes_default", 1),
            )

        if created:
            creados += 1
        else:
            actualizados += 1

    print_paso("PlanServicio", creados, actualizados)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def run():
    print_seccion("Seed: CaracteristicaServicio, Servicio, PlanServicio")

    datos = cargar_datos()

    caracteristicas_data = datos.get("caracteristicas", [])
    servicios_data = datos.get("servicios", [])
    planes_data = datos.get("planes", [])

    if not caracteristicas_data and not servicios_data and not planes_data:
        print("  ADVERTENCIA: seed_datos.json no contiene 'caracteristicas', 'servicios' ni 'planes'.")
        print("               Ejecuta primero: dev/scripts/exportar_seed_postgres.py")
        return

    mapa_empresas = construir_mapa_empresas()

    with transaction.atomic():
        mapa_caracteristicas = seed_caracteristicas(caracteristicas_data, mapa_empresas)
        mapa_servicios = seed_servicios(servicios_data, mapa_empresas, mapa_caracteristicas)
        seed_planes(planes_data, mapa_empresas, mapa_servicios)


if __name__ == "__main__":
    run()
