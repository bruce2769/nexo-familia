from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import fitz  # PyMuPDF
import re
import sqlite3
import os
import json
import httpx

import time
from collections import defaultdict

from loguru import logger
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ─── Firebase Admin SDK (para verificar tokens JWT) ───────────────────────
# Se inicializa solo si existe la variable de entorno FIREBASE_SERVICE_ACCOUNT_JSON
# En dev local sin esa variable, la validación se omite (modo permisivo local)
try:
    import firebase_admin
    from firebase_admin import credentials, auth as firebase_auth, firestore

    _sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")
    if _sa_json and not firebase_admin._apps:
        try:
            import json
            # Intento 1: Carga directa
            try:
                cred_dict = json.loads(_sa_json, strict=False)
            except json.JSONDecodeError:
                # Intento 2: Railway a veces escapa las barras \n nativas o inyecta basura
                fixed_json = _sa_json.replace('\\\\n', '\\n').replace('\n', '\\n')
                # Si falla por "Invalid \escape", eliminamos backslashes inválidos
                fixed_json = fixed_json.replace('\\', '\\\\')
                # Restauramos los saltos de línea correctos para JSON
                fixed_json = fixed_json.replace('\\\\n', '\\n')
                cred_dict = json.loads(fixed_json, strict=False)
                
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            FIREBASE_ADMIN_OK = True
        except Exception as e:
            print(f"❌ Error parseando FIREBASE_SERVICE_ACCOUNT_JSON: {e}")
            import sys
            sys.exit(1)
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

# ─── Validación de variables de entorno críticas ──────────────────────────────
REQUIRED_ENV = ["ALLOWED_ORIGINS"]
missing_env = [k for k in REQUIRED_ENV if not os.environ.get(k)]
if missing_env:
    print(f"❌ Variables de entorno faltantes en Python backend: {', '.join(missing_env)}")
    print("📋 Copia .env.example como .env y rellena los valores.")
    import sys
    sys.exit(1)

_bearer_scheme = HTTPBearer(auto_error=False)

async def verify_firebase_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme)
):
    """
    Verifica el token JWT de Firebase en el header Authorization.
    Si FIREBASE_ADMIN_OK es False (dev sin credenciales), pasa sin validar.
    """
    if not FIREBASE_ADMIN_OK:
        return None  # Dev mode: sin validación
    if credentials is None:
        raise HTTPException(status_code=401, detail="Token de autenticación requerido.")
    try:
        decoded = firebase_auth.verify_id_token(credentials.credentials)
        return decoded
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token inválido: {str(e)[:80]}")

# ─── Configuración de Ollama ────────────────────────────────────────────────
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1:latest")

# --- Simple Rate Limiter ---
RATE_LIMITS = defaultdict(list)
MAX_REQUESTS_PER_MINUTE = 20

def check_rate_limit(client_ip: str):
    now = time.time()
    # Limpiar entradas antiguas
    RATE_LIMITS[client_ip] = [t for t in RATE_LIMITS[client_ip] if now - t < 60]
    if len(RATE_LIMITS[client_ip]) >= MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a minute.")
    RATE_LIMITS[client_ip].append(now)

# Inicializamos la API
app = FastAPI(
    title="Nexo Ultra 2030 API",
    description="Motor backend para Legal Analytics y recepción colaborativa de fallos.",
    version="1.0.0"
)

