# core/credits.py
# ─── Gestión de créditos de usuario en Firestore ───────────────────────────────
from datetime import date
from loguru import logger
from core.config import FIREBASE_ADMIN_OK, db, MAX_IA_REQUESTS_PER_DAY

try:
    from firebase_admin import firestore
except ImportError:
    firestore = None


def _verificar_creditos(uid: str, costo: int = 1) -> int:
    """
    Verifica si el usuario tiene créditos suficientes.
    Retorna:
      -1 → créditos insuficientes
       0 → sin documento (no existe el usuario)
      >0 → saldo disponible
    """
    if not FIREBASE_ADMIN_OK or db is None or not uid:
        return 0
    try:
        doc = db.collection("users").document(uid).get()
        if not doc.exists:
            return 0
        credits = doc.to_dict().get("credits", 0)
        if credits < costo:
            return -1
        return credits
    except Exception as e:
        logger.error(f"[Credits] Error verificando: {e}")
        return 0


def _descontar_credito(uid: str, monto: int = 1):
    """Resta créditos al usuario tras una operación exitosa."""
    if not FIREBASE_ADMIN_OK or db is None or not uid or firestore is None:
        return
    try:
        db.collection("users").document(uid).update({
            "credits": firestore.Increment(-monto)
        })
        logger.info(f"[Credits] 📉 -{monto} créditos para {uid}")
    except Exception as e:
        logger.error(f"[Credits] Error descontando: {e}")


def _verificar_limite_diario(uid: str) -> bool:
    """Verifica y registra el conteo diario de uso de IA por usuario."""
    if not FIREBASE_ADMIN_OK or db is None or not uid or firestore is None:
        return True
    try:
        hoy = date.today().isoformat()
        doc_ref = (
            db.collection("users")
            .document(uid)
            .collection("ia_usage")
            .document(hoy)
        )
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
