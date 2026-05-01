# core/database.py
# ─── Acceso a base de datos: SQLite local / PostgreSQL en producción ───────────
import os
import sqlite3
from loguru import logger

DATABASE_URL = os.environ.get("DATABASE_URL", "")  # Set by Railway PostgreSQL addon

# ─── Detección automática: Railway PostgreSQL vs SQLite local ─────────────────
USE_POSTGRES = bool(DATABASE_URL)

if USE_POSTGRES:
    try:
        import psycopg2
        import psycopg2.extras
        logger.info("✅ [DB] Modo PostgreSQL activo (Railway DATABASE_URL detectada).")
    except ImportError:
        logger.error("❌ [DB] psycopg2 no instalado. Instala: pip install psycopg2-binary")
        USE_POSTGRES = False


def get_db_connection():
    """
    Retorna una conexión a la base de datos activa.
    - Si DATABASE_URL está configurada → PostgreSQL (Railway producción)
    - Si no → SQLite local (dev / fallback)

    Ambas conexiones exponen la misma interfaz mediante row_factory / RealDictCursor.
    """
    if USE_POSTGRES:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
        return conn
    else:
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'causas_judiciales.db')
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        return conn


def fetchall_as_dicts(cursor) -> list[dict]:
    """Convierte resultados de cursor a lista de dicts (compatible SQLite y PG)."""
    rows = cursor.fetchall()
    if not rows:
        return []
    # psycopg2 RealDictCursor ya retorna dicts; sqlite3.Row necesita conversión
    if isinstance(rows[0], sqlite3.Row):
        return [dict(row) for row in rows]
    return [dict(row) for row in rows]


def fetchone_as_dict(cursor) -> dict | None:
    """Convierte un solo resultado a dict (compatible SQLite y PG)."""
    row = cursor.fetchone()
    if row is None:
        return None
    if isinstance(row, sqlite3.Row):
        return dict(row)
    return dict(row)
