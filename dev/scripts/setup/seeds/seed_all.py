#!/usr/bin/env python
"""
Orquestador: ejecuta todos los seeds en el orden correcto.

Orden:
  1. seed_empresas_usuarios      -> Grupos, Empresas, Sucursales, Relaciones, Usuarios
  2. seed_catalogo_inventario    -> Categorias, Fabricantes, Proveedores, Items, Bodegas, Stock
  3. seed_contratos_base         -> CaracteristicaServicio, Servicio, PlanServicio (desde PostgreSQL export)
  4. seed_contratos_catalogo     -> Etiquetas, Licencias, Plantilla (desde SQLite export)

Prerequisito: exportar_seed_postgres.py + exportar_seed_contratos.py deben haberse ejecutado
para generar los archivos en dev/scripts/datos_exportados/

Uso:
    cd backend
    python ..\\dev\\scripts\\setup\\seeds\\seed_all.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Setup Django (unico, compartido por los modulos importados)
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[4]
BACKEND_PATH = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_PATH))
os.chdir(BACKEND_PATH)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")

import django
django.setup()

# ---------------------------------------------------------------------------
# Importar los runners de cada seed
# ---------------------------------------------------------------------------
# Agregar la carpeta seeds al path para importar como modulos
SEEDS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SEEDS_DIR))

from seed_empresas_usuarios import run as run_empresas_usuarios
from seed_catalogo_inventario import run as run_catalogo_inventario
from seed_contratos_base import run as run_contratos_base
from seed_contratos_catalogo import run as run_contratos_catalogo


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("\n" + "#" * 60)
    print("#  SEED ALL - Datos desde exportaciones dev")
    print("#" * 60)

    print("\n[1/4] Empresas, Sucursales, Relaciones, Usuarios...")
    run_empresas_usuarios()

    print("\n[2/4] Catalogo e Inventario...")
    run_catalogo_inventario()

    print("\n[3/4] Contratos Base (Caracteristicas, Servicios, Planes)...")
    run_contratos_base()

    print("\n[4/4] Contratos Catalogo (Etiquetas, Licencias, Plantilla)...")
    run_contratos_catalogo()

    print("\n" + "#" * 60)
    print("#  Todos los seeds completados.")
    print("#" * 60 + "\n")


if __name__ == "__main__":
    main()
