// nexo/services/historialService.js
// Utilidad para guardar entradas en el historial local (localStorage)
// Separado de HistorialModule.jsx para compatibilidad con Vite Fast Refresh

const LS_KEY = 'nexo-historial';

/**
 * Guarda una entrada en el historial local.
 * @param {{ type: string, title: string, summary?: string, details?: object }} entry
 */
export function saveToHistorial(entry) {
    try {
        const h = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
        h.unshift({ ...entry, id: Date.now(), date: new Date().toLocaleString('es-CL') });
        if (h.length > 50) h.length = 50;
        localStorage.setItem(LS_KEY, JSON.stringify(h));
    } catch { /* localStorage no disponible */ }
}

/**
 * Lee el historial local completo.
 * @returns {Array}
 */
export function readHistorial() {
    try {
        return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    } catch {
        return [];
    }
}

/**
 * Limpia el historial local.
 */
export function clearHistorial() {
    try {
        localStorage.removeItem(LS_KEY);
    } catch { /* ignore */ }
}

export { LS_KEY };
