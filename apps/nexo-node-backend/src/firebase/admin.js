/**
 * Firebase Admin SDK - Inicializador
 * ─────────────────────────────────────────────────────────────
 * Inicializa Firebase Admin una sola vez usando el patrón Singleton.
 *
 * Soporta dos modos:
 *  1. Producción (cloud): FIREBASE_SERVICE_ACCOUNT_JSON — JSON inline en una sola línea
 *  2. Dev local: FIREBASE_SERVICE_ACCOUNT_PATH — ruta a serviceAccountKey.json
 */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

function initFirebase() {
    if (admin.apps.length > 0) {
        return admin.app(); // Ya inicializado (singleton)
    }

    const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (inlineJson) {
        // ── Modo producción: JSON inline desde variable de entorno ──────────
        let serviceAccount;
        try {
            serviceAccount = JSON.parse(inlineJson);
        } catch (err) {
            logger.error(`[Firebase] ❌ FIREBASE_SERVICE_ACCOUNT_JSON inválido. Abortando inicio de Firebase, pero el servidor continuará activo.`);
            return null;
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL,
        });

        logger.info(`[Firebase] ✅ Conectado (JSON env var) → proyecto: ${serviceAccount.project_id}`);

    } else {
        // ── Modo dev: archivo local serviceAccountKey.json ──────────────────
        const serviceAccountPath = path.resolve(
            process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json'
        );

        if (!fs.existsSync(serviceAccountPath)) {
            logger.error(`[Firebase] ❌ No se encontró archivo de credenciales. Abortando inicio de Firebase, pero el servidor continuará activo.`);
            return null;
        }

        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL,
        });

        logger.info(`[Firebase] ✅ Conectado (archivo local) → proyecto: ${serviceAccount.project_id}`);
    }

    return admin.app();
}

module.exports = { initFirebase, admin };
