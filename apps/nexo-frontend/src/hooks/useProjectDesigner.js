import { useReducer, useEffect } from 'react';
import { autosave, loadAutosave } from '../utils/exportUtils';

// --- Constantes ---
const GENERATE_ID = () => Math.random().toString(36).substr(2, 9);

const DEFAULT_DIMENSIONS = { height: 2350, width: 2100, depth: 600 };
const DEFAULT_MATERIALS = {
    thickness: 18,  // NÚMERO, no string
    melaminePrice: 25000,
    edgeBandingPrice: 1500,
    backingPrice: 8000,
    isMelamineBacking: false,
    doorType: 'swing' // 'swing' | 'sliding'
};

// --- Tipos de Acciones ---
const ACTIONS = {
    SET_DIMENSIONS: 'SET_DIMENSIONS',
    SET_MATERIALS: 'SET_MATERIALS',
    SET_LAYOUT: 'SET_LAYOUT',
    UPDATE_SECTION: 'UPDATE_SECTION',
    UPDATE_DIVIDERS: 'UPDATE_DIVIDERS',
    SET_DOORS: 'SET_DOORS',
    ADD_ITEM: 'ADD_ITEM',  // Estaba faltando en el enum
    UNDO: 'UNDO',
    REDO: 'REDO',
    LOAD_PROJECT: 'LOAD_PROJECT',
    MOVE_ITEM: 'MOVE_ITEM',
    MOVE_ITEMS_BATCH: 'MOVE_ITEMS_BATCH'
};

// --- Helpers de tipo ---
const getItemKey = (type) => {
    const map = { drawer: 'drawers', shelf: 'shelves', bar: 'bars', partialDivider: 'partialDividers' };
    return map[type] || 'shelves';
};

