"""
Script de analisis de integridad de la base de datos (READ-ONLY).
Ejecutar desde backend/: python ..\dev\scripts\_integridad_bd.py
"""
import os
import sys
import django

os.chdir(os.path.dirname(os.path.abspath(__file__)) + r"\..\..\backend")
sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")
django.setup()

import sqlite3

DB_PATH = "db.sqlite3"
SEP = "-" * 70

def run(cur, sql, params=()):
    cur.execute(sql, params)
    return cur.fetchall()

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print(SEP)
print("ANALISIS DE INTEGRIDAD - BASE DE DATOS ERP SNABBIT")
print(f"Archivo: {os.path.abspath(DB_PATH)}")
print(SEP)

# ── 1. INVENTARIO DE TABLAS ────────────────────────────────────────────────
print("\n[1] INVENTARIO DE TABLAS")
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [r[0] for r in cur.fetchall()]
print(f"  Total tablas: {len(tables)}")
for t in tables:
    cur.execute(f'SELECT COUNT(*) FROM "{t}"')
    cnt = cur.fetchone()[0]
    if cnt > 0:
        print(f"  {t}: {cnt}")

# ── 2. PRAGMA INTEGRITY CHECK ─────────────────────────────────────────────
print(f"\n[2] PRAGMA integrity_check (SQLite nativo)")
rows = run(cur, "PRAGMA integrity_check")
for r in rows[:20]:
    print(f"  {r[0]}")
if len(rows) > 20:
    print(f"  ... y {len(rows)-20} mensajes mas")

# ── 3. PRAGMA FOREIGN KEY CHECK ───────────────────────────────────────────
print(f"\n[3] PRAGMA foreign_key_check (FK rotas)")
cur.execute("PRAGMA foreign_keys = ON")
rows = run(cur, "PRAGMA foreign_key_check")
if not rows:
    print("  OK - No se encontraron FK rotas")
else:
    print(f"  PROBLEMAS ENCONTRADOS ({len(rows)} registros):")
    for r in rows[:50]:
        print(f"  tabla={r[0]}  rowid={r[1]}  ref={r[2]}  idx={r[3]}")

# ── 4. HUERFANOS POR DOMINIO ──────────────────────────────────────────────
print(f"\n[4] REGISTROS HUERFANOS (hijos sin padre)")

orphan_checks = [
    # (descripcion, tabla_hija, col_fk, tabla_padre, col_pk)
    ("OT sin empresa",
     "ordentrabajov2_ordendetrabajo", "empresa_id", "empresas_empresa", "id"),
    ("OT sin cliente",
     "ordentrabajov2_ordendetrabajo", "cliente_id", "empresas_empresa", "id"),
    ("Cotizacion sin empresa",
     "cotizaciones_cotizacion", "empresa_id", "empresas_empresa", "id"),
    ("ItemCotizacion sin cotizacion",
     "cotizaciones_itemcotizacion", "cotizacion_id", "cotizaciones_cotizacion", "id"),
    ("StockItemEnBodega sin bodega",
     "bodegas_stockitembodega", "bodega_id", "bodegas_bodega", "id"),
    ("StockItemEnBodega sin item",
     "bodegas_stockitembodega", "item_id", "items_item", "id"),
    ("OrdenCompra sin empresa",
     "bodegas_ordencompra", "empresa_id", "empresas_empresa", "id"),
    ("GuiaSalida sin empresa",
     "bodegas_guiasalida", "empresa_id", "empresas_empresa", "id"),
    ("PersonalizacionUsuario sin usuario",
     "core_personalizacionusuario", "usuario_id", "cuentas_user", "id"),
    ("PersonalizacionUsuario sin sucursal",
     "core_personalizacionusuario", "sucursal_principal_id", "empresas_sucursal", "id"),
    ("Rendicion sin empresa",
     "rendiciones_rendicion", "empresa_id", "empresas_empresa", "id"),
    ("Contrato sin empresa",
     "contratos_contrato", "empresa_id", "empresas_empresa", "id"),
    ("OTV3 sin empresa",
     "ordentrabajov3_ordendetrabajov3", "empresa_id", "empresas_empresa", "id"),
]

