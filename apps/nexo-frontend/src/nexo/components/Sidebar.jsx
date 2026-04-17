import React from 'react';
import CreditBanner from './CreditBanner.jsx';

export default function Sidebar({ tabs, activeTab, onTabChange, credits }) {
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

            <div style={{ padding: '0 16px' }}>
                <CreditBanner credits={credits} onNavigate={onTabChange} />
            </div>

            <div className="nf-sidebar-footer">
                <p>&copy; 2026 Nexo Familia</p>
            </div>
        </aside>
    );
}
