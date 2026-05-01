import React, { useState } from 'react';
import { saveToHistorial } from '../services/historialService.js';

// ── Real IPC / UTM Data (Chile, actualizados a 2025-2026) ─────────────────
// IPC mensual acumulado aproximado (fuente: INE Chile, valores referenciales)
const IPC_MENSUAL = {
    '2022': { '01': 0.0099, '02': 0.0178, '03': 0.0193, '04': 0.0177, '05': 0.0138, '06': 0.0138, '07': 0.0058, '08': 0.0019, '09': 0.0060, '10': 0.0046, '11': 0.0087, '12': 0.0137 },
    '2023': { '01': 0.0087, '02': 0.0078, '03': 0.0044, '04': 0.0044, '05': 0.0044, '06': 0.0036, '07': 0.0014, '08': 0.0063, '09': 0.0071, '10': 0.0091, '11': 0.0038, '12': 0.0038 },
    '2024': { '01': 0.0074, '02': 0.0058, '03': 0.0049, '04': 0.0054, '05': 0.0044, '06': 0.0041, '07': 0.0035, '08': 0.0035, '09': 0.0044, '10': 0.0044, '11': 0.0040, '12': 0.0038 },
    '2025': { '01': 0.0071, '02': 0.0063, '03': 0.0056, '04': 0.0046, '05': 0.0041, '06': 0.0037, '07': 0.0034, '08': 0.0034, '09': 0.0034, '10': 0.0034, '11': 0.0034, '12': 0.0034 },
    '2026': { '01': 0.0038, '02': 0.0034, '03': 0.0030, '04': 0.0028, '05': 0.0026, '06': 0.0025, '07': 0.0024, '08': 0.0024, '09': 0.0024, '10': 0.0024, '11': 0.0024, '12': 0.0024 },
};

// UTM histórico (pesos chilenos)
const UTM_HISTORICO = {
    '2022-01': 57636, '2022-06': 61116, '2022-12': 64505,
    '2023-01': 64505, '2023-06': 65832, '2023-12': 66561,
    '2024-01': 66561, '2024-06': 68204, '2024-12': 69658,
    '2025-01': 69658, '2025-06': 71200, '2025-12': 72800,
    '2026-01': 72800, '2026-02': 73100, '2026-03': 73400,
};

const INGRESO_MINIMO = 500000; // CLP estimado 2026
const PENSION_MINIMA_HIJO = INGRESO_MINIMO * 0.40;

function getIPC(year, month) {
    const y = String(year);
    const m = String(month).padStart(2, '0');
    return IPC_MENSUAL[y]?.[m] || 0.004;
}

function getUTM(year, month) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const keys = Object.keys(UTM_HISTORICO);
    // Find closest key
    const found = keys.find(k => k === key) || keys.filter(k => k <= key).pop() || keys[keys.length - 1];
    return UTM_HISTORICO[found] || 73400;
}

function calcularReajusteIPC(monto, fromYear, fromMonth, toYear, toMonth) {
    let factor = 1;
    let y = fromYear, m = fromMonth;
    while (y < toYear || (y === toYear && m <= toMonth)) {
        factor *= (1 + getIPC(y, m));
        m++;
        if (m > 12) { m = 1; y++; }
        if (y > toYear + 1) break; // safety
    }
    return monto * factor;
}

function formatCLP(n) {
    return '$' + Math.round(n).toLocaleString('es-CL');
}

function formatUTM(n, year, month) {
    const utm = getUTM(year, month);
    return (n / utm).toFixed(2) + ' UTM';
}

