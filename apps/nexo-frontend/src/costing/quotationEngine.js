/**
 * MueblePro Enterprise — Quotation Engine
 * Generates professional quotation data structures.
 */
import { generateId, formatCurrency } from '../core/constants.js';

/**
 * Create a quotation from project data and cost calculations.
 * @param {Object} params
 * @returns {Object} Quotation data structure
 */
export const createQuotation = ({
    projectName = '',
    clientName = '',
    clientPhone = '',
    clientEmail = '',
    notes = '',
    dimensions = {},
    materials = {},
    cabinetType = 'closet',
    cutListResults = {},
    costData = {},
    validDays = 15,
}) => {
    const quotationNumber = `COT-${Date.now().toString(36).toUpperCase()}`;
    const today = new Date();
    const expirationDate = new Date(today);
    expirationDate.setDate(expirationDate.getDate() + validDays);

    return {
        id: generateId(),
        quotationNumber,
        createdAt: today.toISOString(),
        expiresAt: expirationDate.toISOString(),
        validDays,

        // Client
        client: {
            name: clientName,
            phone: clientPhone,
            email: clientEmail,
        },

        // Project
        project: {
            name: projectName,
            cabinetType,
            dimensions: { ...dimensions },
            materials: {
                thickness: materials.thickness,
                doorType: materials.doorType,
                backing: materials.isMelamineBacking ? 'Melamina' : 'MDF 3mm',
            },
        },

        // Materials summary
        materialsSummary: {
            melamineArea: cutListResults.totals?.melamineArea || 0,
            backingArea: cutListResults.totals?.backingArea || 0,
            edgeBanding: cutListResults.totals?.edgeBanding || 0,
            boardsNeeded: cutListResults.totals?.boardsNeeded || 0,
            totalPieces: cutListResults.totals?.totalPieces || 0,
        },

        // Price breakdown
        priceBreakdown: {
            materialCost: costData.totalMaterialCost || 0,
            hardwareCost: costData.hardwareCost || 0,
            laborCost: costData.laborCost || 0,
            overheadCost: costData.overheadCost || 0,
            subtotal: costData.totalManufacturingCost || 0,
        },

        // Final price
        finalPrice: costData.suggestedSellingPrice || 0,
        profitMargin: costData.actualMarginPercent || 0,
        notes,
        status: 'pending', // pending | accepted | rejected
    };
};

/**
 * Format quotation for display.
 */
export const formatQuotationSummary = (quotation) => {
    if (!quotation) return null;
    return {
        number: quotation.quotationNumber,
        date: new Date(quotation.createdAt).toLocaleDateString('es-CO'),
        expires: new Date(quotation.expiresAt).toLocaleDateString('es-CO'),
        client: quotation.client.name || 'Sin cliente',
        total: formatCurrency(quotation.finalPrice),
        status: quotation.status,
    };
};
