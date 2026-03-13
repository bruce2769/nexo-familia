import React, { useState } from 'react';
import { saveToHistorial } from './HistorialModule.jsx';
import { evaluateDiagnosis } from '../engine/evaluateDiagnosis.js';
import { saveDiagnosis } from '../services/diagnosisHistory.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

const STEPS = [
    {
        id: 'rol',
        title: '¿Cuál es tu rol en la causa?',
        options: [
            { id: 'demandante', label: '🙋‍♀️ Demandante', desc: 'Pedí la pensión o régimen' },
            { id: 'demandado', label: '🙋‍♂️ Demandado', desc: 'Me demandaron por pensión o régimen' },
        ]
    },
    {
        id: 'materia',
        title: '¿Sobre qué es la causa principal?',
        options: [
            { id: 'alimentos', label: '🍽️ Pensión de Alimentos' },
            { id: 'visitas', label: '👨‍👧 Régimen de Visitas' },
            { id: 'tuicion', label: '🏠 Cuidado Personal' },
            { id: 'otro', label: '📄 Otra' },
        ]
    },
    {
        id: 'sentencia',
        title: '¿Existe ya una sentencia o mediación aprobada?',
        options: [
            { id: 'si', label: '✅ Sí, ya hay monto u horario fijado' },
            { id: 'no', label: '⏳ No, aún estamos en trámite' },
        ]
    },
    {
        id: 'moneda',
        title: '¿La pensión se fijó en UTM o en pesos fijos?',
        condition: (f) => f.materia === 'alimentos' && f.sentencia === 'si',
        options: [
            { id: 'utm', label: '📐 En UTM (se reajusta sola)' },
            { id: 'pesos', label: '💵 En Pesos Fijos' },
            { id: 'nose', label: '❓ No lo sé / No aplica' },
        ]
    },
    {
        id: 'antiguedad',
        title: '¿Hace cuánto tiempo se fijó esto?',
        condition: (f) => f.sentencia === 'si',
        options: [
            { id: 'reciente', label: '🗓️ Hace menos de 1 año' },
            { id: 'antiguo', label: '⏳ Hace más de 1 año' },
        ]
    },
    {
        id: 'pagos',
        title: '¿Se han cumplido los pagos o visitas?',
        condition: (f) => f.sentencia === 'si',
        options: [
            { id: 'aldia', label: '✅ Sí, todo al día' },
            { id: 'deuda', label: '❌ No, hay incumplimientos' },
            { id: 'nose', label: '❓ No estoy seguro(a)' },
        ]
    },
    {
        id: 'liquidacion',
        title: '¿El tribunal ha hecho una "liquidación de deuda" o "apremio" reciente?',
        options: [
            { id: 'liquidacion', label: '📊 Sí, liquidación de deuda' },
            { id: 'apremio', label: '🚨 Sí, orden de arresto o arraigo' },
            { id: 'no', label: '🔵 No que yo sepa' },
        ]
    },
    {
        id: 'retencion',
        title: '¿Hay retención de sueldo activa?',
        condition: (f) => f.materia === 'alimentos' && f.rol === 'demandante',
        options: [
            { id: 'si', label: '🏦 Sí, le descuentan por planilla' },
            { id: 'no', label: '❌ No, paga directo o no paga' },
        ]
    }
];

