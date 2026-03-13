import React, { useState, useMemo } from 'react';
import { STANDARD_BOARD } from '../utils/validation.js';

/**
 * CostPanel — Módulo de Control de Costos y Rentabilidad
 * 
 * Calcula:
 * - Costo total de fabricación (materiales + herrajes + mano de obra)
 * - Precio sugerido de venta con margen
 * - Rentabilidad por metro lineal
 */
export const CostPanel = ({ results, dimensions, materials }) => {
    // Costos configurables por el usuario
    const [hardwareCosts, setHardwareCosts] = useState({
        hinges: 2500,      // Bisagra (por unidad)
        slides: 8000,      // Corredera telescópica (par)
        handles: 3000,     // Tirador (por unidad)
        screws: 500,       // Kit tornillos por módulo
        hangRod: 5000,     // Barra colgador
        slidingRail: 25000 // Riel corredera puerta
    });

    const [laborCostPerHour, setLaborCostPerHour] = useState(15000);
    const [estimatedHours, setEstimatedHours] = useState(8);
    const [profitMargin, setProfitMargin] = useState(35);

    // Calcular costos
    const costBreakdown = useMemo(() => {
        if (!results?.cutList || !results?.totals) return null;

        const totals = results.totals;
        const cutList = results.cutList;

        // --- COSTO DE MATERIALES ---
        const materialCost = totals.materialCost || totals.cost || 0;

        // Costo por plancha
        const boardArea = STANDARD_BOARD.area;
        const pricePerBoard = boardArea * (parseFloat(materials.melaminePrice) || 0);
        const boardsNeeded = totals.boardsNeeded || Math.ceil(totals.melamineArea / boardArea);

        // --- COSTO DE HERRAJES ---
        let hingeCount = 0;
        let slideCount = 0;
        let handleCount = 0;
        let barCount = 0;
        let slidingDoorCount = 0;
        let moduleCount = 1;

        cutList.forEach(item => {
            if (item.part.includes('Puerta Abatible')) {
                hingeCount += item.qty * 3; // 3 bisagras por puerta
                handleCount += item.qty;
            }
            if (item.part.includes('Puerta Corredera')) {
                slidingDoorCount += item.qty;
                handleCount += item.qty;
            }
            if (item.part.includes('Frente Cajón')) {
                slideCount += item.qty; // 1 par de correderas por cajón
                handleCount += item.qty;
            }
            if (item.part.includes('Barra')) {
                barCount += item.qty;
            }
        });

        const hardwareTotal =
            (hingeCount * hardwareCosts.hinges) +
            (slideCount * hardwareCosts.slides) +
            (handleCount * hardwareCosts.handles) +
            (moduleCount * hardwareCosts.screws) +
            (barCount * hardwareCosts.hangRod) +
            (slidingDoorCount > 0 ? hardwareCosts.slidingRail : 0);

        // --- COSTO DE MANO DE OBRA ---
        const laborCost = laborCostPerHour * estimatedHours;

        // --- TOTALES ---
        const totalFabricationCost = materialCost + hardwareTotal + laborCost;
        const suggestedPrice = Math.round(totalFabricationCost * (1 + profitMargin / 100));
        const profit = suggestedPrice - totalFabricationCost;
        const marginPercent = totalFabricationCost > 0
            ? parseFloat(((profit / suggestedPrice) * 100).toFixed(1))
            : 0;

        // Rentabilidad por metro lineal
        const linearMeters = (dimensions?.width || 1000) / 1000;
        const profitPerMl = linearMeters > 0
            ? Math.round(profit / linearMeters)
            : 0;

        return {
            materialCost,
            pricePerBoard,
            boardsNeeded,
            hardwareTotal,
            hardwareDetail: {
                hingeCount, slideCount, handleCount, barCount, slidingDoorCount
            },
            laborCost,
            totalFabricationCost,
            suggestedPrice,
            profit,
            marginPercent,
            profitPerMl,
            linearMeters: parseFloat(linearMeters.toFixed(2))
        };
    }, [results, dimensions, materials, hardwareCosts, laborCostPerHour, estimatedHours, profitMargin]);

    if (!costBreakdown) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
                <p>Configure el diseño para ver el análisis de costos.</p>
            </div>
        );
    }

    const fmt = (n) => `$${n.toLocaleString('es-CO')}`;

    return (
        <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#1f2937' }}>
                💰 Control de Costos y Rentabilidad
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* MATERIALES */}
                <div style={cardStyle}>
                    <h3 style={cardTitleStyle}>📦 Materiales</h3>
                    <Row label="Melamina" value={`${results.totals.melamineArea} m²`} />
                    <Row label="Cantoneado" value={`${results.totals.edgeBanding} ml`} />
                    <Row label="Fondo MDF" value={`${results.totals.backingArea} m²`} />
                    <Row label="Planchas necesarias" value={costBreakdown.boardsNeeded} />
                    <Row label="Precio por plancha" value={fmt(Math.round(costBreakdown.pricePerBoard))} />
                    <div style={totalRowStyle}>
                        <span>Costo Materiales</span>
                        <span style={{ fontWeight: 700 }}>{fmt(costBreakdown.materialCost)}</span>
                    </div>
                </div>

                {/* HERRAJES */}
                <div style={cardStyle}>
                    <h3 style={cardTitleStyle}>🔩 Herrajes</h3>
                    <EditRow label={`Bisagras (${costBreakdown.hardwareDetail.hingeCount})`}
                        value={hardwareCosts.hinges}
                        onChange={(v) => setHardwareCosts(p => ({ ...p, hinges: v }))} />
                    <EditRow label={`Correderas (${costBreakdown.hardwareDetail.slideCount} par)`}
                        value={hardwareCosts.slides}
                        onChange={(v) => setHardwareCosts(p => ({ ...p, slides: v }))} />
                    <EditRow label={`Tiradores (${costBreakdown.hardwareDetail.handleCount})`}
                        value={hardwareCosts.handles}
                        onChange={(v) => setHardwareCosts(p => ({ ...p, handles: v }))} />
                    <EditRow label="Tornillería (kit)"
                        value={hardwareCosts.screws}
                        onChange={(v) => setHardwareCosts(p => ({ ...p, screws: v }))} />
                    {costBreakdown.hardwareDetail.barCount > 0 && (
                        <EditRow label={`Barra (${costBreakdown.hardwareDetail.barCount})`}
                            value={hardwareCosts.hangRod}
                            onChange={(v) => setHardwareCosts(p => ({ ...p, hangRod: v }))} />
                    )}
                    {costBreakdown.hardwareDetail.slidingDoorCount > 0 && (
                        <EditRow label="Riel corredera"
                            value={hardwareCosts.slidingRail}
                            onChange={(v) => setHardwareCosts(p => ({ ...p, slidingRail: v }))} />
                    )}
                    <div style={totalRowStyle}>
                        <span>Costo Herrajes</span>
                        <span style={{ fontWeight: 700 }}>{fmt(costBreakdown.hardwareTotal)}</span>
                    </div>
                </div>

                {/* MANO DE OBRA */}
                <div style={cardStyle}>
                    <h3 style={cardTitleStyle}>👷 Mano de Obra</h3>
                    <EditRow label="$/hora" value={laborCostPerHour}
                        onChange={(v) => setLaborCostPerHour(v)} />
                    <EditRow label="Horas estimadas" value={estimatedHours}
                        onChange={(v) => setEstimatedHours(v)} />
                    <div style={totalRowStyle}>
                        <span>Costo Mano de Obra</span>
                        <span style={{ fontWeight: 700 }}>{fmt(costBreakdown.laborCost)}</span>
                    </div>
                </div>

                {/* RENTABILIDAD */}
                <div style={{ ...cardStyle, border: '2px solid #22c55e', background: '#f0fdf4' }}>
                    <h3 style={{ ...cardTitleStyle, color: '#16a34a' }}>📊 Rentabilidad</h3>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                            Margen de Ganancia: <strong>{profitMargin}%</strong>
                        </label>
                        <input type="range" min="10" max="80" value={profitMargin}
                            onChange={(e) => setProfitMargin(parseInt(e.target.value))}
                            style={{ width: '100%' }} />
                    </div>
                    <Row label="Ancho mueble" value={`${costBreakdown.linearMeters} ml`} />
                    <Row label="Ganancia por ml" value={fmt(costBreakdown.profitPerMl)} />
                    <Row label="Margen real" value={`${costBreakdown.marginPercent}%`}
                        color={costBreakdown.marginPercent >= 25 ? '#16a34a' : '#dc2626'} />
                </div>
            </div>

            {/* RESUMEN FINAL */}
            <div style={{
                marginTop: 20, padding: 20, borderRadius: 12,
                background: 'linear-gradient(135deg, #1e293b, #334155)',
                color: '#fff', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20
            }}>
                <SummaryBox label="COSTO FABRICACIÓN" value={fmt(costBreakdown.totalFabricationCost)} color="#f59e0b" />
                <SummaryBox label="PRECIO SUGERIDO" value={fmt(costBreakdown.suggestedPrice)} color="#22c55e" />
                <SummaryBox label="GANANCIA NETA" value={fmt(costBreakdown.profit)} color="#60a5fa" />
            </div>
        </div>
    );
};

// Sub-componentes
const Row = ({ label, value, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
        <span style={{ color: '#6b7280' }}>{label}</span>
        <span style={{ fontWeight: 600, color: color || '#1f2937' }}>{value}</span>
    </div>
);

const EditRow = ({ label, value, onChange }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12 }}>
        <span style={{ color: '#6b7280' }}>{label}</span>
        <input type="number" value={value}
            onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
            style={{
                width: 90, padding: '3px 6px', borderRadius: 4,
                border: '1px solid #d1d5db', fontSize: 12, textAlign: 'right'
            }} />
    </div>
);

const SummaryBox = ({ label, value, color }) => (
    <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 10, letterSpacing: 1, opacity: 0.7, marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
);

const cardStyle = {
    background: '#fff', borderRadius: 12, padding: 16,
    border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
};

const cardTitleStyle = {
    fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#1f2937'
};

const totalRowStyle = {
    display: 'flex', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 10, borderTop: '1px solid #e5e7eb',
    fontSize: 13, color: '#1f2937'
};
