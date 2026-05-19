#!/usr/bin/env python
"""
Seed: Categorias, Fabricantes, Proveedores, Items, Bodegas y Stock.

Lee desde: dev/scripts/datos_exportados/seed_datos.json
Escribe en: BD Django activa (SQLite dev o PostgreSQL)

Idempotente: puede ejecutarse multiples veces sin duplicar datos.
  - Categoria         -> get_or_create por nombre
  - Fabricante        -> get_or_create por nombre
  - ProveedorEmpresa  -> update_or_create por (rut, empresa)
  - ItemEmpresa       -> update_or_create por codigo_barras (si existe)
                         o por (nombre, empresa)
  - Bodega            -> update_or_create por (nombre, sucursal)
  - StockItemEnBodega -> update_or_create por (bodega, item)
                         cantidad asignada directamente (saldo inicial, no delta)
  - SerieItem         -> update_or_create por (serie, empresa)
                         estado restaurado tal como estaba en prod

IMPORTANTE: NO usa movimientos.py para evitar registrar historicos falsos.

Prerequisito: seed_empresas_usuarios.py debe haberse ejecutado antes.

Uso:
    cd backend
    python ..\\dev\\scripts\\setup\\seeds\\seed_catalogo_inventario.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Setup Django
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[4]
BACKEND_PATH = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_PATH))
os.chdir(BACKEND_PATH)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")

import django
django.setup()

from django.db import transaction

from bodegas.models import Bodega, SerieItem, StockItemEnBodega
from empresas.models import Empresa, SucursalEmpresa
from items.models import Categoria, Fabricante, ItemEmpresa, ProveedorEmpresa

# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
DATA_FILE = REPO_ROOT / "dev" / "scripts" / "datos_exportados" / "seed_datos.json"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def print_section(titulo: str):
    print(f"\n{'=' * 60}")
    print(f"  {titulo}")
    print("=" * 60)


def print_paso(msg: str, creados: int, actualizados: int):
    total = creados + actualizados
    print(f"  {msg}: {total} registros  ({creados} nuevos, {actualizados} actualizados)")


def cargar_datos() -> dict:
    if not DATA_FILE.exists():
        print(f"ERROR: No se encontro {DATA_FILE}")
        print("       Ejecuta primero: exportar_seed_postgres.py")
        sys.exit(1)
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


def construir_mapa_empresas() -> dict[int, Empresa]:
    """
    Reconstruye mapa {id_pg: Empresa} leyendo el JSON y buscando
    en la BD destino por rut_empresa (ya creadas por seed_empresas_usuarios).
    """
    datos = cargar_datos()
    mapa: dict[int, Empresa] = {}
    for row in datos.get("empresas", []):
        clave = row.get("rut_empresa") or row.get("nombre")
        campo = "rut_empresa" if row.get("rut_empresa") else "nombre"
        try:
            empresa = Empresa.objects.get(**{campo: clave})
            mapa[row["id"]] = empresa
        except Empresa.DoesNotExist:
            pass
    return mapa


def construir_mapa_sucursales() -> dict[int, SucursalEmpresa]:
    """Reconstruye mapa {id_pg: SucursalEmpresa} desde el JSON."""
    datos = cargar_datos()
    mapa_empresas = construir_mapa_empresas()
    mapa: dict[int, SucursalEmpresa] = {}
    for row in datos.get("sucursales", []):
        empresa = mapa_empresas.get(row["empresa_id"])
        if empresa is None:
            continue
        try:
            sucursal = SucursalEmpresa.objects.get(nombre=row["nombre"], empresa=empresa)
            mapa[row["id"]] = sucursal
        except SucursalEmpresa.DoesNotExist:
            pass
    return mapa


# ---------------------------------------------------------------------------
# Pasos de seed
# ---------------------------------------------------------------------------
def seed_categorias(datos: list) -> dict:
    """Retorna mapa {id_original: Categoria}."""
    creados = actualizados = 0
    mapa: dict[int, Categoria] = {}

    for row in datos:
        cat, nueva = Categoria.objects.get_or_create(nombre=row["nombre"])
        mapa[row["id"]] = cat
        if nueva:
            creados += 1
        else:
            actualizados += 1

    print_paso("Categorias", creados, actualizados)
    return mapa


def seed_fabricantes(datos: list) -> dict:
    """Retorna mapa {id_original: Fabricante}."""
    creados = actualizados = 0
    mapa: dict[int, Fabricante] = {}

    for row in datos:
        fab, nuevo = Fabricante.objects.update_or_create(
            nombre=row["nombre"],
            defaults={
                "pagina_web": row.get("pagina_web") or "",
                "email_soporte": row.get("email_soporte") or "",
                "telefono_soporte": row.get("telefono_soporte") or "",
            },
        )
        mapa[row["id"]] = fab
        if nuevo:
            creados += 1
        else:
            actualizados += 1

    print_paso("Fabricantes", creados, actualizados)
    return mapa


def seed_proveedores(datos: list, mapa_empresas: dict) -> dict:
    """Retorna mapa {id_original: ProveedorEmpresa}."""
    creados = actualizados = omitidos = 0
    mapa: dict[int, ProveedorEmpresa] = {}

    for row in datos:
        empresa = mapa_empresas.get(row["empresa_id"])
        if empresa is None:
            omitidos += 1
            continue

        prov, creado = ProveedorEmpresa.objects.update_or_create(
            rut=row["rut"],
            empresa=empresa,
            defaults={
                "nombre": row["nombre"],
                "direccion": row.get("direccion") or "",
                "region": row.get("region") or 0,
                "provincia": row.get("provincia") or 0,
                "comuna": row.get("comuna") or 0,
                "pagina_web": row.get("pagina_web") or "",
                "telefono": row.get("telefono") or "",
                "ejecutivo_asignado": row.get("ejecutivo_asignado") or "",
                "email_ejecutivo": row.get("email_ejecutivo") or "",
                "tipo_moneda": row.get("tipo_moneda") or "2",
                "recargo_dolar": row.get("recargo_dolar") or 5,
                "catalogo_web": row.get("catalogo_web") or "",
            },
        )
        mapa[row["id"]] = prov
        if creado:
            creados += 1
        else:
            actualizados += 1

    if omitidos:
        print(f"  AVISO: {omitidos} proveedores omitidos (empresa no encontrada)")
    print_paso("Proveedores", creados, actualizados)
    return mapa


def seed_items(
    datos_items: list,
    datos_items_proveedores: list,
    mapa_empresas: dict,
    mapa_categorias: dict,
    mapa_fabricantes: dict,
    mapa_proveedores: dict,
) -> dict:
    """Retorna mapa {id_original: ItemEmpresa}."""
    creados = actualizados = omitidos = 0
    mapa: dict[int, ItemEmpresa] = {}

    # Indice M2M proveedores por item_id original
    provs_por_item: dict[int, list[int]] = {}
    for row in datos_items_proveedores:
        provs_por_item.setdefault(row["itemempresa_id"], []).append(row["proveedorempresa_id"])

    for row in datos_items:
        empresa = mapa_empresas.get(row["empresa_id"])
        if empresa is None:
            omitidos += 1
            continue

        categoria = mapa_categorias.get(row["categoria_id"]) if row.get("categoria_id") else None
        fabricante = mapa_fabricantes.get(row["fabricante_id"]) if row.get("fabricante_id") else None

        defaults = {
            "nombre": row["nombre"],
            "descripcion_corta": row.get("descripcion_corta") or "",
            "empresa": empresa,
            "categoria": categoria,
            "fabricante": fabricante,
            "comentarios": row.get("comentarios") or "",
            "es_equipo": row.get("es_equipo") or False,
        }

        # Usar codigo_barras como clave unica si existe, sino (nombre, empresa)
        codigo = row.get("codigo_barras")
        if codigo:
            item, creado = ItemEmpresa.objects.update_or_create(
                codigo_barras=codigo,
                defaults=defaults,
            )
        else:
            item, creado = ItemEmpresa.objects.update_or_create(
                nombre=row["nombre"],
                empresa=empresa,
                defaults=defaults,
            )

        # Asignar proveedores M2M
        ids_provs_orig = provs_por_item.get(row["id"], [])
        provs_obj = [mapa_proveedores[pid] for pid in ids_provs_orig if pid in mapa_proveedores]
        if provs_obj:
            item.proveedores_empresa.set(provs_obj)

        mapa[row["id"]] = item
        if creado:
            creados += 1
        else:
            actualizados += 1

    if omitidos:
        print(f"  AVISO: {omitidos} items omitidos (empresa no encontrada)")
    print_paso("Items", creados, actualizados)
    return mapa


def seed_bodegas(datos: list, mapa_sucursales: dict) -> dict:
    """Retorna mapa {id_original: Bodega}."""
    creados = actualizados = omitidos = 0
    mapa: dict[int, Bodega] = {}

    for row in datos:
        sucursal = mapa_sucursales.get(row["sucursal_id"])
        if sucursal is None:
            omitidos += 1
            continue

        bodega, creada = Bodega.objects.update_or_create(
            nombre=row["nombre"],
            sucursal=sucursal,
            defaults={},
        )
        mapa[row["id"]] = bodega
        if creada:
            creados += 1
        else:
            actualizados += 1

    if omitidos:
        print(f"  AVISO: {omitidos} bodegas omitidas (sucursal no encontrada)")
    print_paso("Bodegas", creados, actualizados)
    return mapa


def seed_stock(datos: list, mapa_bodegas: dict, mapa_items: dict) -> dict:
    """
    Escribe StockItemEnBodega con la cantidad actual como saldo inicial.
    NO usa movimientos.py para no generar historicos falsos.
    Retorna mapa {id_original: StockItemEnBodega}.
    """
    creados = actualizados = omitidos = 0
    mapa: dict[int, StockItemEnBodega] = {}

    for row in datos:
        bodega = mapa_bodegas.get(row["bodega_id"])
        item = mapa_items.get(row["item_id"])
        if bodega is None or item is None:
            omitidos += 1
            continue

        stock, creado = StockItemEnBodega.objects.update_or_create(
            bodega=bodega,
            item=item,
            defaults={
                "cantidad": row.get("cantidad") or 0,
                "pmp": row.get("pmp") or 0,
                "stock_minimo": row.get("stock_minimo") or 0,
            },
        )
        mapa[row["id"]] = stock
        if creado:
            creados += 1
        else:
            actualizados += 1

    if omitidos:
        print(f"  AVISO: {omitidos} stocks omitidos (bodega o item no encontrado)")
    print_paso("StockItemEnBodega", creados, actualizados)
    return mapa


def seed_series(datos: list, mapa_stock: dict, mapa_empresas: dict):
    """Restaura SerieItem con su estado original (disponible/reservada/despachada)."""
    creados = actualizados = omitidos = 0

    for row in datos:
        stock = mapa_stock.get(row["stock_item_id"])
        empresa = mapa_empresas.get(row["empresa_id"])
        if stock is None or empresa is None:
            omitidos += 1
            continue

        _, creado = SerieItem.objects.update_or_create(
            serie=row["serie"],
            empresa=empresa,
            defaults={
                "stock_item": stock,
                "estado": row.get("estado") or "disponible",
                # FKs a guia/oc se dejan en None (no se restauran relaciones de OC/Guia)
                "item_orden_compra_en_stock": None,
                "item_guia_salida": None,
            },
        )
        if creado:
            creados += 1
        else:
            actualizados += 1

    if omitidos:
        print(f"  AVISO: {omitidos} series omitidas (stock o empresa no encontrado)")
    print_paso("SerieItem", creados, actualizados)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def run():
    print_section("Seed: Catalogo e Inventario")

    datos = cargar_datos()

    # Reconstruir mapas de empresas y sucursales desde la BD destino
    print("  Resolviendo empresas y sucursales existentes...")
    mapa_empresas = construir_mapa_empresas()
    mapa_sucursales = construir_mapa_sucursales()
    print(f"  {len(mapa_empresas)} empresas, {len(mapa_sucursales)} sucursales encontradas")

    with transaction.atomic():
        mapa_categorias = seed_categorias(datos.get("categorias", []))
        mapa_fabricantes = seed_fabricantes(datos.get("fabricantes", []))
        mapa_proveedores = seed_proveedores(datos.get("proveedores", []), mapa_empresas)
        mapa_items = seed_items(
            datos.get("items", []),
            datos.get("items_proveedores", []),
            mapa_empresas,
            mapa_categorias,
            mapa_fabricantes,
            mapa_proveedores,
        )
        mapa_bodegas = seed_bodegas(datos.get("bodegas", []), mapa_sucursales)
        mapa_stock = seed_stock(datos.get("stock", []), mapa_bodegas, mapa_items)
        seed_series(datos.get("series", []), mapa_stock, mapa_empresas)

    print(f"\n{'=' * 60}")
    print("  Seed catalogo e inventario completado.")
    print("=" * 60)


if __name__ == "__main__":
    run()
