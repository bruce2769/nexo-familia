import React, { useState, useEffect, Suspense, lazy } from 'react';
import './nexo.css';
import Loader from './components/Loader.jsx';
import Sidebar from './components/Sidebar.jsx';
import BottomNav from './components/BottomNav.jsx';
import DiagnosticoModule from './modules/DiagnosticoModule.jsx';
import { AuthProvider, useAuth } from '../contexts/AuthContext.jsx';
import Topbar from './components/Topbar.jsx';
import { NexoErrorBoundary } from './components/NexoErrorBoundary.jsx';

// ── Lazy Loading on Secondary Modules ──
const MuroModule = lazy(() => import('./modules/MuroModule.jsx'));
const GuiasModule = lazy(() => import('./modules/GuiasModule.jsx'));
const GlosarioModule = lazy(() => import('./modules/GlosarioModule.jsx'));
const HistorialModule = lazy(() => import('./modules/HistorialModule.jsx'));
const ScannerModule = lazy(() => import('./modules/ScannerModule.jsx'));
const CalculadoraModule = lazy(() => import('./modules/CalculadoraModule.jsx'));
const AuthModule = lazy(() => import('./modules/AuthModule.jsx'));
const CopilotoModule = lazy(() => import('./modules/CopilotoModule.jsx'));
const EscritosModule = lazy(() => import('./modules/EscritosModule.jsx'));
const DocumentosModule = lazy(() => import('./modules/DocumentosModule.jsx'));
const AllModulesModule = lazy(() => import('./modules/AllModulesModule.jsx'));

// ── Radar Judicial eliminado (requiere integración real con Poder Judicial) ──

const TABS = [
    { id: 'diagnostico', label: '⚖️ Diagnóstico', highlight: true },
    { id: 'all_modules', label: '🛠️ Herramientas', highlight: true },
    { id: 'copiloto', label: '🤖 Abogado IA 24/7', highlight: true },
    { id: 'calculadora', label: '🧮 Calculadora Financiera' },
    { id: 'muro', label: '🤝 Comunidad' },
    { id: 'scanner', label: '🔍 Escáner' },
    { id: 'escritos', label: '📝 Escritos IA', highlight: true },
    { id: 'documentos', label: '📄 Documentos Pro', highlight: true },
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
    const { currentUser, credits } = useAuth();
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

// ...
    const LoadingFallback = () => <Loader />;

    const renderModule = () => {
        switch (activeTab) {
            case 'diagnostico':  return <DiagnosticoModule onNavigate={navigate} />;
            case 'calculadora':  return <CalculadoraModule />;
            case 'scanner':      return <ScannerModule />;
            case 'escritos':     return <EscritosModule />;
            case 'documentos':   return <DocumentosModule />;
            case 'muro':         return <MuroModule />;
            case 'guias':        return <GuiasModule />;
            case 'glosario':     return <GlosarioModule />;
            case 'historial':    return <HistorialModule onNavigate={navigate} />;
            case 'auth':         return <AuthModule onNavigate={navigate} />;
            case 'copiloto':     return <CopilotoModule />;
            case 'all_modules':  return <AllModulesModule onNavigate={navigate} />;
            default:             return <DiagnosticoModule onNavigate={navigate} />;
        }
    };

    const APP_TABS = [
        ...TABS,
        { id: 'auth', label: currentUser ? '👤 Mi Perfil' : '🔐 Ingresar' }
    ];

    return (
        <div className="nf-app-layout">
            <Sidebar tabs={APP_TABS} activeTab={activeTab} onTabChange={navigate} credits={credits} />

            <div className="nf-content-wrapper">
                <Topbar onNavigate={navigate} />
                <main className="nf-main" key={activeTab}>
                    <NexoErrorBoundary moduleName={activeTab}>
                        <Suspense fallback={<LoadingFallback />}>
                            {renderModule()}
                        </Suspense>
                    </NexoErrorBoundary>
                </main>
            </div>

            <BottomNav activeTab={activeTab} onTabChange={navigate} />

            {/* Onboarding Modal */}
            {showOnboarding && (
                <div className="nf-modal-overlay" onClick={closeOnboarding}>
                    <div className="nf-modal" onClick={e => e.stopPropagation()}>
                        <div className="nf-modal-icon">⚖️</div>
                        <h2 className="nf-modal-title">Bienvenido a Nexo Familia</h2>
                        <p className="nf-modal-desc">
                            La primera plataforma de inteligencia legal de familia en Chile.
                            Analiza tu situación, calcula tu impacto financiero, evalúa tu riesgo y genera documentos legales.
                        </p>
                        <div className="nf-modal-features">
                            <div className="nf-modal-feature"><span>⚖️</span> Diagnóstico inteligente guiado</div>
                            <div className="nf-modal-feature"><span>🧮</span> Calculadora de pensión (IPC)</div>
                            <div className="nf-modal-feature"><span>📝</span> Genera escritos legales con IA</div>
                            <div className="nf-modal-feature"><span>🔍</span> Escáner IA de documentos</div>
                            <div className="nf-modal-feature"><span>🤝</span> Comunidad de apoyo anónima</div>
                        </div>
                        <button
                            className="nf-btn nf-btn-primary"
                            onClick={closeOnboarding}
                            style={{ width: '100%', marginTop: 8 }}
                        >
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
