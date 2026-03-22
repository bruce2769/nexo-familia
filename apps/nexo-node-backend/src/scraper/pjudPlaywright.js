/**
 * PJUD Playwright Client - Fallback con navegador real
 * ─────────────────────────────────────────────────────────────
 * Usa Playwright para navegar por la Oficina Judicial Virtual
 * como un humano real. Se activa cuando la API REST falla
 * o cuando necesitamos descargar PDFs de resoluciones.
 *
 * CUÁNDO SE USA:
 * - process.env.SCRAPER_MODE === 'playwright'
 * - Fallback automático cuando pjudApiClient falla repetidamente
 * - Para descargar el contenido del PDF de una resolución
 */
const { chromium } = require('playwright');
const logger = require('../utils/logger');

const OJV_URL = 'https://oficinajudicial.pjud.cl';

/**
 * Configuración del navegador "furtivo" para evitar detección.
 * Playwright ya tiene anti-detección básica, pero sumamos
 * varios flags para hacerlo más difícil de identificar.
 */
const BROWSER_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--window-size=1366,768',
    '--disable-dev-shm-usage',
];

let browserInstance = null;
let browserFailCount = 0;

/**
 * Obtiene o crea una instancia del navegador.
 * Reutilizamos la misma instancia entre requests para eficiencia.
 */
async function getBrowser() {
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }
    logger.info('[Playwright] Lanzando navegador Chromium...');
    browserInstance = await chromium.launch({
        headless: true,   // Cambiar a false para ver el scraping en vivo (Debug)
        args: BROWSER_ARGS,
    });
    browserFailCount = 0;
    return browserInstance;
}

/**
 * Crea un contexto de navegador con fingerprinting anti-detección.
 */
async function createStealthContext(browser) {
    const context = await browser.newContext({
        userAgent: process.env.USER_AGENT ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'es-CL',
        timezoneId: 'America/Santiago',
        viewport: { width: 1366, height: 768 },
        extraHTTPHeaders: {
            'Accept-Language': 'es-CL,es;q=0.9',
        },
    });

    // Inyectar script para ocultar que usamos Playwright
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
        window.chrome = { runtime: {} };
    });

    return context;
}

/**
 * Delay aleatorio humanizado
 */
const humanDelay = (min = 1500, max = 4000) =>
    new Promise(r => setTimeout(r, Math.random() * (max - min) + min));

/**
 * Navega a la OJV y extrae los movimientos de una causa por RIT.
 *
 * FLUJO:
 * 1. Abrir https://oficinajudicial.pjud.cl
 * 2. Ir a "Consulta de Causas" (no requiere login)
 * 3. Ingresar RIT, tipo y tribunal
 * 4. Extraer tabla de movimientos del DOM
 *
 * @param {object} params
 * @param {string} params.rit           - Ej: "C-1234-2023"
 * @param {string} params.codigoCorte
 * @param {string} params.tribunal
 */
async function scrapeMovimientosPlaywright({ rit, codigoCorte, tribunal }) {
    logger.info(`[Playwright] Scrapeando RIT: ${rit}`);

    const ritMatch = rit.match(/^([A-Z]+)-(\d+)-(\d{4})$/i);
    if (!ritMatch) throw new Error(`Formato RIT inválido: ${rit}`);
    const [, tipo, numero, anio] = ritMatch;

    const browser = await getBrowser();
    const context = await createStealthContext(browser);
    const page = await context.newPage();

    try {
        // ── 1. Navegar a la OJV ──────────────────────────────────
        logger.debug('[Playwright] Navegando a OJV...');
        await page.goto(`${OJV_URL}/#/causas`, {
            waitUntil: 'networkidle',
            timeout: 30000,
        });
        await humanDelay(2000, 3500);

        // ── 2. Buscar el formulario de consulta ──────────────────
        // La OJV es una SPA Angular/React — esperar a que cargue el formulario
        await page.waitForSelector('[data-testid="input-rit"], input[placeholder*="RIT"], input[name*="numeroCausa"]', {
            timeout: 15000,
        });

        // ── 3. Completar el formulario ───────────────────────────
        // Seleccionar tipo de causa (C, F, RIT, etc.)
        const selectTipo = await page.$('select[name*="tipo"], [data-testid="select-tipo"]');
        if (selectTipo) {
            await selectTipo.selectOption(tipo.toUpperCase());
            await humanDelay(500, 1000);
        }

        // Número de causa
        const inputNumero = await page.$('input[name*="numero"], input[placeholder*="número"], input[data-testid="input-numero"]');
        if (inputNumero) {
            await inputNumero.click();
            await inputNumero.type(numero, { delay: 80 }); // Escribir lento como humano
            await humanDelay(500, 1000);
        }

        // Año
        const inputAnio = await page.$('input[name*="anio"], input[name*="año"], input[placeholder*="año"]');
        if (inputAnio) {
            await inputAnio.type(anio, { delay: 80 });
            await humanDelay(500, 1000);
        }

        // ── 4. Seleccionar tribunal ──────────────────────────────
        const selectTribunal = await page.$('select[name*="tribunal"], [data-testid="select-tribunal"]');
        if (selectTribunal) {
            await selectTribunal.selectOption(tribunal);
            await humanDelay(500, 1500);
        }

        // ── 5. Hacer clic en Buscar ──────────────────────────────
        const btnBuscar = await page.$('button[type="submit"], button:has-text("Buscar"), [data-testid="btn-buscar"]');
        if (btnBuscar) {
            await btnBuscar.click();
        } else {
            await page.keyboard.press('Enter');
        }

        // ── 6. Esperar y extraer resultados ──────────────────────
        await page.waitForSelector(
            'table.movimientos, .lista-movimientos, tr.movimiento, [data-testid="tabla-movimientos"]',
            { timeout: 20000 }
        );
        await humanDelay(1000, 2000);

        // Extraer datos de la tabla con page.evaluate()
        const movimientos = await page.evaluate(() => {
            const filas = document.querySelectorAll(
                'table tr:not(:first-child), .movimiento-item, tr.ng-star-inserted'
            );

            return Array.from(filas).map(fila => {
                const celdas = fila.querySelectorAll('td');
                return {
                    fecha: celdas[0]?.textContent?.trim() || '',
                    tipo: celdas[1]?.textContent?.trim() || '',
                    descripcion: celdas[2]?.textContent?.trim() || '',
                    folio: celdas[3]?.textContent?.trim() || null,
                    url_resolucion: fila.querySelector('a')?.href || null,
                };
            }).filter(m => m.fecha || m.descripcion);
        });

        logger.info(`[Playwright] Encontrados ${movimientos.length} movimientos para ${rit}`);
        return movimientos;

    } catch (err) {
        browserFailCount++;
        logger.error(`[Playwright] Error scrapeando ${rit}:`, err.message);

        // Si el browser falló 3 veces, reiniciarlo
        if (browserFailCount >= 3) {
            logger.warn('[Playwright] Reiniciando instancia del navegador...');
            await browser.close().catch(() => { });
            browserInstance = null;
        }

        // Tomar screenshot para debugging
        try {
            await page.screenshot({ path: `./logs/error-${rit}-${Date.now()}.png` });
            logger.info('[Playwright] Screenshot de error guardado en ./logs/');
        } catch { }

        throw err;
    } finally {
        await context.close();
    }
}

module.exports = { scrapeMovimientosPlaywright };
