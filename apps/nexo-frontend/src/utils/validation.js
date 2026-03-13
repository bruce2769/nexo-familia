/**
 * MueblePro Enterprise — Validación Estructural Industrial
 * Todas las unidades en milímetros (mm).
 */

// Límites de fabricación
export const LIMITS = {
    height: { min: 400, max: 2700, label: 'Altura' },
    width: { min: 300, max: 4000, label: 'Ancho' },
    depth: { min: 250, max: 900, label: 'Profundidad' },
    thickness: { allowed: [15, 18, 21], min: 9, max: 36 },
    shelfMaxSpan: 800,       // Repisa sin soporte máx 800mm antes de pandeo
    drawerMaxWidth: 900,     // Cajón máximo viable
    drawerMinHeight: 80,     // Cajón mínimo viable
    drawerMaxHeight: 400,    // Cajón máximo viable
    doorMaxWidth: 600,       // Puerta abatible máximo ancho
    slidingDoorMinWidth: 400,// Puerta corredera mínimo ancho
    plinthHeight: 70,        // Zócalo estándar
    plinthSetback: 50,       // Retranqueo del zócalo
    backPanelMargin: 4,      // Holgura fondo
    drawerClearance: 56,     // Luz para correderas telescópicas
    drawerFrontGap: 3,       // Luz por lado en frente cajón
    drawerDepthOffset: 50,   // Offset de profundidad cajón
    drawerSideReduction: 50, // Reducción lateral cajón
    barClearance: 5,         // Holgura soportes barra
};

// Tablero estándar
export const STANDARD_BOARD = {
    width: 2440,
    height: 1830,
    area: 2440 * 1830 / 1000000, // m²
};

// Espesores estándar de la industria
export const STANDARD_THICKNESSES = [15, 18, 21];

/**
 * Valida las dimensiones de un mueble.
 * Retorna un array de advertencias (vacío = OK).
 */
export const validateDimensions = (dimensions, thickness) => {
    const warnings = [];
    const { height, width, depth } = dimensions;
    const thick = typeof thickness === 'number' ? thickness : parseInt(thickness) || 18;

    // Dimensiones fuera de rango
    if (height < LIMITS.height.min) warnings.push(`⚠️ Altura ${height}mm < mínimo recomendado ${LIMITS.height.min}mm`);
    if (height > LIMITS.height.max) warnings.push(`🚫 Altura ${height}mm excede máximo estructural ${LIMITS.height.max}mm`);
    if (width < LIMITS.width.min) warnings.push(`⚠️ Ancho ${width}mm < mínimo funcional ${LIMITS.width.min}mm`);
    if (width > LIMITS.width.max) warnings.push(`⚠️ Ancho ${width}mm excede recomendado ${LIMITS.width.max}mm`);
    if (depth < LIMITS.depth.min) warnings.push(`🚫 Profundidad ${depth}mm < mínimo funcional ${LIMITS.depth.min}mm`);
    if (depth > LIMITS.depth.max) warnings.push(`⚠️ Profundidad ${depth}mm excede recomendado ${LIMITS.depth.max}mm`);

    // Espacio interno viable
    const internalW = width - 2 * thick;
    const internalH = height - LIMITS.plinthHeight - 2 * thick;
    if (internalW < 100) warnings.push(`🚫 Ancho interno ${internalW}mm insuficiente para estructura viable`);
    if (internalH < 200) warnings.push(`🚫 Alto interno ${internalH}mm insuficiente para estructura viable`);

    // Pieza excede tablero estándar
    if (depth > STANDARD_BOARD.width || (height - LIMITS.plinthHeight) > STANDARD_BOARD.height) {
        warnings.push(`⚠️ Algunas piezas pueden exceder el tablero estándar ${STANDARD_BOARD.width}x${STANDARD_BOARD.height}mm`);
    }

    return warnings;
};

/**
 * Valida una sección individual.
 */
export const validateSection = (sectionWidth, items, thickness) => {
    const warnings = [];
    const thick = typeof thickness === 'number' ? thickness : parseInt(thickness) || 18;

    // Pandeo de repisa
    if (items.shelves?.length > 0 && sectionWidth > LIMITS.shelfMaxSpan) {
        warnings.push(`⚠️ Repisa sin soporte en ${sectionWidth}mm. Riesgo de pandeo > ${LIMITS.shelfMaxSpan}mm`);
    }

    // Cajones demasiado anchos
    if (items.drawers?.length > 0 && sectionWidth > LIMITS.drawerMaxWidth) {
        warnings.push(`⚠️ Sección de ${sectionWidth}mm muy ancha para cajones (máx ${LIMITS.drawerMaxWidth}mm)`);
    }

    return warnings;
};

/**
 * Clamp seguro para dimensiones.
 */
export const clampDimension = (value, min, max) => {
    const v = parseInt(value, 10);
    if (isNaN(v)) return min;
    return Math.max(min, Math.min(max, v));
};

/**
 * Asegura que un valor numérico sea positivo y finito.
 */
export const safePositive = (val, fallback = 0) => {
    const n = typeof val === 'number' ? val : parseFloat(val);
    if (!isFinite(n) || n < 0) return fallback;
    return n;
};
