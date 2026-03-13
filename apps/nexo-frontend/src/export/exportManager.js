/**
 * MueblePro Enterprise — Export Manager
 * Unified export system for all document types.
 * Supports: Cut List PDF, Optimization Report, Quotation PDF,
 * Work Order PDF, and CSV Data exports.
 */
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency, CABINET_TYPE_LABELS, WO_STATUS_LABELS } from '../core/constants.js';

// ═══════════════════════════════════════════════
// PDF HELPERS
// ═══════════════════════════════════════════════
const addHeader = (doc, title, subtitle = '') => {
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MueblePro Enterprise', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 14, 25);
    if (subtitle) doc.text(subtitle, 14, 31);
    doc.setFontSize(8);
    doc.text(new Date().toLocaleDateString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric'
    }), 196, 16, { align: 'right' });
};

const addFooter = (doc, pageNum) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text('Generado por MueblePro Enterprise — Verificar medidas antes de cortar', 105, 287, { align: 'center' });
    doc.text(`Página ${pageNum}`, 196, 287, { align: 'right' });
};

// ═══════════════════════════════════════════════
// CUT LIST PDF
// ═══════════════════════════════════════════════
export const exportCutListPDF = (results, dimensions, materials, projectName = '') => {
    if (!results?.cutList?.length) throw new Error('No hay piezas para exportar.');

    const doc = new jsPDF();
    const thick = parseInt(materials.thickness) || 18;

    addHeader(doc, 'Lista de Cortes — Despiece Profesional', projectName);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Dimensiones: ${dimensions.height} × ${dimensions.width} × ${dimensions.depth} mm`, 14, 44);
    doc.text(`Espesor: ${thick}mm | Fondo: ${materials.isMelamineBacking ? 'Melamina' : 'MDF 3mm'} | Puerta: ${materials.doorType === 'sliding' ? 'Corredera' : 'Abatible'}`, 14, 50);

    doc.autoTable({
        startY: 56,
        head: [['Pieza', 'Cant.', 'Ancho', 'Alto', 'Material', 'Espesor', 'Cantos']],
        body: results.cutList.map(item => [
            item.part, item.qty,
            Math.round(item.width) + 'mm', Math.round(item.height) + 'mm',
            item.material || `Melamina ${thick}mm`,
            (item.thickness || thick) + 'mm',
            item.edgeBandingSides || '-',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], fontSize: 7, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Resumen', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Melamina: ${results.totals.melamineArea} m² | Fondo: ${results.totals.backingArea} m²`, 14, finalY + 7);
    doc.text(`Cantoneado: ${results.totals.edgeBanding} ml | Planchas: ${results.totals.boardsNeeded} | Piezas: ${results.totals.totalPieces}`, 14, finalY + 13);

    addFooter(doc, 1);
    doc.save(`Despiece_${projectName || 'MueblePro'}_${Date.now()}.pdf`);
};

