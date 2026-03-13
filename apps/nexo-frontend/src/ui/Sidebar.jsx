import React from 'react';

const NAV_ITEMS = [
    { id: 'design', icon: '🎨', label: 'Diseño' },
    { id: 'cutlist', icon: '📋', label: 'Cortes' },
    { id: 'optimize', icon: '🧩', label: 'Optimizar' },
    { id: 'costs', icon: '💰', label: 'Costos' },
    { id: 'quote', icon: '📄', label: 'Cotización' },
    { id: 'workorder', icon: '🔧', label: 'Orden' },
    { id: 'inventory', icon: '📦', label: 'Inventario' },
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
];

export const Sidebar = ({ activeTab, onTabChange }) => {
    return (
        <nav className="erp-sidebar">
            <div className="sidebar-brand">
                <span className="sidebar-logo">⊕</span>
                <span className="sidebar-title">MueblePro</span>
            </div>
            <div className="sidebar-nav">
                {NAV_ITEMS.map(item => (
                    <button
                        key={item.id}
                        className={`sidebar-btn ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => onTabChange(item.id)}
                        title={item.label}
                    >
                        <span className="sidebar-icon">{item.icon}</span>
                        <span className="sidebar-label">{item.label}</span>
                    </button>
                ))}
            </div>
            <div className="sidebar-footer">
                <span className="sidebar-version">v5.0 Enterprise</span>
            </div>
        </nav>
    );
};
