# core/openai_client.py
# ─── Motor IA: llamadas a OpenAI con timeout y fallback ───────────────────────
import re
import hashlib
from loguru import logger
from core.config import OPENAI_API_KEY, OPENAI_MODEL, FIREBASE_ADMIN_OK, db

try:
    import openai
except ImportError:
    openai = None

try:
    from firebase_admin import firestore
except ImportError:
    firestore = None


# ─── Utilidades de privacidad ──────────────────────────────────────────────────
def pseudo_anonimizar(texto: str) -> str:
    patron_rut = r'\b\d{1,2}\.?\d{3}\.?\d{3}[-][0-9kK]\b'
    return re.sub(patron_rut, "[RUT_OCULTO]", texto)


def validar_rut_chileno(rut: str) -> bool:
    if not rut:
        return False
    rut_limpio = rut.upper().replace("-", "").replace(".", "").strip()
    if len(rut_limpio) < 2:
        return False
    cuerpo, dv = rut_limpio[:-1], rut_limpio[-1]
    if not cuerpo.isdigit():
        return False
    suma = 0
    multiplo = 2
    for c in reversed(cuerpo):
        suma += int(c) * multiplo
        multiplo = multiplo + 1 if multiplo < 7 else 2
    esperado = 11 - (suma % 11)
    if esperado == 11:
        dv_esp = '0'
    elif esperado == 10:
        dv_esp = 'K'
    else:
        dv_esp = str(esperado)
    return dv == dv_esp


# ─── Caché MD5 en Firestore ───────────────────────────────────────────────────
def _generar_hash_md5(texto: str) -> str:
    texto_normalizado = re.sub(r'\s+', ' ', texto.strip().lower())
    return hashlib.md5(texto_normalizado.encode('utf-8')).hexdigest()


def _buscar_en_cache(hash_key: str):
    if not FIREBASE_ADMIN_OK or db is None:
        return None
    try:
        doc = db.collection("cache_ia").document(hash_key).get()
        if doc.exists:
            logger.info(f"[Cache] ✅ HIT {hash_key[:8]}...")
            return doc.to_dict().get("respuesta")
    except Exception as e:
        logger.warning(f"[Cache] ⚠️ Error: {e}")
    return None


def _guardar_en_cache(hash_key: str, texto_preview: str, respuesta: dict):
    if not FIREBASE_ADMIN_OK or db is None or firestore is None:
        return
    try:
        db.collection("cache_ia").document(hash_key).set({
            "hash": hash_key,
            "texto_preview": texto_preview[:100],
            "respuesta": respuesta,
            "timestamp": firestore.SERVER_TIMESTAMP,
        })
    except Exception as e:
        logger.warning(f"[Cache] ⚠️ Error guardando: {e}")


# ─── Llamadas a OpenAI ─────────────────────────────────────────────────────────
def llamar_openai(
    prompt: str,
    system: str = "",
    temperatura: float = 0.2,
    max_tokens: int = 200,
) -> str:
    """
    Llama a OpenAI gpt-4o-mini con timeout de 25s y mensajes de fallback claros.
    """
    if not OPENAI_API_KEY:
        return "El sistema está en modo mantenimiento (Sin API Key). Intenta más tarde."
    if openai is None:
        return "Librería OpenAI no instalada en el servidor."

    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            temperature=temperatura,
            max_tokens=max_tokens,
            timeout=25.0,
        )
        logger.info(f"[OpenAI] ✅ {response.usage.total_tokens} tokens usados.")
        return response.choices[0].message.content or ""
    except openai.APITimeoutError:
        logger.error("[OpenAI] ⏱️ Timeout!")
        return "El sistema está muy ocupado. Por favor, reintenta en un momento."
    except Exception as e:
        logger.error(f"[OpenAI] Error: {e}")
        return "Lo lamento, el servicio de IA está experimentando alta demanda. Reintenta en unos segundos."


def llamar_openai_vision(base64_image: str) -> str:
    """Llama a vision de gpt-4o-mini para OCR de documentos."""
    if not OPENAI_API_KEY or openai is None:
        return ""
    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Transcribe exactamente todo el texto de la imagen. Es un documento legal. No añadas encabezados ni comentarios, solo el texto.",
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                    },
                ],
            }],
            max_tokens=2000,
            temperature=0.1,
        )
        logger.info(f"[OpenAI Vision] ✅ {response.usage.total_tokens} tokens.")
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"[OpenAI Vision] Error: {e}")
        return ""
