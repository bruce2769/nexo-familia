import React, { useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_NEXO_BACKEND_URL || 'http://localhost:8001';
console.log('🔗 API URL:', BACKEND_URL);

export default function ScannerModule() {
    const [text, setText]       = useState('');
    const [file, setFile]       = useState(null);
    const [result, setResult]   = useState(null);
    const [loading, setLoading] = useState(false);
    const [method, setMethod]   = useState('pdf'); // pdf, image, text
    const [error, setError]     = useState(null);

    const handleAnalyze = async () => {
        if (method === 'text' && !text.trim()) return;
        if ((method === 'pdf' || method === 'image') && !file) {
            setError('Por favor selecciona un archivo.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            if (method === 'pdf' || method === 'image') {
                formData.append('archivo', file);
            } else {
                formData.append('texto', text);
            }

            console.log("Tipo input:", method);
            
            // Simular paso de OCR o texto a logs
            if (method === 'text') console.log("Texto procesado:", text.substring(0, 100) + "...");
            else console.log("Texto procesado: [Se procesará en el backend vía OCR o PyMuPDF...]");

            const token = localStorage.getItem("nf_token");
            const headers = {};
            if (token) {
                 headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${BACKEND_URL}/causas/procesar`, {
                method: 'POST',
                headers,
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || data.error || 'Error desconocido del servidor');
            
            console.log("JSON extraído:", data);
            setResult(data);
        } catch (err) {
            const msg = err.message === 'Failed to fetch'
                ? `Error de conexión: no se pudo contactar el servidor (${BACKEND_URL}). Verifica tu conexión o intenta más tarde.`
                : err.message;
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => { setText(''); setFile(null); setResult(null); setError(null); };

    return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>🔍 Escáner Universal de Causas</h1>
                <p>Extrae y guarda información legal estructurada desde cualquier formato.</p>
            </div>

            {!result ? (
                <div className="nf-card nf-animate-in" style={{ animationDelay: '.08s' }}>
                    <div className="nf-card-header">
                        <div className="nf-card-icon blue">🧠</div>
                        <div>
                            <div className="nf-card-title">Motor IA de Extracción Estructurada</div>
                            <div className="nf-card-subtitle">GPT-4 Vision (OCR) · Hash MD5 · Guardado Automático FB</div>
                        </div>
                    </div>

                    <div className="nf-type-selector" style={{ marginBottom: 20 }}>
                        <button type="button" className={`nf-type-option${method === 'pdf' ? ' active' : ''}`} onClick={() => {setMethod('pdf'); setFile(null);}}>
                            <span>📄</span> Subir PDF
                        </button>
                        <button type="button" className={`nf-type-option${method === 'image' ? ' active' : ''}`} onClick={() => {setMethod('image'); setFile(null);}}>
                            <span>📸</span> Subir Imagen (OCR)
                        </button>
                        <button type="button" className={`nf-type-option${method === 'text' ? ' active' : ''}`} onClick={() => setMethod('text')}>
                            <span>📝</span> Pegar Texto
                        </button>
                    </div>

                    <div className="nf-form">
                        {(method === 'pdf' || method === 'image') ? (
                            <div className="nf-field">
                                <label className="nf-label">{method === 'pdf' ? 'Sube tu resolución en PDF' : 'Sube o toma una foto del documento'}</label>
                                <div style={{ border: '2px dashed var(--nf-border)', padding: '30px 20px', textAlign: 'center', borderRadius: 12, background: 'var(--nf-bg-secondary)', cursor: 'pointer', transition: 'all 0.2s' }} className="nf-upload-zone hover-border">
                                    <input 
                                        type="file" 
                                        accept={method === 'pdf' ? ".pdf" : "image/*"} 
                                        capture={method === 'image' ? "environment" : undefined}
                                        onChange={e => setFile(e.target.files[0])} 
                                        style={{ display: 'none' }} 
                                        id="file-upload"
                                    />
                                    <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
                                        <span style={{ fontSize: 36 }}>{file ? '✅' : (method === 'pdf' ? '📤' : '📷')}</span>
                                        <span style={{ fontWeight: 500, fontSize: 16, color: file ? 'var(--nf-primary)' : 'inherit' }}>
                                            {file ? file.name : (method === 'pdf' ? 'Haz clic aquí para seleccionar un PDF' : 'Haz clic aquí para tomar o subir una foto')}
                                        </span>
                                        {!file && <span style={{ fontSize: 13, color: 'var(--nf-text2)' }}>{method === 'pdf' ? 'Solo archivos .pdf' : 'Soportado: JPG, PNG, WEBP'}</span>}
                                        {file && <span style={{ fontSize: 13, color: 'var(--nf-text2)' }}>
                                            {file.size > 1024 * 1024 ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : (file.size / 1024).toFixed(1) + ' KB'} — Haz clic para cambiar archivo
                                        </span>}
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <div className="nf-field">
                                <label className="nf-label">Texto del documento judicial</label>
                                <textarea
                                    className="nf-textarea"
                                    style={{ minHeight: 180 }}
                                    placeholder='Pega aquí el texto completo... Ej: "VISTOS: Se practica liquidación de la deuda de pensiones..."'
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
                            disabled={loading || ((method === 'pdf' || method === 'image') ? !file : !text.trim())}
                            style={{ alignSelf: 'flex-start' }}
                        >
                            {loading ? '🧠 Extrayendo Datos (puede tomar varios segundos)...' : '⚙️ Estructurar y Guardar en DDBB'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="nf-result">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span className="nf-badge purple">✅ Guardado Estructurado</span>
                            {result.fuente === 'cache' && (
                                <span className="nf-badge green" style={{ fontSize: 11 }}>⚡ MD5 Hit — Evitado Duplicado</span>
                            )}
                            <span className="nf-badge blue" style={{ fontSize: 11, textTransform: 'uppercase' }}>📁 {result.origen}</span>
                        </div>
                        <button className="nf-btn nf-btn-ghost" onClick={handleReset}>← Subir Otro Documento</button>
                    </div>

                    <div className="nf-card nf-animate-in" style={{ marginBottom: 16 }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon purple" style={{ fontSize: 24, width: 48, height: 48 }}>⚖️</div>
                            <div>
                                <div className="nf-card-title" style={{ fontSize: 18 }}>Causa: {result.rit || 'Desconocido'}</div>
                                <div className="nf-card-subtitle">{result.tribunal || 'Tribunal no listado'}</div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 15, padding: 15, background: 'var(--nf-bg-secondary)', borderRadius: 8 }}>
                            <div><strong style={{ display: 'block', fontSize: 12, color:'var(--nf-text2)', textTransform: 'uppercase' }}>RUC</strong> {result.ruc || 'N/A'}</div>
                            <div><strong style={{ display: 'block', fontSize: 12, color:'var(--nf-text2)', textTransform: 'uppercase' }}>Tipo de Causa</strong> {result.tipoCausa || 'N/A'}</div>
                            <div><strong style={{ display: 'block', fontSize: 12, color:'var(--nf-text2)', textTransform: 'uppercase' }}>Estado</strong> {result.estadoCausa || 'N/A'}</div>
                            <div><strong style={{ display: 'block', fontSize: 12, color:'var(--nf-text2)', textTransform: 'uppercase' }}>Juez titular</strong> {result.juez || 'N/A'}</div>
                            <div><strong style={{ display: 'block', fontSize: 12, color:'var(--nf-text2)', textTransform: 'uppercase' }}>Fecha Base</strong> {result.fecha || 'N/A'}</div>
                        </div>
                    </div>

                    <div className="nf-card nf-animate-in" style={{ marginBottom: 16, animationDelay: '.1s' }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon yellow" style={{ fontSize: 24, width: 48, height: 48 }}>📄</div>
                            <div>
                                <div className="nf-card-title" style={{ fontSize: 18 }}>Resumen Simplificado</div>
                                <div className="nf-card-subtitle">¿Qué significa este documento?</div>
                            </div>
                        </div>
                        <p style={{ color: 'var(--nf-text)', fontSize: 16, lineHeight: 1.6 }}>{result.resumenIA || 'Sin resumen disponible.'}</p>
                    </div>
                    
                    <div className="nf-card nf-animate-in" style={{ marginBottom: 16, animationDelay: '.15s' }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon green" style={{ fontSize: 24, width: 48, height: 48 }}>👥</div>
                            <div>
                                <div className="nf-card-title" style={{ fontSize: 18 }}>Partes de la Causa</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 200px', padding: 15, background: 'rgba(59,130,246,0.1)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)' }}>
                                <strong style={{ color: '#3b82f6', display: 'block', marginBottom: 5 }}>Demandante:</strong>
                                <span style={{fontSize: 15}}>{result.partes?.demandante || 'N/A'}</span>
                            </div>
                            <div style={{ flex: '1 1 200px', padding: 15, background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
                                <strong style={{ color: '#ef4444', display: 'block', marginBottom: 5 }}>Demandado:</strong>
                                <span style={{fontSize: 15}}>{result.partes?.demandado || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
