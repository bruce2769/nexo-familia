/**
 * Script de prueba del API del PJUD (sin Playwright, solo fetch)
 * Para verificar que los endpoints responden correctamente.
 * Ejecutar con: node src/scraper/testApi.js
 */
require('dotenv').config();

async function testEndpoints() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     NEXO BACKEND — Test de Conectividad PJUD             ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const endpoints = [
        {
            nombre: 'Health PJUD (OJV)',
            url: 'https://oficinajudicial.pjud.cl',
            method: 'GET',
        },
        {
            nombre: 'API Litigante PJUD',
            url: 'https://litigante.pjud.cl/rest/causas/getByRit',
            method: 'POST',
            body: { codigoCorte: '15', tribunal: 'JFAM001', tipoCausa: 'C', numeroCausa: '1234', anio: '2023' },
        },
    ];

    const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

    for (const ep of endpoints) {
        process.stdout.write(`🔍 ${ep.nombre}... `);
        const start = Date.now();
        try {
            const res = await fetch(ep.url, {
                method: ep.method,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*',
                    'Referer': 'https://oficinajudicial.pjud.cl/',
                },
                body: ep.body ? JSON.stringify(ep.body) : undefined,
                timeout: 10000,
            });
            const ms = Date.now() - start;
            const status = res.status;
            const statusIcon = status < 400 ? '✅' : status === 403 ? '🚫' : '⚠️';
            console.log(`${statusIcon} HTTP ${status} (${ms}ms)`);

            if (status === 200) {
                try {
                    const text = await res.text();
                    const preview = text.substring(0, 200);
                    console.log(`   Respuesta: ${preview}...`);
                } catch { }
            } else if (status === 403) {
                console.log('   → El endpoint existe pero bloquea bots. Usar SCRAPER_MODE=playwright');
            }
        } catch (err) {
            const ms = Date.now() - start;
            console.log(`❌ Error (${ms}ms): ${err.message}`);
        }
    }

    console.log('\n─'.repeat(60));
    console.log('Si todos los endpoints devuelven 403 o error,');
    console.log('cambia SCRAPER_MODE=playwright en tu .env\n');
}

testEndpoints();
