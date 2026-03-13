// src/nexo/engine/strategyEngine.js

/**
 * Genera una estrategia judicial paso a paso priorizada
 * basándose en los datos del caso y del diagnóstico general.
 */
export function generateStrategy(data, diagnosticResult) {
    const strategy = [];

    // Paso 1: Liquidación (la base de todo cobro/defensa)
    if (data.pagos === 'deuda' && data.liquidacion !== 'liquidacion' && data.liquidacion !== 'apremio') {
        strategy.push({
            priority: 1,
            title: 'Solicitar liquidación de deuda',
            description: 'Esto permitirá conocer el monto exacto adeudado en tribunal con reajustes IPC/UTM.',
            actionLabel: 'Generar escrito de liquidación',
            moduleId: 'documentos'
        });
    }

    // Deuda Oculta (prioridad alta para descubrir montos)
    const deudaOculta = diagnosticResult?.reglasAplicadas?.find(r => r.id === 'utm_deuda_oculta');
    if (deudaOculta && data.liquidacion !== 'liquidacion') {
        strategy.push({
            priority: 1,
            title: 'Destapar la Deuda Oculta',
            description: 'Pide liquidación por reajustes atrasados (IPC). Muchas veces hay dinero acumulado sin saberlo.',
            actionLabel: 'Calculadora Financiera',
            moduleId: 'calculadora'
        });
    }

    // Riesgo de Apremio (Urgencia Máxima)
    if (data.liquidacion === 'apremio') {
        if (data.rol === 'demandado') {
            strategy.push({
                priority: 0, // Máxima urgencia
                title: 'Regularizar pagos o interponer defensa',
                description: 'Existen medidas de apremio activas en tu contra. Arriesgas arresto. Debes pagar, ofrecer avenimiento o defenderte (si está mal calculada).',
                actionLabel: 'Consultar abogado urgente'
            });
        } else if (data.rol === 'demandante') {
            strategy.push({
                priority: 1,
                title: 'Solicitar Apercibimiento y Arresto',
                description: 'La liquidación está lista. Debes pedirle formalmente al tribunal que ejecute los castigos contra el deudor.',
                actionLabel: 'Generar escrito de apremio',
                moduleId: 'documentos'
            });
        }
    }

    // Retención Judicial (Prioridad Media)
    if (data.pagos === 'deuda' && data.retencion === 'no' && data.rol === 'demandante') {
        strategy.push({
            priority: 2,
            title: 'Solicitar retención por planilla',
            description: 'Si el deudor tiene trabajo con contrato, pide que se descuente la plata directamente de su sueldo.',
            actionLabel: 'Generar escrito de retención',
            moduleId: 'documentos'
        });
    }

    // Rebaja de pensión
    if (data.rol === 'demandado' && data.antiguedad === 'antiguo' && data.pagos === 'aldia') {
        strategy.push({
            priority: 3,
            title: 'Evaluar rebaja de pensión',
            description: 'Si tus ingresos bajaron o tienes nuevos hijos legales, puedes demandar una rebaja antes de empezar a deber.',
            actionLabel: 'Leer guía sobre Rebaja',
            moduleId: 'guias'
        });
    }

    // Si no hay problemas urgentes
    if (data.pagos === 'aldia' && data.sentencia === 'si' && !deudaOculta) {
        strategy.push({
            priority: 1,
            title: 'Mantener seguimiento mensual',
            description: 'Continúa pagando puntualmente. Activa el radar para revisar cualquier movimiento nuevo que haga la contraparte.',
            actionLabel: 'Ir al Radar Judicial',
            moduleId: 'radar'
        });
    }

    // Trámite inicial
    if (data.sentencia === 'no') {
        strategy.push({
            priority: 1,
            title: 'Esperar resolución del tribunal',
            description: 'Monitorea la causa para enterarte cuando se dicte la medida provisoria o la sentencia.',
            actionLabel: 'Ir al Radar Judicial',
            moduleId: 'radar'
        });
    }

    // Solo retornar los 3 pasos más prioritarios y asegurar un orderamiento
    const uniqPriority = [...new Map(strategy.map(item => [item.title, item])).values()];

    return uniqPriority
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 3);
}