// ═══════════════════════════════════════════════
// QUOTATION PDF
// ═══════════════════════════════════════════════
export const exportQuotationPDF = (quotation) => {
    if (!quotation) throw new Error('No hay cotización para exportar.');

    const doc = new jsPDF();
    addHeader(doc, `Cotización ${quotation.quotationNumber}`, `Cliente: ${quotation.client.name || 'N/A'}`);

    let y = 44;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    // Client info
    doc.setFont('helvetica', 'bold');
    doc.text('Información del Cliente', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 7;
    doc.text(`Nombre: ${quotation.client.name || 'N/A'}`, 14, y);
    y += 6;
    if (quotation.client.phone) { doc.text(`Teléfono: ${quotation.client.phone}`, 14, y); y += 6; }
    if (quotation.client.email) { doc.text(`Email: ${quotation.client.email}`, 14, y); y += 6; }

    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle del Proyecto', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 7;
    doc.text(`Proyecto: ${quotation.project.name}`, 14, y);
    y += 6;
    doc.text(`Dimensiones: ${quotation.project.dimensions.height}×${quotation.project.dimensions.width}×${quotation.project.dimensions.depth}mm`, 14, y);
    y += 6;
    doc.text(`Espesor: ${quotation.project.materials.thickness}mm | Fondo: ${quotation.project.materials.backing}`, 14, y);

    y += 10;
    doc.autoTable({
        startY: y,
        head: [['Concepto', 'Valor']],
        body: [
            ['Materiales', formatCurrency(quotation.priceBreakdown.materialCost)],
            ['Herrajes', formatCurrency(quotation.priceBreakdown.hardwareCost)],
            ['Mano de Obra', formatCurrency(quotation.priceBreakdown.laborCost)],
            ['Gastos Generales', formatCurrency(quotation.priceBreakdown.overheadCost)],
            ['Subtotal Fabricación', formatCurrency(quotation.priceBreakdown.subtotal)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 1: { halign: 'right' } },
    });

    const tableY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`TOTAL: ${formatCurrency(quotation.finalPrice)}`, 14, tableY);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Válida hasta: ${new Date(quotation.expiresAt).toLocaleDateString('es-CO')}`, 14, tableY + 8);

    if (quotation.notes) {
        doc.text(`Notas: ${quotation.notes}`, 14, tableY + 16);
    }

    addFooter(doc, 1);
    doc.save(`Cotizacion_${quotation.quotationNumber}_${Date.now()}.pdf`);
};

// ═══════════════════════════════════════════════
// WORK ORDER PDF
// ═══════════════════════════════════════════════
export const exportWorkOrderPDF = (workOrder) => {
    if (!workOrder) throw new Error('No hay orden de trabajo.');

    const doc = new jsPDF();
    addHeader(doc, `Orden de Trabajo ${workOrder.woNumber}`, `Proyecto: ${workOrder.projectName}`);

    let y = 44;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    doc.text(`Fecha: ${new Date(workOrder.createdAt).toLocaleDateString('es-CO')}`, 14, y);
    doc.text(`Estado: ${WO_STATUS_LABELS[workOrder.status] || workOrder.status}`, 100, y);
    doc.text(`Prioridad: ${workOrder.priority}`, 160, y);
    y += 6;
    doc.text(`Dimensiones: ${workOrder.dimensions.height}×${workOrder.dimensions.width}×${workOrder.dimensions.depth}mm`, 14, y);
    y += 4;

    // Cut list table
    doc.autoTable({
        startY: y + 2,
        head: [['Pieza', 'Cant.', 'Ancho', 'Alto', 'Material', 'Cantos']],
        body: workOrder.cutList.map(item => [
            item.part, item.qty,
            item.width + 'mm', item.height + 'mm',
            item.material, item.edgeBandingSides || '-',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [234, 88, 12], fontSize: 7, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [255, 247, 237] },
    });

    y = doc.lastAutoTable.finalY + 8;

    // Hardware list
    if (workOrder.hardwareList?.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Herrajes Necesarios', 14, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        workOrder.hardwareList.forEach(h => {
            doc.text(`• ${h.item}: ${h.qty} ${h.unit}`, 14, y);
            y += 5;
        });
    }

    // Board count
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Planchas Melamina: ${workOrder.boardCount.melamine} | MDF: ${workOrder.boardCount.mdf}`, 14, y);

    // Assembly notes
    if (workOrder.assemblyNotes?.length > 0) {
        y += 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Notas de Ensamblaje', 14, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        workOrder.assemblyNotes.forEach(note => {
            if (y > 270) { doc.addPage(); y = 20; addFooter(doc, 2); }
            doc.text(note, 14, y);
            y += 5;
        });
    }

    addFooter(doc, 1);
    doc.save(`OrdenTrabajo_${workOrder.woNumber}_${Date.now()}.pdf`);
};

