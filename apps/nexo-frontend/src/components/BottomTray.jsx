import React, { useState } from 'react';

/**
 * BottomTray — Bandeja inferior con lista de cortes y totales.
 */
export const BottomTray = ({ results, selectedItemId }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const cutList = results?.cutList || [];
    const warnings = results?.warnings || [];
    const totals = results?.totals || {};
    const pieceCount = totals.totalPieces || cutList.reduce((acc, item) => acc + (item.qty || 1), 0);
    const totalCost = totals.materialCost || totals.cost || 0;

    return (
        <div className={`cad-bottom-tray ${isExpanded ? 'expanded' : ''}`}>
            <div className="tray-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="tray-title">
                    <span className="tray-title-main">
                        LISTA DE CORTES ({pieceCount} PIEZAS) — {totals.boardsNeeded || '?'} PLANCHAS
                    </span>
                </div>
                <div className="tray-toggle">
                    {isExpanded ? '▼' : '▲'}
                </div>
            </div>

            {isExpanded && (
                <div className="tray-content">
                    {/* Alertas */}
                    {warnings.length > 0 && (
                        <div style={{
                            padding: '8px 12px', marginBottom: 10, borderRadius: 6,
                            background: '#FEF3C7', border: '1px solid #F59E0B',
                            fontSize: 11
                        }}>
                            {warnings.map((w, i) => <div key={i}>{w}</div>)}
                        </div>
                    )}

                    <table className="results-table">
                        <thead>
                            <tr>
                                <th>Pieza</th>
                                <th style={{ textAlign: 'center' }}>Cant.</th>
                                <th style={{ textAlign: 'right' }}>Ancho (mm)</th>
                                <th style={{ textAlign: 'right' }}>Alto (mm)</th>
                                <th>Material</th>
                                <th style={{ textAlign: 'right' }}>Cantos (ml)</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {cutList.map((cut, idx) => (
                                <tr key={idx}
                                    className={selectedItemId && cut.ids?.includes(selectedItemId) ? 'selected' : ''}
                                >
                                    <td>{cut.part}</td>
                                    <td style={{ textAlign: 'center' }}>{cut.qty}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        {typeof cut.width === 'number' ? Math.round(cut.width) : cut.width}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {typeof cut.height === 'number' ? Math.round(cut.height) : cut.height}
                                    </td>
                                    <td style={{ fontSize: 10, color: '#6b7280' }}>
                                        {cut.material || '-'}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {cut.edgeBanding ? (cut.edgeBanding / 1000).toFixed(2) : '-'}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {cut.warning && <span title={cut.warning}>⚠️</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="tray-footer">
                <div style={{ display: 'flex', gap: 20, fontSize: 11, color: '#6b7280' }}>
                    <span>Melamina: {totals.melamineArea || 0} m²</span>
                    <span>Fondo: {totals.backingArea || 0} m²</span>
                    <span>Canto: {totals.edgeBanding || 0} ml</span>
                    <span>Planchas: {totals.boardsNeeded || '-'}</span>
                </div>
                <span className="footer-total">
                    MATERIAL: ${totalCost.toLocaleString('es-CO')} COP
                </span>
            </div>
        </div>
    );
};
