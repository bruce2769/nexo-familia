import React, { useState } from 'react';
import { formatCurrency } from '../core/constants.js';
import { createQuotation } from '../costing/quotationEngine.js';
import { exportQuotationPDF } from '../export/exportManager.js';
import { toast } from 'react-hot-toast';

export const QuotationPanel = ({ project, costData, cutListResults, onSaveQuotation }) => {
    const existingQuote = project.quotation;

    const [clientName, setClientName] = useState(existingQuote?.client?.name || '');
    const [clientPhone, setClientPhone] = useState(existingQuote?.client?.phone || '');
    const [clientEmail, setClientEmail] = useState(existingQuote?.client?.email || '');
    const [notes, setNotes] = useState(existingQuote?.notes || '');
    const [validDays, setValidDays] = useState(existingQuote?.validDays || 15);

    const handleGenerate = () => {
        try {
            const quotation = createQuotation({
                projectName: project.name,
                clientName, clientPhone, clientEmail,
                notes, validDays,
                dimensions: project.dimensions,
                materials: project.materials,
                cabinetType: project.cabinetType,
                cutListResults, costData,
            });
            onSaveQuotation(quotation);
            toast.success('Cotización generada exitosamente');
        } catch (e) {
            toast.error('Error al generar cotización: ' + e.message);
        }
    };

    const handleExportPDF = () => {
        try {
            if (!existingQuote) {
                toast.error('Genere una cotización primero');
                return;
            }
            exportQuotationPDF(existingQuote);
            toast.success('PDF de cotización exportado');
        } catch (e) {
            toast.error('Error al exportar PDF: ' + e.message);
        }
    };

    return (
        <div className="panel-fullpage">
            <h2 className="panel-page-title">📄 Cotización</h2>

            <div className="quote-layout">
                {/* Form */}
                <div className="quote-form">
                    <div className="form-card">
                        <h3>Datos del Cliente</h3>
                        <label className="form-label">
                            Nombre
                            <input className="form-input" value={clientName}
                                onChange={e => setClientName(e.target.value)} placeholder="Nombre del cliente" />
                        </label>
                        <label className="form-label">
                            Teléfono
                            <input className="form-input" value={clientPhone}
                                onChange={e => setClientPhone(e.target.value)} placeholder="+57 300 000 0000" />
                        </label>
                        <label className="form-label">
                            Email
                            <input className="form-input" value={clientEmail}
                                onChange={e => setClientEmail(e.target.value)} placeholder="cliente@email.com" type="email" />
                        </label>
                    </div>

                    <div className="form-card">
                        <h3>Configuración</h3>
                        <label className="form-label">
                            Validez (días)
                            <input className="form-input" type="number" value={validDays}
                                onChange={e => setValidDays(parseInt(e.target.value) || 15)} min={1} max={90} />
                        </label>
                        <label className="form-label">
                            Notas
                            <textarea className="form-textarea" value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Condiciones, observaciones..." rows={3} />
                        </label>
                    </div>

                    <div className="form-actions">
                        <button className="btn-primary" onClick={handleGenerate}>
                            📄 Generar Cotización
                        </button>
                        <button className="btn-secondary" onClick={handleExportPDF} disabled={!existingQuote}>
                            📥 Exportar PDF
                        </button>
                    </div>
                </div>

                {/* Preview */}
                <div className="quote-preview">
                    {existingQuote ? (
                        <div className="quote-doc">
                            <div className="quote-doc-header">
                                <h3>MueblePro Enterprise</h3>
                                <span className="quote-number">{existingQuote.quotationNumber}</span>
                            </div>

                            <div className="quote-doc-section">
                                <h4>Cliente</h4>
                                <p>{existingQuote.client.name || 'N/A'}</p>
                                {existingQuote.client.phone && <p>📞 {existingQuote.client.phone}</p>}
                                {existingQuote.client.email && <p>📧 {existingQuote.client.email}</p>}
                            </div>

                            <div className="quote-doc-section">
                                <h4>Proyecto: {existingQuote.project.name}</h4>
                                <p>{existingQuote.project.dimensions.height}×{existingQuote.project.dimensions.width}×{existingQuote.project.dimensions.depth}mm</p>
                                <p>Espesor: {existingQuote.project.materials.thickness}mm | Fondo: {existingQuote.project.materials.backing}</p>
                            </div>

                            <div className="quote-doc-section">
                                <h4>Materiales</h4>
                                <p>Melamina: {existingQuote.materialsSummary.melamineArea} m²</p>
                                <p>Cantoneado: {existingQuote.materialsSummary.edgeBanding} ml</p>
                                <p>Planchas: {existingQuote.materialsSummary.boardsNeeded}</p>
                            </div>

                            <table className="quote-table">
                                <thead>
                                    <tr><th>Concepto</th><th>Valor</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td>Materiales</td><td>{formatCurrency(existingQuote.priceBreakdown.materialCost)}</td></tr>
                                    <tr><td>Herrajes</td><td>{formatCurrency(existingQuote.priceBreakdown.hardwareCost)}</td></tr>
                                    <tr><td>Mano de Obra</td><td>{formatCurrency(existingQuote.priceBreakdown.laborCost)}</td></tr>
                                    <tr><td>Gastos Generales</td><td>{formatCurrency(existingQuote.priceBreakdown.overheadCost)}</td></tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td><strong>TOTAL</strong></td>
                                        <td><strong>{formatCurrency(existingQuote.finalPrice)}</strong></td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div className="quote-doc-footer">
                                <p>Válida hasta: {new Date(existingQuote.expiresAt).toLocaleDateString('es-CO')}</p>
                                {existingQuote.notes && <p>Notas: {existingQuote.notes}</p>}
                            </div>
                        </div>
                    ) : (
                        <div className="quote-empty">
                            <span style={{ fontSize: 48 }}>📄</span>
                            <p>Complete los datos del cliente y genere la cotización</p>
                            <p className="text-muted">Se calculará automáticamente con los costos del proyecto</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