// ═══════════════════════════════════════════════
// OPTIMIZATION REPORT PDF
// ═══════════════════════════════════════════════
export const exportOptimizationPDF = (optimizedData, settings, projectName = '') => {
    if (!optimizedData) throw new Error('No hay datos de optimización.');

    const doc = new jsPDF();
    addHeader(doc, 'Reporte de Optimización de Corte', projectName);

    let y = 44;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Plancha: ${settings.boardWidth} × ${settings.boardHeight} mm | Sierra: ${settings.kerf}mm`, 14, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.text(`Tableros Utilizados: ${optimizedData.stats.totalBoards}`, 14, y);
    doc.text(`Rendimiento Global: ${optimizedData.stats.globalEfficiency}%`, 100, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Desperdicio Total: ${optimizedData.stats.totalWasteM2} m²`, 14, y);
    doc.text(`Piezas Colocadas: ${optimizedData.stats.placedParts}/${optimizedData.stats.totalParts}`, 100, y);
    y += 10;

    optimizedData.boards.forEach((board, idx) => {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`Tablero ${board.id} — Eficiencia: ${board.efficiency}%`, 14, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        board.parts.forEach(p => {
            if (y > 275) { doc.addPage(); y = 20; }
            doc.text(`  ${p.part}: ${p.w}×${p.h}mm ${p.rotated ? '(rotada)' : ''}`, 14, y);
            y += 4;
        });
        y += 4;
    });

    addFooter(doc, 1);
    doc.save(`Optimizacion_${projectName || 'MueblePro'}_${Date.now()}.pdf`);
};

// ═══════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════
export const exportCSV = (results, dimensions, materials, projectName = '') => {
    if (!results?.cutList?.length) throw new Error('No hay datos para exportar.');

    const thick = parseInt(materials.thickness) || 18;
    let csv = '\uFEFF'; // BOM for Excel
    csv += `LISTA DE CORTES — MueblePro Enterprise\n`;
    csv += `Proyecto:,${projectName}\n`;
    csv += `Fecha:,${new Date().toLocaleDateString('es-CO')}\n`;
    csv += `Dimensiones:,${dimensions.height}mm (H) × ${dimensions.width}mm (A) × ${dimensions.depth}mm (P)\n`;
    csv += `Espesor:,${thick}mm\n`;
    csv += '\n';
    csv += 'Pieza,Cantidad,Ancho (mm),Alto (mm),Material,Espesor (mm),Cantos,Cantos (ml)\n';

    results.cutList.forEach(item => {
        const w = Math.round(item.width);
        const h = Math.round(item.height);
        const edge = item.edgeBanding ? Math.round(item.edgeBanding) : 0;
        const mat = item.material || `Melamina ${thick}mm`;
        csv += `"${item.part}",${item.qty},${w},${h},"${mat}",${item.thickness || thick},"${item.edgeBandingSides || '-'}",${edge}\n`;
    });

    csv += '\n';
    csv += `Área Melamina (m²):,${results.totals.melamineArea}\n`;
    csv += `Área Fondo (m²):,${results.totals.backingArea}\n`;
    csv += `Cantoneado (ml):,${results.totals.edgeBanding}\n`;
    csv += `Planchas Mínimas:,${results.totals.boardsNeeded}\n`;
    csv += `Costo Material:,${formatCurrency(results.totals.materialCost)}\n`;

    downloadBlob(csv, 'text/csv;charset=utf-8', `despiece-${projectName || 'proyecto'}-${Date.now()}.csv`);
};

// ═══════════════════════════════════════════════
// PROJECT SAVE/LOAD
// ═══════════════════════════════════════════════
export const saveProjectFile = (project) => {
    const data = {
        version: '5.0',
        app: 'MueblePro Enterprise',
        savedAt: new Date().toISOString(),
        data: project,
    };
    const json = JSON.stringify(data, null, 2);
    downloadBlob(json, 'application/json', `${project.name || 'proyecto'}-${Date.now()}.mueble`);
};

export const loadProjectFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                const data = parsed.data || parsed;
                if (!data.dimensions || !data.materials) {
                    reject(new Error('Archivo no contiene un proyecto válido.'));
                    return;
                }
                if (data.materials?.thickness) {
                    data.materials.thickness = parseInt(data.materials.thickness) || 18;
                }
                resolve(data);
            } catch (err) {
                reject(new Error('Error al leer archivo: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        reader.readAsText(file);
    });
};

// ═══════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════
function downloadBlob(content, mimeType, filename) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
