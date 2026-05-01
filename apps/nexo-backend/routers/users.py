# routers/users.py
# ─── Endpoint: Inicialización de perfil de usuario ────────────────────────────
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from loguru import logger

from core.security import verify_firebase_token
from core.config import FIREBASE_ADMIN_OK, db

try:
    from firebase_admin import firestore
except ImportError:
    firestore = None

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


class UserInitRequest(BaseModel):
    name:  str = ""
    email: str = ""


@router.post("/init")
async def init_user_profile(_user=Depends(verify_firebase_token), req: UserInitRequest = None):
    """
    Inicializa el perfil del usuario con 3 créditos gratuitos al registrarse.
    Si ya existe, devuelve el saldo actual sin modificar.
    """
    uid = _user.get("uid") if _user else None
    if not uid:
        raise HTTPException(status_code=401, detail="Usuario no autenticado.")
    if not FIREBASE_ADMIN_OK or db is None or firestore is None:
        raise HTTPException(status_code=503, detail="Base de datos no disponible.")

    doc_ref = db.collection("users").document(uid)
    doc     = doc_ref.get()

    if doc.exists:
        return {"status": "exists", "credits": doc.to_dict().get("credits", 0)}

    doc_ref.set({
        "credits":     3,
        "email":       req.email if req else "",
        "name":        req.name  if req else "",
        "isAnonymous": False,
        "createdAt":   firestore.SERVER_TIMESTAMP,
    })
    logger.info(f"✅ Perfil creado con 3 créditos para {uid}")
    return {"status": "created", "credits": 3}
