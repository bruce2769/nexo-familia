import requests
import fitz
import io

print("1. Creando PDF de prueba en memoria...")
# Crear un PDF falso de prueba usando PyMuPDF
doc = fitz.open()
page = doc.new_page()
# Insertamos un RUT falso y un RIT para ver si el regex funciona
texto_prueba = "Causa Rol: C-745-2025. En este acto, Juan Perez, RUT 12.345.678-9, solicita rebaja de alimentos."
page.insert_text((50, 50), texto_prueba, fontsize=12)

# Guardar a un stream de bytes en memoria
pdf_bytes = doc.write()
doc.close()

# Iniciar sesion
url = "http://localhost:8000/api/v1/sentencias/subir"

print("\n2. Enviando PDF a la API FastAPI...")
# Archivo en formato multipart/form-data
files = {
    'archivo': ('prueba_colaborativa.pdf', pdf_bytes, 'application/pdf')
}

try:
    response = requests.post(url, files=files)
    print("\n--- RESPUESTA DEL SERVIDOR ---")
    print(f"Status: {response.status_code}")
    print(response.json())
except requests.exceptions.ConnectionError:
    print("ERROR: El servidor FastAPI no parece estar corriendo. Ejecuta: uvicorn main:app &")
