import React, { useState, useRef, useMemo, memo } from 'react';

// --- SUB-COMPONENTES MEMOIZADOS ---
const RenderShelf = memo(({ x, y, width, thickness, depthOffset, isSelected, onMouseDown, label }) => (
    <g>
        <polygon points={`${x},${y} ${x + depthOffset},${y - depthOffset} ${x + width + depthOffset},${y - depthOffset} ${x + width},${y}`} fill="#F5EDE0" stroke="#D4C4A8" strokeWidth={0.8} />
        <rect x={x} y={y} width={width} height={thickness} fill={isSelected ? '#93C5FD' : '#F5EDE0'} stroke={isSelected ? '#3B82F6' : '#D4C4A8'} strokeWidth={isSelected ? 2.5 : 1.5} style={{ cursor: 'ns-resize' }} onMouseDown={onMouseDown} />
        {label && <text x={x + width / 2} y={y + thickness / 2 + 5} fontSize="12" textAnchor="middle" fill="#666" style={{ pointerEvents: 'none' }}>{label}</text>}
    </g>
));

const RenderDrawer = memo(({ x, y, width, height, isSelected, onMouseDown }) => (
    <g>
        <rect x={x + 4} y={y + 4} width={width - 8} height={height - 8} fill={isSelected ? '#93C5FD' : '#FAFAFA'} stroke={isSelected ? '#3B82F6' : '#D4C4A8'} strokeWidth={isSelected ? 2.5 : 2} rx={3} style={{ cursor: 'ns-resize' }} onMouseDown={onMouseDown} />
        <rect x={x + width / 2 - 35} y={y + height / 2 - 6} width={70} height={12} rx={6} fill="#AAA" style={{ pointerEvents: 'none' }} />
    </g>
));

const RenderBar = memo(({ x, y, width, isSelected, onMouseDown }) => (
    <g style={{ cursor: 'ns-resize' }} onMouseDown={onMouseDown}>
        <rect x={x + 8} y={y - 25} width={15} height={30} fill="#777" rx={3} />
        <rect x={x + width - 23} y={y - 25} width={15} height={30} fill="#777" rx={3} />
        <ellipse cx={x + width / 2} cy={y} rx={width / 2 - 30} ry={10} fill={isSelected ? '#93C5FD' : '#9CA3AF'} stroke={isSelected ? '#3B82F6' : '#6B7280'} strokeWidth={isSelected ? 2.5 : 1.5} />
    </g>
));

