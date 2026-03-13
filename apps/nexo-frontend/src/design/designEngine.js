/**
 * MueblePro Enterprise — Design Engine
 * Parametric cabinet designer supporting closets, base/wall cabinets, and shelving.
 * All calculations in millimeters.
 */
import { CABINET_TYPES, LIMITS, STANDARD_BOARD, safePositive } from '../core/constants.js';

/**
 * Validate a design for manufacturability.
 * @returns {{ valid: boolean, warnings: string[], errors: string[] }}
 */
export const validateDesign = (dimensions, materials, cabinetType = CABINET_TYPES.CLOSET) => {
    const warnings = [];
    const errors = [];
    const H = parseInt(dimensions.height) || 0;
    const W = parseInt(dimensions.width) || 0;
    const D = parseInt(dimensions.depth) || 0;
    const thick = parseInt(materials.thickness) || 18;

    // Dimension range checks
    if (H < LIMITS.height.min) errors.push(`Altura ${H}mm < mínimo ${LIMITS.height.min}mm`);
    if (H > LIMITS.height.max) warnings.push(`Altura ${H}mm excede recomendado ${LIMITS.height.max}mm`);
    if (W < LIMITS.width.min) errors.push(`Ancho ${W}mm < mínimo ${LIMITS.width.min}mm`);
    if (W > LIMITS.width.max) warnings.push(`Ancho ${W}mm excede recomendado ${LIMITS.width.max}mm`);
    if (D < LIMITS.depth.min) errors.push(`Profundidad ${D}mm < mínimo ${LIMITS.depth.min}mm`);
    if (D > LIMITS.depth.max) warnings.push(`Profundidad ${D}mm excede recomendado ${LIMITS.depth.max}mm`);

    // Internal space
    const hasPlinth = cabinetType === CABINET_TYPES.CLOSET || cabinetType === CABINET_TYPES.BASE_CABINET;
    const bodyHeight = hasPlinth ? H - LIMITS.plinthHeight : H;
    const internalW = W - 2 * thick;
    const internalH = bodyHeight - 2 * thick;

    if (internalW <= 0) errors.push('Ancho interno negativo — espesor mayor que ancho');
    if (internalH <= 0) errors.push('Alto interno negativo — ajuste dimensiones');
    if (internalW > 0 && internalW < 100) warnings.push(`Ancho interno ${internalW}mm muy estrecho`);

    // Board size
    if (D > STANDARD_BOARD.width || bodyHeight > STANDARD_BOARD.height) {
        warnings.push(`Piezas pueden exceder tablero estándar ${STANDARD_BOARD.width}×${STANDARD_BOARD.height}mm`);
    }

    return { valid: errors.length === 0, warnings, errors };
};

/**
 * Generate the complete cut list for a cabinet design.
 * @returns {{ cutList: Array, totals: Object, warnings: string[] }}
 */
