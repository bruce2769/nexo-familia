/**
 * NEXO BACKEND - Servidor Principal
 * Pilar 1: Conexión Real al Poder Judicial de Chile
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initFirebase } = require('./firebase/admin');
const { startScheduler } = require('./scheduler');
const radarRoutes = require('./routes/radar');
const mapaJuecesRoutes = require('./routes/mapaJueces');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middlewares ──────────────────────────────────────────
app.use(cors({
    origin: [
        'http://localhost:5173',  // Vite dev server Nexo
        'http://localhost:3000',
        /\.firebaseapp\.com$/,
        /\.web\.app$/,
    ]
}));
app.use(express.json());

// ─── Request Logging ─────────────────────────────────────
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// ─── Rutas ───────────────────────────────────────────────
app.use('/api/radar', radarRoutes);
app.use('/api/jueces', mapaJuecesRoutes); // Pilar 3: ML de Sentencias

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'nexo-backend' });
});

// ─── Inicio ──────────────────────────────────────────────
async function main() {
    try {
        // 1. Inicializar Firebase Admin SDK
        initFirebase();
        logger.info('✅ Firebase Admin SDK inicializado');

        // 2. Arrancar el scheduler de scraping
        startScheduler();
        logger.info('✅ Scheduler de PJUD iniciado');

        // 3. Arrancar servidor Express
        app.listen(PORT, () => {
            logger.info(`🚀 Nexo Backend escuchando en http://localhost:${PORT}`);
            logger.info(`📡 Modo scraper: ${process.env.SCRAPER_MODE || 'api'}`);
            logger.info(`⏰ Cron: ${process.env.CRON_SCHEDULE || '0 */6 * * *'}`);
        });
    } catch (err) {
        logger.error('Error fatal al iniciar el servidor:', err);
        process.exit(1);
    }
}

main();