# ─── Configuración de Rate Limiting Global (SlowAPI) ───────────
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/api/v1/health/ollama", tags=["IA"])
async def check_ollama_health():
    """Verifica si Ollama está disponible y respondiendo."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{OLLAMA_URL}/api/tags")
            if resp.status_code == 200:
                return {"status": "online", "model": OLLAMA_MODEL}
            return {"status": "error", "code": resp.status_code}
    except Exception as e:
        return {"status": "offline", "error": str(e)}

# --- 1. CONFIGURACIÓN CORS ---
# En producción: ALLOWED_ORIGINS="http://localhost:5173,https://nexo-familia.vercel.app"
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Health check general (para el frontend) ─────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """Endpoint de salud general — usado por el frontend para verificar conexión."""
    return {"status": "ok", "version": "1.0.0"}

def get_db_connection():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'causas_judiciales.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

# --- 2. ENDPOINTS DE ANALYTICS (MOCK) ---

@app.get("/api/v1/analytics/velocidad", tags=["Analytics"])
def obtener_velocidad_tribunales():
    """Calcula el tiempo promedio de resolución por tribunal."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT 
            t.nombre AS tribunal, 
            ROUND(AVG(JULIANDAY(c.fecha_sentencia) - JULIANDAY(SUBSTR(c.rit, -4) || '-01-01')) / 30.0, 1) AS meses
        FROM causas c
        JOIN tribunales t ON c.tribunal_id = t.id
        WHERE c.fecha_sentencia IS NOT NULL 
          AND c.rit IS NOT NULL
        GROUP BY t.id
        HAVING COUNT(c.id) > 50
        ORDER BY meses ASC
        LIMIT 10
    """
    cursor.execute(query)
    resultados = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    for res in resultados:
        res["tribunal"] = res["tribunal"].replace("Juzgado de Familia ", "").replace("Juzgado de Letras y Garantía ", "").strip()
        
    return resultados

@app.get("/api/v1/analytics/estacionalidad", tags=["Analytics"])
def obtener_estacionalidad():
    """Agrupa el volumen de sentencias por mes del año."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Algunos formatos de fecha en pandas/json traen ISO 8601 (T...Z). substr para asegurar que strftime lo lea bien si es necesario,
    # pero strftime suele funcionar. Usamos substr(fecha_sentencia,1,10) por si acaso.
    query = """
        SELECT 
            strftime('%m', substr(fecha_sentencia, 1, 10)) as mes_num,
            COUNT(*) as sentencias
        FROM causas
        WHERE fecha_sentencia IS NOT NULL
        GROUP BY mes_num
        ORDER BY mes_num
    """
    cursor.execute(query)
    filas = cursor.fetchall()
    conn.close()
    
    meses_map = {
        '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
        '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
    }
    
    resultados = []
    for fila in filas:
        mes_str = fila['mes_num']
        if mes_str and mes_str in meses_map:
            resultados.append({
                "mes": meses_map[mes_str],
                "sentencias": fila['sentencias']
            })
            
    return resultados

@app.get("/api/v1/analytics/kpis", tags=["Analytics"])
def obtener_kpis_principales():
    """Ejecuta 3 sub-consultas ultra rápidas para obtener los récords absolutos."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT t.nombre, ROUND(AVG(JULIANDAY(c.fecha_sentencia) - JULIANDAY(SUBSTR(c.rit, -4) || '-01-01')) / 30.0, 1) AS meses
        FROM causas c JOIN tribunales t ON c.tribunal_id = t.id
        WHERE c.fecha_sentencia IS NOT NULL AND c.rit IS NOT NULL
        GROUP BY t.id HAVING COUNT(c.id) > 100
        ORDER BY meses ASC LIMIT 1
    """)
    res_velocidad = cursor.fetchone()
    
    cursor.execute("""
        SELECT j.nombre_completo, COUNT(cj.causa_id) as total_fallos
        FROM jueces j
        JOIN causa_juez cj ON j.id = cj.juez_id
        GROUP BY j.id
        ORDER BY total_fallos DESC LIMIT 1
    """)
    res_carga = cursor.fetchone()
    
    cursor.execute("""
        SELECT strftime('%m', substr(fecha_sentencia, 1, 10)) as mes_num, COUNT(*) as total
        FROM causas
        WHERE fecha_sentencia IS NOT NULL
        GROUP BY mes_num
        ORDER BY total DESC LIMIT 1
    """)
    res_estacional = cursor.fetchone()
    
    conn.close()
    
    meses_map = {'01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'}
    mes_nombre = meses_map.get(res_estacional['mes_num'], "Desconocido") if res_estacional and res_estacional['mes_num'] else "Desconocido"
    
    return {
        "velocidad": {
            "valor": f"{res_velocidad['meses']} meses" if res_velocidad else "N/A",
            "subtitulo": res_velocidad['nombre'].replace("Juzgado de Familia ", "") if res_velocidad else "Sin datos"
        },
        "carga": {
            "valor": f"{res_carga['total_fallos']} fallos" if res_carga else "N/A",
            "subtitulo": res_carga['nombre_completo'] if res_carga else "Sin datos"
        },
        "estacional": {
            "valor": f"{res_estacional['total']} fallos" if res_estacional else "N/A",
            "subtitulo": f"Mes de {mes_nombre}"
        }
    }

