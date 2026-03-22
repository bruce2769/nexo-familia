from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import fitz  # PyMuPDF
import re
import sqlite3
import os
import json
import hashlib
import openai
import time
from collections import defaultdict
from datetime import date

from loguru import logger
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ─── Firebase Admin SDK ────────────────────────────────────────────────────────
try:
    import firebase_admin
    from firebase_admin import credentials, auth as firebase_auth, firestore

    _sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")
    if _sa_json and not firebase_admin._apps:
        try:
            # ── Parser robusto: Railway a veces almacena \n como \\n en la private_key ──
            # Intento 1: parse directo
            cred_dict = None
            for attempt, json_str in enumerate([
                _sa_json,                         # 1. Tal como está
                _sa_json.replace('\\n', '\n'),     # 2. Convertir \\n → \n (fix Railway)
                _sa_json.replace('\\n', '\n').replace("\\'", "'"),  # 3. Fix extra escapes
            ]):
                try:
                    cred_dict = json.loads(json_str, strict=False)
                    if attempt > 0:
                        logger.info(f"✅ Firebase JSON parseado en intento {attempt + 1} (fix \\n aplicado).")
                    break
                except json.JSONDecodeError:
                    continue

            if cred_dict is None:
                raise ValueError("No se pudo parsear FIREBASE_SERVICE_ACCOUNT_JSON después de 3 intentos.")

            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            FIREBASE_ADMIN_OK = True
            logger.info("✅ Firebase Admin SDK inicializado correctamente.")
        except Exception as e:
            logger.warning(f"⚠️ Error inicializando Firebase: {e}")
            FIREBASE_ADMIN_OK = False
            db = None
    else:
        if firebase_admin._apps:
            db = firestore.client()
            FIREBASE_ADMIN_OK = True
        else:
            FIREBASE_ADMIN_OK = False
            db = None
except ImportError:
    FIREBASE_ADMIN_OK = False
    db = None


# ─── Validación de variables de entorno críticas ───────────────────────────────
REQUIRED_ENV = ["ALLOWED_ORIGINS", "OPENAI_API_KEY"]
missing_env = [k for k in REQUIRED_ENV if not os.environ.get(k)]
if missing_env:
    logger.error(f"❌ Variables de entorno faltantes: {', '.join(missing_env)}")
    import sys
    sys.exit(1)

_bearer_scheme = HTTPBearer(auto_error=False)

async def verify_firebase_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme)
):
    if not FIREBASE_ADMIN_OK:
        return None
    if credentials is None:
        raise HTTPException(status_code=401, detail="Token de autenticación requerido.")
    try:
        decoded = firebase_auth.verify_id_token(credentials.credentials)
        return decoded
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token inválido: {str(e)[:80]}")

# ─── Configuración OpenAI ──────────────────────────────────────────────────────
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL   = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

# ─── Límite diario de uso de IA por usuario ────────────────────────────────────
MAX_IA_REQUESTS_PER_DAY = int(os.environ.get("MAX_IA_REQUESTS_PER_DAY", "20"))

# ─── Rate Limiter simple ───────────────────────────────────────────────────────
RATE_LIMITS = defaultdict(list)
MAX_REQUESTS_PER_MINUTE = 20

def check_rate_limit(client_ip: str):
    now = time.time()
    RATE_LIMITS[client_ip] = [t for t in RATE_LIMITS[client_ip] if now - t < 60]
    if len(RATE_LIMITS[client_ip]) >= MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a minute.")
    RATE_LIMITS[client_ip].append(now)

# ─── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Nexo Familia API",
    description="Motor backend para Legal Analytics — powered by OpenAI gpt-4o-mini.",
    version="2.0.0"
)

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ──────────────────────────────────────────────────────────────────────
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": "2.0.0", "ia": "openai", "model": OPENAI_MODEL}

# ─── Helpers de base de datos SQLite ──────────────────────────────────────────
def get_db_connection():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'causas_judiciales.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

# ─── Utilidades: Privacidad y Caché MD5 ───────────────────────────────────────
def pseudo_anonimizar(texto: str) -> str:
    patron_rut = r'\b\d{1,2}\.?\d{3}\.?\d{3}[-][0-9kK]\b'
    return re.sub(patron_rut, "[RUT_OCULTO]", texto)

def _generar_hash_md5(texto: str) -> str:
    texto_normalizado = re.sub(r'\s+', ' ', texto.strip().lower())
    return hashlib.md5(texto_normalizado.encode('utf-8')).hexdigest()

