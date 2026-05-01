# core/security.py
# ─── Autenticación Firebase + Rate limiting ────────────────────────────────────
import time
from collections import defaultdict
from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from loguru import logger
from core.config import FIREBASE_ADMIN_OK

# ─── Rate limiter en memoria ──────────────────────────────────────────────────
_RATE_LIMITS: dict = defaultdict(list)
MAX_REQUESTS_PER_MINUTE = int(__import__('os').environ.get("MAX_REQUESTS_PER_MINUTE", "20"))

def check_rate_limit(client_ip: str):
    now = time.time()
    _RATE_LIMITS[client_ip] = [t for t in _RATE_LIMITS[client_ip] if now - t < 60]
    if len(_RATE_LIMITS[client_ip]) >= MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes. Espera un minuto.")
    _RATE_LIMITS[client_ip].append(now)

# ─── Firebase token verification ──────────────────────────────────────────────
_bearer_scheme = HTTPBearer(auto_error=False)

async def verify_firebase_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
):
    if not FIREBASE_ADMIN_OK:
        raise HTTPException(status_code=503, detail="Firebase Admin SDK no inicializado.")
    if credentials is None:
        raise HTTPException(status_code=401, detail="Token de autorización ausente.")
    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(credentials.credentials)
        return decoded
    except Exception as e:
        logger.error(f"[Auth] Token inválido: {e}")
        raise HTTPException(status_code=401, detail=f"Token inválido o expirado: {str(e)[:50]}")
