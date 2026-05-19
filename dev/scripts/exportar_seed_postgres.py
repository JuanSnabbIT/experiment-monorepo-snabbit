#!/usr/bin/env python
"""
Extractor de datos desde PostgreSQL dev hacia JSON para seeds locales.

Lee desde: erp_dev (PostgreSQL, host remoto)
Escribe en: dev/scripts/datos_exportados/seed_datos.json

Tablas exportadas (18):
  auth_group
  empresas_empresa, empresas_sucursalempresa, empresas_relacionempresa
  cuentas_user, empresas_usuarioempresa, empresas_usuarioempresa_grupos
  core_personalizacionusuario
  items_categoria, items_fabricante, items_proveedorempresa
  items_itemempresa, items_itemempresa_proveedores_empresa
  bodegas_bodega, bodegas_stockitemenbodega
  contratos_caracteristicaservicio, contratos_servicio (+M2M), contratos_planservicio (+detalles)

Campos OMITIDOS por seguridad/inutilidad en dev:
  cuentas_user: password, image
  empresas_empresa: logo, firma_empresa

Uso:
    cd backend
    python ..\\dev\\scripts\\exportar_seed_postgres.py
"""
from __future__ import annotations

import json
import os
import sys
from decimal import Decimal
from pathlib import Path

# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[2]
CONFIGS_ENV = REPO_ROOT / "backend" / "configs-env"
OUTPUT_DIR = REPO_ROOT / "dev" / "scripts" / "datos_exportados"
OUTPUT_FILE = OUTPUT_DIR / "seed_datos.json"


# ---------------------------------------------------------------------------
# Leer credenciales desde backend/configs-env
# ---------------------------------------------------------------------------
def cargar_credenciales() -> dict:
    """Parsea backend/configs-env como archivo .env."""
    creds = {}
    if not CONFIGS_ENV.exists():
        print(f"ERROR: No se encontro {CONFIGS_ENV}")
        sys.exit(1)

    with open(CONFIGS_ENV, encoding="utf-8") as f:
        for linea in f:
            linea = linea.strip()
            if not linea or linea.startswith("#") or "=" not in linea:
                continue
            clave, _, valor = linea.partition("=")
            creds[clave.strip()] = valor.strip().strip('"').strip("'")

    return creds


# ---------------------------------------------------------------------------
# Serializador seguro para Decimal y otros tipos no-JSON
# ---------------------------------------------------------------------------
class JsonEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        return super().default(obj)


