/**
 * Scheduler - PJUD Monitor
 * ─────────────────────────────────────────────────────────────
 * Orquesta el proceso completo de scraping:
 * 1. Lee todas las causas suscritas de Firestore
 * 2. Para cada causa → Obtiene movimientos del PJUD
 * 3. Detecta resoluciones nuevas
 * 4. Guarda en Firestore y genera alertas
 *
 * El cron corre cada N horas (configurable via CRON_SCHEDULE)
 */
const cron = require('node-cron');
const admin = require('firebase-admin');
const logger = require('./utils/logger');

const { getMovimientosPorRit } = require('./scraper/pjudApiClient');
const { scrapeMovimientosPlaywright } = require('./scraper/pjudPlaywright');
const {
    detectarEventosCriticos,
    filtrarNovedades,
    guardarEnFirestoreYNotificar,
} = require('./scraper/resolucionDetector');

// Estado interno del scheduler
let isRunning = false;
let lastRunAt = null;
let totalRunsSinceStart = 0;

/**
 * Delay aleatorio entre causas para evitar rate limiting
 */
const randomDelay = (min = 3000, max = 8000) =>
    new Promise(r => setTimeout(r, Math.random() * (max - min) + min));

/**
 * Obtiene movimientos usando el modo configurado.
 * Primero intenta la API REST, si falla usa Playwright.
 */
async function obtenerMovimientos(causa) {
    const { rit, codigoCorte, tribunal } = causa;
    const modo = process.env.SCRAPER_MODE || 'api';

    try {
        if (modo === 'playwright') {
            return await scrapeMovimientosPlaywright({ rit, codigoCorte, tribunal });
        } else {
            // Modo 'api' con fallback automático a playwright si falla
            try {
                return await getMovimientosPorRit({ rit, codigoCorte, tribunal });
            } catch (apiErr) {
                logger.warn(`[Scheduler] API falló para ${rit}: ${apiErr.message}. Intentando Playwright...`);
                return await scrapeMovimientosPlaywright({ rit, codigoCorte, tribunal });
            }
        }
    } catch (err) {
        logger.error(`[Scheduler] ❌ Ambos métodos fallaron para ${rit}:`, err.message);
        throw err;
    }
}

/**
 * Proceso principal de scraping.
 * Lee las suscripciones de Firestore y procesa cada causa.
 */
