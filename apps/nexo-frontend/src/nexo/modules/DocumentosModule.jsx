import React, { useState } from 'react';


const DOCUMENT_TYPES = [
    {
        id: 'liquidacion',
        icon: '📊',
        title: 'Solicitud de Liquidación',
        desc: 'Solicitar al tribunal que practique liquidación de deuda de pensiones impagas.',
        color: 'purple',
        fields: ['causaNum', 'tribunal', 'demandante', 'demandado', 'periodoDesde', 'periodoHasta', 'montoMensual'],
        template: (d) => `SEÑOR(A) JUEZ(A) DEL ${d.tribunal || 'TRIBUNAL DE FAMILIA'}\n\n${d.demandante || '[NOMBRE DEMANDANTE]'}, en causa RIT ${d.causaNum || '[N° CAUSA]'}, a US. respetuosamente digo:\n\nQue vengo en solicitar se practique LIQUIDACIÓN DE DEUDA de las pensiones de alimentos adeudadas por el demandado(a) ${d.demandado || '[NOMBRE DEMANDADO]'}, correspondientes al período comprendido entre ${d.periodoDesde || '[FECHA DESDE]'} y ${d.periodoHasta || '[FECHA HASTA]'}, con un monto mensual fijado de $${d.montoMensual || '[MONTO]'}.\n\nLo anterior, en conformidad con lo dispuesto en el artículo 12 de la Ley N° 14.908 sobre Abandono de Familia y Pago de Pensiones Alimenticias.\n\nSolicito que la liquidación incluya:\n1. Capital adeudado por cada mes impago\n2. Reajuste conforme al IPC\n3. Intereses corrientes para operaciones no reajustables\n\nPOR TANTO,\nRuego a US. ordenar se practique liquidación de la deuda de pensiones alimenticias por el período señalado, y se notifique al demandado(a) para los efectos legales.\n\nOTROSÍ: Solicito que una vez firme la liquidación, se decreten las medidas de apremio que correspondan conforme a la ley.\n\n\n_______________________________\n${d.demandante || '[FIRMA]'}\n[RUT]\n[DOMICILIO]`,
    },
    {
        id: 'incumplimiento',
        icon: '⚠️',
        title: 'Denuncia de Incumplimiento',
        desc: 'Denunciar incumplimiento del régimen de visitas o de la pensión de alimentos.',
        color: 'red',
        fields: ['causaNum', 'tribunal', 'demandante', 'demandado', 'tipoIncumplimiento', 'fechaIncumplimiento', 'descripcion'],
        template: (d) => `SEÑOR(A) JUEZ(A) DEL ${d.tribunal || 'TRIBUNAL DE FAMILIA'}\n\n${d.demandante || '[NOMBRE DENUNCIANTE]'}, en causa RIT ${d.causaNum || '[N° CAUSA]'}, a US. respetuosamente digo:\n\nQue vengo en DENUNCIAR EL INCUMPLIMIENTO de ${d.tipoIncumplimiento || 'la obligación decretada por este tribunal'} por parte de ${d.demandado || '[NOMBRE DEMANDADO]'}.\n\nHECHOS:\nCon fecha ${d.fechaIncumplimiento || '[FECHA]'}, el/la demandado(a) ha incurrido en el siguiente incumplimiento:\n\n${d.descripcion || '[DESCRIPCIÓN DETALLADA DEL INCUMPLIMIENTO]'}\n\nLo anterior constituye un incumplimiento grave de lo resuelto por este tribunal, afectando directamente los derechos del/de la menor y/o del/de la demandante.\n\nDERECHO:\nFundo mi solicitud en lo dispuesto en los artículos 48 y siguientes de la Ley N° 19.968 y en las disposiciones pertinentes de la Ley N° 14.908.\n\nPOR TANTO,\nRuego a US.:\n1. Tener por denunciado el incumplimiento señalado\n2. Citar a audiencia para resolver sobre las consecuencias\n3. Decretar las medidas de apremio que correspondan\n\n\n_______________________________\n${d.demandante || '[FIRMA]'}\n[RUT]\n[DOMICILIO]`,
    },
    {
        id: 'domicilio',
        icon: '🏠',
        title: 'Cambio de Domicilio',
        desc: 'Informar al tribunal sobre un cambio de domicilio.',
        color: 'blue',
        fields: ['causaNum', 'tribunal', 'nombre', 'domicilioAnterior', 'domicilioNuevo', 'comuna', 'telefono'],
        template: (d) => `SEÑOR(A) JUEZ(A) DEL ${d.tribunal || 'TRIBUNAL DE FAMILIA'}\n\n${d.nombre || '[NOMBRE COMPLETO]'}, en causa RIT ${d.causaNum || '[N° CAUSA]'}, a US. respetuosamente digo:\n\nQue vengo en INFORMAR A ESTE TRIBUNAL mi cambio de domicilio, en cumplimiento de la obligación legal de mantener actualizada mi información de contacto.\n\nDOMICILIO ANTERIOR:\n${d.domicilioAnterior || '[DIRECCIÓN ANTERIOR]'}\n\nNUEVO DOMICILIO:\n${d.domicilioNuevo || '[DIRECCIÓN NUEVA]'}, comuna de ${d.comuna || '[COMUNA]'}\n\nTELÉFONO DE CONTACTO: ${d.telefono || '[TELÉFONO]'}\n\nSolicito se tome nota de este cambio en el expediente y se actualice la información para futuras notificaciones.\n\nPOR TANTO,\nRuego a US. tener presente el cambio de domicilio informado para todos los efectos legales.\n\n\n_______________________________\n${d.nombre || '[FIRMA]'}\n[RUT]`,
    },
    {
        id: 'retencion',
        icon: '🏦',
        title: 'Solicitud de Retención por Planilla',
        desc: 'Solicitar que la pensión se descuente directamente del sueldo del alimentante.',
        color: 'green',
        fields: ['causaNum', 'tribunal', 'demandante', 'demandado', 'empleador', 'montoMensual', 'rutDemandado'],
        template: (d) => `SEÑOR(A) JUEZ(A) DEL ${d.tribunal || 'TRIBUNAL DE FAMILIA'}\n\n${d.demandante || '[NOMBRE DEMANDANTE]'}, en causa RIT ${d.causaNum || '[N° CAUSA]'}, a US. respetuosamente digo:\n\nQue vengo en solicitar se ordene la RETENCIÓN POR PLANILLA de la pensión de alimentos fijada por este tribunal, la que deberá ser descontada directamente de la remuneración del demandado(a) ${d.demandado || '[NOMBRE DEMANDADO]'}, RUT ${d.rutDemandado || '[RUT]'}.\n\nDATOS DEL EMPLEADOR:\nEmpresa: ${d.empleador || '[NOMBRE EMPRESA]'}\n\nMONTO A RETENER: $${d.montoMensual || '[MONTO]'} mensuales.\n\nFUNDAMENTO: Artículo 8° de la Ley N° 14.908, que faculta al tribunal para ordenar el pago de la pensión mediante retención por parte del empleador.\n\nPOR TANTO,\nRuego a US.:\n1. Ordenar la retención por planilla del monto señalado\n2. Oficiar al empleador para que proceda al descuento mensual\n3. Ordenar que los fondos sean depositados en la cuenta de ahorro del tribunal a nombre del alimentario\n\n\n_______________________________\n${d.demandante || '[FIRMA]'}\n[RUT]\n[DOMICILIO]`,
    },
    {
        id: 'rebaja',
        icon: '📉',
        title: 'Solicitud de Rebaja de Pensión',
        desc: 'Solicitar disminución del monto de la pensión por cambio de circunstancias.',
        color: 'yellow',
        fields: ['causaNum', 'tribunal', 'demandante', 'montoActual', 'montoSolicitado', 'motivo'],
        template: (d) => `SEÑOR(A) JUEZ(A) DEL ${d.tribunal || 'TRIBUNAL DE FAMILIA'}\n\n${d.demandante || '[NOMBRE SOLICITANTE]'}, en causa RIT ${d.causaNum || '[N° CAUSA]'}, a US. respetuosamente digo:\n\nQue vengo en solicitar la REBAJA DE LA PENSIÓN DE ALIMENTOS actualmente fijada en $${d.montoActual || '[MONTO ACTUAL]'} mensuales, solicitando se reduzca a $${d.montoSolicitado || '[MONTO SOLICITADO]'} mensuales.\n\nFUNDAMENTOS:\n${d.motivo || '[DESCRIPCIÓN DEL CAMBIO DE CIRCUNSTANCIAS: pérdida de empleo, disminución de ingresos, nuevas cargas familiares, enfermedad, etc.]'}\n\nDERECHO:\nFundo mi solicitud en el artículo 332 del Código Civil, que establece que los alimentos pueden modificarse cuando cambien las circunstancias que sirvieron de base para fijarlos.\n\nPOR TANTO,\nRuego a US.:\n1. Admitir a tramitación la presente solicitud\n2. Fijar audiencia para discutir la rebaja solicitada\n3. Decretar alimentos provisorios por el monto solicitado mientras se resuelve\n\n\n_______________________________\n${d.demandante || '[FIRMA]'}\n[RUT]\n[DOMICILIO]`,
    },
];