# ---------------------------------------------------------------------------
# Helpers de consulta
# ---------------------------------------------------------------------------
def query_all(cursor, sql: str, params=None) -> list[dict]:
    cursor.execute(sql, params or [])
    columns = [desc[0] for desc in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def columnas_tabla(cursor, tabla: str) -> set[str]:
    """Retorna el conjunto de columnas existentes en una tabla."""
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = %s
    """, [tabla])
    return {row[0] for row in cursor.fetchall()}


def select_disponibles(cursor, tabla: str, columnas_deseadas: list[str], extra: str = "") -> list[dict]:
    """
    Consulta solo las columnas que existen en la tabla.
    Columnas ausentes quedan como None en el resultado.
    """
    existentes = columnas_tabla(cursor, tabla)
    cols_sql = ", ".join(
        c if c in existentes else f"NULL AS {c}"
        for c in columnas_deseadas
    )
    sql = f"SELECT {cols_sql} FROM {tabla} {extra}"
    return query_all(cursor, sql)


def print_ok(msg: str):
    print(f"  OK  {msg}")


def print_section(title: str):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Extraccion por grupos
# ---------------------------------------------------------------------------
def exportar_grupos(cursor) -> list:
    return query_all(cursor, "SELECT id, name FROM auth_group ORDER BY id")


def exportar_empresas(cursor) -> list:
    return select_disponibles(cursor, "empresas_empresa", [
        "id", "nombre", "rut_empresa", "email", "telefono", "giro",
        "nombre_fantasia", "representante_legal", "rut_representante",
        "direccion_principal", "recargo", "ppm",
    ], "ORDER BY id")


def exportar_sucursales(cursor) -> list:
    return select_disponibles(cursor, "empresas_sucursalempresa", [
        "id", "nombre", "empresa_id", "direccion", "region", "provincia", "comuna",
        "telefono", "email",
    ], "ORDER BY empresa_id, id")


def exportar_relaciones_empresa(cursor) -> list:
    return select_disponibles(cursor, "empresas_relacionempresa", [
        "id", "prestador_servicios_id", "cliente_id", "tipo_relacion",
    ], "ORDER BY id")


def exportar_usuarios(cursor) -> list:
    # NUNCA exportar password ni image
    return select_disponibles(cursor, "cuentas_user", [
        "id", "email", "first_name", "last_name", "second_name", "second_last_name",
        "is_active", "is_staff", "is_superuser", "rut", "celular",
        "region", "provincia", "comuna", "direccion",
    ], "ORDER BY id")


def exportar_usuarios_empresa(cursor) -> list:
    return select_disponibles(cursor, "empresas_usuarioempresa", [
        "id", "usuario_id", "sucursal_id", "cargo", "rut", "estado",
        "fecha_ingreso", "fecha_contrato",
    ], "ORDER BY id")


def exportar_usuarios_empresa_grupos(cursor) -> list:
    """Tabla M2M: UsuarioEmpresa <-> Group."""
    return select_disponibles(cursor, "empresas_usuarioempresa_grupos", [
        "usuarioempresa_id", "group_id",
    ], "ORDER BY usuarioempresa_id")


def exportar_personalizaciones(cursor) -> list:
    return select_disponibles(cursor, "core_personalizacionusuario", [
        "id", "usuario_id", "sucursal_principal_id", "tema", "font_size",
    ], "ORDER BY id")


def exportar_categorias(cursor) -> list:
    return select_disponibles(cursor, "items_categoria", [
        "id", "nombre",
    ], "ORDER BY nombre")


def exportar_fabricantes(cursor) -> list:
    return select_disponibles(cursor, "items_fabricante", [
        "id", "nombre", "pagina_web", "email_soporte", "telefono_soporte",
    ], "ORDER BY nombre")


def exportar_proveedores(cursor) -> list:
    return select_disponibles(cursor, "items_proveedorempresa", [
        "id", "nombre", "rut", "empresa_id", "direccion", "region", "provincia", "comuna",
        "pagina_web", "telefono", "ejecutivo_asignado", "email_ejecutivo",
        "tipo_moneda", "recargo_dolar", "catalogo_web",
    ], "ORDER BY empresa_id, nombre")


def exportar_items(cursor) -> list:
    return select_disponibles(cursor, "items_itemempresa", [
        "id", "nombre", "descripcion_corta", "empresa_id", "fabricante_id",
        "categoria_id", "comentarios", "codigo_barras", "es_equipo",
    ], "ORDER BY empresa_id, nombre")


def exportar_items_proveedores(cursor) -> list:
    """Tabla M2M: ItemEmpresa <-> ProveedorEmpresa."""
    return select_disponibles(cursor, "items_itemempresa_proveedores_empresa", [
        "itemempresa_id", "proveedorempresa_id",
    ], "ORDER BY itemempresa_id")


def exportar_bodegas(cursor) -> list:
    return select_disponibles(cursor, "bodegas_bodega", [
        "id", "nombre", "sucursal_id",
    ], "ORDER BY sucursal_id, nombre")


def exportar_stock(cursor) -> list:
    return select_disponibles(cursor, "bodegas_stockitemenbodega", [
        "id", "bodega_id", "item_id", "cantidad", "pmp", "stock_minimo",
    ], "ORDER BY bodega_id, item_id")


def exportar_caracteristicas(cursor) -> list:
    return select_disponibles(cursor, "contratos_caracteristicaservicio", [
        "id", "empresa_prestadora_id", "nombre", "descripcion", "activo",
    ], "WHERE activo = TRUE ORDER BY empresa_prestadora_id, nombre")


def exportar_servicios(cursor) -> list:
    servicios = select_disponibles(cursor, "contratos_servicio", [
        "id", "empresa_prestadora_id", "nombre", "descripcion", "categoria",
        "version", "activo", "es_vigente", "precio", "tipo_moneda",
        "veces_por_mes_default", "formas_pago_permitidas",
        "incluye", "no_incluye", "clausulas_especiales",
    ], "WHERE activo = TRUE AND es_vigente = TRUE ORDER BY empresa_prestadora_id, nombre")
    # M2M: Servicio <-> CaracteristicaServicio
    m2m = select_disponibles(cursor, "contratos_servicio_caracteristicas", [
        "servicio_id", "caracteristicaservicio_id",
    ], "ORDER BY servicio_id")
    # Indexar M2M por servicio_id
    por_servicio: dict = {}
    for r in m2m:
        por_servicio.setdefault(r["servicio_id"], []).append(r["caracteristicaservicio_id"])
    for s in servicios:
        s["caracteristicas_ids"] = por_servicio.get(s["id"], [])
    return servicios


def exportar_planes(cursor) -> list:
    planes = select_disponibles(cursor, "contratos_planservicio", [
        "id", "empresa_prestadora_id", "nombre", "descripcion", "version",
        "activo", "es_vigente", "precio", "precio_anual", "tipo_moneda",
        "veces_por_mes_default", "num_visitas_mensuales", "formas_pago_permitidas",
        "incluye", "no_incluye", "clausulas_especiales",
    ], "WHERE activo = TRUE AND es_vigente = TRUE ORDER BY empresa_prestadora_id, nombre")
    # Detalles del plan (M2M a través de PlanServicioDetalle)
    detalles = select_disponibles(cursor, "contratos_planserviciodetalle", [
        "plan_id", "servicio_version_id", "orden", "obligatorio",
        "cantidad_default", "veces_por_mes_default",
    ], "ORDER BY plan_id, orden")
    por_plan: dict = {}
    for d in detalles:
        por_plan.setdefault(d["plan_id"], []).append(d)
    for p in planes:
        p["detalles"] = por_plan.get(p["id"], [])
    return planes


def exportar_series(cursor) -> list:
    """
    Exporta todas las series combinando dos fuentes:
    1. bodegas_serieitem          - modelo relacional (migradas)
    2. bodegas_itemordencompraenstock.numeros_serie - JSONField legado
    Deduplica por (serie, stock_item_id). Estado siempre 'disponible' para las
    del JSONField (no se restauran guias de salida).
    """
    import json as _json

    # Fuente 1: modelo relacional
    migradas = select_disponibles(cursor, "bodegas_serieitem", [
        "id", "serie", "estado", "empresa_id", "stock_item_id",
    ], "ORDER BY id")

    # Fuente 2: JSONField legado — join para obtener empresa_id
    cursor.execute("""
        SELECT
            ioc.stock_item_id,
            ioc.numeros_serie,
            suc.empresa_id
        FROM bodegas_itemordencompraenstock ioc
        JOIN bodegas_stockitemenbodega sib ON sib.id = ioc.stock_item_id
        JOIN bodegas_bodega bod ON bod.id = sib.bodega_id
        JOIN empresas_sucursalempresa suc ON suc.id = bod.sucursal_id
        WHERE ioc.numeros_serie IS NOT NULL
        ORDER BY ioc.id
    """)
    legado_rows = [
        dict(zip([d[0] for d in cursor.description], row))
        for row in cursor.fetchall()
    ]

    # Deduplicacion: clave (serie, stock_item_id)
    ya_vistos: set[tuple] = {(r["serie"], r["stock_item_id"]) for r in migradas}
    resultado = list(migradas)

    for row in legado_rows:
        raw = row["numeros_serie"]
        if not raw:
            continue
        # El campo puede llegar como dict o como str JSON
        if isinstance(raw, str):
            try:
                raw = _json.loads(raw)
            except Exception:
                continue
        series_list = raw.get("numeros_serie", []) if isinstance(raw, dict) else []
        for entry in series_list:
            serie_str = entry.get("serie", "").strip()
            if not serie_str:
                continue
            clave = (serie_str, row["stock_item_id"])
            if clave in ya_vistos:
                continue
            ya_vistos.add(clave)
            resultado.append({
                "id": None,          # no tiene ID en el modelo relacional aun
                "serie": serie_str,
                "estado": "disponible",
                "empresa_id": row["empresa_id"],
                "stock_item_id": row["stock_item_id"],
            })

    return resultado


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    try:
        import psycopg2
    except ImportError:
        print("ERROR: psycopg2 no esta instalado.")
        print("       pip install psycopg2-binary")
        sys.exit(1)

    creds = cargar_credenciales()

    db_host = creds.get("POSTGRES_HOST", "").strip()
    db_name = creds.get("POSTGRES_DB_ERP_DEV", "erp_dev")
    db_user = creds.get("POSTGRES_USER", "")
    db_pass = creds.get("POSTGRES_PASSWORD", "")
    db_port = int(creds.get("POSTGRES_PORT", 5432))

    print(f"\nConectando a PostgreSQL...")
    print(f"  Host : {db_host}:{db_port}")
    print(f"  BD   : {db_name}")
    print(f"  User : {db_user}")

    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            dbname=db_name,
            user=db_user,
            password=db_pass,
            connect_timeout=10,
        )
    except Exception as exc:
        print(f"\nERROR: No se pudo conectar: {exc}")
        sys.exit(1)

    print("  Conexion establecida.")

    datos = {}

    with conn.cursor() as cur:
        print_section("Exportando grupos y empresas")
        datos["grupos"] = exportar_grupos(cur)
        print_ok(f"{len(datos['grupos'])} grupos")

        datos["empresas"] = exportar_empresas(cur)
        print_ok(f"{len(datos['empresas'])} empresas")

        datos["sucursales"] = exportar_sucursales(cur)
        print_ok(f"{len(datos['sucursales'])} sucursales")

        datos["relaciones_empresa"] = exportar_relaciones_empresa(cur)
        print_ok(f"{len(datos['relaciones_empresa'])} relaciones empresa")

        print_section("Exportando usuarios")
        datos["usuarios"] = exportar_usuarios(cur)
        print_ok(f"{len(datos['usuarios'])} usuarios")

        datos["usuarios_empresa"] = exportar_usuarios_empresa(cur)
        print_ok(f"{len(datos['usuarios_empresa'])} UsuarioEmpresa")

        datos["usuarios_empresa_grupos"] = exportar_usuarios_empresa_grupos(cur)
        print_ok(f"{len(datos['usuarios_empresa_grupos'])} asignaciones de grupo")

        datos["personalizaciones"] = exportar_personalizaciones(cur)
        print_ok(f"{len(datos['personalizaciones'])} personalizaciones")

        print_section("Exportando catalogo")
        datos["categorias"] = exportar_categorias(cur)
        print_ok(f"{len(datos['categorias'])} categorias")

        datos["fabricantes"] = exportar_fabricantes(cur)
        print_ok(f"{len(datos['fabricantes'])} fabricantes")

        datos["proveedores"] = exportar_proveedores(cur)
        print_ok(f"{len(datos['proveedores'])} proveedores")

        datos["items"] = exportar_items(cur)
        print_ok(f"{len(datos['items'])} items")

        datos["items_proveedores"] = exportar_items_proveedores(cur)
        print_ok(f"{len(datos['items_proveedores'])} relaciones item-proveedor")

        print_section("Exportando bodegas y stock")
        datos["bodegas"] = exportar_bodegas(cur)
        print_ok(f"{len(datos['bodegas'])} bodegas")

        datos["stock"] = exportar_stock(cur)
        print_ok(f"{len(datos['stock'])} registros de stock")

        datos["series"] = exportar_series(cur)
        print_ok(f"{len(datos['series'])} series de items")

        print_section("Exportando catalogo de contratos")
        datos["caracteristicas"] = exportar_caracteristicas(cur)
        print_ok(f"{len(datos['caracteristicas'])} caracteristicas de servicio")

        datos["servicios"] = exportar_servicios(cur)
        print_ok(f"{len(datos['servicios'])} servicios")

        datos["planes"] = exportar_planes(cur)
        print_ok(f"{len(datos['planes'])} planes de servicio")

    conn.close()

    # Guardar JSON
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2, cls=JsonEncoder)

    print(f"\n{'=' * 60}")
    print(f"  Exportacion completada")
    print(f"  Archivo: {OUTPUT_FILE}")
    print(f"  Tamano : {OUTPUT_FILE.stat().st_size / 1024:.1f} KB")
    print("=" * 60)


if __name__ == "__main__":
    main()
