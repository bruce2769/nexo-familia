# routers/escritos.py
# ─── Endpoint: Generador de Escritos Legales Profesionales ────────────────────
import re
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from loguru import logger
from slowapi import Limiter
from slowapi.util import get_remote_address

from core.security import verify_firebase_token
from core.credits import _verificar_creditos
from core.openai_client import llamar_openai, validar_rut_chileno
from core.pdf_docx import generar_pdf_basico, generar_docx_basico
from core.config import OPENAI_MODEL, FIREBASE_ADMIN_OK, db

try:
    from firebase_admin import firestore
except ImportError:
    firestore = None

limiter = Limiter(key_func=get_remote_address)
router  = APIRouter(prefix="/api/v1", tags=["Escritos"])

TIPOS_ESCRITO = {
    "rebaja_pension":       "Solicitud de Rebaja de Pensión Alimenticia",
    "cumplimiento_pension": "Solicitud de Cumplimiento de Pensión Alimenticia",
    "solicitud_liquidacion":"Solicitud de Liquidación de Deuda de Alimentos",
    "cese_alimentos":       "Solicitud de Cese de Obligación Alimenticia",
    "regimen_visitas":      "Solicitud de Régimen de Relación Directa y Regular",
    "medidas_apremio":      "Solicitud de Medidas de Apremio por Incumplimiento",
}

LEYES_REFERENCIA = {
    "rebaja_pension":       ["Ley N°14.908 art. 10 (rebaja por cambio de circunstancias)", "Código Civil art. 332"],
    "cumplimiento_pension": ["Ley N°14.908 art. 14 (apremios)", "Ley N°19.968 art. 66 (ejecución de sentencias)"],
    "solicitud_liquidacion":["Ley N°14.908 art. 18 (liquidación de deuda)", "Auto Acordado CS sobre liquidaciones"],
    "cese_alimentos":       ["Código Civil art. 332 (causales de cese)", "Ley N°14.908 art. 10 inc. final"],
    "regimen_visitas":      ["Ley N°19.968 art. 48 (acuerdos sobre relación directa)", "Código Civil art. 229 (derecho del hijo)"],
    "medidas_apremio":      ["Ley N°14.908 art. 14 (arresto nocturno)", "Ley N°14.908 art. 16 (retención de fondos)"],
}


class EscritoRequest(BaseModel):
    tipo_escrito:     str
    situacion:        str
    tribunal:         str = ""
    rit:              str = ""
    nombre_usuario:   str = "COMPARECIENTE"
    rut_usuario:      str = ""
    direccion_usuario:str = ""
    telefono_usuario: str = ""
    email_usuario:    str = ""
    contraparte:      str = ""


@router.get("/escritos/tipos")
async def listar_tipos_escrito():
    """Lista todos los tipos de escritos disponibles."""
    return TIPOS_ESCRITO


