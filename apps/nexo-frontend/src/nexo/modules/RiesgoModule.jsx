import React, { useState } from 'react';
import { saveToHistorial } from './HistorialModule.jsx';

const FACTORS = [
    { id: 'incumplimiento', label: '¿Existe incumplimiento de pago?', help: 'No se han pagado una o más pensiones en el plazo fijado.', weight: 3 },
    { id: 'registro', label: '¿Está inscrito en el Registro de Deudores?', help: 'El Registro Nacional de Deudores de Pensiones de Alimentos.', weight: 2 },
    { id: 'liquidacion', label: '¿Hay liquidación de deuda pendiente?', help: 'Se ha presentado o notificado una liquidación de montos adeudados.', weight: 2 },
    { id: 'medidas', label: '¿Hay medidas de apremio decretadas?', help: 'Arresto, retención de fondos, suspensión de licencia, u otras.', weight: 3 },
    { id: 'multiples', label: '¿Existen múltiples causas o beneficiarios?', help: 'Más de una causa de alimentos activa simultáneamente.', weight: 1 },
    { id: 'reincidencia', label: '¿Ha habido incumplimiento reiterado?', help: 'No es la primera vez que se incumplen las obligaciones.', weight: 2 },
    { id: 'arraigo', label: '¿Existe orden de arraigo nacional?', help: 'Prohibición de salir del país por deuda de alimentos.', weight: 2 },
    { id: 'retencion', label: '¿Se han retenido fondos bancarios?', help: 'El tribunal ha ordenado retención de cuentas bancarias.', weight: 2 },
    { id: 'licencia', label: '¿Se ha suspendido la licencia de conducir?', help: 'Suspensión de licencia como medida de apremio.', weight: 1 },
    { id: 'impuestos', label: '¿Se ha retenido devolución de impuestos?', help: 'El SII retiene la devolución anual para cubrir deuda.', weight: 1 },
];

const RISK_LEVELS = {
    low: {
        color: 'green', label: '🟢 Riesgo Bajo',
        desc: 'La situación no presenta riesgos inmediatos significativos. Mantente al día con las obligaciones.',
        recommendations: [
            'Mantener los pagos al día y guardar todos los comprobantes',
            'Considerar establecer transferencia automática mensual',
            'Verificar que el monto se ajuste a las necesidades del alimentario',
        ],
    },
    medium: {
        color: 'yellow', label: '🟡 Riesgo Medio',
        desc: 'Existen factores de riesgo que requieren atención. Regulariza la situación a la brevedad.',
        recommendations: [
            'Regularizar pagos pendientes lo antes posible',
            'Contactar al tribunal para acreditar pagos realizados',
            'Considerar acordar un plan de pago para la deuda acumulada',
            'Guardar y organizar todos los comprobantes de transferencia',
            'Consultar con un abogado sobre opciones de regularización',
        ],
    },
    high: {
        color: 'red', label: '🔴 Riesgo Alto',
        desc: 'Situación grave con consecuencias legales inminentes o en curso. Acción inmediata requerida.',
        recommendations: [
            'Buscar asesoría legal inmediata',
            'Intentar pago parcial urgente para demostrar voluntad',
            'Preparar comprobantes de pagos anteriores si existen',
            'No ignorar notificaciones del tribunal',
            'Evaluar solicitar rebaja de pensión si cambió la situación económica',
            'Considerar presentar propuesta de pago al tribunal',
        ],
    },
};

