# routers/causas.py
# ─── Endpoints: Procesamiento de causas judiciales ───────────────────────────
import re
import base64
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from loguru import logger

from core.security import verify_firebase_token
from core.credits import _verificar_limite_diario
from core.openai_client import llamar_openai, llamar_openai_vision, pseudo_anonimizar, _generar_hash_md5
from core.config import FIREBASE_ADMIN_OK, db

try:
    import fitz
except ImportError:
    fitz = None

try:
    from firebase_admin import firestore
except ImportError:
    firestore = None

router = APIRouter(prefix="/api/v1", tags=["Causas"])


async def _procesar_causa_unificada(texto_seguro: str, origen: str, uid: str) -> dict:
    import hashlib
    md5_hash = hashlib.md5(texto_seguro.encode('utf-8')).hexdigest()

    # Check caché en Firestore
    if db:
        try:
            docs = (
                db.collection('causas')
                .where('userId', '==', uid)
                .where('hashMD5', '==', md5_hash)
                .limit(1)
                .get()
            )
            if docs:
                logger.info(f"⚡ [Causas] Cache hit MD5 para user {uid}")
                return docs[0].to_dict()
        except Exception as e:
            logger.error(f"⚠️ Error leyendo caché: {e}")

    if not _verificar_limite_diario(uid):
        return {"error": "Límite de análisis de IA diario alcanzado. Intenta mañana."}

    system_prompt = (
        "Eres un software extractor de datos judiciales de Chile. "
        "Retorna SOLO JSON válido. Si no encuentras un dato, usa null."
    )
    prompt = f"""Analiza este texto legal chileno y extrae la información estructurada.
Responde SOLO en JSON con esta estructura exacta:
{{
"rit": "",
"ruc": "",
"tribunal": "",
"juez": "",
"tipo_causa": "",
"estado_causa": "",
"fecha": "",
"partes": {{
  "demandante": "",
  "demandado": ""
}},
"resumen_simple": ""
}}

Texto:
{texto_seguro}"""

    respuesta_raw = llamar_openai(prompt, system=system_prompt, temperatura=0.1, max_tokens=1500)

    try:
        json_match  = re.search(r'\{[\s\S]*\}', respuesta_raw)
        if not json_match:
            raise ValueError("No se encontró JSON válido")
        causa_datos = json.loads(json_match.group(0))
    except Exception as e:
        logger.error(f"Error parseando JSON de causa: {e}")
        causa_datos = {
            "rit": None, "ruc": None, "tribunal": None, "juez": None,
            "tipo_causa": None, "estado_causa": None, "fecha": None,
            "partes": {"demandante": None, "demandado": None},
            "resumen_simple": "Error estructurando datos",
        }

    partes = causa_datos.get("partes")
    if not isinstance(partes, dict):
        partes = {"demandante": causa_datos.get("demandante"), "demandado": causa_datos.get("demandado")}

    doc_final = {
        "userId":       uid,
        "rit":          causa_datos.get("rit"),
        "ruc":          causa_datos.get("ruc"),
        "tribunal":     causa_datos.get("tribunal"),
        "juez":         causa_datos.get("juez"),
        "tipoCausa":    causa_datos.get("tipo_causa"),
        "estadoCausa":  causa_datos.get("estado_causa"),
        "fecha":        causa_datos.get("fecha"),
        "partes":       partes,
        "resumenIA":    causa_datos.get("resumen_simple"),
        "hashMD5":      md5_hash,
        "createdAt":    datetime.now(timezone.utc).isoformat(),
        "origen":       origen,
    }

    if db:
        try:
            db.collection('causas').add(doc_final)
            logger.info("✅ Causa guardada en Firebase")
        except Exception as e:
            logger.error(f"Error guardando causa: {e}")

    return doc_final


