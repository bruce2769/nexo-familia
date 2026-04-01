import React from 'react';

export default function Sidebar({ tabs, activeTab, onTabChange }) {
    return (
        <aside className="nf-sidebar">
            <div className="nf-sidebar-header">
                <div className="nf-logo" onClick={() => onTabChange('diagnostico')} style={{ cursor: 'pointer' }}>
                    <span>⚖️</span> Nexo Familia
                </div>
                <p className="nf-sidebar-subtitle">Tu Copiloto Legal</p>
            </div>

            <div className="nf-sidebar-nav">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`nf-sidebar-item${activeTab === tab.id ? ' active' : ''}${tab.highlight ? ' highlight' : ''}`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="nf-sidebar-footer">
                <p>&copy; 2026 Nexo Familia</p>
            </div>
        </aside>
    );
}
