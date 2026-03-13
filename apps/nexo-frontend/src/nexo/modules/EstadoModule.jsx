import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { db } from '../../firebase/db.js';
import {
    collection, addDoc, onSnapshot, query,
    where, orderBy, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';

const BACKEND_URL = import.meta.env.VITE_NEXO_BACKEND_URL || 'http://localhost:8001';

// ─── Tipo de causa → icono y color ───────────────────────────────────────────
const TIPO_META = {
    Alimentos:        { icon: '🍽️', color: 'blue' },
    Visitas:          { icon: '👨‍👧', color: 'green' },
    'Cuidado Personal': { icon: '🏠', color: 'purple' },
    VIF:              { icon: '🛡️', color: 'red' },
    Otro:             { icon: '📄', color: 'yellow' },
};

export default function EstadoModule() {
    const { currentUser } = useAuth();

    const [causas, setCausas]       = useState([]);
    const [loading, setLoading]     = useState(true);
    const [saving, setSaving]       = useState(false);
    const [showForm, setShowForm]   = useState(false);
    const [selected, setSelected]   = useState(null);
    const [error, setError]         = useState(null);

    const [form, setForm] = useState({
        numero: '', tipo: 'Alimentos', contraparte: '', tribunal: '',
        estado: 'En tramitación', riesgo: 'bajo', notas: ''
    });

    // ── Firestore listener: causas del usuario en tiempo real ─────────────────
    useEffect(() => {
        if (!currentUser) {
            // Sin sesión → localStorage
            try {
                const local = JSON.parse(localStorage.getItem('nexo-causas') || '[]');
                setCausas(local);
            } catch { setCausas([]); }
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'causas_usuario'),
            where('userId', '==', currentUser.uid),
            orderBy('creadoAt', 'desc')
        );

        const unsub = onSnapshot(q, (snap) => {
            setCausas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (err) => {
            console.error('[EstadoModule] Firestore error:', err);
            setError('Error cargando causas. Verifica tu conexión.');
            setLoading(false);
        });

        return () => unsub();
    }, [currentUser]);

    // ── Agregar causa ─────────────────────────────────────────────────────────
    const addCausa = useCallback(async () => {
        if (!form.numero.trim()) return;
        setSaving(true);
        setError(null);

        const nuevaCausa = {
            ...form,
            numero: form.numero.trim().toUpperCase(),
            userId: currentUser?.uid || 'anonimo',
            fechaAgregada: new Date().toLocaleDateString('es-CL'),
            creadoAt: serverTimestamp(),
            // Historial de eventos manual (inicia vacío, usuario puede agregar)
            historialEventos: [],
        };

        try {
            if (currentUser) {
                await addDoc(collection(db, 'causas_usuario'), nuevaCausa);
            } else {
                // Sin sesión → localStorage
                const id = Date.now();
                const local = JSON.parse(localStorage.getItem('nexo-causas') || '[]');
                localStorage.setItem('nexo-causas', JSON.stringify([{ id, ...nuevaCausa }, ...local]));
                setCausas(prev => [{ id, ...nuevaCausa }, ...prev]);
            }
            setForm({ numero: '', tipo: 'Alimentos', contraparte: '', tribunal: '', estado: 'En tramitación', riesgo: 'bajo', notas: '' });
            setShowForm(false);
        } catch (err) {
            setError(`Error al guardar: ${err.message}`);
        } finally {
            setSaving(false);
        }
    }, [form, currentUser]);

    // ── Eliminar causa ────────────────────────────────────────────────────────
    const removeCausa = useCallback(async (causa) => {
        try {
            if (currentUser && causa.id && typeof causa.id === 'string') {
                await deleteDoc(doc(db, 'causas_usuario', causa.id));
            } else {
                const local = JSON.parse(localStorage.getItem('nexo-causas') || '[]');
                localStorage.setItem('nexo-causas', JSON.stringify(local.filter(c => c.id !== causa.id)));
                setCausas(prev => prev.filter(c => c.id !== causa.id));
            }
            if (selected === causa.id) setSelected(null);
        } catch (err) {
            setError(`Error al eliminar: ${err.message}`);
        }
    }, [currentUser, selected]);

    const activeCausa = causas.find(c => c.id === selected);
    const meta = (tipo) => TIPO_META[tipo] || TIPO_META.Otro;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>📍 Estado de Mis Causas</h1>
                <p>Registra tus causas judiciales y monitorea su estado. Los datos se guardan en la nube.</p>
            </div>

            {/* Badge de conexión */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                {currentUser ? (
                    <span className="nf-badge green">☁️ Sincronizado con Firestore</span>
                ) : (
                    <span className="nf-badge yellow">💾 Modo local — Inicia sesión para sincronizar</span>
                )}
            </div>

            {error && (
                <div style={{ color: 'var(--nf-red)', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Botón agregar */}
            {!showForm && (
                <div className="nf-animate-in" style={{ marginBottom: 24 }}>
                    <button className="nf-btn nf-btn-primary" onClick={() => setShowForm(true)}>
                        ➕ Agregar Causa
                    </button>
                </div>
            )}

            {/* Formulario */}
            {showForm && (
                <div className="nf-card nf-animate-in" style={{ marginBottom: 24 }}>
                    <div className="nf-card-header">
                        <div className="nf-card-icon purple">➕</div>
                        <div>
                            <div className="nf-card-title">Agregar Nueva Causa</div>
                            <div className="nf-card-subtitle">Los datos se guardan en la nube asociados a tu cuenta</div>
                        </div>
                    </div>
                    <div className="nf-form">
                        <div className="nf-row">
                            <div className="nf-field">
                                <label className="nf-label">Número de Causa / RIT *</label>
                                <input className="nf-input" placeholder="Ej: C-1234-2024" value={form.numero}
                                    onChange={e => setForm({ ...form, numero: e.target.value })} />
                            </div>
                            <div className="nf-field">
                                <label className="nf-label">Tipo</label>
                                <select className="nf-select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                                    {Object.keys(TIPO_META).map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="nf-row">
                            <div className="nf-field">
                                <label className="nf-label">Contraparte</label>
                                <input className="nf-input" placeholder="Nombre" value={form.contraparte}
                                    onChange={e => setForm({ ...form, contraparte: e.target.value })} />
                            </div>
                            <div className="nf-field">
                                <label className="nf-label">Tribunal</label>
                                <input className="nf-input" placeholder="Ej: Tribunal de Familia Santiago" value={form.tribunal}
                                    onChange={e => setForm({ ...form, tribunal: e.target.value })} />
                            </div>
                        </div>
                        <div className="nf-row">
                            <div className="nf-field">
                                <label className="nf-label">Estado actual</label>
                                <select className="nf-select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                                    <option>En tramitación</option>
                                    <option>Audiencia pendiente</option>
                                    <option>Sentencia dictada</option>
                                    <option>En cumplimiento</option>
                                    <option>Liquidación en curso</option>
                                    <option>Con apremios decretados</option>
                                    <option>Cerrada</option>
                                </select>
                            </div>
                            <div className="nf-field">
                                <label className="nf-label">Nivel de Riesgo</label>
                                <select className="nf-select" value={form.riesgo} onChange={e => setForm({ ...form, riesgo: e.target.value })}>
                                    <option value="bajo">🟢 Bajo</option>
                                    <option value="medio">🟡 Medio</option>
                                    <option value="alto">🔴 Alto</option>
                                </select>
                            </div>
                        </div>
                        <div className="nf-field">
                            <label className="nf-label">Notas personales (opcional)</label>
                            <textarea className="nf-textarea" style={{ minHeight: 72 }} placeholder="Anota lo que necesites recordar sobre esta causa..."
                                value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="nf-btn nf-btn-primary" onClick={addCausa} disabled={saving || !form.numero.trim()}>
                                {saving ? '⏳ Guardando...' : '✅ Agregar'}
                            </button>
                            <button className="nf-btn nf-btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading ? (
                <div className="nf-card nf-animate-in" style={{ textAlign: 'center', padding: 48 }}>
                    <p style={{ fontSize: 32, marginBottom: 12 }}>⏳</p>
                    <p style={{ color: 'var(--nf-text3)' }}>Cargando causas...</p>
                </div>
            ) : causas.length === 0 && !showForm ? (
                <div className="nf-card nf-animate-in" style={{ textAlign: 'center', padding: 60 }}>
                    <p style={{ fontSize: 48, marginBottom: 16 }}>📍</p>
                    <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No tienes causas registradas</p>
                    <p style={{ color: 'var(--nf-text3)', marginBottom: 24 }}>Agrega tus causas judiciales para llevar un registro real.</p>
                    <button className="nf-btn nf-btn-primary" onClick={() => setShowForm(true)}>➕ Agregar mi primera causa</button>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: 16, flexDirection: causas.length > 0 && selected ? 'row' : 'column' }}>
                    {/* Lista */}
                    <div style={{ flex: selected ? '0 0 320px' : 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {causas.map((c, i) => (
                            <div
                                key={c.id}
                                className={`nf-estado-card nf-animate-in${selected === c.id ? ' selected' : ''}`}
                                style={{ animationDelay: `${i * 0.05}s`, cursor: 'pointer' }}
                                onClick={() => setSelected(selected === c.id ? null : c.id)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div className={`nf-card-icon ${meta(c.tipo).color}`} style={{ width: 40, height: 40, fontSize: 16 }}>
                                        {meta(c.tipo).icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 15 }}>{c.numero}</div>
                                        <div style={{ fontSize: 12, color: 'var(--nf-text3)' }}>{c.tipo} · {c.tribunal || 'Sin tribunal'}</div>
                                    </div>
                                    <div className={`nf-status-dot ${c.riesgo}`} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Detalle */}
                    {activeCausa && (
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="nf-card nf-animate-in">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                                    <div>
                                        <h2 style={{ fontSize: 22, fontWeight: 700 }}>{activeCausa.numero}</h2>
                                        <div style={{ color: 'var(--nf-text3)', fontSize: 13, marginTop: 4 }}>
                                            {activeCausa.tipo} · {activeCausa.tribunal || 'Tribunal no especificado'} · Agregada el {activeCausa.fechaAgregada}
                                        </div>
                                    </div>
                                    <button className="nf-btn nf-btn-ghost" onClick={() => removeCausa(activeCausa)}
                                        style={{ color: 'var(--nf-red)', fontSize: 12 }}>
                                        🗑️ Eliminar
                                    </button>
                                </div>

                                <div className="nf-result-grid cols-2" style={{ marginBottom: 20 }}>
                                    <div className="nf-result-item">
                                        <div className="label"><span>📊</span> Estado Actual</div>
                                        <div className="value" style={{ fontWeight: 600, color: 'var(--nf-accent)' }}>{activeCausa.estado}</div>
                                    </div>
                                    <div className="nf-result-item">
                                        <div className="label"><span>🚦</span> Nivel de Riesgo</div>
                                        <div className="value">
                                            <span className={`nf-badge ${activeCausa.riesgo === 'alto' ? 'red' : activeCausa.riesgo === 'medio' ? 'yellow' : 'green'}`} style={{ fontSize: 14 }}>
                                                {activeCausa.riesgo === 'alto' ? '🔴 Alto' : activeCausa.riesgo === 'medio' ? '🟡 Medio' : '🟢 Bajo'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {activeCausa.contraparte && (
                                    <div className="nf-result-item" style={{ marginBottom: 16 }}>
                                        <div className="label"><span>👤</span> Contraparte</div>
                                        <div className="value">{activeCausa.contraparte}</div>
                                    </div>
                                )}

                                {activeCausa.notas && (
                                    <div className={`nf-alert warning`} style={{ marginBottom: 16 }}>
                                        <span className="nf-alert-icon">📝</span>
                                        <div><strong>Notas:</strong><br />{activeCausa.notas}</div>
                                    </div>
                                )}

                                <div style={{ fontSize: 12, color: 'var(--nf-text3)', textAlign: 'right', marginTop: 8, fontStyle: 'italic' }}>
                                    {currentUser ? '☁️ Guardado en Firestore · ' : '💾 Local · '}{activeCausa.fechaAgregada}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
