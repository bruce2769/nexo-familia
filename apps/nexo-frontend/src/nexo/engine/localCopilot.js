// src/nexo/engine/localCopilot.js
// Copiloto legal NEXO — conecta con backend Python via OpenAI gpt-4o-mini

const BACKEND_URL = import.meta.env.VITE_NEXO_BACKEND_URL || 'http://localhost:8001';

let historial = [];

export const simulateCopilotResponse = async (message) => {
    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/copiloto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje: message, historial })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Error ${res.status}`);
        }

        const data = await res.json();
        const respuesta = data.respuesta;

        historial.push({ role: 'user', content: message });
        historial.push({ role: 'assistant', content: respuesta });
        if (historial.length > 20) historial = historial.slice(-20);

        return respuesta;

    } catch (error) {
        console.error('[Copiloto] Error:', error.message);
        return 'El servicio de IA no está disponible en este momento. Por favor, inténtalo de nuevo en unos instantes.';
    }
};

export const resetHistorial = () => {
    historial = [];
};
