# routers/payments.py
# ─── Endpoints: Stripe y MercadoPago para recarga de créditos ─────────────────
import os
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from loguru import logger

from core.config import FRONTEND_URL, FIREBASE_ADMIN_OK, db

try:
    import stripe
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_dummy")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_dummy")
    STRIPE_OK = True
except ImportError:
    STRIPE_OK = False

try:
    import mercadopago
    _mp_token = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "TEST-dummy")
    mp_sdk    = mercadopago.SDK(_mp_token)
    MP_OK     = True
except ImportError:
    MP_OK = False

try:
    from firebase_admin import firestore
except ImportError:
    firestore = None

router = APIRouter(prefix="/api/v1/payments", tags=["Payments"])


class TopupRequest(BaseModel):
    userId: str
    amount: int   # número de créditos


# ─── Stripe ───────────────────────────────────────────────────────────────────
@router.post("/create-checkout-session")
async def create_checkout_session(req: TopupRequest):
    """Crea una sesión de Checkout en Stripe para recargar créditos."""
    if not STRIPE_OK:
        raise HTTPException(status_code=501, detail="Stripe no disponible.")
    amount = int(req.amount * 500)  # CLP 500 por crédito
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "clp",
                    "product_data": {"name": f"{req.amount} Créditos Nexo Familia"},
                    "unit_amount": amount,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{FRONTEND_URL}/payment-success?userId={req.userId}&credits={req.amount}",
            cancel_url=f"{FRONTEND_URL}/payment-cancel",
            client_reference_id=req.userId,
            metadata={"credits": str(req.amount)},
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"[Stripe] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Webhook Stripe: acredita créditos al usuario tras pago exitoso."""
    if not STRIPE_OK:
        return {"received": False}
    payload    = await request.body()
    sig_header = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    if event["type"] == "checkout.session.completed":
        session        = event["data"]["object"]
        user_id        = session.get("client_reference_id")
        credits_amount = int(session.get("metadata", {}).get("credits", "0"))
        if user_id and credits_amount > 0 and FIREBASE_ADMIN_OK and db is not None and firestore:
            user_ref = db.collection("users").document(user_id)
            user_ref.update({"credits": firestore.Increment(credits_amount)})
            user_ref.collection("transactions").add({
                "tipo":    "recarga_creditos",
                "detalle": "Stripe Checkout",
                "monto":   credits_amount,
                "fecha":   firestore.SERVER_TIMESTAMP,
            })
            logger.info(f"✅ Stripe: recargados {credits_amount} créditos a {user_id}")

    return {"received": True}


# ─── MercadoPago ──────────────────────────────────────────────────────────────
@router.post("/mercadopago/create-preference")
async def create_mp_preference(req: TopupRequest):
    """Crea una preferencia de pago en Mercado Pago."""
    if not MP_OK:
        raise HTTPException(status_code=501, detail="MercadoPago no disponible.")
    amount = int(req.amount * 500)
    preference_data = {
        "items": [{
            "title":     f"Recarga de {req.amount} Créditos - Nexo Familia",
            "quantity":  1,
            "currency_id": "CLP",
            "unit_price": amount,
        }],
        "back_urls": {
            "success": f"{FRONTEND_URL}/payment-success?userId={req.userId}&credits={req.amount}",
            "failure": f"{FRONTEND_URL}/payment-cancel",
            "pending": f"{FRONTEND_URL}/payment-pending",
        },
        "auto_return":        "approved",
        "external_reference": f"{req.userId}||{req.amount}",
    }
    try:
        response   = mp_sdk.preference().create(preference_data)
        preference = response["response"]
        return {"url": preference["init_point"]}
    except Exception as e:
        logger.error(f"[MercadoPago] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mercadopago/webhook")
async def mercadopago_webhook(request: Request):
    """Webhook MercadoPago: acredita créditos al usuario tras pago exitoso."""
    if not MP_OK:
        return {"status": "ok"}
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    action     = request.query_params.get("action") or request.query_params.get("topic") or payload.get("action") or payload.get("type")
    payment_id = request.query_params.get("data.id") or payload.get("data", {}).get("id")

    if (action in ("payment.created", "payment")) and payment_id:
        try:
            payment_info = mp_sdk.payment().get(payment_id).get("response", {})
            if payment_info.get("status") == "approved":
                ext_ref = payment_info.get("external_reference", "")
                parts   = ext_ref.split("||")
                if len(parts) == 2:
                    user_id, credits_amount = parts[0], int(parts[1])
                    if FIREBASE_ADMIN_OK and db is not None and firestore:
                        user_ref = db.collection("users").document(user_id)
                        user_ref.update({"credits": firestore.Increment(credits_amount)})
                        user_ref.collection("transactions").add({
                            "tipo":    "recarga_creditos",
                            "detalle": "Mercado Pago Webhook",
                            "monto":   credits_amount,
                            "pago_id": payment_id,
                            "fecha":   firestore.SERVER_TIMESTAMP,
                        })
                        logger.info(f"✅ MP: recargados {credits_amount} créditos a {user_id}")
        except Exception as e:
            logger.error(f"[MP Webhook] {e}")

    return {"status": "ok"}