def _buscar_en_cache(hash_key: str):
    if not FIREBASE_ADMIN_OK or db is None:
        return None
    try:
        doc = db.collection("cache_ia").document(hash_key).get()
        if doc.exists:
            logger.info(f"[Cache] ✅ HIT {hash_key[:8]}... → $0")
            return doc.to_dict().get("respuesta")
    except Exception as e:
        logger.warning(f"[Cache] ⚠️ Error: {e}")
    return None

def _guardar_en_cache(hash_key: str, texto_preview: str, respuesta: dict):
    if not FIREBASE_ADMIN_OK or db is None:
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

def _verificar_limite_diario(uid: str) -> bool:
    if not FIREBASE_ADMIN_OK or db is None or not uid:
        return True
    try:
        hoy = date.today().isoformat()
        doc_ref = db.collection("usuarios").document(uid).collection("ia_usage").document(hoy)
        doc = doc_ref.get()
        if doc.exists:
            conteo = doc.to_dict().get("requests", 0)
            if conteo >= MAX_IA_REQUESTS_PER_DAY:
                return False
            doc_ref.update({"requests": conteo + 1})
        else:
            doc_ref.set({"requests": 1, "fecha": hoy})
    except Exception as e:
        logger.warning(f"[RateLimit] Error: {e}")
    return True

# ─── Motor IA: OpenAI gpt-4o-mini (ÚNICO motor) ───────────────────────────────
def llamar_openai(prompt: str, system: str = "", temperatura: float = 0.2) -> str:
    """
    Llama a OpenAI gpt-4o-mini con parámetros optimizados.
    Texto recortado a 800 chars, max_tokens=200, temperatura=0.2.
    Estimado: ~$0.0005 por request → $10 ≈ 20.000 consultas.
    """
    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=messages,
        temperature=temperatura,
        max_tokens=200,
    )
    logger.info(f"[OpenAI] ✅ {response.usage.total_tokens} tokens usados.")
    return response.choices[0].message.content or ""

# ─── Modelos Pydantic ──────────────────────────────────────────────────────────
class CopilotoRequest(BaseModel):
    mensaje: str
    historial: list = []

class ScannerRequest(BaseModel):
    texto: str

# ─── Endpoint Copiloto legal ───────────────────────────────────────────────────
@app.post("/api/v1/copiloto", tags=["IA"])
async def copiloto_legal(req: CopilotoRequest):
    """Copiloto legal IA — powered by OpenAI gpt-4o-mini."""
    system_prompt = """Eres NEXO, un asistente legal especializado en Derecho de Familia chileno.

Tu conocimiento incluye:
- Ley N°14.908 (Alimentos)
- Código Civil (cuidado personal, relación directa y regular)
- Ley N°19.968 (Tribunales de Familia)
- Ley N°20.066 (Violencia Intrafamiliar)
- Mediación familiar obligatoria en Chile

IMPORTANTE:
- Habla en español, de manera clara y empática.
- Siempre aclara que tus respuestas son orientativas, no reemplazan a un abogado.
- Sé conciso: máximo 3 párrafos."""

    historial_texto = ""
    for msg in req.historial[-6:]:
        rol = "Usuario" if msg.get("role") == "user" else "NEXO"
        historial_texto += f"{rol}: {msg.get('content', '')}\n"

    prompt = f"{historial_texto}Usuario: {req.mensaje}\nNEXO:"

    try:
        respuesta = llamar_openai(prompt, system=system_prompt, temperatura=0.4)
        return {"respuesta": respuesta.strip(), "modelo": OPENAI_MODEL}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Servicio de IA no disponible: {str(e)[:100]}")

