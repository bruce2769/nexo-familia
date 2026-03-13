import sqlite3
from thefuzz import process

def normalizar_tribunales():
    print("Iniciando motor de normalización de Tribunales...")
    
    # 1. Conexión directa a SQLite para máxima velocidad
    conn = sqlite3.connect('causas_judiciales.db')
    cursor = conn.cursor()
    
    # Extraer todos los tribunales actuales
    cursor.execute("SELECT id, nombre FROM tribunales")
    tribunales_raw = cursor.fetchall()
    
    if not tribunales_raw:
        print("No hay tribunales en la base de datos.")
        return

    nombres_lista = [t[1] for t in tribunales_raw]
    diccionario_ids = {t[1]: t[0] for t in tribunales_raw}
    
    tribunales_procesados = set()
    mapeo_reemplazos = [] # Lista de tuplas: (id_viejo, id_nuevo_canonico)
    tribunales_a_eliminar = []

    print(f"Analizando {len(nombres_lista)} nombres de tribunales únicos...")

    # 2. Lógica de Fuzzy Matching
    for nombre_actual in nombres_lista:
        if nombre_actual in tribunales_procesados:
            continue
            
        # Buscar similitudes mayores al 88% (ajustable)
        coincidencias = process.extract(nombre_actual, nombres_lista, limit=10)
        similares = [c[0] for c in coincidencias if c[1] >= 88]
        
        if len(similares) > 1:
            # Elegimos el nombre más largo como el "Oficial" (suele ser el más descriptivo)
            nombre_canonico = max(similares, key=len)
            id_canonico = diccionario_ids[nombre_canonico]
            
            for sim in similares:
                tribunales_procesados.add(sim)
                if sim != nombre_canonico:
                    id_viejo = diccionario_ids[sim]
                    mapeo_reemplazos.append((id_viejo, id_canonico))
                    tribunales_a_eliminar.append(id_viejo)
                    print(f"  [Unificando] '{sim}' -> '{nombre_canonico}'")
        else:
            tribunales_procesados.add(nombre_actual)

    # 3. Aplicar los cambios en la base de datos
    if mapeo_reemplazos:
        print(f"\nActualizando causas: reasignando {len(mapeo_reemplazos)} IDs de tribunales duplicados...")
        for id_viejo, id_nuevo in mapeo_reemplazos:
            cursor.execute("UPDATE causas SET tribunal_id = ? WHERE tribunal_id = ?", (id_nuevo, id_viejo))
        
        print("Limpiando tabla de tribunales...")
        for id_viejo in tribunales_a_eliminar:
            cursor.execute("DELETE FROM tribunales WHERE id = ?", (id_viejo,))
            
        conn.commit()
        print("¡Normalización completada con éxito!")
    else:
        print("\nLa base de datos ya está limpia. No se encontraron duplicados evidentes.")

    conn.close()

if __name__ == "__main__":
    normalizar_tribunales()
