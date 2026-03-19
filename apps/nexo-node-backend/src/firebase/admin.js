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
            throw new Error(
                '❌ FIREBASE_SERVICE_ACCOUNT_JSON contiene JSON inválido.\n' +
                '💡 Asegúrate de que sea una sola línea sin saltos de línea escapados.\n' +
                `   Detalle: ${err.message}`
            );
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
            throw new Error(
                `❌ No se encontró el archivo de credenciales en: ${serviceAccountPath}\n` +
                '📋 Opciones:\n' +
                '   1. Dev local: descarga serviceAccountKey.json y colócalo en nexo-node-backend/\n' +
                '   2. Producción: configura FIREBASE_SERVICE_ACCOUNT_JSON con el JSON inline'
            );
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
