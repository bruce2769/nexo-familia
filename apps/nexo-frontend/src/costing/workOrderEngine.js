/**
 * MueblePro Enterprise — Work Order Engine
 * Generates production work orders for factory floor operations.
 */
import { generateId, WO_STATUS } from '../core/constants.js';

/**
 * Create a work order from project data.
 * @param {Object} params
 * @returns {Object} Work order data structure
 */
export const createWorkOrder = ({
    projectId = '',
    projectName = '',
    cutListResults = {},
    optimizationResult = null,
    costData = {},
    dimensions = {},
    materials = {},
    cabinetType = 'closet',
    notes = '',
    priority = 'normal', // low | normal | high | urgent
}) => {
    const woNumber = `OT-${Date.now().toString(36).toUpperCase()}`;
    const today = new Date();

    // Gather hardware list
    const hardwareList = generateHardwareList(cutListResults, materials, dimensions);

    // Assembly notes
    const assemblyNotes = generateAssemblyNotes(cabinetType, materials, dimensions, notes);

    return {
        id: generateId(),
        woNumber,
        projectId,
        projectName,
        createdAt: today.toISOString(),
        status: WO_STATUS.DRAFT,
        priority,

        // Cut list summary
        cutList: (cutListResults.cutList || []).map(item => ({
            part: item.part,
            qty: item.qty,
            width: Math.round(item.width),
            height: Math.round(item.height),
            material: item.material,
            thickness: item.thickness || parseInt(materials.thickness) || 18,
            edgeBandingSides: item.edgeBandingSides || 'N/A',
        })),

        // Board count
        boardCount: {
            melamine: cutListResults.totals?.boardsNeeded || 0,
            mdf: cutListResults.cutList?.filter(i => i.material === 'MDF 3mm').length > 0 ? 1 : 0,
        },

        // Optimization data
        optimization: optimizationResult ? {
            totalBoards: optimizationResult.stats?.totalBoards || 0,
            efficiency: optimizationResult.stats?.globalEfficiency || 0,
            wasteM2: optimizationResult.stats?.totalWasteM2 || 0,
        } : null,

        // Hardware
        hardwareList,

        // Assembly
        assemblyNotes,

        // Dimensions
        dimensions: { ...dimensions },
        materials: {
            thickness: materials.thickness,
            doorType: materials.doorType,
            backing: materials.isMelamineBacking ? 'Melamina' : 'MDF 3mm',
        },

        // Cost reference
        estimatedCost: costData.totalManufacturingCost || 0,
    };
};

/**
 * Generate hardware requirements list based on cut list.
 */
function generateHardwareList(cutListResults, materials, dimensions) {
    const cutList = cutListResults.cutList || [];
    const hardware = [];

    // Count doors
    const doorParts = cutList.filter(i => i.part.includes('Puerta'));
    const doorCount = doorParts.reduce((sum, p) => sum + p.qty, 0);

    if (doorCount > 0) {
        if (materials.doorType === 'sliding') {
            hardware.push({ item: 'Riel Corredera Superior', qty: 1, unit: 'und' });
            hardware.push({ item: 'Riel Corredera Inferior', qty: 1, unit: 'und' });
            hardware.push({ item: 'Guías Corredera', qty: doorCount * 2, unit: 'und' });
        } else {
            hardware.push({ item: 'Bisagras (35mm)', qty: doorCount * 3, unit: 'und' });
            hardware.push({ item: 'Tiradores de Puerta', qty: doorCount, unit: 'und' });
        }
    }

    // Count drawers
    const drawerParts = cutList.filter(i => i.part.includes('Frente Cajón'));
    const drawerCount = drawerParts.reduce((sum, p) => sum + p.qty, 0);

    if (drawerCount > 0) {
        hardware.push({ item: 'Correderas Telescópicas', qty: drawerCount, unit: 'par' });
        hardware.push({ item: 'Tiradores de Cajón', qty: drawerCount, unit: 'und' });
    }

    // Count bars
    const barParts = cutList.filter(i => i.part.includes('Barra'));
    const barCount = barParts.reduce((sum, p) => sum + p.qty, 0);

    if (barCount > 0) {
        hardware.push({ item: 'Soportes de Barra', qty: barCount * 2, unit: 'und' });
    }

    // General
    hardware.push({ item: 'Tornillos Confirmat', qty: Math.max(20, Math.ceil(cutList.length * 4)), unit: 'und' });
    hardware.push({ item: 'Tornillos 4x30mm', qty: 20, unit: 'und' });
    hardware.push({ item: 'Tapones plásticos', qty: Math.max(10, Math.ceil(cutList.length * 2)), unit: 'und' });
    hardware.push({ item: 'Soportes de Repisa', qty: cutList.filter(i => i.part === 'Repisa').reduce((s, p) => s + p.qty, 0) * 4, unit: 'und' });

    return hardware.filter(h => h.qty > 0);
}

/**
 * Generate assembly notes.
 */
function generateAssemblyNotes(cabinetType, materials, dimensions, userNotes) {
    const notes = [];
    const thick = parseInt(materials.thickness) || 18;

    notes.push(`Tipo: ${cabinetType.replace('_', ' ')} | Espesor: ${thick}mm`);
    notes.push(`Dimensiones: ${dimensions.height}H × ${dimensions.width}A × ${dimensions.depth}P mm`);
    notes.push(`Fondo: ${materials.isMelamineBacking ? 'Melamina ' + thick + 'mm' : 'MDF 3mm'}`);

    if (materials.doorType === 'sliding') {
        notes.push('Puertas correderas: instalar rieles antes de montar tapa');
    }

    notes.push('1. Ensamblar estructura principal (laterales + tapa + piso)');
    notes.push('2. Instalar divisiones verticales');
    notes.push('3. Colocar fondo trasero');
    notes.push('4. Instalar repisas y barras');
    notes.push('5. Montar cajones (correderas primero)');
    notes.push('6. Instalar puertas y tiradores');
    notes.push('7. Verificar nivelación y ajustar');

    if (userNotes) {
        notes.push('--- Notas adicionales ---');
        notes.push(userNotes);
    }

    return notes;
}

/**
 * Update work order status.
 */
export const updateWorkOrderStatus = (workOrder, newStatus) => {
    if (!workOrder) return null;
    return {
        ...workOrder,
        status: newStatus,
        updatedAt: new Date().toISOString(),
    };
};
