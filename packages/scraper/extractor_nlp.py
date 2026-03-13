"""
extractor_nlp.py — Extrae resultado y monto de las sentencias usando regex.

Lógica de extracción:
  1. Buscar frases de fallo en la parte RESOLUTIVA del texto.
  2. Extraer monto en UTM o pesos si aparece asociado al fallo.
  3. Guardar resultado + confianza en la BD.

Patrones basados en el lenguaje jurídico chileno real observado en los datos.
"""

import re
import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB = os.path.join(BASE_DIR, 'apps', 'nexo-backend', 'causas_judiciales.db')

# =============================================================
# PATRONES DE RESULTADO
# Orden importa: más específico primero
# =============================================================

PATRONES_RESULTADO = [
    # Acoge Parcialmente -- debe ir ANTES de Acoge
    (r'SE ACOGE PARCIALMENTE',           'Acoge Parcialmente', 92),
    (r'ACOGE PARCIALMENTE',              'Acoge Parcialmente', 88),
    (r'acoge.*?parcialmente',            'Acoge Parcialmente', 75),

    # Rechaza
    (r'SE RECHAZA',                      'Rechaza',            92),
    (r'RECHAZA LA DEMANDA',              'Rechaza',            94),
    (r'RECHAZA',                         'Rechaza',            80),
    (r'no ha lugar',                     'Rechaza',            72),
    (r'se desestima',                    'Rechaza',            75),

    # Acoge (simple)
    (r'SE ACOGE',                        'Acoge',              92),
    (r'ACOGE LA DEMANDA',                'Acoge',              94),
    (r'ACOGE LA SOLICITUD',              'Acoge',              90),
    (r'acoge.*?demanda',                 'Acoge',              78),

    # Divorcio -- siempre es "acogido"
    (r'SE PONE T.RMINO POR DIVORCIO',   'Acoge',              95),
    (r'SE DECLARA.{0,60}DIVORCIO',      'Acoge',              90),
    (r'DIVORCIO.{0,30}DECRETADO',       'Acoge',              88),
    (r'QUE SE ACOGE la solicitud de divorcio', 'Acoge',        95),

    # Alimentos fijados (hay pensión = acogio)
    (r'se condena.*?pagar.*?pensi.n',   'Acoge',              80),
    (r'se fija.*?pensi.n.*?alimentos',  'Acoge',              80),
    (r'pagar.*?equivalente a \d',       'Acoge',              75),
]

# =============================================================
# PATRONES DE MONTO EN UTM
# =============================================================

PATRONES_UTM = [
    # Forma: "3.09721 UTM" o "3,09721 UTM" o "6,57322 UTM"
    r'(\d+[.,]\d+)\s*U\.?T\.?M',
    # Forma: "equivalente a 3.09721 Unidades Tributarias"
    r'equivalente.*?(\d+[.,]\d+)\s*Unidades Tributarias Mensuales',
    # Forma: "$350.000" o "$ 350.000" (pesos CLP) — convertir a referencia
    r'\$\s*([\d\.]+)',
]

# =============================================================
# FUNCIONES
# =============================================================

def extraer_zona_resolutiva(texto: str) -> str:
    """
    En los fallos chilenos la parte resolutiva SIEMPRE va al final.
    Usamos dos estrategias:
    1. Buscar un marcador explícito (Se Resuelve, Por estas consideraciones…)
    2. Si no hay marcador, tomar el último 35% del texto.
    """
    if not texto:
        return texto

    marcadores = [
        r'SE RESUELVE[:\s]',
        r'se resuelve[:\s]',
        r'Por estas consideraciones',
        r'por estas consideraciones',
        r'FALLO[:\s]',
        r'SE DECLARA[:\s]',
        r'I\.- QUE SE ACOGE',
        r'I\. QUE SE ACOGE',
        r'I- QUE SE ACOGE',
        r'Que se acoge',
        r'QUE SE ACOGE',
    ]
    for marcador in marcadores:
        match = re.search(marcador, texto, re.IGNORECASE)
        if match:
            return texto[match.start():]

    # Fallback: último 35% del texto (donde siempre está el fallo)
    zona_inicio = int(len(texto) * 0.65)
    return texto[zona_inicio:]


