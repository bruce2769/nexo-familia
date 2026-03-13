import React, { useState, useEffect } from 'react';
import { saveToHistorial } from './HistorialModule.jsx';

function parseNumber(val) {
    return parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
}

function formatCLP(n) {
    return '$' + Math.round(n).toLocaleString('es-CL');
}

function monthsDiff(dateStr) {
    if (!dateStr) return 0;
    const from = new Date(dateStr);
    const now = new Date();
    return Math.max(0, (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth()));
}

const PENSION_TYPES = [
    { id: 'fija', label: 'Monto Fijo', icon: '💵', desc: 'Monto fijo mensual en pesos' },
    { id: 'porcentaje', label: '% del Sueldo', icon: '📊', desc: 'Porcentaje del ingreso del alimentante' },
    { id: 'mixta', label: 'Mixta', icon: '🔄', desc: 'Monto fijo + porcentaje' },
];

/**
 * Calcula el reajuste IPC acumulado entre fechaDesde y hoy.
 * Usa la serie mensual de mindicador.cl (variaciones % mes a mes).
 * Retorna { tasa: número (ej: 0.044), detalle: string }
 */
function calcularReajisteIPC(serieIPC, fechaDesde) {
    if (!serieIPC || serieIPC.length === 0 || !fechaDesde) {
        return { tasa: 0.035, detalle: 'fallback 3.5% anual (sin datos IPC)', esFallback: true };
    }

    const desde = new Date(fechaDesde);
    const hasta = new Date();

    // Filtrar y ordenar meses dentro del rango (más antiguo → más reciente)
    const mesesFiltrados = serieIPC
        .filter(item => {
            const fecha = new Date(item.fecha);
            return fecha >= desde && fecha <= hasta;
        })
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    if (mesesFiltrados.length === 0) {
        return { tasa: 0.035, detalle: 'fallback 3.5% anual (sin meses en rango)', esFallback: true };
    }

    // Calcular producto acumulado: (1 + r1)*(1 + r2)*...*(1 + rN) - 1
    let producto = 1.0;
    for (const item of mesesFiltrados) {
        producto *= (1 + item.valor / 100);
    }
    const tasaAcumulada = producto - 1;

    const ultimoIPC = mesesFiltrados[mesesFiltrados.length - 1];
    const fechaUltimo = new Date(ultimoIPC.fecha);
    const mesUltimo = fechaUltimo.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });

    return {
        tasa: tasaAcumulada,
        detalle: `${(tasaAcumulada * 100).toFixed(2)}% acumulado (${mesesFiltrados.length} meses, último IPC: ${ultimoIPC.valor > 0 ? '+' : ''}${ultimoIPC.valor}% ${mesUltimo})`,
        esFallback: false
    };
}

