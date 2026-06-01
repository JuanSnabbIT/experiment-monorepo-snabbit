"""Pasada final consolidada con todos los esquemas correctos."""
import sqlite3, sys, os

os.chdir(os.path.dirname(os.path.abspath(__file__)) + r"\..\..\backend")
sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")
import django; django.setup()

conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()
SEP = "-" * 70

def run(sql, params=()):
    cur.execute(sql, params)
    return cur.fetchall()

cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = set(r[0] for r in cur.fetchall())

print("\n" + SEP)
print("ANALISIS FINAL CONSOLIDADO")
print(SEP)

# ── H. EMPRESAS - RUT CORRECTO ────────────────────────────────────────────
print(f"\n[H] EMPRESAS - rut_empresa")
rows = run("SELECT id, nombre, rut_empresa FROM empresas_empresa ORDER BY id")
for r in rows:
    flag = " <-- placeholder?" if r[2] in (None, '', 'rut', '12.345.678-9') else ""
    print(f"  id={r[0]} '{r[1]}' rut='{r[2]}'{flag}")
# duplicados reales
rows_dup = run("""
    SELECT rut_empresa, COUNT(*) as cnt FROM empresas_empresa
    WHERE rut_empresa IS NOT NULL AND trim(rut_empresa) != ''
    GROUP BY rut_empresa HAVING cnt > 1
""")
if rows_dup:
    print(f"  DUPLICADOS RUT:")
    for r in rows_dup:
        print(f"    rut='{r[0]}' aparece {r[1]} veces")
else:
    print("  Sin duplicados RUT reales")

# ── I. RELACIONES EMPRESA ─────────────────────────────────────────────────
print(f"\n[I] RELACIONES EMPRESA")
rows = run("""
    SELECT r.id, r.tipo_relacion,
           ep.nombre as prestador, ec.nombre as cliente
    FROM empresas_relacionempresa r
    LEFT JOIN empresas_empresa ep ON ep.id = r.prestador_servicios_id
    LEFT JOIN empresas_empresa ec ON ec.id = r.cliente_id
""")
for r in rows:
    print(f"  [{r[0]}] tipo='{r[1]}' | '{r[2]}' -> '{r[3]}'")

# ── J. OTV3 COMPLETO ──────────────────────────────────────────────────────
print(f"\n[J] OTV3 - detalle completo")
from ordentrabajov3.models import OrdenDeTrabajoV3
valid_ot3 = {c[0] for c in OrdenDeTrabajoV3.ESTADO_CHOICES} if hasattr(OrdenDeTrabajoV3, 'ESTADO_CHOICES') else set()
print(f"  Estados validos: {sorted(valid_ot3)}")
rows = run("""
    SELECT o.id, o.estado, o.tipo_servicio,
           ep.nombre as empresa, ec.nombre as cliente,
           u.email as tecnico
    FROM ordentrabajov3_ordendetrabajov3 o
    LEFT JOIN empresas_empresa ep ON ep.id = o.empresa_id
    LEFT JOIN empresas_empresa ec ON ec.id = o.cliente_id
    LEFT JOIN cuentas_user u ON u.id = o.tecnico_responsable_id
""")
for r in rows:
    flag = " <-- INVALIDO" if valid_ot3 and r[1] not in valid_ot3 else ""
    print(f"  id={r[0]} estado='{r[1]}'{flag} empresa='{r[3]}' cliente='{r[4]}'")

# ── K. TAREAS OTV3 ────────────────────────────────────────────────────────
print(f"\n[K] TAREAS OTV3")
rows = run("""
    SELECT t.id, t.titulo, t.estado, t.orden_id,
           o.estado as ot_estado
    FROM ordentrabajov3_tareaotv3 t
    LEFT JOIN ordentrabajov3_ordendetrabajov3 o ON o.id = t.orden_id
""")
for r in rows:
    print(f"  id={r[0]} '{r[1]}' estado='{r[2]}' OT_id={r[3]} OT_estado='{r[4]}'")
rows_orphan = run("""
    SELECT COUNT(*) FROM ordentrabajov3_tareaotv3 t
    WHERE NOT EXISTS (SELECT 1 FROM ordentrabajov3_ordendetrabajov3 o WHERE o.id = t.orden_id)
""")
print(f"  Tareas sin OT padre: {rows_orphan[0][0]}")

