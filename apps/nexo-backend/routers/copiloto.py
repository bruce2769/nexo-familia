# routers/copiloto.py
# ─── Endpoint: Copiloto Legal IA 24/7 ──────────────────────────────────────────
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from loguru import logger

from core.security import verify_firebase_token
from core.credits import _verificar_creditos, _descontar_credito
from core.openai_client import llamar_openai
from core.config import OPENAI_MODEL, FIREBASE_ADMIN_OK

router = APIRouter(prefix="/api/v1", tags=["IA"])


class CopilotoRequest(BaseModel):
    mensaje: str
    historial: list = []   # Lista de {role: "user"|"assistant", content: "..."}


SYSTEM_PROMPT_COPILOTO = """Eres NEXO, un asistente legal especializado en Derecho de Familia chileno.

Tu rol:
- Orientar a ciudadanos sobre sus derechos y situación legal en materias de familia.
- Explicar procesos judiciales, pensiones, alimentos, visitas, mediación, embargos y divorcios.
- Usar lenguaje claro, empático y accesible, sin tecnicismos innecesarios.
- Siempre indicar que tus respuestas son orientativas y no reemplazan consulta con un abogado habilitado.
- Responder en español chileno.
- Ser concreto: si el usuario pregunta qué puede hacer, dile qué puede hacer paso a paso.
- Si no sabes algo con certeza, dilo honestamente.
- No inventar jurisprudencia ni artículos de ley que no existan.

Ámbito estrictamente chileno: Ley N°14.908 (alimentos), Ley N°19.968 (tribunales de familia), Código Civil chileno, Ley N°21.394 (notificaciones electrónicas)."""


@router.post("/copiloto")
async def copiloto_legal(req: CopilotoRequest, _user=Depends(verify_firebase_token)):
    """Copiloto legal IA con validación de créditos y memoria de conversación."""
    uid = _user.get("uid")

    # Validar créditos
    saldo = _verificar_creditos(uid, costo=1)
    if saldo == -1:
        raise HTTPException(status_code=403, detail="Créditos insuficientes para usar el Copiloto.")
    elif saldo == 0 and FIREBASE_ADMIN_OK:
        raise HTTPException(status_code=403, detail="No tienes créditos disponibles.")

    # Construir prompt con historial (últimas 6 turns)
    historial_texto = ""
    for msg in req.historial[-6:]:
        rol = "Usuario" if msg.get("role") == "user" else "NEXO"
        historial_texto += f"{rol}: {msg.get('content', '')}\n"

    prompt = f"{historial_texto}Usuario: {req.mensaje}\nNEXO:"

    try:
        respuesta = llamar_openai(prompt, system=SYSTEM_PROMPT_COPILOTO, temperatura=0.4, max_tokens=600)

        # Descontar crédito solo si la respuesta es válida (no error de servidor)
        if "demanda" not in respuesta and "ocupado" not in respuesta and "mantenimiento" not in respuesta:
            _descontar_credito(uid, monto=1)

        return {"respuesta": respuesta.strip(), "modelo": OPENAI_MODEL}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Servicio de IA con alta carga: {str(e)[:50]}")
