"""
migrar_postgres.py — ETL: SQLite → PostgreSQL (Railway)
========================================================
Migra causas_judiciales.db (SQLite, 17MB) a un cluster PostgreSQL en Railway.

USO:
  1. Configurar DATABASE_URL en .env (Railway lo provee como variable de entorno)
  2. Ejecutar: python migrar_postgres.py
  3. Verificar progreso en consola

TABLAS migradas: causas, tribunales, jueces, causa_juez
"""

import sqlite3
import sys
import time
import os
from dotenv import load_dotenv

load_dotenv()

try:
    import psycopg2
    from psycopg2.extras import execute_values, RealDictCursor
except ImportError:
    print("❌ psycopg2 no instalado. Ejecuta: pip install psycopg2-binary")
    sys.exit(1)

SQLITE_PATH = "causas_judiciales.db"
DATABASE_URL = os.getenv("DATABASE_URL", "")
CHUNK_SIZE = 2000


def conectar_postgres():
    if not DATABASE_URL:
        print("❌ Falta DATABASE_URL en .env")
        print("   Ejemplo: postgresql://postgres:password@host:5432/railway")
        sys.exit(1)
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn


def verificar_sqlite():
    if not os.path.exists(SQLITE_PATH):
        print(f"❌ No se encuentra {SQLITE_PATH}")
        sys.exit(1)
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    # Verificar tablas disponibles
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tablas = [row[0] for row in cursor.fetchall()]
    print(f"📋 Tablas en SQLite: {tablas}")
    conn.close()
    return tablas


def crear_schema_postgres(pg_conn):
    """Crea el schema completo en PostgreSQL, compatible con el modelo SQLite."""
    schema = """
    -- Tribunales
    CREATE TABLE IF NOT EXISTS tribunales (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        region TEXT,
        ciudad TEXT
    );

    -- Jueces
    CREATE TABLE IF NOT EXISTS jueces (
        id TEXT PRIMARY KEY,
        nombre_completo TEXT NOT NULL,
        tribunal_id TEXT REFERENCES tribunales(id)
    );

    -- Causas (tabla principal)
    CREATE TABLE IF NOT EXISTS causas (
        id TEXT PRIMARY KEY,
        rit TEXT,
        ruc TEXT,
        tribunal_id TEXT REFERENCES tribunales(id),
        materia TEXT,
        fecha_ingreso DATE,
        fecha_sentencia DATE,
        resultado TEXT,
        monto_utm NUMERIC,
        resumen_anonimizado TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Relación causa-juez
    CREATE TABLE IF NOT EXISTS causa_juez (
        causa_id TEXT REFERENCES causas(id),
        juez_id  TEXT REFERENCES jueces(id),
        PRIMARY KEY (causa_id, juez_id)
    );

    -- Índices para queries de analytics
    CREATE INDEX IF NOT EXISTS idx_causas_tribunal    ON causas(tribunal_id);
    CREATE INDEX IF NOT EXISTS idx_causas_materia     ON causas(materia);
    CREATE INDEX IF NOT EXISTS idx_causas_sentencia   ON causas(fecha_sentencia);
    CREATE INDEX IF NOT EXISTS idx_causas_rit         ON causas(rit);
    CREATE INDEX IF NOT EXISTS idx_causa_juez_juez    ON causa_juez(juez_id);
    """
    with pg_conn.cursor() as cur:
        cur.execute(schema)
    pg_conn.commit()
    print("✅ Schema PostgreSQL creado/verificado.")


