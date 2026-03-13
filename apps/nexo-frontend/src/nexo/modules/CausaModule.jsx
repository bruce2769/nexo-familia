import React, { useState } from 'react';
import { saveToHistorial } from './HistorialModule.jsx';

const CASE_TYPES = [
    { id: 'alimentos', label: 'Pensión de Alimentos', icon: '🍽️' },
    { id: 'visitas', label: 'Relación Directa y Regular (Visitas)', icon: '👨‍👧' },
    { id: 'tuicion', label: 'Cuidado Personal (Tuición)', icon: '🏠' },
    { id: 'vif', label: 'Violencia Intrafamiliar', icon: '🛡️' },
    { id: 'otro', label: 'Otro tipo de causa', icon: '📄' },
];

const SIMULATED_RESULTS = {
    alimentos: {
        traduccion: 'Causa de alimentos en etapa de cumplimiento. Se ha dictado una resolución que fija una pensión alimenticia y se está en proceso de verificar su cumplimiento por parte del demandado.',
        estado: 'La causa se encuentra activa con una resolución de pensión de alimentos vigente. El tribunal ha fijado un monto y está monitoreando el cumplimiento.',
        ultimoEvento: 'Se notificó al demandado sobre la liquidación de deuda por pensiones impagas correspondientes a los últimos meses. Esta notificación le da un plazo para pagar o presentar objeciones.',
        proximoPaso: 'Si el demandado no paga ni objeta la liquidación dentro del plazo, el tribunal puede decretar arresto nocturno, retención de fondos de su cuenta bancaria, inscripción en el Registro Nacional de Deudores de Pensiones de Alimentos, o suspensión de licencia de conducir.',
        timeline: [
            { step: 'Demanda presentada', status: 'done' },
            { step: 'Mediación realizada', status: 'done' },
            { step: 'Audiencia preparatoria', status: 'done' },
            { step: 'Sentencia dictada', status: 'done' },
            { step: 'Liquidación notificada', status: 'current' },
            { step: 'Apremios (si aplica)', status: 'pending' },
        ],
    },
    visitas: {
        traduccion: 'Causa de relación directa y regular (visitas). Se busca establecer o regular el régimen de contacto entre el padre/madre y sus hijos.',
        estado: 'El tribunal está evaluando el régimen de visitas. Se están considerando las necesidades del menor y la disponibilidad de ambos padres.',
        ultimoEvento: 'Se realizó audiencia preparatoria donde se escucharon las propuestas de ambas partes sobre el régimen de visitas. El juez solicitó un informe de la consejera técnica.',
        proximoPaso: 'Se esperará el informe técnico y luego se fijará audiencia de juicio donde el juez determinará el régimen definitivo de visitas.',
        timeline: [
            { step: 'Mediación previa', status: 'done' },
            { step: 'Demanda presentada', status: 'done' },
            { step: 'Audiencia preparatoria', status: 'done' },
            { step: 'Informe técnico', status: 'current' },
            { step: 'Audiencia de juicio', status: 'pending' },
            { step: 'Sentencia definitiva', status: 'pending' },
        ],
    },
    tuicion: {
        traduccion: 'Causa de cuidado personal (tuición). Se disputa quién tendrá la custodia legal de los hijos menores de edad.',
        estado: 'El tribunal está evaluando las condiciones de cada hogar y el bienestar de los menores para determinar con quién vivirán.',
        ultimoEvento: 'Se ordenaron pericias psicológicas a ambos padres y evaluación del entorno familiar por parte de un asistente social del tribunal.',
        proximoPaso: 'Una vez recibidos los informes periciales, se fijará audiencia de juicio. El juez considerará el interés superior del niño como criterio principal.',
        timeline: [
            { step: 'Demanda o solicitud', status: 'done' },
            { step: 'Medidas cautelares', status: 'done' },
            { step: 'Pericias ordenadas', status: 'current' },
            { step: 'Informes recibidos', status: 'pending' },
            { step: 'Audiencia de juicio', status: 'pending' },
            { step: 'Sentencia definitiva', status: 'pending' },
        ],
    },
    vif: {
        traduccion: 'Causa de Violencia Intrafamiliar (VIF). Se investigan hechos de violencia dentro del contexto familiar para proteger a la víctima y sancionar al agresor.',
        estado: 'Se han adoptado medidas de protección en favor de la víctima. El tribunal está procesando la denuncia y evaluando los antecedentes.',
        ultimoEvento: 'Se decretaron medidas cautelares: prohibición de acercamiento del denunciado a la víctima y su domicilio.',
        proximoPaso: 'Se fijará audiencia donde se evaluarán las pruebas. Si se acredita la VIF, el juez puede dictar condena con pena de multa, trabajos comunitarios o prisión.',
        timeline: [
            { step: 'Denuncia o demanda', status: 'done' },
            { step: 'Medidas de protección', status: 'done' },
            { step: 'Investigación', status: 'current' },
            { step: 'Audiencia de juicio', status: 'pending' },
            { step: 'Sentencia', status: 'pending' },
        ],
    },
    otro: {
        traduccion: 'Causa de familia en trámite. El tribunal está procesando la solicitud presentada y evaluando los antecedentes del caso.',
        estado: 'La causa se encuentra en estado de tramitación. El tribunal ha recibido la solicitud y está realizando las diligencias necesarias.',
        ultimoEvento: 'Se ha dado curso a la solicitud y se citó a las partes para audiencia. Es importante asistir personalmente o con representación legal.',
        proximoPaso: 'Se recomienda revisar la notificación recibida, preparar la documentación necesaria y asistir a la audiencia citada. Consultar con un abogado si hay dudas.',
        timeline: [
            { step: 'Solicitud presentada', status: 'done' },
            { step: 'Admisibilidad', status: 'done' },
            { step: 'Citación a partes', status: 'current' },
            { step: 'Audiencia', status: 'pending' },
            { step: 'Resolución', status: 'pending' },
        ],
    },
};

