import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ============ PDF EXPORT (Professional) ============

export const exportProfessionalPDF = (results, dimensions, materials) => {
    if (!results || !results.cutList || results.cutList.length === 0) {
        throw new Error('No hay datos para exportar. Verifica la configuración del mueble.');
    }

    const doc = new jsPDF();
    const thick = parseInt(materials.thickness) || 18;

    // Header Corporativo
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MueblePro Enterprise', 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Lista de Cortes — Despiece Profesional', 14, 28);
    doc.setFontSize(9);
    doc.text(new Date().toLocaleDateString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric'
    }), 196, 18, { align: 'right' });

    // Info del Proyecto
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Dimensiones: ${dimensions.height} × ${dimensions.width} × ${dimensions.depth} mm`, 14, 50);
    doc.text(`Espesor: ${thick}mm | Fondo: ${materials.isMelamineBacking ? 'Melamina' : 'MDF 3mm'} | Puerta: ${materials.doorType === 'sliding' ? 'Corredera' : 'Abatible'}`, 14, 56);

    // Tabla de Piezas
    doc.autoTable({
        startY: 62,
        head: [['Pieza', 'Cant.', 'Ancho (mm)', 'Alto (mm)', 'Material', 'Canto (ml)']],
        body: results.cutList.map(item => [
            item.part,
            item.qty,
            Math.round(item.width),
            Math.round(item.height),
            item.material || `Melamina ${thick}mm`,
            item.edgeBanding ? (item.edgeBanding / 1000).toFixed(2) : '-'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 15, halign: 'center' },
            2: { cellWidth: 25, halign: 'right' },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 40 },
            5: { cellWidth: 20, halign: 'right' }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    // Resumen de Materiales
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Resumen de Materiales', 14, finalY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Melamina: ${results.totals.melamineArea} m²`, 14, finalY + 8);
    doc.text(`• Fondo: ${results.totals.backingArea} m²`, 14, finalY + 14);
    doc.text(`• Cantoneado: ${results.totals.edgeBanding} ml`, 14, finalY + 20);
    doc.text(`• Planchas mínimas: ${results.totals.boardsNeeded || '-'}`, 14, finalY + 26);
    doc.text(`• Total piezas: ${results.totals.totalPieces || '-'}`, 14, finalY + 32);

    // Costo
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(`Costo Material: $${(results.totals.materialCost || results.totals.cost || 0).toLocaleString('es-CO')} COP`, 14, finalY + 45);

    // Disclaimer
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text('Este documento es una guía técnica. Verifique todas las medidas antes de cortar.', 105, 282, { align: 'center' });
    doc.text('Generado por MueblePro Enterprise', 105, 287, { align: 'center' });

    doc.save(`Despiece_MueblePro_${Date.now()}.pdf`);
};

// ============ CSV EXPORT ============

export const exportCSV = (results, dimensions, materials) => {
    if (!results || !results.cutList || results.cutList.length === 0) {
        throw new Error('No hay datos para exportar.');
    }

    const thick = parseInt(materials.thickness) || 18;
    let csv = '\uFEFF'; // BOM for Excel
    csv += 'LISTA DE CORTES — MueblePro Enterprise\n';
    csv += `Fecha:,${new Date().toLocaleDateString('es-CO')}\n`;
    csv += `Dimensiones:,${dimensions.height}mm (H) × ${dimensions.width}mm (A) × ${dimensions.depth}mm (P)\n`;
    csv += `Espesor:,${thick}mm\n`;
    csv += `Tipo Puerta:,${materials.doorType === 'sliding' ? 'Corredera' : 'Abatible'}\n`;
    csv += '\n';
    csv += 'Pieza,Cantidad,Ancho (mm),Alto (mm),Material,Cantos (ml)\n';

    results.cutList.forEach(item => {
        const w = Math.round(item.width);
        const h = Math.round(item.height);
        const edge = item.edgeBanding ? Math.round(item.edgeBanding) : 0;
        const mat = item.material || `Melamina ${thick}mm`;
        csv += `"${item.part}",${item.qty},${w},${h},"${mat}",${edge}\n`;
    });

    csv += '\n';
    csv += `Área Melamina (m²):,${results.totals.melamineArea}\n`;
    csv += `Área Fondo (m²):,${results.totals.backingArea}\n`;
    csv += `Cantoneado (ml):,${results.totals.edgeBanding}\n`;
    csv += `Planchas Mínimas:,${results.totals.boardsNeeded || '-'}\n`;
    csv += `Costo Material (COP):,"$${(results.totals.materialCost || results.totals.cost || 0).toLocaleString('es-CO')}"\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `despiece-mueble-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// ============ PROJECT SAVE/LOAD ============

export const saveProject = (dimensions, materials, layout, totalDoors) => {
    const project = {
        version: '4.0',
        app: 'MueblePro Enterprise',
        savedAt: new Date().toISOString(),
        data: { dimensions, materials, layout, totalDoors }
    };

    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mueble-${Date.now()}.mueble`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const loadProject = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const project = JSON.parse(e.target.result);

                if (!project.data?.dimensions || !project.data?.materials || !project.data?.layout) {
                    reject(new Error('El archivo no contiene un proyecto válido.'));
                    return;
                }

                const { dimensions, materials, layout, totalDoors } = project.data;

                if (!dimensions.height || !dimensions.width || !dimensions.depth) {
                    reject(new Error('Las dimensiones del proyecto son inválidas.'));
                    return;
                }

                // Normalizar thickness a número
                if (materials.thickness) {
                    materials.thickness = parseInt(materials.thickness) || 18;
                }

                resolve({ dimensions, materials, layout, totalDoors: totalDoors || 0 });
            } catch (err) {
                reject(new Error('Error al leer el archivo: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        reader.readAsText(file);
    });
};

// ============ AUTOSAVE ============

const STORAGE_KEY = 'mueblePro_autosave';

export const autosave = (dimensions, materials, layout, totalDoors) => {
    try {
        const data = JSON.stringify({
            dimensions, materials, layout, totalDoors,
            savedAt: Date.now()
        });
        localStorage.setItem(STORAGE_KEY, data);
    } catch (e) {
        console.warn('Autosave failed:', e);
    }
};

export const loadAutosave = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (data?.dimensions && data?.materials && data?.layout) {
            // Normalizar thickness
            if (data.materials.thickness) {
                data.materials.thickness = parseInt(data.materials.thickness) || 18;
            }
            return data;
        }
    } catch (e) {
        console.warn('Autosave load failed:', e);
    }
    return null;
};

export const clearAutosave = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }
};
