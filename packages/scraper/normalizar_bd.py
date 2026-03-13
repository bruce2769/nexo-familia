"""
normalizar_bd.py — Limpieza y normalización de nombres de tribunales y materias.

Problema: el PJUD usa nombres inconsistentes para el mismo tribunal:
  "Jgdo. L. de Molina"
  "Juzgado de Letras de Molina"
  "Juzgado de Letras y Garantía de Molina"
  → Todos deberían ser: "Juzgado de Letras de Molina"

Este script:
  1. Lee todos los tribunales actuales de la BD
  2. Aplica reglas de normalización con regex
  3. Fusiona duplicados (cambia tribunal_id en causas)
  4. Reporta cuántos se consolidaron
"""

import re
import sqlite3
from collections import defaultdict

DB = 'causas_judiciales.db'

# ============================================================
# DICCIONARIO DE ABREVIACIONES → FORMA COMPLETA
# ============================================================

ABREVIACIONES = {
    r'\bJgdo\b\.?':         'Juzgado',
    r'\bJdo\b\.?':          'Juzgado',
    r'\bJddo\b\.?':         'Juzgado',
    r'\bL\.\s*y\s*G\b\.?':  'de Letras y Garantía',
    r'\bL\b\.':             'de Letras',
    r'\bG\b\.':             'de Garantía',
    r'\bFam\b\.?':          'de Familia',
    r'\bCiv\b\.?':          'Civil',
    r'\bStgo\b\.?':         'Santiago',
    r'\bSgo\b\.?':          'Santiago',
    r'\bStgo\.\s+Ctro\b':   'Santiago Centro',
    r'\bCtr[oa]\b\.?':      'Centro',
    r'\bPte\b\.?':          'Poniente',
    r'\bOte\b\.?':          'Oriente',
    r'\bNte\b\.?':          'Norte',
    r'\bSur\b':             'Sur',
}

# Números ordinales escritos con letras o cifras
ORDINALES = {
    'Primer': '1°',  '1er': '1°',  '1ro': '1°',
    'Segundo': '2°', '2do': '2°',
    'Tercer': '3°',  '3ro': '3°',  '3er': '3°',
    'Cuarto': '4°',  '4to': '4°',
    'Quinto': '5°',  '5to': '5°',
    'Sexto': '6°',   '6to': '6°',
    'Séptimo': '7°', 'Septimo': '7°',
    'Octavo': '8°',  'Noveno': '9°', 'Décimo': '10°', 'Decimo': '10°',
}


def normalizar_nombre(nombre: str) -> str:
    if not nombre:
        return nombre

    texto = nombre.strip()

    # 1. Expandir ordinales textuales
    for palabra, numero in ORDINALES.items():
        texto = re.sub(rf'\b{palabra}\b', numero, texto, flags=re.IGNORECASE)

    # 2. Expandir abreviaciones
    for patron, expansion in ABREVIACIONES.items():
        texto = re.sub(patron, expansion, texto, flags=re.IGNORECASE)

    # 3. Limpiar espacios múltiples
    texto = re.sub(r'\s+', ' ', texto).strip()

    # 4. Capitalizar correctamente (Title Case con excepciones)
    palabras_minuscula = {'de', 'del', 'la', 'las', 'los', 'y', 'e', 'en'}
    palabras = texto.split()
    resultado = []
    for i, p in enumerate(palabras):
        if i == 0 or p.lower() not in palabras_minuscula:
            resultado.append(p.capitalize() if not p[0].isdigit() else p)
        else:
            resultado.append(p.lower())
    texto = ' '.join(resultado)

    return texto


def normalizar_tribunales():
    conn = sqlite3.connect(DB)
    cur  = conn.cursor()

    cur.execute("SELECT id, nombre FROM tribunales ORDER BY id")
    tribunales = cur.fetchall()
    total_original = len(tribunales)

    print(f"Tribunales antes de normalizar: {total_original}")
    print("\nEjemplos de cambios:")

    # Mapa: nombre_normalizado -> id_canónico (el primero encontrado)
    mapa_canonical = {}   # nombre_normalizado -> id_canonico
    cambios_nombre = {}   # id_original -> nombre_normalizado

    for tid, nombre in tribunales:
        normalizado = normalizar_nombre(nombre)
        cambios_nombre[tid] = normalizado
        if normalizado not in mapa_canonical:
            mapa_canonical[normalizado] = tid
        if normalizado != nombre:
            print(f"  '{nombre}'\n    -> '{normalizado}'")

    # Fusionar duplicados: actualizar causas que apuntan a IDs secundarios
    fusiones = 0
    for tid, nombre in tribunales:
        normalizado = cambios_nombre[tid]
        id_canonico  = mapa_canonical[normalizado]

        if tid != id_canonico:
            # Reasignar las causas al tribunal canónico
            cur.execute(
                "UPDATE causas SET tribunal_id=? WHERE tribunal_id=?",
                (id_canonico, tid)
            )
            cur.execute("DELETE FROM tribunales WHERE id=?", (tid,))
            fusiones += 1

        else:
            # Actualizar el nombre al normalizado
            cur.execute(
                "UPDATE tribunales SET nombre=? WHERE id=?",
                (normalizado, tid)
            )

    conn.commit()

    cur.execute("SELECT COUNT(*) FROM tribunales")
    total_final = cur.fetchone()[0]

    print(f"\nResultado:")
    print(f"  Tribunales antes : {total_original}")
    print(f"  Tribunales despues: {total_final}")
    print(f"  Fusionados       : {fusiones}")
    conn.close()


def normalizar_materias():
    """Limpia y estandariza los nombres de materias."""
    conn = sqlite3.connect(DB)
    cur  = conn.cursor()

    # Las materias vienen como "VULNERACION DE DERECHOS" (mayusculas)
    # Convertir a Title Case
    cur.execute("SELECT id, materia FROM causas WHERE materia IS NOT NULL")
    causas = cur.fetchall()

    actualizadas = 0
    for cid, materia in causas:
        if not materia:
            continue
        # Limpiar duplicados: "DIVORCIO POR CESE DE CONVIVENCIA, DIVORCIO POR CESE DE CONVIVENCIA"
        partes = [p.strip() for p in materia.split(',')]
        partes_unicas = list(dict.fromkeys(partes))   # eliminar duplicados preservando orden
        materia_limpia = ', '.join(partes_unicas)
        # Title Case
        materia_limpia = materia_limpia.title()

        if materia_limpia != materia:
            cur.execute("UPDATE causas SET materia=? WHERE id=?", (materia_limpia, cid))
            actualizadas += 1

    conn.commit()
    print(f"\nMaterias normalizadas: {actualizadas} causas actualizadas")
    conn.close()


if __name__ == '__main__':
    print("=" * 55)
    print("  NORMALIZACION DE DATOS")
    print("=" * 55)
    normalizar_tribunales()
    normalizar_materias()
    print("\nNormalizacion completa.")