# ─── Lógica Core del Scanner ────────────────────────────────────────────────
def _procesar_texto_scanner(texto: str, uid: str | None = None) -> dict:
    texto = texto.strip()
    if len(texto) < 20:
        raise HTTPException(status_code=400, detail="El texto o PDF es demasiado corto/ilegible.")

    # 💡 Recorte a 800 chars (–60% tokens)
    texto_seguro = pseudo_anonimizar(texto[:800])

    # 🔐 Límite diario por usuario
    if uid and not _verificar_limite_diario(uid):
        raise HTTPException(status_code=429, detail=f"Límite de {MAX_IA_REQUESTS_PER_DAY} análisis/día alcanzado.")

    # 🔥 CACHÉ MD5
    hash_key = _generar_hash_md5(texto_seguro)
    cached = _buscar_en_cache(hash_key)
    if cached is not None:
        cached["fuente"] = "cache"
        return cached

    system_prompt = (
        "Eres un abogado experto en Derecho de Familia chileno. "
        "Analiza resoluciones judiciales y explícalas claramente. "
        "Responde SOLO con JSON válido, sin texto adicional."
    )
    prompt = f"""Analiza esta resolución judicial chilena. Devuelve JSON:
{{"tipo": "tipo corto", "resumen": "2 oraciones", "puntosClave": [{{"label": "...", "value": "...", "icon": "emoji"}}], "accionRecomendada": "acción concreta", "riesgo": "bajo|medio|alto"}}

Resolución:
{texto_seguro}"""

    try:
        respuesta_raw = llamar_openai(prompt, system=system_prompt, temperatura=0.2)
        json_match = re.search(r'\{[\s\S]*\}', respuesta_raw)
        if not json_match:
            raise ValueError("La IA no devolvió JSON válido")

        analisis = json.loads(json_match.group(0))
        analisis["fuente"] = OPENAI_MODEL

        # 💾 Guardar en caché
        _guardar_en_cache(hash_key, texto_seguro, analisis)

        # 📝 Historial Firestore (solo metadata)
        if FIREBASE_ADMIN_OK and db is not None and uid:
            try:
                db.collection("usuarios").document(uid).collection("scanner_historial").document().set({
                    "resumen": analisis.get("resumen", ""),
                    "riesgo":  analisis.get("riesgo", "medio"),
                    "tipo":    analisis.get("tipo", "Desconocido"),
                    "timestamp": firestore.SERVER_TIMESTAMP,
                    "fuente": analisis["fuente"]
                })
            except Exception as e:
                logger.warning(f"⚠️ Error guardando historial: {e}")

        return analisis

    except Exception as e:
        logger.error(f"❌ [Scanner] Error: {e}")
        return {
            "tipo": "Resolución Judicial",
            "resumen": "El sistema de IA no pudo completar el análisis. Inténtelo nuevamente.",
            "puntosClave": [{"label": "Estado", "value": "Análisis no disponible", "icon": "⚠️"}],
            "accionRecomendada": "Vuelve a intentar o contacta soporte.",
            "riesgo": "medio",
            "fuente": "fallback",
            "error": str(e)[:100]
        }

# ─── Endpoint Scanner (Texto) ──────────────────────────────────────────────────
@app.post("/api/v1/scanner/analizar", tags=["IA"])
@limiter.limit("20/minute")
async def analizar_resolucion(request: Request, req: ScannerRequest, _user=Depends(verify_firebase_token)):
    """
    Analiza una resolución judicial con OpenAI gpt-4o-mini a partir de texto.
    🔥 Caché MD5 en Firestore activo.
    """
    uid = _user.get("uid") if _user else None
    return _procesar_texto_scanner(req.texto, uid)

# ─── Endpoint Scanner (Archivo PDF) ───────────────────────────────────────────
@app.post("/api/v1/scanner/subir", tags=["IA"])
@limiter.limit("20/minute")
async def subir_resolucion_scanner(request: Request, archivo: UploadFile = File(...), _user=Depends(verify_firebase_token)):
    """
    Analiza una resolución judicial subiendo un archivo PDF.
    Extrae texto y utiliza exactamente la misma lógica de IA y caché del scanner.
    """
    if not archivo.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF.")
    try:
        contenido = await archivo.read()
        doc = fitz.Document(stream=contenido, filetype="pdf")
        texto_crudo = "".join(p.get_text() for p in doc)
        
        uid = _user.get("uid") if _user else None
        return _procesar_texto_scanner(texto_crudo, uid)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [Scanner PDF] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error procesando el PDF: {e}")