def migrar_tabla(sqlite_conn, pg_conn, tabla: str, insert_sql: str, mapper_fn):
    """Migra una tabla SQLite → PostgreSQL en chunks."""
    cur_sqlite = sqlite_conn.cursor()
    cur_sqlite.execute(f"SELECT COUNT(*) FROM {tabla}")
    total = cur_sqlite.fetchone()[0]

    if total == 0:
        print(f"   ⏭️  Tabla '{tabla}' vacía, omitiendo.")
        return

    print(f"\n📦 Migrando '{tabla}': {total:,} registros...")
    cur_sqlite.execute(f"SELECT * FROM {tabla}")

    procesados = 0
    inicio = time.time()

    while True:
        chunk = cur_sqlite.fetchmany(CHUNK_SIZE)
        if not chunk:
            break

        valores = [mapper_fn(dict(row)) for row in chunk]

        with pg_conn.cursor() as cur:
            execute_values(cur, insert_sql, valores, page_size=CHUNK_SIZE)
        pg_conn.commit()

        procesados += len(chunk)
        pct = round(procesados / total * 100, 1)
        elapsed = round(time.time() - inicio, 1)
        print(f"   🚀 {procesados:,}/{total:,} ({pct}%) — {elapsed}s", end="\r")

    print(f"   ✅ '{tabla}' completado: {procesados:,} registros en {round(time.time()-inicio,1)}s")


def main():
    print("=" * 60)
    print("   NEXO FAMILIA — ETL: SQLite → PostgreSQL (Railway)")
    print("=" * 60)

    tablas_sqlite = verificar_sqlite()
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row

    print(f"\n🔌 Conectando a PostgreSQL...")
    pg_conn = conectar_postgres()
    print(f"✅ Conexión PostgreSQL OK")

    crear_schema_postgres(pg_conn)

    total_inicio = time.time()

    # ── Tribunales ──
    if "tribunales" in tablas_sqlite:
        migrar_tabla(
            sqlite_conn, pg_conn,
            tabla="tribunales",
            insert_sql="""
                INSERT INTO tribunales (id, nombre, region, ciudad)
                VALUES %s ON CONFLICT (id) DO NOTHING
            """,
            mapper_fn=lambda r: (
                r.get("id"), r.get("nombre", ""), r.get("region"), r.get("ciudad")
            ),
        )

    # ── Jueces ──
    if "jueces" in tablas_sqlite:
        migrar_tabla(
            sqlite_conn, pg_conn,
            tabla="jueces",
            insert_sql="""
                INSERT INTO jueces (id, nombre_completo, tribunal_id)
                VALUES %s ON CONFLICT (id) DO NOTHING
            """,
            mapper_fn=lambda r: (
                r.get("id"), r.get("nombre_completo", ""), r.get("tribunal_id")
            ),
        )

    # ── Causas ──
    if "causas" in tablas_sqlite:
        migrar_tabla(
            sqlite_conn, pg_conn,
            tabla="causas",
            insert_sql="""
                INSERT INTO causas (id, rit, ruc, tribunal_id, materia, fecha_ingreso,
                                    fecha_sentencia, resultado, monto_utm, resumen_anonimizado)
                VALUES %s ON CONFLICT (id) DO NOTHING
            """,
            mapper_fn=lambda r: (
                r.get("id"), r.get("rit"), r.get("ruc"), r.get("tribunal_id"),
                r.get("materia"), r.get("fecha_ingreso"), r.get("fecha_sentencia"),
                r.get("resultado"), r.get("monto_utm"), r.get("resumen_anonimizado"),
            ),
        )

    # ── Causa-Juez ──
    if "causa_juez" in tablas_sqlite:
        migrar_tabla(
            sqlite_conn, pg_conn,
            tabla="causa_juez",
            insert_sql="""
                INSERT INTO causa_juez (causa_id, juez_id)
                VALUES %s ON CONFLICT DO NOTHING
            """,
            mapper_fn=lambda r: (r.get("causa_id"), r.get("juez_id")),
        )

    sqlite_conn.close()
    pg_conn.close()

    total_tiempo = round(time.time() - total_inicio, 1)
    print(f"\n{'='*60}")
    print(f"✅ MIGRACIÓN COMPLETA en {total_tiempo}s")
    print(f"   Base de datos SQLite migrada exitosamente a Railway PostgreSQL.")
    print(f"   Railway usará PostgreSQL automáticamente una vez configurado DATABASE_URL.")
    print("=" * 60)


if __name__ == "__main__":
    main()