for desc, tabla_h, col_fk, tabla_p, col_pk in orphan_checks:
    # Verificar que ambas tablas existen
    existing = set(tables)
    if tabla_h not in existing or tabla_p not in existing:
        continue
    try:
        rows = run(cur, f"""
            SELECT COUNT(*) FROM "{tabla_h}" h
            WHERE h."{col_fk}" IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM "{tabla_p}" p WHERE p."{col_pk}" = h."{col_fk}"
              )
        """)
        cnt = rows[0][0]
        status = f"PROBLEMA ({cnt} huerfanos)" if cnt else "OK"
        print(f"  {desc}: {status}")
    except Exception as e:
        print(f"  {desc}: ERROR - {e}")

# ── 5. ESTADOS INVALIDOS ──────────────────────────────────────────────────
print(f"\n[5] ESTADOS INVALIDOS (valores fuera de choices)")

estado_checks = []

# OTV2
if "ordentrabajov2_ordendetrabajo" in tables:
    try:
        rows = run(cur, """
            SELECT estado, COUNT(*) as cnt
            FROM ordentrabajov2_ordendetrabajo
            GROUP BY estado
        """)
        valid_ot = {'borrador','preparacion','en_ejecucion','retroalimentacion','por_facturar','facturada','cancelada'}
        for r in rows:
            est, cnt = r[0], r[1]
            flag = "" if est in valid_ot else " <-- INVALIDO"
            print(f"  OTV2 estado '{est}': {cnt}{flag}")
    except Exception as e:
        print(f"  OTV2 estados: ERROR - {e}")

# OTV3
if "ordentrabajov3_ordendetrabajov3" in tables:
    try:
        rows = run(cur, """
            SELECT estado, COUNT(*) as cnt
            FROM ordentrabajov3_ordendetrabajov3
            GROUP BY estado
        """)
        valid_ot3 = {'borrador','preparacion','en_ejecucion','retroalimentacion','por_facturar','facturada','cancelada'}
        for r in rows:
            est, cnt = r[0], r[1]
            flag = "" if est in valid_ot3 else " <-- INVALIDO"
            print(f"  OTV3 estado '{est}': {cnt}{flag}")
    except Exception as e:
        print(f"  OTV3 estados: ERROR - {e}")

# Cotizaciones
if "cotizaciones_cotizacion" in tables:
    try:
        rows = run(cur, "SELECT estado, COUNT(*) FROM cotizaciones_cotizacion GROUP BY estado")
        valid_cot = {'borrador','enviada','aprobada','rechazada','cancelada','en_revision'}
        for r in rows:
            est, cnt = r[0], r[1]
            flag = "" if est in valid_cot else " <-- INVALIDO"
            print(f"  Cotizacion estado '{est}': {cnt}{flag}")
    except Exception as e:
        print(f"  Cotizacion estados: ERROR - {e}")

# Rendiciones
if "rendiciones_rendicion" in tables:
    try:
        rows = run(cur, "SELECT estado, COUNT(*) FROM rendiciones_rendicion GROUP BY estado")
        valid_rend = {'borrador','enviada','aprobada','rechazada','pagada'}
        for r in rows:
            est, cnt = r[0], r[1]
            flag = "" if est in valid_rend else " <-- INVALIDO"
            print(f"  Rendicion estado '{est}': {cnt}{flag}")
    except Exception as e:
        print(f"  Rendicion estados: ERROR - {e}")

# ── 6. DATOS CRITICOS FALTANTES ───────────────────────────────────────────
print(f"\n[6] DATOS CRITICOS NULOS O VACIOS")

null_checks = [
    ("cuentas_user", "email", "Usuarios sin email"),
    ("empresas_empresa", "nombre", "Empresas sin nombre"),
    ("empresas_sucursal", "empresa_id", "Sucursales sin empresa"),
    ("core_personalizacionusuario", "sucursal_principal_id", "PersonalizacionUsuario sin sucursal"),
    ("items_item", "nombre", "Items sin nombre"),
    ("items_item", "empresa_id", "Items sin empresa"),
]

for tabla, col, desc in null_checks:
    if tabla not in tables:
        continue
    try:
        rows = run(cur, f"""
            SELECT COUNT(*) FROM "{tabla}"
            WHERE "{col}" IS NULL OR (typeof("{col}") = 'text' AND trim("{col}") = '')
        """)
        cnt = rows[0][0]
        status = f"PROBLEMA ({cnt} registros)" if cnt else "OK"
        print(f"  {desc}: {status}")
    except Exception as e:
        print(f"  {desc}: ERROR - {e}")

# ── 7. DUPLICADOS ─────────────────────────────────────────────────────────
print(f"\n[7] DUPLICADOS EN CAMPOS UNICOS")