async function runScrapingCycle() {
    if (isRunning) {
        logger.warn('[Scheduler] Ya hay un ciclo en ejecución. Saltando...');
        return;
    }

    isRunning = true;
    totalRunsSinceStart++;
    const startTime = Date.now();
    logger.info(`\n${'═'.repeat(60)}`);
    logger.info(`[Scheduler] 🔄 INICIO CICLO #${totalRunsSinceStart} — ${new Date().toLocaleString('es-CL')}`);
    logger.info('═'.repeat(60));

    try {
        const db = admin.firestore();

        // ── 1. Leer todas las suscripciones activas ──────────────
        // Estructura: /radarSuscripciones/{userId}/causas/{rit}
        const usuariosSnap = await db.collection('radarSuscripciones').get();

        if (usuariosSnap.empty) {
            logger.info('[Scheduler] No hay usuarios con causas suscritas. Ciclo vacío.');
            return;
        }

        let totalCausas = 0;
        let totalNovedades = 0;
        let totalErrores = 0;

        // ── 2. Iterar usuarios ───────────────────────────────────
        for (const usuarioDoc of usuariosSnap.docs) {
            const userId = usuarioDoc.id;
            logger.info(`\n[Scheduler] 👤 Procesando usuario: ${userId}`);

            // Obtener causas del usuario
            const causasSnap = await db
                .collection('radarSuscripciones')
                .doc(userId)
                .collection('causas')
                .where('activa', '==', true)
                .get();

            if (causasSnap.empty) {
                logger.info(`[Scheduler] Sin causas activas para ${userId}`);
                continue;
            }

            // ── 3. Procesar cada causa del usuario ────────────────
            for (const causaDoc of causasSnap.docs) {
                const causa = causaDoc.data();
                const { rit } = causa;
                totalCausas++;

                logger.info(`\n[Scheduler] 📂 Causa: ${rit}`);

                try {
                    // 3a. Obtener movimientos del PJUD
                    const movimientosActuales = await obtenerMovimientos(causa);
                    logger.info(`[Scheduler] ${movimientosActuales.length} movimientos obtenidos del PJUD`);

                    // 3b. Obtener movimientos previos guardados en Firestore
                    const previosSnap = await db
                        .collection('radarEventos')
                        .doc(userId)
                        .collection('causas')
                        .doc(rit)
                        .collection('movimientos')
                        .orderBy('creadoAt', 'desc')
                        .limit(50)
                        .get();

                    const movimientosPrevios = previosSnap.docs.map(d => d.data());

                    // 3c. Filtrar solo los nuevos (deduplicar)
                    const soloNuevos = filtrarNovedades(movimientosActuales, movimientosPrevios);
                    logger.info(`[Scheduler] ${soloNuevos.length} movimientos NUEVOS encontrados`);

                    // 3d. Detectar cuáles son resoluciones/eventos críticos
                    const eventosCriticos = detectarEventosCriticos(soloNuevos, rit);

                    // 3e. Guardar en Firestore y generar alertas
                    if (soloNuevos.length > 0) {
                        await guardarEnFirestoreYNotificar(userId, rit, eventosCriticos.length > 0 ? eventosCriticos : soloNuevos);
                        totalNovedades += soloNuevos.length;
                    }

                    // 3f. Actualizar timestamp de última revisión
                    await causaDoc.ref.update({
                        ultimaRevision: admin.firestore.Timestamp.now(),
                        estadoUltimaRevision: 'ok',
                    });

                } catch (causaErr) {
                    totalErrores++;
                    logger.error(`[Scheduler] ❌ Error en causa ${rit}:`, causaErr.message);

                    // Registrar el error en Firestore para visibilidad en el frontend
                    await causaDoc.ref.update({
                        ultimaRevision: admin.firestore.Timestamp.now(),
                        estadoUltimaRevision: 'error',
                        ultimoError: causaErr.message,
                    }).catch(() => { });
                }

                // ── Esperar entre causas ──────────────────────────
                if (causasSnap.docs.indexOf(causaDoc) < causasSnap.docs.length - 1) {
                    const delaySecs = (
                        (parseInt(process.env.MIN_DELAY_MS) || 3000) +
                        (parseInt(process.env.MAX_DELAY_MS) || 8000)
                    ) / 2000;
                    logger.debug(`[Scheduler] Esperando ${delaySecs.toFixed(1)}s antes de la siguiente causa...`);
                    await randomDelay(
                        parseInt(process.env.MIN_DELAY_MS) || 3000,
                        parseInt(process.env.MAX_DELAY_MS) || 8000
                    );
                }
            }
        }

        // ── Resumen del ciclo ─────────────────────────────────────
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        lastRunAt = new Date().toISOString();
        logger.info(`\n${'─'.repeat(60)}`);
        logger.info(`[Scheduler] ✅ CICLO COMPLETADO en ${duration}s`);
        logger.info(`  Causas procesadas: ${totalCausas}`);
        logger.info(`  Novedades encontradas: ${totalNovedades}`);
        logger.info(`  Errores: ${totalErrores}`);
        logger.info('─'.repeat(60));

    } catch (err) {
        logger.error('[Scheduler] Error crítico en ciclo de scraping:', err);
    } finally {
        isRunning = false;
    }
}

/**
 * Inicia el scheduler con el cron configurado.
 * También ejecuta un ciclo inmediato al arrancar.
 */
function startScheduler() {
    const cronSchedule = process.env.CRON_SCHEDULE || '0 */6 * * *';
    logger.info(`[Scheduler] Configurado con cron: "${cronSchedule}"`);

    // Registrar el cron job
    cron.schedule(cronSchedule, () => {
        logger.info('[Scheduler] ⏰ Cron disparado');
        runScrapingCycle();
    }, {
        timezone: 'America/Santiago',
    });

    // Ejecutar un ciclo inicial después de 5 segundos para verificar
    // que todo funciona al arrancar el servidor
    setTimeout(() => {
        logger.info('[Scheduler] Ejecutando ciclo inicial de verificación...');
        runScrapingCycle();
    }, 5000);
}

/**
 * Ejecuta un ciclo manual (usado por la API REST)
 */
async function runManualCycle() {
    return runScrapingCycle();
}

/**
 * Retorna el estado del scheduler
 */
function getStatus() {
    return {
        isRunning,
        lastRunAt,
        totalRunsSinceStart,
        mode: process.env.SCRAPER_MODE || 'api',
    };
}

module.exports = { startScheduler, runManualCycle, getStatus };