const FIELD_LABELS = {
    causaNum: 'Número de Causa',
    tribunal: 'Tribunal',
    demandante: 'Nombre Demandante',
    demandado: 'Nombre Demandado',
    periodoDesde: 'Periodo Desde',
    periodoHasta: 'Periodo Hasta',
    montoMensual: 'Monto Mensual',
    tipoIncumplimiento: 'Tipo de Incumplimiento',
    fechaIncumplimiento: 'Fecha del Incumplimiento',
    descripcion: 'Descripción Detallada',
    nombre: 'Nombre Completo',
    domicilioAnterior: 'Domicilio Anterior',
    domicilioNuevo: 'Nuevo Domicilio',
    comuna: 'Comuna',
    telefono: 'Teléfono',
    empleador: 'Nombre del Empleador',
    rutDemandado: 'RUT del Demandado',
    montoActual: 'Monto Actual',
    montoSolicitado: 'Monto Solicitado',
    motivo: 'Motivo de la Solicitud',
};

const FIELD_PLACEHOLDERS = {
    causaNum: 'Ej: C-1234-2024',
    tribunal: 'Ej: Tribunal de Familia de Santiago',
    demandante: 'Nombre completo',
    demandado: 'Nombre completo',
    periodoDesde: 'Ej: enero 2024',
    periodoHasta: 'Ej: diciembre 2024',
    montoMensual: 'Ej: 250000',
    tipoIncumplimiento: 'Ej: régimen de visitas / pensión de alimentos',
    fechaIncumplimiento: 'Ej: 15 de enero de 2025',
    descripcion: 'Describa los hechos...',
    nombre: 'Nombre completo',
    domicilioAnterior: 'Dirección completa',
    domicilioNuevo: 'Dirección completa',
    comuna: 'Ej: Providencia',
    telefono: 'Ej: +56 9 1234 5678',
    empleador: 'Nombre de la empresa',
    rutDemandado: 'Ej: 12.345.678-9',
    montoActual: 'Ej: 350000',
    montoSolicitado: 'Ej: 200000',
    motivo: 'Explique las razones del cambio...',
};

