/**
 * NEXO BACKEND - Servidor Principal
 * Pilar 1: Conexión Real al Poder Judicial de Chile
 */
require('dotenv').config();

// ─── Validación de variables de entorno críticas ──────────────
const REQUIRED_ENV = ['PORT']; // FIREBASE se valida dentro de initFirebase()
const missing = REQUIRED_ENV.filter(k => !process.env[k] && k !== 'PORT'); // PORT tiene default
if (missing.length > 0) {
    console.error(`❌ Variables de entorno faltantes: ${missing.join(', ')}`);
    console.error('📋 Copia .env.example como .env y rellena los valores.');
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initFirebase } = require('./firebase/admin');
const { startScheduler } = require('./scheduler');
const radarRoutes = require('./routes/radar');
const mapaJuecesRoutes = require('./routes/mapaJueces');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Rate Limiting Global ─────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Límite de 100 requests por IP
    message: { error: '⚠️ Demasiadas peticiones desde esta IP. Por favor, intenta de nuevo en 15 minutos.' },
    standardHeaders: true, // Retorna rate limit info en headers `RateLimit-*`
    legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`
});

// Aplicar a todas las rutas bajo /api
app.use('/api', apiLimiter);

// ─── CORS con múltiples dominios desde env ────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Permite requests sin origin (Postman, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        logger.warn(`[CORS] Bloqueado: ${origin}`);
        callback(new Error(`CORS: origen no permitido → ${origin}`));
    },
    credentials: true,
}));

app.use(express.json());

// ─── Request Logging ──────────────────────────────────────────
app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// ─── Rutas ────────────────────────────────────────────────────
app.use('/api/radar', radarRoutes);
app.use('/api/jueces', mapaJuecesRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'nexo-node-backend' });
});

// ─── Error handler global ─────────────────────────────────────
app.use((err, _req, res, _next) => {
    if (err.message && err.message.startsWith('CORS:')) {
        return res.status(403).json({ error: err.message });
    }
    logger.error('Error no manejado:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Inicio ───────────────────────────────────────────────────
async function main() {
    try {
        initFirebase();
        logger.info('✅ Firebase Admin SDK inicializado');

        startScheduler();
        logger.info('✅ Scheduler de PJUD iniciado');

        app.listen(PORT, () => {
            logger.info(`🚀 Nexo Node Backend → http://localhost:${PORT}`);
            logger.info(`📡 Scraper mode: ${process.env.SCRAPER_MODE || 'api'}`);
            logger.info(`⏰ Cron: ${process.env.CRON_SCHEDULE || '0 */6 * * *'}`);
            logger.info(`🌐 CORS permitido: ${allowedOrigins.join(' | ')}`);
        });
    } catch (err) {
        logger.error('Error fatal al iniciar:', err.message);
        process.exit(1);
    }
}

main();


