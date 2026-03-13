/**
 * MueblePro Enterprise — Cost Engine
 * Full manufacturing cost calculation with margins and profitability.
 */
import { safePositive, formatCurrency, STANDARD_BOARD, DEFAULT_COST_RATES } from '../core/constants.js';

/**
 * Calculate full manufacturing costs for a project.
 * @param {Object} cutListResults - Output from designEngine.generateCutList
 * @param {Object} costRates - Configurable cost parameters
 * @param {Object} dimensions - Cabinet dimensions
 * @returns {Object} Complete cost breakdown
 */
export const calculateCosts = (cutListResults, costRates = {}, dimensions = {}) => {
    const rates = { ...DEFAULT_COST_RATES, ...costRates };
    const totals = cutListResults?.totals || {};

    // ─── Material Costs ──────────────────────────
    const melamineArea = safePositive(totals.melamineArea);
    const backingArea = safePositive(totals.backingArea);
    const edgeBanding = safePositive(totals.edgeBanding);
    const boardsNeeded = safePositive(totals.boardsNeeded);

    const boardCost = melamineArea * safePositive(rates.boardPrice);
    const backingCost = backingArea * safePositive(rates.backingPrice || rates.boardPrice * 0.3);
    const edgeBandingCost = edgeBanding * safePositive(rates.edgeBandingPrice);
    const totalMaterialCost = boardCost + backingCost + edgeBandingCost;

    // ─── Hardware Costs ──────────────────────────
    const totalPieces = safePositive(totals.totalPieces);
    const hardwareUnits = Math.ceil(totalPieces / 5); // Estimate: 1 hardware kit per 5 pieces
    const hardwareCost = hardwareUnits * safePositive(rates.hardwareCostPerUnit);

    // ─── Labor Costs ─────────────────────────────
    const estimatedHours = safePositive(rates.estimatedHoursPerCabinet || 4);
    const laborRate = safePositive(rates.laborCostPerHour);
    const laborCost = estimatedHours * laborRate;

    // ─── Overhead ────────────────────────────────
    const subtotal = totalMaterialCost + hardwareCost + laborCost;
    const overheadPercent = safePositive(rates.overheadPercent) / 100;
    const overheadCost = subtotal * overheadPercent;

    // ─── Total Manufacturing Cost ────────────────
    const totalManufacturingCost = subtotal + overheadCost;

    // ─── Selling Price & Profit ──────────────────
    const profitMarginPercent = safePositive(rates.profitMarginPercent) / 100;
    const suggestedSellingPrice = totalManufacturingCost / (1 - profitMarginPercent);
    const profit = suggestedSellingPrice - totalManufacturingCost;
    const actualMarginPercent = suggestedSellingPrice > 0
        ? ((profit / suggestedSellingPrice) * 100)
        : 0;

    // ─── Per Linear Meter ────────────────────────
    const widthMeters = safePositive(dimensions.width) / 1000;
    const profitPerLinearMeter = widthMeters > 0 ? profit / widthMeters : 0;
    const revenuePerLinearMeter = widthMeters > 0 ? suggestedSellingPrice / widthMeters : 0;

    return {
        // Material breakdown
        boardCost: Math.round(boardCost),
        backingCost: Math.round(backingCost),
        edgeBandingCost: Math.round(edgeBandingCost),
        totalMaterialCost: Math.round(totalMaterialCost),

        // Hardware
        hardwareUnits,
        hardwareCost: Math.round(hardwareCost),

        // Labor
        estimatedHours,
        laborRate: Math.round(laborRate),
        laborCost: Math.round(laborCost),

        // Overhead
        overheadPercent: rates.overheadPercent,
        overheadCost: Math.round(overheadCost),

        // Totals
        subtotal: Math.round(subtotal),
        totalManufacturingCost: Math.round(totalManufacturingCost),

        // Selling & profit
        profitMarginPercent: rates.profitMarginPercent,
        suggestedSellingPrice: Math.round(suggestedSellingPrice),
        profit: Math.round(profit),
        actualMarginPercent: parseFloat(actualMarginPercent.toFixed(1)),

        // Per linear meter
        widthMeters: parseFloat(widthMeters.toFixed(2)),
        profitPerLinearMeter: Math.round(profitPerLinearMeter),
        revenuePerLinearMeter: Math.round(revenuePerLinearMeter),

        // Material quantities
        melamineArea,
        backingArea,
        edgeBanding,
        boardsNeeded,
        totalPieces,
    };
};
