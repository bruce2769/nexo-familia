import React, { useState } from 'react';

const TERMS = [
    { term: 'Alimentos', def: 'Prestación económica que se debe a favor de una persona (generalmente hijos) para cubrir necesidades básicas: alimentación, educación, salud, vivienda y vestuario.', cat: 'Pensiones' },
    { term: 'Alimentario', def: 'Persona que tiene derecho a recibir la pensión de alimentos. Generalmente hijos menores de edad o hasta los 28 años si estudian.', cat: 'Pensiones' },
    { term: 'Alimentante', def: 'Persona obligada a pagar la pensión de alimentos. Puede ser padre, madre u otro ascendiente.', cat: 'Pensiones' },
    { term: 'Alimentos Provisorios', def: 'Pensión temporal que fija el juez mientras dura el juicio, para asegurar que el alimentario reciba ayuda económica inmediata.', cat: 'Pensiones' },
    { term: 'Pensión Mínima', def: 'El 40% de un ingreso mínimo remuneracional por cada hijo. Es el piso que el tribunal suele fijar cuando no se acreditan ingresos del alimentante.', cat: 'Pensiones' },
    { term: 'Alimentos Mayores', def: 'Pensión fijada en un monto superior al mínimo, basada en las necesidades reales del alimentario y la capacidad del alimentante.', cat: 'Pensiones' },
    { term: 'Mediación', def: 'Proceso obligatorio previo a la demanda donde un mediador intenta que las partes lleguen a un acuerdo. Es gratuita en los centros de mediación licitados.', cat: 'Procedimiento' },
    { term: 'Audiencia Preparatoria', def: 'Primera audiencia ante el juez donde se definen los hechos a probar, se ofrecen pruebas y se intenta conciliación.', cat: 'Procedimiento' },
    { term: 'Audiencia de Juicio', def: 'Segunda audiencia donde se rinden las pruebas y el juez dicta sentencia. Es oral y puede durar varias horas.', cat: 'Procedimiento' },
    { term: 'Sentencia', def: 'Resolución definitiva del juez que establece derechos y obligaciones. Puede ser apelada dentro de 10 días hábiles.', cat: 'Procedimiento' },
    { term: 'Notificación', def: 'Acto formal por el cual se comunica una resolución judicial a una persona. Puede ser personal, por cédula, por correo electrónico o por estado diario.', cat: 'Procedimiento' },
    { term: 'Resolución', def: 'Decisión del tribunal que puede ser de distinta naturaleza: decreto, auto, sentencia interlocutoria o sentencia definitiva.', cat: 'Procedimiento' },
    { term: 'Cosa Juzgada', def: 'Principio que impide volver a discutir un asunto ya resuelto por sentencia firme. En pensiones tiene excepciones.', cat: 'Procedimiento' },
    { term: 'Liquidación', def: 'Cálculo oficial de la deuda de pensiones realizado por el secretario del tribunal, incluyendo reajuste IPC e intereses.', cat: 'Apremio' },
    { term: 'Apremio', def: 'Medida coercitiva para obligar al deudor a cumplir con el pago. Incluye arresto, retención de fondos, suspensión de licencia, etc.', cat: 'Apremio' },
    { term: 'Arresto Nocturno', def: 'Medida de apremio que obliga al deudor a presentarse en un recinto policial entre las 22:00 y las 06:00 hrs, por hasta 15 días.', cat: 'Apremio' },
    { term: 'Arresto Total', def: 'Privación de libertad diurna y nocturna por hasta 15 días. Se aplica en casos de reincidencia grave.', cat: 'Apremio' },
    { term: 'Retención de Fondos', def: 'Orden judicial a instituciones financieras para retener dinero del deudor y transferirlo al alimentario.', cat: 'Apremio' },
    { term: 'Registro Nacional de Deudores', def: 'Registro público del Poder Judicial donde se inscriben las personas con deuda de pensiones. Impide trámites financieros y personales.', cat: 'Apremio' },
    { term: 'Arraigo Nacional', def: 'Prohibición de salir del país decretada por el tribunal hasta que se regularice la deuda de alimentos.', cat: 'Apremio' },
    { term: 'Suspensión de Licencia', def: 'El tribunal ordena suspender la licencia de conducir del deudor hasta que pague la totalidad de la deuda.', cat: 'Apremio' },
    { term: 'Reajuste IPC', def: 'Ajuste del monto adeudado según el Índice de Precios al Consumidor (inflación), para mantener el valor real de la deuda.', cat: 'Apremio' },
    { term: 'Cédula de Notificación', def: 'Documento que se deja en el domicilio cuando no se encuentra personalmente al demandado. Tiene plena validez legal.', cat: 'Documentos' },
    { term: 'Poder', def: 'Documento que autoriza a un abogado o persona para actuar en representación de otra ante el tribunal.', cat: 'Documentos' },
    { term: 'Certificado de Nacimiento', def: 'Documento del Registro Civil que acredita la filiación (relación padre/madre-hijo). Es requisito esencial en causas de alimentos.', cat: 'Documentos' },
    { term: 'Comprobante de Pago', def: 'Documento que acredita el pago de pensión: transferencia bancaria, depósito judicial, vale vista. Esencial para defender pagos realizados.', cat: 'Documentos' },
    { term: 'Acta de Mediación', def: 'Documento que certifica el resultado de la mediación: acuerdo total, acuerdo parcial o mediación frustrada.', cat: 'Documentos' },
    { term: 'Cuidado Personal', def: 'Derecho y deber de un padre/madre de tener al hijo viviendo consigo y velar por su crianza y educación.', cat: 'Pensiones' },
    { term: 'Relación Directa y Regular', def: 'Nombre legal del derecho de visitas. Es el derecho del padre/madre que no tiene el cuidado personal a mantener contacto con sus hijos.', cat: 'Pensiones' },
    { term: 'Interés Superior del Niño', def: 'Principio rector en todas las decisiones judiciales que involucran menores. El bienestar del niño prevalece sobre otros intereses.', cat: 'Procedimiento' },
];

