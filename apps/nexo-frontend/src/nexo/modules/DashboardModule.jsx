import React, { useState, useEffect } from 'react';

const STATS = [
    { label: 'Causas Analizadas', target: 2847, icon: '📋', color: 'purple' },
    { label: 'Cálculos Financieros', target: 1523, icon: '💰', color: 'blue' },
    { label: 'Evaluaciones de Riesgo', target: 964, icon: '🚦', color: 'green' },
    { label: 'Comunidad Activa', target: 412, icon: '💬', color: 'yellow' },
];

const MODULES = [
    {
        id: 'causa',
        icon: '📋',
        title: 'Interpretación de Causa',
        desc: 'Traduce tu causa judicial a lenguaje simple. Entiende qué está pasando y qué viene después.',
        color: 'purple',
        tag: 'Más usado',
    },
    {
        id: 'financiero',
        icon: '💰',
        title: 'Impacto Financiero',
        desc: 'Calcula deuda acumulada, proyecciones y simula escenarios de pago.',
        color: 'blue',
        tag: 'Nuevo simulador',
    },
    {
        id: 'riesgo',
        icon: '🚦',
        title: 'Riesgo y Consecuencias',
        desc: 'Evalúa tu nivel de riesgo con el sistema de semáforo y recibe un plan de acción.',
        color: 'green',
        tag: 'Con recomendaciones',
    },
    {
        id: 'muro',
        icon: '💬',
        title: 'Muro Comunitario',
        desc: 'Comparte experiencias y lee las de otros en un espacio anónimo y seguro.',
        color: 'yellow',
        tag: 'Con respuestas',
    },
    {
        id: 'guias',
        icon: '📚',
        title: 'Guías Legales',
        desc: 'Guías paso a paso sobre pensiones, liquidaciones, registros y más.',
        color: 'blue',
        tag: '5 guías',
    },
    {
        id: 'glosario',
        icon: '📖',
        title: 'Glosario Legal',
        desc: 'Diccionario de términos legales explicados en lenguaje simple.',
        color: 'purple',
        tag: '+60 términos',
    },
];

function AnimatedCounter({ target, duration = 2000 }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) {
                setCount(target);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration]);

    return <span>{count.toLocaleString('es-CL')}</span>;
}

export default function DashboardModule({ onNavigate }) {
    const [historial, setHistorial] = useState([]);

    useEffect(() => {
        try {
            const h = JSON.parse(localStorage.getItem('nexo-historial') || '[]');
            setHistorial(h.slice(0, 5));
        } catch { }
    }, []);

    return (
        <div>
            {/* Hero */}
            <div className="nf-hero nf-animate-in">
                <div className="nf-hero-badge">⚖️ Plataforma de Inteligencia Legal</div>
                <h1 className="nf-hero-title">
                    Entiende tu causa.<br />
                    <span className="nf-hero-accent">Sin jerga legal.</span>
                </h1>
                <p className="nf-hero-desc">
                    Nexo Familia traduce tu situación judicial a lenguaje simple, calcula tu impacto financiero y evalúa tu nivel de riesgo. Todo en un solo lugar.
                </p>
                <div className="nf-hero-actions">
                    <button className="nf-btn nf-btn-primary" onClick={() => onNavigate('causa')}>
                        🔍 Interpretar mi Causa
                    </button>
                    <button className="nf-btn nf-btn-secondary" onClick={() => onNavigate('guias')}>
                        📚 Ver Guías Legales
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="nf-stats-grid nf-animate-in" style={{ animationDelay: '.1s' }}>
                {STATS.map((s, i) => (
                    <div className="nf-stat-card" key={i}>
                        <div className={`nf-card-icon ${s.color}`}>{s.icon}</div>
                        <div className="nf-stat-value">
                            <AnimatedCounter target={s.target} />
                        </div>
                        <div className="nf-stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Quick Access Modules */}
            <div className="nf-module-header nf-animate-in" style={{ animationDelay: '.15s', marginTop: 40 }}>
                <h1>🧩 Módulos</h1>
                <p>Accede rápidamente a cada herramienta de la plataforma.</p>
            </div>

            <div className="nf-modules-grid nf-animate-in" style={{ animationDelay: '.2s' }}>
                {MODULES.map(m => (
                    <div
                        className="nf-module-card"
                        key={m.id}
                        onClick={() => onNavigate(m.id)}
                        role="button"
                        tabIndex={0}
                    >
                        <div className="nf-module-card-top">
                            <div className={`nf-card-icon ${m.color}`}>{m.icon}</div>
                            <span className={`nf-badge ${m.color}`}>{m.tag}</span>
                        </div>
                        <div className="nf-module-card-title">{m.title}</div>
                        <div className="nf-module-card-desc">{m.desc}</div>
                        <div className="nf-module-card-arrow">→</div>
                    </div>
                ))}
            </div>

            {/* Recent History */}
            {historial.length > 0 && (
                <div style={{ marginTop: 40 }}>
                    <div className="nf-module-header nf-animate-in" style={{ animationDelay: '.25s' }}>
                        <h1>🕐 Consultas Recientes</h1>
                        <p>Tu actividad guardada localmente.</p>
                    </div>
                    <div className="nf-animate-in" style={{ animationDelay: '.3s', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {historial.map((h, i) => (
                            <div className="nf-history-item" key={i} onClick={() => onNavigate('historial')}>
                                <span className="nf-history-icon">
                                    {h.type === 'causa' ? '📋' : h.type === 'financiero' ? '💰' : '🚦'}
                                </span>
                                <div className="nf-history-info">
                                    <div className="nf-history-title">{h.title}</div>
                                    <div className="nf-history-date">{h.date}</div>
                                </div>
                                <span className={`nf-badge ${h.type === 'causa' ? 'purple' : h.type === 'financiero' ? 'blue' : 'green'}`}>
                                    {h.type === 'causa' ? 'Causa' : h.type === 'financiero' ? 'Financiero' : 'Riesgo'}
                                </span>
                            </div>
                        ))}
                    </div>
                    <button className="nf-btn nf-btn-ghost" style={{ marginTop: 12 }} onClick={() => onNavigate('historial')}>
                        Ver todo el historial →
                    </button>
                </div>
            )}
        </div>
    );
}
