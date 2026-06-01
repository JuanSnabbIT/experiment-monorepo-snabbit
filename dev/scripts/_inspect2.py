import sqlite3
conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()

for t in ['bodegas_movimientostock','ordentrabajov3_ordendetrabajov3',
          'items_itemempresa','empresas_relacionempresa',
          'contratos_contratoempresacliente']:
    cur.execute(f'PRAGMA table_info("{t}")')
    cols = [(r[1],r[2]) for r in cur.fetchall()]
    print(f'\n{t}:')
    for c in cols:
        print(f'  {c[0]:45} {c[1]}')
conn.close()
