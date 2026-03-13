"""
analytics_volumetrico.py

Calcula las métricas core de la Fase 2.1 de Nexo Ultra 2030:
1. Velocidad de Tribunales
2. Carga Laboral de Jueces
3. Estacionalidad
Operando directamente sobre la metadata pública estructurada.
"""
import sqlite3
import datetime
from collections import defaultdict
import json
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'causas_judiciales.db')

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def calcular_velocidad_tribunales():
    """
    Calcula el tiempo promedio estimado que le toma a un tribunal
    dictar sentencia desde el año de ingreso de la causa.
    """
    print("\n" + "="*50)
    print(" VELOCIDAD DE TRIBUNALES (Muestra Top 10)")
    print("="*50)
    
    conn = get_connection()
    cur = conn.cursor()
    
    # Extraemos RIT (para el año de ingreso), fecha sentencia y tribunal
    cur.execute('''
        SELECT c.rit, c.fecha_sentencia, c.materia, t.nombre as tribunal
        FROM causas c
        JOIN tribunales t ON c.tribunal_id = t.id
        WHERE c.fecha_sentencia IS NOT NULL
    ''')
    causas = cur.fetchall()
    
    stats_tribunales = defaultdict(lambda: {'total_causas': 0, 'suma_dias_tramitacion': 0})
    
    for causa in causas:
        rit = causa['rit']
        # El RIT tiene formato C-241-2026. Extraemos el 2026.
        partes = rit.split('-')
        if len(partes) < 3:
            continue
            
        try:
            anio_ingreso = int(partes[2])
            fecha_sentencia = datetime.datetime.strptime(causa['fecha_sentencia'], "%Y-%m-%dT%H:%M:%SZ")
            anio_sentencia = fecha_sentencia.year
            
            # Cálculo aproximado: Si entró en 2025 y se falló en abr 2026 -> 1 año + meses.
            # Convertiremos todo a meses netos de diferencia para estandarizar.
            # Asumimos que la causa entró el 1 de Enero del año correspondiente como baseline
            # O mejor: solo miramos la diferencia de años para algo mas estable con metadata pública.
            
            # Enfoque conservador usando datetime
            inicio_estimado = datetime.datetime(anio_ingreso, 1, 1)
            dias_tramitacion = (fecha_sentencia - inicio_estimado).days
            
            if dias_tramitacion < 0:
                continue # Evitar corrupciones de datos donde la sentencia es anterior al año del RIT
                
            tribunal = causa['tribunal']
            stats_tribunales[tribunal]['total_causas'] += 1
            stats_tribunales[tribunal]['suma_dias_tramitacion'] += dias_tramitacion
            
        except ValueError:
            pass # Ignorar fechas mal formateadas
    
    # Calcular promedios
    resultados = []
    for tribunal, stat in stats_tribunales.items():
        if stat['total_causas'] > 5: # Filtro de representatividad
            promedio_dias = stat['suma_dias_tramitacion'] / stat['total_causas']
            promedio_meses = promedio_dias / 30.4
            resultados.append((tribunal, promedio_meses, stat['total_causas']))
            
    # Ordenar por los más rápidos
    resultados.sort(key=lambda x: x[1])
    
    print("\nTop 5 Tribunales Más Rápidos (Promedio estimado en meses):")
    for r in resultados[:5]:
        print(f"  {r[1]:.1f} meses | {r[0]} | ({r[2]} sentencias analizadas)")
        
    print("\nTop 5 Tribunales Más Lentos (Promedio estimado en meses):")
    for r in resultados[-5:]:
         print(f"  {r[1]:.1f} meses | {r[0]} | ({r[2]} sentencias analizadas)")
         
    conn.close()

def calcular_carga_jueces():
    """
    Determina qué jueces dictan más sentencias y en qué materias.
    """
    print("\n" + "="*50)
    print(" CARGA LABORAL DE JUECES (Muestra Top 10)")
    print("="*50)
    
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute('''
        SELECT j.nombre_completo as juez, COUNT(c.id) as total_sentencias
        FROM jueces j
        JOIN causa_juez cj ON j.id = cj.juez_id
        JOIN causas c ON cj.causa_id = c.id
        GROUP BY j.nombre_completo
        ORDER BY total_sentencias DESC
        LIMIT 10
    ''')
    
    jueces = cur.fetchall()
    for j in jueces:
        print(f"  {j['total_sentencias']} sentencias | Juez: {j['juez']}")
        
    conn.close()

def calcular_estacionalidad():
    """
    Muestra la distribución de sentencias a lo largo de los meses.
    """
    print("\n" + "="*50)
    print(" ESTACIONALIDAD DE SENTENCIAS (Mensual)")
    print("="*50)
    
    conn = get_connection()
    cur = conn.cursor()
    
    # SQLite strftime para extraer el mes
    cur.execute('''
        SELECT strftime('%m', fecha_sentencia) as mes, COUNT(id) as total
        FROM causas
        WHERE fecha_sentencia IS NOT NULL
        GROUP BY mes
        ORDER BY mes
    ''')
    
    distribucion = cur.fetchall()
    
    # Nombres bonitos para meses
    nombres_meses = {"01":"Ene", "02":"Feb", "03":"Mar", "04":"Abr", "05":"May", "06":"Jun", 
                     "07":"Jul", "08":"Ago", "09":"Sep", "10":"Oct", "11":"Nov", "12":"Dic"}
                     
    max_vol = max([d['total'] for d in distribucion]) if distribucion else 1
    
    print("\nDistribución de dictación de sentencias por mes (Historico Absoluto):")
    for d in distribucion:
        mes_num = d['mes']
        if not mes_num: continue
        
        mes_nombre = nombres_meses.get(mes_num, mes_num)
        total = d['total']
        
        # Barra visual ASCII
        barra = "#" * int((total / max_vol) * 30)
        print(f"  {mes_nombre} | {total:>6} causas | {barra}")

    conn.close()

if __name__ == "__main__":
    calcular_velocidad_tribunales()
    calcular_carga_jueces()
    calcular_estacionalidad()
