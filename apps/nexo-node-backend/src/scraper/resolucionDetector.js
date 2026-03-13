/**
 * Motor de Detección de Resoluciones
 * ─────────────────────────────────────────────────────────────
 * Analiza los movimientos crudos del PJUD y determina si alguno
 * representa una "Resolución" o evento judicial crítico.
 *
 * Luego envía los hallazgos a Firestore y opcionalmente a un
 * webhook HTTP externo.
 */
const admin = require('firebase-admin');
const logger = require('../utils/logger');

// ─── Palabras clave a detectar ────────────────────────────────
// Organizadas por criticidad (mayor criticidad = mayor prioridad)
const KEYWORDS = {
    CRITICO: [
        'resolución',
        'resolucion',
        'sentencia',
        'fallo',
        'decreto',
        'auto',
        'interlocutoria',
    ],
    IMPORTANTE: [
        'audiencia',
        'citación',
        'citacion',
        'notificación',
        'notificacion',
        'proveído',
        'proveer',
        'archivado',
    ],
    INFORMATIVO: [
        'ingreso',
        'receptor',
        'oficio',
        'exhorto',
        'liquidación',
        'liquidacion',
        'recurso',
        'apelación',
        'apelacion',
    ],
};

/**
 * Analiza un array de movimientos y devuelve solo los relevantes.
 *
 * @param {Array} movimientos - Movimientos normalizados del PJUD
 * @param {string} rit
 * @returns {Array} movimientosRelevantes con { ...mov, nivel, palabrasClave }
 */
function detectarEventosCriticos(movimientos, rit) {
    const relevantes = [];

    for (const mov of movimientos) {
        const texto = [
            mov.descripcion,
            mov.tipo,
        ].join(' ').toLowerCase();

        let nivel = null;
        const palabrasEncontradas = [];

        // Verificar por nivel de criticidad (de mayor a menor)
        for (const [nivelKey, keywords] of Object.entries(KEYWORDS)) {
            for (const kw of keywords) {
                if (texto.includes(kw)) {
                    nivel = nivel || nivelKey; // El primer nivel encontrado gana
                    if (!palabrasEncontradas.includes(kw)) palabrasEncontradas.push(kw);
                }
            }
        }

        if (nivel) {
            relevantes.push({
                ...mov,
                rit,
                nivel,
                palabrasClave: palabrasEncontradas,
                detectadoAt: new Date().toISOString(),
            });
        }
    }

    logger.info(`[Detector] ${relevantes.length} de ${movimientos.length} movimientos son relevantes en ${rit}`);
    return relevantes;
}

/**
 * Compara los movimientos actuales con los previamente guardados
 * en Firestore para encontrar NOVEDADES (evitar duplicados).
 *
 * @param {Array} movimientosActuales
 * @param {Array} movimientosPrevios - guardados en Firestore
 * @returns {Array} soloNovidades
 */
function filtrarNovedades(movimientosActuales, movimientosPrevios) {
    // Crear un Set de hashes de los movimientos previos para comparación rápida
    const previosSet = new Set(
        movimientosPrevios.map(m => `${m.fecha}|${m.descripcion}`)
    );

    return movimientosActuales.filter(m =>
        !previosSet.has(`${m.fecha}|${m.descripcion}`)
    );
}

/**
 * Guarda los eventos críticos en Firestore y dispara el webhook.
 *
 * ESTRUCTURA EN FIRESTORE:
 * /radarEventos/{userId}/causas/{rit}/movimientos/{autoId}
 *   → fecha, tipo, descripcion, nivel, palabrasClave, detectadoAt
 *
 * /radarEventos/{userId}/alertas/{autoId}  (solo los críticos)
 *   → Para disparar notificaciones push al frontend
 *
 * @param {string} userId     - UID de Firebase del usuario
 * @param {string} rit
 * @param {Array} novedades   - Movimientos nuevos detectados
 */
async function guardarEnFirestoreYNotificar(userId, rit, novedades) {
    if (novedades.length === 0) {
        logger.info(`[Firestore] Sin novedades para ${rit}`);
        return;
    }

    const db = admin.firestore();
    const batch = db.batch();
    const ahora = admin.firestore.Timestamp.now();

    // ── 1. Guardar todos los movimientos nuevos ───────────────
    for (const mov of novedades) {
        const movRef = db
            .collection('radarEventos')
            .doc(userId)
            .collection('causas')
            .doc(rit)
            .collection('movimientos')
            .doc(); // ID automático

        batch.set(movRef, {
            ...mov,
            creadoAt: ahora,
        });
    }

    // ── 2. Guardar alertas solo para nivel CRITICO e IMPORTANTE ──
    const alertas = novedades.filter(m => ['CRITICO', 'IMPORTANTE'].includes(m.nivel));

    for (const alerta of alertas) {
        const alertaRef = db
            .collection('radarEventos')
            .doc(userId)
            .collection('alertas')
            .doc(); // ID automático

        batch.set(alertaRef, {
            rit,
            fecha: alerta.fecha,
            descripcion: alerta.descripcion,
            nivel: alerta.nivel,
            palabrasClave: alerta.palabrasClave,
            leido: false,
            creadoAt: ahora,
        });
    }

    // ── 3. Actualizar metadatos de la causa ──────────────────
    const causaRef = db
        .collection('radarEventos')
        .doc(userId)
        .collection('causas')
        .doc(rit);

    batch.set(causaRef, {
        rit,
        ultimaRevision: ahora,
        ultimoMovimiento: novedades[0]?.fecha || '',
        totalNovedades: admin.firestore.FieldValue.increment(novedades.length),
    }, { merge: true });

    // ── 4. Commit del batch ──────────────────────────────────
    await batch.commit();
    logger.info(`[Firestore] ✅ ${novedades.length} movimientos guardados para ${rit} (usuario: ${userId})`);

    if (alertas.length > 0) {
        logger.info(`[Firestore] 🚨 ${alertas.length} alertas críticas creadas`);
    }
}

module.exports = {
    detectarEventosCriticos,
    filtrarNovedades,
    guardarEnFirestoreYNotificar,
};
