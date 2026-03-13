import React from 'react';

export const InspectorPanel = ({ selectedSection, layout, actions, selectedPartialDivider, selectedItemId, totalDoors, setTotalDoors, dimensions, materials }) => {
    const section = layout.sections[selectedSection] || {};
    const repisas = section.shelves || [];
    const cajones = section.drawers || [];
    const barras = section.bars || [];
    const divisoresVerticales = section.partialDividers || [];

    // Calculate section dimensions
    const dividers = (layout.dividers || []).sort((a, b) => a - b);
    const thickness = parseInt(materials?.thickness, 10) || 18;
    const internalWidth = (dimensions?.width || 2100) - (2 * thickness);

    let anchoSeccion = 0;
    let altoSeccion = (dimensions?.height || 2350) - 70 - (2 * thickness);

    if (selectedSection !== null && selectedSection !== undefined) {
        const startX = selectedSection === 0 ? 0 : dividers[selectedSection - 1] || 0;
        const endX = selectedSection < dividers.length ? dividers[selectedSection] : internalWidth;
        anchoSeccion = Math.round(endX - startX);
    }

    // Find selected item
    let selectedItem = null;
    let selectedItemType = null;
    if (selectedItemId) {
        if (repisas.find(i => i.id === selectedItemId)) { selectedItem = repisas.find(i => i.id === selectedItemId); selectedItemType = 'shelf'; }
        else if (cajones.find(i => i.id === selectedItemId)) { selectedItem = cajones.find(i => i.id === selectedItemId); selectedItemType = 'drawer'; }
        else if (barras.find(i => i.id === selectedItemId)) { selectedItem = barras.find(i => i.id === selectedItemId); selectedItemType = 'bar'; }
        else if (divisoresVerticales.find(i => i.id === selectedItemId)) { selectedItem = divisoresVerticales.find(i => i.id === selectedItemId); selectedItemType = 'partialDivider'; }
    }

    return (
        <aside className="cad-right-panel">
            <div className="panel-section-title">PROPIEDADES DE SECCIÓN</div>

            <div className="panel-content">
                {selectedSection === null ? (
                    <div className="inspector-card" style={{ textAlign: 'center', padding: 30 }}>
                        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>🎯</div>
                        <div style={{ color: '#9ca3af', fontSize: 12, lineHeight: 1.6 }}>
                            Selecciona una sección del mueble para ver sus propiedades
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Card: Dimensiones */}
                        <div className="inspector-card">
                            <div className="subsection-title">📐 Dimensiones</div>

                            <div className="prop-row">
                                <label className="prop-label">Ancho:</label>
                                <span className="prop-value">{anchoSeccion} mm</span>
                            </div>

                            <div className="prop-row">
                                <label className="prop-label">Alto:</label>
                                <span className="prop-value">{Math.round(altoSeccion)} mm</span>
                            </div>

                            <div className="prop-row">
                                <label className="prop-label">Profundidad:</label>
                                <span className="prop-value">{dimensions?.depth || 600} mm</span>
                            </div>
                        </div>

                        {/* Card: Propiedades del Elemento Seleccionado */}
                        {selectedItem && (
                            <div className="inspector-card" style={{ border: '2px solid #2563EB', background: '#eff6ff' }}>
                                <div className="subsection-title" style={{ color: '#2563EB' }}>
                                    ✏️ Editando {selectedItemType === 'shelf' ? 'Repisa' : (selectedItemType === 'drawer' ? 'Cajón' : (selectedItemType === 'bar' ? 'Barra' : 'Divisor'))}
                                </div>

                                {selectedItemType !== 'drawer' && (
                                    <>
                                        <div className="prop-row">
                                            <label className="prop-label">Posición Y:</label>
                                            <input
                                                className="cad-input prop-input"
                                                type="number"
                                                value={Math.round(selectedItem.y)}
                                                onChange={(e) => actions.updateItemProp(selectedItem.id, selectedItemType, e.target.value, 'y')}
                                            />
                                            <span style={{ fontSize: 10, color: '#666' }}>mm</span>
                                        </div>

                                        <div className="prop-row">
                                            <label className="prop-label">Posición X:</label>
                                            <input
                                                className="cad-input prop-input"
                                                type="number"
                                                value={Math.round(selectedItem.x || 0)}
                                                onChange={(e) => actions.updateItemProp(selectedItem.id, selectedItemType, e.target.value, 'x')}
                                            />
                                            <span style={{ fontSize: 10, color: '#666' }}>mm</span>
                                        </div>
                                    </>
                                )}

                                <div className="prop-row">
                                    <label className="prop-label">Ancho:</label>
                                    <input
                                        className="cad-input prop-input"
                                        type="number"
                                        value={Math.round(selectedItem.width || anchoSeccion)}
                                        onChange={(e) => actions.updateItemProp(selectedItem.id, selectedItemType, e.target.value, 'width')}
                                    />
                                    <span style={{ fontSize: 10, color: '#666' }}>mm</span>
                                </div>

                                {(selectedItemType === 'drawer' || selectedItemType === 'partialDivider') && (
                                    <div className="prop-row">
                                        <label className="prop-label">Alto:</label>
                                        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                                            <input
                                                className="cad-input prop-input"
                                                type="number"
                                                value={Math.round(selectedItem.height || (selectedItemType === 'drawer' ? 200 : altoSeccion))}
                                                onChange={(e) => actions.updateItemProp(selectedItem.id, selectedItemType, e.target.value, 'height')}
                                            />
                                            {selectedItemType === 'partialDivider' && (
                                                <button
                                                    className="btn-add"
                                                    style={{ padding: '0 6px', fontSize: 10, background: '#8b5cf6' }}
                                                    onClick={() => {
                                                        actions.updateItemProp(selectedItem.id, selectedItemType, altoSeccion, 'height');
                                                        actions.updateItemProp(selectedItem.id, selectedItemType, 0, 'y');
                                                    }}
                                                    title="Ajustar Altura Completa"
                                                >
                                                    ↕ Full
                                                </button>
                                            )}
                                        </div>
                                        <span style={{ fontSize: 10, color: '#666' }}>mm</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Card: Items de sección */}
                        <div className="inspector-card">
                            {/* REPISAS */}
                            <div className="subsection-title">📦 Repisas ({repisas.length})</div>
                            <div className="btn-row">
                                <button className="btn-add" onClick={actions.addShelf}>+ Agregar</button>
                                <button
                                    className="btn-remove"
                                    onClick={actions.removeShelf}
                                    disabled={repisas.length === 0}
                                >
                                    − Quitar
                                </button>
                            </div>

                            {/* CAJONES */}
                            <div className="subsection-title" style={{ marginTop: 16 }}>🗄️ Cajones ({cajones.length})</div>
                            <div className="btn-row">
                                <button className="btn-add" onClick={actions.addDrawer}>+ Agregar</button>
                                <button
                                    className="btn-remove"
                                    onClick={actions.removeDrawer}
                                    disabled={cajones.length === 0}
                                >
                                    − Quitar
                                </button>
                            </div>

                            {/* BARRAS */}
                            <div className="subsection-title" style={{ marginTop: 16 }}>🪝 Barras de Colgar ({barras.length})</div>
                            <div className="btn-row">
                                <button className="btn-add" style={{ background: '#22c55e' }} onClick={actions.addBar}>+ Agregar</button>
                                <button
                                    className="btn-remove"
                                    onClick={actions.removeBar}
                                    disabled={barras.length === 0}
                                >
                                    − Quitar
                                </button>
                            </div>

                            {/* DIVISORES INTERNOS */}
                            <div className="subsection-title" style={{ marginTop: 16 }}>↕️ Divisores Internos ({divisoresVerticales.length})</div>
                            <div className="btn-row">
                                <button className="btn-add" style={{ background: '#8b5cf6' }} onClick={actions.addPartialDivider}>+ Agregar</button>
                                <button
                                    className="btn-remove"
                                    onClick={actions.removePartialDivider}
                                    disabled={divisoresVerticales.length === 0}
                                >
                                    − Quitar
                                </button>
                            </div>
                        </div>

                        {/* Card: Secciones del mueble */}
                        <div className="inspector-card">
                            <div className="subsection-title">🔧 Secciones del Mueble ({dividers.length + 1})</div>
                            <div className="btn-row">
                                <button className="btn-add" onClick={actions.addDivider}>+ División</button>
                                <button
                                    className="btn-remove"
                                    onClick={actions.removeDivider}
                                    disabled={dividers.length === 0}
                                >
                                    − División
                                </button>
                            </div>
                            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 10, lineHeight: 1.5 }}>
                                Arrastra los divisores en el visualizador para ajustar el ancho de cada sección.
                            </p>
                        </div>

                        {/* Card: Puertas */}
                        <div className="inspector-card">
                            <div className="subsection-title">🚪 Puertas</div>
                            <div className="prop-row">
                                <label className="prop-label">Cantidad:</label>
                                <input
                                    className="cad-input prop-input"
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={totalDoors || 0}
                                    onChange={(e) => setTotalDoors(parseInt(e.target.value) || 0)}
                                    style={{ width: 80 }}
                                />
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="tips-box">
                            <strong>📌 Tips:</strong><br />
                            • Arrastra <b>repisas</b>, <b>cajones</b> y <b>barras</b> en el visualizador<br />
                            • Arrastra los <b>divisores verticales</b> para ajustar anchos<br />
                            • Usa la herramienta <b>Medir</b> para distancias exactas
                        </div>
                    </>
                )}
            </div>
        </aside>
    );
};