export const generateCutList = (dimensions, materials, layout, totalDoors = 0, cabinetType = CABINET_TYPES.CLOSET) => {
    if (!dimensions || !materials) {
        return { cutList: [], totals: emptyTotals(), warnings: ['Datos de entrada no válidos'] };
    }

    const H = Math.max(LIMITS.height.min, parseInt(dimensions.height) || 0);
    const W = Math.max(LIMITS.width.min, parseInt(dimensions.width) || 0);
    const D = Math.max(LIMITS.depth.min, parseInt(dimensions.depth) || 0);
    const thick = Math.max(LIMITS.thickness.min, parseInt(materials.thickness) || 18);

    const melaminePrice = safePositive(materials.melaminePrice);
    const edgeBandingPrice = safePositive(materials.edgeBandingPrice);
    const backingPrice = safePositive(materials.backingPrice);
    const doorType = materials.doorType || 'swing';

    const warnings = [];

    try {
        const cutList = [];

        const addPiece = (piece) => {
            if (piece.width <= 0 || piece.height <= 0) {
                warnings.push(`⚠️ Pieza "${piece.part}" con medida ≤ 0 omitida`);
                return;
            }
            const maxDim = Math.max(piece.width, piece.height);
            const minDim = Math.min(piece.width, piece.height);
            if (maxDim > STANDARD_BOARD.width || minDim > STANDARD_BOARD.height) {
                piece.warning = '⚠️ Excede tablero estándar';
            }

            // Edge banding sides description
            if (!piece.edgeBandingSides) {
                piece.edgeBandingSides = piece.edgeBanding > 0 ? 'Frente' : 'Ninguno';
            }

            const existing = cutList.find(i =>
                i.part === piece.part &&
                Math.abs(i.width - piece.width) < 1 &&
                Math.abs(i.height - piece.height) < 1 &&
                i.material === piece.material
            );

            const newIds = piece.ids || (piece.sourceId ? [piece.sourceId] : []);

            if (existing) {
                existing.qty += piece.qty;
                existing.edgeBanding += (piece.edgeBanding || 0);
                if (existing.ids) {
                    existing.ids = [...new Set([...existing.ids, ...newIds])];
                } else {
                    existing.ids = newIds;
                }
            } else {
                piece.ids = newIds;
                delete piece.sourceId;
                cutList.push(piece);
            }
        };

        // Constants
        const hasPlinth = cabinetType === CABINET_TYPES.CLOSET || cabinetType === CABINET_TYPES.BASE_CABINET;
        const PLINTH_H = hasPlinth ? LIMITS.plinthHeight : 0;
        const PLINTH_SETBACK = LIMITS.plinthSetback;
        const bodyHeight = H - PLINTH_H;
        const internalWidth = W - (2 * thick);
        const internalHeight = bodyHeight - (2 * thick);

        if (internalWidth <= 0) {
            return { cutList: [], totals: emptyTotals(), warnings: ['🚫 Ancho interno negativo.'] };
        }
        if (internalHeight <= 0) {
            return { cutList: [], totals: emptyTotals(), warnings: ['🚫 Alto interno negativo.'] };
        }

        // ═══ 1. PLINTH / TOE KICK ═══
        if (hasPlinth) {
            addPiece({
                part: 'Zócalo (Frente/Trasero)', qty: 2,
                width: W, height: PLINTH_H,
                edgeBanding: W * 2, edgeBandingSides: 'Frente (ambas)',
                material: `Melamina ${thick}mm`, thickness: thick,
            });

            const plinthCrossWidth = D - PLINTH_SETBACK - (2 * thick);
            if (plinthCrossWidth > 0) {
                addPiece({
                    part: 'Zócalo (Traviesas)', qty: 2,
                    width: plinthCrossWidth, height: PLINTH_H,
                    edgeBanding: 0, edgeBandingSides: 'Ninguno',
                    material: `Melamina ${thick}mm`, thickness: thick,
                });
            }
        }

        // ═══ 2. MAIN STRUCTURE ═══
        addPiece({
            part: 'Laterales', qty: 2,
            width: D, height: bodyHeight,
            edgeBanding: bodyHeight * 2, edgeBandingSides: 'Frente (ambos)',
            material: `Melamina ${thick}mm`, thickness: thick,
        });

        addPiece({
            part: 'Tapa Superior', qty: 1,
            width: internalWidth, height: D,
            edgeBanding: internalWidth, edgeBandingSides: 'Frente',
            material: `Melamina ${thick}mm`, thickness: thick,
        });

        addPiece({
            part: 'Piso', qty: 1,
            width: internalWidth, height: D,
            edgeBanding: internalWidth, edgeBandingSides: 'Frente',
            material: `Melamina ${thick}mm`, thickness: thick,
        });

        // ═══ 3. DIVIDERS ═══
        const dividers = layout.dividers || [];
        if (dividers.length > 0) {
            addPiece({
                part: 'Divisiones Verticales', qty: dividers.length,
                width: D, height: internalHeight,
                edgeBanding: internalHeight * dividers.length, edgeBandingSides: 'Frente (c/u)',
                material: `Melamina ${thick}mm`, thickness: thick,
            });
        }

        // ═══ 4. SECTION CONTENTS ═══
        const sortedDividers = [...dividers].sort((a, b) => a - b);
        const numSections = sortedDividers.length + 1;

        for (let i = 0; i < numSections; i++) {
            const sectionStart = i === 0 ? 0 : sortedDividers[i - 1] + thick / 2;
            const sectionEnd = i < sortedDividers.length ? sortedDividers[i] - thick / 2 : internalWidth;
            const sectionW = Math.max(0, sectionEnd - sectionStart);
            if (sectionW <= 0) continue;

            const section = layout.sections[i] || {};

            if (sectionW > LIMITS.shelfMaxSpan && section.shelves?.length > 0) {
                warnings.push(`⚠️ Sección ${i + 1}: repisa ${Math.round(sectionW)}mm (riesgo pandeo > ${LIMITS.shelfMaxSpan}mm)`);
            }

            // Shelves
            if (section.shelves?.length > 0) {
                section.shelves.forEach(s => {
                    addPiece({
                        part: 'Repisa', qty: 1,
                        width: sectionW, height: s.depth || D,
                        edgeBanding: sectionW, edgeBandingSides: 'Frente',
                        material: `Melamina ${thick}mm`, thickness: thick,
                        sourceId: s.id,
                    });
                });
            }

            // Drawers
            if (section.drawers?.length > 0) {
                section.drawers.forEach(d => {
                    const h = d.height || 200;
                    const GAP = LIMITS.drawerFrontGap;
                    const CLEARANCE = LIMITS.drawerClearance;
                    const DEPTH_OFF = LIMITS.drawerDepthOffset;
                    const SIDE_RED = LIMITS.drawerSideReduction;

                    const frontW = sectionW - (GAP * 2);
                    if (frontW > 0) {
                        addPiece({
                            part: 'Frente Cajón', qty: 1,
                            width: frontW, height: h,
                            edgeBanding: (frontW + h) * 2, edgeBandingSides: '4 lados',
                            material: `Melamina ${thick}mm`, thickness: thick,
                            sourceId: d.id,
                        });
                    }

                    const sideD = D - DEPTH_OFF;
                    const sideH = h - SIDE_RED;
                    if (sideD > 0 && sideH > 0) {
                        addPiece({
                            part: 'Lateral Cajón', qty: 2,
                            width: sideD, height: sideH,
                            edgeBanding: sideD * 2, edgeBandingSides: 'Superior (ambos)',
                            material: `Melamina ${thick}mm`, thickness: thick,
                            sourceId: d.id,
                        });
                    }

                    const internalW = sectionW - CLEARANCE;
                    if (internalW > 0 && sideH > 0) {
                        addPiece({
                            part: 'Trasera/Frente Interno Cajón', qty: 2,
                            width: internalW, height: sideH,
                            edgeBanding: internalW * 2, edgeBandingSides: 'Superior',
                            material: `Melamina ${thick}mm`, thickness: thick,
                            sourceId: d.id,
                        });
                    }

                    if (sideD > 0 && internalW > 0) {
                        addPiece({
                            part: 'Fondo Cajón', qty: 1,
                            width: internalW, height: sideD,
                            thickness: 3, edgeBanding: 0, edgeBandingSides: 'Ninguno',
                            material: 'MDF 3mm', sourceId: d.id,
                        });
                    }
                });
            }

            // Bars
            if (section.bars?.length > 0) {
                section.bars.forEach(b => {
                    addPiece({
                        part: 'Barra Colgador', qty: 1,
                        width: sectionW - LIMITS.barClearance, height: 30,
                        material: 'Metal (tubo)', edgeBanding: 0, edgeBandingSides: 'N/A',
                        sourceId: b.id,
                    });
                });
            }

            // Partial dividers
            if (section.partialDividers?.length > 0) {
                section.partialDividers.forEach(pd => {
                    const pdHeight = Math.max(0, (pd.endY || 0) - (pd.startY || 0));
                    if (pdHeight > 0) {
                        addPiece({
                            part: 'División Interna', qty: 1,
                            width: D, height: pdHeight,
                            edgeBanding: pdHeight, edgeBandingSides: 'Frente',
                            material: `Melamina ${thick}mm`, thickness: thick,
                            sourceId: pd.id,
                        });
                    }
                });
            }
        }

        // ═══ 5. BACK PANEL ═══
        const backW = W - LIMITS.backPanelMargin;
        const backH = bodyHeight - LIMITS.backPanelMargin;

        if (materials.isMelamineBacking) {
            addPiece({
                part: 'Fondo (Melamina)', qty: 1,
                width: backW, height: backH, thickness: thick,
                edgeBanding: 0, edgeBandingSides: 'Ninguno',
                material: `Melamina ${thick}mm`,
            });
        } else {
            addPiece({
                part: 'Fondo (MDF 3mm)', qty: 1,
                width: backW, height: backH, thickness: 3,
                edgeBanding: 0, edgeBandingSides: 'Ninguno',
                material: 'MDF 3mm',
            });
        }

        // ═══ 6. DOORS ═══
        if (totalDoors && totalDoors > 0) {
            const safeDoors = Math.max(1, parseInt(totalDoors));

            // Usar dimensiones personalizadas si fueron proporcionadas por el usuario
            const customDoorWidth = parseInt(materials.doorWidth) || 0;
            const customDoorHeight = parseInt(materials.doorHeight) || 0;

            if (doorType === 'sliding') {
                const autoDoorWidth = Math.round(W / safeDoors + 30);
                const autoDoorHeight = bodyHeight - 10;
                const doorWidth = customDoorWidth > 0 ? customDoorWidth : autoDoorWidth;
                const doorHeight = customDoorHeight > 0 ? customDoorHeight : autoDoorHeight;
                addPiece({
                    part: 'Puerta Corredera', qty: safeDoors,
                    width: doorWidth, height: doorHeight,
                    edgeBanding: (doorWidth + doorHeight) * 2 * safeDoors, edgeBandingSides: '4 lados (c/u)',
                    material: `Melamina ${thick}mm`, thickness: thick,
                });
                if (doorWidth < LIMITS.slidingDoorMinWidth) {
                    warnings.push(`⚠️ Puerta corredera ${doorWidth}mm < mín ${LIMITS.slidingDoorMinWidth}mm`);
                }
            } else {
                const gap = LIMITS.drawerFrontGap;
                const autoDoorWidth = Math.round((W - (gap * (safeDoors - 1))) / safeDoors);
                const autoDoorHeight = bodyHeight;
                const doorWidth = customDoorWidth > 0 ? customDoorWidth : autoDoorWidth;
                const doorHeight = customDoorHeight > 0 ? customDoorHeight : autoDoorHeight;
                addPiece({
                    part: 'Puerta Abatible', qty: safeDoors,
                    width: doorWidth, height: doorHeight,
                    edgeBanding: (doorWidth + doorHeight) * 2 * safeDoors, edgeBandingSides: '4 lados (c/u)',
                    material: `Melamina ${thick}mm`, thickness: thick,
                });
                if (doorWidth > LIMITS.doorMaxWidth) {
                    warnings.push(`⚠️ Puerta abatible ${doorWidth}mm > máx ${LIMITS.doorMaxWidth}mm`);
                }
            }
        }

        // ═══ 7. TOTALS ═══
        let totalMelamineArea = 0;
        let totalBackingArea = 0;
        let totalEdgeBanding = 0;
        let totalPieces = 0;

        cutList.forEach(item => {
            const w = safePositive(item.width);
            const h = safePositive(item.height);
            totalPieces += item.qty;

            if (item.material && !item.material.includes('Metal')) {
                const area = (w * h * item.qty) / 1_000_000;
                if (item.thickness === 3 || item.material === 'MDF 3mm') {
                    totalBackingArea += area;
                } else {
                    totalMelamineArea += area;
                }
                if (item.edgeBanding) {
                    totalEdgeBanding += item.edgeBanding / 1000;
                }
            }
        });

        const boardsNeeded = Math.ceil(totalMelamineArea / STANDARD_BOARD.area);

        const materialCost = (totalMelamineArea * melaminePrice) +
            (totalEdgeBanding * edgeBandingPrice) +
            (totalBackingArea * backingPrice);

        return {
            cutList,
            totals: {
                melamineArea: parseFloat(totalMelamineArea.toFixed(2)),
                backingArea: parseFloat(totalBackingArea.toFixed(2)),
                edgeBanding: parseFloat(totalEdgeBanding.toFixed(2)),
                totalPieces,
                boardsNeeded,
                materialCost: Math.round(materialCost),
                cost: Math.round(materialCost),
            },
            warnings,
        };
    } catch (error) {
        console.error('Error crítico en cálculo:', error);
        return {
            cutList: [],
            totals: emptyTotals(),
            warnings: ['🚫 Error de cálculo: ' + error.message],
        };
    }
};

function emptyTotals() {
    return {
        melamineArea: 0, backingArea: 0, edgeBanding: 0,
        totalPieces: 0, boardsNeeded: 0, materialCost: 0, cost: 0,
    };
}
