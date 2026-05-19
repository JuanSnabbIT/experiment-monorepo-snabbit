#!/usr/bin/env python
"""
Exporta catalogo de contratos desde la BD activa (Django ORM).

Tablas exportadas:
  contratos_etiquetaplantilla
  contratos_caracteristicaservicio
  contratos_servicio + contratos_serviciocaracteristica (alcance)
  contratos_licencia
  contratos_planservicio + contratos_planserviciodetalle
  contratos_plantillacontrato + contratos_seccionplantilla
    -> solo la plantilla canonica de cada tipo (es_default o id minimo por tipo)

Escribe en: dev/scripts/datos_exportados/seed_contratos_catalogo.json

Uso:
    cd backend
    python ..\\dev\\scripts\\exportar_seed_contratos.py
"""
from __future__ import annotations

import json
import os
import sys
from decimal import Decimal
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_PATH = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_PATH))
os.chdir(BACKEND_PATH)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")

import django
django.setup()

OUTPUT_DIR = REPO_ROOT / "dev" / "scripts" / "datos_exportados"
OUTPUT_FILE = OUTPUT_DIR / "seed_contratos_catalogo.json"


class JsonEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        return super().default(obj)


def print_ok(msg: str):
    print(f"  OK  {msg}")


def print_section(title: str):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Exportadores
# ---------------------------------------------------------------------------

def exportar_etiquetas() -> list:
    from contratos.models import EtiquetaPlantilla
    result = []
    for e in EtiquetaPlantilla.objects.all().order_by("categoria", "clave"):
        result.append({
            "id": e.id,
            "clave": e.clave,
            "nombre_display": e.nombre_display,
            "categoria": e.categoria,
            "origen_dato": e.origen_dato,
            "descripcion": e.descripcion,
            "valor_default": e.valor_default,
            "empresa_prestadora_rut": (
                e.empresa_prestadora.rut_empresa if e.empresa_prestadora else None
            ),
        })
    return result


def exportar_caracteristicas() -> list:
    from contratos.models import CaracteristicaServicio
    result = []
    for c in CaracteristicaServicio.objects.all().order_by("nombre"):
        result.append({
            "id": c.id,
            "nombre": c.nombre,
            "descripcion": c.descripcion,
            "activo": c.activo,
            "empresa_prestadora_rut": (
                c.empresa_prestadora.rut_empresa if c.empresa_prestadora else None
            ),
        })
    return result


def exportar_servicios() -> list:
    from contratos.models import Servicio, ServicioCaracteristica
    result = []
    for s in Servicio.objects.all().order_by("nombre"):
        alcance = []
        for item in s.alcance_items.select_related("caracteristica").order_by("orden", "id"):
            alcance.append({
                "caracteristica_nombre": item.caracteristica.nombre,
                "modo": item.modo,
                "orden": item.orden,
            })
        result.append({
            "id": s.id,
            "nombre": s.nombre,
            "descripcion": s.descripcion,
            "categoria": s.categoria,
            "activo": s.activo,
            "es_vigente": s.es_vigente,
            "precio": str(s.precio),
            "tipo_moneda": s.tipo_moneda,
            "veces_por_mes_default": s.veces_por_mes_default,
            "formas_pago_permitidas": s.formas_pago_permitidas,
            "incluye": s.incluye,
            "no_incluye": s.no_incluye,
            "clausulas_especiales": s.clausulas_especiales,
            "version": s.version,
            "alcance_items": alcance,
            "empresa_prestadora_rut": (
                s.empresa_prestadora.rut_empresa if s.empresa_prestadora else None
            ),
        })
    return result


def exportar_licencias() -> list:
    from contratos.models import Licencia
    result = []
    for lic in Licencia.objects.all().order_by("nombre"):
        result.append({
            "id": lic.id,
            "nombre": lic.nombre,
            "proveedor": lic.proveedor,
            "descripcion": lic.descripcion,
            "numero_parte": lic.numero_parte,
            "modalidad_base": lic.modalidad_base,
            "modalidad_anual_forma_pago": lic.modalidad_anual_forma_pago,
            "precio_partner": str(lic.precio_partner),
            "precio_venta": str(lic.precio_venta),
            "moneda": lic.moneda,
            "activo": lic.activo,
            "empresa_prestadora_rut": (
                lic.empresa_prestadora.rut_empresa if lic.empresa_prestadora else None
            ),
        })
    return result


