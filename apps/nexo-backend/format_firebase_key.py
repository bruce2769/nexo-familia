"""
format_firebase_key.py — Convierte serviceAccountKey.json a una sola línea
===========================================================================
Railway requiere que FIREBASE_SERVICE_ACCOUNT_JSON esté en una sola línea
sin saltos de línea reales. Este script lo hace automáticamente.

USO:
  1. Descargar serviceAccountKey.json desde Firebase Console
     (Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada)
  2. Ejecutar: python format_firebase_key.py
  3. Copiar el resultado al panel de Railway como FIREBASE_SERVICE_ACCOUNT_JSON
"""

import json
import sys
import os

KEY_FILE = "serviceAccountKey.json"

if not os.path.exists(KEY_FILE):
    print(f"❌ No se encuentra '{KEY_FILE}'")
    print(f"   Descárgalo desde Firebase Console → Configuración → Cuentas de servicio")
    sys.exit(1)

try:
    with open(KEY_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Serializar sin pretty-print → una sola línea
    one_line = json.dumps(data, ensure_ascii=False, separators=(',', ':'))

    print("\n" + "=" * 70)
    print("✅ FIREBASE_SERVICE_ACCOUNT_JSON (copia esta línea completa a Railway):")
    print("=" * 70)
    print(one_line)
    print("=" * 70)
    print(f"\n📋 Longitud: {len(one_line)} caracteres")
    print(f"📧 Service account: {data.get('client_email', 'No encontrado')}")
    print(f"🏗️  Proyecto: {data.get('project_id', 'No encontrado')}")
    print("\n⚠️  NUNCA subas serviceAccountKey.json a Git")

    # Guardar también como archivo de texto para facilitar el copy-paste
    out_file = "firebase_key_railway.txt"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(one_line)
    print(f"💾 También guardado en '{out_file}' para facilitar el copy-paste")
    print(f"   (Elimina este archivo cuando termines → ⚠️ datos sensibles)")

except json.JSONDecodeError as e:
    print(f"❌ Error leyendo JSON: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error inesperado: {e}")
    sys.exit(1)