export default function CausaModule() {
    const [form, setForm] = useState({ numero: '', rut: '', tipo: 'alimentos', resolucion: '' });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.numero.trim()) return;
        setLoading(true);
        setTimeout(() => {
            const data = SIMULATED_RESULTS[form.tipo] || SIMULATED_RESULTS.otro;
            setResult(data);
            setLoading(false);

            saveToHistorial({
                type: 'causa',
                title: `Causa ${form.numero} — ${CASE_TYPES.find(c => c.id === form.tipo)?.label || 'Otro'}`,
                summary: data.traduccion.substring(0, 120) + '...',
                details: {
                    'Número': form.numero,
                    'RUT': form.rut || 'No especificado',
                    'Tipo': CASE_TYPES.find(c => c.id === form.tipo)?.label || 'Otro',
                },
            });
        }, 1200);
    };

    const handleReset = () => {
        setResult(null);
        setForm({ numero: '', rut: '', tipo: 'alimentos', resolucion: '' });
    };

    return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>📋 Interpretación de Causa</h1>
                <p>Ingresa los datos de tu causa y obtén una interpretación clara y estructurada de su estado actual.</p>
            </div>

            {!result ? (
                <div className="nf-card nf-animate-in" style={{ animationDelay: '.08s' }}>
                    <div className="nf-card-header">
                        <div className="nf-card-icon purple">📄</div>
                        <div>
                            <div className="nf-card-title">Datos de la Causa</div>
                            <div className="nf-card-subtitle">Completa la información disponible</div>
                        </div>
                    </div>

                    <form className="nf-form" onSubmit={handleSubmit}>
                        <div className="nf-row">
                            <div className="nf-field">
                                <label className="nf-label">Número de Causa *</label>
                                <input className="nf-input" type="text" placeholder="Ej: C-1234-2024" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} required />
                            </div>
                            <div className="nf-field">
                                <label className="nf-label">RUT (si aplica)</label>
                                <input className="nf-input" type="text" placeholder="Ej: 12.345.678-9" value={form.rut} onChange={e => setForm({ ...form, rut: e.target.value })} />
                            </div>
                        </div>

                        <div className="nf-field">
                            <label className="nf-label">Tipo de Causa</label>
                            <div className="nf-type-selector">
                                {CASE_TYPES.map(ct => (
                                    <button
                                        type="button"
                                        key={ct.id}
                                        className={`nf-type-option${form.tipo === ct.id ? ' active' : ''}`}
                                        onClick={() => setForm({ ...form, tipo: ct.id })}
                                    >
                                        <span>{ct.icon}</span> {ct.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="nf-field">
                            <label className="nf-label">Copia de resolución o descripción</label>
                            <textarea className="nf-textarea" placeholder="Pega aquí el texto de la resolución, o describe brevemente lo que dice el documento que recibiste..." value={form.resolucion} onChange={e => setForm({ ...form, resolucion: e.target.value })} />
                        </div>

                        <button type="submit" className="nf-btn nf-btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                            {loading ? <>⏳ Analizando...</> : <>🔍 Interpretar Causa</>}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="nf-result">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <span className="nf-badge purple">✅ Análisis completado</span>
                        <button className="nf-btn nf-btn-ghost" onClick={handleReset}>← Nueva consulta</button>
                    </div>

                    {/* Process Timeline */}
                    {result.timeline && (
                        <div className="nf-card nf-animate-in" style={{ marginBottom: 20 }}>
                            <div className="nf-card-header">
                                <div className="nf-card-icon purple">📍</div>
                                <div>
                                    <div className="nf-card-title">Progreso del Proceso</div>
                                    <div className="nf-card-subtitle">Etapas de tu causa judicial</div>
                                </div>
                            </div>
                            <div className="nf-process-timeline">
                                {result.timeline.map((t, i) => (
                                    <div className={`nf-process-step ${t.status}`} key={i}>
                                        <div className="nf-process-dot">
                                            {t.status === 'done' ? '✓' : t.status === 'current' ? '●' : '○'}
                                        </div>
                                        <span className="nf-process-label">{t.step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="nf-result-grid" style={{ gap: 16 }}>
                        <ResultCard icon="📝" color="purple" label="Traducción Simple" text={result.traduccion} delay={0} />
                        <ResultCard icon="📊" color="blue" label="Estado Real" text={result.estado} delay={1} />
                        <ResultCard icon="⚡" color="yellow" label="Qué Significa lo Último que Ocurrió" text={result.ultimoEvento} delay={2} />
                        <ResultCard icon="🔮" color="green" label="Qué Podría Venir Después" text={result.proximoPaso} delay={3} />
                    </div>

                    <div className="nf-disclaimer">
                        <span>⚠️</span>
                        Esta es una interpretación estructurada basada en la información proporcionada. No constituye asesoría legal personalizada. Consulte siempre con un abogado.
                    </div>
                </div>
            )}
        </div>
    );
}

function ResultCard({ icon, color, label, text, delay }) {
    return (
        <div className="nf-result-item nf-animate-in" style={{ animationDelay: `${delay * 0.08}s` }}>
            <div className="label"><span>{icon}</span> {label}</div>
            <div className="value">{text}</div>
        </div>
    );
}
