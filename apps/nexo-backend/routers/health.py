# routers/health.py
from fastapi import APIRouter
from core.config import OPENAI_MODEL, FIREBASE_ADMIN_OK

router = APIRouter(tags=["Health"])


@router.get("/health")
@router.get("/api/health")
async def health_check():
    return {
        "ok": True,
        "status": "ok",
        "version": "2.1.0",
        "ia": "openai",
        "model": OPENAI_MODEL,
        "firebase": FIREBASE_ADMIN_OK,
    }
