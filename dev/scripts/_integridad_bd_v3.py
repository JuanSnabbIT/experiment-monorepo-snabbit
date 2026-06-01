"""Tercera pasada - analisis final con esquemas verificados."""
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
print("ANALISIS FINAL - INTEGRIDAD BD")
print(SEP)

# ── D. MOVIMIENTOS DE STOCK ───────────────────────────────────────────────
print(f"\n[D] MOVIMIENTOS DE STOCK")
if "bodegas_movimientostock" in tables:
    rows = run("SELECT tipo_movimiento, COUNT(*), SUM(cantidad) FROM bodegas_movimientostock GROUP BY tipo_movimiento")
    for r in rows:
        print(f"  tipo='{r[0]}': {r[1]} movimientos, suma_delta={r[2]}")
    # Huerfanos
    rows2 = run("""
        SELECT COUNT(*) FROM bodegas_movimientostock m
        WHERE NOT EXISTS (SELECT 1 FROM bodegas_stockitemenbodega s WHERE s.id = m.stock_item_id)
    """)
    print(f"  Movimientos sin stock_item valido: {rows2[0][0]}")

# ── E2. COTIZACIONES ESTADOS REALES (desde modelo Django) ─────────────────
print(f"\n[E] COTIZACIONES ESTADOS vs CHOICES DEL MODELO")
# Leer los choices del modelo Python
import sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + r"\..\..\backend")
sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")
import django
django.setup()
from cotizaciones.models import Cotizacion
valid_states = {choice[0] for choice in Cotizacion.ESTADO_CHOICES} if hasattr(Cotizacion, 'ESTADO_CHOICES') else set()
print(f"  Choices del modelo: {sorted(valid_states)}")
rows = run("SELECT estado, COUNT(*) FROM cotizaciones_cotizacion GROUP BY estado")
for r in rows:
    flag = " <-- INVALIDO" if valid_states and r[0] not in valid_states else ""
    print(f"  estado='{r[0]}': {r[1]}{flag}")

# ── F2. CONTRATOS ESTADOS ─────────────────────────────────────────────────
print(f"\n[F] CONTRATOS ESTADOS vs CHOICES DEL MODELO")
from contratos.models import ContratoEmpresaCliente
valid_c = {choice[0] for choice in ContratoEmpresaCliente.ESTADO_CHOICES} if hasattr(ContratoEmpresaCliente, 'ESTADO_CHOICES') else set()
print(f"  Choices del modelo: {sorted(valid_c)}")
rows = run("SELECT estado, COUNT(*) FROM contratos_contratoempresacliente GROUP BY estado")
for r in rows:
    flag = " <-- INVALIDO" if valid_c and r[0] not in valid_c else ""
    print(f"  estado='{r[0]}': {r[1]}{flag}")

# ── G. CONTRATOS FECHAS ───────────────────────────────────────────────────
print(f"\n[G] CONTRATOS - fechas de inicio/fin")
rows = run("""
    SELECT id, nombre, fecha_inicio, fecha_fin, estado
    FROM contratos_contratoempresacliente
    ORDER BY id
""")
for r in rows:
    problema = ""
    if r[2] and r[3] and r[2] > r[3]:
        problema = " <-- FECHA_INICIO > FECHA_FIN"
    print(f"  id={r[0]} '{r[1]}' ({r[4]}) inicio={r[2]} fin={r[3]}{problema}")

# ── H2. RUT DETALLE ───────────────────────────────────────────────────────
print(f"\n[H] RUT EMPRESA - detalle completo")
rows = run("SELECT id, nombre, rut FROM empresas_empresa ORDER BY id")
for r in rows:
    flag = " <-- placeholder?" if r[2] == 'rut' else ""
    print(f"  id={r[0]} '{r[1]}' rut='{r[2]}'{flag}")

# ── I2. RELACIONES EMPRESA ────────────────────────────────────────────────
print(f"\n[I] RELACIONES EMPRESA (prestador -> cliente)")
rows = run("""
    SELECT r.id, r.tipo_relacion,
           ep.nombre as prestador, ec.nombre as cliente
    FROM empresas_relacionempresa r
    LEFT JOIN empresas_empresa ep ON ep.id = r.prestador_servicios_id
    LEFT JOIN empresas_empresa ec ON ec.id = r.cliente_id
""")
for r in rows:
    print(f"  [{r[0]}] {r[1]}: '{r[2]}' -> '{r[3]}'")