# ─── Subir sentencia colaborativa (PDF) ───────────────────────────────────────
@app.post("/api/v1/sentencias/subir", tags=["Colaborativo"])
async def subir_sentencia_colaborativa(archivo: UploadFile = File(...), _user=Depends(verify_firebase_token)):
    if not archivo.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF.")
    try:
        contenido = await archivo.read()
        doc = fitz.Document(stream=contenido, filetype="pdf")
        texto_crudo = "".join(p.get_text() for p in doc)
        if len(texto_crudo) < 10:
            raise HTTPException(status_code=422, detail="PDF sin texto extraíble (escaneo sin OCR).")

        texto_seguro = pseudo_anonimizar(texto_crudo[:800])

        system_prompt = "Eres un analista de datos judicial. Extrae información clave del fallo. Responde SOLO con JSON."
        prompt = f"""Lee esta sentencia y extrae:
{{"rit": "RIT o 'Desconocido'", "resultado": "Acoge|Rechaza|Acoge Parcialmente|Inadmisible", "monto_utm": 0, "resumen_anonimizado": "máximo 2 líneas sin nombres"}}

Sentencia:
{texto_seguro}"""

        respuesta = llamar_openai(prompt, system=system_prompt, temperatura=0.1)
        json_match = re.search(r'\{[\s\S]*?\}', respuesta)
        analisis = json.loads(json_match.group(0)) if json_match else {"rit": "DESCONOCIDO", "resultado": "Desconocido", "monto_utm": 0, "resumen_anonimizado": "Sin datos"}

        return {"mensaje": "Documento procesado.", "datos_extraidos": analisis, "preview": texto_seguro[:200]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando el documento: {e}")

# ─── Endpoints Analytics (SQLite) ─────────────────────────────────────────────
@app.get("/api/v1/analytics/velocidad", tags=["Analytics"])
def obtener_velocidad_tribunales():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.nombre AS tribunal,
               ROUND(AVG(JULIANDAY(c.fecha_sentencia) - JULIANDAY(SUBSTR(c.rit, -4) || '-01-01')) / 30.0, 1) AS meses
        FROM causas c JOIN tribunales t ON c.tribunal_id = t.id
        WHERE c.fecha_sentencia IS NOT NULL AND c.rit IS NOT NULL
        GROUP BY t.id HAVING COUNT(c.id) > 50
        ORDER BY meses ASC LIMIT 10
    """)
    resultados = [dict(row) for row in cursor.fetchall()]
    conn.close()
    for r in resultados:
        r["tribunal"] = r["tribunal"].replace("Juzgado de Familia ", "").replace("Juzgado de Letras y Garantía ", "").strip()
    return resultados

@app.get("/api/v1/analytics/estacionalidad", tags=["Analytics"])
def obtener_estacionalidad():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT strftime('%m', substr(fecha_sentencia, 1, 10)) as mes_num, COUNT(*) as sentencias
        FROM causas WHERE fecha_sentencia IS NOT NULL
        GROUP BY mes_num ORDER BY mes_num
    """)
    filas = cursor.fetchall()
    conn.close()
    meses = {'01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun','07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic'}
    return [{"mes": meses.get(f["mes_num"], "?"), "sentencias": f["sentencias"]} for f in filas if f["mes_num"] in meses]

@app.get("/api/v1/analytics/kpis", tags=["Analytics"])
def obtener_kpis_principales():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.nombre, ROUND(AVG(JULIANDAY(c.fecha_sentencia) - JULIANDAY(SUBSTR(c.rit, -4) || '-01-01')) / 30.0, 1) AS meses
        FROM causas c JOIN tribunales t ON c.tribunal_id = t.id
        WHERE c.fecha_sentencia IS NOT NULL AND c.rit IS NOT NULL
        GROUP BY t.id HAVING COUNT(c.id) > 100 ORDER BY meses ASC LIMIT 1
    """)
    res_velocidad = cursor.fetchone()
    cursor.execute("""
        SELECT j.nombre_completo, COUNT(cj.causa_id) as total_fallos
        FROM jueces j JOIN causa_juez cj ON j.id = cj.juez_id
        GROUP BY j.id ORDER BY total_fallos DESC LIMIT 1
    """)
    res_carga = cursor.fetchone()
    cursor.execute("""
        SELECT strftime('%m', substr(fecha_sentencia, 1, 10)) as mes_num, COUNT(*) as total
        FROM causas WHERE fecha_sentencia IS NOT NULL
        GROUP BY mes_num ORDER BY total DESC LIMIT 1
    """)
    res_estacional = cursor.fetchone()
    conn.close()
    meses_map = {'01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio','07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre'}
    return {
        "velocidad": {"valor": f"{res_velocidad['meses']} meses" if res_velocidad else "N/A", "subtitulo": res_velocidad['nombre'].replace("Juzgado de Familia ", "") if res_velocidad else "Sin datos"},
        "carga":     {"valor": f"{res_carga['total_fallos']} fallos" if res_carga else "N/A", "subtitulo": res_carga['nombre_completo'] if res_carga else "Sin datos"},
        "estacional": {"valor": f"{res_estacional['total']} fallos" if res_estacional else "N/A", "subtitulo": f"Mes de {meses_map.get(res_estacional['mes_num'], '?')}" if res_estacional else "Sin datos"}
    }

@app.get("/api/v1/analytics/materias", tags=["Analytics"])
def obtener_distribucion_materias():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT materia as nombre, COUNT(*) as valor
        FROM causas WHERE materia IS NOT NULL AND materia != ''
        GROUP BY materia ORDER BY valor DESC LIMIT 5
    """)
    resultados = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return resultados
