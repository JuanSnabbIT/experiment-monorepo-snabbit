"""
Seed: Catalogo de contratos (etiquetas, caracteristicas, servicios, licencias, planes, plantilla).

Lee desde: dev/scripts/datos_exportados/seed_contratos_catalogo.json
Creado por: dev/scripts/exportar_seed_contratos.py

Uso directo:
    cd backend
    python ..\\dev\\scripts\\setup\\seeds\\seed_contratos_catalogo.py

Uso via seed_all:
    python ..\\dev\\scripts\\setup\\seeds\\seed_all.py
"""
from __future__ import annotations

import json
import os
import sys
from decimal import Decimal
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[4]
BACKEND_PATH = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_PATH))
os.chdir(BACKEND_PATH)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")

import django
django.setup()

JSON_PATH = REPO_ROOT / "dev" / "scripts" / "datos_exportados" / "seed_contratos_catalogo.json"


def print_seccion(titulo: str):
    print(f"\n{'=' * 60}")
    print(f"  {titulo}")
    print("=" * 60)


def print_ok(msg: str):
    print(f"  OK  {msg}")


def cargar_json() -> dict[str, Any]:
    with open(JSON_PATH, encoding="utf-8") as f:
        return json.load(f)


def construir_mapa_empresas() -> dict[str, Any]:
    """Devuelve {rut_empresa: Empresa} para las empresas existentes."""
    from empresas.models import Empresa
    return {e.rut_empresa: e for e in Empresa.objects.all() if e.rut_empresa}


# ---------------------------------------------------------------------------
# Etiquetas de plantilla
# ---------------------------------------------------------------------------

def seed_etiquetas(datos: list, mapa_empresas: dict) -> None:
    from contratos.models import EtiquetaPlantilla

    creadas = actualizadas = omitidas = 0
    for item in datos:
        rut = item.get("empresa_prestadora_rut")
        empresa = mapa_empresas.get(rut) if rut else None

        if rut and not empresa:
            omitidas += 1
            continue  # empresa no existe en BD destino

        defaults = {
            "nombre_display": item["nombre_display"],
            "categoria": item.get("categoria", "custom"),
            "origen_dato": item.get("origen_dato"),
            "descripcion": item.get("descripcion"),
            "valor_default": item.get("valor_default"),
        }

        obj, created = EtiquetaPlantilla.objects.update_or_create(
            empresa_prestadora=empresa,
            clave=item["clave"],
            defaults=defaults,
        )
        if created:
            creadas += 1
        else:
            actualizadas += 1

    print_ok(
        f"EtiquetaPlantilla: {creadas} creadas, {actualizadas} actualizadas"
        + (f", {omitidas} omitidas (empresa no encontrada)" if omitidas else "")
    )


# ---------------------------------------------------------------------------
# Caracteristicas de servicio
# ---------------------------------------------------------------------------

def seed_caracteristicas(datos: list, mapa_empresas: dict) -> dict[str, Any]:
    """Devuelve mapa {nombre: CaracteristicaServicio} para resolver FKs."""
    from contratos.models import CaracteristicaServicio

    mapa: dict[str, Any] = {}
    creadas = actualizadas = omitidas = 0
    for item in datos:
        rut = item.get("empresa_prestadora_rut")
        empresa = mapa_empresas.get(rut) if rut else None

        if rut and not empresa:
            omitidas += 1
            continue

        defaults = {
            "descripcion": item.get("descripcion"),
            "activo": item.get("activo", True),
        }

        obj, created = CaracteristicaServicio.objects.update_or_create(
            empresa_prestadora=empresa,
            nombre=item["nombre"],
            defaults=defaults,
        )
        mapa[item["nombre"]] = obj
        if created:
            creadas += 1
        else:
            actualizadas += 1

    print_ok(
        f"CaracteristicaServicio: {creadas} creadas, {actualizadas} actualizadas"
        + (f", {omitidas} omitidas" if omitidas else "")
    )
    return mapa


# ---------------------------------------------------------------------------
# Servicios
# ---------------------------------------------------------------------------

