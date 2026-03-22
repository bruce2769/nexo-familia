import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';

const LS_KEY = 'nexo-historial';
const BACKEND_URL = import.meta.env.VITE_NEXO_BACKEND_URL || 'http://localhost:8001';

export function saveToHistorial(entry) {
    try {
        const h = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
        h.unshift({ ...entry, id: Date.now(), date: new Date().toLocaleString('es-CL') });
        if (h.length > 50) h.length = 50;
        localStorage.setItem(LS_KEY, JSON.stringify(h));
    } catch { }
}

const TYPE_META = {
    causa: { icon: '📋', label: 'Causa', color: 'purple' },
    financiero: { icon: '💰', label: 'Financiero', color: 'blue' },
    riesgo: { icon: '🚦', label: 'Riesgo', color: 'green' },
    escritos: { icon: '📝', label: 'Escritos', color: 'red' },
};

export default function HistorialModule({ onNavigate }) {
    const { currentUser } = useAuth();
    const [historial, setHistorial] = useState([]);
    const [filter, setFilter] = useState('all');
    const [expanded, setExpanded] = useState(null);

    useEffect(() => {
        let localH = [];
        try {
            localH = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
        } catch { }
        
        setHistorial(localH);

        if (currentUser && !currentUser.isAnonymous) {
            fetch(`${BACKEND_URL}/api/v1/escritos/history/${currentUser.uid}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        const backendH = data.map(d => ({
                            id: d.id,
                            type: 'escritos',
                            title: `Documento Generado: ${d.tipoLabel || 'Legal'}`,
                            date: new Date(d.createdAt).toLocaleString('es-CL'),
                            summary: d.preview ? `Vista previa: "${d.preview}..."` : 'Documento legal generado vía backend.',
                            details: {
                                'Tribunal': d.tribunal,
                                'RIT': d.rit,
                                'RUT': d.datos_personales?.rut
                            },
                            fromBackend: true
                        }));
                        setHistorial(prev => {
                            // Merge and strictly sort by date descending or just map appending
                            const combined = [...prev.filter(x => !x.fromBackend), ...backendH];
                            // Try sorting by pseudo date id or keep backend list on top
                            return combined.sort((a, b) => b.id > a.id ? 1 : -1); 
                        });
                    }
                })
                .catch(err => console.error("Could not fetch remote history", err));
        }
    }, [currentUser]);

    const clearAll = () => {
        if (confirm('¿Eliminar todo el historial?')) {
            localStorage.removeItem(LS_KEY);
            setHistorial([]);
        }
    };

    const deleteItem = (id) => {
        const item = historial.find(h => h.id === id);
        if (item && item.fromBackend) {
            alert("No se pueden eliminar registros oficiales de backend aún.");
            return;
        }
        const updated = historial.filter(h => h.id !== id);
        setHistorial(updated);
        localStorage.setItem(LS_KEY, JSON.stringify(updated.filter(h => !h.fromBackend)));
    };

    const filtered = filter === 'all' ? historial : historial.filter(h => h.type === filter);

    return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>🕐 Historial de Consultas</h1>
                <p>Todas tus consultas guardadas localmente. Revisa resultados anteriores sin volver a calcular.</p>
            </div>

            {historial.length === 0 ? (
                <div className="nf-card nf-animate-in" style={{ textAlign: 'center', padding: 60 }}>
                    <p style={{ fontSize: 48, marginBottom: 16 }}>📭</p>
                    <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Sin consultas aún</p>
                    <p style={{ color: 'var(--nf-text3)', marginBottom: 24 }}>Aún no tienes escritos generados ni consultas previas. ¡Comienza ahora y simplifica tus trámites legales!</p>
                    <button className="nf-btn nf-btn-primary" onClick={() => onNavigate('escritos')}>
                        📋 Generar mi primer escrito
                    </button>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                        <div className="nf-filter-bar" style={{ marginBottom: 0, flex: 1 }}>
                            <button className={`nf-filter-chip${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
                                📌 Todos ({historial.length})
                            </button>
                            {Object.entries(TYPE_META).map(([key, meta]) => {
                                const count = historial.filter(h => h.type === key).length;
                                return (
                                    <button key={key} className={`nf-filter-chip${filter === key ? ' active' : ''}`} onClick={() => setFilter(key)}>
                                        {meta.icon} {meta.label} ({count})
                                    </button>
                                );
                            })}
                        </div>
                        <button className="nf-btn nf-btn-ghost" onClick={clearAll} style={{ color: 'var(--nf-red)', fontSize: 13 }}>
                            🗑️ Borrar todo
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {filtered.map((h, i) => {
                            const meta = TYPE_META[h.type] || TYPE_META.causa;
                            return (
                                <div
                                    className="nf-history-card nf-animate-in"
                                    key={h.id}
                                    style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}
                                >
                                    <div className="nf-history-card-top" onClick={() => setExpanded(expanded === h.id ? null : h.id)}>
                                        <div className={`nf-card-icon ${meta.color}`} style={{ width: 38, height: 38, fontSize: 18 }}>
                                            {meta.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 15 }}>{h.title}</div>
                                            <div style={{ fontSize: 12, color: 'var(--nf-text3)' }}>{h.date}</div>
                                        </div>
                                        <span className={`nf-badge ${meta.color}`}>{meta.label}</span>
                                        <span style={{ color: 'var(--nf-text3)', fontSize: 18, cursor: 'pointer', marginLeft: 8 }}>
                                            {expanded === h.id ? '▲' : '▼'}
                                        </span>
                                    </div>
                                    {expanded === h.id && (
                                        <div className="nf-history-card-body">
                                            {h.summary && <p style={{ color: 'var(--nf-text2)', fontSize: 14, lineHeight: 1.6 }}>{h.summary}</p>}
                                            {h.details && (
                                                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    {Object.entries(h.details).map(([key, val]) => (
                                                        <div key={key} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                                                            <span style={{ color: 'var(--nf-text3)', minWidth: 120 }}>{key}:</span>
                                                            <span style={{ color: 'var(--nf-text)' }}>{val}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                                <button className="nf-btn nf-btn-ghost" onClick={() => deleteItem(h.id)} style={{ color: 'var(--nf-red)', fontSize: 12 }}>
                                                    🗑️ Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {filtered.length === 0 && (
                        <div className="nf-card" style={{ textAlign: 'center', padding: 40, color: 'var(--nf-text3)' }}>
                            <p>No hay consultas en esta categoría.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