# ── J2. OTV3 DETALLE ──────────────────────────────────────────────────────
print(f"\n[J] OTV3 - integridad interna")
rows = run("""
    SELECT o.id, o.estado, o.tipo_servicio, o.modalidad,
           ep.nombre as empresa, ec.nombre as cliente,
           u.email as tecnico
    FROM ordentrabajov3_ordendetrabajov3 o
    LEFT JOIN empresas_empresa ep ON ep.id = o.empresa_id
    LEFT JOIN empresas_empresa ec ON ec.id = o.cliente_id
    LEFT JOIN cuentas_user u ON u.id = o.tecnico_responsable_id
""")
from ordentrabajov3.models import OrdenDeTrabajoV3
valid_ot3 = {c[0] for c in OrdenDeTrabajoV3.ESTADO_CHOICES} if hasattr(OrdenDeTrabajoV3, 'ESTADO_CHOICES') else set()
print(f"  Estados validos OTV3: {sorted(valid_ot3)}")
for r in rows:
    flag = " <-- INVALIDO" if valid_ot3 and r[1] not in valid_ot3 else ""
    print(f"  id={r[0]} estado='{r[1]}'{flag} empresa='{r[4]}' cliente='{r[5]}' tecnico={r[6]}")

# ── K. TAREAS OTV3 ────────────────────────────────────────────────────────
print(f"\n[K] TAREAS OTV3")
rows = run("""
    SELECT t.id, t.titulo, t.estado, t.orden_trabajo_id,
           o.estado as ot_estado
    FROM ordentrabajov3_tareaotv3 t
    LEFT JOIN ordentrabajov3_ordendetrabajov3 o ON o.id = t.orden_trabajo_id
""")
for r in rows:
    print(f"  Tarea id={r[0]} '{r[1]}' estado='{r[2]}' OT_id={r[3]} OT_estado='{r[4]}'")

# ── L. NOTIFICACIONES FCM ─────────────────────────────────────────────────
print(f"\n[L] NOTIFICACIONES")
if "notificaciones_notificacion" in tables:
    rows = run("SELECT leida, COUNT(*) FROM notificaciones_notificacion GROUP BY leida")
    for r in rows:
        print(f"  leida={r[0]}: {r[1]}")
    rows_old = run("""
        SELECT COUNT(*) FROM notificaciones_notificacion
        WHERE fecha_creacion < date('now', '-30 days')
    """)
    print(f"  Notificaciones con mas de 30 dias: {rows_old[0][0]}")

# ── M. USUARIOS EMPRESA ───────────────────────────────────────────────────
print(f"\n[M] USUARIOS EMPRESA (multi-tenancy)")
rows = run("""
    SELECT e.nombre, COUNT(ue.id) as total_users
    FROM empresas_empresa e
    LEFT JOIN empresas_usuarioempresa ue ON ue.empresa_id = e.id
    GROUP BY e.id
    ORDER BY e.nombre
""")
for r in rows:
    print(f"  '{r[0]}': {r[1]} usuarios")

# ── N. INTEGRIDAD HISTORIAL ───────────────────────────────────────────────
print(f"\n[N] REGISTROS HISTORICOS - consistencia")
hist_pairs = [
    ("contratos_historicalcontratoempresacliente", "contratos_contratoempresacliente", "id", "history_id"),
    ("ordentrabajov3_historicalordendetrabajov3", "ordentrabajov3_ordendetrabajov3", "id", "history_id"),
    ("cotizaciones_historicalcotizacion", "cotizaciones_cotizacion", "id", "history_id"),
]
for tabla_h, tabla_orig, _, _ in hist_pairs:
    if tabla_h in tables and tabla_orig in tables:
        rows = run(f'SELECT COUNT(*) FROM "{tabla_h}"')
        rows2 = run(f'SELECT COUNT(*) FROM "{tabla_orig}"')
        ratio = rows[0][0] / max(rows2[0][0], 1)
        print(f"  {tabla_orig}: {rows2[0][0]} actuales, {rows[0][0]} historicos (ratio {ratio:.1f}x)")

print(f"\n{SEP}")
print("FIN ANALISIS FINAL (solo lectura)")
print(SEP)
conn.close()