def seed_servicios(datos: list, mapa_empresas: dict, mapa_caract: dict) -> dict[str, Any]:
    """Devuelve mapa {nombre: Servicio} para resolver FKs en planes."""
    from contratos.models import Servicio, ServicioCaracteristica

    mapa: dict[str, Any] = {}
    creadas = actualizadas = omitidas = 0
    for item in datos:
        rut = item.get("empresa_prestadora_rut")
        empresa = mapa_empresas.get(rut) if rut else None

        if rut and not empresa:
            omitidas += 1
            continue

        defaults = {
            "descripcion": item.get("descripcion"),
            "categoria": item.get("categoria", "soporte"),
            "activo": item.get("activo", True),
            "es_vigente": item.get("es_vigente", True),
            "precio": Decimal(item.get("precio", "0")),
            "tipo_moneda": item.get("tipo_moneda", "USD"),
            "veces_por_mes_default": item.get("veces_por_mes_default", 1),
            "formas_pago_permitidas": item.get("formas_pago_permitidas", []),
            "incluye": item.get("incluye"),
            "no_incluye": item.get("no_incluye"),
            "clausulas_especiales": item.get("clausulas_especiales"),
            "version": item.get("version", 1),
        }

        obj, created = Servicio.objects.update_or_create(
            empresa_prestadora=empresa,
            nombre=item["nombre"],
            defaults=defaults,
        )
        mapa[item["nombre"]] = obj
        if created:
            creadas += 1
        else:
            actualizadas += 1

        # Sincronizar alcance (ServicioCaracteristica)
        for alcance_item in item.get("alcance_items", []):
            caract = mapa_caract.get(alcance_item["caracteristica_nombre"])
            if not caract:
                continue
            ServicioCaracteristica.objects.update_or_create(
                servicio=obj,
                caracteristica=caract,
                defaults={
                    "modo": alcance_item.get("modo", "incluye"),
                    "orden": alcance_item.get("orden", 0),
                },
            )

    print_ok(
        f"Servicio: {creadas} creados, {actualizadas} actualizados"
        + (f", {omitidas} omitidos" if omitidas else "")
    )
    return mapa


# ---------------------------------------------------------------------------
# Licencias
# ---------------------------------------------------------------------------

def seed_licencias(datos: list, mapa_empresas: dict) -> None:
    from contratos.models import Licencia

    creadas = actualizadas = omitidas = 0
    for item in datos:
        rut = item.get("empresa_prestadora_rut")
        empresa = mapa_empresas.get(rut) if rut else None

        if rut and not empresa:
            omitidas += 1
            continue

        defaults = {
            "proveedor": item.get("proveedor"),
            "descripcion": item.get("descripcion"),
            "numero_parte": item.get("numero_parte"),
            "modalidad_base": item.get("modalidad_base", "PAGO_UNICO"),
            "modalidad_anual_forma_pago": item.get("modalidad_anual_forma_pago"),
            "precio_partner": Decimal(item.get("precio_partner", "0")),
            "precio_venta": Decimal(item.get("precio_venta", "0")),
            "moneda": item.get("moneda", "USD"),
            "activo": item.get("activo", True),
        }

        _obj, created = Licencia.objects.update_or_create(
            empresa_prestadora=empresa,
            nombre=item["nombre"],
            defaults=defaults,
        )
        if created:
            creadas += 1
        else:
            actualizadas += 1

    print_ok(
        f"Licencia: {creadas} creadas, {actualizadas} actualizadas"
        + (f", {omitidas} omitidas" if omitidas else "")
    )


# ---------------------------------------------------------------------------
# Planes de servicio
# ---------------------------------------------------------------------------

def seed_planes(datos: list, mapa_empresas: dict, mapa_servicios: dict) -> None:
    from contratos.models import PlanServicio, PlanServicioDetalle

    creadas = actualizadas = omitidas = 0
    for item in datos:
        rut = item.get("empresa_prestadora_rut")
        empresa = mapa_empresas.get(rut) if rut else None

        if rut and not empresa:
            omitidas += 1
            continue

        precio_anual = (
            Decimal(item["precio_anual"])
            if item.get("precio_anual") is not None
            else None
        )

        defaults = {
            "descripcion": item.get("descripcion"),
            "version": item.get("version", 1),
            "activo": item.get("activo", True),
            "es_vigente": item.get("es_vigente", True),
            "precio": Decimal(item.get("precio", "0")),
            "precio_anual": precio_anual,
            "tipo_moneda": item.get("tipo_moneda", "USD"),
            "veces_por_mes_default": item.get("veces_por_mes_default", 1),
            "num_visitas_mensuales": item.get("num_visitas_mensuales"),
            "formas_pago_permitidas": item.get("formas_pago_permitidas", []),
            "incluye": item.get("incluye"),
            "no_incluye": item.get("no_incluye"),
            "clausulas_especiales": item.get("clausulas_especiales"),
        }

        obj, created = PlanServicio.objects.update_or_create(
            empresa_prestadora=empresa,
            nombre=item["nombre"],
            defaults=defaults,
        )
        if created:
            creadas += 1
        else:
            actualizadas += 1

        # Sincronizar detalles de servicios
        for detalle in item.get("detalles_servicio", []):
            servicio = mapa_servicios.get(detalle["servicio_nombre"])
            if not servicio:
                continue
            PlanServicioDetalle.objects.update_or_create(
                plan=obj,
                servicio_version=servicio,
                defaults={
                    "orden": detalle.get("orden", 0),
                    "obligatorio": detalle.get("obligatorio", True),
                    "cantidad_default": detalle.get("cantidad_default", 1),
                    "veces_por_mes_default": detalle.get("veces_por_mes_default", 1),
                },
            )

    print_ok(
        f"PlanServicio: {creadas} creados, {actualizadas} actualizados"
        + (f", {omitidas} omitidos" if omitidas else "")
    )


