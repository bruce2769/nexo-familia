import React, { useState } from 'react';

export default function Navbar({ tabs, activeTab, onTabChange }) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <nav className="nf-navbar">
            <div className="nf-navbar-inner">
                <div className="nf-logo" onClick={() => onTabChange('diagnostico')} style={{ cursor: 'pointer' }}>
                    <span>⚖️</span> Nexo Familia
                </div>

                {/* Mobile toggle */}
                <button
                    className="nf-mobile-toggle"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Menu"
                >
                    {mobileOpen ? '✕' : '☰'}
                </button>

                <div className={`nf-nav-tabs${mobileOpen ? ' mobile-open' : ''}`}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`nf-nav-tab${activeTab === tab.id ? ' active' : ''}${tab.highlight ? ' highlight' : ''}`}
                            onClick={() => { onTabChange(tab.id); setMobileOpen(false); }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        </nav>
    );
}
