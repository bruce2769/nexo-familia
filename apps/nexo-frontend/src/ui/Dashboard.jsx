import React, { useMemo } from 'react';
import { useStore } from '../core/store.js';
import { formatCurrency, formatNumber } from '../core/constants.js';

export const Dashboard = () => {
    const { state } = useStore();
    const { reporting, projects, inventory } = state;

    // ─── Compute Dashboard Data ─────────────────
    const dashData = useMemo(() => {
        const completedJobs = reporting.completedJobs || [];
        const totalRevenue = completedJobs.reduce((s, j) => s + (j.revenue || 0), 0);
        const totalCost = completedJobs.reduce((s, j) => s + (j.cost || 0), 0);
        const totalProfit = totalRevenue - totalCost;

        // Monthly breakdown (last 6 months)
        const monthlyData = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toISOString().slice(0, 7);
            monthlyData[key] = reporting.monthlyRevenue[key] || 0;
        }

        // Board usage from projects
        const totalBoardsUsed = completedJobs.reduce((s, j) => s + (j.boardsUsed || 0), 0);
        const totalWasteM2 = completedJobs.reduce((s, j) => s + (j.wasteM2 || 0), 0);
        const avgEfficiency = completedJobs.length > 0
            ? completedJobs.reduce((s, j) => s + (j.efficiency || 0), 0) / completedJobs.length
            : 0;

        // Inventory alerts
        const lowStockItems = Object.entries(inventory).filter(([, item]) => item.qty <= item.minStock);

        return {
            totalRevenue, totalCost, totalProfit,
            monthlyData,
            totalBoardsUsed, totalWasteM2, avgEfficiency,
            completedJobsCount: completedJobs.length,
            activeProjects: projects.length,
            lowStockItems,
        };
    }, [reporting, projects, inventory]);

    const maxMonthlyValue = Math.max(...Object.values(dashData.monthlyData), 1);

    return (
        <div className="dashboard-container">
            <h2 className="dashboard-title">📊 Dashboard de Producción</h2>

            {/* KPI Cards */}
            <div className="dash-kpi-grid">
                <div className="dash-kpi-card" style={{ borderLeft: '4px solid #22c55e' }}>
                    <span className="kpi-label">Ingresos Totales</span>
                    <span className="kpi-value" style={{ color: '#22c55e' }}>{formatCurrency(dashData.totalRevenue)}</span>
                </div>
                <div className="dash-kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <span className="kpi-label">Ganancia Neta</span>
                    <span className="kpi-value" style={{ color: '#3b82f6' }}>{formatCurrency(dashData.totalProfit)}</span>
                </div>
                <div className="dash-kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <span className="kpi-label">Trabajos Completados</span>
                    <span className="kpi-value">{dashData.completedJobsCount}</span>
                </div>
                <div className="dash-kpi-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                    <span className="kpi-label">Proyectos Activos</span>
                    <span className="kpi-value">{dashData.activeProjects}</span>
                </div>
            </div>

            {/* Charts Row */}
            <div className="dash-charts-row">
                {/* Monthly Revenue Chart */}
                <div className="dash-card dash-chart-card">
                    <h3>Ingresos Mensuales</h3>
                    <div className="dash-bar-chart">
                        {Object.entries(dashData.monthlyData).map(([month, value]) => {
                            const barH = maxMonthlyValue > 0 ? (value / maxMonthlyValue) * 100 : 0;
                            const monthLabel = new Date(month + '-01').toLocaleDateString('es-CO', { month: 'short' });
                            return (
                                <div key={month} className="dash-bar-col">
                                    <div className="dash-bar-value">{value > 0 ? formatCurrency(value) : '-'}</div>
                                    <div className="dash-bar-track">
                                        <div className="dash-bar-fill" style={{ height: `${Math.max(barH, 2)}%` }} />
                                    </div>
                                    <div className="dash-bar-label">{monthLabel}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Production Stats */}
                <div className="dash-card">
                    <h3>Producción</h3>
                    <div className="dash-stat-list">
                        <div className="dash-stat-row">
                            <span>Planchas Consumidas</span>
                            <span className="dash-stat-val">{dashData.totalBoardsUsed}</span>
                        </div>
                        <div className="dash-stat-row">
                            <span>Desperdicio Total</span>
                            <span className="dash-stat-val">{formatNumber(dashData.totalWasteM2)} m²</span>
                        </div>
                        <div className="dash-stat-row">
                            <span>Eficiencia Promedio</span>
                            <span className="dash-stat-val">{formatNumber(dashData.avgEfficiency, 1)}%</span>
                        </div>
                        <div className="dash-stat-row">
                            <span>Costo Total Materiales</span>
                            <span className="dash-stat-val">{formatCurrency(dashData.totalCost)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Inventory Alerts */}
            <div className="dash-card">
                <h3>⚠️ Alertas de Inventario</h3>
                {dashData.lowStockItems.length === 0 ? (
                    <p className="dash-empty">Todo el inventario está dentro de niveles normales ✓</p>
                ) : (
                    <div className="dash-alert-list">
                        {dashData.lowStockItems.map(([key, item]) => (
                            <div key={key} className={`dash-alert-item ${item.qty === 0 ? 'critical' : 'warning'}`}>
                                <span className="dash-alert-icon">{item.qty === 0 ? '🔴' : '🟡'}</span>
                                <span className="dash-alert-label">{item.label}</span>
                                <span className="dash-alert-qty">{item.qty} / {item.minStock} {item.unit}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Projects */}
            <div className="dash-card">
                <h3>Proyectos Recientes</h3>
                <div className="dash-projects-list">
                    {projects.slice(-5).reverse().map(p => (
                        <div key={p.id} className="dash-project-row">
                            <span className="dash-proj-name">{p.name}</span>
                            <span className="dash-proj-dims">{p.dimensions.width}×{p.dimensions.height}mm</span>
                            <span className="dash-proj-date">{new Date(p.updatedAt || p.createdAt).toLocaleDateString('es-CO')}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