# ---------------------------------------------------------------------------
# Plantilla SERVICIOS TECNOLOGICOS Y ASESORIAS
# ---------------------------------------------------------------------------

def seed_plantilla_servicios(plantilla_data: dict | None, mapa_empresas: dict) -> None:
    """
    Crea una copia de la plantilla canonica para cada empresa del sistema
    que aun no la tenga.
    """
    from contratos.models import PlantillaContrato, SeccionPlantilla
    from empresas.models import Empresa

    if not plantilla_data:
        print("  AVISO: plantilla_servicios no encontrada en JSON, saltando.")
        return

    titulo = plantilla_data["titulo"]
    tipo_contrato = plantilla_data["tipo_contrato"]
    secciones_src = plantilla_data["secciones"]

    empresas = list(Empresa.objects.all())
    creadas = ya_existentes = 0

    for empresa in empresas:
        plantilla, created = PlantillaContrato.objects.get_or_create(
            empresa_prestadora=empresa,
            titulo=titulo,
            tipo_contrato=tipo_contrato,
            defaults={
                "descripcion": plantilla_data.get("descripcion"),
                "version": plantilla_data.get("version", 1),
                "activa": plantilla_data.get("activa", True),
                "es_default": True,
                "requiere_nda": plantilla_data.get("requiere_nda", False),
                "orden_bloque_alcance": plantilla_data.get("orden_bloque_alcance", 1),
                "orden_bloque_operacion": plantilla_data.get("orden_bloque_operacion", 2),
                "orden_bloque_condiciones": plantilla_data.get("orden_bloque_condiciones", 3),
            },
        )

        if created:
            for sec in secciones_src:
                SeccionPlantilla.objects.create(
                    plantilla=plantilla,
                    titulo=sec.get("titulo", ""),
                    tipo=sec.get("tipo", "libre"),
                    contenido_template=sec.get("contenido_template", ""),
                    orden=sec.get("orden", 0),
                    slot_documental=sec.get("slot_documental"),
                    orden_en_slot=sec.get("orden_en_slot", 0),
                    es_editable_en_contrato=sec.get("es_editable_en_contrato", True),
                    es_obligatoria=sec.get("es_obligatoria", True),
                )
            creadas += 1
        else:
            ya_existentes += 1

    print_ok(
        f"PlantillaContrato '{titulo}': {creadas} creadas, {ya_existentes} ya existentes"
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def run():
    if not JSON_PATH.exists():
        print(f"ERROR: No se encontro el archivo JSON en {JSON_PATH}")
        print("Ejecuta primero: python dev\\scripts\\exportar_seed_contratos.py")
        sys.exit(1)

    print_seccion("Seed: Catalogo de contratos")
    datos = cargar_json()
    mapa_empresas = construir_mapa_empresas()
    print_ok(f"{len(mapa_empresas)} empresas encontradas en BD destino")

    print_seccion("Etiquetas de plantilla")
    seed_etiquetas(datos.get("etiquetas", []), mapa_empresas)

    print_seccion("Caracteristicas y Servicios")
    mapa_caract = seed_caracteristicas(datos.get("caracteristicas", []), mapa_empresas)
    mapa_servicios = seed_servicios(datos.get("servicios", []), mapa_empresas, mapa_caract)

    print_seccion("Licencias y Planes")
    seed_licencias(datos.get("licencias", []), mapa_empresas)
    seed_planes(datos.get("planes", []), mapa_empresas, mapa_servicios)

    print_seccion("Plantilla SERVICIOS TECNOLOGICOS Y ASESORIAS")
    seed_plantilla_servicios(datos.get("plantilla_servicios"), mapa_empresas)

    print_seccion("Seed contratos completado")


if __name__ == "__main__":
    run()
