"""Script profundo de integridad - segunda pasada con esquemas correctos."""
import sqlite3

conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()

SEP = "-" * 70

def run(sql, params=()):
    cur.execute(sql, params)
    return cur.fetchall()

cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = set(r[0] for r in cur.fetchall())

print("\n" + SEP)
print("ANALISIS PROFUNDO - SEGUNDA PASADA")
print(SEP)

# ── A. FK CORREGIDAS ──────────────────────────────────────────────────────
print("\n[A] REGISTROS HUERFANOS (FK corregidas)")

orphan_checks = [
    ("OrdenCompra sin empresa (oc_empresa_id)",
     "bodegas_ordencompra", "oc_empresa_id", "empresas_empresa", "id"),
    ("OrdenCompra sin cliente (oc_cliente_id)",
     "bodegas_ordencompra", "oc_cliente_id", "empresas_empresa", "id"),
    ("GuiaSalida sin bodega",
     "bodegas_guiasalida", "bodega_id", "bodegas_bodega", "id"),
    ("GuiaSalida sin cliente (cliente_id)",
     "bodegas_guiasalida", "cliente_id", "empresas_empresa", "id"),
    ("GuiaSalida sin OT (orden_trabajo_id)",
     "bodegas_guiasalida", "orden_trabajo_id", "ordentrabajov3_ordendetrabajov3", "id"),
    ("Rendicion sin usuario",
     "rendiciones_rendicion", "usuario_id", "cuentas_user", "id"),
    ("Rendicion sin OT (orden_trabajo_id)",
     "rendiciones_rendicion", "orden_trabajo_id", "ordentrabajov3_ordendetrabajov3", "id"),
    ("Rendicion sin cliente",
     "rendiciones_rendicion", "cliente_id", "empresas_empresa", "id"),
    ("StockItem sin bodega",
     "bodegas_stockitemenbodega", "bodega_id", "bodegas_bodega", "id"),
    ("StockItem sin item",
     "bodegas_stockitemenbodega", "item_id", "items_itemempresa", "id"),
    ("Contrato sin empresa prestadora",
     "contratos_contratoempresacliente", "empresa_prestadora_id", "empresas_empresa", "id"),
    ("Contrato sin empresa cliente",
     "contratos_contratoempresacliente", "empresa_cliente_id", "empresas_empresa", "id"),
    ("OTV3 sin empresa",
     "ordentrabajov3_ordendetrabajov3", "empresa_id", "empresas_empresa", "id"),
    ("OTV3 sin cliente",
     "ordentrabajov3_ordendetrabajov3", "cliente_id", "empresas_empresa", "id"),
]

