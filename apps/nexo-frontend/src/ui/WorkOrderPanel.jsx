import React from 'react';
import { formatCurrency, WO_STATUS, WO_STATUS_LABELS } from '../core/constants.js';
import { createWorkOrder } from '../costing/workOrderEngine.js';
import { exportWorkOrderPDF } from '../export/exportManager.js';
import { toast } from 'react-hot-toast';

export const WorkOrderPanel = ({ project, cutListResults, costData, onSaveWorkOrder, onUpdateStatus }) => {
    const wo = project.workOrder;

    const handleGenerate = () => {
        try {
            const workOrder = createWorkOrder({
                projectId: project.id,
                projectName: project.name,
                cutListResults,
                optimizationResult: project.optimizationResult,
                costData,
                dimensions: project.dimensions,
                materials: project.materials,
                cabinetType: project.cabinetType,
            });
            onSaveWorkOrder(workOrder);
            toast.success('Orden de trabajo generada');
        } catch (e) {
            toast.error('Error: ' + e.message);
        }
    };

    const handleExportPDF = () => {
        try {
            if (!wo) { toast.error('Genere una orden primero'); return; }
            exportWorkOrderPDF(wo);
            toast.success('PDF de orden exportado');
        } catch (e) {
            toast.error('Error al exportar: ' + e.message);
        }
    };

    const statusColor = {
        [WO_STATUS.DRAFT]: '#9ca3af',
        [WO_STATUS.CONFIRMED]: '#3b82f6',
        [WO_STATUS.IN_PROGRESS]: '#f59e0b',
        [WO_STATUS.COMPLETED]: '#22c55e',
        [WO_STATUS.CANCELLED]: '#ef4444',
    };

    return (
        <div className="panel-fullpage">
            <h2 className="panel-page-title">🔧 Orden de Trabajo</h2>

            <div className="wo-actions-bar">
                <button className="btn-primary" onClick={handleGenerate}>
                    🔧 Generar Orden
                </button>
                <button className="btn-secondary" onClick={handleExportPDF} disabled={!wo}>
                    📥 Exportar PDF
                </button>
                {wo && (
                    <div className="wo-status-selector">
                        <label>Estado:</label>
                        <select
                            value={wo.status}
                            onChange={e => onUpdateStatus(e.target.value)}
                            className="form-select"
                            style={{ borderColor: statusColor[wo.status] || '#d1d5db' }}
                        >
                            {Object.entries(WO_STATUS_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {wo ? (
                <div className="wo-content">
                    {/* Header Info */}
                    <div className="wo-header-info">
                        <div className="wo-badge" style={{ background: statusColor[wo.status] }}>
                            {WO_STATUS_LABELS[wo.status]}
                        </div>
                        <span className="wo-number">{wo.woNumber}</span>
                        <span className="wo-date">{new Date(wo.createdAt).toLocaleDateString('es-CO')}</span>
                    </div>

                    {/* Dimensions */}
                    <div className="wo-card">
                        <h3>📐 Especificaciones</h3>
                        <p>{wo.dimensions.height}H × {wo.dimensions.width}A × {wo.dimensions.depth}P mm</p>
                        <p>Espesor: {wo.materials.thickness}mm | Fondo: {wo.materials.backing}</p>
                        <p>Planchas Melamina: <strong>{wo.boardCount.melamine}</strong> | MDF: <strong>{wo.boardCount.mdf}</strong></p>
                        {wo.optimization && (
                            <p>Eficiencia corte: <strong>{wo.optimization.efficiency}%</strong> — Desperdicio: {wo.optimization.wasteM2} m²</p>
                        )}
                    </div>

                    {/* Cut List */}
                    <div className="wo-card">
                        <h3>📋 Lista de Cortes ({wo.cutList.length} tipos de piezas)</h3>
                        <div className="wo-table-wrapper">
                            <table className="wo-table">
                                <thead>
                                    <tr>
                                        <th>Pieza</th><th>Cant</th><th>Ancho</th><th>Alto</th>
                                        <th>Material</th><th>Cantos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wo.cutList.map((item, i) => (
                                        <tr key={i}>
                                            <td>{item.part}</td>
                                            <td className="center">{item.qty}</td>
                                            <td className="right">{item.width}mm</td>
                                            <td className="right">{item.height}mm</td>
                                            <td>{item.material}</td>
                                            <td>{item.edgeBandingSides}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Hardware */}
                    <div className="wo-card">
                        <h3>🔩 Herrajes</h3>
                        <div className="wo-hardware-grid">
                            {wo.hardwareList.map((h, i) => (
                                <div key={i} className="wo-hardware-item">
                                    <span className="wo-hw-name">{h.item}</span>
                                    <span className="wo-hw-qty">{h.qty} {h.unit}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Assembly Notes */}
                    <div className="wo-card">
                        <h3>📝 Notas de Ensamblaje</h3>
                        <ol className="wo-assembly-notes">
                            {wo.assemblyNotes.map((note, i) => (
                                <li key={i}>{note}</li>
                            ))}
                        </ol>
                    </div>

                    {/* Cost Reference */}
                    <div className="wo-card cost-ref">
                        <span>Costo Estimado de Fabricación:</span>
                        <span className="wo-cost-value">{formatCurrency(wo.estimatedCost)}</span>
                    </div>
                </div>
            ) : (
                <div className="wo-empty">
                    <span style={{ fontSize: 48 }}>🔧</span>
                    <p>Genere una orden de trabajo para ver los detalles de producción</p>
                    <p className="text-muted">Incluye lista de cortes, herrajes, instrucciones de ensamblaje</p>
                </div>
            )}
        </div>
    );
};