@app.get("/api/v1/analytics/materias", tags=["Analytics"])
def obtener_distribucion_materias():
    """Devuelve el Top 5 de materias más litigadas."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Agrupamos por materia y sacamos las 5 principales
    query = """
        SELECT materia as nombre, COUNT(*) as valor
        FROM causas
        WHERE materia IS NOT NULL AND materia != ''
        GROUP BY materia
        ORDER BY valor DESC
        LIMIT 5
    """
    cursor.execute(query)
    resultados = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return resultados

# --- FUNCIONES AUXILIARES (PIPELINE NLP) ---

def extraer_texto_pdf(contenido_pdf: bytes) -> str:
    """Extrae texto de un PDF en memoria usando PyMuPDF."""
    texto_completo = ""
    try:
        # Abrimos el PDF desde los bytes en memoria (sin guardar en disco)
        doc = fitz.Document(stream=contenido_pdf, filetype="pdf")
        for pagina in doc:
            texto_completo += pagina.get_text()
        return texto_completo
    except Exception as e:
        raise ValueError(f"Error al leer el PDF: {e}")

def pseudo_anonimizar(texto: str) -> str:
    """Oculta RUTs para proteger datos sensibles antes de tocar el LLM."""
    # Regex básico para detectar RUTs chilenos (ej. 12.345.678-9 o 12345678-K)
    patron_rut = r'\b\d{1,2}\.?\d{3}\.?\d{3}[-][0-9kK]\b'
    texto_limpio = re.sub(patron_rut, "[RUT_OCULTO]", texto)
    
    # Aquí en el futuro se pueden agregar modelos NER (Spacy) para ocultar nombres propios
    return texto_limpio

def llamar_ollama(prompt: str, system: str = "", temperatura: float = 0.3, max_retries: int = 2) -> str:
    """
    Llama a Ollama local via HTTP y retorna el texto generado.
    Integra sistema Timeout de 10s y Retry automático para alta disponibilidad.
    """
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": temperatura}
    }
    if system:
        payload["system"] = system

    for intento in range(max_retries + 1):
        try:
            logger.info(f"[Ollama] Solicitud al modelo {OLLAMA_MODEL} (Intento {intento + 1}/{max_retries + 1})...")
            response = httpx.post(
                f"{OLLAMA_URL}/api/generate",
                json=payload,
                timeout=10.0  # Timeout agresivo para fail-fast y retry
            )
            response.raise_for_status()
            logger.success(f"[Ollama] Respuesta generada exitosamente en intento {intento + 1}.")
            return response.json().get("response", "")
        except httpx.TimeoutException:
            logger.warning(f"⚠️ [Ollama] Timeout (10s) excedido en intento {intento + 1}.")
            if intento == max_retries:
                logger.error("❌ Timeout definitivo al contactar con Ollama. Agotados todos los retries.")
                raise RuntimeError("Timeout al contactar con Ollama después de varios intentos.")
            time.sleep(1)
        except httpx.ConnectError:
            logger.error(f"❌ [Ollama] No se pudo conectar a Ollama en {OLLAMA_URL} (intento {intento + 1}).")
            if intento == max_retries:
                raise RuntimeError(f"No se pudo conectar a Ollama en {OLLAMA_URL}. ¿Está corriendo 'ollama serve'?")
            time.sleep(2)
        except Exception as e:
            logger.error(f"❌ [Ollama] Error inesperado en llamada: {e}")
            if intento == max_retries:
                raise RuntimeError(f"Error llamando a Ollama: {e}")
            time.sleep(1)


def clasificar_con_llm(texto_seguro: str) -> dict:
    """
    Envía el texto pre-anonimizado a Ollama (llama3.1) para clasificación legal.
    Retorna un diccionario con los datos extraídos del fallo judicial.
    """
    system_prompt = (
        "Eres un abogado y analista de datos experto en el sistema judicial chileno (Tribunales de Familia). "
        "Tu tarea es analizar sentencias judiciales y extraer información clave. "
        "PRIVACIDAD: Nunca uses nombres propios de personas en el resumen. "
        "Usa siempre [Demandante], [Demandado], o [Menor]."
    )

    prompt = f"""Lee la siguiente sentencia judicial y extrae los datos clave.

DEVUELVE ÚNICAMENTE un objeto JSON válido con esta estructura exacta (sin texto extra antes o después):
{{
  "rit": "El RIT de la causa, ej: C-123-2024. Si no está claro pon 'Desconocido'",
  "resultado": "Clasificar el fallo. SOLO una de estas opciones: Acoge | Rechaza | Acoge Parcialmente | Inadmisible | No Aplica",
  "monto_utm": 0,
  "resumen_anonimizado": "Resumen máximo de 3 líneas del caso, sin nombres propios"
}}