// --- Reducer Principal ---
const projectReducer = (state, action) => {
    switch (action.type) {
        case ACTIONS.SET_DIMENSIONS:
            return { ...state, dimensions: { ...state.dimensions, ...action.payload } };

        case ACTIONS.SET_MATERIALS: {
            // Asegurar que thickness siempre sea número
            const matPayload = { ...action.payload };
            if (matPayload.thickness !== undefined) {
                matPayload.thickness = parseInt(matPayload.thickness) || 18;
            }
            return { ...state, materials: { ...state.materials, ...matPayload } };
        }

        case ACTIONS.SET_DOORS:
            return { ...state, totalDoors: Math.max(0, parseInt(action.payload) || 0) };

        case ACTIONS.UPDATE_DIVIDERS:
            return { ...state, layout: { ...state.layout, dividers: action.payload } };

        case ACTIONS.UPDATE_SECTION: {
            const { sectionIndex, updates } = action.payload;
            const currentSection = state.layout.sections[sectionIndex] || {
                shelves: [], drawers: [], bars: [], partialDividers: []
            };
            return {
                ...state,
                layout: {
                    ...state.layout,
                    sections: {
                        ...state.layout.sections,
                        [sectionIndex]: { ...currentSection, ...updates }
                    }
                }
            };
        }

        case ACTIONS.LOAD_PROJECT:
            return { ...action.payload };

        case ACTIONS.MOVE_ITEM: {
            const { fromSection, toSection, itemId, type, newProps } = action.payload;
            const key = getItemKey(type);
            const sourceSection = state.layout.sections[fromSection] || {};
            const targetSection = state.layout.sections[toSection] || {};
            const sourceList = sourceSection[key] || [];
            const targetList = targetSection[key] || [];

            const itemIndex = sourceList.findIndex(i => i.id === itemId);
            if (itemIndex === -1) return state;

            const item = sourceList[itemIndex];
            const newSourceList = sourceList.filter((_, idx) => idx !== itemIndex);
            const newItem = { ...item, ...newProps };

            return {
                ...state,
                layout: {
                    ...state.layout,
                    sections: {
                        ...state.layout.sections,
                        [fromSection]: { ...sourceSection, [key]: newSourceList },
                        [toSection]: { ...targetSection, [key]: [...targetList, newItem] }
                    }
                }
            };
        }

        case ACTIONS.MOVE_ITEMS_BATCH: {
            const { sourceSectionIndex, targetSectionIndex, itemIds, type } = action.payload;
            if (sourceSectionIndex === targetSectionIndex) return state;

            const key = getItemKey(type);
            const sourceSection = state.layout.sections[sourceSectionIndex] || {};
            const targetSection = state.layout.sections[targetSectionIndex] || {};
            const sourceList = sourceSection[key] || [];
            const targetList = targetSection[key] || [];

            const itemsToMove = sourceList.filter(item => itemIds.includes(item.id));
            const newSourceList = sourceList.filter(item => !itemIds.includes(item.id));

            let startY = 0;
            if (targetList.length > 0) {
                const lowestItem = targetList.reduce((max, item) => (item.y > max.y ? item : max), targetList[0]);
                startY = lowestItem.y + (lowestItem.height || 18) + 50;
            }

            const movedItems = itemsToMove.map((item, index) => ({
                ...item,
                y: startY + (index * ((item.height || 18) + 20))
            }));

            return {
                ...state,
                layout: {
                    ...state.layout,
                    sections: {
                        ...state.layout.sections,
                        [sourceSectionIndex]: { ...sourceSection, [key]: newSourceList },
                        [targetSectionIndex]: { ...targetSection, [key]: [...targetList, ...movedItems] }
                    }
                }
            };
        }

        case ACTIONS.ADD_ITEM: {
            const { sectionIndex, type, config } = action.payload;
            const currentSection = state.layout.sections[sectionIndex] || {
                shelves: [], drawers: [], bars: [], partialDividers: []
            };
            const key = getItemKey(type);
            const list = currentSection[key] || [];

            let newItem = { id: config.id || GENERATE_ID(), ...config };
            const thick = parseInt(state.materials.thickness) || 18;

            if (type === 'shelf') {
                const existingShelves = currentSection.shelves || [];
                const existingDrawers = currentSection.drawers || [];

                let maxDrawerTop = 0;
                if (existingDrawers.length > 0) {
                    maxDrawerTop = existingDrawers.reduce((max, d) =>
                        Math.max(max, (d.y || 0) + (d.height || 200) + thick), 0);
                }

                let maxShelfY = 0;
                if (existingShelves.length > 0) {
                    maxShelfY = existingShelves.reduce((max, s) => Math.max(max, s.y), 0);
                }

                if (existingDrawers.length === 0 && existingShelves.length === 0) {
                    newItem.y = 300;
                } else if (maxDrawerTop > maxShelfY) {
                    newItem.y = maxDrawerTop + 3;
                } else {
                    newItem.y = maxShelfY + 350;
                }
            }

            if (type === 'bar') {
                newItem.y = 1800;
            }

            if (type === 'partialDivider') {
                newItem.x = 300;
                newItem.startY = 0;
                newItem.endY = 1000;
            }

            if (type === 'drawer') {
                const h = config.height || 200;
                if (list.length > 0) {
                    const top = list.reduce((prev, curr) => (prev.y > curr.y ? prev : curr));
                    newItem.y = top.y + (top.height || 200) + 3;
                } else {
                    newItem.y = 0;
                }
                newItem.height = h;
            }

            return {
                ...state,
                layout: {
                    ...state.layout,
                    sections: {
                        ...state.layout.sections,
                        [sectionIndex]: { ...currentSection, [key]: [...list, newItem] }
                    }
                }
            };
        }

        default:
            return state;
    }
};

// --- Historial (Undo/Redo) ---
const historyReducer = (state, action) => {
    const { past, present, future } = state;

    if (action.type === ACTIONS.UNDO) {
        if (past.length === 0) return state;
        return {
            past: past.slice(0, -1),
            present: past[past.length - 1],
            future: [present, ...future]
        };
    }

    if (action.type === ACTIONS.REDO) {
        if (future.length === 0) return state;
        return {
            past: [...past, present],
            present: future[0],
            future: future.slice(1)
        };
    }

    if (action.type === ACTIONS.LOAD_PROJECT) {
        return { past: [], present: projectReducer(present, action), future: [] };
    }

    const newPresent = projectReducer(present, action);

    // No guardar historial si no cambió
    if (JSON.stringify(newPresent) === JSON.stringify(present)) return state;

    // Limitar historial a 50 pasos
    const newPast = past.length >= 50 ? [...past.slice(1), present] : [...past, present];

    return { past: newPast, present: newPresent, future: [] };
};

