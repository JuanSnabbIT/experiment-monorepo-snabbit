#!/usr/bin/env python
"""
Seed: Grupos, Empresas, Sucursales, Relaciones, Usuarios y Personalizaciones.

Lee desde: dev/scripts/datos_exportados/seed_datos.json
Escribe en: BD Django activa (SQLite dev o PostgreSQL)

Idempotente: puede ejecutarse multiples veces sin duplicar datos.
  - Empresa          -> update_or_create por rut_empresa
  - SucursalEmpresa  -> update_or_create por (nombre, empresa)
  - User             -> update_or_create por email (password = test1234)
  - UsuarioEmpresa   -> update_or_create por usuario (OneToOne)
  - Personalizacion  -> update_or_create por usuario (OneToOne)

Uso:
    cd backend
    python ..\\dev\\scripts\\setup\\seeds\\seed_empresas_usuarios.py
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

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction

from core.models import PersonalizacionUsuario
from empresas.models import Empresa, RelacionEmpresa, SucursalEmpresa, UsuarioEmpresa

User = get_user_model()

# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
DATA_FILE = REPO_ROOT / "dev" / "scripts" / "datos_exportados" / "seed_datos.json"
PASSWORD_DEFAULT = "test1234"


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


# ---------------------------------------------------------------------------
# Pasos de seed
# ---------------------------------------------------------------------------
def seed_grupos(datos: list) -> dict:
    """Retorna mapa {id_original: Group} para resolver FKs posteriores."""
    creados = actualizados = 0
    mapa: dict[int, Group] = {}

    for row in datos:
        grupo, nuevo = Group.objects.get_or_create(name=row["name"])
        mapa[row["id"]] = grupo
        if nuevo:
            creados += 1
        else:
            actualizados += 1

    print_paso("Grupos", creados, actualizados)
    return mapa


def seed_empresas(datos: list) -> dict:
    """Retorna mapa {id_original: Empresa}."""
    creados = actualizados = 0
    mapa: dict[int, Empresa] = {}

    for row in datos:
        clave_busqueda = {}
        if row.get("rut_empresa"):
            clave_busqueda["rut_empresa"] = row["rut_empresa"]
        else:
            # Fallback a nombre si no hay RUT
            clave_busqueda["nombre"] = row["nombre"]

        defaults = {
            "nombre": row["nombre"],
            "email": row.get("email") or "",
            "telefono": row.get("telefono") or "",
            "giro": row.get("giro") or "",
            "nombre_fantasia": row.get("nombre_fantasia") or "",
            "representante_legal": row.get("representante_legal") or "",
            "rut_representante": row.get("rut_representante") or "",
            "direccion_principal": row.get("direccion_principal") or "",
            "recargo": row.get("recargo") or 0,
            "ppm": row.get("ppm") or 1,
        }

        empresa, creada = Empresa.objects.update_or_create(
            **clave_busqueda, defaults=defaults
        )
        mapa[row["id"]] = empresa
        if creada:
            creados += 1
        else:
            actualizados += 1

    print_paso("Empresas", creados, actualizados)
    return mapa


def seed_sucursales(datos: list, mapa_empresas: dict) -> dict:
    """
    Retorna mapa {id_original: SucursalEmpresa}.
    Solo crea sucursales cuya empresa padre fue importada.
    """
    creados = actualizados = omitidos = 0
    mapa: dict[int, SucursalEmpresa] = {}

    for row in datos:
        empresa = mapa_empresas.get(row["empresa_id"])
        if empresa is None:
            omitidos += 1
            continue

        sucursal, creada = SucursalEmpresa.objects.update_or_create(
            nombre=row["nombre"],
            empresa=empresa,
            defaults={
                "direccion": row.get("direccion") or "",
                "region": row.get("region") or 0,
                "provincia": row.get("provincia") or 0,
                "comuna": row.get("comuna") or 0,
                "telefono": row.get("telefono") or "",
                "email": row.get("email") or "",
            },
        )
        mapa[row["id"]] = sucursal
        if creada:
            creados += 1
        else:
            actualizados += 1

    if omitidos:
        print(f"  AVISO: {omitidos} sucursales omitidas (empresa padre no encontrada)")
    print_paso("Sucursales", creados, actualizados)
    return mapa


def seed_relaciones_empresa(datos: list, mapa_empresas: dict):
    """Crea relaciones prestador -> cliente entre empresas."""
    creados = actualizados = omitidos = 0

    for row in datos:
        prestador = mapa_empresas.get(row["prestador_servicios_id"])
        cliente = mapa_empresas.get(row["cliente_id"])
        if prestador is None or cliente is None:
            omitidos += 1
            continue

        _, creada = RelacionEmpresa.objects.update_or_create(
            prestador_servicios=prestador,
            cliente=cliente,
            defaults={"tipo_relacion": row.get("tipo_relacion") or "prestador-cliente"},
        )
        if creada:
            creados += 1
        else:
            actualizados += 1

    if omitidos:
        print(f"  AVISO: {omitidos} relaciones omitidas (empresa no encontrada)")
    print_paso("RelacionesEmpresa", creados, actualizados)


def seed_usuarios(datos: list) -> dict:
    """
    Retorna mapa {id_original: User}.
    Todos los usuarios reciben password = test1234.
    """
    creados = actualizados = 0
    mapa: dict[int, User] = {}

    for row in datos:
        defaults = {
            "first_name": row.get("first_name") or "",
            "last_name": row.get("last_name") or "",
            "second_name": row.get("second_name") or "",
            "second_last_name": row.get("second_last_name") or "",
            "is_active": row.get("is_active") or False,
            "is_staff": row.get("is_staff") or False,
            "is_superuser": row.get("is_superuser") or False,
            "rut": row.get("rut") or None,
            "celular": row.get("celular") or "",
            "region": row.get("region") or 0,
            "provincia": row.get("provincia") or 0,
            "comuna": row.get("comuna") or 0,
            "direccion": row.get("direccion") or "",
        }

        usuario, creado = User.objects.update_or_create(
            email=row["email"],
            defaults=defaults,
        )

        if creado:
            usuario.set_password(PASSWORD_DEFAULT)
            usuario.save()
            creados += 1
        else:
            actualizados += 1

        mapa[row["id"]] = usuario

    print_paso("Usuarios", creados, actualizados)
    return mapa


def seed_usuarios_empresa(
    datos_ue: list,
    datos_grupos_m2m: list,
    mapa_usuarios: dict,
    mapa_sucursales: dict,
    mapa_grupos: dict,
) -> dict:
    """Retorna mapa {id_original: UsuarioEmpresa}."""
    creados = actualizados = omitidos = 0
    mapa: dict[int, UsuarioEmpresa] = {}

    # Construir indice de grupos M2M por usuarioempresa_id original
    grupos_por_ue: dict[int, list[int]] = {}
    for row in datos_grupos_m2m:
        grupos_por_ue.setdefault(row["usuarioempresa_id"], []).append(row["group_id"])

    for row in datos_ue:
        usuario = mapa_usuarios.get(row["usuario_id"])
        sucursal = mapa_sucursales.get(row["sucursal_id"])
        if usuario is None or sucursal is None:
            omitidos += 1
            continue

        ue, creada = UsuarioEmpresa.objects.update_or_create(
            usuario=usuario,
            defaults={
                "sucursal": sucursal,
                "cargo": row.get("cargo") or "",
                "rut": row.get("rut") or None,
                "estado": row.get("estado") or "1",
                "fecha_ingreso": row.get("fecha_ingreso") or None,
                "fecha_contrato": row.get("fecha_contrato") or None,
            },
        )

        # Asignar grupos M2M
        ids_grupos_orig = grupos_por_ue.get(row["id"], [])
        grupos_obj = [mapa_grupos[gid] for gid in ids_grupos_orig if gid in mapa_grupos]
        if grupos_obj:
            ue.grupos.set(grupos_obj)

        mapa[row["id"]] = ue
        if creada:
            creados += 1
        else:
            actualizados += 1

    if omitidos:
        print(f"  AVISO: {omitidos} UsuarioEmpresa omitidos (usuario o sucursal no encontrado)")
    print_paso("UsuarioEmpresa", creados, actualizados)
    return mapa


def seed_personalizaciones(
    datos: list,
    mapa_usuarios: dict,
    mapa_sucursales: dict,
):
    creados = actualizados = omitidos = 0

    for row in datos:
        usuario = mapa_usuarios.get(row["usuario_id"])
        if usuario is None:
            omitidos += 1
            continue

        sucursal = mapa_sucursales.get(row["sucursal_principal_id"]) if row.get("sucursal_principal_id") else None

        PersonalizacionUsuario.objects.update_or_create(
            usuario=usuario,
            defaults={
                "sucursal_principal": sucursal,
                "tema": row.get("tema") or "1",
                "font_size": row.get("font_size") or 13,
            },
        )
        # Contar
        creados += 1  # simplificado, update_or_create no devuelve bool facilmente aqui

    if omitidos:
        print(f"  AVISO: {omitidos} personalizaciones omitidas (usuario no encontrado)")
    print(f"  Personalizaciones: {creados} procesadas")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def run():
    print_section("Seed: Grupos, Empresas, Sucursales, Relaciones, Usuarios")

    datos = cargar_datos()

    with transaction.atomic():
        mapa_grupos = seed_grupos(datos.get("grupos", []))
        mapa_empresas = seed_empresas(datos.get("empresas", []))
        mapa_sucursales = seed_sucursales(datos.get("sucursales", []), mapa_empresas)
        seed_relaciones_empresa(datos.get("relaciones_empresa", []), mapa_empresas)
        mapa_usuarios = seed_usuarios(datos.get("usuarios", []))
        seed_usuarios_empresa(
            datos.get("usuarios_empresa", []),
            datos.get("usuarios_empresa_grupos", []),
            mapa_usuarios,
            mapa_sucursales,
            mapa_grupos,
        )
        seed_personalizaciones(
            datos.get("personalizaciones", []),
            mapa_usuarios,
            mapa_sucursales,
        )

    print(f"\n{'=' * 60}")
    print("  Seed empresas y usuarios completado.")
    print("=" * 60)


if __name__ == "__main__":
    run()