export default function DiagnosticoModule({ onNavigate }) {
    const [currentStepIdx, setCurrentStepIdx] = useState(0);
    const [form, setForm] = useState({});
    const [result, setResult] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [justCopied, setJustCopied] = useState(false);

    const { currentUser } = useAuth();

    // Filter steps based on conditions
    const activeSteps = STEPS.filter(s => !s.condition || s.condition(form));
    const step = activeSteps[currentStepIdx];
    const progress = Math.round((currentStepIdx / activeSteps.length) * 100);

    const handleSelect = (valId) => {
        const newForm = { ...form, [step.id]: valId };
        setForm(newForm);

        if (currentStepIdx < activeSteps.length - 1) {
            setCurrentStepIdx(currentStepIdx + 1);
        } else {
            generateDiagnosisViaEngine(newForm);
        }
    };

    const handleBack = () => {
        if (currentStepIdx > 0) setCurrentStepIdx(currentStepIdx - 1);
        else setResult(null);
    };

    const generateDiagnosisViaEngine = (f) => {
        setAnalyzing(true);

        setTimeout(() => {
            // Use the detached Rule Engine
            const res = evaluateDiagnosis(f);

            setResult(res);
            setAnalyzing(false);

            // Save locally or remote to Engine History
            saveDiagnosis(res, f, currentUser?.uid);

            // Save to general history for the app
            saveToHistorial({
                type: 'riesgo',
                title: `Diagnóstico: Causa de ${f.materia}`,
                summary: `Score: ${res.score}/100 · Riesgo ${res.riesgoLiteral.toUpperCase()}`,
                details: {
                    'Materia': f.materia,
                    'Rol': f.rol,
                    'Risk Level': res.riesgoLiteral.toUpperCase(),
                },
            });
        }, 1800);
    };

    const shareDiagnosis = () => {
        const text = `⚖️ Mi diagnóstico en Nexo Familia:\n\nNivel de Riesgo: ${result?.riesgoLiteral.toUpperCase() || ''}\nScore: ${result?.score}/100\n\nDescubre el estado real de tu causa legal aquí: nexofamilia.cl/diagnostico`;
        navigator.clipboard.writeText(text);
        setJustCopied(true);
        setTimeout(() => setJustCopied(false), 2500);
    };

    const renderWizard = () => {
        if (analyzing) {
            return (
                <div className="nf-card nf-animate-in" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div className="nf-spinner" style={{ fontSize: 48, marginBottom: 24, margin: '0 auto' }}>🧠</div>
                    <h2 style={{ fontSize: 24, marginBottom: 12 }}>Evaluando Motor Legal...</h2>
                    <p style={{ color: 'var(--nf-text3)' }}>El sistema está cruzando tus respuestas con la normativa vigente y posibles reajustes IPC/UTM.</p>
                </div>
            );
        }

        return (
            <div className="nf-card nf-animate-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    {currentStepIdx > 0 && (
                        <button className="nf-mobile-toggle" style={{ display: 'block', padding: '4px 8px' }} onClick={handleBack}>←</button>
                    )}
                    <div style={{ flex: 1, background: 'var(--nf-bg2)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--nf-accent)', transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--nf-text3)', fontWeight: 600 }}>{currentStepIdx + 1} / {activeSteps.length}</span>
                </div>

                <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 32, textAlign: 'center' }}>
                    {step.title}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500, margin: '0 auto' }}>
                    {step.options.map((opt, i) => (
                        <button
                            key={opt.id}
                            className="nf-estado-card nf-animate-in"
                            style={{ animationDelay: `${i * 0.05}s`, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4 }}
                            onClick={() => handleSelect(opt.id)}
                        >
                            <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--nf-text)' }}>{opt.label}</span>
                            {opt.desc && <span style={{ fontSize: 13, color: 'var(--nf-text3)' }}>{opt.desc}</span>}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderResult = () => {
        const isAlto = result.riesgoLiteral === 'rojo';
        const isMedio = result.riesgoLiteral === 'amarillo';

        // Identify if "Deuda Oculta" applied
        const deudaOculta = result.reglasAplicadas.find(r => r.title.includes('Oculta'));

        return (
            <div className="nf-result nf-animate-in">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <span className={`nf-badge purple`}>✨ Diagnóstico Completado</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="nf-btn nf-btn-ghost" onClick={shareDiagnosis}>
                            {justCopied ? '✅ Copiado' : '📤 Compartir'}
                        </button>
                        <button className="nf-btn nf-btn-primary" onClick={() => { setForm({}); setCurrentStepIdx(0); setResult(null); }}>
                            ⟳ Nuevo
                        </button>
                    </div>
                </div>

                {/* 1. Semáforo & Score */}
                <div className="nf-card" style={{ marginBottom: 16, textAlign: 'center', padding: '32px 20px', borderTop: `4px solid var(--nf-${isAlto ? 'red' : isMedio ? 'yellow' : 'green'})` }}>
                    <div className="nf-card-icon" style={{ fontSize: 42, background: 'none', width: 'auto', margin: '0 auto 8px' }}>
                        {isAlto ? '🔴' : isMedio ? '🟡' : '🟢'}
                    </div>
                    <h2 style={{ fontSize: 24, marginBottom: 4, color: `var(--nf-${isAlto ? 'red' : isMedio ? 'yellow' : 'green'})` }}>
                        Nivel de Riesgo: {result.riesgoLiteral.toUpperCase()}
                    </h2>
                    <div style={{ color: 'var(--nf-text3)', fontSize: 14, marginBottom: 12 }}>
                        Risk Score Legal: <strong>{result.score}/100</strong>
                    </div>
                    <p style={{ color: 'var(--nf-text2)', fontSize: 15 }}>
                        {isAlto ? 'El motor detecta alto riesgo de apremios o deudas acumuladas inminentes.' :
                            isMedio ? 'Riesgo moderado. Hay condiciones (ej. reajustes o retenciones pendientes) que requieren tu atención.' :
                                'Situación legalmente estable según los parámetros de cumplimiento regular.'}
                    </p>
                </div>

                {/* Explicación de 10 años */}
                <div className="nf-card" style={{ marginBottom: 16 }}>
                    <div className="nf-card-header">
                        <div className="nf-card-icon purple">🧠</div>
                        <div>
                            <div className="nf-card-title">Te explico tu causa...</div>
                            <div className="nf-card-subtitle">Como si tuvieras 10 años</div>
                        </div>
                    </div>
                    <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--nf-text)' }} dangerouslySetInnerHTML={{ __html: result.explicacionSimple.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>

                {/* Simulador Predictivo */}
                {result.escenarios && result.escenarios.length > 0 && (
                    <div className="nf-card" style={{ marginBottom: 16 }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon blue">🔮</div>
                            <div>
                                <div className="nf-card-title">Simulador Predictivo de Escenarios</div>
                                <div className="nf-card-subtitle">Probabilidad de lo que ocurrirá según jurisprudencia</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                            {result.escenarios.map((esc, i) => (
                                <div key={i} style={{ borderLeft: `3px solid var(--nf-${esc.impacto === 'critico' || esc.impacto === 'negativo' ? 'red' : esc.impacto === 'positivo' ? 'green' : 'blue'})`, padding: '12px 16px', background: 'var(--nf-bg2)', borderRadius: '0 8px 8px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <div style={{ fontWeight: 600, color: 'var(--nf-text)' }}>{esc.nombre}</div>
                                        <div style={{ fontSize: 13, background: 'var(--nf-bg)', padding: '2px 6px', borderRadius: 4, color: 'var(--nf-text2)' }}>Probabilidad: <strong>{esc.probabilidad}%</strong></div>
                                    </div>
                                    <p style={{ fontSize: 13, color: 'var(--nf-text3)', lineHeight: 1.5 }}>{esc.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Radar Deuda Oculta */}
                {deudaOculta && (
                    <div className="nf-card" style={{ marginBottom: 16, borderColor: 'var(--nf-yellow)', background: 'rgba(251, 191, 36, 0.05)' }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon yellow">🕵️‍♂️</div>
                            <div>
                                <div className="nf-card-title" style={{ color: 'var(--nf-yellow)' }}>{deudaOculta.title}</div>
                            </div>
                        </div>
                        <p style={{ fontSize: 15, color: 'var(--nf-text2)', lineHeight: 1.6 }}>{deudaOculta.message}</p>
                        <button className="nf-btn nf-btn-secondary" style={{ marginTop: 12 }} onClick={() => onNavigate('calculadora')}>
                            🧮 Ir a Calcular Deuda Real IPC →
                        </button>
                    </div>
                )}

                {/* Motor de Estrategia Judicial: Plan Paso a Paso */}
                <div className="nf-card" style={{ margin: 0 }}>
                    <div className="nf-card-header">
                        <div className="nf-card-icon green">🗺️</div>
                        <div>
                            <div className="nf-card-title">Tu plan judicial en {result.estrategia?.length || 0} pasos</div>
                            <div className="nf-card-subtitle">Estrategia recomendada por el motor según tu riesgo</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                        {result.estrategia?.map((paso, i) => (
                            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                {/* Timeline line & dot */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', minHeight: 60 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--nf-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14 }}>
                                        {i + 1}
                                    </div>
                                    {i < result.estrategia.length - 1 && (
                                        <div style={{ width: 2, flex: 1, background: 'var(--nf-border)', margin: '8px 0' }} />
                                    )}
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, padding: 16, background: 'var(--nf-bg2)', borderRadius: 8 }}>
                                    <strong style={{ fontSize: 16, display: 'block', marginBottom: 4, color: 'var(--nf-text)' }}>
                                        {paso.title}
                                    </strong>
                                    <p style={{ fontSize: 14, color: 'var(--nf-text2)', marginBottom: 16, lineHeight: 1.5 }}>
                                        {paso.description}
                                    </p>

                                    {paso.actionLabel && (
                                        <button
                                            className="nf-btn nf-btn-primary"
                                            style={{ padding: '8px 16px', fontSize: 14 }}
                                            onClick={() => onNavigate(paso.moduleId || 'documentos')}
                                        >
                                            {paso.actionLabel} →
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {(!result.estrategia || result.estrategia.length === 0) && (
                            <div style={{ textAlign: 'center', color: 'var(--nf-text3)', padding: '20px 0' }}>
                                <p>✅</p>
                                <p style={{ fontSize: 14, marginTop: 8 }}>Tu estado es regular. No requiere estrategia urgente.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        );
    };

    return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>🧠 Diagnóstico Inteligente</h1>
                <p>Motor de evaluación legal. Descubre deuda oculta, riesgo judicial y escenarios predictivos.</p>
            </div>

            {!result ? renderWizard() : renderResult()}
        </div>
    );
}