# ── E. COTIZACIONES ───────────────────────────────────────────────────────
print(f"\n[E] COTIZACIONES - estados")
from cotizaciones.models import Cotizacion
valid_cot = {c[0] for c in Cotizacion.ESTADO_CHOICES} if hasattr(Cotizacion, 'ESTADO_CHOICES') else set()
# Intentar obtener choices via _meta
if not valid_cot:
    try:
        field = Cotizacion._meta.get_field('estado')
        if hasattr(field, 'choices') and field.choices:
            valid_cot = {c[0] for c in field.choices}
    except:
        pass
print(f"  Estados validos (modelo): {sorted(valid_cot) if valid_cot else 'no detectados - revisar manualmente'}")
rows = run("SELECT estado, COUNT(*) FROM cotizaciones_cotizacion GROUP BY estado ORDER BY estado")
# Comparar contra choices reales del modelo si existen
for r in rows:
    flag = " <-- REVISAR (fuera de choices)" if valid_cot and r[0] not in valid_cot else ""
    print(f"  estado='{r[0]}': {r[1]}{flag}")
# Sin items
rows_i = run("""
    SELECT COUNT(*) FROM cotizaciones_cotizacion c
    WHERE NOT EXISTS (SELECT 1 FROM cotizaciones_itemcotizacion i WHERE i.cotizacion_id = c.id)
""")
print(f"  Cotizaciones sin ningun item: {rows_i[0][0]}")

# ── F. CONTRATOS ──────────────────────────────────────────────────────────
print(f"\n[F] CONTRATOS - estados")
from contratos.models import ContratoEmpresaCliente
valid_c = set()
try:
    field = ContratoEmpresaCliente._meta.get_field('estado')
    if hasattr(field, 'choices') and field.choices:
        valid_c = {c[0] for c in field.choices}
except:
    pass
print(f"  Estados validos (modelo): {sorted(valid_c) if valid_c else 'no detectados'}")
rows = run("SELECT estado, COUNT(*), nombre FROM contratos_contratoempresacliente GROUP BY estado")
for r in rows:
    flag = " <-- INVALIDO" if valid_c and r[0] not in valid_c else ""
    print(f"  estado='{r[0]}': {r[1]}{flag}")

# ── M. USUARIOS EMPRESA ───────────────────────────────────────────────────
print(f"\n[M] USUARIOS POR EMPRESA")
rows = run("""
    SELECT e.nombre, COUNT(ue.id) as usuarios
    FROM empresas_empresa e
    LEFT JOIN empresas_usuarioempresa ue ON ue.empresa_id = e.id
    GROUP BY e.id ORDER BY e.nombre
""")
for r in rows:
    print(f"  '{r[0]}': {r[1]} usuarios")

# ── N. HISTORIAL RATIO ────────────────────────────────────────────────────
print(f"\n[N] RATIO HISTORIAL (django-simple-history)")
hist_pairs = [
    ("contratos_historicalcontratoempresacliente", "contratos_contratoempresacliente"),
    ("ordentrabajov3_historicalordendetrabajov3", "ordentrabajov3_ordendetrabajov3"),
    ("cotizaciones_historicalcotizacion", "cotizaciones_cotizacion"),
    ("bodegas_historicalstockitemenbodega", "bodegas_stockitemenbodega"),
    ("bodegas_historicalordencompra", "bodegas_ordencompra"),
]
for tabla_h, tabla_orig in hist_pairs:
    if tabla_h in tables and tabla_orig in tables:
        r1 = run(f'SELECT COUNT(*) FROM "{tabla_orig}"')[0][0]
        r2 = run(f'SELECT COUNT(*) FROM "{tabla_h}"')[0][0]
        ratio = f"{r2/max(r1,1):.1f}x" if r1 else "N/A"
        print(f"  {tabla_orig.split('_',1)[1]}: {r1} registros, {r2} historicos ({ratio})")

