"""
migrar_bd.py — Agrega columnas de análisis NLP a la tabla causas.
Usa ALTER TABLE para no perder los 199 registros existentes.
"""
import sqlite3

DB = 'causas_judiciales.db'

migraciones = [
    "ALTER TABLE causas ADD COLUMN resultado TEXT",           # Acoge / Rechaza / Acoge Parcialmente / Indefinido
    "ALTER TABLE causas ADD COLUMN monto_fijado_utm REAL",   # Amount in UTM (if found)
    "ALTER TABLE causas ADD COLUMN confianza_extraccion INTEGER DEFAULT 0",  # 0-100 score de certeza
]

conn = sqlite3.connect(DB)
cur  = conn.cursor()

for sql in migraciones:
    campo = sql.split("ADD COLUMN")[1].strip().split()[0]
    try:
        cur.execute(sql)
        print(f"  [OK] Columna '{campo}' agregada.")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print(f"  [YA EXISTE] '{campo}' — omitiendo.")
        else:
            print(f"  [ERROR] '{campo}': {e}")

conn.commit()
conn.close()
print("\nMigracion completada.")
