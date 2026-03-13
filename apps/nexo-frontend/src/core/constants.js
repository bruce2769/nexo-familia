/**
 * MueblePro Enterprise — Core Constants
 * All units in millimeters (mm) unless otherwise specified.
 */

// ═══════════════════════════════════════════════
// STANDARD BOARD
// ═══════════════════════════════════════════════
export const STANDARD_BOARD = {
    width: 2440,
    height: 1830,
    area: (2440 * 1830) / 1_000_000, // m²
};

// ═══════════════════════════════════════════════
// MATERIALS
// ═══════════════════════════════════════════════
export const STANDARD_THICKNESSES = [15, 18, 21];

export const CABINET_TYPES = {
    CLOSET: 'closet',
    BASE_CABINET: 'base_cabinet',
    WALL_CABINET: 'wall_cabinet',
    SHELVING: 'shelving',
};

export const CABINET_TYPE_LABELS = {
    [CABINET_TYPES.CLOSET]: 'Closet / Armario',
    [CABINET_TYPES.BASE_CABINET]: 'Mueble Bajo',
    [CABINET_TYPES.WALL_CABINET]: 'Mueble Aéreo',
    [CABINET_TYPES.SHELVING]: 'Estantería',
};

// ═══════════════════════════════════════════════
// MANUFACTURING LIMITS
// ═══════════════════════════════════════════════
export const LIMITS = {
    height: { min: 200, max: 2700, label: 'Altura' },
    width: { min: 200, max: 4000, label: 'Ancho' },
    depth: { min: 150, max: 900, label: 'Profundidad' },
    thickness: { allowed: [15, 18, 21], min: 9, max: 36 },
    shelfMaxSpan: 800,
    drawerMaxWidth: 900,
    drawerMinHeight: 80,
    drawerMaxHeight: 400,
    doorMaxWidth: 600,
    slidingDoorMinWidth: 400,
    plinthHeight: 70,
    plinthSetback: 50,
    backPanelMargin: 4,
    drawerClearance: 56,
    drawerFrontGap: 3,
    drawerDepthOffset: 50,
    drawerSideReduction: 50,
    barClearance: 5,
};

// ═══════════════════════════════════════════════
// CABINET TYPE DEFAULTS
// ═══════════════════════════════════════════════
export const CABINET_DEFAULTS = {
    [CABINET_TYPES.CLOSET]: {
        height: 2350, width: 2100, depth: 600,
        hasPlinth: true, hasBack: true, hasDoors: true,
    },
    [CABINET_TYPES.BASE_CABINET]: {
        height: 870, width: 600, depth: 560,
        hasPlinth: true, hasBack: true, hasDoors: true,
    },
    [CABINET_TYPES.WALL_CABINET]: {
        height: 700, width: 600, depth: 330,
        hasPlinth: false, hasBack: true, hasDoors: true,
    },
    [CABINET_TYPES.SHELVING]: {
        height: 1800, width: 800, depth: 300,
        hasPlinth: false, hasBack: true, hasDoors: false,
    },
};

// ═══════════════════════════════════════════════
// DEFAULT COST RATES
// ═══════════════════════════════════════════════
export const DEFAULT_COST_RATES = {
    boardPrice: 25000,        // per m²
    hardwareCostPerUnit: 5000,
    laborCostPerHour: 15000,
    edgeBandingPrice: 1500,   // per ml
    backingPrice: 8000,       // per m²
    overheadPercent: 15,
    profitMarginPercent: 35,
    estimatedHoursPerCabinet: 4,
};

// ═══════════════════════════════════════════════
// DEFAULT MATERIALS
// ═══════════════════════════════════════════════
export const DEFAULT_MATERIALS = {
    thickness: 18,
    melaminePrice: 25000,
    edgeBandingPrice: 1500,
    backingPrice: 8000,
    isMelamineBacking: false,
    doorType: 'swing',
};

// ═══════════════════════════════════════════════
// DEFAULT INVENTORY
// ═══════════════════════════════════════════════
export const DEFAULT_INVENTORY = {
    boards: { qty: 20, minStock: 5, label: 'Planchas Melamina', unit: 'und' },
    hardwareKits: { qty: 50, minStock: 10, label: 'Kits Herrajes', unit: 'und' },
    edgeBanding: { qty: 200, minStock: 30, label: 'Cantoneado', unit: 'ml' },
    mdfBacking: { qty: 10, minStock: 3, label: 'MDF 3mm Fondos', unit: 'und' },
    hinges: { qty: 100, minStock: 20, label: 'Bisagras', unit: 'und' },
    drawerSlides: { qty: 30, minStock: 10, label: 'Correderas Cajón', unit: 'par' },
    screws: { qty: 500, minStock: 100, label: 'Tornillos', unit: 'und' },
    handles: { qty: 40, minStock: 10, label: 'Tiradores', unit: 'und' },
};

// ═══════════════════════════════════════════════
// WORK ORDER STATUS
// ═══════════════════════════════════════════════
export const WO_STATUS = {
    DRAFT: 'draft',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

export const WO_STATUS_LABELS = {
    [WO_STATUS.DRAFT]: 'Borrador',
    [WO_STATUS.CONFIRMED]: 'Confirmada',
    [WO_STATUS.IN_PROGRESS]: 'En Producción',
    [WO_STATUS.COMPLETED]: 'Completada',
    [WO_STATUS.CANCELLED]: 'Cancelada',
};

// ═══════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════
export const generateId = () => Math.random().toString(36).substr(2, 9);

export const safePositive = (val, fallback = 0) => {
    const n = typeof val === 'number' ? val : parseFloat(val);
    if (!isFinite(n) || n < 0) return fallback;
    return n;
};

export const clampDimension = (value, min, max) => {
    const v = parseInt(value, 10);
    if (isNaN(v)) return min;
    return Math.max(min, Math.min(max, v));
};

export const formatCurrency = (n) => {
    if (!isFinite(n)) return '$0';
    return '$' + Math.round(n).toLocaleString('es-CO');
};

export const formatNumber = (n, decimals = 2) => {
    if (!isFinite(n)) return '0';
    return Number(n).toFixed(decimals);
};
