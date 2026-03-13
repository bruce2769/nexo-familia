import React, { useState, useMemo } from 'react';
import { useStore, ACTIONS } from '../core/store.js';
import { checkLowStock, getInventoryReport } from '../inventory/inventoryManager.js';
import { toast } from 'react-hot-toast';

export const InventoryPanel = () => {
    const { state, dispatch } = useStore();
    const { inventory } = state;
    const [restockItem, setRestockItem] = useState('');
    const [restockAmount, setRestockAmount] = useState('');

    const report = useMemo(() => getInventoryReport(inventory), [inventory]);
    const lowStockAlerts = useMemo(() => checkLowStock(inventory), [inventory]);

    const handleRestock = () => {
        if (!restockItem || !restockAmount) {
            toast.error('Seleccione un material y cantidad');
            return;
        }
        const amount = parseInt(restockAmount);
        if (amount <= 0 || isNaN(amount)) {
            toast.error('Cantidad debe ser mayor a 0');
            return;
        }
        dispatch({
            type: ACTIONS.RESTOCK_INVENTORY,
            payload: { item: restockItem, amount }
        });
        toast.success(`+${amount} ${inventory[restockItem]?.unit || 'und'} de ${inventory[restockItem]?.label || restockItem}`);
        setRestockAmount('');
    };

    const handleSetStock = (key, newQty) => {
        const qty = parseInt(newQty);
        if (isNaN(qty) || qty < 0) return;
        dispatch({
            type: ACTIONS.UPDATE_INVENTORY,
            payload: {
                [key]: { ...inventory[key], qty }
            }
        });
    };

    const handleSetMinStock = (key, newMin) => {
        const min = parseInt(newMin);
        if (isNaN(min) || min < 0) return;
        dispatch({
            type: ACTIONS.UPDATE_INVENTORY,
            payload: {
                [key]: { ...inventory[key], minStock: min }
            }
        });
    };

    const statusIcon = (status) => {
        if (status === 'empty') return '🔴';
        if (status === 'low') return '🟡';
        return '🟢';
    };

    return (
        <div className="panel-fullpage">
            <h2 className="panel-page-title">📦 Inventario</h2>

            {/* Alerts */}
            {lowStockAlerts.length > 0 && (
                <div className="inv-alerts">
                    <h3>⚠️ Alertas de Stock Bajo ({lowStockAlerts.length})</h3>
                    <div className="inv-alert-list">
                        {lowStockAlerts.map(alert => (
                            <div key={alert.key} className={`inv-alert ${alert.critical ? 'critical' : 'warning'}`}>
                                <span>{alert.critical ? '🔴' : '🟡'} {alert.label}</span>
                                <span>{alert.currentQty} / {alert.minStock} {alert.unit}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Restock Quick Action */}
            <div className="inv-restock-bar">
                <select className="form-select" value={restockItem}
                    onChange={e => setRestockItem(e.target.value)}>
                    <option value="">Seleccionar material...</option>
                    {report.items.map(item => (
                        <option key={item.key} value={item.key}>{item.label}</option>
                    ))}
                </select>
                <input
                    type="number" className="form-input" placeholder="Cantidad"
                    value={restockAmount} onChange={e => setRestockAmount(e.target.value)}
                    min={1} style={{ width: 120 }}
                />
                <button className="btn-primary" onClick={handleRestock}>
                    + Reabastecer
                </button>
            </div>

            {/* Inventory Table */}
            <div className="inv-table-wrapper">
                <table className="inv-table">
                    <thead>
                        <tr>
                            <th style={{ width: 30 }}></th>
                            <th>Material</th>
                            <th style={{ width: 100 }}>Stock Actual</th>
                            <th style={{ width: 100 }}>Stock Mínimo</th>
                            <th style={{ width: 60 }}>Unidad</th>
                            <th style={{ width: 140 }}>Nivel</th>
                        </tr>
                    </thead>
                    <tbody>
                        {report.items.map(item => (
                            <tr key={item.key} className={item.status !== 'ok' ? 'row-warning' : ''}>
                                <td>{statusIcon(item.status)}</td>
                                <td>{item.label}</td>
                                <td>
                                    <input
                                        type="number" className="inv-inline-input"
                                        value={item.qty}
                                        onChange={e => handleSetStock(item.key, e.target.value)}
                                        min={0}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number" className="inv-inline-input"
                                        value={item.minStock}
                                        onChange={e => handleSetMinStock(item.key, e.target.value)}
                                        min={0}
                                    />
                                </td>
                                <td>{item.unit}</td>
                                <td>
                                    <div className="inv-bar-track">
                                        <div
                                            className={`inv-bar-fill ${item.status}`}
                                            style={{ width: `${Math.min(100, item.stockPercent)}%` }}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            <div className="inv-summary">
                <span>Total alertas: <strong>{report.totalAlerts}</strong></span>
                <span>Ítems críticos: <strong style={{ color: report.criticalItems > 0 ? '#ef4444' : '#22c55e' }}>
                    {report.criticalItems}
                </strong></span>
            </div>
        </div>
    );
};
