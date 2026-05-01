# routers/analytics.py
# ─── Endpoints: Analytics sobre causas judiciales (SQLite / PostgreSQL) ─────────
from fastapi import APIRouter, HTTPException
from loguru import logger
from core.database import get_db_connection, fetchall_as_dicts, fetchone_as_dict, USE_POSTGRES

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])

MESES_MAP = {
    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
}
MESES_LARGO = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
}


def _strftime_mes(col: str) -> str:
    """Expresión SQL de extracción de mes compatible con SQLite y PostgreSQL."""
    if USE_POSTGRES:
        return f"TO_CHAR({col}::date, 'MM')"
    return f"strftime('%m', substr({col}, 1, 10))"


def _julianday_diff(col_end: str, col_start: str) -> str:
    """Diferencia en días compatible con SQLite y PostgreSQL."""
    if USE_POSTGRES:
        return f"EXTRACT(EPOCH FROM ({col_end}::date - {col_start}::date)) / 86400.0"
    return f"(JULIANDAY({col_end}) - JULIANDAY({col_start}))"


@router.get("/velocidad")
def obtener_velocidad_tribunales():
    """Top 10 tribunales más rápidos en resolver causas."""
    try:
        conn   = get_db_connection()
        cursor = conn.cursor()
        diff   = _julianday_diff("c.fecha_sentencia", f"SUBSTR(c.rit, -4) || '-01-01'")
        cursor.execute(f"""
            SELECT t.nombre AS tribunal,
                   ROUND(AVG({diff}) / 30.0, 1) AS meses
            FROM causas c JOIN tribunales t ON c.tribunal_id = t.id
            WHERE c.fecha_sentencia IS NOT NULL AND c.rit IS NOT NULL
            GROUP BY t.id HAVING COUNT(c.id) > 50
            ORDER BY meses ASC LIMIT 10
        """)
        resultados = fetchall_as_dicts(cursor)
        conn.close()
        for r in resultados:
            r["tribunal"] = (
                r["tribunal"]
                .replace("Juzgado de Familia ", "")
                .replace("Juzgado de Letras y Garantía ", "")
                .strip()
            )
        return resultados
    except Exception as e:
        logger.error(f"[Analytics/velocidad] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/estacionalidad")
def obtener_estacionalidad():
    """Distribución mensual de sentencias."""
    try:
        conn   = get_db_connection()
        cursor = conn.cursor()
        mes_expr = _strftime_mes("fecha_sentencia")
        cursor.execute(f"""
            SELECT {mes_expr} as mes_num, COUNT(*) as sentencias
            FROM causas WHERE fecha_sentencia IS NOT NULL
            GROUP BY mes_num ORDER BY mes_num
        """)
        filas = fetchall_as_dicts(cursor)
        conn.close()
        return [
            {"mes": MESES_MAP.get(f["mes_num"], "?"), "sentencias": f["sentencias"]}
            for f in filas if f["mes_num"] in MESES_MAP
        ]
    except Exception as e:
        logger.error(f"[Analytics/estacionalidad] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kpis")
def obtener_kpis_principales():
    """KPIs clave: tribunal más rápido, juez con más carga, mes pico."""
    try:
        conn   = get_db_connection()
        cursor = conn.cursor()

        diff = _julianday_diff("c.fecha_sentencia", f"SUBSTR(c.rit, -4) || '-01-01'")
        cursor.execute(f"""
            SELECT t.nombre, ROUND(AVG({diff}) / 30.0, 1) AS meses
            FROM causas c JOIN tribunales t ON c.tribunal_id = t.id
            WHERE c.fecha_sentencia IS NOT NULL AND c.rit IS NOT NULL
            GROUP BY t.id HAVING COUNT(c.id) > 100 ORDER BY meses ASC LIMIT 1
        """)
        res_velocidad = fetchone_as_dict(cursor)

        cursor.execute("""
            SELECT j.nombre_completo, COUNT(cj.causa_id) as total_fallos
            FROM jueces j JOIN causa_juez cj ON j.id = cj.juez_id
            GROUP BY j.id ORDER BY total_fallos DESC LIMIT 1
        """)
        res_carga = fetchone_as_dict(cursor)

        mes_expr = _strftime_mes("fecha_sentencia")
        cursor.execute(f"""
            SELECT {mes_expr} as mes_num, COUNT(*) as total
            FROM causas WHERE fecha_sentencia IS NOT NULL
            GROUP BY mes_num ORDER BY total DESC LIMIT 1
        """)
        res_estacional = fetchone_as_dict(cursor)
        conn.close()

        return {
            "velocidad": {
                "valor": f"{res_velocidad['meses']} meses" if res_velocidad else "N/A",
                "subtitulo": res_velocidad['nombre'].replace("Juzgado de Familia ", "") if res_velocidad else "Sin datos",
            },
            "carga": {
                "valor": f"{res_carga['total_fallos']} fallos" if res_carga else "N/A",
                "subtitulo": res_carga['nombre_completo'] if res_carga else "Sin datos",
            },
            "estacional": {
                "valor": f"{res_estacional['total']} fallos" if res_estacional else "N/A",
                "subtitulo": f"Mes de {MESES_LARGO.get(res_estacional['mes_num'], '?')}" if res_estacional else "Sin datos",
            },
        }
    except Exception as e:
        logger.error(f"[Analytics/kpis] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/materias")
def obtener_distribucion_materias():
    """Top 5 materias más frecuentes."""
    try:
        conn   = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT materia as nombre, COUNT(*) as valor
            FROM causas WHERE materia IS NOT NULL AND materia != ''
            GROUP BY materia ORDER BY valor DESC LIMIT 5
        """)
        resultados = fetchall_as_dicts(cursor)
        conn.close()
        return resultados
    except Exception as e:
        logger.error(f"[Analytics/materias] {e}")
        raise HTTPException(status_code=500, detail=str(e))
