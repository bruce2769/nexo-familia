import React, { useState, useEffect, Suspense, lazy } from 'react';
import './nexo.css';
import Sidebar from './components/Sidebar.jsx';
import DiagnosticoModule from './modules/DiagnosticoModule.jsx'; // Main landing module, keeping it static for FCP
import { AuthProvider, useAuth } from '../contexts/AuthContext.jsx'; 
import CreditBanner from './components/CreditBanner.jsx';

// ── Lazing Loading on Secondary Modules (Optimizes Initial Bundle Size) ──
const CausaModule = lazy(() => import('./modules/CausaModule.jsx'));
const RiesgoModule = lazy(() => import('./modules/RiesgoModule.jsx'));
const MuroModule = lazy(() => import('./modules/MuroModule.jsx'));
const GuiasModule = lazy(() => import('./modules/GuiasModule.jsx'));
const GlosarioModule = lazy(() => import('./modules/GlosarioModule.jsx'));
const HistorialModule = lazy(() => import('./modules/HistorialModule.jsx'));
const ScannerModule = lazy(() => import('./modules/ScannerModule.jsx'));
const RadarModule = lazy(() => import('./modules/RadarModule.jsx'));
const EstadoModule = lazy(() => import('./modules/EstadoModule.jsx'));
const CalculadoraModule = lazy(() => import('./modules/CalculadoraModule.jsx'));
const AuthModule = lazy(() => import('./modules/AuthModule.jsx')); 
const CopilotoModule = lazy(() => import('./modules/CopilotoModule.jsx')); 
const MapaJuecesModule = lazy(() => import('./modules/MapaJuecesModule.jsx')); 
const EscritosModule = lazy(() => import('./modules/EscritosModule.jsx')); 

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
    { id: 'scanner', label: '🔍 Escáner' },
    { id: 'escritos', label: '📝 Escritos Legales', highlight: true },
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

    const LoadingFallback = () => (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ width: 40, height: 40, border: '3px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'nf-spin 1s linear infinite', margin: '0 auto 16px' }} />
            Cargando módulo...
        </div>
    );

    const renderModule = () => {
        switch (activeTab) {
            case 'diagnostico': return <DiagnosticoModule onNavigate={navigate} />;
            case 'causa': return <CausaModule />;
            case 'calculadora': return <CalculadoraModule />;
            case 'radar': return <RadarModule onNavigate={navigate} />;
            case 'riesgo': return <RiesgoModule />;
            case 'estado': return <EstadoModule />;
            case 'scanner': return <ScannerModule />;
            case 'escritos': return <EscritosModule />;
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
        <div className="nf-app-layout">
            <Sidebar tabs={APP_TABS} activeTab={activeTab} onTabChange={navigate} />
            
            <div className="nf-content-wrapper">
                <CreditBanner />
                <main className="nf-main" key={activeTab}>
                    <Suspense fallback={<LoadingFallback />}>
                        {renderModule()}
                    </Suspense>
                </main>
            </div>

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
