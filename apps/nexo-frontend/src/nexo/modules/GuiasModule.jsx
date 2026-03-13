import React, { useState } from 'react';

const GUIDES = [
    {
        id: 'alimentos',
        icon: '🍽️',
        title: 'Pensión de Alimentos',
        desc: 'Todo el proceso de demanda de alimentos explicado paso a paso.',
        color: 'purple',
        steps: [
            { title: 'Presentar la Demanda', desc: 'Se presenta ante el Tribunal de Familia competente. Puede hacerse con o sin abogado si el monto es menor a 30 UTM. Se necesita: certificado de nacimiento del hijo/a, datos del demandado y antecedentes de ingresos.', icon: '📄' },
            { title: 'Audiencia Preparatoria', desc: 'El tribunal cita a ambas partes. Se intenta una mediación obligatoria previa. Si no hay acuerdo, se fija fecha de audiencia de juicio. El juez puede decretar alimentos provisorios.', icon: '🏛️' },
            { title: 'Audiencia de Juicio', desc: 'Se presentan pruebas: liquidaciones de sueldo, boletas, testigos. El juez evalúa las necesidades del alimentario y la capacidad económica del alimentante.', icon: '⚖️' },
            { title: 'Sentencia', desc: 'El tribunal fija el monto de la pensión, la forma de pago (depósito judicial, transferencia) y la fecha desde la cual se debe. Generalmente desde la notificación de la demanda.', icon: '📋' },
            { title: 'Cumplimiento', desc: 'Si no se paga, se puede solicitar liquidación de deuda, apremios (arresto, retención de fondos, inscripción en Registro de Deudores) y otras medidas.', icon: '✅' },
        ],
        alerts: [
            { type: 'info', text: 'La mediación previa es obligatoria antes de presentar la demanda, salvo excepciones (violencia intrafamiliar).' },
            { type: 'warning', text: 'Los alimentos provisorios se deben desde que se decretan, no desde la sentencia definitiva.' },
        ],
    },
    {
        id: 'liquidacion',
        icon: '📊',
        title: 'Liquidación de Deuda',
        desc: 'Cómo solicitar y entender una liquidación de pensiones impagas.',
        color: 'blue',
        steps: [
            { title: 'Verificar Incumplimiento', desc: 'Confirmar que existen periodos sin pago o con pago incompleto. Reunir comprobantes o la ausencia de ellos. Solicitar certificado de la cuenta de ahorro del tribunal.', icon: '🔍' },
            { title: 'Presentar Solicitud', desc: 'Se presenta un escrito al tribunal pidiendo que se practique liquidación de la deuda. Incluir periodos adeudados y monto de la pensión fijada.', icon: '📄' },
            { title: 'Liquidación por Secretaría', desc: 'El secretario del tribunal calcula la deuda con reajuste IPC e intereses corrientes. Se notifica al deudor para que pueda objetar dentro de 3 días.', icon: '🧮' },
            { title: 'Objeciones', desc: 'El deudor tiene 3 días hábiles para objetar la liquidación presentando comprobantes de pago. Si no objeta, la liquidación queda firme.', icon: '⏰' },
            { title: 'Apremios', desc: 'Con la liquidación firme, se pueden solicitar medidas de apremio: arresto nocturno (hasta 15 días), retención de fondos, suspensión de licencia, registro de deudores.', icon: '⚡' },
        ],
        alerts: [
            { type: 'danger', text: 'El plazo para objetar es de solo 3 días hábiles. Si se pasa el plazo, la liquidación queda firme.' },
            { type: 'info', text: 'La deuda se reajusta con IPC y puede incluir intereses corrientes para operaciones no reajustables.' },
        ],
    },
    {
        id: 'registro',
        icon: '📝',
        title: 'Registro de Deudores',
        desc: 'Qué es, cómo funciona y cómo afecta la inscripción.',
        color: 'red',
        steps: [
            { title: 'Requisitos para Inscripción', desc: 'Se puede solicitar cuando existe deuda de una o más pensiones. El tribunal ordena la inscripción de oficio o a petición de parte. No requiere liquidación previa.', icon: '📋' },
            { title: 'Efectos Inmediatos', desc: 'No puede obtener créditos, ni abrir cuentas bancarias, ni realizar operaciones financieras. No puede renovar pasaporte, licencia de conducir ni cédula de identidad.', icon: '🚫' },
            { title: 'Consulta Pública', desc: 'Cualquier persona o institución puede consultar el registro en el sitio web del Poder Judicial. Bancos y empresas lo consultan antes de otorgar créditos.', icon: '🔎' },
            { title: 'Salir del Registro', desc: 'Solo se sale pagando la totalidad de la deuda. Una vez pagada y acreditada ante el tribunal, este ordena la eliminación del registro.', icon: '✅' },
        ],
        alerts: [
            { type: 'danger', text: 'La inscripción puede afectar gravemente la vida financiera y personal del deudor.' },
            { type: 'warning', text: 'Desde 2023, la ley permite inscribir desde la primera pensión impaga (Ley 21.484).' },
        ],
    },
    {
        id: 'apremios',
        icon: '⛓️',
        title: 'Medidas de Apremio',
        desc: 'Tipos de apremio y cuándo se pueden solicitar.',
        color: 'yellow',
        steps: [
            { title: 'Arresto Nocturno', desc: 'De 22:00 a 06:00 hrs, hasta por 15 días. Se puede repetir. Es la medida más común y se decreta cuando hay deuda persistente.', icon: '🌙' },
            { title: 'Arresto Completo', desc: 'Hasta 15 días de arresto diurno y nocturno. Se aplica en casos de reincidencia o deudas muy altas. Es una medida excepcional.', icon: '🔒' },
            { title: 'Retención de Fondos', desc: 'El tribunal ordena a bancos retener fondos del deudor hasta cubrir la deuda. Aplica a cuentas corrientes, de ahorro y fondos mutuos.', icon: '🏦' },
            { title: 'Retención de Devolución de Impuestos', desc: 'El SII retiene la devolución de impuestos y la transfiere al alimentario. Se aplica automáticamente cada año fiscal.', icon: '🧾' },
            { title: 'Suspensión de Licencia', desc: 'Se suspende la licencia de conducir hasta que se pague la deuda. No puede renovar ni obtener una nueva.', icon: '🚗' },
            { title: 'Arraigo Nacional', desc: 'Se impide al deudor salir del país hasta regularizar su situación. Se comunica a la PDI para su control en fronteras.', icon: '✈️' },
        ],
        alerts: [
            { type: 'info', text: 'Las medidas de apremio no son excluyentes: se pueden aplicar varias simultáneamente.' },
            { type: 'warning', text: 'El arresto no extingue la deuda. Se sigue debiendo incluso después de cumplir el arresto.' },
        ],
    },
    {
        id: 'visitas',
        icon: '👨‍👧',
        title: 'Régimen de Visitas',
        desc: 'Cómo funciona la relación directa y regular con los hijos.',
        color: 'green',
        steps: [
            { title: 'Solicitud', desc: 'Cualquier padre o madre puede solicitar un régimen de visitas al Tribunal de Familia. Se requiere mediación previa obligatoria.', icon: '📄' },
            { title: 'Mediación', desc: 'Un mediador ayuda a las partes a llegar a un acuerdo sobre días, horarios y condiciones de las visitas. Si hay acuerdo, se presenta al tribunal para su aprobación.', icon: '🤝' },
            { title: 'Régimen Judicial', desc: 'Si no hay acuerdo, el tribunal fija el régimen considerando el interés superior del niño. Puede incluir fines de semana alternados, vacaciones y feriados.', icon: '⚖️' },
            { title: 'Incumplimiento', desc: 'Si una parte impide las visitas, se puede solicitar al tribunal que aplique multas o modifique el régimen. En casos graves, puede cambiar el cuidado personal.', icon: '⚠️' },
        ],
        alerts: [
            { type: 'info', text: 'El derecho a visitas es independiente del pago de pensión. No se puede condicionar uno al otro.' },
            { type: 'warning', text: 'Impedir las visitas puede ser considerado alienación parental y tener consecuencias legales.' },
        ],
    },
];

