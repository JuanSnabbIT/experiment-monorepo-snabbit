import sqlite3

conn = sqlite3.connect('backend/db.sqlite3')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = cursor.fetchall()
print("TABLES:", len(tables))
for name, in tables:
    if 'gasto' in name:
        print(name)
cursor.execute("SELECT id, detalle FROM rendiciones_detallegastorendicion LIMIT 5")
print("detalle table sample", cursor.fetchall())
conn.close()
