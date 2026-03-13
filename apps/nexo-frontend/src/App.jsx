/**
 * MueblePro Enterprise v5.0 — Main Application Shell
 * Full ERP: Design → Cut List → Optimize → Cost → Quote → Work Order → Inventory → Dashboard
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { StoreProvider, useStore, ACTIONS } from './core/store.js';
import { CABINET_TYPE_LABELS, formatCurrency, formatNumber, STANDARD_BOARD, DEFAULT_COST_RATES, safePositive } from './core/constants.js';

const genId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
import { generateCutList, validateDesign } from './design/designEngine.js';
import { runOptimization } from './optimization/optimizer.js';
import { calculateCosts } from './costing/costEngine.js';
import { Sidebar } from './ui/Sidebar.jsx';
import { ProjectSelector } from './ui/ProjectSelector.jsx';
import { Dashboard } from './ui/Dashboard.jsx';
import { QuotationPanel } from './ui/QuotationPanel.jsx';
import { WorkOrderPanel } from './ui/WorkOrderPanel.jsx';
import { InventoryPanel } from './ui/InventoryPanel.jsx';
import { exportCutListPDF, exportCSV, exportOptimizationPDF, saveProjectFile, loadProjectFile } from './export/exportManager.js';
import { ClosetVisualizer } from './components/ClosetVisualizer.jsx';
import { InspectorPanel } from './components/InspectorPanel.jsx';
import './styles/main.css';

// ═══════════════════════════════════════════════════════════════
// ERROR BOUNDARY
// ═══════════════════════════════════════════════════════════════
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { error: null }; }
    static getDerivedStateFromError(error) { return { error }; }
    render() {
        if (this.state.error) {
            return (
                <div className="error-boundary">
                    <h2>⚠️ Error en la aplicación</h2>
                    <p>{this.state.error.message}</p>
                    <button onClick={() => this.setState({ error: null })}>Reintentar</button>
                </div>
            );
        }
        return this.props.children;
    }
}

// ═══════════════════════════════════════════════════════════════
// MAIN ERP CONTENT (inside store)
// ═══════════════════════════════════════════════════════════════
function ERPContent() {
    const { state, dispatch } = useStore();
    const [activeTab, setActiveTab] = useState('design');
    const [showProjectSelector, setShowProjectSelector] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [selectedSection, setSelectedSection] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);

    const project = state.projects.find(p => p.id === state.activeProjectId) || state.projects[0];
    if (!project) return <div className="erp-loading">Cargando proyecto...</div>;

    const dimensions = project.dimensions;
    const materials = project.materials;
    const layout = project.layout || {};
    const totalDoors = project.totalDoors ?? 2;

    // ── Helpers to dispatch project updates ─────────────────
    // Convert layout between internal model and visualizer model (dividers)
    const vizLayout = useMemo(() => {
        if (!layout) return { dividers: [], sections: [] };
        return {
            dividers: (layout.divisions || layout.dividers || []).map(d => typeof d === 'object' ? d.x : d),
            sections: layout.sections || [],
        };
    }, [layout]);

    const setDimensions = useCallback((newDim) => {
        dispatch({ type: ACTIONS.SET_DIMENSIONS, payload: newDim });
    }, [dispatch]);

    const setMaterials = useCallback((newMat) => {
        dispatch({ type: ACTIONS.SET_MATERIALS, payload: newMat });
    }, [dispatch]);

    const setLayout = useCallback((newLayout) => {
        dispatch({ type: ACTIONS.SET_LAYOUT, payload: newLayout });
    }, [dispatch]);

    const setTotalDoors = useCallback((val) => {
        dispatch({ type: ACTIONS.SET_DOORS, payload: val });
    }, [dispatch]);

    // ── Computed: Cut list ──────────────────────────────────
    const cutListResults = useMemo(() => {
        try {
            return generateCutList(dimensions, materials, layout, totalDoors, project.cabinetType || 'closet');
        } catch (e) {
            console.error('Cut list error:', e);
            return { cutList: [], totals: {}, warnings: [e.message] };
        }
    }, [dimensions, materials, layout, totalDoors, project.cabinetType]);

    // ── Computed: Optimization ──────────────────────────────
    const [optimizationSettings, setOptimizationSettings] = useState({
        boardWidth: STANDARD_BOARD.width,
        boardHeight: STANDARD_BOARD.height,
        kerf: 3,
        allowRotation: true,
    });

    const optimizedData = useMemo(() => {
        if (cutListResults.cutList.length === 0) return null;
        return runOptimization(
            cutListResults.cutList,
            optimizationSettings.boardWidth,
            optimizationSettings.boardHeight,
            optimizationSettings.kerf,
            optimizationSettings.allowRotation,
        );
    }, [cutListResults.cutList, optimizationSettings]);

    // ── Computed: Costs ─────────────────────────────────────
    const costData = useMemo(() => {
        return calculateCosts(cutListResults, project.costRates || DEFAULT_COST_RATES, dimensions);
    }, [cutListResults, project.costRates, dimensions]);

    // ── Design actions (for layout manipulation) ────────────
    const designActions = useMemo(() => ({
        addShelf: (sectionIndex) => {
            if (sectionIndex === null || sectionIndex === undefined) sectionIndex = 0;
            const newLayout = JSON.parse(JSON.stringify(layout || {}));
            if (!newLayout.sections) newLayout.sections = {};
            if (!newLayout.sections[sectionIndex]) newLayout.sections[sectionIndex] = { shelves: [], drawers: [], bars: [] };
            const sec = newLayout.sections[sectionIndex];
            if (!sec.shelves) sec.shelves = [];
            const thick = parseInt(materials.thickness) || 18;
            const sectionHeight = dimensions.height - thick * 2 - 70;
            const existingShelves = sec.shelves || [];
            let newY = sectionHeight / 2;
            if (existingShelves.length > 0) {
                const maxY = existingShelves.reduce((max, s) => Math.max(max, s.y || 0), 0);
                newY = maxY + 300;
                if (newY > sectionHeight - thick) newY = sectionHeight - thick;
            }
            sec.shelves.push({ id: genId(), y: newY });
            setLayout(newLayout);
            toast.success('Repisa añadida');
        },
        removeShelf: (sectionIndex, shelfIndex) => {
            if (sectionIndex === null || sectionIndex === undefined) return;
            const newLayout = JSON.parse(JSON.stringify(layout || {}));
            if (!newLayout.sections?.[sectionIndex]?.shelves) return;
            newLayout.sections[sectionIndex].shelves.splice(shelfIndex, 1);
            setLayout(newLayout);
        },
        addDrawer: (sectionIndex) => {
            if (sectionIndex === null || sectionIndex === undefined) sectionIndex = 0;
            const newLayout = JSON.parse(JSON.stringify(layout || {}));
            if (!newLayout.sections) newLayout.sections = {};
            if (!newLayout.sections[sectionIndex]) newLayout.sections[sectionIndex] = { shelves: [], drawers: [], bars: [] };
            const sec = newLayout.sections[sectionIndex];
            if (!sec.drawers) sec.drawers = [];
            const existingDrawers = sec.drawers || [];
            let newY = 0;
            if (existingDrawers.length > 0) {
                const topDrawer = existingDrawers.reduce((prev, curr) => (prev.y > curr.y ? prev : curr), existingDrawers[0]);
                newY = (topDrawer.y || 0) + (topDrawer.height || 200) + 3;
            }
            sec.drawers.push({ id: genId(), y: newY, height: 200 });
            setLayout(newLayout);
            toast.success('Cajón añadido');
        },
        removeDrawer: (sectionIndex, drawerIndex) => {
            const newLayout = JSON.parse(JSON.stringify(layout || {}));
            if (!newLayout.sections?.[sectionIndex]?.drawers) return;
            newLayout.sections[sectionIndex].drawers.splice(drawerIndex, 1);
            setLayout(newLayout);
        },
        addBar: (sectionIndex) => {
            if (sectionIndex === null || sectionIndex === undefined) sectionIndex = 0;
            const newLayout = JSON.parse(JSON.stringify(layout || {}));
            if (!newLayout.sections) newLayout.sections = {};
            if (!newLayout.sections[sectionIndex]) newLayout.sections[sectionIndex] = { shelves: [], drawers: [], bars: [] };
            const sec = newLayout.sections[sectionIndex];
            if (!sec.bars) sec.bars = [];
            const thick = parseInt(materials.thickness) || 18;
            const sectionHeight = dimensions.height - thick * 2 - 70;
            sec.bars.push({ id: genId(), y: sectionHeight * 0.85 });
            setLayout(newLayout);
            toast.success('Barra añadida');
        },
        removeBar: (sectionIndex, barIndex) => {
            const newLayout = JSON.parse(JSON.stringify(layout || {}));
            if (!newLayout.sections?.[sectionIndex]?.bars) return;
            newLayout.sections[sectionIndex].bars.splice(barIndex, 1);
            setLayout(newLayout);
        },
        addDivision: () => {
            const newLayout = JSON.parse(JSON.stringify(layout || {}));
            if (!newLayout.dividers) newLayout.dividers = [];
            const thick = parseInt(materials.thickness) || 18;
            const usableWidth = dimensions.width - thick * 2;
            const newX = usableWidth / 2;
            newLayout.dividers.push(newX);
            // Rebuild sections
            rebuildSections(newLayout, dimensions, materials);
            setLayout(newLayout);
            toast.success('División añadida');
        },
        removeDivision: (divIndex) => {
            const newLayout = JSON.parse(JSON.stringify(layout || {}));
            if (!newLayout.dividers) return;
            newLayout.dividers.splice(divIndex, 1);
            rebuildSections(newLayout, dimensions, materials);
            setLayout(newLayout);
        },
        moveItem: (sectionIndex, itemType, itemIndex, newPosition) => {
            const newLayout = JSON.parse(JSON.stringify(layout || {}));
            const sec = newLayout.sections?.[sectionIndex];
            if (!sec) return;
            if (itemType === 'shelf' && sec.shelves?.[itemIndex]) {
                sec.shelves[itemIndex].y = newPosition;
            } else if (itemType === 'bar' && sec.bars?.[itemIndex]) {
                sec.bars[itemIndex].y = newPosition;
            }
            setLayout(newLayout);
        },
    }), [layout, dimensions, materials, setLayout]);

    // ── Initialize layout if empty ──────────────────────────
    useEffect(() => {
        if (!layout.sections || layout.sections.length === 0) {
            const initialLayout = {
                divisions: [],
                sections: [{ shelves: [], drawers: [], bars: [{ y: (dimensions.height - 36) * 0.15 }] }],
            };
            setLayout(initialLayout);
        }
    }, []);

    // ── Export handlers ─────────────────────────────────────
    const handleExportPDF = () => {
        try {
            exportCutListPDF(cutListResults, dimensions, materials, project.name);
            toast.success('PDF de despiece exportado');
        } catch (e) { toast.error(e.message); }
    };

    const handleExportCSV = () => {
        try {
            exportCSV(cutListResults, dimensions, materials, project.name);
            toast.success('CSV exportado');
        } catch (e) { toast.error(e.message); }
    };

    const handleExportOptPDF = () => {
        try {
            exportOptimizationPDF(optimizedData, optimizationSettings, project.name);
            toast.success('Reporte de optimización exportado');
        } catch (e) { toast.error(e.message); }
    };

    const handleSaveProject = () => {
        try {
            saveProjectFile({ ...project, cutListResults, costData });
            toast.success('Proyecto guardado');
        } catch (e) { toast.error(e.message); }
    };

    const handleLoadProject = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const data = await loadProjectFile(file);
            dispatch({ type: ACTIONS.LOAD_PROJECT_FILE, payload: data });
            toast.success('Proyecto cargado');
        } catch (e) { toast.error(e.message); }
    };

    // ── Save quotation / work order ─────────────────────────
    const handleSaveQuotation = (quotation) => {
        dispatch({ type: ACTIONS.SET_QUOTATION, payload: quotation });
    };

    const handleSaveWorkOrder = (workOrder) => {
        dispatch({ type: ACTIONS.SET_WORK_ORDER, payload: workOrder });
    };

    const handleUpdateWOStatus = (status) => {
        dispatch({ type: ACTIONS.UPDATE_WO_STATUS, payload: status });
        toast.success(`Estado actualizado: ${status}`);
    };

    // ═══════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════
    return (
        <div className="erp-layout">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="erp-main">
                {/* Top Bar */}
                <header className="erp-topbar">
                    <div className="topbar-left">
                        <button className="topbar-btn project-btn" onClick={() => setShowProjectSelector(true)}>
                            📁 {project.name}
                        </button>
                        <span className="topbar-dims">
                            {dimensions.height}×{dimensions.width}×{dimensions.depth}mm
                        </span>
                    </div>
                    <div className="topbar-right">
                        <label className="topbar-btn" style={{ cursor: 'pointer' }}>
                            📂 Abrir
                            <input type="file" accept=".mueble,.json" onChange={handleLoadProject} style={{ display: 'none' }} />
                        </label>
                        <button className="topbar-btn" onClick={handleSaveProject}>💾 Guardar</button>
                        <button className="topbar-btn" onClick={handleExportPDF}>📄 PDF</button>
                        <button className="topbar-btn" onClick={handleExportCSV}>📊 CSV</button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="erp-content">
                    {/* ─── DESIGN TAB ─── */}
                    {activeTab === 'design' && (
                        <div className="design-workspace">
                            {/* Left Properties Panel */}
                            <div className="design-props-panel">
                                <h3>📐 Propiedades</h3>

                                <div className="prop-group">
                                    <label className="prop-label">Tipo de Mueble</label>
                                    <select className="form-select" value={project.cabinetType || 'closet'}
                                        onChange={e => dispatch({ type: ACTIONS.SET_CABINET_TYPE, payload: e.target.value })}>
                                        {Object.entries(CABINET_TYPE_LABELS).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="prop-group">
                                    <label className="prop-label">Alto (mm)</label>
                                    <input type="number" className="form-input" value={dimensions.height}
                                        onChange={e => setDimensions({ height: parseInt(e.target.value) || 0 })} min={300} max={3000} />
                                </div>
                                <div className="prop-group">
                                    <label className="prop-label">Ancho (mm)</label>
                                    <input type="number" className="form-input" value={dimensions.width}
                                        onChange={e => setDimensions({ width: parseInt(e.target.value) || 0 })} min={300} max={6000} />
                                </div>
                                <div className="prop-group">
                                    <label className="prop-label">Profundidad (mm)</label>
                                    <input type="number" className="form-input" value={dimensions.depth}
                                        onChange={e => setDimensions({ depth: parseInt(e.target.value) || 0 })} min={200} max={800} />
                                </div>

                                <div className="prop-group">
                                    <label className="prop-label">Espesor</label>
                                    <select className="form-select" value={materials.thickness}
                                        onChange={e => setMaterials({ thickness: parseInt(e.target.value) })}>
                                        <option value={15}>15mm</option>
                                        <option value={18}>18mm</option>
                                        <option value={21}>21mm</option>
                                    </select>
                                </div>

                                <div className="prop-group">
                                    <label className="prop-label">Fondo Melamina</label>
                                    <label className="toggle-label">
                                        <input type="checkbox" checked={materials.isMelamineBacking}
                                            onChange={e => setMaterials({ isMelamineBacking: e.target.checked })} />
                                        <span>{materials.isMelamineBacking ? 'Sí (melamina)' : 'No (MDF 3mm)'}</span>
                                    </label>
                                </div>

                                <div className="prop-group">
                                    <label className="prop-label">🚪 Puertas</label>
                                    <div className="prop-row" style={{ alignItems: 'center', gap: 8 }}>
                                        <select className="form-select" value={materials.doorType}
                                            onChange={e => setMaterials({ doorType: e.target.value })}>
                                            <option value="hinged">Abatible</option>
                                            <option value="sliding">Corredera</option>
                                        </select>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f0f0f0', borderRadius: 6, padding: '2px 4px' }}>
                                            <button
                                                onClick={() => setTotalDoors(Math.max(0, totalDoors - 1))}
                                                style={{ width: 26, height: 26, border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >−</button>
                                            <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700, fontSize: 14 }}>{totalDoors}</span>
                                            <button
                                                onClick={() => setTotalDoors(Math.min(10, totalDoors + 1))}
                                                style={{ width: 26, height: 26, border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >+</button>
                                        </div>
                                    </div>
                                    {totalDoors > 0 && (
                                        <div style={{ marginTop: 6 }}>
                                            <div className="prop-row" style={{ gap: 6 }}>
                                                <div style={{ flex: 1 }}>
                                                    <label className="prop-label" style={{ fontSize: 11 }}>Alto puerta (mm)</label>
                                                    <input type="number" className="form-input"
                                                        value={materials.doorHeight || dimensions.height - 70}
                                                        onChange={e => setMaterials({ doorHeight: parseInt(e.target.value) || 0 })}
                                                        min={50}
                                                        step={10}
                                                        placeholder="Auto" />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label className="prop-label" style={{ fontSize: 11 }}>Ancho puerta (mm)</label>
                                                    <input type="number" className="form-input"
                                                        value={materials.doorWidth || Math.round(dimensions.width / Math.max(1, totalDoors))}
                                                        onChange={e => setMaterials({ doorWidth: parseInt(e.target.value) || 0 })}
                                                        min={50}
                                                        step={10}
                                                        placeholder="Auto" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <hr />
                                <h4 style={{ margin: '8px 0 4px' }}>Herramientas</h4>
                                <div className="tools-grid">
                                    <button className="tool-btn" onClick={designActions.addDivision}>➕ División</button>
                                    <button className="tool-btn" onClick={() => designActions.addShelf(selectedSection ?? 0)}>📏 Repisa</button>
                                    <button className="tool-btn" onClick={() => designActions.addDrawer(selectedSection ?? 0)}>🗄️ Cajón</button>
                                    <button className="tool-btn" onClick={() => designActions.addBar(selectedSection ?? 0)}>🔩 Barra</button>
                                </div>

                                {/* Validation warnings */}
                                {cutListResults.warnings?.length > 0 && (
                                    <div className="validation-warnings">
                                        {cutListResults.warnings.map((w, i) => (
                                            <div key={i} className="warning-item">⚠️ {w}</div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Center: Visualizer */}
                            <div className="design-canvas-area">
                                <div className="canvas-controls">
                                    <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}>−</button>
                                    <span>{Math.round(zoom * 100)}%</span>
                                    <button onClick={() => setZoom(z => Math.min(3, z + 0.1))}>+</button>
                                    <button onClick={() => setZoom(1)}>Reset</button>
                                </div>
                                <div className="canvas-viewport" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                                    <ClosetVisualizer
                                        dimensions={dimensions}
                                        materials={materials}
                                        layout={vizLayout}
                                        totalDoors={totalDoors}
                                        onUpdateItem={(sectionIndex, itemId, type, update) => {
                                            const newLayout = JSON.parse(JSON.stringify(layout || {}));
                                            const sec = newLayout.sections?.[sectionIndex];
                                            if (!sec) return;
                                            const listKey = type === 'shelf' ? 'shelves' : type === 'drawer' ? 'drawers' : 'bars';
                                            const item = sec[listKey]?.find(i => i.id === itemId);
                                            if (item) Object.assign(item, update);
                                            setLayout(newLayout);
                                        }}
                                        onUpdateDivider={(index, newVal) => {
                                            const newLayout = JSON.parse(JSON.stringify(layout || {}));
                                            if (!newLayout.dividers) return;
                                            newLayout.dividers[index] = newVal;
                                            setLayout(newLayout);
                                        }}
                                        onSelectSection={setSelectedSection}
                                        selectedSection={selectedSection}
                                        onSelectItem={(id, type, toggle) => {
                                            if (id === null) { setSelectedItem(null); return; }
                                            setSelectedItem(id);
                                        }}
                                        selectedItemIds={selectedItem ? [selectedItem] : []}
                                        onMoveItemsBatch={(fromSection, toSection, itemIds, type) => {
                                            const newLayout = JSON.parse(JSON.stringify(layout || {}));
                                            const listKey = type === 'shelf' ? 'shelves' : type === 'drawer' ? 'drawers' : 'bars';
                                            const fromSec = newLayout.sections?.[fromSection];
                                            const toSec = newLayout.sections?.[toSection];
                                            if (!fromSec || !toSec) return;
                                            if (!toSec[listKey]) toSec[listKey] = [];
                                            const movedItems = [];
                                            fromSec[listKey] = (fromSec[listKey] || []).filter(item => {
                                                if (itemIds.includes(item.id)) { movedItems.push(item); return false; }
                                                return true;
                                            });
                                            toSec[listKey].push(...movedItems);
                                            setLayout(newLayout);
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Right: Inspector */}
                            <div className="design-inspector">
                                <InspectorPanel
                                    selectedSection={selectedSection}
                                    layout={vizLayout}
                                    dimensions={dimensions}
                                    materials={materials}
                                    selectedItemId={selectedItem}
                                    totalDoors={totalDoors}
                                    setTotalDoors={setTotalDoors}
                                    selectedPartialDivider={null}
                                    actions={{
                                        addShelf: () => designActions.addShelf(selectedSection),
                                        removeShelf: () => {
                                            const sec = layout?.sections?.[selectedSection];
                                            if (sec?.shelves?.length) designActions.removeShelf(selectedSection, sec.shelves.length - 1);
                                        },
                                        addDrawer: () => designActions.addDrawer(selectedSection),
                                        removeDrawer: () => {
                                            const sec = layout?.sections?.[selectedSection];
                                            if (sec?.drawers?.length) designActions.removeDrawer(selectedSection, sec.drawers.length - 1);
                                        },
                                        addBar: () => designActions.addBar(selectedSection),
                                        removeBar: () => {
                                            const sec = layout?.sections?.[selectedSection];
                                            if (sec?.bars?.length) designActions.removeBar(selectedSection, sec.bars.length - 1);
                                        },
                                        addDivider: () => designActions.addDivision(),
                                        removeDivider: () => {
                                            const divs = layout?.dividers || [];
                                            if (divs.length) designActions.removeDivision(divs.length - 1);
                                        },
                                        addPartialDivider: () => { },
                                        removePartialDivider: () => { },
                                        updateItemProp: (id, type, value, prop) => {
                                            if (selectedSection === null) return;
                                            const newLayout = JSON.parse(JSON.stringify(layout || {}));
                                            const sec = newLayout.sections?.[selectedSection];
                                            if (!sec) return;
                                            const listKey = type === 'shelf' ? 'shelves' : type === 'drawer' ? 'drawers' : type === 'bar' ? 'bars' : 'partialDividers';
                                            const item = (sec[listKey] || []).find(i => i.id === id);
                                            if (item) item[prop] = parseFloat(value) || 0;
                                            setLayout(newLayout);
                                        },
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* ─── CUT LIST TAB ─── */}
                    {activeTab === 'cutlist' && (
                        <div className="panel-fullpage">
                            <h2 className="panel-page-title">📋 Lista de Cortes</h2>
                            <div className="cutlist-actions">
                                <button className="btn-primary" onClick={handleExportPDF}>📄 Exportar PDF</button>
                                <button className="btn-secondary" onClick={handleExportCSV}>📊 Exportar CSV</button>
                            </div>
                            {cutListResults.cutList.length > 0 ? (
                                <>
                                    <div className="cutlist-table-wrapper">
                                        <table className="cutlist-table">
                                            <thead>
                                                <tr>
                                                    <th>Pieza</th><th>Cant</th><th>Ancho</th><th>Alto</th>
                                                    <th>Material</th><th>Espesor</th><th>Cantos</th><th>Canto (ml)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cutListResults.cutList.map((item, i) => (
                                                    <tr key={i}>
                                                        <td className="part-name">{item.part}</td>
                                                        <td className="center">{item.qty}</td>
                                                        <td className="right">{Math.round(item.width)}mm</td>
                                                        <td className="right">{Math.round(item.height)}mm</td>
                                                        <td>{item.material || `Melamina ${materials.thickness}mm`}</td>
                                                        <td className="center">{item.thickness || materials.thickness}mm</td>
                                                        <td>{item.edgeBandingSides || '-'}</td>
                                                        <td className="right">{Math.round(item.edgeBanding || 0)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="cutlist-summary">
                                        <div className="summary-card">
                                            <span className="summary-label">Piezas</span>
                                            <span className="summary-value">{cutListResults.totals.totalPieces}</span>
                                        </div>
                                        <div className="summary-card">
                                            <span className="summary-label">Melamina</span>
                                            <span className="summary-value">{cutListResults.totals.melamineArea} m²</span>
                                        </div>
                                        <div className="summary-card">
                                            <span className="summary-label">Fondo</span>
                                            <span className="summary-value">{cutListResults.totals.backingArea} m²</span>
                                        </div>
                                        <div className="summary-card">
                                            <span className="summary-label">Cantoneado</span>
                                            <span className="summary-value">{cutListResults.totals.edgeBanding} ml</span>
                                        </div>
                                        <div className="summary-card">
                                            <span className="summary-label">Planchas</span>
                                            <span className="summary-value">{cutListResults.totals.boardsNeeded}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="empty-state">
                                    <span style={{ fontSize: 48 }}>📋</span>
                                    <p>Configure un mueble en la pestaña de Diseño para generar la lista de cortes</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── OPTIMIZATION TAB ─── */}
                    {activeTab === 'optimize' && (
                        <div className="panel-fullpage">
                            <h2 className="panel-page-title">🧩 Optimización de Corte</h2>
                            <div className="opt-settings">
                                <div className="prop-group">
                                    <label className="prop-label">Ancho Plancha</label>
                                    <input type="number" className="form-input" value={optimizationSettings.boardWidth}
                                        onChange={e => setOptimizationSettings(s => ({ ...s, boardWidth: parseInt(e.target.value) || 2440 }))} />
                                </div>
                                <div className="prop-group">
                                    <label className="prop-label">Alto Plancha</label>
                                    <input type="number" className="form-input" value={optimizationSettings.boardHeight}
                                        onChange={e => setOptimizationSettings(s => ({ ...s, boardHeight: parseInt(e.target.value) || 1830 }))} />
                                </div>
                                <div className="prop-group">
                                    <label className="prop-label">Sierra (kerf)</label>
                                    <input type="number" className="form-input" value={optimizationSettings.kerf}
                                        onChange={e => setOptimizationSettings(s => ({ ...s, kerf: parseInt(e.target.value) || 3 }))} min={1} max={10} />
                                </div>
                                <label className="toggle-label">
                                    <input type="checkbox" checked={optimizationSettings.allowRotation}
                                        onChange={e => setOptimizationSettings(s => ({ ...s, allowRotation: e.target.checked }))} />
                                    <span>Permitir Rotación</span>
                                </label>
                                <button className="btn-secondary" onClick={handleExportOptPDF} disabled={!optimizedData}>📄 Exportar PDF</button>
                            </div>

                            {optimizedData ? (
                                <>
                                    <div className="opt-stats">
                                        <div className="summary-card"><span className="summary-label">Tableros</span><span className="summary-value">{optimizedData.stats.totalBoards}</span></div>
                                        <div className="summary-card"><span className="summary-label">Eficiencia</span><span className="summary-value">{optimizedData.stats.globalEfficiency}%</span></div>
                                        <div className="summary-card"><span className="summary-label">Desperdicio</span><span className="summary-value">{optimizedData.stats.totalWasteM2} m²</span></div>
                                        <div className="summary-card"><span className="summary-label">Piezas</span><span className="summary-value">{optimizedData.stats.placedParts}/{optimizedData.stats.totalParts}</span></div>
                                    </div>

                                    <div className="opt-boards-grid">
                                        {optimizedData.boards.map(board => (
                                            <div key={board.id} className="opt-board-card">
                                                <div className="opt-board-header">
                                                    <span>Tablero {board.id}</span>
                                                    <span className={`opt-eff ${board.efficiency > 70 ? 'good' : board.efficiency > 50 ? 'ok' : 'poor'}`}>
                                                        {board.efficiency}%
                                                    </span>
                                                </div>
                                                <div className="opt-board-visual">
                                                    <svg
                                                        viewBox={`0 0 ${optimizationSettings.boardWidth} ${optimizationSettings.boardHeight}`}
                                                        className="opt-board-svg"
                                                    >
                                                        <rect x={0} y={0}
                                                            width={optimizationSettings.boardWidth}
                                                            height={optimizationSettings.boardHeight}
                                                            fill="#f1f5f9" stroke="#94a3b8" strokeWidth={4} />
                                                        {board.parts.map((p, i) => (
                                                            <g key={i}>
                                                                <rect
                                                                    x={p.fit.x} y={p.fit.y}
                                                                    width={p.w} height={p.h}
                                                                    fill={`hsl(${(i * 47) % 360}, 60%, 75%)`}
                                                                    stroke="#334155" strokeWidth={2}
                                                                />
                                                                {p.w > 100 && p.h > 40 && (
                                                                    <text x={p.fit.x + p.w / 2} y={p.fit.y + p.h / 2}
                                                                        textAnchor="middle" dominantBaseline="middle"
                                                                        fontSize={Math.min(p.w / 8, 28)} fill="#1e293b">
                                                                        {p.w}×{p.h}
                                                                    </text>
                                                                )}
                                                            </g>
                                                        ))}
                                                    </svg>
                                                </div>
                                                <div className="opt-board-parts">
                                                    {board.parts.map((p, i) => (
                                                        <span key={i} className="opt-part-tag">{p.part} {p.rotated ? '↻' : ''}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {optimizedData.unplacedParts.length > 0 && (
                                        <div className="opt-unplaced">
                                            <h3>⚠️ Piezas Sin Colocar</h3>
                                            {optimizedData.unplacedParts.map((p, i) => (
                                                <div key={i} className="warning-item">{p.part}: {p.reason}</div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="empty-state">
                                    <span style={{ fontSize: 48 }}>🧩</span>
                                    <p>Configure un mueble en Diseño para ver la optimización de corte</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── COSTS TAB ─── */}
                    {activeTab === 'costs' && (
                        <div className="panel-fullpage">
                            <h2 className="panel-page-title">💰 Costos y Rentabilidad</h2>
                            <div className="cost-grid">
                                <div className="cost-card">
                                    <h3>Materiales</h3>
                                    <div className="cost-rows">
                                        <div className="cost-row"><span>Melamina ({costData.melamineArea} m²)</span><span>{formatCurrency(costData.boardCost)}</span></div>
                                        <div className="cost-row"><span>Fondo ({costData.backingArea} m²)</span><span>{formatCurrency(costData.backingCost)}</span></div>
                                        <div className="cost-row"><span>Cantoneado ({costData.edgeBanding} ml)</span><span>{formatCurrency(costData.edgeBandingCost)}</span></div>
                                        <div className="cost-row total"><span>Total Material</span><span>{formatCurrency(costData.totalMaterialCost)}</span></div>
                                    </div>
                                </div>
                                <div className="cost-card">
                                    <h3>Herrajes</h3>
                                    <div className="cost-rows">
                                        <div className="cost-row"><span>Kits de herrajes ({costData.hardwareUnits} und)</span><span>{formatCurrency(costData.hardwareCost)}</span></div>
                                    </div>
                                </div>
                                <div className="cost-card">
                                    <h3>Mano de Obra</h3>
                                    <div className="cost-rows">
                                        <div className="cost-row"><span>{costData.estimatedHours}h × {formatCurrency(costData.laborRate)}/h</span><span>{formatCurrency(costData.laborCost)}</span></div>
                                    </div>
                                </div>
                                <div className="cost-card">
                                    <h3>Gastos Generales ({costData.overheadPercent}%)</h3>
                                    <div className="cost-rows">
                                        <div className="cost-row"><span>Overhead</span><span>{formatCurrency(costData.overheadCost)}</span></div>
                                    </div>
                                </div>
                            </div>
                            <div className="cost-totals">
                                <div className="cost-total-card manufacturing">
                                    <span>Costo de Fabricación</span>
                                    <span className="total-value">{formatCurrency(costData.totalManufacturingCost)}</span>
                                </div>
                                <div className="cost-total-card selling">
                                    <span>Precio Venta Sugerido ({costData.profitMarginPercent}% margen)</span>
                                    <span className="total-value">{formatCurrency(costData.suggestedSellingPrice)}</span>
                                </div>
                                <div className="cost-total-card profit">
                                    <span>Ganancia</span>
                                    <span className="total-value">{formatCurrency(costData.profit)}</span>
                                </div>
                            </div>
                            {costData.widthMeters > 0 && (
                                <div className="cost-per-meter">
                                    <span>Ingreso por metro lineal: <strong>{formatCurrency(costData.revenuePerLinearMeter)}/ml</strong></span>
                                    <span>Ganancia por metro lineal: <strong>{formatCurrency(costData.profitPerLinearMeter)}/ml</strong></span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── QUOTATION TAB ─── */}
                    {activeTab === 'quote' && (
                        <QuotationPanel
                            project={project}
                            costData={costData}
                            cutListResults={cutListResults}
                            onSaveQuotation={handleSaveQuotation}
                        />
                    )}

                    {/* ─── WORK ORDER TAB ─── */}
                    {activeTab === 'workorder' && (
                        <WorkOrderPanel
                            project={project}
                            cutListResults={cutListResults}
                            costData={costData}
                            onSaveWorkOrder={handleSaveWorkOrder}
                            onUpdateStatus={handleUpdateWOStatus}
                        />
                    )}

                    {/* ─── INVENTORY TAB ─── */}
                    {activeTab === 'inventory' && <InventoryPanel />}

                    {/* ─── DASHBOARD TAB ─── */}
                    {activeTab === 'dashboard' && <Dashboard />}
                </div>
            </div>

            {/* Project Selector Modal */}
            {
                showProjectSelector && (
                    <ProjectSelector onClose={() => setShowProjectSelector(false)} />
                )
            }
        </div >
    );
}

// ── Helper: rebuild sections after division changes ──────
function rebuildSections(layout, dimensions, materials) {
    const thick = parseInt(materials.thickness) || 18;
    const usableWidth = dimensions.width - thick * 2;
    const dividers = layout.dividers || [];
    const sorted = [...dividers].sort((a, b) => a - b);

    const oldSections = layout.sections || [];
    const newSectionCount = sorted.length + 1;
    const newSections = [];

    for (let i = 0; i < newSectionCount; i++) {
        newSections.push(oldSections[i] || { shelves: [], drawers: [], bars: [] });
    }

    layout.sections = newSections;
}

// ═══════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════
export default function App() {
    return (
        <ErrorBoundary>
            <StoreProvider>
                <Toaster position="top-right" toastOptions={{
                    style: { background: '#1e293b', color: '#f8fafc', borderRadius: '10px', fontSize: '14px' },
                    success: { iconTheme: { primary: '#22c55e', secondary: '#f8fafc' } },
                    error: { iconTheme: { primary: '#ef4444', secondary: '#f8fafc' } },
                }} />
                <ERPContent />
            </StoreProvider>
        </ErrorBoundary>
    );
}