export const ClosetVisualizer = ({
    dimensions, materials, layout,
    onUpdateItem, onUpdateDivider, onSelectSection, selectedSection,
    onSelectItem, selectedItemIds = [],
    onMoveItemsBatch,
    viewMode,
    totalDoors = 0
}) => {
    const { height, width, depth } = dimensions;
    const thickness = parseInt(materials.thickness, 10) || 18;

    const [zoom, setZoom] = useState(0.55);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragState, setDragState] = useState(null);
    const svgRef = useRef(null);

    const ZOCALO_HEIGHT = 70;
    const bodyHeight = height - ZOCALO_HEIGHT;
    const internalHeight = bodyHeight - (2 * thickness);
    const internalWidth = width - (2 * thickness);
    const DEPTH_OFFSET = Math.min(depth * 0.06, 35);

    const getSvgPos = (e) => {
        const pt = svgRef.current.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        return pt.matrixTransform(svgRef.current.getScreenCTM().inverse());
    };

    const getSectionFromX = (mouseX) => {
        const dividers = [...(layout.dividers || [])].sort((a, b) => a - b);
        const relativeX = mouseX - thickness;
        let currentX = 0;
        for (let i = 0; i <= dividers.length; i++) {
            const nextX = i < dividers.length ? dividers[i] : internalWidth;
            if (relativeX >= currentX && relativeX <= nextX) return i;
            currentX = nextX + thickness;
        }
        return -1;
    };

    const handleMouseDown = (e, target) => {
        e.stopPropagation();
        const pos = getSvgPos(e);

        if (target) {
            const isAlreadySelected = selectedItemIds.includes(target.id);
            const isCtrl = e.ctrlKey || e.metaKey;

            // 1. LÓGICA DE SELECCIÓN INTELIGENTE
            if (isCtrl) {
                // Si presiona Ctrl, siempre hacemos toggle (agregar/quitar)
                onSelectItem(target.id, target.type, true);
            } else {
                // Si NO presiona Ctrl:
                if (!isAlreadySelected) {
                    // Si es un item nuevo, seleccionamos SOLO este (borra el grupo anterior)
                    onSelectItem(target.id, target.type, false);
                }
                // Si YA estaba seleccionado, NO hacemos nada AHORA.
                // Esto permite que el grupo siga seleccionado para poder arrastrarlo.
            }

            if (target.sectionIndex !== undefined) onSelectSection(target.sectionIndex);

            // 2. DETECTAR SI ES ARRASTRE DE GRUPO
            // Es grupo si el item actual es parte de la selección y hay más de 1 seleccionado
            const isGroup = isAlreadySelected && selectedItemIds.length > 1;

            setDragState({
                ...target,
                startMouse: pos,
                currentMouseX: pos.x,
                currentPos: pos,
                currentVal: target.originalVal,
                isGroupDrag: isGroup,
                wasCtrlPressed: isCtrl
            });
        } else {
            // Click en Fondo: Deseleccionar todo
            onSelectItem(null);
            setDragState({ type: 'pan', startMouse: { x: e.clientX, y: e.clientY }, startPan: { ...pan } });
        }
    };

    const handleMouseMove = (e) => {
        if (!dragState) return;
        if (dragState.type === 'pan') {
            const dx = e.clientX - dragState.startMouse.x;
            const dy = e.clientY - dragState.startMouse.y;
            setPan({ x: dragState.startPan.x + dx / zoom, y: dragState.startPan.y + dy / zoom });
            return;
        }

        const pos = getSvgPos(e);
        const deltaY = pos.y - dragState.startMouse.y;
        const deltaX = pos.x - dragState.startMouse.x;

        let newVal = dragState.startVal;
        if (['shelf', 'drawer', 'bar'].includes(dragState.type)) {
            // Y en este sistema es elevación desde el piso.
            // Mouse sube (deltaY negativo) → elevación aumenta → restar deltaY
            newVal = dragState.startVal - deltaY;
        } else if (dragState.type === 'divider') {
            newVal = dragState.startVal + deltaX;
        }

        setDragState(prev => ({ ...prev, currentVal: newVal, currentMouseX: pos.x, currentPos: pos }));
    };

    const handleMouseUp = () => {
        if (dragState && dragState.type !== 'pan') {

            const hasMoved = dragState.currentPos && (
                Math.abs(dragState.currentPos.x - dragState.startMouse.x) > 2 ||
                Math.abs(dragState.currentPos.y - dragState.startMouse.y) > 2
            );

            // Click sin mover: seleccionar solo este item
            if (!hasMoved && !dragState.wasCtrlPressed && selectedItemIds.includes(dragState.id)) {
                onSelectItem(dragState.id, dragState.type, false);
            }

            if (hasMoved) {
                if (dragState.type === 'divider') {
                    onUpdateDivider(dragState.index, dragState.currentVal);
                } else if (['shelf', 'drawer', 'bar'].includes(dragState.type)) {
                    // Detectar si cayó en otra sección (movimiento horizontal libre)
                    const targetSection = getSectionFromX(dragState.currentMouseX);
                    const movedToOtherSection = targetSection !== -1 && targetSection !== dragState.sectionIndex;

                    if (movedToOtherSection) {
                        // Mover a otra sección, conservando la posición Y donde soltó
                        const newY = Math.max(0, Math.round(dragState.currentVal));
                        if (dragState.isGroupDrag) {
                            onMoveItemsBatch(dragState.sectionIndex, targetSection, selectedItemIds, dragState.type);
                        } else {
                            onMoveItemsBatch(dragState.sectionIndex, targetSection, [dragState.id], dragState.type);
                        }
                        // Actualizar Y en la nueva sección
                        setTimeout(() => {
                            onUpdateItem(targetSection, dragState.id, dragState.type, { y: newY });
                        }, 0);
                    } else {
                        // Misma sección: actualizar Y
                        const newY = Math.max(0, Math.round(dragState.currentVal));
                        onUpdateItem(dragState.sectionIndex, dragState.id, dragState.type, { y: newY });
                    }
                }
            }
        }
        setDragState(null);
    };

    // RENDER
    const sectionsRender = useMemo(() => {
        const dividers = [...(layout.dividers || [])].sort((a, b) => a - b);
        let prevX = 0;
        return Array.from({ length: dividers.length + 1 }).map((_, i) => {
            const isLast = i === dividers.length;
            const divPos = (dragState?.type === 'divider' && dragState.index === i) ? dragState.currentVal : (dividers[i] || internalWidth);
            const endX = isLast ? internalWidth : divPos;
            const startX = prevX;
            const sectionW = Math.max(0, endX - startX - (i > 0 ? thickness / 2 : 0) - (!isLast ? thickness / 2 : 0));
            const drawX = thickness + startX + (i > 0 ? thickness / 2 : 0);
            prevX = endX;
            const section = layout.sections[i] || {};

            return (
                <g key={i}>
                    <rect x={drawX} y={thickness} width={sectionW} height={internalHeight} fill={selectedSection === i ? "#C5E3F6" : "#FAFAFA"} onClick={() => onSelectSection(i)} />

                    {/* INDICADOR DE DROP ZONE (Solo si estamos arrastrando hacia esta sección) */}
                    {dragState && dragState.type !== 'pan' && dragState.type !== 'divider' && getSectionFromX(dragState.currentMouseX) === i && dragState.sectionIndex !== i && (
                        <rect x={drawX} y={thickness} width={sectionW} height={internalHeight} fill="rgba(34, 197, 94, 0.1)" stroke="#22c55e" strokeWidth={2} strokeDasharray="5,5" pointerEvents="none" />
                    )}

                    {section.shelves?.map(s => {
                        const isDragging = dragState?.id === s.id;
                        const isSelected = selectedItemIds.includes(s.id);

                        // Visual Group Drag Logic
                        const isGroupMoving = dragState?.isGroupDrag && isSelected && ['shelf', 'drawer', 'bar'].includes(dragState.type);

                        let logicY = s.y;
                        let visualX = drawX;

                        if (isDragging) {
                            logicY = dragState.currentVal;
                            if (dragState.currentPos) visualX = drawX + (dragState.currentPos.x - dragState.startMouse.x);
                        } else if (isGroupMoving) {
                            // Apply delta from leader
                            logicY = s.y + (dragState.currentVal - dragState.startVal);
                            if (dragState.currentPos) visualX = drawX + (dragState.currentPos.x - dragState.startMouse.x);
                        }

                        // Clamp visual Y with safe margins
                        if (logicY < 0) logicY = 0;
                        const safeMaxY = Math.max(0, internalHeight - thickness - 5);
                        if (logicY > safeMaxY) logicY = safeMaxY;

                        return <RenderShelf key={s.id} x={visualX} y={bodyHeight - thickness - logicY} width={sectionW} thickness={thickness} depthOffset={DEPTH_OFFSET} isSelected={isSelected} label={Math.round(logicY)} onMouseDown={(e) => handleMouseDown(e, { type: 'shelf', id: s.id, sectionIndex: i, startVal: s.y, originalVal: s.y })} />;
                    })}

                    {section.drawers?.map(d => {
                        const h = d.height || 200;
                        const isDragging = dragState?.id === d.id;
                        const isSelected = selectedItemIds.includes(d.id);

                        // Visual Group Drag Logic
                        const isGroupMoving = dragState?.isGroupDrag && isSelected && ['shelf', 'drawer', 'bar'].includes(dragState.type);

                        let logicY = d.y;
                        let visualX = drawX;

                        if (isDragging) {
                            logicY = dragState.currentVal;
                            if (dragState.currentPos) visualX = drawX + (dragState.currentPos.x - dragState.startMouse.x);
                        } else if (isGroupMoving) {
                            logicY = d.y + (dragState.currentVal - dragState.startVal);
                            if (dragState.currentPos) visualX = drawX + (dragState.currentPos.x - dragState.startMouse.x);
                        }

                        // Clamp visual Y
                        if (logicY < 0) logicY = 0;
                        if (logicY > internalHeight - h) logicY = internalHeight - h;

                        return <RenderDrawer key={d.id} x={visualX} y={bodyHeight - thickness - logicY - h} width={sectionW} height={h} isSelected={isSelected} onMouseDown={(e) => handleMouseDown(e, { type: 'drawer', id: d.id, sectionIndex: i, startVal: d.y, originalVal: d.y })} />;
                    })}

                    {section.bars?.map(b => {
                        const isDragging = dragState?.id === b.id;
                        const isSelected = selectedItemIds.includes(b.id);

                        // Visual Group Drag Logic
                        const isGroupMoving = dragState?.isGroupDrag && isSelected && ['shelf', 'drawer', 'bar'].includes(dragState.type);

                        let logicY = b.y;
                        let visualX = drawX;

                        if (isDragging) {
                            logicY = dragState.currentVal;
                            if (dragState.currentPos) visualX = drawX + (dragState.currentPos.x - dragState.startMouse.x);
                        } else if (isGroupMoving) {
                            logicY = b.y + (dragState.currentVal - dragState.startVal);
                            if (dragState.currentPos) visualX = drawX + (dragState.currentPos.x - dragState.startMouse.x);
                        }

                        // Clamp visual Y
                        if (logicY < 0) logicY = 0;
                        const safeMaxY = Math.max(0, internalHeight - thickness - 5);
                        if (logicY > safeMaxY) logicY = safeMaxY;

                        return <RenderBar key={b.id} x={visualX} y={bodyHeight - thickness - logicY} width={sectionW} isSelected={isSelected} onMouseDown={(e) => handleMouseDown(e, { type: 'bar', id: b.id, sectionIndex: i, startVal: b.y, originalVal: b.y })} />;
                    })}

                    {!isLast && <rect x={thickness + endX - thickness / 2} y={thickness} width={thickness} height={internalHeight} fill="#F5EDE0" stroke="#D4C4A8" strokeWidth="1.5" style={{ cursor: 'ew-resize' }} onMouseDown={(e) => handleMouseDown(e, { type: 'divider', index: i, startVal: dividers[i], originalVal: dividers[i] })} />}
                </g>
            );
        });
    }, [layout, dimensions, selectedSection, selectedItemIds, dragState, thickness]);

    const vb = { x: -200 - pan.x, y: -150 - pan.y, w: (width + 400) / zoom, h: (height + 400) / zoom };

    return (
        <div style={{ width: '100%', height: '100%', background: '#F5F5F5', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
                <button onClick={() => { setZoom(0.55); setPan({ x: 0, y: 0 }); }} style={{ padding: '5px 10px', background: 'white', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}>Reset View</button>
            </div>
            <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} style={{ width: '100%', height: '100%', cursor: dragState?.type === 'pan' ? 'grabbing' : 'grab' }} onMouseDown={(e) => handleMouseDown(e, null)} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onWheel={(e) => setZoom(z => Math.max(0.1, z + (e.deltaY > 0 ? -0.05 : 0.05)))}>
                <rect x={0} y={0} width={thickness} height={bodyHeight} fill="#F5EDE0" stroke="#D4C4A8" strokeWidth="1.5" />
                <rect x={width - thickness} y={0} width={thickness} height={bodyHeight} fill="#F5EDE0" stroke="#D4C4A8" strokeWidth="1.5" />
                <rect x={thickness} y={0} width={internalWidth} height={thickness} fill="#F5EDE0" stroke="#D4C4A8" strokeWidth="1.5" />
                <rect x={thickness} y={bodyHeight - thickness} width={internalWidth} height={thickness} fill="#F5EDE0" stroke="#D4C4A8" strokeWidth="1.5" />
                <rect x={0} y={bodyHeight} width={width} height={ZOCALO_HEIGHT} fill="#E8DCC8" stroke="#D4C4A8" strokeWidth="1.5" />
                {sectionsRender}

                {/* PUERTAS - Renderizar si totalDoors > 0 */}
                {totalDoors > 0 && (() => {
                    const safeDoors = Math.max(1, parseInt(totalDoors));
                    const doorType = materials.doorType || 'swing';
                    const customDoorWidth = parseInt(materials.doorWidth) || 0;
                    const customDoorHeight = parseInt(materials.doorHeight) || 0;

                    let doorWidth, doorHeight;

                    if (doorType === 'sliding') {
                        const autoDoorWidth = Math.round(width / safeDoors + 30);
                        const autoDoorHeight = bodyHeight - 10;
                        doorWidth = customDoorWidth > 0 ? customDoorWidth : autoDoorWidth;
                        doorHeight = customDoorHeight > 0 ? customDoorHeight : autoDoorHeight;
                    } else {
                        const gap = 3;
                        const autoDoorWidth = Math.round((width - (gap * (safeDoors - 1))) / safeDoors);
                        const autoDoorHeight = bodyHeight;
                        doorWidth = customDoorWidth > 0 ? customDoorWidth : autoDoorWidth;
                        doorHeight = customDoorHeight > 0 ? customDoorHeight : autoDoorHeight;
                    }

                    const doors = [];
                    for (let i = 0; i < safeDoors; i++) {
                        const doorX = doorType === 'sliding'
                            ? i * (doorWidth - 30)
                            : i * (doorWidth + 3);

                        doors.push(
                            <g key={`door-${i}`}>
                                {/* Efecto de profundidad */}
                                <polygon
                                    points={`${doorX},${bodyHeight - doorHeight} ${doorX + DEPTH_OFFSET},${bodyHeight - doorHeight - DEPTH_OFFSET} ${doorX + doorWidth + DEPTH_OFFSET},${bodyHeight - doorHeight - DEPTH_OFFSET} ${doorX + doorWidth},${bodyHeight - doorHeight}`}
                                    fill="#D4C8B0"
                                    opacity={0.6}
                                />
                                {/* Puerta frontal */}
                                <rect
                                    x={doorX}
                                    y={bodyHeight - doorHeight}
                                    width={doorWidth}
                                    height={doorHeight}
                                    fill={doorType === 'sliding' ? '#C9B896' : '#D4C8B0'}
                                    stroke="#8B7355"
                                    strokeWidth={2}
                                    opacity={0.85}
                                />
                                {/* Manija */}
                                <circle
                                    cx={doorType === 'sliding' ? doorX + doorWidth - 40 : doorX + 30}
                                    cy={bodyHeight - doorHeight / 2}
                                    r={8}
                                    fill="#666"
                                />
                                {/* Etiqueta con dimensiones */}
                                <text
                                    x={doorX + doorWidth / 2}
                                    y={bodyHeight - doorHeight / 2}
                                    fontSize="11"
                                    textAnchor="middle"
                                    fill="#333"
                                    fontWeight="600"
                                >
                                    {doorWidth}×{doorHeight}
                                </text>
                            </g>
                        );
                    }
                    return doors;
                })()}
            </svg>
        </div>
    );
};
