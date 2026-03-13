import React from 'react';
import { LIMITS, STANDARD_THICKNESSES, validateDimensions, clampDimension } from '../utils/validation.js';

/**
 * PropertiesPanel — Panel de Propiedades Globales
 * Controla dimensiones, materiales, espesores y precios.
 */
export const PropertiesPanel = ({ dimensions, setDimensions, materials, setMaterials }) => {
    const thick = parseInt(materials.thickness) || 18;

    // Validaciones en tiempo real
    const warnings = validateDimensions(dimensions, thick);

    const handleDimension = (key, value) => {
        const limits = LIMITS[key];
        if (!limits) return;
        const val = clampDimension(value, limits.min, limits.max);
        setDimensions({ [key]: val });
    };

    const handlePrice = (key, value) => {
        const raw = parseInt(value, 10);
        const val = isNaN(raw) ? 0 : Math.max(0, raw);
        setMaterials({ [key]: val });
    };

    const handleThickness = (val) => {
        const thickness = Math.max(LIMITS.thickness.min, Math.min(LIMITS.thickness.max, parseInt(val, 10) || 18));
        setMaterials({ thickness });
    };

    const handleDoorType = (doorType) => {
        setMaterials({ doorType });
    };

    const handleBacking = (isMelamina) => {
        setMaterials({ isMelamineBacking: isMelamina });
    };

    const thicknessBtn = (val) => ({
        flex: 1, padding: '7px 0', borderRadius: 6, cursor: 'pointer',
        border: thick === val ? '2px solid #2563EB' : '1px solid #D1D5DB',
        background: thick === val ? '#EFF6FF' : '#FFF',
        color: thick === val ? '#1e40af' : '#4B5563',
        fontWeight: thick === val ? 700 : 500,
        fontSize: 12,
        transition: 'all 0.15s'
    });

    const toggleBtn = (active) => ({
        flex: 1, padding: '7px 0', borderRadius: 6, cursor: 'pointer',
        border: active ? '2px solid #2563EB' : '1px solid #D1D5DB',
        background: active ? '#EFF6FF' : '#FFF',
        color: active ? '#1e40af' : '#4B5563',
        fontWeight: active ? 700 : 500,
        fontSize: 11,
        transition: 'all 0.15s'
    });

    const doorType = materials.doorType || 'swing';

    return (
        <aside className="cad-left-panel">
            <div className="panel-section-title">PROPIEDADES GLOBALES</div>

            <div className="panel-content">
                {/* DIMENSIONES */}
                <div className="panel-card">
                    <div className="section-label">📐 Dimensiones Totales</div>
                    <DimInput label="Alto" unit="mm" value={dimensions.height}
                        onChange={(v) => handleDimension('height', v)}
                        min={LIMITS.height.min} max={LIMITS.height.max} />
                    <DimInput label="Ancho" unit="mm" value={dimensions.width}
                        onChange={(v) => handleDimension('width', v)}
                        min={LIMITS.width.min} max={LIMITS.width.max} />
                    <DimInput label="Profundidad" unit="mm" value={dimensions.depth}
                        onChange={(v) => handleDimension('depth', v)}
                        min={LIMITS.depth.min} max={LIMITS.depth.max} />
                </div>

                {/* TABLERO PRINCIPAL */}
                <div className="panel-card">
                    <div className="section-label">🪵 Tablero Principal</div>

                    <div className="input-row">
                        <label className="input-label">Espesor Estructural</label>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            {STANDARD_THICKNESSES.map(t => (
                                <button key={t} onClick={() => handleThickness(t)} style={thicknessBtn(t)}>
                                    {t}mm
                                </button>
                            ))}
                            <input type="number" min={LIMITS.thickness.min} max={LIMITS.thickness.max}
                                value={thick}
                                onChange={(e) => handleThickness(e.target.value)}
                                title="Espesor personalizado"
                                style={{
                                    width: 56, padding: '6px 4px', borderRadius: 6,
                                    border: '1px solid #D1D5DB', textAlign: 'center',
                                    fontWeight: 700, fontSize: 12
                                }} />
                        </div>
                    </div>

                    {/* FONDO */}
                    <div className="input-row" style={{ marginTop: 14 }}>
                        <label className="input-label">Fondo (Trasera)</label>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            <button onClick={() => handleBacking(false)} style={toggleBtn(!materials.isMelamineBacking)}>
                                MDF 3mm
                            </button>
                            <button onClick={() => handleBacking(true)} style={toggleBtn(materials.isMelamineBacking)}>
                                Melamina {thick}mm
                            </button>
                        </div>
                    </div>

                    {/* TIPO DE PUERTA */}
                    <div className="input-row" style={{ marginTop: 14 }}>
                        <label className="input-label">Tipo de Puerta</label>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            <button onClick={() => handleDoorType('swing')} style={toggleBtn(doorType === 'swing')}>
                                🚪 Abatible
                            </button>
                            <button onClick={() => handleDoorType('sliding')} style={toggleBtn(doorType === 'sliding')}>
                                ↔️ Corredera
                            </button>
                        </div>
                    </div>
                </div>

                {/* PRECIOS UNITARIOS */}
                <div className="panel-card">
                    <div className="section-label">💰 Precios Unitarios</div>
                    <DimInput label="Melamina" unit="$/m²" value={materials.melaminePrice}
                        onChange={(v) => handlePrice('melaminePrice', v)} min={0} max={999999} />
                    <DimInput label="Cantoneado" unit="$/ml" value={materials.edgeBandingPrice}
                        onChange={(v) => handlePrice('edgeBandingPrice', v)} min={0} max={999999} />
                    <DimInput label="Fondo 3mm" unit="$/m²" value={materials.backingPrice}
                        onChange={(v) => handlePrice('backingPrice', v)} min={0} max={999999} />
                </div>

                {/* ADVERTENCIAS */}
                {warnings.length > 0 && (
                    <div style={{
                        padding: 12, borderRadius: 8,
                        background: '#FEF3C7', border: '1px solid #F59E0B',
                        fontSize: 11, lineHeight: 1.6
                    }}>
                        <strong>⚠️ Advertencias Estructurales:</strong>
                        {warnings.map((w, i) => (
                            <div key={i} style={{ marginTop: 4 }}>{w}</div>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
};

// --- Sub-componente Input ---
const DimInput = ({ label, unit, value, onChange, min, max }) => (
    <div className="input-row">
        <label className="input-label">{label} ({unit})</label>
        <input
            className="cad-input"
            type="number"
            value={value}
            min={min}
            max={max}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);