Texto de la sentencia:
{texto_seguro[:4000]}"""

    try:
        texto_respuesta = llamar_ollama(prompt, system=system_prompt, temperatura=0.1)

        # Extraer JSON de la respuesta (el LLM puede agregar texto antes/después)
        json_match = re.search(r'\{[\s\S]*?\}', texto_respuesta)
        if not json_match:
            raise ValueError("Ollama no devolvió JSON válido")

        datos = json.loads(json_match.group(0))
        datos["confianza"] = 0.88  # Confianza local (ligeramente menor que API cloud)
        return datos

    except Exception as e:
        print(f"[Ollama] Error: {e}")
        # Fallback: extracción por regex si Ollama falla
        rit_match = re.search(r'[CMPT]-\d+-\d{4}', texto_seguro, re.IGNORECASE)
        return {
            "rit": rit_match.group(0).upper() if rit_match else "DESCONOCIDO",
            "resultado": "Desconocido",
            "monto_utm": 0,
            "resumen_anonimizado": f"No se pudo analizar con IA. Error: {str(e)[:100]}",
            "confianza": 0.0
        }


# ─── Modelos Pydantic ────────────────────────────────────────────────────────
class CopilotoRequest(BaseModel):
    mensaje: str
    historial: list = []  # Lista de {"role": "user/assistant", "content": "..."}

class ScannerRequest(BaseModel):
    texto: str


# ─── Endpoint Copiloto ────────────────────────────────────────────────────────
@app.post("/api/v1/copiloto", tags=["IA"])
async def copiloto_legal(req: CopilotoRequest):
    """
    Copiloto legal IA alimentado por Ollama (llama3.1) corriendo localmente.
    Responde preguntas sobre derecho de familia chileno.
    """
    system_prompt = """Eres NEXO, un asistente legal especializado en Derecho de Familia chileno.

Tu conocimiento incluye:
- Ley N°14.908 (Alimentos)
- Código Civil (cuidado personal, relación directa y regular)
- Ley N°19.968 (Tribunales de Familia)
- Ley N°20.066 (Violencia Intrafamiliar)
- Mediación familiar obligatoria en Chile
- Apremios legales: arraigo, arresto nocturno, retención de licencia
- Procedimientos del PJUD (Poder Judicial de Chile)

IMPORTANTE:
- Habla en español, de manera clara y empática.
- Siempre aclara que tus respuestas son orientativas y no reemplazan una asesoría legal profesional.
- Si la pregunta no es de derecho de familia chileno, redirige amablemente al tema de tu especialidad.
- Sé conciso: máximo 3-4 párrafos por respuesta."""

    # Construir el prompt con historial
    historial_texto = ""
    for msg in req.historial[-6:]:  # Solo últimos 6 mensajes para evitar contexto infinito
        rol = "Usuario" if msg.get("role") == "user" else "NEXO"
        historial_texto += f"{rol}: {msg.get('content', '')}\n"

    prompt = f"{historial_texto}Usuario: {req.mensaje}\nNEXO:"

    try:
        respuesta = llamar_ollama(prompt, system=system_prompt, temperatura=0.7)
        return {"respuesta": respuesta.strip(), "modelo": OLLAMA_MODEL}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

# --- ENDPOINTS ---

# ─── Endpoint Scanner de Resoluciones (texto plano → Ollama) ─────────────────
@app.post("/api/v1/scanner/analizar", tags=["IA"])
@limiter.limit("20/minute") # Prevención de abuso costoso de IA
async def analizar_resolucion(request: Request, req: ScannerRequest, _user=Depends(verify_firebase_token)):
    """
    Recibe texto de una resolución judicial, lo anonimiza y lo analiza con Ollama.
    Retorna un análisis estructurado: tipo, resumen, puntos clave, acción recomendada, riesgo.
    """
    texto = req.texto.strip()
    if len(texto) < 20:
        raise HTTPException(status_code=400, detail="El texto es demasiado corto para analizar.")

    # Anonimizar RUTs antes de enviar al LLM
    texto_seguro = pseudo_anonimizar(texto[:5000])

    system_prompt = (
        "Eres un abogado experto en Derecho de Familia chileno. "
        "Analiza resoluciones judiciales y explícalas de forma clara a personas sin conocimiento legal. "
        "Responde ÚNICAMENTE con un objeto JSON válido. No escribas nada antes ni después del JSON."
    )

    prompt = f"""Lee esta resolución judicial chilena y devuelve un análisis en JSON con esta estructura exacta:
{{
  "tipo": "Nombre corto del tipo de resolución (ej: Decreto de Apremio, Fijación de Pensión, etc.)",
  "resumen": "Resumen claro en 2-3 oraciones de qué decidió el tribunal y qué significa.",
  "puntosClave": [
    {{"label": "...", "value": "...", "icon": "emoji"}},
    {{"label": "...", "value": "...", "icon": "emoji"}},
    {{"label": "...", "value": "...", "icon": "emoji"}}
  ],
  "accionRecomendada": "Qué debe hacer el usuario ahora. Sé específico con plazos si los hay.",
  "riesgo": "bajo | medio | alto"
}}

