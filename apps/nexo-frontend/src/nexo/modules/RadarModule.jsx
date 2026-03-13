import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { db } from '../../firebase/db.js';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// URL del backend Nexo (ajustar si se despliega en un servidor remoto)
const BACKEND_URL = import.meta.env.VITE_NEXO_BACKEND_URL || 'http://localhost:3001';

// Tribunales con sus códigos reales del PJUD
const TRIBUNALES_MAP = [
    { label: '1° Juzgado de Familia de Santiago', codigo: 'JFAM001', codigoCorte: '15' },
    { label: '2° Juzgado de Familia de Santiago', codigo: 'JFAM002', codigoCorte: '15' },
    { label: '3° Juzgado de Familia de Santiago', codigo: 'JFAM003', codigoCorte: '15' },
    { label: '4° Juzgado de Familia de Santiago', codigo: 'JFAM004', codigoCorte: '15' },
    { label: 'Juzgado de Familia de San Miguel', codigo: 'JFAM001SM', codigoCorte: '15' },
    { label: 'Juzgado de Familia de Valparaíso', codigo: 'JFAM001VLP', codigoCorte: '09' },
    { label: 'Juzgado de Familia de Viña del Mar', codigo: 'JFAM001VDM', codigoCorte: '09' },
];

export default function RadarModule({ onNavigate }) {
    const { currentUser } = useAuth();
    const [causa, setCausa] = useState(null);
    const [form, setForm] = useState({ rit: '', tribunalCodigo: '', tribunalLabel: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [alertas, setAlertas] = useState([]);
    const [movimientos, setMovimientos] = useState([]);
    const [backendConectado, setBackendConectado] = useState(null); // null=checking, true, false
    const [modoDemo, setModoDemo] = useState(false);

    // ── Verificar si el backend está corriendo ────────────────
    useEffect(() => {
        fetch(`${BACKEND_URL}/health`)
            .then(r => r.json())
            .then(() => setBackendConectado(true))
            .catch(() => {
                setBackendConectado(false);
                setModoDemo(true);
            });
    }, []);

    // ── Listener Firestore: Alertas en tiempo real ────────────
    useEffect(() => {
        if (!currentUser || !causa) return;

        const alertasRef = collection(db, 'radarEventos', currentUser.uid, 'alertas');
        const q = query(
            alertasRef,
            where('rit', '==', causa.rit),
            where('leido', '==', false),
            orderBy('creadoAt', 'desc')
        );

        const unsub = onSnapshot(q, snap => {
            const nuevas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAlertas(nuevas);
        });

        return () => unsub();
    }, [currentUser, causa]);

    // ── Listener Firestore: Movimientos en tiempo real ────────
    useEffect(() => {
        if (!currentUser || !causa) return;

        const movsRef = collection(
            db, 'radarEventos', currentUser.uid, 'causas', causa.rit, 'movimientos'
        );
        const q = query(movsRef, orderBy('creadoAt', 'desc'));

        const unsub = onSnapshot(q, snap => {
            setMovimientos(snap.docs.map(d => d.data()));
        });

        return () => unsub();
    }, [currentUser, causa]);

    // ── Suscribir causa al backend ────────────────────────────
    const suscribirRadar = async () => {
        if (!form.rit || !form.tribunalCodigo) return;
        setLoading(true);
        setError(null);

        // Validar formato RIT
        const ritClean = form.rit.trim().toUpperCase();
        if (!/^[A-Z]+-\d+-\d{4}$/.test(ritClean)) {
            setError('Formato de RIT inválido. Usa el formato: C-1234-2023');
            setLoading(false);
            return;
        }

        const tribunal = TRIBUNALES_MAP.find(t => t.codigo === form.tribunalCodigo);

        if (modoDemo || !backendConectado) {
            // Modo Demo: sin backend real
            setTimeout(() => {
                setCausa({ rit: ritClean, tribunal: tribunal?.label || form.tribunalLabel });
                setLoading(false);
            }, 1500);
            return;
        }

        try {
            // Llamar al backend real con el token de Firebase
            const token = await currentUser.getIdToken();
            const res = await fetch(`${BACKEND_URL}/api/radar/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    rit: ritClean,
                    codigoCorte: tribunal.codigoCorte,
                    tribunal: tribunal.codigo,
                    alias: `${ritClean} — ${tribunal.label}`,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error desconocido');

            setCausa({ rit: ritClean, tribunal: tribunal.label, ...data });
        } catch (err) {
            setError(`Error al conectar con el servidor: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // ── Marcar alerta como leída ──────────────────────────────
    const marcarAlertaLeida = async (alertaId) => {
        if (!currentUser) return;
        try {
            await updateDoc(
                doc(db, 'radarEventos', currentUser.uid, 'alertas', alertaId),
                { leido: true }
            );
        } catch (e) {
            console.error(e);
        }
    };

    const nivelIcon = (nivel) => ({ CRITICO: '🔴', IMPORTANTE: '🟡', INFORMATIVO: '🔵' }[nivel] || '📌');
    const nivelColor = (nivel) => ({ CRITICO: 'var(--nf-red)', IMPORTANTE: '#f59e0b', INFORMATIVO: 'var(--nf-blue)' }[nivel] || 'var(--nf-text)');

    // ── PANTALLA: Formulario de suscripción ───────────────────
    if (!causa) {
        return (
            <div className="nf-animate-in">
                <div className="nf-module-header">
                    <h1>🔔 Radar Judicial Inteligente</h1>
                    <p>La app vigila el portal judicial por ti, te avisa de movimientos y traduce lo que significan al instante.</p>
                </div>

                {/* Estado del backend */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                    {backendConectado === null && (
                        <div style={{ fontSize: 13, color: 'var(--nf-text3)' }}>⏳ Verificando conexión al servidor...</div>
                    )}
                    {backendConectado === true && (
                        <div style={{ fontSize: 13, color: 'var(--nf-green)', fontWeight: 600 }}>
                            🟢 Servidor conectado — Modo Real Activo
                        </div>
                    )}
                    {backendConectado === false && (
                        <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>
                            🟡 Servidor offline — Modo Demo Activo
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--nf-text3)', fontWeight: 400, marginTop: 2 }}>
                                Ejecuta <code>cd nexo-backend && npm run dev</code> para el modo real
                            </span>
                        </div>
                    )}
                </div>

                <div className="nf-card" style={{ maxWidth: 520, margin: '20px auto' }}>
                    <div className="nf-card-header">
                        <div className="nf-card-icon blue" style={{ animation: 'nf-pulse 2s infinite' }}>📡</div>
                        <div>
                            <div className="nf-card-title">Activar Radar para tu Causa</div>
                            <div className="nf-card-subtitle">Monitoreo automático del Poder Judicial 24/7</div>
                        </div>
                    </div>

                    <div className="nf-form" style={{ marginTop: 24 }}>
                        <div className="nf-field">
                            <label className="nf-label">RIT de Causa *</label>
                            <input
                                className="nf-input"
                                placeholder="Ej: C-1234-2023"
                                value={form.rit}
                                onChange={e => setForm({ ...form, rit: e.target.value })}
                            />
                            <small style={{ color: 'var(--nf-text3)', fontSize: 12 }}>
                                Formato: TIPO-NUMERO-AÑO (ej: C-5432-2022, RIT-123-2023)
                            </small>
                        </div>

                        <div className="nf-field">
                            <label className="nf-label">Tribunal *</label>
                            <select
                                className="nf-select"
                                value={form.tribunalCodigo}
                                onChange={e => setForm({ ...form, tribunalCodigo: e.target.value })}
                            >
                                <option value="">Selecciona Tribunal...</option>
                                {TRIBUNALES_MAP.map(t => (
                                    <option key={t.codigo} value={t.codigo}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        {error && (
                            <div style={{ color: 'var(--nf-red)', fontSize: 14, padding: '10px 14px', background: 'rgba(239,68,68,.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,.2)' }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            className="nf-btn nf-btn-primary"
                            style={{ padding: '16px', fontSize: 16, marginTop: 12 }}
                            onClick={suscribirRadar}
                            disabled={loading || !form.rit || !form.tribunalCodigo}
                        >
                            {loading ? '📡 Conectando al Poder Judicial...' : '📡 Activar Radar'}
                        </button>

                        {!currentUser && (
                            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--nf-text3)', marginTop: 8 }}>
                                ⚠️ Inicia sesión para que las alertas persistan en la nube
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── PANTALLA: Dashboard del Radar ─────────────────────────
    return (
        <div className="nf-animate-in">
            <div className="nf-module-header">
                <h1>📡 Radar Activo: {causa.rit}</h1>
                <p>{causa.tribunal} · Monitoreo {backendConectado ? 'Real' : 'Demo'} en curso</p>
            </div>

            {/* Status cards */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                <div className="nf-card" style={{ flex: 1, minWidth: 240, margin: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: backendConectado ? 'var(--nf-green)' : '#f59e0b', boxShadow: `0 0 10px ${backendConectado ? 'var(--nf-green)' : '#f59e0b'}`, animation: 'nf-pulse 2s infinite' }} />
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--nf-text3)' }}>Estado</div>
                            <div style={{ fontWeight: 600 }}>{backendConectado ? '🟢 Monitoreo Real' : '🟡 Modo Demo'}</div>
                        </div>
                    </div>
                </div>
                <div className="nf-card" style={{ flex: 1, minWidth: 240, margin: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--nf-text3)' }}>Alertas sin leer</div>
                    <div style={{ fontWeight: 700, fontSize: 22, color: alertas.length > 0 ? 'var(--nf-red)' : 'var(--nf-green)' }}>
                        {alertas.length > 0 ? `🚨 ${alertas.length} nueva${alertas.length > 1 ? 's' : ''}` : '✅ Ninguna'}
                    </div>
                </div>
                <div className="nf-card" style={{ flex: 1, minWidth: 240, margin: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--nf-text3)' }}>Movimientos registrados</div>
                    <div style={{ fontWeight: 700, fontSize: 22 }}>{movimientos.length}</div>
                </div>
            </div>

            {/* Alertas activas (Firestore listener en tiempo real) */}
            {alertas.map(alerta => (
                <div key={alerta.id} className="nf-card nf-animate-in" style={{ borderColor: nivelColor(alerta.nivel), background: 'rgba(239,68,68,.04)', marginBottom: 16 }}>
                    <div className="nf-card-header">
                        <div className="nf-card-icon red" style={{ animation: 'nf-pulse 1s infinite' }}>
                            {nivelIcon(alerta.nivel)}
                        </div>
                        <div>
                            <div className="nf-card-title" style={{ color: nivelColor(alerta.nivel) }}>
                                {alerta.nivel === 'CRITICO' ? 'RESOLUCIÓN DETECTADA' : 'NUEVO MOVIMIENTO'}
                            </div>
                            <div className="nf-card-subtitle">{alerta.fecha}</div>
                        </div>
                    </div>
                    <p style={{ color: 'var(--nf-text2)', margin: '12px 0' }}>{alerta.descripcion}</p>
                    {alerta.palabrasClave?.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                            {alerta.palabrasClave.map(kw => (
                                <span key={kw} style={{ fontSize: 11, background: 'var(--nf-bg2)', padding: '2px 8px', borderRadius: 20, color: 'var(--nf-text3)' }}>
                                    {kw}
                                </span>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="nf-btn nf-btn-primary" onClick={() => onNavigate('diagnostico')}>
                            Reevaluar Diagnóstico →
                        </button>
                        <button className="nf-btn nf-btn-ghost" onClick={() => marcarAlertaLeida(alerta.id)}>
                            ✓ Marcar como leído
                        </button>
                    </div>
                </div>
            ))}

            {/* Historial de movimientos */}
            <div className="nf-card">
                <h3 style={{ marginBottom: 16, fontSize: 18, borderBottom: '1px solid var(--nf-border)', paddingBottom: 12 }}>
                    Historial de Movimientos
                    {!backendConectado && <span style={{ fontSize: 12, color: '#f59e0b', marginLeft: 8 }}>(Demo)</span>}
                </h3>
                {movimientos.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--nf-text3)', padding: '40px 20px' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                        <p>Sin movimientos registrados aún.</p>
                        <p style={{ fontSize: 13 }}>El scheduler revisará el PJUD en los próximos minutos.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {movimientos.map((m, i) => (
                            <div key={i} style={{ display: 'flex', gap: 16 }}>
                                <div style={{ fontSize: 20, width: 36, flexShrink: 0 }}>
                                    {nivelIcon(m.nivel)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <div style={{ fontWeight: 600, color: nivelColor(m.nivel) }}>{m.descripcion}</div>
                                        <div style={{ fontSize: 12, color: 'var(--nf-text3)' }}>{m.fecha}</div>
                                    </div>
                                    {m.tipo && <div style={{ color: 'var(--nf-text3)', fontSize: 12 }}>{m.tipo}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button className="nf-btn nf-btn-ghost" onClick={() => { setCausa(null); setAlertas([]); setMovimientos([]); }}>
                    ← Suscribir otra causa
                </button>
            </div>
        </div>
    );
}
