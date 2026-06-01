import sqlite3
conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()
cur.execute('PRAGMA table_info("empresas_usuarioempresa")')
print("empresas_usuarioempresa:")
for r in cur.fetchall():
    print(f"  {r[1]:45} {r[2]}")
cur.execute('PRAGMA table_info("ordentrabajov3_historialestadootv3")')
print("\nordentrabajov3_historialestadootv3:")
for r in cur.fetchall():
    print(f"  {r[1]:45} {r[2]}")
conn.close()
