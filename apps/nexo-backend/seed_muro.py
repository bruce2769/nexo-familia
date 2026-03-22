import os
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta

# Initialize Firebase via the existing credentials format
cred_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
if not cred_json:
    # If not running in Railway, fallback to a local key if it exists
    cred = credentials.Certificate('C:\\Users\\bruce\\.gemini\\antigravity\\scratch\\Nexo Familia 2030\\nexo-platform\\apps\\nexo-backend\\serviceAccountKey.json')
else:
    import json
    cred = credentials.Certificate(json.loads(cred_json))

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

posts = [
    {
        "authorName": "María Isabel",
        "authorRole": "user",
        "content": "¿Alguien sabe cuánto demora en promedio una retención del 10% de la AFP si el demandado no ha pagado la pensión en 6 meses? Ya hice la solicitud en la ventanilla virtual.",
        "createdAt": datetime.now() - timedelta(days=2),
        "likes": 12,
        "comments": [
            {
                "authorName": "Abogada_Nexo",
                "authorRole": "admin",
                "content": "Hola María Isabel. Una vez ingresada la solicitud, el tribunal oficia a la AFP (suele tardar 5-10 días hábiles). Luego la AFP tiene 15 días hábiles para transferir los fondos a la cuenta de ahorro de la libreta. Te recomiendo usar nuestro Radar Judicial para rastrear si el 'Oficio a AFP' ya fue despachado.",
                "createdAt": datetime.now() - timedelta(days=1, hours=12)
            },
            {
                "authorName": "CarlosG",
                "authorRole": "user",
                "content": "A mí me tardó como 3 semanas en total desde la liquidación hasta el pago. ¡Paciencia y revisa la Oficina Judicial Virtual!",
                "createdAt": datetime.now() - timedelta(days=1, hours=8)
            }
        ]
    },
    {
        "authorName": "Alejandro V.",
        "authorRole": "user",
        "content": "Si mi ex pareja y yo llegamos a un acuerdo de visitas mutuo de palabra, ¿es necesario legalizarlo? Siento que estamos bien así pero me da miedo el futuro.",
        "createdAt": datetime.now() - timedelta(days=5),
        "likes": 8,
        "comments": [
            {
                "authorName": "Abogada_Nexo",
                "authorRole": "admin",
                "content": "Alejandro, es altamente recomendable pasar ese acuerdo a un documento legal (transacción o avenimiento) y llevarlo al Tribunal de Familia. Los acuerdos 'de palabra' no son exigibles si el día de mañana la relación empeora. Puedes usar nuestra herramienta de 'Escritos' para redactar el avenimiento de visitas automáticamente.",
                "createdAt": datetime.now() - timedelta(days=4)
            }
        ]
    },
    {
        "authorName": "Camila R.",
        "authorRole": "user",
        "content": "Acabo de generar mi primer escrito para rebaja de pensión alimenticia usando Nexo Familia. Me ahorré casi 60 lucas que me cobraba un abogado solo por redactarlo jajaja. ¿Ahora solo lo subo a la Oficina Judicial Virtual con mi Clave Única?",
        "createdAt": datetime.now() - timedelta(hours=14),
        "likes": 24,
        "comments": [
            {
                "authorName": "Nexo Support",
                "authorRole": "admin",
                "content": "¡Exactamente Camila! Solo asegúrate de subirlo como PDF en la sección 'Ingreso de Escritos' de tu causa usando tu Clave Única. Recuerda que para rebaja temporal o permanente también debes adjuntar el certificado de mediación frustrada.",
                "createdAt": datetime.now() - timedelta(hours=12)
            }
        ]
    }
]

def seed():
    coll_ref = db.collection("muro_posts")
    print("Borrando posts antiguos...")
    for doc in coll_ref.stream():
        doc.reference.delete()
        
    print("Sembrando nuevas discusiones realistas...")
    for p in posts:
        coll_ref.add(p)
    
    print("¡Comunidad poblada con éxito!")

if __name__ == "__main__":
    seed()