export default function GuiasModule() {
    const [activeGuide, setActiveGuide] = useState(null);
    const [expandedStep, setExpandedStep] = useState(null);

    const guide = GUIDES.find(g => g.id === activeGuide);

    return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>📚 Guías Legales</h1>
                <p>Guías paso a paso sobre procesos legales de familia en Chile. Información clara, sin jerga.</p>
            </div>

            {!guide ? (
                <div className="nf-guides-grid nf-animate-in" style={{ animationDelay: '.08s' }}>
                    {GUIDES.map((g, i) => (
                        <div
                            className="nf-guide-card"
                            key={g.id}
                            onClick={() => { setActiveGuide(g.id); setExpandedStep(null); }}
                            style={{ animationDelay: `${i * 0.06}s` }}
                        >
                            <div className={`nf-card-icon ${g.color}`} style={{ width: 52, height: 52, fontSize: 24, borderRadius: 14 }}>
                                {g.icon}
                            </div>
                            <div className="nf-guide-card-title">{g.title}</div>
                            <div className="nf-guide-card-desc">{g.desc}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                                <span className={`nf-badge ${g.color}`}>{g.steps.length} pasos</span>
                                <span style={{ marginLeft: 'auto', color: 'var(--nf-accent)', fontSize: 14, fontWeight: 600 }}>Ver guía →</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="nf-result">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className={`nf-card-icon ${guide.color}`}>{guide.icon}</div>
                            <div>
                                <div className="nf-card-title">{guide.title}</div>
                                <div className="nf-card-subtitle">{guide.steps.length} pasos</div>
                            </div>
                        </div>
                        <button className="nf-btn nf-btn-ghost" onClick={() => setActiveGuide(null)}>
                            ← Volver a guías
                        </button>
                    </div>

                    {/* Timeline Steps */}
                    <div className="nf-timeline">
                        {guide.steps.map((step, i) => (
                            <div
                                className={`nf-timeline-item nf-animate-in${expandedStep === i ? ' expanded' : ''}`}
                                key={i}
                                style={{ animationDelay: `${i * 0.06}s` }}
                                onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                            >
                                <div className="nf-timeline-dot">
                                    <span>{step.icon}</span>
                                </div>
                                <div className="nf-timeline-content">
                                    <div className="nf-timeline-step">Paso {i + 1}</div>
                                    <div className="nf-timeline-title">{step.title}</div>
                                    <div className={`nf-timeline-desc${expandedStep === i ? ' show' : ''}`}>
                                        {step.desc}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Alerts */}
                    {guide.alerts && guide.alerts.length > 0 && (
                        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {guide.alerts.map((a, i) => (
                                <div className={`nf-alert ${a.type === 'danger' ? 'danger' : a.type === 'warning' ? 'warning' : 'info'}`} key={i}>
                                    <span className="nf-alert-icon">{a.type === 'danger' ? '🚨' : a.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                                    <span>{a.text}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="nf-disclaimer">
                        <span>⚠️</span>
                        Esta guía es informativa y no constituye asesoría legal. Cada caso puede tener particularidades.
                    </div>
                </div>
            )}
        </div>
    );
}
