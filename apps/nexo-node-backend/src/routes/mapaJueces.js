/**
 * Ruta Proxy — Mapa de Jueces
 * Reenvía requests al servidor Python FastAPI (puerto 8000)
 * manteniendo la auth Firebase centralizada en Node.js.
 */
const express = require('express');
const router = express.Router();

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

// Middleware de auth (reutilizar el mismo de radar.js)
const admin = require('firebase-admin');
async function requireAuth(req, res, next) {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    try {
        await admin.auth().verifyIdToken(token);
        next();
    } catch {
        res.status(403).json({ error: 'Token inválido' });
    }
}

// Función helper para llamar al servidor Python
async function callML(path) {
    const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
    const res = await fetch(`${ML_API_URL}${path}`, { timeout: 10000 });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Error del servidor ML' }));
        throw Object.assign(new Error(err.detail || 'Error ML'), { status: res.status });
    }
    return res.json();
}

// GET /api/jueces/predict?tribunal=JFAM001&materia=rebaja_pension
router.get('/predict', requireAuth, async (req, res) => {
    const { tribunal, materia } = req.query;
    if (!tribunal || !materia) return res.status(400).json({ error: 'Faltan tribunal y materia' });
    try {
        const data = await callML(`/predict?tribunal=${encodeURIComponent(tribunal)}&materia=${encodeURIComponent(materia)}`);
        res.json(data);
    } catch (err) {
        res.status(err.status || 503).json({ error: err.message });
    }
});

// GET /api/jueces/tribunal/:codigo
router.get('/tribunal/:codigo', requireAuth, async (req, res) => {
    try {
        res.json(await callML(`/tribunal/${req.params.codigo}`));
    } catch (err) {
        res.status(err.status || 503).json({ error: err.message });
    }
});

// GET /api/jueces/tribunales
router.get('/tribunales', requireAuth, async (req, res) => {
    try {
        res.json(await callML('/tribunales'));
    } catch (err) {
        res.status(503).json({ error: 'Servidor ML no disponible. Asegúrate de ejecutar nexo-ml.' });
    }
});

// GET /api/jueces/materias
router.get('/materias', requireAuth, async (req, res) => {
    try {
        res.json(await callML('/materias'));
    } catch (err) {
        res.status(503).json({ error: err.message });
    }
});

module.exports = router;