@router.post("/causas/procesar")
async def procesar_causa_endpoint(
    request: Request,
    archivo: UploadFile = File(None),
    texto:   str        = Form(None),
    usuario: dict       = Depends(verify_firebase_token),
):
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario no autenticado.")

    uid = str(usuario.get("uid", ""))
    texto_extraido = ""
    origen_doc     = "texto"

    if archivo and archivo.filename:
        contenido       = await archivo.read()
        filename_lower  = archivo.filename.lower()
        if filename_lower.endswith('.pdf'):
            if fitz is None:
                raise HTTPException(status_code=501, detail="PyMuPDF no instalado.")
            origen_doc = "pdf"
            try:
                doc = fitz.open(stream=contenido, filetype="pdf")
                for pagina in doc:
                    texto_extraido += pagina.get_text("text") + "\n"
                doc.close()
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error leyendo PDF: {e}")
        elif filename_lower.endswith(('.png', '.jpg', '.jpeg', '.webp')):
            origen_doc = "imagen"
            try:
                b64_img        = base64.b64encode(contenido).decode('utf-8')
                texto_extraido = llamar_openai_vision(b64_img)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error OCR: {e}")
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado (PDF, PNG, JPG, WEBP).")
    elif texto:
        texto_extraido = texto
    else:
        raise HTTPException(status_code=400, detail="Debes enviar un archivo o texto.")

    texto_limpio = texto_extraido.strip()
    if len(texto_limpio) < 20:
        raise HTTPException(status_code=400, detail="El material no contiene suficiente texto legible.")

    texto_seguro = re.sub(r'[^\w\s.,;:()\-/\'"áéíóúÁÉÍÓÚñÑ]', '', texto_limpio[:25000])
    return await _procesar_causa_unificada(texto_seguro, origen_doc, uid)


@router.get("/causas/mis-causas")
def mis_causas_endpoint(request: Request, usuario: dict = Depends(verify_firebase_token)):
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario no autenticado.")
    if not db:
        raise HTTPException(status_code=500, detail="Base de datos no disponible.")

    uid = str(usuario.get("uid", ""))
    try:
        docs       = db.collection("causas").where('userId', '==', uid).get()
        resultados = [doc.to_dict() for doc in docs]
        resultados.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        return resultados
    except Exception as e:
        logger.error(f"Error obteniendo causas: {e}")
        return []


@router.post("/sentencias/subir")
async def subir_sentencia_colaborativa(archivo: UploadFile = File(...), _user=Depends(verify_firebase_token)):
    if fitz is None:
        raise HTTPException(status_code=501, detail="PyMuPDF no instalado.")
    if not archivo.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF.")
    try:
        contenido   = await archivo.read()
        doc         = fitz.Document(stream=contenido, filetype="pdf")
        texto_crudo = "".join(p.get_text() for p in doc)
        if len(texto_crudo) < 10:
            raise HTTPException(status_code=422, detail="PDF sin texto extraíble.")

        texto_seguro = pseudo_anonimizar(texto_crudo[:800])
        system_prompt = "Eres un analista de datos judicial. Extrae información clave del fallo. Responde SOLO con JSON."
        prompt        = f"""Lee esta sentencia y extrae:
{{"rit": "RIT o 'Desconocido'", "resultado": "Acoge|Rechaza|Acoge Parcialmente|Inadmisible", "monto_utm": 0, "resumen_anonimizado": "máximo 2 líneas sin nombres"}}

Sentencia:
{texto_seguro}"""

        respuesta   = llamar_openai(prompt, system=system_prompt, temperatura=0.1)
        json_match  = re.search(r'\{[\s\S]*?\}', respuesta)
        analisis    = (json.loads(json_match.group(0)) if json_match
                       else {"rit": "DESCONOCIDO", "resultado": "Desconocido", "monto_utm": 0, "resumen_anonimizado": "Sin datos"})

        return {"mensaje": "Documento procesado.", "datos_extraidos": analisis, "preview": texto_seguro[:200]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando el documento: {e}")
