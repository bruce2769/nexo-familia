import React from 'react';

/**
 * NestingVisualizer — Visualizador de Optimización de Corte
 * Muestra planchas con piezas empaquetadas y estadísticas globales.
 */
export const NestingVisualizer = ({ boards, stats, boardDimensions, onChangeSettings }) => {
    const { width: BOARD_W, height: BOARD_H } = boardDimensions;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 20 }}>
            {/* ESTADÍSTICAS GLOBALES */}
            {stats && (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12,
                    padding: 16, background: '#fff', borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                    <StatBox label="Planchas" value={stats.totalBoards} color="#2563EB" />
                    <StatBox label="Piezas" value={`${stats.placedParts}/${stats.totalParts}`} color="#8b5cf6" />
                    <StatBox label="Rendimiento" value={`${stats.globalEfficiency}%`}
                        color={stats.globalEfficiency >= 75 ? '#22c55e' : '#f59e0b'} />
                    <StatBox label="Desperdicio" value={`${stats.totalWasteM2} m²`} color="#ef4444" />
                    <StatBox label="Tablero" value={`${boardDimensions.width}×${boardDimensions.height}`} color="#64748b" />
                </div>
            )}

            {/* TABLEROS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 30, alignItems: 'center' }}>
                {boards.map((board) => (
                    <div key={board.id} style={{
                        background: 'white', padding: 16, borderRadius: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: 700
                    }}>
                        {/* Header del Tablero */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', marginBottom: 10,
                            fontSize: 13, fontWeight: 600
                        }}>
                            <span>Tablero #{board.id}</span>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <span style={{ color: '#6b7280' }}>{board.parts.length} piezas</span>
                                <span style={{
                                    color: board.efficiency >= 80 ? '#22c55e' : board.efficiency >= 60 ? '#f59e0b' : '#ef4444',
                                    fontWeight: 700
                                }}>
                                    {board.efficiency}% uso
                                </span>
                            </div>
                        </div>

                        {/* SVG del Tablero */}
                        <svg
                            width="100%"
                            viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
                            style={{
                                background: '#f5f5f0', border: '2px solid #d1d5db',
                                borderRadius: 8
                            }}
                        >
                            {/* Fondo */}
                            <rect x={0} y={0} width={BOARD_W} height={BOARD_H} fill="#f5f5f0" />

                            {/* Piezas */}
                            {board.parts.map((part, idx) => {
                                const colors = [
                                    '#dbeafe', '#e0e7ff', '#fef3c7', '#d1fae5',
                                    '#fce7f3', '#e0f2fe', '#fef9c3', '#ede9fe'
                                ];
                                const fillColor = part.rotated ? '#bfdbfe' : colors[idx % colors.length];

                                // Calcular tamaño de fuente adaptativo
                                const minDim = Math.min(part.w, part.h);
                                const fontSize = Math.min(minDim / 4, 28);
                                const showLabel = minDim > 60;

                                return (
                                    <g key={idx}>
                                        <rect
                                            x={part.fit.x} y={part.fit.y}
                                            width={part.w} height={part.h}
                                            fill={fillColor}
                                            stroke="#2563EB" strokeWidth={1.5}
                                            rx={2}
                                        />
                                        {showLabel && (
                                            <>
                                                <text
                                                    x={part.fit.x + part.w / 2}
                                                    y={part.fit.y + part.h / 2 - fontSize * 0.4}
                                                    textAnchor="middle" dominantBaseline="middle"
                                                    fontSize={fontSize * 0.7}
                                                    fill="#1e3a8a" fontWeight="bold"
                                                    style={{ pointerEvents: 'none' }}
                                                >
                                                    {part.part.length > 12 ? part.part.substring(0, 10) + '..' : part.part}
                                                </text>
                                                <text
                                                    x={part.fit.x + part.w / 2}
                                                    y={part.fit.y + part.h / 2 + fontSize * 0.5}
                                                    textAnchor="middle"
                                                    fontSize={fontSize * 0.55}
                                                    fill="#4b5563"
                                                    style={{ pointerEvents: 'none' }}
                                                >
                                                    {Math.round(part.w)}×{Math.round(part.h)}
                                                    {part.rotated ? ' ↻' : ''}
                                                </text>
                                            </>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>

                        {/* Leyenda */}
                        <div style={{ marginTop: 8, fontSize: 10, color: '#9ca3af', display: 'flex', gap: 16 }}>
                            <span>■ Normal</span>
                            <span style={{ color: '#3b82f6' }}>■ Rotado ↻</span>
                            <span>Desperdicio: {(board.wasteArea / 1_000_000).toFixed(2)} m²</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Sub-componente de estadística
const StatBox = ({ label, value, color }) => (
    <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
            {label}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
);