Texto de la resolución:
{texto_seguro}"""

    try:
        respuesta_raw = llamar_ollama(prompt, system=system_prompt, temperatura=0.2)
        json_match = re.search(r'\{[\s\S]*\}', respuesta_raw)
        if not json_match:
            raise ValueError("Ollama no devolvió JSON válido")
        analisis = json.loads(json_match.group(0))
        analisis["fuente"] = "ollama"

        # ─── Guardar en Firestore: scanner_historial ────────────────
        if FIREBASE_ADMIN_OK and db is not None and _user is not None:
            uid = _user.get("uid")
            if uid:
                from datetime import datetime, timezone
                try:
                    doc_ref = db.collection("usuarios").document(uid).collection("scanner_historial").document()
                    doc_ref.set({
                        "resumen": analisis.get("resumen", ""),
                        "riesgo": analisis.get("riesgo", "medio"),
                        "tipo": analisis.get("tipo", "Desconocido"),
                        "timestamp": firestore.SERVER_TIMESTAMP,
                        "fuente": analisis["fuente"]
                    })
                except Exception as e:
                    logger.warning(f"⚠️ Error guardando historial en Firestore: {e}")
        # ────────────────────────────────────────────────────────────

        return analisis
    except Exception as e:
        logger.error(f"❌ [Fallback Activado] El motor de IA falló definitivamente: {e}")
        analisis_fallback = {
            "resumen": "Nuestro sistema de IA se encuentra congestionado o en mantenimiento en este momento y no pudo completar el escaneo avanzado de este documento. Por favor, realiza una revisión humana.",
            "puntos_clave": [
                "Demasiado tráfico o timeout del motor.",
                "Se requiere revisión manual temporal."
            ],
            "accion_recomendada": "Vuelve a intentar el escaneo en un par de horas o contacta soporte.",
            "riesgo": "medio",
            "tipo": "Resolución (Sin Analizar - Fallback)",
            "fuente": "sistema-fallback"
        }
        return analisis_fallback
    except Exception as e:
        # Fallback estructurado si Ollama falla o devuelve JSON malformado
        return {
            "tipo": "Resolución Judicial",
            "resumen": "No se pudo analizar el texto con IA. Revise manualmente o inténtelo de nuevo.",
            "puntosClave": [
                {"label": "Estado", "value": "Análisis no disponible", "icon": "⚠️"}
            ],
            "accionRecomendada": "Revise el texto con un abogado. El sistema de IA no está disponible en este momento.",
            "riesgo": "medio",
            "fuente": "fallback",
            "error": str(e)[:100]
        }


@app.post("/api/v1/sentencias/subir", tags=["Colaborativo"])
async def subir_sentencia_colaborativa(archivo: UploadFile = File(...), _user=Depends(verify_firebase_token)):
    """
    Recibe un PDF del usuario, extrae el texto, lo anonimiza y lo clasifica.
    """
    if not archivo.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF.")
    
    try:
        # 1. Leer el archivo en memoria
        contenido = await archivo.read()
        
        # 2. Extraer texto
        texto_crudo = extraer_texto_pdf(contenido)
        if len(texto_crudo) < 10:
            raise HTTPException(status_code=422, detail="El PDF parece ser un escaneo sin texto (requiere OCR) o está vacío.")
            
        # 3. Pseudo-anonimización
        texto_seguro = pseudo_anonimizar(texto_crudo)
        
        # 4. Clasificación LLM
        analisis = clasificar_con_llm(texto_seguro)
        
        # 5. [AQUÍ IRÍA LA LÓGICA DE SQL para actualizar la causa.db]
        
        return {
            "mensaje": "Documento procesado e integrado con éxito.",
            "datos_extraidos": analisis,
            "preview_texto": texto_seguro[:200] + "..." # Solo para debug
        }
        
    except ValueError as ve:
        raise HTTPException(status_code=500, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno procesando el documento: {e}")