export default function FinancieroModule() {
    const [form, setForm] = useState({
        tipoPension: 'fija',
        monto: '',
        porcentaje: '',
        sueldo: '',
        fecha: '',
        pagos: '',
        liquidacion: '',
        pagoSimulado: '',
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    // ── Estado del IPC real ──────────────────────────────────────────────────
    const [serieIPC, setSerieIPC] = useState(null);
    const [ipcStatus, setIpcStatus] = useState('loading'); // 'loading' | 'ok' | 'error'
    const [ipcBadge, setIpcBadge] = useState('📡 Cargando IPC real...');

    useEffect(() => {
        const fetchIPC = async () => {
            try {
                const res = await fetch('https://mindicador.cl/api/ipc', {
                    signal: AbortSignal.timeout(8000)
                });
                if (!res.ok) throw new Error('Response not OK');
                const data = await res.json();
                const serie = data.serie || [];
                setSerieIPC(serie);
                setIpcStatus('ok');

                // Mostrar último valor
                if (serie.length > 0) {
                    const ultimo = serie[0]; // ya viene ordenado desc
                    const fecha = new Date(ultimo.fecha);
                    const mes = fecha.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
                    const val = ultimo.valor;
                    setIpcBadge(`✅ IPC real cargado (${mes}: ${val > 0 ? '+' : ''}${val}%)`);
                }
            } catch {
                setIpcStatus('error');
                setSerieIPC([]);
                setIpcBadge('⚠️ IPC no disponible — usando tasa fija 3.5% anual');
            }
        };
        fetchIPC();
    }, []);

    const calcMonto = () => {
        if (form.tipoPension === 'fija') return parseNumber(form.monto);
        if (form.tipoPension === 'porcentaje') return parseNumber(form.sueldo) * (parseNumber(form.porcentaje) / 100);
        return parseNumber(form.monto) + parseNumber(form.sueldo) * (parseNumber(form.porcentaje) / 100);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const monto = calcMonto();
        if (monto <= 0) return;
        setLoading(true);
        setTimeout(() => {
            const meses = monthsDiff(form.fecha);
            const totalDevengado = monto * Math.max(meses, 1);
            const pagosRealizados = parseNumber(form.pagos);
            const liquidacionVal = parseNumber(form.liquidacion);
            const deuda = Math.max(0, totalDevengado - pagosRealizados);

            // ── Reajuste IPC real ────────────────────────────────────────────
            const { tasa: tasaIPC, detalle: detalleIPC, esFallback } = calcularReajisteIPC(serieIPC, form.fecha);
            const reajuste = deuda * tasaIPC;
            const deudaReajustada = deuda + reajuste;

            const proj3 = deudaReajustada + monto * 3;
            const proj6 = deudaReajustada + monto * 6;
            const proj12 = deudaReajustada + monto * 12;

            // Simulation
            const pagoSim = parseNumber(form.pagoSimulado);
            const deudaDespuesSim = Math.max(0, deudaReajustada - pagoSim);
            const mesesParaPagar = deudaReajustada > 0 ? Math.ceil(deudaReajustada / monto) : 0;

            const alerts = [];
            if (deuda > monto * 2) alerts.push({ type: 'danger', icon: '🚨', text: `Con ${meses} meses de deuda acumulada, existe riesgo de inscripción en el Registro Nacional de Deudores de Pensiones de Alimentos.` });
            if (deuda > monto * 3) alerts.push({ type: 'danger', icon: '⛓️', text: 'El tribunal podría decretar arresto nocturno u orden de retención de fondos bancarios.' });
            if (deuda > 0 && deuda <= monto * 2) alerts.push({ type: 'warning', icon: '⚠️', text: 'Se recomienda regularizar los pagos lo antes posible para evitar medidas de apremio.' });
            if (liquidacionVal > 0 && liquidacionVal > deudaReajustada) alerts.push({ type: 'info', icon: 'ℹ️', text: 'La liquidación presentada supera la deuda estimada. Podría haber partidas adicionales incluidas.' });
            if (pagosRealizados > 0 && deuda > 0) alerts.push({ type: 'warning', icon: '📋', text: 'Se registran pagos parciales. Guarda comprobantes para acreditarlos ante el tribunal.' });

            const res = { meses, monto, totalDevengado, pagosRealizados, deuda, reajuste, deudaReajustada, liquidacionVal, proj3, proj6, proj12, alerts, pagoSim, deudaDespuesSim, mesesParaPagar, tasaIPC, detalleIPC, esFallback };
            setResult(res);
            setLoading(false);

            saveToHistorial({
                type: 'financiero',
                title: `Cálculo financiero — ${formatCLP(monto)}/mes`,
                summary: `Deuda estimada: ${formatCLP(deudaReajustada)} — ${meses} meses acumulados`,
                details: {
                    'Monto mensual': formatCLP(monto),
                    'Meses acumulados': meses.toString(),
                    'Deuda estimada': formatCLP(deudaReajustada),
                    'Reajuste IPC': detalleIPC,
                    'Pagos realizados': formatCLP(pagosRealizados),
                },
            });
        }, 1000);
    };

    const handleReset = () => {
        setResult(null);
        setForm({ tipoPension: 'fija', monto: '', porcentaje: '', sueldo: '', fecha: '', pagos: '', liquidacion: '', pagoSimulado: '' });
    };

    return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>💰 Impacto Financiero</h1>
                <p>Calcula la estimación de deuda acumulada, proyecciones y simula escenarios de pago.</p>
            </div>

            {/* Badge IPC */}
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 20, marginBottom: 16,
                fontSize: 13, fontWeight: 600,
                background: ipcStatus === 'ok' ? 'rgba(16,185,129,0.1)' : ipcStatus === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                border: `1px solid ${ipcStatus === 'ok' ? 'rgba(16,185,129,0.3)' : ipcStatus === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                color: ipcStatus === 'ok' ? 'var(--nf-green)' : ipcStatus === 'error' ? 'var(--nf-red)' : '#f59e0b',
            }}>
                {ipcStatus === 'loading' && <div style={{ width: 10, height: 10, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'nf-spin 1s linear infinite' }} />}
                {ipcBadge}
            </div>

            {!result ? (
                <div className="nf-card nf-animate-in" style={{ animationDelay: '.08s' }}>
                    <div className="nf-card-header">
                        <div className="nf-card-icon blue">📊</div>
                        <div>
                            <div className="nf-card-title">Datos Financieros</div>
                            <div className="nf-card-subtitle">Ingresa los valores conocidos</div>
                        </div>
                    </div>

                    <form className="nf-form" onSubmit={handleSubmit}>
                        {/* Pension Type Selector */}
                        <div className="nf-field">
                            <label className="nf-label">Tipo de Pensión</label>
                            <div className="nf-type-selector">
                                {PENSION_TYPES.map(pt => (
                                    <button
                                        type="button"
                                        key={pt.id}
                                        className={`nf-type-option${form.tipoPension === pt.id ? ' active' : ''}`}
                                        onClick={() => setForm({ ...form, tipoPension: pt.id })}
                                    >
                                        <span>{pt.icon}</span> {pt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="nf-row">
                            {(form.tipoPension === 'fija' || form.tipoPension === 'mixta') && (
                                <div className="nf-field">
                                    <label className="nf-label">Monto Fijo (mensual) *</label>
                                    <input className="nf-input" type="text" placeholder="Ej: 250000" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} required={form.tipoPension === 'fija'} />
                                </div>
                            )}
                            {(form.tipoPension === 'porcentaje' || form.tipoPension === 'mixta') && (
                                <>
                                    <div className="nf-field">
                                        <label className="nf-label">Porcentaje (%)</label>
                                        <input className="nf-input" type="text" placeholder="Ej: 30" value={form.porcentaje} onChange={e => setForm({ ...form, porcentaje: e.target.value })} />
                                    </div>
                                    <div className="nf-field">
                                        <label className="nf-label">Sueldo del Alimentante</label>
                                        <input className="nf-input" type="text" placeholder="Ej: 800000" value={form.sueldo} onChange={e => setForm({ ...form, sueldo: e.target.value })} />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="nf-row">
                            <div className="nf-field">
                                <label className="nf-label">Fecha Desde *</label>
                                <input className="nf-input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required />
                            </div>
                            <div className="nf-field">
                                <label className="nf-label">Total Pagos Realizados</label>
                                <input className="nf-input" type="text" placeholder="Ej: 500000" value={form.pagos} onChange={e => setForm({ ...form, pagos: e.target.value })} />
                            </div>
                        </div>

                        <div className="nf-row">
                            <div className="nf-field">
                                <label className="nf-label">Liquidación (si existe)</label>
                                <input className="nf-input" type="text" placeholder="Ej: 1200000" value={form.liquidacion} onChange={e => setForm({ ...form, liquidacion: e.target.value })} />
                            </div>
                            <div className="nf-field">
                                <label className="nf-label">💡 Simular: ¿Si pago ahora?</label>
                                <input className="nf-input" type="text" placeholder="Ej: 300000" value={form.pagoSimulado} onChange={e => setForm({ ...form, pagoSimulado: e.target.value })} />
                            </div>
                        </div>

                        <button type="submit" className="nf-btn nf-btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                            {loading ? <>⏳ Calculando...</> : <>📈 Calcular Impacto</>}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="nf-result">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <span className="nf-badge blue">✅ Cálculo completado</span>
                        <button className="nf-btn nf-btn-ghost" onClick={handleReset}>← Nuevo cálculo</button>
                    </div>

                    {/* Badge IPC en resultado */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                        padding: '10px 16px', borderRadius: 10,
                        background: result.esFallback ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
                        border: `1px solid ${result.esFallback ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                        fontSize: 13,
                        color: result.esFallback ? '#f59e0b' : 'var(--nf-green)',
                    }}>
                        <span>{result.esFallback ? '⚠️' : '📊'}</span>
                        <span>
                            <strong>Reajuste aplicado:</strong> {result.detalleIPC}
                            {result.esFallback && ' — conecta a internet para datos reales'}
                        </span>
                    </div>

                    <div className="nf-result-grid cols-2" style={{ marginBottom: 20 }}>
                        <div className="nf-result-item nf-animate-in">
                            <div className="label"><span>📅</span> Meses Acumulados</div>
                            <div className="value big">{result.meses}</div>
                        </div>
                        <div className="nf-result-item nf-animate-in">
                            <div className="label"><span>💵</span> Total Devengado</div>
                            <div className="value big">{formatCLP(result.totalDevengado)}</div>
                        </div>
                        <div className="nf-result-item nf-animate-in">
                            <div className="label"><span>✅</span> Pagos Acreditados</div>
                            <div className="value big" style={{ color: 'var(--nf-green)' }}>{formatCLP(result.pagosRealizados)}</div>
                        </div>
                        <div className="nf-result-item nf-animate-in">
                            <div className="label"><span>📈</span> Reajuste IPC Aplicado</div>
                            <div className="value big" style={{ color: '#f59e0b' }}>{formatCLP(result.reajuste)}</div>
                        </div>
                        <div className="nf-result-item nf-animate-in" style={{ gridColumn: '1 / -1' }}>
                            <div className="label"><span>🔴</span> Deuda Estimada (con reajuste IPC real)</div>
                            <div className="value big" style={{ color: 'var(--nf-red)' }}>{formatCLP(result.deudaReajustada)}</div>
                        </div>
                    </div>

                    {/* Simulation result */}
                    {result.pagoSim > 0 && (
                        <div className="nf-card nf-animate-in" style={{ marginBottom: 20 }}>
                            <div className="nf-card-header">
                                <div className="nf-card-icon green">💡</div>
                                <div>
                                    <div className="nf-card-title">Simulación de Pago</div>
                                    <div className="nf-card-subtitle">Si pagas {formatCLP(result.pagoSim)} ahora</div>
                                </div>
                            </div>
                            <div className="nf-result-grid cols-2">
                                <div className="nf-result-item">
                                    <div className="label"><span>💸</span> Deuda Después del Pago</div>
                                    <div className="value big" style={{ color: result.deudaDespuesSim > 0 ? 'var(--nf-yellow)' : 'var(--nf-green)' }}>
                                        {formatCLP(result.deudaDespuesSim)}
                                    </div>
                                </div>
                                <div className="nf-result-item">
                                    <div className="label"><span>📅</span> Meses para Pagar Total</div>
                                    <div className="value big">{result.mesesParaPagar}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Projection Chart */}
                    <div className="nf-card nf-animate-in" style={{ marginBottom: 20 }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon blue">📈</div>
                            <div>
                                <div className="nf-card-title">Proyección de Deuda</div>
                                <div className="nf-card-subtitle">Si no se realizan pagos adicionales</div>
                            </div>
                        </div>
                        <div className="nf-chart">
                            <BarCol label="Hoy" value={result.deudaReajustada} max={result.proj12} color="purple" />
                            <BarCol label="3 meses" value={result.proj3} max={result.proj12} color="blue" />
                            <BarCol label="6 meses" value={result.proj6} max={result.proj12} color="blue" />
                            <BarCol label="12 meses" value={result.proj12} max={result.proj12} color="red" />
                        </div>
                    </div>

                    {/* Comparison Table */}
                    <div className="nf-card nf-animate-in" style={{ marginBottom: 20 }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon yellow">📊</div>
                            <div>
                                <div className="nf-card-title">Tabla Comparativa</div>
                                <div className="nf-card-subtitle">Escenarios de deuda proyectada</div>
                            </div>
                        </div>
                        <div className="nf-table-wrap">
                            <table className="nf-table">
                                <thead>
                                    <tr>
                                        <th>Periodo</th>
                                        <th>Deuda Acumulada</th>
                                        <th>Riesgo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Hoy</td>
                                        <td style={{ color: 'var(--nf-accent)', fontWeight: 600 }}>{formatCLP(result.deudaReajustada)}</td>
                                        <td><span className={`nf-badge ${result.deudaReajustada < result.monto * 2 ? 'yellow' : 'red'}`}>{result.deudaReajustada < result.monto * 2 ? 'Medio' : 'Alto'}</span></td>
                                    </tr>
                                    <tr>
                                        <td>3 meses</td>
                                        <td style={{ fontWeight: 600 }}>{formatCLP(result.proj3)}</td>
                                        <td><span className="nf-badge red">Alto</span></td>
                                    </tr>
                                    <tr>
                                        <td>6 meses</td>
                                        <td style={{ fontWeight: 600 }}>{formatCLP(result.proj6)}</td>
                                        <td><span className="nf-badge red">Crítico</span></td>
                                    </tr>
                                    <tr>
                                        <td>12 meses</td>
                                        <td style={{ fontWeight: 600 }}>{formatCLP(result.proj12)}</td>
                                        <td><span className="nf-badge red">Crítico</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {result.alerts.length > 0 && (
                        <div className="nf-card nf-animate-in">
                            <div className="nf-card-header">
                                <div className="nf-card-icon red">🚨</div>
                                <div>
                                    <div className="nf-card-title">Alertas de Riesgo</div>
                                    <div className="nf-card-subtitle">Consecuencias posibles según la deuda</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {result.alerts.map((a, i) => (
                                    <div className={`nf-alert ${a.type}`} key={i}>
                                        <span className="nf-alert-icon">{a.icon}</span>
                                        <span>{a.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="nf-disclaimer">
                        <span>⚠️</span>
                        Reajuste calculado con IPC real del Banco Central (vía mindicador.cl) según Ley N°14.908. Los montos reales pueden variar según intereses y costas procesales.
                    </div>
                </div>
            )}
        </div>
    );
}

function BarCol({ label, value, max, color }) {
    const pct = max > 0 ? Math.max(8, (value / max) * 100) : 8;
    return (
        <div className="nf-bar-col">
            <div className="nf-bar-value">{formatCLP(value)}</div>
            <div className={`nf-bar ${color}`} style={{ height: `${pct}%` }} />
            <div className="nf-bar-label">{label}</div>
        </div>
    );
}
