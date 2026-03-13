/**
 * Script de Prueba del Scraper PJUD
 * ─────────────────────────────────────────────────────────────
 * Prueba el scraper SIN necesitar Firebase configurado.
 * Ejecutar con: node src/scraper/testRun.js
 *
 * Edita TEST_CONFIG con un RIT real para probarlo.
 */
require('dotenv').config();
const { getMovimientosPorRit } = require('./pjudApiClient');
const { detectarEventosCriticos } = require('./resolucionDetector');

// ── EDITA AQUÍ con un RIT real ─────────────────────────────
const TEST_CONFIG = {
    rit: 'C-1234-2023',  // ← Cambia por un RIT real
    codigoCorte: '15',            // 15 = Santiago, ver tabla abajo
    tribunal: 'JFAM001',       // Ver tabla abajo
};
// ──────────────────────────────────────────────────────────
//  Códigos de Corte más comunes:
//  '15' = Corte de Apelaciones de Santiago
//  '01' = Corte de Apelaciones de Arica
//  '02' = Corte de Apelaciones de Iquique
//  '03' = Corte de Apelaciones de Antofagasta
//  '09' = Corte de Apelaciones de Valparaíso
//  '18' = Corte de Apelaciones de Rancagua
//  '20' = Corte de Apelaciones de Talca
//
//  Códigos de Tribunal (Familia Santiago):
//  'JFAM001' = 1° Juzgado de Familia de Santiago
//  'JFAM002' = 2° Juzgado de Familia de Santiago
//  'JFAM003' = 3° Juzgado de Familia de Santiago
// ──────────────────────────────────────────────────────────

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║        NEXO BACKEND — Test del Scraper PJUD              ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    console.log('CONFIG:', TEST_CONFIG);
    console.log('─'.repeat(60));

    try {
        console.log('\n📡 Consultando PJUD...\n');
        const movimientos = await getMovimientosPorRit(TEST_CONFIG);

        if (movimientos.length === 0) {
            console.log('⚠️  No se encontraron movimientos.');
            console.log('   Posibles causas:');
            console.log('   - RIT incorrecto o causa no existe');
            console.log('   - Tribunal o corte incorrectos');
            console.log('   - El endpoint del PJUD respondió vacío');
            return;
        }

        console.log(`✅ ${movimientos.length} movimientos encontrados:\n`);
        movimientos.slice(0, 10).forEach((m, i) => {
            console.log(`  [${i + 1}] ${m.fecha || '???'} | ${m.tipo || ''}`);
            console.log(`       ${m.descripcion}`);
            if (m.folio) console.log(`       Folio: ${m.folio}`);
        });

        if (movimientos.length > 10) {
            console.log(`\n  ... y ${movimientos.length - 10} más.`);
        }

        // Detectar resoluciones
        console.log('\n─'.repeat(60));
        console.log('🔍 Analizando con motor de detección...\n');
        const eventos = detectarEventosCriticos(movimientos, TEST_CONFIG.rit);

        if (eventos.length === 0) {
            console.log('ℹ️  Sin resoluciones o eventos críticos detectados');
        } else {
            console.log(`🚨 ${eventos.length} evento(s) relevante(s) encontrado(s):\n`);
            eventos.forEach(e => {
                const icon = e.nivel === 'CRITICO' ? '🔴' : e.nivel === 'IMPORTANTE' ? '🟡' : '🔵';
                console.log(`  ${icon} [${e.nivel}] ${e.fecha}`);
                console.log(`     ${e.descripcion}`);
                console.log(`     Palabras clave: ${e.palabrasClave.join(', ')}`);
            });
        }

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        if (err.message.includes('403') || err.message.includes('Forbidden')) {
            console.log('\n💡 El PJUD bloqueó la request. Intenta:');
            console.log('   1. Cambiar SCRAPER_MODE=playwright en .env');
            console.log('   2. Esperar unos minutos antes de reintentar');
        }
    }
}

main();
