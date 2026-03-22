import React, { useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_NEXO_BACKEND_URL || 'http://localhost:8001';

export default function ScannerModule() {
    const [text, setText]       = useState('');
    const [file, setFile]       = useState(null);
    const [result, setResult]   = useState(null);
    const [loading, setLoading] = useState(false);
    const [method, setMethod]   = useState('text');
    const [error, setError]     = useState(null);

    const handleAnalyze = async () => {
        if (method !== 'upload' && !text.trim()) return;
        if (method === 'upload' && !file) {
            setError('Por favor selecciona un archivo PDF.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            let res;
            if (method === 'upload') {
                const formData = new FormData();
                formData.append('archivo', file);
                res = await fetch(`${BACKEND_URL}/api/v1/scanner/subir`, {
                    method: 'POST',
                    body: formData,
                });
            } else {
                res = await fetch(`${BACKEND_URL}/api/v1/scanner/analizar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ texto: text }),
                });
            }

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Error desconocido del servidor');
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => { setText(''); setFile(null); setResult(null); setError(null); };

    return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>🔍 Escáner de Resoluciones</h1>
                <p>Pega el texto de una resolución judicial. La IA analizará qué significa y qué debes hacer.</p>
            </div>

            {!result ? (
                <div className="nf-card nf-animate-in" style={{ animationDelay: '.08s' }}>
                    <div className="nf-card-header">
                        <div className="nf-card-icon blue">🔎</div>
                        <div>
                            <div className="nf-card-title">Analizar Resolución con IA</div>
                            <div className="nf-card-subtitle">Motor: GPT-4o Mini · Caché MD5 · Respuesta instantánea si ya fue analizada</div>
                        </div>
                    </div>

                    <div className="nf-type-selector" style={{ marginBottom: 20 }}>
                        <button type="button" className={`nf-type-option${method === 'text' ? ' active' : ''}`} onClick={() => setMethod('text')}>
                            <span>📝</span> Pegar Texto
                        </button>
                        <button type="button" className={`nf-type-option${method === 'describe' ? ' active' : ''}`} onClick={() => setMethod('describe')}>
                            <span>💬</span> Describir
                        </button>
                        <button type="button" className={`nf-type-option${method === 'upload' ? ' active' : ''}`} onClick={() => setMethod('upload')}>
                            <span>📄</span> Subir PDF
                        </button>
                    </div>

                    <div className="nf-form">
                        {method === 'upload' ? (
                            <div className="nf-field">
                                <label className="nf-label">Sube tu resolución en PDF</label>
                                <div style={{ border: '2px dashed var(--nf-border)', padding: '30px 20px', textAlign: 'center', borderRadius: 12, background: 'var(--nf-bg-secondary)', cursor: 'pointer', transition: 'all 0.2s' }} className="nf-upload-zone hover-border">
                                    <input 
                                        type="file" 
                                        accept=".pdf" 
                                        onChange={e => setFile(e.target.files[0])} 
                                        style={{ display: 'none' }} 
                                        id="pdf-upload"
                                    />
                                    <label htmlFor="pdf-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
                                        <span style={{ fontSize: 36 }}>{file ? '📄' : '📤'}</span>
                                        <span style={{ fontWeight: 500, fontSize: 16, color: file ? 'var(--nf-primary)' : 'inherit' }}>
                                            {file ? file.name : 'Haz clic aquí para seleccionar un PDF'}
                                        </span>
                                        {!file && <span style={{ fontSize: 13, color: 'var(--nf-text2)' }}>Solo archivos .pdf habilitados</span>}
                                        {file && <span style={{ fontSize: 13, color: 'var(--nf-text2)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB — Haz clic para cambiar archivo</span>}
                                    </label>
                                </div>
                            </div>
                        ) : (
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
                        )}

                        {error && (
                            <div style={{ color: 'var(--nf-red)', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 14 }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            className="nf-btn nf-btn-primary"
                            onClick={handleAnalyze}
                            disabled={loading || (method === 'upload' ? !file : !text.trim())}
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
                            {result.fuente === 'cache' && (
                                <span className="nf-badge green" style={{ fontSize: 11 }}>⚡ Caché — Instantáneo</span>
                            )}
                            {result.fuente && result.fuente !== 'cache' && result.fuente !== 'fallback' && (
                                <span className="nf-badge blue" style={{ fontSize: 11 }}>🤖 {result.fuente}</span>
                            )}
                            {result.fuente === 'fallback' && (
                                <span className="nf-badge yellow" style={{ fontSize: 11 }}>⚠️ Análisis básico</span>
                            )}
                        </div>
                        <button className="nf-btn nf-btn-ghost" onClick={handleReset}>← Nuevo análisis</button>
                    </div>

                    {/* 1. Resumen Simple */}
                    <div className="nf-card nf-animate-in" style={{ marginBottom: 16 }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon purple" style={{ fontSize: 24, width: 48, height: 48 }}>🧾</div>
                            <div>
                                <div className="nf-card-title" style={{ fontSize: 18 }}>Resumen del Documento</div>
                                <div className="nf-card-subtitle">Qué dice en pocas palabras</div>
                            </div>
                        </div>
                        <p style={{ color: 'var(--nf-text)', fontSize: 16, lineHeight: 1.6 }}>{result.resumen_simple}</p>
                    </div>

                    {/* 2. Significado */}
                    <div className="nf-card nf-animate-in" style={{ marginBottom: 16, animationDelay: '.05s' }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon yellow" style={{ fontSize: 24, width: 48, height: 48 }}>⚠️</div>
                            <div>
                                <div className="nf-card-title" style={{ fontSize: 18 }}>Qué Significa Esto</div>
                                <div className="nf-card-subtitle">En lenguaje simple y directo</div>
                            </div>
                        </div>
                        <p style={{ color: 'var(--nf-text)', fontSize: 16, lineHeight: 1.6 }}>{result.significado}</p>
                    </div>

                    {/* 3. Pasos a seguir */}
                    {result.pasos && result.pasos.length > 0 && (
                        <div className="nf-card nf-animate-in" style={{ marginBottom: 16, animationDelay: '.1s' }}>
                            <div className="nf-card-header">
                                <div className="nf-card-icon green" style={{ fontSize: 24, width: 48, height: 48 }}>✅</div>
                                <div>
                                    <div className="nf-card-title" style={{ fontSize: 18 }}>Qué Debes Hacer</div>
                                    <div className="nf-card-subtitle">Paso a paso</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
                                {result.pasos.map((p, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--nf-bg-secondary)', padding: '14px 16px', borderRadius: 8 }}>
                                        <div style={{ background: 'var(--nf-primary)', color: 'white', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                                            {p.paso || (i+1)}
                                        </div>
                                        <div style={{ fontSize: 15, color: 'var(--nf-text)', lineHeight: 1.5, paddingTop: 3 }}>
                                            {p.desc}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 4. Lugar */}
                    <div className="nf-card nf-animate-in" style={{ marginBottom: 16, animationDelay: '.15s' }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon blue" style={{ fontSize: 24, width: 48, height: 48 }}>📍</div>
                            <div>
                                <div className="nf-card-title" style={{ fontSize: 18 }}>Dónde Hacerlo</div>
                                <div className="nf-card-subtitle">Institución o lugar correspondiente</div>
                            </div>
                        </div>
                        <p style={{ color: 'var(--nf-text)', fontSize: 16, lineHeight: 1.6 }}>{result.lugar}</p>
                    </div>

                    {/* 5. Consejo Practico */}
                    <div className="nf-card nf-animate-in" style={{ marginBottom: 16, animationDelay: '.2s' }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon orange" style={{ fontSize: 24, width: 48, height: 48 }}>💡</div>
                            <div>
                                <div className="nf-card-title" style={{ fontSize: 18 }}>Consejo Práctico</div>
                                <div className="nf-card-subtitle">Tip extra de tu guía legal</div>
                            </div>
                        </div>
                        <p style={{ color: 'var(--nf-text)', fontSize: 16, lineHeight: 1.6 }}>{result.consejo}</p>
                    </div>

                    <div className="nf-disclaimer">
                        <span>ℹ️</span>
                        Esta guía fue generada por IA en base a la resolución provista. Si tu caso es muy complejo, siempre es recomendable confirmar con un abogado de la Corporación de Asistencia Judicial.
                    </div>
                </div>
            )}
        </div>
    );
}
