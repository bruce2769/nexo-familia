/**
 * Firebase Admin SDK - Inicializador
 * ─────────────────────────────────────────────────────────────
 * Inicializa Firebase Admin una sola vez usando el patrón Singleton.
 */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

function initFirebase() {
    if (admin.apps.length > 0) {
        return admin.app(); // Ya inicializado
    }

    const serviceAccountPath = path.resolve(
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json'
    );

    if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(
            `❌ No se encontró el archivo de credenciales de Firebase en: ${serviceAccountPath}\n` +
            `📋 Descárgalo desde: Firebase Console > Configuración > Cuentas de servicio > Generar nueva clave privada`
        );
    }

    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    logger.info(`[Firebase] Conectado al proyecto: ${serviceAccount.project_id}`);
    return admin.app();
}

module.exports = { initFirebase };
