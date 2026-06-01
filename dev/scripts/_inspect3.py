import sqlite3
conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()
cur.execute('PRAGMA table_info("empresas_empresa")')
print("empresas_empresa:")
for r in cur.fetchall():
    print(f"  {r[1]:40} {r[2]}")
cur.execute('PRAGMA table_info("ordentrabajov3_tareaotv3")')
print("\nordentrabajov3_tareaotv3:")
for r in cur.fetchall():
    print(f"  {r[1]:40} {r[2]}")
conn.close()