def extraer_resultado(texto: str) -> tuple[str, int]:
    """Devuelve (resultado, confianza)."""
    zona = extraer_zona_resolutiva(texto)

    for patron, resultado, confianza in PATRONES_RESULTADO:
        if re.search(patron, zona, re.IGNORECASE):
            return resultado, confianza

    # Segunda pasada: buscar en todo el texto (menor confianza)
    for patron, resultado, confianza in PATRONES_RESULTADO:
        if re.search(patron, texto, re.IGNORECASE):
            return resultado, max(confianza - 20, 40)

    return 'Indefinido', 0


def extraer_monto_utm(texto: str) -> float | None:
    """Extrae el primer monto en UTM que encuentre."""
    for patron in PATRONES_UTM[:2]:  # Solo los patrones de UTM
        match = re.search(patron, texto, re.IGNORECASE)
        if match:
            valor_str = match.group(1).replace(',', '.').replace(' ', '')
            try:
                return float(valor_str)
            except ValueError:
                pass
    return None


# =============================================================
# PROCESO PRINCIPAL
# =============================================================

def procesar_causas():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur  = conn.cursor()

    cur.execute("SELECT id, rit, materia, texto_sentencia FROM causas WHERE texto_sentencia IS NOT NULL AND texto_sentencia != ''")
    causas = cur.fetchall()

    print(f"Procesando {len(causas)} causas con texto de sentencia...\n")

    conteo = {'Acoge': 0, 'Rechaza': 0, 'Acoge Parcialmente': 0, 'Indefinido': 0}
    con_monto = 0

    for causa in causas:
        texto    = causa['texto_sentencia'] or ''
        resultado, confianza = extraer_resultado(texto)
        monto_utm = extraer_monto_utm(texto)

        cur.execute(
            "UPDATE causas SET resultado=?, monto_fijado_utm=?, confianza_extraccion=? WHERE id=?",
            (resultado, monto_utm, confianza, causa['id'])
        )

        conteo[resultado] = conteo.get(resultado, 0) + 1
        if monto_utm:
            con_monto += 1

    conn.commit()

    print("=" * 50)
    print("  RESULTADOS DE LA EXTRACCION NLP")
    print("=" * 50)
    total = len(causas)
    for resultado, n in sorted(conteo.items(), key=lambda x: -x[1]):
        pct = n / total * 100 if total else 0
        print(f"  {resultado:<25} : {n:>4}  ({pct:.1f}%)")
    print(f"  {'-'*40}")
    print(f"  Con monto UTM detectado          : {con_monto:>4}  ({con_monto/total*100:.1f}%)")
    print(f"  Sin texto / Indefinido           : {conteo.get('Indefinido', 0):>4}")
    print("=" * 50)

    # Muestra algunos ejemplos para validar
    print("\n  MUESTRA DE VALIDACION (5 causas):")
    cur.execute("""
        SELECT c.rit, c.materia, c.resultado, c.monto_fijado_utm, c.confianza_extraccion,
               j.nombre_completo as juez
        FROM causas c
        LEFT JOIN causa_juez cj ON c.id = cj.causa_id
        LEFT JOIN jueces j ON cj.juez_id = j.id
        WHERE c.resultado != 'Indefinido'
        LIMIT 5
    """)
    for row in cur.fetchall():
        print(f"  RIT={row['rit']} | {row['resultado']} (conf={row['confianza_extraccion']}) | UTM={row['monto_fijado_utm']} | {row['juez']}")

    conn.close()


if __name__ == '__main__':
    procesar_causas()
