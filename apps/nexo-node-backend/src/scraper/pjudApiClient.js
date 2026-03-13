/**
 * PJUD API Client
 * ─────────────────────────────────────────────────────────────
 * Consulta los endpoints REST semi-públicos del Poder Judicial
 * de Chile sin necesitar Clave Única.
 *
 * Endpoints descubiertos por análisis de tráfico de red en:
 *   https://oficinajudicial.pjud.cl
 *   https://litigante.pjud.cl
 *
 * NOTA: Si estos endpoints cambian (el PJUD actualiza su sitio
 * frecuentemente), usar pjudPlaywright.js como fallback.
 */
const fetch = require('node-fetch');
const logger = require('../utils/logger');

// ─── Constantes ───────────────────────────────────────────────
const PJUD_BASE = 'https://litigante.pjud.cl';
const OJV_BASE = 'https://oficinajudicial.pjud.cl';

// Headers que imitan un navegador real para evitar bloqueos básicos
const BASE_HEADERS = {
    'User-Agent': process.env.USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
    'Referer': 'https://oficinajudicial.pjud.cl/',
    'Origin': 'https://oficinajudicial.pjud.cl',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
};

/**
 * Delay aleatorio para simular comportamiento humano y evitar rate-limiting.
 * @param {number} min - mínimo en ms
 * @param {number} max - máximo en ms
 */
const randomDelay = (min = 3000, max = 8000) =>
    new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));

/**
 * Mapeo de códigos de tribunal PJUD.
 * Fuente: https://www.pjud.cl/tribunales
 */
const TRIBUNALES = {
    // Santiago
    'JFAM001': { nombre: '1° Juzgado de Familia de Santiago', codigo: 'JFAM001' },
    'JFAM002': { nombre: '2° Juzgado de Familia de Santiago', codigo: 'JFAM002' },
    'JFAM003': { nombre: '3° Juzgado de Familia de Santiago', codigo: 'JFAM003' },
    'JFAM004': { nombre: '4° Juzgado de Familia de Santiago', codigo: 'JFAM004' },
    // Puedes agregar más desde: https://www.pjud.cl/tribunales/listado
};

/**
 * Consulta los movimientos de una causa por RIT.
 *
 * @param {object} params
 * @param {string} params.rit          - Ej: "C-1234-2023"
 * @param {string} params.codigoCorte  - Ej: "15" (Santiago)
 * @param {string} params.tribunal     - Ej: "JFAM001"
 * @returns {Promise<Array>}           - Array de movimientos
 */
async function getMovimientosPorRit({ rit, codigoCorte, tribunal }) {
    logger.info(`[PJUD API] Consultando RIT: ${rit} | Tribunal: ${tribunal}`);

    // Parsear el RIT al formato que espera el PJUD
    // Formato: "C-1234-2023" → tipo="C", numero="1234", año="2023"
    const ritMatch = rit.match(/^([A-Z]+)-(\d+)-(\d{4})$/i);
    if (!ritMatch) {
        throw new Error(`Formato de RIT inválido: "${rit}". Usar formato "C-1234-2023"`);
    }
    const [, tipo, numero, anio] = ritMatch;

    await randomDelay(
        parseInt(process.env.MIN_DELAY_MS) || 2000,
        parseInt(process.env.MAX_DELAY_MS) || 5000
    );

    try {
        // ── Endpoint 1: API de Causas del PJUD ─────────────────────
        // Descubierto via DevTools Network > XHR en oficinajudicial.pjud.cl
        const url = `${PJUD_BASE}/rest/causas/getByRit`;
        const body = {
            codigoCorte,   // Código numérico de la corte (ej: "15" para Santiago)
            tribunal,       // Código del tribunal
            tipoCausa: tipo.toUpperCase(),
            numeroCausa: numero,
            anio,
        };

        logger.debug(`[PJUD API] POST ${url}`, body);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...BASE_HEADERS,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            timeout: 15000, // 15 segundos timeout
        });

        if (!response.ok) {
            logger.warn(`[PJUD API] HTTP ${response.status} para RIT ${rit}. Intentando OJV...`);
            return await getMovimientosOJV({ rit, codigoCorte, tribunal });
        }

        const data = await response.json();
        logger.debug(`[PJUD API] Respuesta recibida:`, data);

        // Normalizar la respuesta al formato interno de Nexo
        return normalizarMovimientos(data);

    } catch (err) {
        if (err.type === 'aborted' || err.code === 'ECONNREFUSED') {
            logger.warn(`[PJUD API] Timeout/conexión para ${rit}. Usando fallback OJV...`);
            return await getMovimientosOJV({ rit, codigoCorte, tribunal });
        }
        throw err;
    }
}

/**
 * Endpoint alternativo: Oficina Judicial Virtual (OJV)
 * Usado como fallback si la API de litigante no responde.
 *
 * Este endpoint es el que usa la web https://oficinajudicial.pjud.cl
 */
async function getMovimientosOJV({ rit, codigoCorte, tribunal }) {
    logger.info(`[OJV] Consultando OJV para RIT: ${rit}`);

    const ritMatch = rit.match(/^([A-Z]+)-(\d+)-(\d{4})$/i);
    const [, tipo, numero, anio] = ritMatch;

    // Construir URL de consulta pública (no requiere autenticación)
    const params = new URLSearchParams({
        tipoCausa: tipo.toUpperCase(),
        numeroCausa: numero,
        anio,
        codigoCorte,
        codigoTribunal: tribunal,
    });

    const url = `${OJV_BASE}/rest/causas/getDetalleCausa?${params}`;
    logger.debug(`[OJV] GET ${url}`);

    const response = await fetch(url, {
        headers: BASE_HEADERS,
        timeout: 20000,
    });

    if (!response.ok) {
        throw new Error(`[OJV] HTTP ${response.status}: No se pudo obtener causa ${rit}`);
    }

    const data = await response.json();
    return normalizarMovimientos(data);
}

/**
 * Normaliza la respuesta del PJUD al formato interno de Nexo.
 * Los endpoints pueden cambiar el nombre de los campos,
 * esta función actúa como adaptador robusto.
 *
 * @param {object|Array} rawData - Datos crudos del PJUD
 * @returns {Array<MovimientoNexo>}
 */
function normalizarMovimientos(rawData) {
    // El PJUD puede devolver un objeto con `movimientos` o directamente un array
    let lista = [];

    if (Array.isArray(rawData)) {
        lista = rawData;
    } else if (rawData?.movimientos) {
        lista = rawData.movimientos;
    } else if (rawData?.detalle?.movimientos) {
        lista = rawData.detalle.movimientos;
    } else if (rawData?.causa?.listaMovimientos) {
        lista = rawData.causa.listaMovimientos;
    } else {
        logger.warn('[PJUD] Estructura de respuesta desconocida:', JSON.stringify(rawData).substring(0, 200));
        return [];
    }

    return lista.map(mov => ({
        // Campos normalizados (los nombres reales varían según el endpoint)
        fecha: mov.fechaFuncion || mov.fecha || mov.fec_Resolucion || '',
        tipo: mov.codTipoMovimiento || mov.tipo || mov.tipo_Movimiento || '',
        descripcion: mov.descMovimiento ||
            mov.descripcion ||
            mov.libro ||
            mov.tipoResolucion || '',
        folio: mov.folioDocumento || mov.folio || null,
        paginas: mov.cantPaginas || null,
        // Preservar datos originales por si acaso
        _raw: mov,
    }));
}

module.exports = {
    getMovimientosPorRit,
    TRIBUNALES,
};
