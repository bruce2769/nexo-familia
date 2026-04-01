import React from 'react';
import { Home, ClipboardList, PenTool, MessageSquare, User } from 'lucide-react';

export default function BottomNav({ activeTab, onTabChange }) {
    const tabs = [
        { id: 'muro', label: 'Inicio', icon: Home },
        { id: 'diagnostico', label: 'Diagnosticar', icon: ClipboardList },
        { id: 'escritos', label: 'Escritos', icon: PenTool },
        { id: 'copiloto', label: 'Copiloto', icon: MessageSquare },
        { id: 'auth', label: 'Perfil', icon: User }
    ];

    return (
        <nav className="nf-bottom-nav">
            {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        className={`nf-bottom-nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        <Icon className="nf-bottom-nav-icon" size={24} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="nf-bottom-nav-label">{tab.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
