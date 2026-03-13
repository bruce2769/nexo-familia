/**
 * MueblePro Enterprise — Inventory Manager
 * Stock tracking with auto-deduction and low-stock alerts.
 */
import { DEFAULT_INVENTORY } from '../core/constants.js';

/**
 * Check low stock alerts.
 * @param {Object} inventory - Current inventory state
 * @returns {Array} List of low-stock alerts
 */
export const checkLowStock = (inventory) => {
    const alerts = [];
    Object.entries(inventory).forEach(([key, item]) => {
        if (item.qty <= item.minStock) {
            alerts.push({
                key,
                label: item.label,
                currentQty: item.qty,
                minStock: item.minStock,
                unit: item.unit,
                critical: item.qty === 0,
            });
        }
    });
    return alerts;
};

/**
 * Calculate materials needed for a project (for auto-deduction).
 * @param {Object} cutListResults - From designEngine
 * @param {Object} costData - From costEngine
 * @returns {Object} Deduction amounts keyed to inventory items
 */
export const calculateDeductions = (cutListResults, costData) => {
    const totals = cutListResults?.totals || {};
    const deductions = {};

    // Boards
    const boardsNeeded = totals.boardsNeeded || 0;
    if (boardsNeeded > 0) deductions.boards = boardsNeeded;

    // Edge banding (in ml)
    const edgeBanding = totals.edgeBanding || 0;
    if (edgeBanding > 0) deductions.edgeBanding = Math.ceil(edgeBanding);

    // MDF Backing
    const hasBackingParts = (cutListResults.cutList || []).some(i => i.material === 'MDF 3mm');
    if (hasBackingParts) deductions.mdfBacking = 1;

    // Hardware estimates
    const cutList = cutListResults.cutList || [];
    const doorCount = cutList.filter(i => i.part.includes('Puerta')).reduce((s, p) => s + p.qty, 0);
    const drawerCount = cutList.filter(i => i.part.includes('Frente Cajón')).reduce((s, p) => s + p.qty, 0);

    if (doorCount > 0) {
        deductions.hinges = doorCount * 3;
        deductions.handles = doorCount;
    }
    if (drawerCount > 0) {
        deductions.drawerSlides = drawerCount;
        deductions.handles = (deductions.handles || 0) + drawerCount;
    }

    // Screws (estimate)
    const totalPieces = totals.totalPieces || 0;
    deductions.screws = Math.max(20, totalPieces * 4);

    return deductions;
};

/**
 * Validate that inventory has enough stock for deductions.
 * @param {Object} inventory - Current stock
 * @param {Object} deductions - Required deductions
 * @returns {{ canProceed: boolean, shortages: Array }}
 */
export const validateStock = (inventory, deductions) => {
    const shortages = [];

    Object.entries(deductions).forEach(([key, needed]) => {
        const available = inventory[key]?.qty || 0;
        if (needed > available) {
            shortages.push({
                key,
                label: inventory[key]?.label || key,
                needed,
                available,
                deficit: needed - available,
                unit: inventory[key]?.unit || 'und',
            });
        }
    });

    return {
        canProceed: shortages.length === 0,
        shortages,
    };
};

/**
 * Generate inventory report.
 */
export const getInventoryReport = (inventory) => {
    const items = Object.entries(inventory).map(([key, item]) => ({
        key,
        label: item.label,
        qty: item.qty,
        minStock: item.minStock,
        unit: item.unit,
        status: item.qty === 0 ? 'empty' : item.qty <= item.minStock ? 'low' : 'ok',
        stockPercent: item.minStock > 0 ? Math.round((item.qty / (item.minStock * 3)) * 100) : 100,
    }));

    return {
        items,
        totalAlerts: items.filter(i => i.status !== 'ok').length,
        criticalItems: items.filter(i => i.status === 'empty').length,
    };
};
