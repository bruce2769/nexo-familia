/**
 * Rutas REST - Radar Judicial
 * ─────────────────────────────────────────────────────────────
 * API que el frontend de Nexo llama para gestionar suscripciones
 * al radar y consultar el estado del scraper.
 */
const express = require('express');
const admin = require('firebase-admin');
const { runManualCycle, getStatus } = require('../scheduler');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Middleware: verificar Firebase Auth Token ────────────────
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        req.userId = decoded.uid;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
    }
}

// ──────────────────────────────────────────────────────────────
// POST /api/radar/subscribe
// Suscribe una causa RIT para que el scheduler la monitoree.
//
// Body: { rit, codigoCorte, tribunal, alias? }
// Auth: Firebase ID Token requerido
// ──────────────────────────────────────────────────────────────
router.post('/subscribe', requireAuth, async (req, res) => {
    const { rit, codigoCorte, tribunal, alias } = req.body;
    const userId = req.userId;

    if (!rit || !codigoCorte || !tribunal) {
        return res.status(400).json({
            error: 'Faltan parámetros: rit, codigoCorte, tribunal son obligatorios'
        });
    }

    // Validar el formato del RIT
    const ritMatch = rit.match(/^([A-Z]+)-(\d+)-(\d{4})$/i);
    if (!ritMatch) {
        return res.status(400).json({
            error: `Formato de RIT inválido: "${rit}". Usar formato "C-1234-2023"`
        });
    }

    try {
        const db = admin.firestore();
        const causaRef = db
            .collection('radarSuscripciones')
            .doc(userId)
            .collection('causas')
            .doc(rit);

        // Verificar si ya existe
        const existing = await causaRef.get();
        if (existing.exists) {
            // Reactivar si estaba inactiva
            await causaRef.update({ activa: true, actualizadoAt: admin.firestore.Timestamp.now() });
            return res.json({ success: true, message: `Causa ${rit} reactivada en el radar`, rit });
        }

        // Crear nueva suscripción
        await causaRef.set({
            rit: rit.toUpperCase(),
            codigoCorte,
            tribunal,
            alias: alias || rit,
            activa: true,
            creadoAt: admin.firestore.Timestamp.now(),
            actualizadoAt: admin.firestore.Timestamp.now(),
            ultimaRevision: null,
            estadoUltimaRevision: 'pendiente',
        });

        logger.info(`[API] ✅ Usuario ${userId} suscribió causa: ${rit}`);
        res.json({
            success: true,
            message: `Causa ${rit} agregada al radar`,
            rit,
            info: 'La primera revisión ocurrirá en los próximos minutos'
        });

    } catch (err) {
        logger.error('[API] Error en subscribe:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ──────────────────────────────────────────────────────────────
// DELETE /api/radar/unsubscribe/:rit
// Desuscribe una causa del monitoreo.
// ──────────────────────────────────────────────────────────────
router.delete('/unsubscribe/:rit', requireAuth, async (req, res) => {
    const { rit } = req.params;
    const userId = req.userId;

    try {
        const db = admin.firestore();
        await db
            .collection('radarSuscripciones')
            .doc(userId)
            .collection('causas')
            .doc(rit)
            .update({ activa: false, actualizadoAt: admin.firestore.Timestamp.now() });

        res.json({ success: true, message: `Causa ${rit} removida del radar` });
    } catch (err) {
        res.status(500).json({ error: 'Error al desuscribir' });
    }
});

// ──────────────────────────────────────────────────────────────
// GET /api/radar/status/:rit
// Devuelve el estado actual y últimos movimientos de una causa.
// ──────────────────────────────────────────────────────────────
router.get('/status/:rit', requireAuth, async (req, res) => {
    const { rit } = req.params;
    const userId = req.userId;

    try {
        const db = admin.firestore();

        // Info de la suscripción
        const causaSnap = await db
            .collection('radarSuscripciones')
            .doc(userId)
            .collection('causas')
            .doc(rit)
            .get();

        if (!causaSnap.exists) {
            return res.status(404).json({ error: `Causa ${rit} no está en tu radar` });
        }

        // Últimos 20 movimientos
        const movsSnap = await db
            .collection('radarEventos')
            .doc(userId)
            .collection('causas')
            .doc(rit)
            .collection('movimientos')
            .orderBy('creadoAt', 'desc')
            .limit(20)
            .get();

        const movimientos = movsSnap.docs.map(d => d.data());

        // Alertas no leídas
        const alertasSnap = await db
            .collection('radarEventos')
            .doc(userId)
            .collection('alertas')
            .where('rit', '==', rit)
            .where('leido', '==', false)
            .orderBy('creadoAt', 'desc')
            .get();

        const alertas = alertasSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        res.json({
            causa: causaSnap.data(),
            movimientos,
            alertasNoLeidas: alertas,
        });

    } catch (err) {
        logger.error('[API] Error en status:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ──────────────────────────────────────────────────────────────
// POST /api/radar/trigger-scan
// Dispara un ciclo manual de scraping (útil para desarrollo)
// Solo disponible en entorno de desarrollo
// ──────────────────────────────────────────────────────────────
router.post('/trigger-scan', requireAuth, async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'No disponible en producción' });
    }

    const status = getStatus();
    if (status.isRunning) {
        return res.status(409).json({ error: 'Ya hay un ciclo en ejecución', status });
    }

    res.json({ message: 'Ciclo de scraping iniciado', status });
    runManualCycle(); // Ejecutar en background, no bloquear la respuesta
});

// ──────────────────────────────────────────────────────────────
// GET /api/radar/scheduler-status
// Estado del scheduler (útil para monitoring)
// ──────────────────────────────────────────────────────────────
router.get('/scheduler-status', requireAuth, (req, res) => {
    res.json(getStatus());
});

module.exports = router;
