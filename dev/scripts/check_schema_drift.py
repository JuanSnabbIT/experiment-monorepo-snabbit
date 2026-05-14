"""
Compara el esquema real de PostgreSQL contra lo que esperan los modelos Django.
No confía en el estado de las migraciones — va directamente a information_schema.

Uso:
    cd backend
    python ../dev/scripts/check_schema_drift.py

Salida:
    - Tablas que el modelo espera pero no existen en BD
    - Columnas que el modelo espera pero no existen en BD
    - Columnas que existen en BD pero el modelo no conoce (posible residuo)
"""

import os
import sys
import django

# Forzar UTF-8 en Windows (consola usa cp1252 por defecto)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

_backend = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "backend")
)
if _backend not in sys.path:
    sys.path.insert(0, _backend)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")
django.setup()

from django.apps import apps
from django.db import connection

ANSI_RED    = "\033[91m"
ANSI_YELLOW = "\033[93m"
ANSI_GREEN  = "\033[92m"
ANSI_CYAN   = "\033[96m"
ANSI_RESET  = "\033[0m"

# Prefijos de apps del sistema a ignorar (no son nuestras)
SKIP_APP_LABELS = {
    "admin", "auth", "contenttypes", "sessions", "sites",
    "authtoken", "social_django", "taggit", "django_celery_beat",
    # bd_ciudades usa una BD separada (POSTGRES_DB_COMUNAS), no la default
    "bd_ciudades",
}

# Columnas que Django/postgres agrega internamente y no aparecen en _meta
INTERNAL_COLS = {"tableoid", "xmin", "cmax", "xmax", "cmin", "ctid"}


def get_db_tables():
    with connection.cursor() as cur:
        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        """)
        return {row[0] for row in cur.fetchall()}


def get_db_columns(table):
    with connection.cursor() as cur:
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
        """, [table])
        return {row[0]: {"type": row[1], "nullable": row[2] == "YES"}
                for row in cur.fetchall()}


def model_columns(model):
    """Devuelve el conjunto de columnas de BD que el modelo declara."""
    cols = set()
    for f in model._meta.local_concrete_fields:
        cols.add(f.column)
    # M2M con through table explícita: la tabla through es un modelo normal,
    # ya aparecerá en get_models(); las M2M automáticas (sin through) no
    # tienen columnas en la tabla padre, solo crean su propia join table.
    return cols


def main():
    db_tables = get_db_tables()

    missing_tables   = []   # modelo espera tabla, BD no la tiene
    missing_columns  = []   # modelo espera columna, BD no la tiene
    extra_columns    = []   # BD tiene columna, modelo no la conoce
    ok_tables        = []

    all_models = [
        m for m in apps.get_models(include_auto_created=True)
        if m._meta.app_label not in SKIP_APP_LABELS
    ]

    for model in all_models:
        table = model._meta.db_table
        app   = model._meta.app_label

        if table not in db_tables:
            missing_tables.append((app, model.__name__, table))
            continue

        db_cols    = get_db_columns(table)
        model_cols = model_columns(model)

        col_missing = sorted(model_cols - db_cols.keys())
        col_extra   = sorted(
            c for c in (db_cols.keys() - model_cols)
            if c not in INTERNAL_COLS
        )

        if col_missing:
            missing_columns.append((table, col_missing))
        if col_extra:
            extra_columns.append((table, col_extra))
        if not col_missing and not col_extra:
            ok_tables.append(table)

    # ------------------------------------------------------------------ output
    print(f"\n{ANSI_CYAN}{'='*65}{ANSI_RESET}")
    print(f"{ANSI_CYAN}  DIAGNÓSTICO DE ESQUEMA  (modelos vs PostgreSQL real){ANSI_RESET}")
    print(f"{ANSI_CYAN}{'='*65}{ANSI_RESET}\n")

    if missing_tables:
        print(f"{ANSI_RED}TABLAS FALTANTES EN BD ({len(missing_tables)}){ANSI_RESET}")
        for app, name, tbl in missing_tables:
            print(f"  {ANSI_RED}✗{ANSI_RESET}  [{app}] {name}  →  {tbl}")
        print()

    if missing_columns:
        print(f"{ANSI_RED}COLUMNAS FALTANTES EN BD ({len(missing_columns)} tablas afectadas){ANSI_RESET}")
        for table, cols in missing_columns:
            print(f"  {ANSI_RED}✗{ANSI_RESET}  {table}")
            for c in cols:
                print(f"       - {c}")
        print()

    if extra_columns:
        print(f"{ANSI_YELLOW}COLUMNAS EN BD QUE EL MODELO NO CONOCE ({len(extra_columns)} tablas){ANSI_RESET}")
        print(f"  {ANSI_YELLOW}(pueden ser residuos de migraciones viejas o columnas legacy){ANSI_RESET}")
        for table, cols in extra_columns:
            print(f"  {ANSI_YELLOW}~{ANSI_RESET}  {table}")
            for c in cols:
                print(f"       - {c}")
        print()

    print(f"{ANSI_GREEN}TABLAS OK: {len(ok_tables)}{ANSI_RESET}")
    if missing_tables or missing_columns:
        print(f"\n{ANSI_RED}⚠  Hay desincronía entre BD y modelos.{ANSI_RESET}")
        sys.exit(1)
    elif extra_columns:
        print(f"\n{ANSI_YELLOW}⚠  BD tiene columnas residuales; revisa si se pueden limpiar.{ANSI_RESET}")
    else:
        print(f"\n{ANSI_GREEN}✓  BD y modelos están alineados.{ANSI_RESET}")


if __name__ == "__main__":
    main()