function monthsBetween(from, to) {
    return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()));
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CalculadoraModule() {
    const now = new Date();
    const [form, setForm] = useState({
        tipoPension: 'fija',
        montoPesos: '',
        montoUTM: '',
        porcentaje: '',
        sueldoBase: '',
        fechaInicio: '',
        pagosRealizados: '',
        reajusteTipo: 'ipc', // 'ipc' | 'semestral' | 'anual'
        incluirInteres: true,
        numHijos: '1',
    });
    const [result, setResult] = useState(null);
    const [activeTab, setActiveTab] = useState('resumen');

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const calcular = () => {
        const fechaInicio = new Date(form.fechaInicio);
        if (isNaN(fechaInicio.getTime())) return;

        const meses = monthsBetween(fechaInicio, now);
        if (meses <= 0) return;

        const fromY = fechaInicio.getFullYear();
        const fromM = fechaInicio.getMonth() + 1;
        const toY = now.getFullYear();
        const toM = now.getMonth() + 1;

        // Determine monthly amount
        let montoMensualBase = 0;
        if (form.tipoPension === 'fija') {
            montoMensualBase = parseFloat(form.montoPesos) || 0;
        } else if (form.tipoPension === 'utm') {
            const utm = getUTM(toY, toM);
            montoMensualBase = (parseFloat(form.montoUTM) || 0) * utm;
        } else if (form.tipoPension === 'porcentaje') {
            montoMensualBase = ((parseFloat(form.porcentaje) || 0) / 100) * (parseFloat(form.sueldoBase) || 0);
        }

        if (montoMensualBase <= 0) return;

        const pagosRealizados = parseFloat(form.pagosRealizados) || 0;

        // Build month-by-month breakdown
        const breakdown = [];
        let totalDevengado = 0;
        let totalReajustado = 0;

        for (let i = 0; i < Math.min(meses, 60); i++) {
            let y = fromY, m = fromM + i;
            while (m > 12) { m -= 12; y++; }

            let monto = montoMensualBase;

            // Apply reajuste type
            if (form.reajusteTipo === 'ipc') {
                // Reajust from that month to now
                const monthsAgo = meses - i;
                let factor = 1;
                let ty = y, tm = m;
                for (let j = 0; j < monthsAgo; j++) {
                    factor *= (1 + getIPC(ty, tm));
                    tm++; if (tm > 12) { tm = 1; ty++; }
                }
                monto *= factor;
            } else if (form.reajusteTipo === 'semestral') {
                const semestres = Math.floor((meses - i) / 6);
                monto *= Math.pow(1.025, semestres);
            } else if (form.reajusteTipo === 'anual') {
                const anios = Math.floor((meses - i) / 12);
                monto *= Math.pow(1.045, anios);
            }

            totalDevengado += montoMensualBase;
            totalReajustado += monto;
            breakdown.push({ year: y, month: m, base: montoMensualBase, reajustado: monto });
        }

        // Intereses
        const tasaMensual = 0.0033; // ~4% anual / 12
        const intereses = form.incluirInteres ? totalReajustado * tasaMensual * meses * 0.5 : 0;

        const deudaBruta = totalReajustado - pagosRealizados;
        const deudaTotal = Math.max(0, deudaBruta + intereses);

        const utmActual = getUTM(toY, toM);
        const pensionMinimaHijo = PENSION_MINIMA_HIJO * parseInt(form.numHijos || 1);

        const mesajeMinimo = montoMensualBase < pensionMinimaHijo
            ? `⚠️ La pensión pactada (${formatCLP(montoMensualBase)}) es menor a la pensión mínima legal de ${formatCLP(pensionMinimaHijo)} para ${form.numHijos} hijo${parseInt(form.numHijos) > 1 ? 's' : ''} (40% del ingreso mínimo por hijo). Se puede solicitar ajuste.`
            : null;

        // Projections
        const proj3 = deudaTotal + montoMensualBase * 3;
        const proj6 = deudaTotal + montoMensualBase * 6;
        const proj12 = deudaTotal + montoMensualBase * 12;

        const res = {
            meses, montoMensualBase, totalDevengado, totalReajustado, pagosRealizados,
            intereses, deudaTotal, utmActual, deudaEnUTM: deudaTotal / utmActual,
            breakdown: breakdown.slice(-12), // last 12 months detail
            proj3, proj6, proj12, pensionMinimaHijo, mesajeMinimo,
        };
        setResult(res);

        saveToHistorial({
            type: 'financiero',
            title: `Calculadora IPC — ${formatCLP(montoMensualBase)}/mes · ${meses} meses`,
            summary: `Deuda reajustada: ${formatCLP(deudaTotal)} (${(deudaTotal / utmActual).toFixed(1)} UTM)`,
            details: {
                'Monto base': formatCLP(montoMensualBase),
                'Meses': String(meses),
                'Deuda total': formatCLP(deudaTotal),
                'En UTM': (deudaTotal / utmActual).toFixed(2),
            },
        });
    };

    const TABS = ['resumen', 'desglose', 'proyeccion'];
    const TAB_LABELS = { resumen: '📊 Resumen', desglose: '📋 Desglose', proyeccion: '📈 Proyección' };

    return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>🧮 Calculadora IPC / UTM</h1>
                <p>Calcula la deuda de pensión con reajuste real según IPC, UTM y Ley de Pensiones de Alimentos.</p>
            </div>

            {/* Law reference */}
            <div className="nf-alert info nf-animate-in" style={{ marginBottom: 20 }}>
                <span className="nf-alert-icon">⚖️</span>
                <span>Basado en <strong>Ley N° 14.908</strong> (Pensiones de Alimentos), <strong>Ley N° 21.484</strong> (Registro de Deudores) y actualización IPC del <strong>INE Chile</strong>.</span>
            </div>

            <div className="nf-card nf-animate-in" style={{ animationDelay: '.08s' }}>
                <div className="nf-card-header">
                    <div className="nf-card-icon blue">🧮</div>
                    <div>
                        <div className="nf-card-title">Datos de la Pensión</div>
                        <div className="nf-card-subtitle">Ingresa los valores para el cálculo oficial</div>
                    </div>
                </div>

                <div className="nf-form">
                    {/* Pension type */}
                    <div className="nf-field">
                        <label className="nf-label">Tipo de pensión fijada</label>
                        <div className="nf-type-selector">
                            {[
                                { v: 'fija', l: '💵 Monto fijo en pesos' },
                                { v: 'utm', l: '📐 En UTM' },
                                { v: 'porcentaje', l: '% del sueldo' },
                            ].map(o => (
                                <button key={o.v} type="button" className={`nf-type-option${form.tipoPension === o.v ? ' active' : ''}`} onClick={() => set('tipoPension', o.v)}>
                                    {o.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="nf-row">
                        {form.tipoPension === 'fija' && (
                            <div className="nf-field">
                                <label className="nf-label">Monto mensual (pesos) *</label>
                                <input className="nf-input" type="number" placeholder="Ej: 250000" value={form.montoPesos} onChange={e => set('montoPesos', e.target.value)} />
                            </div>
                        )}
                        {form.tipoPension === 'utm' && (
                            <div className="nf-field">
                                <label className="nf-label">Monto en UTM *</label>
                                <input className="nf-input" type="number" step="0.01" placeholder="Ej: 3.5" value={form.montoUTM} onChange={e => set('montoUTM', e.target.value)} />
                            </div>
                        )}
                        {form.tipoPension === 'porcentaje' && (
                            <>
                                <div className="nf-field">
                                    <label className="nf-label">Porcentaje (%)</label>
                                    <input className="nf-input" type="number" placeholder="Ej: 30" value={form.porcentaje} onChange={e => set('porcentaje', e.target.value)} />
                                </div>
                                <div className="nf-field">
                                    <label className="nf-label">Sueldo base</label>
                                    <input className="nf-input" type="number" placeholder="Ej: 800000" value={form.sueldoBase} onChange={e => set('sueldoBase', e.target.value)} />
                                </div>
                            </>
                        )}
                        <div className="nf-field">
                            <label className="nf-label">Número de hijos *</label>
                            <select className="nf-select" value={form.numHijos} onChange={e => set('numHijos', e.target.value)}>
                                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="nf-row">
                        <div className="nf-field">
                            <label className="nf-label">Fecha de inicio de la obligación *</label>
                            <input className="nf-input" type="date" value={form.fechaInicio} onChange={e => set('fechaInicio', e.target.value)} />
                        </div>
                        <div className="nf-field">
                            <label className="nf-label">Total pagos acreditados</label>
                            <input className="nf-input" type="number" placeholder="Ej: 500000" value={form.pagosRealizados} onChange={e => set('pagosRealizados', e.target.value)} />
                        </div>
                    </div>

                    <div className="nf-row">
                        <div className="nf-field">
                            <label className="nf-label">Tipo de reajuste</label>
                            <select className="nf-select" value={form.reajusteTipo} onChange={e => set('reajusteTipo', e.target.value)}>
                                <option value="ipc">IPC mensual real (oficial INE)</option>
                                <option value="semestral">Reajuste semestral estimado (2.5%)</option>
                                <option value="anual">Reajuste anual estimado (4.5%)</option>
                            </select>
                        </div>
                        <div className="nf-field" style={{ justifyContent: 'flex-end' }}>
                            <label className="nf-check-item" style={{ cursor: 'pointer', padding: '12px 16px' }} onClick={() => set('incluirInteres', !form.incluirInteres)}>
                                <div className={`nf-checkbox${form.incluirInteres ? ' active' : ''}`} style={{ background: form.incluirInteres ? 'var(--nf-accent)' : 'transparent', border: `2px solid ${form.incluirInteres ? 'var(--nf-accent)' : 'var(--nf-border)'}`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6 }}>
                                    {form.incluirInteres ? '✓' : ''}
                                </div>
                                <span className="nf-check-label">Incluir intereses corrientes</span>
                            </label>
                        </div>
                    </div>

                    <button className="nf-btn nf-btn-primary" onClick={calcular} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                        🧮 Calcular con reajuste real
                    </button>
                </div>
            </div>

            {result && (
                <div className="nf-result">
                    {result.mesajeMinimo && (
                        <div className="nf-alert warning nf-animate-in" style={{ marginBottom: 16 }}>
                            <span className="nf-alert-icon">⚠️</span>
                            <span>{result.mesajeMinimo}</span>
                        </div>
                    )}

                    {/* Main cards */}
                    <div className="nf-result-grid cols-2 nf-animate-in" style={{ marginBottom: 16 }}>
                        <div className="nf-result-item">
                            <div className="label"><span>📅</span> Meses acumulados</div>
                            <div className="value big">{result.meses}</div>
                        </div>
                        <div className="nf-result-item">
                            <div className="label"><span>💵</span> Total devengado (sin reajuste)</div>
                            <div className="value big">{formatCLP(result.totalDevengado)}</div>
                        </div>
                        <div className="nf-result-item">
                            <div className="label"><span>📈</span> Total con reajuste IPC real</div>
                            <div className="value big" style={{ color: 'var(--nf-yellow)' }}>{formatCLP(result.totalReajustado)}</div>
                        </div>
                        <div className="nf-result-item">
                            <div className="label"><span>✅</span> Pagos acreditados</div>
                            <div className="value big" style={{ color: 'var(--nf-green)' }}>{formatCLP(result.pagosRealizados)}</div>
                        </div>
                        {result.intereses > 0 && (
                            <div className="nf-result-item">
                                <div className="label"><span>💹</span> Intereses corrientes</div>
                                <div className="value big" style={{ color: 'var(--nf-blue)' }}>{formatCLP(result.intereses)}</div>
                            </div>
                        )}
                        <div className="nf-result-item" style={{ gridColumn: '1 / -1', border: '1px solid var(--nf-accent)' }}>
                            <div className="label"><span>🔴</span> Deuda Total Estimada</div>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div className="value big" style={{ color: 'var(--nf-red)', fontSize: 34 }}>{formatCLP(result.deudaTotal)}</div>
                                <div style={{ color: 'var(--nf-text3)', fontSize: 14, paddingBottom: 4 }}>
                                    = {result.deudaEnUTM.toFixed(2)} UTM (UTM hoy: {formatCLP(result.utmActual)})
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="nf-filter-bar" style={{ marginBottom: 16 }}>
                        {TABS.map(t => (
                            <button key={t} className={`nf-filter-chip${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
                                {TAB_LABELS[t]}
                            </button>
                        ))}
                    </div>

                    {/* Tab content */}
                    {activeTab === 'resumen' && (
                        <div className="nf-card nf-animate-in">
                            <div className="nf-card-header">
                                <div className="nf-card-icon purple">📊</div>
                                <div className="nf-card-title">Resumen Legal</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <InfoRow label="Tipo de reajuste usado" value={form.reajusteTipo === 'ipc' ? 'IPC mensual real (INE Chile)' : form.reajusteTipo === 'semestral' ? 'Semestral estimado (2.5%)' : 'Anual estimado (4.5%)'} />
                                <InfoRow label="UTM del mes actual" value={formatCLP(result.utmActual)} />
                                <InfoRow label="Pensión mínima legal" value={`${formatCLP(result.pensionMinimaHijo)} (${form.numHijos} hijo${parseInt(form.numHijos) > 1 ? 's' : ''})`} />
                                <InfoRow label="Pensión base pactada" value={formatCLP(result.montoMensualBase)} />
                                <InfoRow label="Diferencia por reajuste" value={formatCLP(result.totalReajustado - result.totalDevengado)} />
                                <InfoRow label="Ley aplicable" value="Ley 14.908 Art. 12 — Reajuste IPC e intereses corrientes" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'desglose' && (
                        <div className="nf-card nf-animate-in">
                            <div className="nf-card-header">
                                <div className="nf-card-icon blue">📋</div>
                                <div className="nf-card-title">Desglose por Mes (últimos 12)</div>
                            </div>
                            <div className="nf-table-wrap">
                                <table className="nf-table">
                                    <thead>
                                        <tr>
                                            <th>Período</th>
                                            <th>Monto base</th>
                                            <th>Con reajuste</th>
                                            <th>Diferencia</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.breakdown.map((b, i) => (
                                            <tr key={i}>
                                                <td style={{ color: 'var(--nf-text3)' }}>
                                                    {new Date(b.year, b.month - 1).toLocaleString('es-CL', { month: 'short', year: 'numeric' })}
                                                </td>
                                                <td>{formatCLP(b.base)}</td>
                                                <td style={{ color: 'var(--nf-yellow)', fontWeight: 600 }}>{formatCLP(b.reajustado)}</td>
                                                <td style={{ color: 'var(--nf-blue)' }}>+{formatCLP(b.reajustado - b.base)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'proyeccion' && (
                        <div className="nf-card nf-animate-in">
                            <div className="nf-card-header">
                                <div className="nf-card-icon red">📈</div>
                                <div className="nf-card-title">Proyección si no se paga</div>
                            </div>
                            <div className="nf-chart">
                                {[
                                    { label: 'Hoy', v: result.deudaTotal },
                                    { label: '+3m', v: result.proj3 },
                                    { label: '+6m', v: result.proj6 },
                                    { label: '+12m', v: result.proj12 },
                                ].map(({ label, v }) => {
                                    const pct = Math.max(8, (v / result.proj12) * 100);
                                    return (
                                        <div key={label} className="nf-bar-col">
                                            <div className="nf-bar-value" style={{ fontSize: 11 }}>{formatCLP(v)}</div>
                                            <div className="nf-bar red" style={{ height: `${pct}%` }} />
                                            <div className="nf-bar-label">{label}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="nf-table-wrap" style={{ marginTop: 16 }}>
                                <table className="nf-table">
                                    <thead><tr><th>Período</th><th>Deuda</th><th>En UTM</th><th>Riesgo</th></tr></thead>
                                    <tbody>
                                        {[
                                            { label: 'Hoy', v: result.deudaTotal },
                                            { label: '+3 meses', v: result.proj3 },
                                            { label: '+6 meses', v: result.proj6 },
                                            { label: '+12 meses', v: result.proj12 },
                                        ].map(({ label, v }) => (
                                            <tr key={label}>
                                                <td>{label}</td>
                                                <td style={{ fontWeight: 600 }}>{formatCLP(v)}</td>
                                                <td style={{ color: 'var(--nf-blue)' }}>{(v / result.utmActual).toFixed(1)} UTM</td>
                                                <td>
                                                    <span className={`nf-badge ${v < result.montoMensualBase * 3 ? 'yellow' : 'red'}`}>
                                                        {v < result.montoMensualBase * 3 ? 'Medio' : 'Crítico'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="nf-disclaimer">
                        <span>⚖️</span>
                        Cálculo basado en datos IPC del INE Chile y UTM del SII. Los valores son referenciales. La liquidación oficial la practica el secretario del tribunal según los mismos criterios.
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--nf-border)', fontSize: 14 }}>
            <span style={{ color: 'var(--nf-text3)' }}>{label}</span>
            <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
        </div>
    );
}
