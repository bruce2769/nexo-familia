// src/nexo/engine/localCopilot.js
// Copiloto real: conecta con Ollama via Python backend (llama3.1)

const BACKEND_URL = import.meta.env.VITE_NEXO_BACKEND_URL || 'http://localhost:8001';

// Historial de conversación para dar contexto al modelo
let historial = [];

export const simulateCopilotResponse = async (message) => {
    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/copiloto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mensaje: message,
                historial: historial
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Error ${res.status}`);
        }

        const data = await res.json();
        const respuesta = data.respuesta;

        // Guardar en historial (máximo 10 mensajes para no abusar del contexto)
        historial.push({ role: 'user', content: message });
        historial.push({ role: 'assistant', content: respuesta });
        if (historial.length > 20) historial = historial.slice(-20);

        return respuesta;

    } catch (error) {
        console.warn('[Copiloto] Error con Ollama, usando respuesta de fallback:', error.message);
        return fallbackRespuesta(message);
    }
};

export const resetHistorial = () => {
    historial = [];
};

// ─── Fallback offline cuando Ollama no responde ────────────────────────────
const FALLBACK_KB = [
    {
        keywords: ['embargo', 'embargar', 'retención', 'sueldo', 'cuentas'],
        response: "El embargo de fondos es una medida de apremio de la Ley N°14.908. Solo puede dictarse si existe deuda alimenticia previamente liquidada. Si la deuda supera un mes de incumplimiento el tribunal puede dictarla. ⚠️ Copiloto en modo offline — Ollama no está respondiendo."
    },
    {
        keywords: ['rebaja', 'bajar', 'cesante', 'despido', 'sin trabajo'],
        response: "Para solicitar rebaja de pensión debes demostrar un cambio sustancial económico (cesantía, nuevas cargas, salud). Ingresar 'incidente de rebaja' y solicitar mediación obligatoria antes de demandar. ⚠️ Copiloto en modo offline — Ollama no está respondiendo."
    },
    {
        keywords: ['visitas', 'ver a mi hijo', 'incumplimiento', 'relación directa', 'RDR'],
        response: "Ante incumplimiento del régimen de visitas, deja constancia en Carabineros por cada oportunidad perdida. Puedes solicitar apremios al tribunal. ⚠️ Copiloto en modo offline — Ollama no está respondiendo."
    },
    {
        keywords: ['liquidación', 'deuda', 'liquidar', 'cuanto debo'],
        response: "La liquidación es el cálculo oficial de la deuda. Una vez notificada, tienes 3 días fatales para objetar con comprobantes. ⚠️ Copiloto en modo offline — Ollama no está respondiendo."
    },
    {
        keywords: ['apremio', 'arresto', 'arraigo', 'licencia'],
        response: "Los apremios contra deudores: arraigo nacional, retención de licencia de conducir, arresto nocturno (hasta 15 días). ⚠️ Copiloto en modo offline — Ollama no está respondiendo."
    }
];

function fallbackRespuesta(message) {
    const lower = message.toLowerCase();
    for (const item of FALLBACK_KB) {
        if (item.keywords.some(kw => lower.includes(kw))) return item.response;
    }
    return "No puedo conectarme al motor IA en este momento (Ollama no está disponible). Puedes revisar los módulos de 'Guías Legales' y 'Glosario' del sistema. ⚠️ Modo offline.";
}