// --- Hook Principal ---
export const useProjectDesigner = () => {
    const savedState = loadAutosave();

    // Normalizar estado inicial
    const initialState = savedState ? {
        ...savedState,
        materials: {
            ...DEFAULT_MATERIALS,
            ...savedState.materials,
            thickness: parseInt(savedState.materials?.thickness) || 18 // Forzar número
        }
    } : {
        dimensions: DEFAULT_DIMENSIONS,
        materials: DEFAULT_MATERIALS,
        layout: { dividers: [], sections: {} },
        totalDoors: 0
    };

    // Inicializar layout por defecto si vacío
    if (!initialState.layout.dividers?.length && !Object.keys(initialState.layout.sections || {}).length) {
        initialState.layout = {
            dividers: [700, 1400],
            sections: {
                0: { shelves: [{ id: GENERATE_ID(), y: 1800 }], bars: [{ id: GENERATE_ID(), y: 1600 }] },
                1: { shelves: [{ id: GENERATE_ID(), y: 300 }] },
                2: { drawers: [{ id: GENERATE_ID(), y: 0, height: 200 }] }
            }
        };
    }

    const [state, dispatch] = useReducer(historyReducer, {
        past: [], present: initialState, future: []
    });

    const { present } = state;

    // Autosave con debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            autosave(present.dimensions, present.materials, present.layout, present.totalDoors);
        }, 2000);
        return () => clearTimeout(timer);
    }, [present]);

    // --- API Pública ---
    const actions = {
        undo: () => dispatch({ type: ACTIONS.UNDO }),
        redo: () => dispatch({ type: ACTIONS.REDO }),
        canUndo: state.past.length > 0,
        canRedo: state.future.length > 0,

        setDimensions: (dims) => dispatch({ type: ACTIONS.SET_DIMENSIONS, payload: dims }),
        setMaterials: (mats) => dispatch({ type: ACTIONS.SET_MATERIALS, payload: mats }),
        setDoors: (val) => dispatch({ type: ACTIONS.SET_DOORS, payload: val }),
        loadProject: (data) => dispatch({ type: ACTIONS.LOAD_PROJECT, payload: data }),

        addDivider: () => {
            const thick = parseInt(present.materials.thickness) || 18;
            const width = present.dimensions.width - (2 * thick);
            const count = present.layout.dividers.length + 2;
            const newDivs = Array.from({ length: count - 1 }, (_, i) =>
                Math.round((width / count) * (i + 1))
            );
            dispatch({ type: ACTIONS.UPDATE_DIVIDERS, payload: newDivs });
        },

        removeDivider: () => {
            if (present.layout.dividers.length === 0) return;
            dispatch({ type: ACTIONS.UPDATE_DIVIDERS, payload: present.layout.dividers.slice(0, -1) });
        },

        updateDividerPos: (index, newX) => {
            const newDivs = [...present.layout.dividers];
            newDivs[index] = Math.round(newX);
            dispatch({ type: ACTIONS.UPDATE_DIVIDERS, payload: newDivs });
        },

        addItem: (sectionIndex, type, config = {}) => {
            if (sectionIndex === null || sectionIndex === undefined) return;
            dispatch({
                type: ACTIONS.ADD_ITEM,
                payload: { sectionIndex, type, config }
            });
        },

        removeItem: (sectionIndex, type) => {
            if (sectionIndex === null || sectionIndex === undefined) return;
            const key = getItemKey(type);
            const list = present.layout.sections[sectionIndex]?.[key] || [];
            if (list.length === 0) return;
            dispatch({
                type: ACTIONS.UPDATE_SECTION,
                payload: { sectionIndex, updates: { [key]: list.slice(0, -1) } }
            });
        },

        updateItem: (sectionIndex, itemId, type, updates) => {
            if (sectionIndex === null || sectionIndex === undefined) return;
            const key = getItemKey(type);
            const list = present.layout.sections[sectionIndex]?.[key] || [];
            const newList = list.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
            );
            dispatch({
                type: ACTIONS.UPDATE_SECTION,
                payload: { sectionIndex, updates: { [key]: newList } }
            });
        },

        moveItem: (fromSection, toSection, itemId, type, newProps) => {
            dispatch({
                type: ACTIONS.MOVE_ITEM,
                payload: { fromSection, toSection, itemId, type, newProps }
            });
        },

        moveItemsBatch: (sourceSectionIndex, targetSectionIndex, itemIds, type) => {
            dispatch({
                type: ACTIONS.MOVE_ITEMS_BATCH,
                payload: { sourceSectionIndex, targetSectionIndex, itemIds, type }
            });
        }
    };

    return { project: present, actions };
};
