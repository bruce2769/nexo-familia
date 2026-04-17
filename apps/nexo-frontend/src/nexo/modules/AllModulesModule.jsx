import React from 'react';

const TOOLS = [
    { id: 'diagnostico', label: 'Diagnóstico Legal', icon: '🧠', desc: 'Evalúa tu situación y riesgo' },
    { id: 'copiloto', label: 'Abogado IA', icon: '🤖', desc: 'Chat legal 24/7' },
    { id: 'escritos', label: 'Escritos IA', icon: '📝', desc: 'Generación con IA' },
    { id: 'documentos', label: 'Documentos Pro', icon: '📄', desc: 'Plantillas rápidas' },
    { id: 'calculadora', label: 'Calculadora', icon: '🧮', desc: 'IPC y Pensiones' },
    { id: 'scanner', label: 'Escáner IA', icon: '🔍', desc: 'Sube fotos o PDF' },
    { id: 'muro', label: 'Comunidad', icon: '🤝', desc: 'Muro de apoyo' },
    { id: 'guias', label: 'Guías', icon: '📚', desc: 'Paso a paso' },
    { id: 'glosario', label: 'Glosario', icon: '📖', desc: 'Diccionario legal' },
    { id: 'historial', label: 'Historial', icon: '🕐', desc: 'Tus actividades' },
    { id: 'auth', label: 'Mi Perfil', icon: '👤', desc: 'Gestión de cuenta' },
];

export default function AllModulesModule({ onNavigate }) {
    return (
        <div className="nf-animate-in">
            <div className="nf-module-header">
                <h1>🛠️ Herramientas y Módulos</h1>
                <p>Accede a todas las funcionalidades de Nexo Familia desde un solo lugar.</p>
            </div>

            <div className="nf-guides-grid">
                {TOOLS.map((tool, i) => (
                    <div
                        key={tool.id}
                        className="nf-guide-card"
                        onClick={() => onNavigate(tool.id)}
                        style={{ animationDelay: `${i * 0.04}s`, cursor: 'pointer' }}
                    >
                        <div className="nf-card-icon purple" style={{ width: 48, height: 48, fontSize: 22 }}>
                            {tool.icon}
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <div className="nf-card-title" style={{ fontSize: 16 }}>{tool.label}</div>
                            <div className="nf-card-subtitle" style={{ fontSize: 12 }}>{tool.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
