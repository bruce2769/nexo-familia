# core/config.py
# ─── Configuración central: Firebase, OpenAI, variables de entorno ──────────────
import os
import json
import logging
from loguru import logger

# ─── OpenAI ───────────────────────────────────────────────────────────────────
OPENAI_API_KEY  = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL    = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
FRONTEND_URL    = os.environ.get("FRONTEND_URL", "http://localhost:5173")
MAX_IA_REQUESTS_PER_DAY = int(os.environ.get("MAX_IA_REQUESTS_PER_DAY", "20"))

# ─── Firebase Admin SDK ────────────────────────────────────────────────────────
FIREBASE_ADMIN_OK = False
db = None

try:
    import firebase_admin
    from firebase_admin import credentials, auth as firebase_auth, firestore as firebase_firestore

    _sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")
    if _sa_json and not firebase_admin._apps:
        cred_dict = None
        for json_str in [
            _sa_json,
            _sa_json.replace('\\n', '\n'),
            _sa_json.replace('\\n', '\n').replace("\\'", "'"),
        ]:
            try:
                cred_dict = json.loads(json_str, strict=False)
                break
            except json.JSONDecodeError:
                continue

        if cred_dict is None:
            raise ValueError("No se pudo parsear FIREBASE_SERVICE_ACCOUNT_JSON.")

        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        db = firebase_firestore.client()
        FIREBASE_ADMIN_OK = True
        logger.info("✅ Firebase Admin SDK inicializado correctamente.")
    elif firebase_admin._apps:
        db = firebase_firestore.client()
        FIREBASE_ADMIN_OK = True
    else:
        logger.warning("⚠️ FIREBASE_SERVICE_ACCOUNT_JSON no configurado — modo local sin Firebase.")

except ImportError:
    logger.warning("⚠️ firebase_admin no instalado.")
except Exception as e:
    logger.warning(f"⚠️ Error inicializando Firebase: {e}")

# ─── Validación de variables críticas ─────────────────────────────────────────
REQUIRED_ENV = ["OPENAI_API_KEY"]
missing_env = [k for k in REQUIRED_ENV if not os.environ.get(k)]
if missing_env:
    logger.warning(f"⚠️ Variables faltantes (modo degradado): {', '.join(missing_env)}")
