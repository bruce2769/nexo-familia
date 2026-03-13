// calculateRiskScore returns a score from 0 to 100 based on the given diagnostic form context.
export function calculateRiskScore(data) {
    let score = 0;

    // 1. Sentencia Status
    if (data.sentencia === "si") score += 10;

    // 2. Pagos / Incumplimientos
    if (data.pagos === "deuda") {
        // If debt exists, it heavily affects the score
        score += data.rol === "demandante" ? 30 : 40;
    }

    // 3. Liquidación y Apremios
    if (data.liquidacion === "liquidacion") {
        score += 25;
    } else if (data.liquidacion === "apremio") {
        score += 50; // Critical danger
    }

    // 4. Deuda Oculta (Pesos vs UTM)
    if (data.materia === "alimentos" && data.moneda === "pesos" && data.antiguedad === "antiguo") {
        score += 15;
    }

    // 5. Mitigating factors
    if (data.rol === "demandante" && data.retencion === "si") {
        score -= 10;
    }
    if (data.pagos === "aldia") {
        score -= 20;
    }

    // Bound score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // Determine Level Status
    let level = "VERDE";
    if (score > 60) level = "ROJO";
    else if (score >= 30) level = "AMARILLO";

    return { score, level };
}