export default function DocumentosModule() {
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [formData, setFormData] = useState({});
    const [generated, setGenerated] = useState(null);
    const [copied, setCopied] = useState(false);

    const doc = DOCUMENT_TYPES.find(d => d.id === selectedDoc);

    const handleGenerate = () => {
        if (!doc) return;
        setGenerated(doc.template(formData));
    };

    const handleCopy = () => {
        if (generated) {
            navigator.clipboard.writeText(generated).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    const descargarPDF = async () => {
        if (!generated || !doc) return;
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF();

        pdf.setFont("Times", "Normal");
        pdf.setFontSize(12);

        // Formato Legal Judicial (Márgenes de tribunal)
        // Split text to fit width (180mm) with 15mm left margin
        const lineas = pdf.splitTextToSize(generated, 180);

        pdf.text(lineas, 15, 20);

        pdf.save(`${doc.id}_tribunal.pdf`);
    };

    const descargarWord = async () => {
        if (!generated || !doc) return;
        const { Document, Packer, Paragraph } = await import('docx');
        const { saveAs } = await import('file-saver');

        const docx = new Document({
            sections: [{
                children: generated.split('\n').map(line => new Paragraph(line))
            }]
        });

        const blob = await Packer.toBlob(docx);
        saveAs(blob, `${doc.id}_tribunal.docx`);
    };

    const handleReset = () => {
        setSelectedDoc(null);
        setFormData({});
        setGenerated(null);
    };

    const isLongField = (f) => ['descripcion', 'motivo'].includes(f);

    return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>📄 Generador de Documentos</h1>
                <p>Genera documentos legales listos para presentar al tribunal. Solo completa los campos y obtén tu escrito.</p>
            </div>

            {!selectedDoc ? (
                <div className="nf-guides-grid nf-animate-in" style={{ animationDelay: '.08s' }}>
                    {DOCUMENT_TYPES.map((d, i) => (
                        <div
                            className="nf-guide-card"
                            key={d.id}
                            onClick={() => { setSelectedDoc(d.id); setFormData({}); setGenerated(null); }}
                            style={{ animationDelay: `${i * 0.06}s` }}
                        >
                            <div className={`nf-card-icon ${d.color}`} style={{ width: 52, height: 52, fontSize: 24, borderRadius: 14 }}>
                                {d.icon}
                            </div>
                            <div className="nf-guide-card-title">{d.title}</div>
                            <div className="nf-guide-card-desc">{d.desc}</div>
                            <div style={{ marginTop: 12 }}>
                                <span style={{ color: 'var(--nf-accent)', fontSize: 14, fontWeight: 600 }}>Generar →</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : !generated ? (
                <div className="nf-card nf-animate-in">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className={`nf-card-icon ${doc.color}`}>{doc.icon}</div>
                            <div>
                                <div className="nf-card-title">{doc.title}</div>
                                <div className="nf-card-subtitle">Completa los campos para generar el documento</div>
                            </div>
                        </div>
                        <button className="nf-btn nf-btn-ghost" onClick={handleReset}>← Volver</button>
                    </div>

                    <div className="nf-form">
                        {doc.fields.map(f => (
                            <div className="nf-field" key={f}>
                                <label className="nf-label">{FIELD_LABELS[f] || f}</label>
                                {isLongField(f) ? (
                                    <textarea
                                        className="nf-textarea"
                                        placeholder={FIELD_PLACEHOLDERS[f] || ''}
                                        value={formData[f] || ''}
                                        onChange={e => setFormData({ ...formData, [f]: e.target.value })}
                                    />
                                ) : (
                                    <input
                                        className="nf-input"
                                        type="text"
                                        placeholder={FIELD_PLACEHOLDERS[f] || ''}
                                        value={formData[f] || ''}
                                        onChange={e => setFormData({ ...formData, [f]: e.target.value })}
                                    />
                                )}
                            </div>
                        ))}
                        <button className="nf-btn nf-btn-primary" onClick={handleGenerate} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                            📄 Generar Documento
                        </button>
                    </div>
                </div>
            ) : (
                <div className="nf-result">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <span className="nf-badge green">✅ Documento generado</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="nf-btn nf-btn-ghost" onClick={() => setGenerated(null)}>✏️ Editar</button>
                            <button className="nf-btn nf-btn-ghost" onClick={handleReset}>← Nuevo documento</button>
                        </div>
                    </div>

                    <div className="nf-card nf-animate-in">
                        <div className="nf-card-header">
                            <div className={`nf-card-icon ${doc.color}`}>{doc.icon}</div>
                            <div>
                                <div className="nf-card-title">{doc.title}</div>
                                <div className="nf-card-subtitle">Revisa el documento y cópialo</div>
                            </div>
                        </div>
                        <div className="nf-document-preview">
                            {generated.split('\n').map((line, idx) => (
                                <React.Fragment key={idx}>
                                    {line}
                                    <br />
                                </React.Fragment>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                            <button className="nf-btn nf-btn-primary" onClick={handleCopy}>
                                {copied ? '✅ Copiado!' : '📋 Copiar Texto'}
                            </button>
                            <button className="nf-btn nf-btn-secondary" style={{ background: '#ef4444', borderColor: '#ef4444', color: 'white' }} onClick={descargarPDF}>
                                📄 Descargar PDF
                            </button>
                            <button className="nf-btn nf-btn-secondary" style={{ background: '#3b82f6', borderColor: '#3b82f6', color: 'white' }} onClick={descargarWord}>
                                📝 Descargar Word
                            </button>
                        </div>
                    </div>

                    <div className="nf-disclaimer">
                        <span>⚠️</span>
                        Este documento es una plantilla referencial. Revíselo cuidadosamente y adáptelo a su caso. Consulte con un abogado antes de presentarlo al tribunal.
                    </div>
                </div>
            )}
        </div>
    );
}
