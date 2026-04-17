import React, { useState } from 'react';

import { doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase/config.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

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
    const { currentUser } = useAuth();
    const [step, setStep]         = useState('tipo');   // tipo → causa → personal → resultado
    const [tipo, setTipo]         = useState(null);
    const [form, setForm]         = useState({
        // Datos causa
        situacion:      '',
        tribunal:       '',
        rit:            '',
        contraparte:    '',
        // Datos personales
        nombre_usuario: '',
        rut_usuario:    '',
        direccion_usuario: '',
        telefono_usuario: '',
        email_usuario: '',
    });
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState(null);
    const [showFormal, setShowFormal] = useState(true);
    const [copied, setCopied]         = useState(false);

    const checkRUT = (rut) => {
        const cleanRut = rut.replace(/[^0-9kK-]/g, '');
        return /^[0-9]+-[0-9kK]{1}$/.test(cleanRut);
    };

    const avanzarAPersonal = () => {
        if (!form.situacion.trim()) {
            setError('Por favor describe tu situación judicial.');
            return;
        }
        setError(null);
        setStep('personal');
    };

    const generar = async () => {
        // Validaciones Obligatorias
        if (!form.nombre_usuario.trim() || !form.rut_usuario.trim() || !form.direccion_usuario.trim()) {
            setError('Nombre, RUT y Dirección son obligatorios para generar un escrito legal válido.');
            return;
        }
        if (!checkRUT(form.rut_usuario)) {
            setError('El formato del RUT no es válido. Ej: 12345678-9');
            return;
        }

        setLoading(true);
        setError(null);

        if (currentUser && !currentUser.isAnonymous) {
            try {
                const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
                if (docSnap.exists() && docSnap.data().credits <= 0) {
                    setError('Créditos insuficientes. Por favor, recarga tu cuenta usando el botón superior para continuar.');
                    setLoading(false);
                    return;
                }
            } catch (err) {
                console.warn('No se pudo validar créditos localmente: ', err);
            }
        }

        // Obtener token real de Firebase Auth
        let token = '';
        try {
            const auth = getAuth();
            if (auth.currentUser) {
                token = await auth.currentUser.getIdToken(true);
            }
        } catch (tokenErr) {
            console.warn('[Escritos] No se pudo obtener token Firebase:', tokenErr);
        }
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // 💡 HARDENING: Timeout de 15 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const res = await fetch(`${BACKEND_URL}/api/v1/escritos/generar`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ tipo_escrito: tipo.id, ...form }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                throw new Error(errorBody.detail || `Error ${res.status}: No se pudo generar el documento`);
            }

            const data = await res.json();
            setResultado(data);
            setStep('resultado');
        } catch (err) {
            clearTimeout(timeoutId);
            console.error("[Escritos] Error:", err);
            
            let msg = err.message;
            if (err.name === 'AbortError') {
                msg = "La generación está demorando demasiado. El servidor podría estar saturado. Por favor, reintenta en unos segundos.";
            } else if (err.message === 'Failed to fetch') {
                msg = "No se pudo conectar al servidor. Verifica tu conexión a internet.";
            }
            
            setError(msg);
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
                h2 { text-align: center; font-size: 13pt; margin-bottom: 20px; }
                pre { white-space: pre-wrap; font-family: inherit; font-size: 12pt; }
                .footer { margin-top: 60px; border-top: 1px solid #000; padding-top: 10px; font-size: 10pt; color: #666; text-align: center; }
            </style></head>
            <body>
                <pre>${resultado.escrito_formal}</pre>
                <div class="footer">Generado con Nexo Familia — Revise con su abogado.</div>
            </body></html>
        `);
        win.document.close();
        win.print();
    };

    const exportarWord = async () => {
        try {
            const { Document, Packer, Paragraph, TextRun } = await import('docx');
            const { saveAs } = await import('file-saver');

            const paragraphs = resultado.escrito_formal.split('\n').map(line => 
                new Paragraph({ children: [new TextRun({ text: line, font: "Times New Roman", size: 24 })] })
            );
            const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
            const blob = await Packer.toBlob(doc);
            saveAs(blob, `Escrito_${tipo.id}.docx`);
        } catch (err) {
            alert('Error exportando a Word: ' + err.message);
        }
    };

    const exportarPDF = async () => {
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF();
            doc.setFont("times", "normal");
            doc.setFontSize(12);
            const splitText = doc.splitTextToSize(resultado.escrito_formal, 170);
            
            let y = 30;
            const pageHeight = doc.internal.pageSize.height;
            
            splitText.forEach(line => {
                if (y + 7 >= pageHeight - 30) {
                    doc.addPage();
                    y = 30;
                }
                doc.text(line, 20, y);
                y += 6;
            });
            doc.save(`Escrito_${tipo.id}.pdf`);
        } catch (err) {
            alert('Error exportando a PDF: ' + err.message);
        }
    };

    const editarDatos = () => {
        setStep('personal'); // Volver atrás a editar y regenerar
    };

    const reset = () => {
        setStep('tipo'); setTipo(null);
        setForm({ situacion:'',tribunal:'',rit:'',contraparte:'',nombre_usuario:'',rut_usuario:'',direccion_usuario:'',telefono_usuario:'',email_usuario:'' });
        setResultado(null); setError(null);
    };

    // ── STEP 1: Selección de tipo ─────────────────────────────────
    if (step === 'tipo') return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>📝 Escritos Legales</h1>
                <p>Genera documentos legales listos para presentar en tribunal — redactados inteligentemente a nivel profesional chileno.</p>
            </div>

            <div className="nf-card nf-animate-in" style={{ animationDelay: '.05s', marginBottom: 16 }}>
                <div className="nf-card-header">
                    <div className="nf-card-icon purple" style={{ fontSize: 24 }}>⚖️</div>
                    <div>
                        <div className="nf-card-title">Motor de Escritos Profesionales</div>
                        <div className="nf-card-subtitle">Estructura legal estricta · Leyes actualizadas · Exportación a Word/PDF</div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 8 }}>
                    {TIPOS.map(t => (
                        <button key={t.id} onClick={() => { setTipo(t); setStep('causa'); setError(null); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                                background: 'var(--nf-bg-secondary)', border: '1.5px solid var(--nf-border)',
                                borderRadius: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s', color: 'var(--nf-text)',
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
        </div>
    );

    // ── STEP 2: Datos de la Causa ─────────────────────────────────
    if (step === 'causa') return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>{tipo.icon} Paso 1: Situación Judicial</h1>
                <p>Describe el contexto de tu caso para armar los fundamentos del escrito.</p>
            </div>

            <div className="nf-card nf-animate-in">
                <div className="nf-form">
                    <div className="nf-field">
                        <label className="nf-label" style={{ color: 'var(--nf-primary)', fontWeight: 700 }}>
                            Describe tu situación * <span style={{ fontWeight: 400, color: 'var(--nf-text2)', fontSize: 12 }}>(más detalle = mejor escrito)</span>
                        </label>
                        <textarea className="nf-textarea" style={{ minHeight: 140 }}
                            placeholder={`Ej: "Estoy cesante desde enero 2024 porque me despidieron. Tengo una deuda de pensión y no puedo pagar el monto actual. Tengo 2 hijos adicionales de una nueva relación."`}
                            value={form.situacion} onChange={e => setForm(f => ({...f, situacion: e.target.value}))}
                        />
                    </div>

                    <div className="nf-row">
                        <div className="nf-field">
                            <label className="nf-label">Tribunal de la causa *</label>
                            <input className="nf-input" placeholder="Ej: 1° Juzgado de Familia de Santiago" value={form.tribunal} onChange={e => setForm(f => ({...f, tribunal: e.target.value}))} />
                        </div>
                        <div className="nf-field">
                            <label className="nf-label">RIT de la causa *</label>
                            <input className="nf-input" placeholder="Ej: C-1234-2024" value={form.rit} onChange={e => setForm(f => ({...f, rit: e.target.value}))} />
                        </div>
                    </div>
                    
                    <div className="nf-field">
                        <label className="nf-label">Nombre de la contraparte (Opcional)</label>
                        <input className="nf-input" placeholder="Ej: María González Rojas" value={form.contraparte} onChange={e => setForm(f => ({...f, contraparte: e.target.value}))} />
                    </div>

                    {error && <div style={{ color: 'var(--nf-red)', background: 'rgba(239,68,68,.08)', padding: '10px', borderRadius: 8 }}>⚠️ {error}</div>}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                        <button className="nf-btn nf-btn-ghost" onClick={reset}>← Volver</button>
                        <button className="nf-btn nf-btn-primary" 
                            onClick={avanzarAPersonal} 
                            disabled={!form.situacion.trim() || !form.tribunal.trim() || !form.rit.trim()}>
                            Siguiente: Datos Personales →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── STEP 3: Datos Personales ──────────────────────────────────
    if (step === 'personal') return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>{tipo.icon} Paso 2: Datos Personales</h1>
                <p>Estos datos se estamparán formalmente en la comparecencia del documento legal.</p>
            </div>

            <div className="nf-card nf-animate-in">
                <div className="nf-form">
                    <div className="nf-row">
                        <div className="nf-field">
                            <label className="nf-label">Tu nombre completo *</label>
                            <input className="nf-input" placeholder="Ej: Juan Carlos Pérez González" value={form.nombre_usuario} onChange={e => setForm(f => ({...f, nombre_usuario: e.target.value}))} />
                        </div>
                        <div className="nf-field">
                            <label className="nf-label">Tu RUT *</label>
                            <input className="nf-input" placeholder="Ej: 12345678-9" value={form.rut_usuario} onChange={e => setForm(f => ({...f, rut_usuario: e.target.value}))} />
                        </div>
                    </div>

                    <div className="nf-field">
                        <label className="nf-label">Dirección / Domicilio *</label>
                        <input className="nf-input" placeholder="Ej: Los Leones 123, Depto 44, Providencia, Santiago" value={form.direccion_usuario} onChange={e => setForm(f => ({...f, direccion_usuario: e.target.value}))} />
                    </div>

                    <div className="nf-row">
                        <div className="nf-field">
                            <label className="nf-label">Teléfono (Opcional - Notificaciones)</label>
                            <input className="nf-input" placeholder="+56 9 1234 5678" value={form.telefono_usuario} onChange={e => setForm(f => ({...f, telefono_usuario: e.target.value}))} />
                        </div>
                        <div className="nf-field">
                            <label className="nf-label">Correo Electrónico (Opcional - Notificaciones)</label>
                            <input className="nf-input" type="email" placeholder="ejemplo@correo.cl" value={form.email_usuario} onChange={e => setForm(f => ({...f, email_usuario: e.target.value}))} />
                        </div>
                    </div>

                    {error && <div style={{ color: 'var(--nf-red)', background: 'rgba(239,68,68,.08)', padding: '10px', borderRadius: 8 }}>⚠️ {error}</div>}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                        <button className="nf-btn nf-btn-ghost" onClick={() => setStep('causa')} disabled={loading}>← Atrás</button>
                        <button className="nf-btn nf-btn-primary" onClick={generar} disabled={loading}>
                            {loading ? '⚖️ Redactando escrito legal con inteligencia jurídica...' : (resultado ? '🔄 Actualizar Documento' : '📝 Generar Documento Legal')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── STEP 4: Resultado Oficial ─────────────────────────────────
    if (step === 'resultado' && resultado) return (
        <div className="nf-animate-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="nf-badge purple">✅ Generado con Éxito</span>
                    <span className="nf-badge blue" style={{ fontSize: 11 }}>{resultado.tipo_label}</span>
                    <button className="nf-btn nf-btn-ghost" onClick={editarDatos} style={{ fontSize: 11, padding: '4px 8px' }}>✏️ Editar mis datos</button>
                </div>
                <button className="nf-btn nf-btn-ghost" onClick={reset}>← Nuevo escrito</button>
            </div>

            {/* Safe-Exit Prominent Banner */}
            <div className="nf-card nf-animate-in" style={{ background: 'linear-gradient(135deg, #7638fa, #5417d4)', color: 'white', border: 'none', padding: '24px', marginBottom: 24, boxShadow: '0 8px 16px rgba(118, 56, 250, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>¡Tu escrito está listo para firmar! 🎉</h3>
                        <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: 15 }}>Descárgalo en PDF ahora. Revisa siempre la información; también quedó guardado en tu historial.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={exportarWord} className="nf-btn" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontWeight: 500 }}>
                            📄 Bajar Word
                        </button>
                        <button onClick={exportarPDF} className="nf-btn" style={{ background: '#fff', color: '#7638fa', border: 'none', fontWeight: 700, padding: '12px 24px', fontSize: 16, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                            📕 DESCARGAR PDF
                        </button>
                    </div>
                </div>
            </div>


            {/* Toggle Tipo Vista */}
            <div className="nf-type-selector" style={{ marginBottom: 20 }}>
                <button className={`nf-type-option${showFormal ? ' active' : ''}`} onClick={() => setShowFormal(true)}>
                    <span>📄</span> Escrito Legal Formal (Para Tribunal)
                </button>
                <button className={`nf-type-option${!showFormal ? ' active' : ''}`} onClick={() => setShowFormal(false)}>
                    <span>💬</span> Explicación Ciudadana (Para Ti)
                </button>
            </div>

            {showFormal ? (
                <div className="nf-card">
                    <div className="nf-card-header" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <div className="nf-card-title">{resultado.tipo_label}</div>
                            <div className="nf-card-subtitle">Documento íntegro con la estructura requerida en Chile.</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button onClick={copiar} className="nf-btn nf-btn-ghost" title="Copiar al portapapeles">
                                {copied ? '✅' : '📋'}
                            </button>
                            <button onClick={exportarWord} className="nf-btn nf-btn-primary" style={{ background: '#2B579A', borderColor: '#2B579A' }}>
                                📄 DOCX
                            </button>
                            <button onClick={exportarPDF} className="nf-btn nf-btn-primary" style={{ background: '#E3242B', borderColor: '#E3242B' }}>
                                📕 PDF
                            </button>
                            <button onClick={imprimir} className="nf-btn nf-btn-ghost">
                                🖨️
                            </button>
                        </div>
                    </div>

                    <div style={{
                        fontFamily: '"Times New Roman", Georgia, serif', fontSize: 14, lineHeight: 2,
                        color: '#111', background: '#fcfcfc', border: '1px solid #ddd', borderRadius: 8,
                        padding: '30px 40px', whiteSpace: 'pre-wrap', maxHeight: 500, overflowY: 'auto',
                    }}>
                        {resultado.escrito_formal}
                    </div>
                </div>
            ) : (
                <>
                    <div className="nf-card" style={{ marginBottom: 16 }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon blue">💬</div>
                            <div><div className="nf-card-title">¿Qué significa este escrito?</div><div className="nf-card-subtitle">Resumen sin términos legales</div></div>
                        </div>
                        <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--nf-text)', whiteSpace: 'pre-wrap', marginTop: 12 }}>
                            {resultado.explicacion_simple}
                        </p>
                    </div>

                    {resultado.advertencias?.length > 0 && (
                        <div className="nf-card" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)' }}>
                            <div className="nf-card-header">
                                <div className="nf-card-icon yellow">⚠️</div>
                                <div><div className="nf-card-title">Atención antes de presentar:</div></div>
                            </div>
                            <ul style={{ margin: '12px 0 0 20px', padding: 0, fontSize: 14, lineHeight: 1.8, color: 'var(--nf-text)' }}>
                                {resultado.advertencias.map((a, i) => <li key={i}>{a}</li>)}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    return null;
}
