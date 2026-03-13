import sqlite3

def auditar_fechas():
    print("--- INICIANDO DIAGNÓSTICO DE FECHAS EN CAUSAS_JUDICIALES.DB ---")
    conn = sqlite3.connect('causas_judiciales.db')
    cursor = conn.cursor()
    
    # 1. Conteo general
    cursor.execute("SELECT COUNT(*) FROM causas")
    total_causas = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM causas WHERE fecha_sentencia IS NOT NULL")
    total_con_fecha = cursor.fetchone()[0]
    
    print(f"Total causas: {total_causas}")
    print(f"Total con fecha_sentencia NOT NULL: {total_con_fecha}")
    print(f"Causas sin fecha: {total_causas - total_con_fecha}")
    
    # 2. Revisión de formatos detectados
    cursor.execute("""
        SELECT substr(fecha_sentencia, 1, 4) as anio, COUNT(*) 
        FROM causas 
        WHERE fecha_sentencia IS NOT NULL 
        GROUP BY anio 
        ORDER BY COUNT(*) DESC 
        LIMIT 5
    """)
    print("\nTop 5 años encontrados en las fechas:")
    for row in cursor.fetchall():
        print(f"  Año '{row[0]}': {row[1]} registros")
        
    # 3. Agrupación por mes usando un substring crudo (asumiendo YYYY-MM-DD...)
    cursor.execute("""
        SELECT substr(fecha_sentencia, 6, 2) as mes_num, COUNT(*) 
        FROM causas 
        WHERE fecha_sentencia IS NOT NULL 
        GROUP BY mes_num 
        ORDER BY mes_num
    """)
    print("\nDistribución por mes extraído (substr(fecha, 6, 2)):")
    meses_vacios = []
    meses_esperados = [f"{i:02d}" for i in range(1, 13)]
    
    meses_encontrados = {}
    for row in cursor.fetchall():
        print(f"  Mes '{row[0]}': {row[1]} registros")
        meses_encontrados[row[0]] = row[1]
        
    for m in meses_esperados:
        if m not in meses_encontrados:
            meses_vacios.append(m)
            
    if meses_vacios:
        print(f"\n¡ALERTA! Absolutamente ningún registro para los meses: {', '.join(meses_vacios)}")
        
    # 4. Muestra aleatoria en un mes "vacío" o anómalo
    # Vamos a buscar si hay formatos de fecha basura o inesperados (que no empiecen con '20')
    cursor.execute("""
        SELECT fecha_sentencia 
        FROM causas 
        WHERE fecha_sentencia IS NOT NULL AND fecha_sentencia NOT LIKE '20%'
        LIMIT 10
    """)
    fechas_raras = cursor.fetchall()
    if fechas_raras:
        print("\nEjemplos de fechas con formato inesperado (no empiezan con '20'):")
        for f in fechas_raras:
            print(f"  '{f[0]}'")
            
    # 5. Mapeo de nulls vs mes
    conn.close()
    print("--- FIN DEL DIAGNÓSTICO ---")

if __name__ == "__main__":
    auditar_fechas()
