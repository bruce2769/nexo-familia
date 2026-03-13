import sqlite3
import psycopg2
from psycopg2.extras import execute_values
import os
import time
from dotenv import load_dotenv

# Cargar variables de entorno (URL de PostgreSQL)
load_dotenv()

# --- CONFIGURACIÓN ---
SQLITE_PATH = "causas_judiciales.db"
POSTGRES_URL = os.getenv("DATABASE_URL") # ej: postgresql://user:pass@host:port/dbname
CHUNK_SIZE = 5000 # Cuántas sentencias mover a la vez en RAM

def conectar_postgres():
    """Conecta al clúster PostgreSQL en la nube."""
    if not POSTGRES_URL:
        raise ValueError("Falta DATABASE_URL en el archivo .env")
    return psycopg2.connect(POSTGRES_URL)

def crear_tablas_destino(pg_conn):
    """Crea la estructura 1:1 en PostgreSQL si no existe."""
    query = """
    CREATE TABLE IF NOT EXISTS sentencias (
        id SERIAL PRIMARY KEY,
        causa_id TEXT UNIQUE,
        rit TEXT NOT NULL,
        juez_id TEXT,
        tribunal_id TEXT,
        materia TEXT,
        fecha_ingreso DATE,
        fecha_sentencia DATE,
        texto_pdf TEXT,
        resultado_llm TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    -- Índices para velocidad de los Dashboards
    CREATE INDEX IF NOT EXISTS idx_sentencias_tribunal ON sentencias(tribunal_id);
    CREATE INDEX IF NOT EXISTS idx_sentencias_materia ON sentencias(materia);
    """
    with pg_conn.cursor() as cur:
        cur.execute(query)
    pg_conn.commit()
    print("✅ Tablas PostgreSQL preparadas.")

def migrar_datos():
    """Ejecuta el ETL de SQLite a PostgreSQL en lotes (Chunks)."""
    if not os.path.exists(SQLITE_PATH):
        print(f"❌ No se encuentra la base fuente: {SQLITE_PATH}")
        return

    print("🔌 Conectando a bases de datos...")
    try:
        pg_conn = conectar_postgres()
        crear_tablas_destino(pg_conn)
        
        sqlite_conn = sqlite3.connect(SQLITE_PATH)
        sqlite_conn.row_factory = sqlite3.Row
        sqlite_cursor = sqlite_conn.cursor()
        
        # 1. Contar total para progreso
        sqlite_cursor.execute("SELECT COUNT(*) FROM sentencias") # Adapta al nombre de tu tabla source
        total_rows = sqlite_cursor.fetchone()[0]
        print(f"📦 Total de registros a migrar: {total_rows:,}")
        
        # 2. Migrar en lotes (evita desbordar la RAM para 372k registros)
        sqlite_cursor.execute("SELECT * FROM sentencias") # Adapta las columnas según tu modelo
        
        insert_query = """
            INSERT INTO sentencias (causa_id, rit, juez_id, tribunal_id, materia, fecha_sentencia) 
            VALUES %s 
            ON CONFLICT (causa_id) DO NOTHING;
        """
        
        filas_procesadas = 0
        inicio_tiempo = time.time()
        
        while True:
            # Seleccionar el siguiente bloque de filas
            chunk = sqlite_cursor.fetchmany(CHUNK_SIZE)
            if not chunk:
                break
                
            # Transformar `sqlite3.Row` a Tuplas para `execute_values` de Psycopg2
            # Ajusta el nombre de las keys según las columnas de tu SQLite actual
            valores = [
                (row['causa_id'], row['rit'], row['juez_id'], row['tribunal_id'], row['materia'], row['fecha_sentencia'])
                for row in chunk
            ]
            
            with pg_conn.cursor() as cur:
                execute_values(cur, insert_query, valores)
            pg_conn.commit()
            
            filas_procesadas += len(chunk)
            print(f"🚀 Progreso: {filas_procesadas:,} / {total_rows:,} ({round(filas_procesadas/total_rows*100, 1)}%)")
            
        tiempo_total = time.time() - inicio_tiempo
        print(f"✅ Migración completada en {round(tiempo_total, 2)} segundos.")
        
    except psycopg2.Error as e:
        print(f"❌ Error en PostgreSQL: {e}")
    except sqlite3.Error as e:
        print(f"❌ Error leyendo SQLite: {e}")
    finally:
        if 'pg_conn' in locals():
            pg_conn.close()
        if 'sqlite_conn' in locals():
            sqlite_conn.close()

if __name__ == "__main__":
    print("=== INICIANDO ETL: SQLite a PostgreSQL ===")
    migrar_datos()