dup_checks = [
    ("cuentas_user", "email", "Emails de usuario duplicados"),
    ("empresas_empresa", "rut", "RUT empresa duplicado"),
    ("empresas_sucursal", "nombre", "Nombre sucursal duplicado (misma empresa, col empresa_id+nombre)"),
]

for tabla, col, desc in dup_checks:
    if tabla not in tables:
        continue
    try:
        rows = run(cur, f"""
            SELECT "{col}", COUNT(*) as cnt FROM "{tabla}"
            WHERE "{col}" IS NOT NULL AND trim("{col}") != ''
            GROUP BY "{col}" HAVING cnt > 1
        """)
        if rows:
            print(f"  {desc}: PROBLEMA ({len(rows)} valores duplicados)")
            for r in rows[:5]:
                print(f"    valor='{r[0]}' aparece {r[1]} veces")
        else:
            print(f"  {desc}: OK")
    except Exception as e:
        print(f"  {desc}: ERROR - {e}")

# ── 8. STOCK NEGATIVO ─────────────────────────────────────────────────────
print(f"\n[8] STOCK NEGATIVO (bodegas)")
if "bodegas_stockitembodega" in tables:
    try:
        rows = run(cur, """
            SELECT COUNT(*), MIN(cantidad) FROM bodegas_stockitembodega WHERE cantidad < 0
        """)
        cnt, minval = rows[0]
        if cnt:
            print(f"  PROBLEMA: {cnt} registros con stock negativo (min={minval})")
        else:
            print("  OK - No hay stock negativo")
    except Exception as e:
        print(f"  ERROR - {e}")
else:
    print("  Tabla no encontrada")

# ── 9. TOKENS DUPLICADOS ──────────────────────────────────────────────────
print(f"\n[9] TOKENS UNICOS (cotizaciones, contratos)")
token_checks = [
    ("cotizaciones_cotizacion", "token", "Tokens cotizacion duplicados"),
    ("contratos_contrato", "token_publico", "Tokens contrato duplicados"),
]
for tabla, col, desc in token_checks:
    if tabla not in tables:
        continue
    try:
        # Verificar columna existe
        cur.execute(f'PRAGMA table_info("{tabla}")')
        cols = [r[1] for r in cur.fetchall()]
        if col not in cols:
            print(f"  {desc}: columna '{col}' no existe - SKIP")
            continue
        rows = run(cur, f"""
            SELECT "{col}", COUNT(*) as cnt FROM "{tabla}"
            WHERE "{col}" IS NOT NULL
            GROUP BY "{col}" HAVING cnt > 1
        """)
        if rows:
            print(f"  {desc}: PROBLEMA ({len(rows)} duplicados)")
        else:
            print(f"  {desc}: OK")
    except Exception as e:
        print(f"  {desc}: ERROR - {e}")

# ── 10. RESUMEN MULTI-TENANCY ─────────────────────────────────────────────
print(f"\n[10] DISTRIBUCION MULTI-TENANCY (filas por empresa)")
tenant_tables = [
    ("ordentrabajov2_ordendetrabajo", "empresa_id", "OTV2"),
    ("ordentrabajov3_ordendetrabajov3", "empresa_id", "OTV3"),
    ("cotizaciones_cotizacion", "empresa_id", "Cotizaciones"),
    ("bodegas_ordencompra", "empresa_id", "Ordenes Compra"),
    ("rendiciones_rendicion", "empresa_id", "Rendiciones"),
    ("contratos_contrato", "empresa_id", "Contratos"),
    ("items_item", "empresa_id", "Items"),
]
for tabla, col, label in tenant_tables:
    if tabla not in tables:
        continue
    try:
        rows = run(cur, f"""
            SELECT e.nombre, COUNT(*) as cnt
            FROM "{tabla}" t
            LEFT JOIN empresas_empresa e ON e.id = t."{col}"
            GROUP BY t."{col}"
            ORDER BY cnt DESC
        """)
        if rows:
            detail = ", ".join(f"{r[0] or 'NULL'}:{r[1]}" for r in rows[:5])
            print(f"  {label}: {detail}")
        else:
            print(f"  {label}: sin datos")
    except Exception as e:
        print(f"  {label}: ERROR - {e}")

print(f"\n{SEP}")
print("FIN DEL ANALISIS (solo lectura - ningun dato fue modificado)")
print(SEP)
conn.close()