def exportar_planes() -> list:
    from contratos.models import PlanServicio
    result = []
    for p in PlanServicio.objects.all().order_by("nombre"):
        detalles = []
        for d in p.detalles_servicio.select_related("servicio_version").order_by("orden", "id"):
            detalles.append({
                "servicio_nombre": d.servicio_version.nombre,
                "orden": d.orden,
                "obligatorio": d.obligatorio,
                "cantidad_default": d.cantidad_default,
                "veces_por_mes_default": d.veces_por_mes_default,
            })
        result.append({
            "id": p.id,
            "nombre": p.nombre,
            "descripcion": p.descripcion,
            "version": p.version,
            "activo": p.activo,
            "es_vigente": p.es_vigente,
            "precio": str(p.precio),
            "precio_anual": str(p.precio_anual) if p.precio_anual is not None else None,
            "tipo_moneda": p.tipo_moneda,
            "veces_por_mes_default": p.veces_por_mes_default,
            "num_visitas_mensuales": p.num_visitas_mensuales,
            "formas_pago_permitidas": p.formas_pago_permitidas,
            "incluye": p.incluye,
            "no_incluye": p.no_incluye,
            "clausulas_especiales": p.clausulas_especiales,
            "detalles_servicio": detalles,
            "empresa_prestadora_rut": (
                p.empresa_prestadora.rut_empresa if p.empresa_prestadora else None
            ),
        })
    return result


def exportar_plantilla_servicios() -> dict | None:
    """
    Exporta la plantilla canonica de SERVICIOS TECNOLOGICOS Y ASESORIAS.
    Prefiere es_default=True; si no existe, toma el registro con id minimo.
    """
    from contratos.models import PlantillaContrato, SeccionPlantilla

    TITULO = "CONTRATO DE SERVICIOS TECNOLOGICOS Y ASESORIAS"
    qs = PlantillaContrato.objects.filter(titulo=TITULO).order_by("id")
    if not qs.exists():
        return None

    # Preferir es_default, sino la primera (id minimo)
    plantilla = qs.filter(es_default=True).first() or qs.first()

    secciones = []
    for s in plantilla.secciones.all().order_by("orden"):
        secciones.append({
            "titulo": s.titulo,
            "tipo": s.tipo,
            "contenido_template": s.contenido_template,
            "orden": s.orden,
            "slot_documental": s.slot_documental,
            "orden_en_slot": s.orden_en_slot,
            "es_editable_en_contrato": s.es_editable_en_contrato,
            "es_obligatoria": s.es_obligatoria,
        })

    return {
        "titulo": plantilla.titulo,
        "descripcion": plantilla.descripcion,
        "version": plantilla.version,
        "tipo_contrato": plantilla.tipo_contrato,
        "activa": plantilla.activa,
        "requiere_nda": plantilla.requiere_nda,
        "orden_bloque_alcance": plantilla.orden_bloque_alcance,
        "orden_bloque_operacion": plantilla.orden_bloque_operacion,
        "orden_bloque_condiciones": plantilla.orden_bloque_condiciones,
        "secciones": secciones,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print_section("Exportando catalogo de contratos desde BD activa")

    datos = {}

    print_section("Etiquetas y caracteristicas")
    datos["etiquetas"] = exportar_etiquetas()
    print_ok(f"{len(datos['etiquetas'])} etiquetas de plantilla")

    datos["caracteristicas"] = exportar_caracteristicas()
    print_ok(f"{len(datos['caracteristicas'])} caracteristicas de servicio")

    print_section("Servicios, Licencias y Planes")
    datos["servicios"] = exportar_servicios()
    print_ok(f"{len(datos['servicios'])} servicios")

    datos["licencias"] = exportar_licencias()
    print_ok(f"{len(datos['licencias'])} licencias")

    datos["planes"] = exportar_planes()
    print_ok(f"{len(datos['planes'])} planes de servicio")

    print_section("Plantilla canonica: SERVICIOS TECNOLOGICOS")
    datos["plantilla_servicios"] = exportar_plantilla_servicios()
    if datos["plantilla_servicios"]:
        n_sec = len(datos["plantilla_servicios"]["secciones"])
        print_ok(f"Plantilla exportada con {n_sec} secciones")
    else:
        print("  AVISO: No se encontro la plantilla")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2, cls=JsonEncoder)

    size_kb = OUTPUT_FILE.stat().st_size / 1024
    print(f"\n{'=' * 60}")
    print(f"  Exportacion completada")
    print(f"  Archivo: {OUTPUT_FILE}")
    print(f"  Tamano : {size_kb:.1f} KB")
    print("=" * 60)


if __name__ == "__main__":
    main()
