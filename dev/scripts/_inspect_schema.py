import sqlite3
conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()

for t in ['bodegas_ordencompra','bodegas_guiasalida','rendiciones_rendicion',
          'bodegas_stockitemenbodega','cotizaciones_cotizacion',
          'contratos_contratoempresacliente']:
    cur.execute(f'PRAGMA table_info("{t}")')
    cols = [(r[0],r[1],r[2]) for r in cur.fetchall()]
    print(f'\n{t}:')
    for c in cols:
        print(f'  {c[0]:3} {c[1]:40} {c[2]}')
conn.close()
