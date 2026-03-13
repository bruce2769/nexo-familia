import { diagnosticRules } from './diagnosticRules.js';
import { calculateRiskScore } from './riskScore.js';
import { generateStrategy } from './strategyEngine.js';

export function evaluateDiagnosis(data) {
    const appliedRules = [];

    // Iterate over generic rules
    diagnosticRules.forEach(rule => {
        if (rule.condition(data)) {
            appliedRules.push(rule.result);
        }
    });

    // Calculate generic risk score & get level
    const { score, level } = calculateRiskScore(data);

    // Derive "Explicación Simple" base on states
    let explicacionSimple = "";
    const rolStr = data.rol === 'demandante' ? 'Tú pediste' : 'Cuentas con';
    const matStr = data.materia === 'alimentos' ? 'pensión de alimentos' : data.materia === 'visitas' ? 'regular las visitas' : 'cuidado personal';

    if (data.sentencia === 'no') {
        explicacionSimple = `${rolStr} ${matStr}, pero **el juez aún no toma una decisión final**. Están en etapa de trámite o probando los hechos.`;
    } else {
        explicacionSimple = `Ya existe una regla fijada por el juez sobre ${matStr}. **Esta regla es obligatoria** y ambos deben cumplirla.`;

        if (data.pagos === 'deuda') {
            explicacionSimple += ` Sin embargo, el sistema detecta que **hay pagos o acuerdos que no se están cumpliendo**.`;
        }

        if (data.liquidacion === 'liquidacion') {
            explicacionSimple += ` Además, el tribunal ya hizo el **cálculo matemático oficial (liquidación)** de lo que se debe.`;
        } else if (data.liquidacion === 'apremio') {
            explicacionSimple += ` ¡Ojo! El juez ya ordenó **castigos severos (apremios)**, que pueden ser arresto nocturno, arraigo nacional o retención de fondos.`;
        }
    }

    // Generate predictive scenarios based on data
    const escenarios = generarEscenarios(data, score);

    // Derive Step-by-Step Strategic Plan
    const estrategia = generateStrategy(data, { reglasAplicadas: appliedRules });

    return {
        riesgoLiteral: level.toLowerCase(), // alto | medio | bajo
        score,
        explicacionSimple,
        reglasAplicadas: appliedRules, // Actions, extra warnings
        escenarios,
        estrategia // The new actionable plan array
    };
}

// ── Simulador Predictivo ──────────────────────────────────────────────────────
function generarEscenarios(f, score) {
    const escenarios = [];

    // Default neutral scenario
    if (f.sentencia === 'no') {
        escenarios.push({
            nombre: 'Esperar resolución',
            etiqueta: 'Proceso judicial',
            probabilidad: 85,
            impacto: 'neutral',
            desc: 'El tribunal dictará una resolución pronto estableciendo reglas provisionales.'
        });
        return escenarios;
    }

    // Deuda & apremio scenarios
    if (f.pagos === 'deuda') {
        if (f.liquidacion !== 'apremio') {
            escenarios.push({
                nombre: 'Liquidación judicial inminente',
                etiqueta: 'Medida de cobro',
                probabilidad: f.liquidacion === 'liquidacion' ? 95 : 60,
                impacto: 'negativo',
                desc: 'El tribunal o la parte demandante solicitará el cálculo de la deuda con intereses y reajustes IPC.'
            });
            escenarios.push({
                nombre: 'Medidas de apremio (Arresto/Arraigo)',
                etiqueta: 'Riesgo inminente',
                probabilidad: f.liquidacion === 'liquidacion' ? 80 : 35,
                impacto: 'critico',
                desc: 'Si la deuda supera los 3 meses y está liquidada, el tribunal ordenará medidas de fuerza de forma casi automática si son solicitadas.'
            });
        }

        // Good scenario
        escenarios.push({
            nombre: 'Pago voluntario y avenimiento',
            etiqueta: 'Solución',
            probabilidad: 40,
            impacto: 'positivo',
            desc: 'Si se paga o repacta la deuda mediante acuerdo firmado, los apremios se suspenden inmediatamente y el riesgo baja a Verde.'
        });
    }

    // Al día scenarios
    if (f.pagos === 'aldia') {
        escenarios.push({
            nombre: 'Mantener estado de cumplimiento',
            etiqueta: 'Estable',
            probabilidad: 90,
            impacto: 'positivo',
            desc: 'No se prevén acciones judiciales en contra mientras se mantenga el pago íntegro y oportuno.'
        });
        if (f.rol === 'demandado' && f.antiguedad === 'antiguo') {
            escenarios.push({
                nombre: 'Demanda de rebaja de pensión',
                etiqueta: 'Acción preventiva',
                probabilidad: 30,
                impacto: 'neutral',
                desc: 'Si han cambiado las circunstancias (ej. nuevo hijo o cesantía), podrías solicitar rebaja para evitar futura morosidad.'
            });
        }
    }

    // Deuda Oculta scenario
    if (f.materia === 'alimentos' && f.moneda === 'pesos' && f.antiguedad === 'antiguo' && f.pagos === 'aldia') {
        escenarios.push({
            nombre: 'Cobro retroactivo por reajustes (IPC)',
            etiqueta: 'Riesgo silencioso',
            probabilidad: 65,
            impacto: 'negativo',
            desc: 'La contraparte podría pedir liquidación por los reajustes (IPC / UTM) no pagados de los últimos meses, generando una deuda sorpresiva.'
        });
    }

    // Sort by highest probability
    return escenarios.sort((a, b) => b.probabilidad - a.probabilidad).slice(0, 3);
}
