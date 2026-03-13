/**
 * MueblePro Enterprise — Motor de Optimización de Corte
 * Algoritmo Guillotine Bin Packing para planchas estándar.
 * Simula cortes de sierra de banco (cortes de lado a lado).
 */

class GuillotineBin {
    constructor(width, height, kerf = 3) {
        this.width = width;
        this.height = height;
        this.kerf = kerf;
        this.root = { x: 0, y: 0, w: width, h: height, used: false };
    }

    findNode(root, w, h) {
        if (!root) return null;
        if (root.used) {
            return this.findNode(root.right, w, h) || this.findNode(root.down, w, h);
        }
        if (w <= root.w && h <= root.h) return root;
        return null;
    }

    splitNode(node, w, h) {
        node.used = true;
        const k = this.kerf;
        // Estrategia: cortar el sobrante más largo horizontalmente
        const remainW = node.w - w - k;
        const remainH = node.h - h - k;

        if (remainW > remainH) {
            // Corte vertical (derecha más ancha)
            node.right = { x: node.x + w + k, y: node.y, w: Math.max(0, remainW), h: h };
            node.down = { x: node.x, y: node.y + h + k, w: node.w, h: Math.max(0, remainH) };
        } else {
            // Corte horizontal (abajo más alto)
            node.right = { x: node.x + w + k, y: node.y, w: Math.max(0, remainW), h: node.h };
            node.down = { x: node.x, y: node.y + h + k, w: node.w - w - k <= 0 ? node.w : w, h: Math.max(0, remainH) };
        }

        return node;
    }
}

/**
 * Ejecuta la optimización de corte.
 * @param {Array} cutList - Lista de piezas del calculador
 * @param {number} boardWidth - Ancho de plancha (default 2440mm)  
 * @param {number} boardHeight - Alto de plancha (default 1830mm)
 * @param {number} kerf - Grosor de sierra (default 3mm)
 * @param {boolean} allowRotation - Permitir rotación de piezas
 * @returns {{ boards: Array, unplacedParts: Array, stats: Object }}
 */
export const runOptimization = (cutList, boardWidth = 2440, boardHeight = 1830, kerf = 3, allowRotation = true) => {
    // 1. Expandir lista (convertir qty a piezas individuales)
    const allParts = [];
    cutList.forEach(item => {
        // Ignorar: metal, piezas sin medidas, fondos de 3mm (van aparte)
        if (!item.width || !item.height) return;
        if (item.material && item.material.includes('Metal')) return;

        for (let i = 0; i < (item.qty || 1); i++) {
            allParts.push({
                ...item,
                w: item.width,
                h: item.height,
                uniqueId: `${item.part}-${i}`,
                area: item.width * item.height,
                rotated: false
            });
        }
    });

    // 2. Separar piezas de 3mm (fondo) de piezas de melamina
    const melamParts = allParts.filter(p => p.thickness !== 3 && p.material !== 'MDF 3mm');
    const backingParts = allParts.filter(p => p.thickness === 3 || p.material === 'MDF 3mm');

    // 3. Ordenar: BSSF (Best Short Side Fit) — más grandes primero
    melamParts.sort((a, b) => {
        const aMax = Math.max(a.w, a.h);
        const bMax = Math.max(b.w, b.h);
        if (bMax !== aMax) return bMax - aMax;
        return b.area - a.area;
    });

    const boards = [];
    let partsToNest = [...melamParts];
    const unplacedParts = [];
    const MAX_BOARDS = 100;
    let safetyLoop = 0;

    // 4. Loop de empaquetado
    while (partsToNest.length > 0 && safetyLoop < MAX_BOARDS) {
        safetyLoop++;
        const bin = new GuillotineBin(boardWidth, boardHeight, kerf);
        const packed = [];
        const unpackable = [];

        for (const part of partsToNest) {
            const pw = part.w;
            const ph = part.h;

            // Verificar si cabe en el tablero (con o sin rotación)
            const fitsNormal = pw <= boardWidth && ph <= boardHeight;
            const fitsRotated = allowRotation && ph <= boardWidth && pw <= boardHeight;

            if (!fitsNormal && !fitsRotated) {
                unplacedParts.push({ ...part, reason: `Pieza ${pw}x${ph}mm excede tablero ${boardWidth}x${boardHeight}mm` });
                continue;
            }

            // Intentar colocar normal
            let node = fitsNormal ? bin.findNode(bin.root, pw, ph) : null;
            let rotatedNode = null;

            if (!node && fitsRotated) {
                rotatedNode = bin.findNode(bin.root, ph, pw);
            }

            if (node) {
                part.fit = bin.splitNode(node, pw, ph);
                part.rotated = false;
                packed.push(part);
            } else if (rotatedNode) {
                part.fit = bin.splitNode(rotatedNode, ph, pw);
                part.rotated = true;
                // Intercambiar dimensiones visuales
                const tmp = part.w; part.w = part.h; part.h = tmp;
                packed.push(part);
            } else {
                unpackable.push(part);
            }
        }

        if (packed.length > 0) {
            const usedArea = packed.reduce((acc, p) => acc + (p.w * p.h), 0);
            const totalArea = boardWidth * boardHeight;
            const wasteArea = totalArea - usedArea;

            boards.push({
                id: boards.length + 1,
                parts: packed,
                usedArea,
                wasteArea,
                efficiency: parseFloat(((usedArea / totalArea) * 100).toFixed(1))
            });

            partsToNest = unpackable;
        } else {
            unplacedParts.push(...unpackable.map(u => ({
                ...u,
                reason: 'No cabe en tablero vacío'
            })));
            break;
        }
    }

    // 5. Calcular estadísticas globales
    const totalBoardArea = boards.length * boardWidth * boardHeight;
    const totalUsedArea = boards.reduce((acc, b) => acc + b.usedArea, 0);
    const totalWasteArea = totalBoardArea - totalUsedArea;
    const globalEfficiency = totalBoardArea > 0
        ? parseFloat(((totalUsedArea / totalBoardArea) * 100).toFixed(1))
        : 0;

    const stats = {
        totalBoards: boards.length,
        totalParts: melamParts.length,
        placedParts: melamParts.length - unplacedParts.length,
        globalEfficiency,
        totalWasteM2: parseFloat((totalWasteArea / 1_000_000).toFixed(2)),
        totalUsedM2: parseFloat((totalUsedArea / 1_000_000).toFixed(2)),
        boardDimensions: { width: boardWidth, height: boardHeight },
        backingParts: backingParts.length
    };

    return { boards, unplacedParts, stats };
};
