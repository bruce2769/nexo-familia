# routers/scanner.py
# ─── Endpoint: Escáner IA de resoluciones judiciales ──────────────────────────
import re
import json
import base64
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from loguru import logger

from core.security import verify_firebase_token
from core.credits import _verificar_limite_diario
from core.openai_client import (
    llamar_openai,
    llamar_openai_vision,
    pseudo_anonimizar,
    _generar_hash_md5,
    _buscar_en_cache,
    _guardar_en_cache,
)
from core.config import OPENAI_MODEL, FIREBASE_ADMIN_OK, db

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    from firebase_admin import firestore
except ImportError:
    firestore = None

router = APIRouter(prefix="/api/v1", tags=["Scanner"])


class ScannerRequest(BaseModel):
    texto: str


def _procesar_texto_scanner(texto: str, uid: str | None = None) -> dict:
    texto = texto.strip()
    if len(texto) < 20:
        raise HTTPException(status_code=400, detail="El texto o PDF es demasiado corto/ilegible.")

    texto_seguro = pseudo_anonimizar(texto[:800])

    if uid and not _verificar_limite_diario(uid):
        raise HTTPException(status_code=429, detail=f"Límite de análisis diario alcanzado.")

    hash_key = _generar_hash_md5(texto_seguro)
    cached   = _buscar_en_cache(hash_key)
    if cached is not None:
        cached["fuente"] = "cache"
        return cached

    system_prompt = (
        "Eres un guía práctico experto en Derecho de Familia chileno. "
        "Explica resoluciones a personas comunes. "
        "PROHIBIDO usar lenguaje jurídico complejo. "
        "Responde SOLO con JSON válido con estas 5 claves: "
        "'resumen_simple', 'significado', 'pasos', 'lugar', 'consejo'."
    )
    prompt = f"""Analiza esta resolución judicial chilena. Devuelve JSON así:
{{
  "resumen_simple": "1-2 líneas máximo, muy claro",
  "significado": "Qué significa en palabras simples",
  "pasos": [
    {{"paso": "1", "desc": "Acción concreta"}}
  ],
  "lugar": "Dónde hacerlo (tribunal, comuna)",
  "consejo": "Un consejo práctico"
}}

Resolución:
{texto_seguro}"""

    try:
        respuesta_raw = llamar_openai(prompt, system=system_prompt, temperatura=0.2)
        json_match    = re.search(r'\{[\s\S]*\}', respuesta_raw)
        if not json_match:
            raise ValueError("La IA no devolvió JSON válido")

        analisis          = json.loads(json_match.group(0))
        analisis["fuente"] = OPENAI_MODEL

        _guardar_en_cache(hash_key, texto_seguro, analisis)

        if FIREBASE_ADMIN_OK and db is not None and uid and firestore is not None:
            try:
                db.collection("users").document(uid).collection("scanner_historial").add({
                    "resumen":   analisis.get("resumen_simple", ""),
                    "tipo":      analisis.get("tipo", "Desconocido"),
                    "timestamp": firestore.SERVER_TIMESTAMP,
                    "fuente":    analisis["fuente"],
                })
            except Exception as e:
                logger.warning(f"⚠️ Error guardando historial scanner: {e}")

        return analisis

    except Exception as e:
        logger.error(f"❌ [Scanner] Error: {e}")
        return {
            "resumen_simple": "El sistema de IA no pudo completar el análisis.",
            "significado":    "Ocurrió un error temporal al intentar leer tu documento.",
            "pasos":          [{"paso": "1", "desc": "Vuelve a intentarlo en unos minutos"}],
            "lugar":          "Misma aplicación",
            "consejo":        "Si el problema persiste, intenta subir una imagen o PDF más claro.",
            "fuente":         "fallback",
            "error":          str(e)[:100],
        }


@router.post("/scanner/analizar")
async def analizar_resolucion(req: ScannerRequest, _user=Depends(verify_firebase_token)):
    """Analiza una resolución judicial a partir de texto."""
    uid = _user.get("uid") if _user else None
    return _procesar_texto_scanner(req.texto, uid)


@router.post("/scanner/subir")
async def subir_resolucion_scanner(archivo: UploadFile = File(...), _user=Depends(verify_firebase_token)):
    """Analiza una resolución judicial subiendo un PDF."""
    if fitz is None:
        raise HTTPException(status_code=501, detail="PyMuPDF no instalado en el servidor.")
    if not archivo.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF.")
    try:
        contenido   = await archivo.read()
        doc         = fitz.Document(stream=contenido, filetype="pdf")
        texto_crudo = "".join(p.get_text() for p in doc)
        uid         = _user.get("uid") if _user else None
        return _procesar_texto_scanner(texto_crudo, uid)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [Scanner PDF] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error procesando el PDF: {e}")