const CATEGORIES = ['Todos', 'Pensiones', 'Procedimiento', 'Apremio', 'Documentos'];

export default function GlosarioModule() {
    const [search, setSearch] = useState('');
    const [activeCat, setActiveCat] = useState('Todos');
    const [expanded, setExpanded] = useState(null);

    const filtered = TERMS.filter(t => {
        const matchCat = activeCat === 'Todos' || t.cat === activeCat;
        const matchSearch = !search || t.term.toLowerCase().includes(search.toLowerCase()) || t.def.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });

    return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>📖 Glosario Legal</h1>
                <p>Términos legales explicados en lenguaje simple. Busca cualquier concepto que no entiendas.</p>
            </div>

            {/* Search & Filters */}
            <div className="nf-card nf-animate-in" style={{ animationDelay: '.08s', marginBottom: 24 }}>
                <div className="nf-field" style={{ marginBottom: 16 }}>
                    <input
                        className="nf-input"
                        type="text"
                        placeholder="🔍 Buscar término..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="nf-filter-bar">
                    {CATEGORIES.map(c => (
                        <button
                            key={c}
                            className={`nf-filter-chip${activeCat === c ? ' active' : ''}`}
                            onClick={() => setActiveCat(c)}
                        >
                            {c}
                        </button>
                    ))}
                </div>
                <div style={{ fontSize: 13, color: 'var(--nf-text3)' }}>
                    {filtered.length} término{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Terms */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.map((t, i) => (
                    <div
                        className={`nf-glossary-item nf-animate-in${expanded === i ? ' expanded' : ''}`}
                        key={t.term}
                        style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}
                        onClick={() => setExpanded(expanded === i ? null : i)}
                    >
                        <div className="nf-glossary-header">
                            <span className="nf-glossary-term">{t.term}</span>
                            <span className={`nf-badge ${t.cat === 'Pensiones' ? 'purple' : t.cat === 'Procedimiento' ? 'blue' : t.cat === 'Apremio' ? 'red' : 'green'}`}>
                                {t.cat}
                            </span>
                            <span className="nf-glossary-toggle">{expanded === i ? '−' : '+'}</span>
                        </div>
                        {expanded === i && (
                            <div className="nf-glossary-def">{t.def}</div>
                        )}
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="nf-card" style={{ textAlign: 'center', padding: 40, color: 'var(--nf-text3)' }}>
                        <p style={{ fontSize: 32, marginBottom: 8 }}>🔍</p>
                        <p>No se encontraron términos. Intenta otra búsqueda.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