# ── O. PERSONALIZACION SIN SUCURSAL ──────────────────────────────────────
print(f"\n[O] PersonalizacionUsuario sin sucursal_principal")
rows = run("""
    SELECT p.id, u.email, u.is_active
    FROM core_personalizacionusuario p
    JOIN cuentas_user u ON u.id = p.usuario_id
    WHERE p.sucursal_principal_id IS NULL
""")
for r in rows:
    print(f"  PersonalizacionUsuario id={r[0]}, email={r[1]}, activo={bool(r[2])}")

# ── P. SERIES (bodegas) ───────────────────────────────────────────────────
print(f"\n[P] SERIES DE ITEMS (bodegas_serieitem)")
if "bodegas_serieitem" in tables:
    rows = run("SELECT COUNT(*) FROM bodegas_serieitem")
    print(f"  Total series: {rows[0][0]}")
    rows2 = run("""
        SELECT COUNT(*) FROM bodegas_serieitem s
        WHERE NOT EXISTS (SELECT 1 FROM bodegas_stockitemenbodega si WHERE si.id = s.stock_item_id)
    """)
    if rows2[0][0]:
        print(f"  PROBLEMA: {rows2[0][0]} series sin stock_item valido")
    else:
        print("  FK stock_item: OK")

# ── Q. INDICADORES ECONOMICOS ─────────────────────────────────────────────
print(f"\n[Q] INDICADORES ECONOMICOS")
if "core_indicadoreconomico" in tables:
    rows = run("SELECT tipo, COUNT(*), MAX(fecha), MIN(valor), MAX(valor) FROM core_indicadoreconomico GROUP BY tipo")
    for r in rows:
        print(f"  tipo='{r[0]}': {r[1]} registros, ultima_fecha={r[2]}, rango=[{r[3]}, {r[4]}]")
    rows_dup = run("""
        SELECT tipo, fecha, COUNT(*) as cnt FROM core_indicadoreconomico
        GROUP BY tipo, fecha HAVING cnt > 1
    """)
    if rows_dup:
        print(f"  DUPLICADOS (tipo+fecha): {len(rows_dup)}")
        for r in rows_dup[:5]:
            print(f"    tipo='{r[0]}' fecha='{r[1]}' aparece {r[2]} veces")
    else:
        print("  Sin duplicados tipo+fecha: OK")

print(f"\n{SEP}")
print("RESUMEN DE PROBLEMAS DETECTADOS")
print(SEP)
# Recolectar resumen
issues = []

# RUT placeholder
rows = run("SELECT COUNT(*) FROM empresas_empresa WHERE rut_empresa IN ('rut','12.345.678-9') OR rut_empresa IS NULL")
if rows[0][0]:
    issues.append(f"[MENOR] {rows[0][0]} empresas con RUT nulo o placeholder")

# PersonalizacionUsuario sin sucursal
rows = run("SELECT COUNT(*) FROM core_personalizacionusuario WHERE sucursal_principal_id IS NULL")
if rows[0][0]:
    issues.append(f"[MEDIO] {rows[0][0]} PersonalizacionUsuario sin sucursal (bloquea multi-tenancy para ese usuario)")

# Cotizaciones con estados no esperados
rows = run("SELECT estado, COUNT(*) FROM cotizaciones_cotizacion GROUP BY estado")
if rows:
    all_states = [r[0] for r in rows]
    issues.append(f"[INFO] Cotizaciones: estados presentes = {all_states} (verificar si 'aceptada'/'pendiente' son choices validos)")

# Contratos con 'aprobado_cliente'
rows = run("SELECT COUNT(*) FROM contratos_contratoempresacliente WHERE estado='aprobado_cliente'")
if rows[0][0]:
    issues.append(f"[INFO] {rows[0][0]} contrato(s) con estado='aprobado_cliente' - verificar si es choice valido en el modelo")

# Contratos sin fecha_fin
rows = run("SELECT COUNT(*) FROM contratos_contratoempresacliente WHERE fecha_fin IS NULL")
if rows[0][0]:
    issues.append(f"[MENOR] {rows[0][0]} contratos sin fecha_fin definida")

if not issues:
    print("  Ninguno detectado.")
for iss in issues:
    print(f"  {iss}")

print(f"\n{SEP}")
print("FIN (solo lectura, ningun dato fue modificado)")
print(SEP)
conn.close()
