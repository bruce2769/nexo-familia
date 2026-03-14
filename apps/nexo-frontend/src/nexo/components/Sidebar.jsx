import React, { useState } from 'react';

export default function Sidebar({ tabs, activeTab, onTabChange }) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile toggle button (visible only on small screens) */}
            <button
                className="nf-mobile-toggle sidebar-toggle"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menu"
            >
                {mobileOpen ? '✕' : '☰'}
            </button>

            <aside className={`nf-sidebar${mobileOpen ? ' mobile-open' : ''}`}>
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
                            onClick={() => { onTabChange(tab.id); setMobileOpen(false); }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="nf-sidebar-footer">
                    <p>&copy; 2026 Nexo Familia</p>
                </div>
            </aside>
            
            {/* Overlay for mobile when sidebar is open */}
            {mobileOpen && (
                <div className="nf-sidebar-overlay" onClick={() => setMobileOpen(false)}></div>
            )}
        </>
    );
}
