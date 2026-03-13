/**
 * MueblePro Enterprise — Motor de Cálculo Industrial
 * Sistema métrico unificado: milímetros (mm)
 * 
 * Calcula lista de corte completa para fabricación real:
 * - Estructura (laterales, tapa, piso)
 * - Zócalo
 * - Divisiones verticales
 * - Repisas, cajones, barras, divisores internos
 * - Puertas (abatibles o correderas)
 * - Fondo (MDF 3mm o melamina)
 * - Totales de material, cantoneado y costos
 */

import { LIMITS, STANDARD_BOARD, safePositive } from './validation.js';

/**
 * Calcula la lista de corte completa.
 * @param {Object} dimensions - { height, width, depth } en mm
 * @param {Object} materials - { thickness, melaminePrice, edgeBandingPrice, backingPrice, isMelamineBacking, doorType }
 * @param {Object} layout - { dividers: [], sections: {} }
 * @param {number} totalDoors - Cantidad de puertas
 * @returns {{ cutList: Array, totals: Object, warnings: string[] }}
 */
export const calculateCutList = (dimensions, materials, layout, totalDoors = 0) => {
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
    const doorType = materials.doorType || 'swing'; // 'swing' | 'sliding'

    const warnings = [];

    try {
        const cutList = [];

        // --- Helper para agrupar piezas idénticas ---
        const addPiece = (piece) => {
            // Validar medidas positivas
            if (piece.width <= 0 || piece.height <= 0) {
                warnings.push(`⚠️ Pieza "${piece.part}" con medida ≤ 0 omitida`);
                return;
            }

            // Advertir si excede tablero estándar
            const maxDim = Math.max(piece.width, piece.height);
            const minDim = Math.min(piece.width, piece.height);
            if (maxDim > STANDARD_BOARD.width || minDim > STANDARD_BOARD.height) {
                piece.warning = '⚠️ Excede tablero estándar';
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

        // --- CONSTANTES ---
        const PLINTH_H = LIMITS.plinthHeight;
        const PLINTH_SETBACK = LIMITS.plinthSetback;
        const bodyHeight = H - PLINTH_H;
        const internalWidth = W - (2 * thick);
        const internalHeight = bodyHeight - (2 * thick);

        // Validaciones estructurales
        if (internalWidth <= 0) {
            return { cutList: [], totals: emptyTotals(), warnings: ['🚫 Ancho interno negativo. El espesor es mayor que el ancho.'] };
        }
        if (internalHeight <= 0) {
            return { cutList: [], totals: emptyTotals(), warnings: ['🚫 Alto interno negativo. Ajuste las dimensiones.'] };
        }

        // ═══════════════════════════════
        // 1. ZÓCALO
        // ═══════════════════════════════
        addPiece({
            part: 'Zócalo (Frente/Trasero)', qty: 2,
            width: W, height: PLINTH_H,
            edgeBanding: W * 2, // Canto en frente de ambas piezas
            material: `Melamina ${thick}mm`
        });

        const plinthCrossWidth = D - PLINTH_SETBACK - (2 * thick);
        if (plinthCrossWidth > 0) {
            addPiece({
                part: 'Zócalo (Traviesas)', qty: 2,
                width: plinthCrossWidth, height: PLINTH_H,
                edgeBanding: 0,
                material: `Melamina ${thick}mm`
            });
        }

        // ═══════════════════════════════
        // 2. ESTRUCTURA PRINCIPAL
        // ═══════════════════════════════

        // Laterales (alto completo del cuerpo)
        addPiece({
            part: 'Laterales', qty: 2,
            width: D, height: bodyHeight,
            edgeBanding: bodyHeight * 2, // Canto en borde frontal de cada lateral
            material: `Melamina ${thick}mm`
        });

        // Tapa superior y Piso
        addPiece({
            part: 'Tapa Superior', qty: 1,
            width: internalWidth, height: D,
            edgeBanding: internalWidth, // Canto solo en frente
            material: `Melamina ${thick}mm`
        });

        addPiece({
            part: 'Piso', qty: 1,
            width: internalWidth, height: D,
            edgeBanding: internalWidth,
            material: `Melamina ${thick}mm`
        });

        // ═══════════════════════════════
        // 3. DIVISIONES VERTICALES
        // ═══════════════════════════════
        const dividers = layout.dividers || [];
        if (dividers.length > 0) {
            addPiece({
                part: 'Divisiones Verticales', qty: dividers.length,
                width: D, height: internalHeight,
                edgeBanding: internalHeight * dividers.length, // Canto frontal c/u
                material: `Melamina ${thick}mm`
            });
        }

        // ═══════════════════════════════
        // 4. CONTENIDO POR SECCIÓN
        // ═══════════════════════════════
        const sortedDividers = [...dividers].sort((a, b) => a - b);
        const numSections = sortedDividers.length + 1;

        for (let i = 0; i < numSections; i++) {
            // Calcular ancho exacto de la sección (respetando espesor de divisores)
            const sectionStart = i === 0 ? 0 : sortedDividers[i - 1] + thick / 2;
            const sectionEnd = i < sortedDividers.length ? sortedDividers[i] - thick / 2 : internalWidth;
            const sectionW = Math.max(0, sectionEnd - sectionStart);

            if (sectionW <= 0) continue;

            const section = layout.sections[i] || {};

            // Pandeo de repisa
            if (sectionW > LIMITS.shelfMaxSpan && section.shelves?.length > 0) {
                warnings.push(`⚠️ Sección ${i + 1}: repisa de ${Math.round(sectionW)}mm sin soporte (riesgo de pandeo > ${LIMITS.shelfMaxSpan}mm)`);
            }

            // --- REPISAS ---
            if (section.shelves?.length > 0) {
                section.shelves.forEach(s => {
                    addPiece({
                        part: 'Repisa', qty: 1,
                        width: sectionW, height: s.depth || D,
                        edgeBanding: sectionW, // Canto solo en frente
                        material: `Melamina ${thick}mm`,
                        sourceId: s.id
                    });
                });
            }

            // --- CAJONES ---
            if (section.drawers?.length > 0) {
                section.drawers.forEach(d => {
                    const h = d.height || 200;
                    const GAP = LIMITS.drawerFrontGap;
                    const CLEARANCE = LIMITS.drawerClearance;
                    const DEPTH_OFF = LIMITS.drawerDepthOffset;
                    const SIDE_RED = LIMITS.drawerSideReduction;

                    // 1. Frente visible del cajón
                    const frontW = sectionW - (GAP * 2);
                    if (frontW > 0) {
                        addPiece({
                            part: 'Frente Cajón', qty: 1,
                            width: frontW, height: h,
                            edgeBanding: (frontW + h) * 2, // 4 cantos
                            material: `Melamina ${thick}mm`,
                            sourceId: d.id
                        });
                    }

                    // 2. Laterales del cajón
                    const sideD = D - DEPTH_OFF;
                    const sideH = h - SIDE_RED;
                    if (sideD > 0 && sideH > 0) {
                        addPiece({
                            part: 'Lateral Cajón', qty: 2,
                            width: sideD, height: sideH,
                            edgeBanding: sideD * 2, // Canto superior de ambos
                            material: `Melamina ${thick}mm`,
                            sourceId: d.id
                        });
                    }

                    // 3. Trasera y frente interno
                    const internalW = sectionW - CLEARANCE;
                    if (internalW > 0 && sideH > 0) {
                        addPiece({
                            part: 'Trasera/Frente Interno Cajón', qty: 2,
                            width: internalW, height: sideH,
                            edgeBanding: internalW * 2, // Canto superior
                            material: `Melamina ${thick}mm`,
                            sourceId: d.id
                        });
                    }

                    // 4. Fondo cajón (MDF 3mm)
                    if (sideD > 0 && internalW > 0) {
                        addPiece({
                            part: 'Fondo Cajón', qty: 1,
                            width: internalW, height: sideD,
                            thickness: 3,
                            edgeBanding: 0,
                            material: 'MDF 3mm',
                            sourceId: d.id
                        });
                    }
                });
            }

            // --- BARRAS ---
            if (section.bars?.length > 0) {
                section.bars.forEach(b => {
                    addPiece({
                        part: 'Barra Colgador', qty: 1,
                        width: sectionW - LIMITS.barClearance,
                        height: 30, // Diámetro estándar
                        material: 'Metal (tubo)',
                        edgeBanding: 0,
                        sourceId: b.id
                    });
                });
            }

            // --- DIVISORES INTERNOS (PARCIALES) ---
            if (section.partialDividers?.length > 0) {
                section.partialDividers.forEach(pd => {
                    const pdHeight = Math.max(0, (pd.endY || 0) - (pd.startY || 0));
                    if (pdHeight > 0) {
                        addPiece({
                            part: 'División Interna', qty: 1,
                            width: D, height: pdHeight,
                            edgeBanding: pdHeight, // Canto frontal
                            material: `Melamina ${thick}mm`,
                            sourceId: pd.id
                        });
                    }
                });
            }
        }

        // ═══════════════════════════════
        // 5. FONDO TRASERO
        // ═══════════════════════════════
        const backW = W - LIMITS.backPanelMargin;
        const backH = bodyHeight - LIMITS.backPanelMargin;

        if (materials.isMelamineBacking) {
            addPiece({
                part: 'Fondo (Melamina)', qty: 1,
                width: backW, height: backH,
                thickness: thick,
                edgeBanding: 0,
                material: `Melamina ${thick}mm`
            });
        } else {
            addPiece({
                part: 'Fondo (MDF 3mm)', qty: 1,
                width: backW, height: backH,
                thickness: 3,
                edgeBanding: 0,
                material: 'MDF 3mm'
            });
        }

        // ═══════════════════════════════
        // 6. PUERTAS
        // ═══════════════════════════════
        if (totalDoors && totalDoors > 0) {
            const safeDoors = Math.max(1, parseInt(totalDoors));

            // Usar dimensiones personalizadas si fueron proporcionadas por el usuario
            const customDoorWidth = parseInt(materials.doorWidth) || 0;
            const customDoorHeight = parseInt(materials.doorHeight) || 0;

            if (doorType === 'sliding') {
                // Puertas correderas: se superponen, cada una cubre la mitad + solape
                const autoDoorWidth = Math.round(W / safeDoors + 30); // 30mm solape
                const autoDoorHeight = bodyHeight - 10; // Holgura riel
                const doorWidth = customDoorWidth > 0 ? customDoorWidth : autoDoorWidth;
                const doorHeight = customDoorHeight > 0 ? customDoorHeight : autoDoorHeight;

                addPiece({
                    part: `Puerta Corredera`, qty: safeDoors,
                    width: doorWidth, height: doorHeight,
                    edgeBanding: (doorWidth + doorHeight) * 2 * safeDoors, // 4 cantos c/u
                    material: `Melamina ${thick}mm`
                });

                if (doorWidth < LIMITS.slidingDoorMinWidth) {
                    warnings.push(`⚠️ Puertas correderas de ${doorWidth}mm < mínimo recomendado ${LIMITS.slidingDoorMinWidth}mm`);
                }
            } else {
                // Puertas abatibles
                const gap = LIMITS.drawerFrontGap;
                const autoDoorWidth = Math.round((W - (gap * (safeDoors - 1))) / safeDoors);
                const autoDoorHeight = bodyHeight;
                const doorWidth = customDoorWidth > 0 ? customDoorWidth : autoDoorWidth;
                const doorHeight = customDoorHeight > 0 ? customDoorHeight : autoDoorHeight;

                addPiece({
                    part: `Puerta Abatible`, qty: safeDoors,
                    width: doorWidth, height: doorHeight,
                    edgeBanding: (doorWidth + doorHeight) * 2 * safeDoors,
                    material: `Melamina ${thick}mm`
                });

                if (doorWidth > LIMITS.doorMaxWidth) {
                    warnings.push(`⚠️ Puerta abatible de ${doorWidth}mm > máximo recomendado ${LIMITS.doorMaxWidth}mm`);
                }
            }
        }

        // ═══════════════════════════════
        // 7. CÁLCULO DE TOTALES
        // ═══════════════════════════════
        let totalMelamineArea = 0;
        let totalBackingArea = 0;
        let totalEdgeBanding = 0;
        let totalPieces = 0;

        cutList.forEach(item => {
            const w = safePositive(item.width);
            const h = safePositive(item.height);
            totalPieces += item.qty;

            if (item.material && !item.material.includes('Metal')) {
                const area = (w * h * item.qty) / 1_000_000; // mm² → m²

                if (item.thickness === 3 || item.material === 'MDF 3mm') {
                    totalBackingArea += area;
                } else {
                    totalMelamineArea += area;
                }

                if (item.edgeBanding) {
                    totalEdgeBanding += item.edgeBanding / 1000; // mm → ml
                }
            }
        });

        // Número mínimo de planchas
        const boardsNeeded = Math.ceil(totalMelamineArea / STANDARD_BOARD.area);

        // Costos
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
                cost: Math.round(materialCost) // Compat
            },
            warnings
        };

    } catch (error) {
        console.error('Error crítico en cálculo:', error);
        return {
            cutList: [],
            totals: emptyTotals(),
            warnings: ['🚫 Error de cálculo geométrico: ' + error.message]
        };
    }
};

function emptyTotals() {
    return {
        melamineArea: 0, backingArea: 0, edgeBanding: 0,
        totalPieces: 0, boardsNeeded: 0, materialCost: 0, cost: 0
    };
}