export default function RiesgoModule() {
    const [checked, setChecked] = useState({});
    const [result, setResult] = useState(null);

    const toggleFactor = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

    const handleEvaluate = () => {
        const score = FACTORS.reduce((s, f) => s + (checked[f.id] ? f.weight : 0), 0);
        const maxScore = FACTORS.reduce((s, f) => s + f.weight, 0);
        let level;
        if (score <= 3) level = 'low';
        else if (score <= 8) level = 'medium';
        else level = 'high';

        const factorResults = FACTORS.map(f => ({
            ...f, active: !!checked[f.id],
            level: checked[f.id] ? (f.weight >= 3 ? 'red' : f.weight >= 2 ? 'yellow' : 'yellow') : 'green',
        }));

        const res = { level, score, maxScore, factors: factorResults, ...RISK_LEVELS[level] };
        setResult(res);

        saveToHistorial({
            type: 'riesgo',
            title: `Evaluación de riesgo — ${RISK_LEVELS[level].label}`,
            summary: `Puntuación: ${score}/${maxScore} — ${RISK_LEVELS[level].desc.substring(0, 80)}...`,
            details: {
                'Nivel': RISK_LEVELS[level].label,
                'Puntuación': `${score} de ${maxScore}`,
                'Factores activos': Object.values(checked).filter(Boolean).length.toString(),
            },
        });
    };

    const handleReset = () => { setResult(null); setChecked({}); };
    const checkedCount = Object.values(checked).filter(Boolean).length;

    return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>🚦 Riesgo y Consecuencias</h1>
                <p>Evalúa tu nivel de riesgo legal con el sistema de semáforo y recibe recomendaciones personalizadas.</p>
            </div>

            {!result ? (
                <div className="nf-card nf-animate-in" style={{ animationDelay: '.08s' }}>
                    <div className="nf-card-header">
                        <div className="nf-card-icon yellow">📋</div>
                        <div>
                            <div className="nf-card-title">Factores de Riesgo</div>
                            <div className="nf-card-subtitle">Marca los que apliquen — ahora con 10 factores</div>
                        </div>
                    </div>
                    <div className="nf-check-group">
                        {FACTORS.map(f => (
                            <div key={f.id} className={`nf-check-item${checked[f.id] ? ' checked' : ''}`} onClick={() => toggleFactor(f.id)}>
                                <div className="nf-checkbox">{checked[f.id] ? '✓' : ''}</div>
                                <div>
                                    <div className="nf-check-label">{f.label}</div>
                                    <div className="nf-check-help">{f.help}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="nf-btn nf-btn-primary" onClick={handleEvaluate} style={{ marginTop: 24, alignSelf: 'flex-start' }}>
                        🚦 Evaluar Riesgo ({checkedCount} factor{checkedCount !== 1 ? 'es' : ''})
                    </button>
                </div>
            ) : (
                <div className="nf-result">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <span className={`nf-badge ${result.color}`}>Evaluación completada</span>
                        <button className="nf-btn nf-btn-ghost" onClick={handleReset}>← Nueva evaluación</button>
                    </div>

                    {/* Semáforo */}
                    <div className="nf-card nf-animate-in">
                        <div className="nf-semaforo">
                            <div className="nf-semaforo-lights">
                                <div className={`nf-light red-light${result.level === 'high' ? ' active' : ''}`} />
                                <div className={`nf-light yellow-light${result.level === 'medium' ? ' active' : ''}`} />
                                <div className={`nf-light green-light${result.level === 'low' ? ' active' : ''}`} />
                            </div>
                            <div className={`nf-semaforo-label ${result.color}`}>{result.label}</div>
                            <div className="nf-semaforo-desc">{result.desc}</div>
                        </div>
                    </div>

                    {/* Recommendations / Action Plan */}
                    <div className="nf-card nf-animate-in" style={{ marginTop: 16 }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon green">✅</div>
                            <div>
                                <div className="nf-card-title">Plan de Acción Recomendado</div>
                                <div className="nf-card-subtitle">Pasos sugeridos según tu nivel de riesgo</div>
                            </div>
                        </div>
                        <div className="nf-action-plan">
                            {result.recommendations.map((r, i) => (
                                <div className="nf-action-item" key={i}>
                                    <div className="nf-action-number">{i + 1}</div>
                                    <span>{r}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Factor breakdown */}
                    <div className="nf-card nf-animate-in" style={{ marginTop: 16 }}>
                        <div className="nf-card-header">
                            <div className="nf-card-icon purple">📊</div>
                            <div>
                                <div className="nf-card-title">Detalle por Factor</div>
                                <div className="nf-card-subtitle">Puntuación: {result.score} de {result.maxScore} puntos</div>
                            </div>
                        </div>
                        <div className="nf-factors">
                            {result.factors.map(f => (
                                <div className="nf-factor" key={f.id}>
                                    <div className={`nf-factor-dot ${f.level}`} />
                                    <div className="nf-factor-info">
                                        <div className="nf-factor-name">{f.label}</div>
                                        <div className="nf-factor-desc">{f.active ? `Activo — Peso: ${f.weight} punto${f.weight > 1 ? 's' : ''}` : 'No aplica'}</div>
                                    </div>
                                    <span className={`nf-badge ${f.level}`} style={{ fontSize: 11 }}>
                                        {f.active ? (f.level === 'red' ? 'Alto' : 'Medio') : 'OK'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="nf-disclaimer">
                        <span>⚠️</span>
                        Evaluación referencial basada en factores generales. No reemplaza el análisis de un profesional legal.
                    </div>
                </div>
            )}
        </div>
    );
}
