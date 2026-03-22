import React, { useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_NEXO_BACKEND_URL || 'http://localhost:8001';

const TIPOS = [
    { id: 'rebaja_pension',       icon: '📉', label: 'Rebaja de Pensión',      desc: 'Solicitar reducción del monto de pensión alimenticia' },
    { id: 'cumplimiento_pension', icon: '⚖️', label: 'Cumplimiento de Pensión', desc: 'Exigir el pago de pensiones no pagadas' },
    { id: 'solicitud_liquidacion',icon: '🧾', label: 'Liquidación de Deuda',   desc: 'Calcular y cobrar la deuda acumulada' },
    { id: 'cese_alimentos',       icon: '🛑', label: 'Cese de Alimentos',       desc: 'Solicitar el fin de la obligación alimenticia' },
    { id: 'regimen_visitas',      icon: '👨‍👧', label: 'Régimen de Visitas',    desc: 'Establecer o modificar visitas con tus hijos' },
    { id: 'medidas_apremio',      icon: '🔒', label: 'Medidas de Apremio',     desc: 'Solicitar arresto u otras medidas por incumplimiento' },
];

export default function EscritosModule() {
    const [step, setStep]         = useState('tipo');   // tipo → datos → resultado
    const [tipo, setTipo]         = useState(null);
    const [form, setForm]         = useState({
        situacion:      '',
        tribunal:       '',
        rit:            '',
        nombre_usuario: '',
        rut_usuario:    '',
        contraparte:    '',
    });
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState(null);
    const [showFormal, setShowFormal] = useState(true);
    const [copied, setCopied]         = useState(false);

    const seleccionarTipo = (t) => {
        setTipo(t);
        setStep('datos');
        setError(null);
    };

    const generar = async () => {
        if (!form.situacion.trim()) {
            setError('Por favor describe tu situación para generar el escrito.');
            return;
        }
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('nf_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const res = await fetch(`${BACKEND_URL}/api/v1/escritos/generar`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ tipo_escrito: tipo.id, ...form }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Error generando el escrito');
            setResultado(data);
            setStep('resultado');
        } catch (err) {
            setError(err.message === 'Failed to fetch'
                ? `No se pudo conectar al servidor. Verifica tu conexión.`
                : err.message
            );
        } finally {
            setLoading(false);
        }
    };

    const copiar = () => {
        navigator.clipboard.writeText(resultado.escrito_formal);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const imprimir = () => {
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>${resultado.tipo_label}</title>
            <style>
                body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.8; margin: 3cm 2.5cm; color: #000; }
                h2 { text-align: center; font-size: 13pt; }
                pre { white-space: pre-wrap; font-family: inherit; font-size: 12pt; }
                .footer { margin-top: 60px; border-top: 1px solid #000; padding-top: 10px; font-size: 10pt; color: #666; }
            </style></head>
            <body>
                <pre>${resultado.escrito_formal}</pre>
                <div class="footer">Generado con Nexo Familia — No constituye asesoría legal profesional. Verifique y adapte con su abogado.</div>
            </body></html>
        `);
        win.document.close();
        win.print();
    };

    const reset = () => {
        setStep('tipo'); setTipo(null);
        setForm({ situacion:'',tribunal:'',rit:'',nombre_usuario:'',rut_usuario:'',contraparte:'' });
        setResultado(null); setError(null);
    };

    // ── STEP 1: Selección de tipo ─────────────────────────────────
    if (step === 'tipo') return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>📝 Escritos Legales</h1>
                <p>Genera documentos legales listos para presentar en tribunal — equivalentes a los redactados por un abogado.</p>
            </div>

            <div className="nf-card nf-animate-in" style={{ animationDelay: '.05s', marginBottom: 16 }}>
                <div className="nf-card-header">
                    <div className="nf-card-icon purple" style={{ fontSize: 24 }}>⚖️</div>
                    <div>
                        <div className="nf-card-title">Motor de Escritos Profesionales</div>
                        <div className="nf-card-subtitle">GPT-4o-mini · Leyes chilenas vigentes · Doble salida: Formal + Simple</div>
                    </div>
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 12, marginTop: 8
                }}>
                    {TIPOS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => seleccionarTipo(t)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                padding: '16px 18px',
                                background: 'var(--nf-bg-secondary)',
                                border: '1.5px solid var(--nf-border)',
                                borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                                transition: 'all 0.18s', color: 'var(--nf-text)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor='var(--nf-primary)'; e.currentTarget.style.background='rgba(139,92,246,0.07)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--nf-border)'; e.currentTarget.style.background='var(--nf-bg-secondary)'; }}
                        >
                            <span style={{ fontSize: 28, flexShrink: 0 }}>{t.icon}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{t.label}</div>
                                <div style={{ fontSize: 12, color: 'var(--nf-text2)', lineHeight: 1.4 }}>{t.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--nf-text2)' }}>
                ⚠️ Los escritos generados son orientativos. Se recomienda revisarlos con un abogado antes de presentarlos en tribunal.
            </div>
        </div>
    );

    // ── STEP 2: Formulario de datos ───────────────────────────────
    if (step === 'datos') return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>{tipo.icon} {tipo.label}</h1>
                <p>Completa los datos disponibles. Los campos marcados con * son importantes para la calidad del escrito.</p>
            </div>

            <div className="nf-card nf-animate-in">
                <div className="nf-form">
                    {/* Situación — campo crítico */}
                    <div className="nf-field">
                        <label className="nf-label" style={{ color: 'var(--nf-primary)', fontWeight: 700 }}>
                            Describe tu situación * <span style={{ fontWeight: 400, color: 'var(--nf-text2)', fontSize: 12 }}>(más detalle = mejor escrito)</span>
                        </label>
                        <textarea
                            className="nf-textarea"
                            style={{ minHeight: 140 }}
                            placeholder={`Ej: "Estoy cesante desde enero 2024 porque me despidieron de mi trabajo en construcción. Tengo una deuda de pensión acumulada y no puedo pagar el monto actual de $200.000 mensuales. Tengo 2 hijos menores."`}
                            value={form.situacion}
                            onChange={e => setForm(f => ({...f, situacion: e.target.value}))}
                        />
                    </div>

                    <div className="nf-row">
                        <div className="nf-field">
                            <label className="nf-label">Tribunal (si lo sabes)</label>
                            <input className="nf-input" placeholder="Ej: Juzgado de Familia de Santiago" value={form.tribunal} onChange={e => setForm(f => ({...f, tribunal: e.target.value}))} />
                        </div>
                        <div className="nf-field">
                            <label className="nf-label">RIT de la causa (si lo tienes)</label>
                            <input className="nf-input" placeholder="Ej: C-1234-2024" value={form.rit} onChange={e => setForm(f => ({...f, rit: e.target.value}))} />
                        </div>
                    </div>

                    <div className="nf-row">
                        <div className="nf-field">
                            <label className="nf-label">Tu nombre completo</label>
                            <input className="nf-input" placeholder="Ej: Juan Carlos Pérez González" value={form.nombre_usuario} onChange={e => setForm(f => ({...f, nombre_usuario: e.target.value}))} />
                        </div>
                        <div className="nf-field">
                            <label className="nf-label">Tu RUT</label>
                            <input className="nf-input" placeholder="Ej: 12.345.678-9" value={form.rut_usuario} onChange={e => setForm(f => ({...f, rut_usuario: e.target.value}))} />
                        </div>
                    </div>

                    <div className="nf-field">
                        <label className="nf-label">Nombre de la contraparte (si lo sabes)</label>
                        <input className="nf-input" placeholder="Ej: María González Rojas" value={form.contraparte} onChange={e => setForm(f => ({...f, contraparte: e.target.value}))} />
                    </div>

                    {error && (
                        <div style={{ color: 'var(--nf-red)', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 14 }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button className="nf-btn nf-btn-primary" onClick={generar} disabled={loading || !form.situacion.trim()} style={{ opacity: (!form.situacion.trim() || loading) ? 0.5 : 1 }}>
                            {loading ? '⚖️ Generando escrito profesional... (10-20s)' : '📝 Generar Escrito Legal'}
                        </button>
                        <button className="nf-btn nf-btn-ghost" onClick={reset}>← Cambiar tipo</button>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── STEP 3: Resultado ─────────────────────────────────────────
    if (step === 'resultado' && resultado) return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="nf-badge purple">✅ Escrito Generado</span>
                    <span className="nf-badge blue" style={{ fontSize: 11 }}>{resultado.tipo_label}</span>
                    {resultado.leyes_citadas?.map((ley, i) => (
                        <span key={i} className="nf-badge green" style={{ fontSize: 10 }}>📜 {ley.split('(')[0].trim()}</span>
                    ))}
                </div>
                <button className="nf-btn nf-btn-ghost" onClick={reset}>← Nuevo escrito</button>
            </div>

            {/* Toggle Formal / Simple */}
            <div className="nf-type-selector" style={{ marginBottom: 20 }}>
                <button className={`nf-type-option${showFormal ? ' active' : ''}`} onClick={() => setShowFormal(true)}>
                    <span>📄</span> Escrito Formal (Para Tribunal)
                </button>
                <button className={`nf-type-option${!showFormal ? ' active' : ''}`} onClick={() => setShowFormal(false)}>
                    <span>💬</span> Explicación Simple (Para Ti)
                </button>
            </div>

            {showFormal ? (
                <div className="nf-card nf-animate-in">
                    <div className="nf-card-header" style={{ marginBottom: 16 }}>
                        <div className="nf-card-icon purple" style={{ fontSize: 22, width: 44, height: 44 }}>⚖️</div>
                        <div style={{ flex: 1 }}>
                            <div className="nf-card-title">{resultado.tipo_label}</div>
                            <div className="nf-card-subtitle">Documento listo para imprimir y presentar en tribunal</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={copiar} className="nf-btn nf-btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }}>
                                {copied ? '✅ Copiado' : '📋 Copiar'}
                            </button>
                            <button onClick={imprimir} className="nf-btn nf-btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}>
                                🖨️ Imprimir
                            </button>
                        </div>
                    </div>

                    {/* Escrito en estilo tipográfico legal */}
                    <div style={{
                        fontFamily: '"Times New Roman", Georgia, serif',
                        fontSize: 14,
                        lineHeight: 2,
                        color: 'var(--nf-text)',
                        background: 'var(--nf-bg)',
                        border: '1px solid var(--nf-border)',
                        borderRadius: 8,
                        padding: '28px 32px',
                        whiteSpace: 'pre-wrap',
                        maxHeight: 520,
                        overflowY: 'auto',
                    }}>
                        {resultado.escrito_formal}
                    </div>

                    <div style={{ marginTop: 12, fontSize: 12, color: 'var(--nf-text2)', display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span>📜</span>
                        Leyes citadas: {resultado.leyes_citadas?.join(' | ')}
                    </div>
                </div>
            ) : (
                <div className="nf-animate-in">
                    <div className="nf-card" style={{ marginBottom: 16 }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon blue" style={{ fontSize: 22, width: 44, height: 44 }}>💬</div>
                            <div>
                                <div className="nf-card-title">¿Qué significa este escrito?</div>
                                <div className="nf-card-subtitle">Explicado sin términos legales</div>
                            </div>
                        </div>
                        <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--nf-text)', whiteSpace: 'pre-wrap', marginTop: 12 }}>
                            {resultado.explicacion_simple}
                        </p>
                    </div>

                    {resultado.advertencias?.length > 0 && (
                        <div className="nf-card" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)' }}>
                            <div className="nf-card-header">
                                <div className="nf-card-icon yellow" style={{ fontSize: 20, width: 40, height: 40 }}>⚠️</div>
                                <div>
                                    <div className="nf-card-title">Antes de presentar, verifica:</div>
                                </div>
                            </div>
                            <ul style={{ margin: '12px 0 0 20px', padding: 0, fontSize: 14, lineHeight: 1.8, color: 'var(--nf-text)' }}>
                                {resultado.advertencias.map((a, i) => (
                                    <li key={i}>{a}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: 16, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--nf-text2)' }}>
                🔴 <strong>Importante:</strong> Este escrito es orientativo. Los campos <code>[COMPLETAR]</code> deben ser completados con información real. Se recomienda revisión por un abogado antes de presentar.
            </div>
        </div>
    );

    return null;
}