for desc, tabla_h, col_fk, tabla_p, col_pk in orphan_checks:
    if tabla_h not in tables or tabla_p not in tables:
        print(f"  {desc}: SKIP (tabla no existe)")
        continue
    # verificar columna fk existe
    cur.execute(f'PRAGMA table_info("{tabla_h}")')
    cols_h = [r[1] for r in cur.fetchall()]
    if col_fk not in cols_h:
        print(f"  {desc}: SKIP (col '{col_fk}' no existe en {tabla_h})")
        continue
    try:
        rows = run(f"""
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

# ── B. ESTADOS INVALIDOS PROFUNDO ─────────────────────────────────────────
print(f"\n[B] ESTADOS - DISTRIBUCION COMPLETA")

# OrdenCompra estados
if "bodegas_ordencompra" in tables:
    rows = run("SELECT estado, COUNT(*) FROM bodegas_ordencompra GROUP BY estado")
    valid = {'P0','P1','P2','P3','P4','RR','CA','AP'}  # segun modelos tipicos
    print("  OrdenCompra estados:")
    for r in rows:
        print(f"    '{r[0]}': {r[1]}")

# GuiaSalida estados
if "bodegas_guiasalida" in tables:
    rows = run("SELECT estado, COUNT(*) FROM bodegas_guiasalida GROUP BY estado")
    print("  GuiaSalida estados:")
    for r in rows:
        print(f"    '{r[0]}': {r[1]}")

# Rendicion estados
if "rendiciones_rendicion" in tables:
    rows = run("SELECT estado, COUNT(*) FROM rendiciones_rendicion GROUP BY estado")
    print("  Rendicion estados:")
    for r in rows:
        print(f"    '{r[0]}': {r[1]}")

# Contratos
if "contratos_contratoempresacliente" in tables:
    rows = run("SELECT estado, COUNT(*) FROM contratos_contratoempresacliente GROUP BY estado")
    valid_c = {'borrador','activo','terminado','suspendido','renovado','cancelado'}
    print("  Contrato estados:")
    for r in rows:
        flag = "" if r[0] in valid_c else " <-- REVISAR"
        print(f"    '{r[0]}': {r[1]}{flag}")

# ── C. STOCK NEGATIVO (tabla correcta) ────────────────────────────────────
print(f"\n[C] STOCK (tabla bodegas_stockitemenbodega)")
if "bodegas_stockitemenbodega" in tables:
    rows = run("SELECT COUNT(*), MIN(cantidad), MIN(cantidad_no_disponible) FROM bodegas_stockitemenbodega WHERE cantidad < 0 OR cantidad_no_disponible < 0")
    cnt, minc, minnd = rows[0]
    if cnt:
        print(f"  PROBLEMA: {cnt} registros con cantidades negativas (min_cantidad={minc}, min_no_disponible={minnd})")
    else:
        rows2 = run("SELECT COUNT(*) FROM bodegas_stockitemenbodega WHERE cantidad_no_disponible > cantidad")
        cnt2 = rows2[0][0]
        if cnt2:
            print(f"  INCONSISTENCIA: {cnt2} registros donde cantidad_no_disponible > cantidad")
        else:
            print("  OK - Sin stock negativo ni inconsistencias")

# ── D. MOVIMIENTOS DE STOCK vs SALDO ─────────────────────────────────────
print(f"\n[D] MOVIMIENTOS DE STOCK - distribucion por tipo")
if "bodegas_movimientostock" in tables:
    rows = run("SELECT tipo, COUNT(*), SUM(cantidad) FROM bodegas_movimientostock GROUP BY tipo")
    if rows:
        for r in rows:
            print(f"  tipo='{r[0]}': {r[1]} mov, suma_delta={r[2]}")
    else:
        print("  Sin movimientos registrados")

# ── E. COTIZACIONES - ESTADOS REALES ──────────────────────────────────────
print(f"\n[E] COTIZACIONES - estados reales en BD")
if "cotizaciones_cotizacion" in tables:
    rows = run("SELECT estado, COUNT(*), tipo_moneda FROM cotizaciones_cotizacion GROUP BY estado, tipo_moneda ORDER BY estado")
    # Obtener estados Django del modelo
    known = set()
    for r in rows:
        known.add(r[0])
    print(f"  Estados encontrados: {sorted(known)}")
    # Monedas
    rows_m = run("SELECT tipo_moneda, COUNT(*) FROM cotizaciones_cotizacion GROUP BY tipo_moneda")
    for r in rows_m:
        print(f"  Moneda '{r[0]}': {r[1]} cotizaciones")
    # Sin items
    rows_i = run("""
        SELECT COUNT(*) FROM cotizaciones_cotizacion c
        WHERE NOT EXISTS (SELECT 1 FROM cotizaciones_itemcotizacion i WHERE i.cotizacion_id = c.id)
    """)
    print(f"  Cotizaciones sin items: {rows_i[0][0]}")

# ── F. USUARIOS SIN PERSONALIZACION ───────────────────────────────────────
print(f"\n[F] USUARIOS SIN PERSONALIZACION (multi-tenancy incompleto)")
rows = run("""
    SELECT COUNT(*) FROM cuentas_user u
    WHERE NOT EXISTS (
        SELECT 1 FROM core_personalizacionusuario p WHERE p.usuario_id = u.id
    )
""")
print(f"  Usuarios sin PersonalizacionUsuario: {rows[0][0]}")

# Usuarios con is_active=False
rows = run("SELECT COUNT(*) FROM cuentas_user WHERE NOT is_active")
print(f"  Usuarios inactivos: {rows[0][0]}")

# Superusers
rows = run("SELECT email, is_superuser, is_staff FROM cuentas_user WHERE is_superuser=1")
print(f"  Superusers: {len(rows)}")
for r in rows:
    print(f"    {r[0]}")

# ── G. PERSONALIZACION USUARIO - LA ROW SIN SUCURSAL ──────────────────────
print(f"\n[G] DETALLE: PersonalizacionUsuario sin sucursal")
rows = run("""
    SELECT p.id, u.email, p.sucursal_principal_id
    FROM core_personalizacionusuario p
    JOIN cuentas_user u ON u.id = p.usuario_id
    WHERE p.sucursal_principal_id IS NULL
""")
for r in rows:
    print(f"  PersonalizacionUsuario id={r[0]}, email={r[1]}, sucursal=NULL")

# ── H. RUT DUPLICADO DETALLE ───────────────────────────────────────────────
print(f"\n[H] DETALLE: RUT empresa duplicado")
rows = run("""
    SELECT rut, COUNT(*) as cnt FROM empresas_empresa
    WHERE rut IS NOT NULL AND trim(rut) != ''
    GROUP BY rut HAVING cnt > 1
""")
for r in rows:
    print(f"  RUT='{r[0]}' aparece en {r[1]} empresas")
    detalles = run("SELECT id, nombre, rut FROM empresas_empresa WHERE rut = ?", (r[0],))
    for d in detalles:
        print(f"    id={d[0]} nombre='{d[1]}' rut='{d[2]}'")

# ── I. RELACION EMPRESA ────────────────────────────────────────────────────
print(f"\n[I] RELACIONES ENTRE EMPRESAS")
if "empresas_relacionempresa" in tables:
    rows = run("""
        SELECT r.id, e1.nombre as prestadora, e2.nombre as cliente
        FROM empresas_relacionempresa r
        LEFT JOIN empresas_empresa e1 ON e1.id = r.empresa_prestadora_id
        LEFT JOIN empresas_empresa e2 ON e2.id = r.empresa_cliente_id
    """)
    print(f"  Relaciones: {len(rows)}")
    for r in rows:
        print(f"  [{r[0]}] {r[1]} -> {r[2]}")

# ── J. OTV3 DETALLE ───────────────────────────────────────────────────────
print(f"\n[J] OTV3 - integridad interna")
if "ordentrabajov3_ordendetrabajov3" in tables:
    cur.execute('PRAGMA table_info("ordentrabajov3_ordendetrabajov3")')
    cols_v3 = [r[1] for r in cur.fetchall()]
    print(f"  Columnas OTV3: {cols_v3}")
    rows = run("SELECT id, estado, empresa_id, cliente_id FROM ordentrabajov3_ordendetrabajov3")
    for r in rows:
        print(f"  OTV3 id={r[0]} estado='{r[1]}' empresa_id={r[2]} cliente_id={r[3]}")

print(f"\n{SEP}")
print("FIN - solo lectura")
print(SEP)
conn.close()
