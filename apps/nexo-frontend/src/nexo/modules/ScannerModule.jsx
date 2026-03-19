import React, { useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_NEXO_BACKEND_URL || 'http://localhost:8001';

export default function ScannerModule() {
    const [text, setText]     = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [method, setMethod] = useState('text');
    const [error, setError]   = useState(null);
    const [ollamaOk, setOllamaOk] = useState(null); // null=checking, true, false

    // ── Verificar que Ollama/backend esté disponible ──────────────────────────
    React.useEffect(() => {
        fetch(`${BACKEND_URL}/api/v1/health/ollama`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(() => setOllamaOk(true))
            .catch(() => setOllamaOk(false));
    }, []);

    // ── Analizar con Ollama via backend ───────────────────────────────────────
    const handleAnalyze = async () => {
        if (!text.trim()) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch(`${BACKEND_URL}/api/v1/scanner/analizar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto: text }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Error desconocido del servidor');
            }

            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => { setText(''); setResult(null); setError(null); };

    return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>🔍 Escáner de Resoluciones</h1>
                <p>Pega el texto de una resolución judicial. La IA (Ollama llama3.1) analizará qué significa y qué debes hacer.</p>
            </div>

            {/* Badge de estado del motor IA */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                {ollamaOk === null && (
                    <span className="nf-badge" style={{ background: 'var(--nf-bg2)' }}>⏳ Verificando motor IA...</span>
                )}
                {ollamaOk === true && (
                    <span className="nf-badge green">🟢 Motor IA activo — Ollama llama3.1</span>
                )}
                {ollamaOk === false && (
                    <span className="nf-badge red">🔴 Motor IA offline — ejecuta <code>ollama serve</code></span>
                )}
            </div>

            {!result ? (
                <div className="nf-card nf-animate-in" style={{ animationDelay: '.08s' }}>
                    <div className="nf-card-header">
                        <div className="nf-card-icon blue">🔎</div>
                        <div>
                            <div className="nf-card-title">Analizar Resolución con IA</div>
                            <div className="nf-card-subtitle">
                                {ollamaOk ? 'Ollama procesará el texto' : 'Pega el texto de la resolución'}
                            </div>
                        </div>
                    </div>

                    {/* Method selector */}
                    <div className="nf-type-selector" style={{ marginBottom: 20 }}>
                        <button type="button" className={`nf-type-option${method === 'text' ? ' active' : ''}`} onClick={() => setMethod('text')}>
                            <span>📝</span> Pegar Texto
                        </button>
                        <button type="button" className={`nf-type-option${method === 'describe' ? ' active' : ''}`} onClick={() => setMethod('describe')}>
                            <span>💬</span> Describir
                        </button>
                    </div>

                    <div className="nf-form">
                        <div className="nf-field">
                            <label className="nf-label">
                                {method === 'text' ? 'Texto de la Resolución' : 'Describe qué dice la resolución'}
                            </label>
                            <textarea
                                className="nf-textarea"
                                style={{ minHeight: 180 }}
                                placeholder={method === 'text'
                                    ? 'Pega aquí el texto completo de la resolución judicial...\n\nEj: "VISTOS: Se practica liquidación de la deuda de pensiones de alimentos adeudadas..."'
                                    : 'Describe en tus palabras qué dice el documento que recibiste...\n\nEj: "Me llegó un papel que dice que tengo que pagar una deuda..."'
                                }
                                value={text}
                                onChange={e => setText(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div style={{ color: 'var(--nf-red)', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 14 }}>
                                ⚠️ {error}
                                {ollamaOk === false && ' — Activa Ollama con: ollama serve'}
                            </div>
                        )}

                        <button
                            className="nf-btn nf-btn-primary"
                            onClick={handleAnalyze}
                            disabled={loading || !text.trim()}
                            style={{ alignSelf: 'flex-start' }}
                        >
                            {loading ? '🧠 Analizando con IA...' : '🔍 Analizar Resolución'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="nf-result">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span className="nf-badge purple">✅ Análisis completado</span>
                            {result.fuente === 'ollama' && (
                                <span className="nf-badge green" style={{ fontSize: 11 }}>🤖 Ollama llama3.1</span>
                            )}
                            {result.fuente === 'fallback' && (
                                <span className="nf-badge yellow" style={{ fontSize: 11 }}>⚠️ Análisis básico (IA no disponible)</span>
                            )}
                        </div>
                        <button className="nf-btn nf-btn-ghost" onClick={handleReset}>← Nuevo análisis</button>
                    </div>

                    {/* Tipo + Resumen */}
                    <div className="nf-card nf-animate-in" style={{ marginBottom: 16 }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon purple" style={{ fontSize: 28, width: 56, height: 56 }}>⚖️</div>
                            <div>
                                <div className="nf-card-title" style={{ fontSize: 20 }}>{result.tipo}</div>
                                <span className={`nf-badge ${result.riesgo === 'alto' ? 'red' : result.riesgo === 'medio' ? 'yellow' : 'green'}`}>
                                    Riesgo {result.riesgo === 'alto' ? 'Alto' : result.riesgo === 'medio' ? 'Medio' : 'Bajo'}
                                </span>
                            </div>
                        </div>
                        <p style={{ color: 'var(--nf-text2)', fontSize: 15, lineHeight: 1.7 }}>{result.resumen}</p>
                    </div>

                    {/* Puntos Clave */}
                    {result.puntosClave?.length > 0 && (
                        <div className="nf-result-grid" style={{ marginBottom: 16 }}>
                            {result.puntosClave.map((p, i) => (
                                <div className="nf-result-item nf-animate-in" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                                    <div className="label"><span>{p.icon}</span> {p.label}</div>
                                    <div className="value">{p.value}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Acción Recomendada */}
                    <div className="nf-card nf-animate-in" style={{ marginBottom: 0 }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon green">✅</div>
                            <div>
                                <div className="nf-card-title">Acción Recomendada</div>
                                <div className="nf-card-subtitle">Qué hacer ahora</div>
                            </div>
                        </div>
                        <div className={`nf-alert ${result.riesgo === 'alto' ? 'danger' : result.riesgo === 'medio' ? 'warning' : 'success'}`}>
                            <span className="nf-alert-icon">{result.riesgo === 'alto' ? '🚨' : result.riesgo === 'medio' ? '⚠️' : '✅'}</span>
                            <span>{result.accionRecomendada}</span>
                        </div>
                    </div>

                    <div className="nf-disclaimer">
                        <span>⚠️</span>
                        Este análisis fue generado por IA (Ollama llama3.1) de forma local. Para casos complejos, consulte con un abogado.
                    </div>
                </div>
            )}
        </div>
    );
}
