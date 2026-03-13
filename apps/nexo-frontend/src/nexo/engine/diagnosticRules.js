export const diagnosticRules = [
    // ── Alimentos: Riesgos Financieros y Apremios ──
    {
        id: "utm_deuda_oculta",
        condition: (data) =>
            data.materia === "alimentos" &&
            data.sentencia === "si" &&
            data.moneda === "pesos" &&
            data.antiguedad === "antiguo",
        result: {
            riskLevel: "MEDIO",
            title: "Posible Deuda Oculta (Falta de Reajuste)",
            message: "Tu pensión fue fijada hace más de un año en pesos fijos. Según la ley chilena, debe reajustarse según IPC o Ingreso Mínimo. Aunque se pague el mismo monto todos los meses sin fallar, es muy probable que exista una deuda acumulada por reajustes no aplicados.",
            action: "Solicita una liquidación de deuda para calcular la deuda exacta por reajustes.",
            actionId: "liquidacion"
        }
    },
    {
        id: "incumplimiento_apremio",
        condition: (data) =>
            data.materia === "alimentos" &&
            data.rol === "demandante" &&
            data.pagos === "deuda" &&
            data.liquidacion === "liquidacion",
        result: {
            riskLevel: "ALTO",
            title: "Riesgo de Apremio Activable",
            message: "Existen pagos incumplidos y el tribunal ya practicó una liquidación oficial. Si el deudor no objeta en 3 días hábiles, la liquidación queda firme y procesalmente lista para solicitar medidas de fuerza (apremios).",
            action: "Solicitar apercibimiento y medidas de apremio (arresto, arraigo, retención).",
            actionId: "incumplimiento"
        }
    },
    {
        id: "apremio_urgente_demandado",
        condition: (data) =>
            data.rol === "demandado" &&
            data.liquidacion === "apremio",
        result: {
            riskLevel: "ALTO",
            title: "Orden de Apremio/Arresto Activa",
            message: "El tribunal ha dictado orden de apremio en tu contra. Esto puede significar arresto nocturno, arraigo nacional o retención policial. Tu libertad de movimiento está en riesgo inminente.",
            action: "Pagar la deuda inmediatamente, proponer una fórmula de pago al tribunal o presentar un escrito de descargo urgente si la deuda es errónea.",
            actionId: "apremio_defensa"
        }
    },
    {
        id: "retencion_empleador",
        condition: (data) =>
            data.materia === "alimentos" &&
            data.rol === "demandante" &&
            data.pagos === "deuda" &&
            data.retencion === "no",
        result: {
            riskLevel: "MEDIO",
            title: "Posibilidad de Retención por Planilla",
            message: "Hay deuda acumulada y no existe orden de retención al empleador. Si la contraparte tiene contrato formal de trabajo, la ley permite que la pensión se descuente automáticamente de su sueldo mensual.",
            action: "Ingresar escrito solicitando retención de pensión al empleador.",
            actionId: "retencion"
        }
    },
    {
        id: "rebaja_pension_posible",
        condition: (data) =>
            data.rol === "demandado" &&
            data.antiguedad === "antiguo" &&
            data.pagos === "aldia",
        result: {
            riskLevel: "BAJO",
            title: "Evaluación de Rebaja de Pensión",
            message: "Llevas más de un año cumpliendo al día. Si tu situación económica ha cambiado significativamente para peor, o tienes nuevas cargas familiares legales, podrías solicitar judicialmente una rebaja de la pensión actual.",
            action: "Evaluar interponer demanda de rebaja de alimentos.",
            actionId: "rebaja"
        }
    },

    // ── Etapa Inicial ──
    {
        id: "causa_en_tramite",
        condition: (data) => data.sentencia === "no",
        result: {
            riskLevel: "BAJO",
            title: "Causa en Trámite / Sin Regla Definitiva",
            message: "Aún no hay una sentencia o acuerdo de mediación aprobado. El proceso sigue desarrollándose. En este punto se deben estar juntando pruebas, asistiendo a audiencias o esperando el fallo del juez.",
            action: "Monitorear el estado de las notificaciones y fechas de próximas audiencias.",
            actionId: "seguimiento"
        }
    },

    // ── Cumplimiento Regular ──
    {
        id: "cumplimiento_regular_demandante",
        condition: (data) => data.rol === "demandante" && data.sentencia === "si" && data.pagos === "aldia" && data.liquidacion === "no",
        result: {
            riskLevel: "BAJO",
            title: "Cumplimiento Regular Normativo",
            message: "El régimen parece estarse cumpliendo adecuadamente. No se requieren acciones legales urgentes en este momento.",
            action: "Mantener seguimiento regular.",
            actionId: "seguimiento"
        }
    }
];