@router.post("/escritos/generar")
@limiter.limit("10/minute")
async def generar_escrito(request: Request, req: EscritoRequest, _user=Depends(verify_firebase_token)):
    """
    Genera un escrito legal profesional al nivel de abogado chileno.
    Produce: (A) Escrito formal + (B) Explicación simple + (C) PDF y DOCX base64.
    """
    if req.rut_usuario and req.rut_usuario.strip():
        if not validar_rut_chileno(req.rut_usuario):
            raise HTTPException(status_code=400, detail="El RUT ingresado no es válido. Verifica el dígito verificador.")

    uid = _user.get("uid") if _user else None
    if not uid:
        raise HTTPException(status_code=401, detail="Usuario no autenticado.")

    saldo = _verificar_creditos(uid, costo=1)
    if saldo == -1:
        is_anon = _user.get("firebase", {}).get("sign_in_provider") == "anonymous"
        detail  = ("Has agotado tu documento gratuito. ¡Regístrate para obtener más créditos!" if is_anon
                   else "Saldo insuficiente. Recarga créditos para generar este escrito.")
        raise HTTPException(status_code=403, detail=detail)
    elif saldo == 0 and FIREBASE_ADMIN_OK:
        raise HTTPException(status_code=403, detail="Error de cuenta: créditos no encontrados.")

    tipo_label    = TIPOS_ESCRITO.get(req.tipo_escrito, req.tipo_escrito)
    leyes         = LEYES_REFERENCIA.get(req.tipo_escrito, ["Ley N°14.908", "Ley N°19.968"])
    leyes_texto   = " | ".join(leyes)
    tribunal_str  = req.tribunal or "TRIBUNAL DE FAMILIA COMPETENTE"
    rit_str       = f"RIT: {req.rit}" if req.rit else "RIT: A determinarse"
    nombre        = req.nombre_usuario or "EL/LA COMPARECIENTE"
    rut           = f", RUT {req.rut_usuario}," if req.rut_usuario else ","
    direccion     = f" domiciliado en {req.direccion_usuario}," if req.direccion_usuario else " domiciliado en [COMPLETAR DOMICILIO],"
    contacto_parts= []
    if req.telefono_usuario: contacto_parts.append(f"teléfono {req.telefono_usuario}")
    if req.email_usuario:    contacto_parts.append(f"correo electrónico {req.email_usuario}")
    contacto_str  = " y ".join(contacto_parts) if contacto_parts else "[COMPLETAR DATOS DE CONTACTO]"
    contraparte   = req.contraparte or "la contraparte"

    system_prompt = f"""Eres un abogado senior especialista en Derecho de Familia chileno con 20 años de experiencia.

Tu rol es redactar escritos judiciales que:
1. Sean formalmente correctos según la práctica forense chilena
2. Usen terminología jurídica precisa
3. Citen leyes chilenas vigentes y aplicables al caso
4. Tengan la estructura EXACTA que exigen los Juzgados de Familia
5. Sean presentables en tribunal SIN modificaciones importantes

REGLAS ABSOLUTAS:
- NUNCA incluyas explicaciones al usuario dentro del escrito
- SIEMPRE usa "S.S." para referirte al juez
- El escrito debe sonar como redactado por un abogado
- ROL ESTRICTO: El demandante es el usuario ({nombre}) y la contraparte es {contraparte}.

ESTRUCTURA OBLIGATORIA:
1. SUMA (alineada a la derecha)
2. PRESÉNTASE
3. COMPARECENCIA: "Yo, {nombre}{rut}{direccion} en autos caratulados..."
4. HECHOS (numerados 1, 2, 3...)
5. FUNDAMENTOS DE DERECHO con artículos
6. PETICIÓN: "POR TANTO, A S.S. PIDO..."
7. OTROSÍES (obligatorios: Documentos, Patrocinio/Poder, Notificaciones Ley 21.394)

Responde SOLO con JSON con estas claves exactas:
{{
  "escrito_formal": "...",
  "explicacion_simple": "...",
  "advertencias": ["..."]
}}"""

    prompt = f"""Genera un escrito de {tipo_label}:
- Nombre: {nombre}
- RUT: {req.rut_usuario or "[COMPLETAR RUT]"}
- Domicilio: {req.direccion_usuario or "[COMPLETAR DIRECCIÓN]"}
- Contraparte: {contraparte}
- Motivo: {req.situacion}
- Tribunal: {tribunal_str}
- {rit_str}
- Contacto: {contacto_str}
- Leyes a citar: {leyes_texto}

IMPORTANTE: Usa [COMPLETAR] para datos que el usuario debe completar (fechas exactas, montos)."""

    try:
        respuesta_raw = llamar_openai(prompt, system=system_prompt, temperatura=0.15, max_tokens=2000)
        json_match    = re.search(r'\{[\s\S]*\}', respuesta_raw)
        if not json_match:
            raise ValueError("La IA no devolvió JSON válido")

        resultado          = json.loads(json_match.group(0))
        escrito_formal_text = resultado.get("escrito_formal", "")
        pdf_base64         = generar_pdf_basico(escrito_formal_text, nombre, req.rut_usuario)
        docx_base64        = generar_docx_basico(escrito_formal_text, nombre, req.rut_usuario)

        advertencias = resultado.get("advertencias", [])
        if req.tipo_escrito == "rebaja_pension":
            if not any("mediación" in str(x).lower() for x in advertencias):
                advertencias.insert(0, "¡IMPORTANTE! En Chile, para demandar rebaja de alimentos, es REQUISITO contar con el Certificado de Mediación Frustrada.")

        # Descontar crédito y registrar transacción (una sola vez)
        if FIREBASE_ADMIN_OK and db is not None and firestore is not None:
            user_ref = db.collection("users").document(uid)
            user_ref.update({"credits": firestore.Increment(-1)})
            user_ref.collection("transactions").add({
                "tipo":   "generacion_escrito",
                "detalle": req.tipo_escrito,
                "monto":   -1,
                "fecha":   firestore.SERVER_TIMESTAMP,
            })
            logger.info(f"✅ Crédito descontado para {uid}")

    except Exception as e:
        logger.error(f"[Escritos] Error: {e}")
        raise HTTPException(status_code=503, detail=f"Error generando el escrito: {str(e)[:120]}")

    # Guardar en Firestore para historial
    if db and uid:
        try:
            db.collection("escritos").add({
                "userId":    uid,
                "tipo":      req.tipo_escrito,
                "tipoLabel": tipo_label,
                "tribunal":  req.tribunal,
                "rit":       req.rit,
                "datos_personales": {
                    "nombre":    req.nombre_usuario,
                    "rut":       req.rut_usuario,
                    "direccion": req.direccion_usuario,
                    "telefono":  req.telefono_usuario,
                    "email":     req.email_usuario,
                },
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "preview":   escrito_formal_text[:200],
            })
        except Exception as e:
            logger.warning(f"[Escritos] No se pudo guardar historial: {e}")

    return {
        "tipo":            req.tipo_escrito,
        "tipo_label":      tipo_label,
        "escrito_formal":  escrito_formal_text,
        "explicacion_simple": resultado.get("explicacion_simple", ""),
        "advertencias":    advertencias,
        "pdf_base64":      pdf_base64,
        "docx_base64":     docx_base64,
        "leyes_citadas":   leyes,
    }


@router.get("/escritos/history/{user_id}")
async def historial_escritos(user_id: str):
    """Devuelve el historial de documentos generados por el usuario."""
    if not FIREBASE_ADMIN_OK or db is None:
        return []
    try:
        from firebase_admin import firestore as fs
        docs = (
            db.collection("escritos")
            .where("userId", "==", user_id)
            .order_by("createdAt", direction=fs.Query.DESCENDING)
            .limit(50)
            .stream()
        )
        results = []
        for d in docs:
            item      = d.to_dict()
            item["id"] = d.id
            results.append(item)
        return results
    except Exception as e:
        logger.error(f"[Escritos/history] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
