# main.py — Nexo Familia API v2.1
# ─── Entry point: registra todos los routers, configuración CORS y middleware ───
import os
import time
from dotenv import load_dotenv

load_dotenv()  # Carga .env en desarrollo local

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# ─── Routers ──────────────────────────────────────────────────────────────────
from routers.health    import router as health_router
from routers.copiloto  import router as copiloto_router
from routers.scanner   import router as scanner_router
from routers.escritos  import router as escritos_router
from routers.analytics import router as analytics_router
from routers.causas    import router as causas_router
from routers.payments  import router as payments_router
from routers.users     import router as users_router

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Nexo Familia API",
    description="Motor backend para Legal Analytics — powered by OpenAI gpt-4o-mini.",
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── Rate Limiter global ──────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Usa ALLOWED_ORIGINS si está configurada (producción Railway).
# En desarrollo local (sin variable) permite todos los orígenes.
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
if _raw_origins:
    # Soporta múltiples orígenes separados por coma: "https://nexo.vercel.app,https://staging.nexo.app"
    CORS_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]
    logger.info(f"🔒 CORS restringido a: {CORS_ORIGINS}")
else:
    CORS_ORIGINS = ["*"]
    logger.warning("⚠️ CORS abierto a todos los orígenes. Configura ALLOWED_ORIGINS en Railway.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    # allow_credentials solo funciona si origins no es ["*"]
    allow_credentials=(CORS_ORIGINS != ["*"]),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Middleware de logging ─────────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    has_auth   = "authenticated" if request.headers.get("Authorization") else "anonymous"
    logger.info(f"🚀 {request.method} {request.url.path} | user={has_auth}")
    response   = await call_next(request)
    duration   = (time.time() - start_time) * 1000
    logger.info(f"🏁 {request.method} {request.url.path} | {response.status_code} | {duration:.1f}ms")
    return response

# ─── Registro de routers ───────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(copiloto_router)
app.include_router(scanner_router)
app.include_router(escritos_router)
app.include_router(analytics_router)
app.include_router(causas_router)
app.include_router(payments_router)
app.include_router(users_router)

logger.info("✅ Nexo Familia API v2.1 iniciada — todos los routers registrados.")
