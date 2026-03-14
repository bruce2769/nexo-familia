import React, { useState, useEffect } from 'react';
import './nexo.css';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import DiagnosticoModule from './modules/DiagnosticoModule.jsx';
import CausaModule from './modules/CausaModule.jsx';
import RiesgoModule from './modules/RiesgoModule.jsx';
import MuroModule from './modules/MuroModule.jsx';
import GuiasModule from './modules/GuiasModule.jsx';
import GlosarioModule from './modules/GlosarioModule.jsx';
import HistorialModule from './modules/HistorialModule.jsx';
import DocumentosModule from './modules/DocumentosModule.jsx';
import ScannerModule from './modules/ScannerModule.jsx';
import RadarModule from './modules/RadarModule.jsx';
import EstadoModule from './modules/EstadoModule.jsx';
import CalculadoraModule from './modules/CalculadoraModule.jsx';
import AuthModule from './modules/AuthModule.jsx'; // Nuevo módulo de login
import CopilotoModule from './modules/CopilotoModule.jsx'; // Nuevo módulo copiloto offline
import MapaJuecesModule from './modules/MapaJuecesModule.jsx'; // Pilar 3: ML de Sentencias
import { AuthProvider, useAuth } from '../contexts/AuthContext.jsx'; // Nuevo contexto

const TABS = [
    { id: 'diagnostico', label: '🧠 Diagnóstico', highlight: true },
    { id: 'copiloto', label: '🤖 Copiloto IA', highlight: true },
    { id: 'causa', label: '📋 Causa' },
    { id: 'calculadora', label: '🧮 Calculadora Financiera' },
    { id: 'muro', label: '💬 Comunidad' },
    { id: 'radar', label: '🔔 Radar', highlight: true },
    { id: 'mapa-jueces', label: '🗺️ Mapa de Jueces', highlight: true },
    { id: 'riesgo', label: '🚦 Riesgo' },
    { id: 'estado', label: '📍 Mis Causas' },
    { id: 'documentos', label: '📄 Documentos' },
    { id: 'scanner', label: '🔍 Escáner' },
    { id: 'guias', label: '📚 Guías' },
    { id: 'glosario', label: '📖 Glosario' },
    { id: 'historial', label: '🕐 Historial' }
];

export default function NexoApp() {
    return (
        <AuthProvider>
            <NexoAppContent />
        </AuthProvider>
    );
}

function NexoAppContent() {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('diagnostico');
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem('nexo-onboarded')) {
            setShowOnboarding(true);
        }
    }, []);

    const closeOnboarding = () => {
        setShowOnboarding(false);
        localStorage.setItem('nexo-onboarded', '1');
    };

    const navigate = (tabId) => {
        setActiveTab(tabId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const renderModule = () => {
        switch (activeTab) {
            case 'diagnostico': return <DiagnosticoModule onNavigate={navigate} />;
            case 'causa': return <CausaModule />;
            case 'calculadora': return <CalculadoraModule />;
            case 'radar': return <RadarModule onNavigate={navigate} />;
            case 'riesgo': return <RiesgoModule />;
            case 'estado': return <EstadoModule />;
            case 'documentos': return <DocumentosModule />;
            case 'scanner': return <ScannerModule />;
            case 'muro': return <MuroModule />;
            case 'guias': return <GuiasModule />;
            case 'glosario': return <GlosarioModule />;
            case 'historial': return <HistorialModule onNavigate={navigate} />;
            case 'auth': return <AuthModule onNavigate={navigate} />;
            case 'copiloto': return <CopilotoModule />;
            case 'mapa-jueces': return <MapaJuecesModule />;
            default: return <DiagnosticoModule onNavigate={navigate} />;
        }
    };

    // Agregar la tab de Auth dinámicamente según estado
    const APP_TABS = [
        ...TABS,
        { id: 'auth', label: currentUser ? '👤 Mi Perfil' : '🔑 Ingresar' }
    ];

    return (
        <div className="nf-app">
            <Navbar tabs={APP_TABS} activeTab={activeTab} onTabChange={navigate} />
            <main className="nf-main" key={activeTab}>
                {renderModule()}
            </main>
            <Footer />

            {/* Onboarding Modal */}
            {showOnboarding && (
                <div className="nf-modal-overlay" onClick={closeOnboarding}>
                    <div className="nf-modal" onClick={e => e.stopPropagation()}>
                        <div className="nf-modal-icon">⚖️</div>
                        <h2 className="nf-modal-title">Bienvenido a Nexo Familia</h2>
                        <p className="nf-modal-desc">
                            La primera plataforma de inteligencia legal para causas de familia en Chile.
                            Interpreta tu causa, calcula tu impacto financiero, evalúa tu riesgo y genera documentos legales.
                        </p>
                        <div className="nf-modal-features">
                            <div className="nf-modal-feature"><span>🧠</span> Diagnóstico inteligente guiado</div>
                            <div className="nf-modal-feature"><span>🧮</span> Calculadora de pensión (IPC)</div>
                            <div className="nf-modal-feature"><span>📋</span> Interpreta causas judiciales</div>
                            <div className="nf-modal-feature"><span>🚦</span> Evalúa tu nivel de riesgo</div>
                            <div className="nf-modal-feature"><span>📄</span> Genera documentos legales</div>
                            <div className="nf-modal-feature"><span>💬</span> Comunidad de apoyo anónima</div>
                        </div>
                        <button className="nf-btn nf-btn-primary" onClick={closeOnboarding} style={{ width: '100%', marginTop: 8 }}>
                            🚀 Comenzar
                        </button>
                        <p className="nf-modal-disclaimer">
                            No constituye asesoría legal. Consulte siempre con un profesional.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
