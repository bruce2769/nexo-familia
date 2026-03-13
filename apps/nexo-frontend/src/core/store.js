/**
 * MueblePro Enterprise — Central Store
 * Multi-project state management with React Context + useReducer.
 */
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
    generateId, DEFAULT_MATERIALS, DEFAULT_INVENTORY,
    CABINET_TYPES, CABINET_DEFAULTS, DEFAULT_COST_RATES, WO_STATUS
} from './constants.js';

// ═══════════════════════════════════════════════
// STORAGE KEYS
// ═══════════════════════════════════════════════
const STORAGE_KEY = 'mueblePro_enterprise_v2';

// ═══════════════════════════════════════════════
// DEFAULT PROJECT FACTORY
// ═══════════════════════════════════════════════
export const createDefaultProject = (name = 'Nuevo Proyecto') => ({
    id: generateId(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cabinetType: CABINET_TYPES.CLOSET,
    dimensions: { ...CABINET_DEFAULTS[CABINET_TYPES.CLOSET] },
    materials: { ...DEFAULT_MATERIALS },
    layout: {
        dividers: [700, 1400],
        sections: {
            0: { shelves: [{ id: generateId(), y: 1800 }], bars: [{ id: generateId(), y: 1600 }] },
            1: { shelves: [{ id: generateId(), y: 300 }] },
            2: { drawers: [{ id: generateId(), y: 0, height: 200 }] },
        },
    },
    totalDoors: 0,
    costRates: { ...DEFAULT_COST_RATES },
    quotation: null,
    workOrder: null,
    optimizationResult: null,
});

// ═══════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════
const loadState = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.projects && parsed.projects.length > 0) {
                // Normalize thicknesses
                parsed.projects.forEach(p => {
                    if (p.materials) p.materials.thickness = parseInt(p.materials.thickness) || 18;
                });
                return parsed;
            }
        }
    } catch (e) { console.warn('State load failed', e); }
    return null;
};

const createInitialState = () => {
    const saved = loadState();
    if (saved) return saved;

    const defaultProject = createDefaultProject('Proyecto Principal');
    return {
        projects: [defaultProject],
        activeProjectId: defaultProject.id,
        inventory: { ...DEFAULT_INVENTORY },
        reporting: {
            completedJobs: [],
            monthlyRevenue: {},
        },
    };
};

// ═══════════════════════════════════════════════
// ACTION TYPES
// ═══════════════════════════════════════════════
export const ACTIONS = {
    // Project management
    ADD_PROJECT: 'ADD_PROJECT',
    DELETE_PROJECT: 'DELETE_PROJECT',
    DUPLICATE_PROJECT: 'DUPLICATE_PROJECT',
    SET_ACTIVE_PROJECT: 'SET_ACTIVE_PROJECT',
    RENAME_PROJECT: 'RENAME_PROJECT',

    // Project data
    SET_DIMENSIONS: 'SET_DIMENSIONS',
    SET_MATERIALS: 'SET_MATERIALS',
    SET_LAYOUT: 'SET_LAYOUT',
    SET_CABINET_TYPE: 'SET_CABINET_TYPE',
    UPDATE_DIVIDERS: 'UPDATE_DIVIDERS',
    UPDATE_SECTION: 'UPDATE_SECTION',
    SET_DOORS: 'SET_DOORS',
    ADD_ITEM: 'ADD_ITEM',
    MOVE_ITEM: 'MOVE_ITEM',
    MOVE_ITEMS_BATCH: 'MOVE_ITEMS_BATCH',

    // Cost rates
    SET_COST_RATES: 'SET_COST_RATES',

    // Quotation
    SET_QUOTATION: 'SET_QUOTATION',

    // Work order
    SET_WORK_ORDER: 'SET_WORK_ORDER',
    UPDATE_WO_STATUS: 'UPDATE_WO_STATUS',

    // Optimization
    SET_OPTIMIZATION: 'SET_OPTIMIZATION',

    // Inventory
    UPDATE_INVENTORY: 'UPDATE_INVENTORY',
    DEDUCT_INVENTORY: 'DEDUCT_INVENTORY',
    RESTOCK_INVENTORY: 'RESTOCK_INVENTORY',

    // Reporting
    RECORD_COMPLETED_JOB: 'RECORD_COMPLETED_JOB',

    // Full state
    LOAD_STATE: 'LOAD_STATE',
    LOAD_PROJECT_FILE: 'LOAD_PROJECT_FILE',
};

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
const getItemKey = (type) => {
    const map = { drawer: 'drawers', shelf: 'shelves', bar: 'bars', partialDivider: 'partialDividers' };
    return map[type] || 'shelves';
};

const updateActiveProject = (state, updater) => {
    return {
        ...state,
        projects: state.projects.map(p =>
            p.id === state.activeProjectId
                ? { ...updater(p), updatedAt: new Date().toISOString() }
                : p
        ),
    };
};

// ═══════════════════════════════════════════════
// REDUCER
// ═══════════════════════════════════════════════
const storeReducer = (state, action) => {
    switch (action.type) {
        // ─── Project Management ─────────────────────
        case ACTIONS.ADD_PROJECT: {
            const newProject = createDefaultProject(action.payload?.name || 'Nuevo Proyecto');
            return {
                ...state,
                projects: [...state.projects, newProject],
                activeProjectId: newProject.id,
            };
        }

        case ACTIONS.DELETE_PROJECT: {
            if (state.projects.length <= 1) return state;
            const remaining = state.projects.filter(p => p.id !== action.payload);
            return {
                ...state,
                projects: remaining,
                activeProjectId: state.activeProjectId === action.payload
                    ? remaining[0].id
                    : state.activeProjectId,
            };
        }

        case ACTIONS.DUPLICATE_PROJECT: {
            const source = state.projects.find(p => p.id === action.payload);
            if (!source) return state;
            const dup = {
                ...JSON.parse(JSON.stringify(source)),
                id: generateId(),
                name: source.name + ' (Copia)',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            return {
                ...state,
                projects: [...state.projects, dup],
                activeProjectId: dup.id,
            };
        }

        case ACTIONS.SET_ACTIVE_PROJECT:
            return { ...state, activeProjectId: action.payload };

        case ACTIONS.RENAME_PROJECT:
            return {
                ...state,
                projects: state.projects.map(p =>
                    p.id === action.payload.id ? { ...p, name: action.payload.name } : p
                ),
            };

        // ─── Project Data ───────────────────────────
        case ACTIONS.SET_DIMENSIONS:
            return updateActiveProject(state, p => {
                const newDimensions = { ...p.dimensions, ...action.payload };
                const thick = parseInt(p.materials.thickness) || 18;
                const internalHeight = newDimensions.height - (thick * 2) - 50; // Zocalo factor: 50

                // Clamp all items to new internal height with a safe margin
                const newSections = { ...p.layout.sections };
                const safeMaxY = Math.max(0, internalHeight - thick - 5); // Leave 5mm gap at top

                Object.keys(newSections).forEach(key => {
                    const section = newSections[key];
                    newSections[key] = {
                        ...section,
                        shelves: (section.shelves || []).map(s => ({ ...s, y: Math.min(s.y, safeMaxY) })),
                        bars: (section.bars || []).map(b => ({ ...b, y: Math.min(b.y, safeMaxY) })),
                        drawers: (section.drawers || []).map(d => {
                            const h = d.height || 200;
                            return { ...d, y: Math.min(d.y, internalHeight - h) };
                        })
                    };
                });

                return {
                    ...p,
                    dimensions: newDimensions,
                    layout: { ...p.layout, sections: newSections }
                };
            });

        case ACTIONS.SET_MATERIALS: {
            const matPayload = { ...action.payload };
            if (matPayload.thickness !== undefined) {
                matPayload.thickness = parseInt(matPayload.thickness) || 18;
            }
            return updateActiveProject(state, p => ({
                ...p, materials: { ...p.materials, ...matPayload }
            }));
        }

        case ACTIONS.SET_CABINET_TYPE: {
            const newType = action.payload;
            const defaults = CABINET_DEFAULTS[newType] || CABINET_DEFAULTS[CABINET_TYPES.CLOSET];
            return updateActiveProject(state, p => ({
                ...p,
                cabinetType: newType,
                dimensions: { ...defaults },
                layout: { dividers: [], sections: {} },
                totalDoors: 0,
            }));
        }

        case ACTIONS.SET_DOORS:
            return updateActiveProject(state, p => ({
                ...p, totalDoors: Math.max(0, parseInt(action.payload) || 0)
            }));

        case ACTIONS.SET_LAYOUT:
            return updateActiveProject(state, p => ({
                ...p, layout: action.payload
            }));

        case ACTIONS.UPDATE_DIVIDERS:
            return updateActiveProject(state, p => ({
                ...p, layout: { ...p.layout, dividers: action.payload }
            }));

        case ACTIONS.UPDATE_SECTION: {
            const { sectionIndex, updates } = action.payload;
            return updateActiveProject(state, p => {
                const currentSection = p.layout.sections[sectionIndex] || {
                    shelves: [], drawers: [], bars: [], partialDividers: []
                };
                return {
                    ...p,
                    layout: {
                        ...p.layout,
                        sections: {
                            ...p.layout.sections,
                            [sectionIndex]: { ...currentSection, ...updates }
                        }
                    }
                };
            });
        }

        case ACTIONS.ADD_ITEM: {
            const { sectionIndex, type, config } = action.payload;
            return updateActiveProject(state, p => {
                const currentSection = p.layout.sections[sectionIndex] || {
                    shelves: [], drawers: [], bars: [], partialDividers: []
                };
                const key = getItemKey(type);
                const list = currentSection[key] || [];
                const thick = parseInt(p.materials.thickness) || 18;

                let newItem = { id: config.id || generateId(), ...config };

                const internalHeight = p.dimensions.height - (thick * 2) - 50;

                if (type === 'shelf') {
                    const existingShelves = currentSection.shelves || [];
                    const existingDrawers = currentSection.drawers || [];
                    const safeMaxY = internalHeight - thick - 5;

                    let maxBelowY = 0;
                    if (existingDrawers.length > 0) {
                        maxBelowY = existingDrawers.reduce((max, d) =>
                            Math.max(max, (d.y || 0) + (d.height || 200) + thick), 0);
                    }
                    if (existingShelves.length > 0) {
                        maxBelowY = Math.max(maxBelowY, existingShelves.reduce((max, s) => Math.max(max, s.y + thick), 0));
                    }

                    if (existingDrawers.length === 0 && existingShelves.length === 0) {
                        // Center by default if empty, or at 300 if plenty of space
                        newItem.y = Math.min(300, Math.round(internalHeight / 2));
                    } else {
                        const targetY = maxBelowY + 350;
                        if (targetY > safeMaxY) {
                            // Si no hay espacio para 350mm, centrar en el espacio restante
                            const remainingSpace = internalHeight - maxBelowY;
                            if (remainingSpace > thick + 20) {
                                newItem.y = maxBelowY + Math.round(remainingSpace / 2) - Math.round(thick / 2);
                            } else {
                                newItem.y = Math.min(maxBelowY + 3, safeMaxY);
                            }
                        } else {
                            newItem.y = targetY;
                        }
                    }
                }

                if (type === 'bar') {
                    // Place bar at 85% of height by default, or 1800 if it fits
                    newItem.y = Math.min(1800, Math.round(internalHeight * 0.85));
                }

                if (type === 'partialDivider') {
                    newItem.x = 300;
                    newItem.startY = 0;
                    newItem.endY = Math.min(1000, internalHeight);
                }

                if (type === 'drawer') {
                    const h = config.height || 200;
                    if (list.length > 0) {
                        // Encontrar el cajón más alto (por su borde superior = y + height)
                        const topEdge = list.reduce((maxTop, d) => {
                            const dTop = (d.y || 0) + (d.height || 200);
                            return dTop > maxTop ? dTop : maxTop;
                        }, 0);
                        newItem.y = topEdge + 3; // 3mm de separación
                    } else {
                        newItem.y = 0; // Primer cajón desde el piso
                    }
                    newItem.height = h;

                    // Ensure drawer doesn't exceed cabinet top
                    if (newItem.y + h > internalHeight) {
                        newItem.y = Math.max(0, internalHeight - h);
                    }
                }

                return {
                    ...p,
                    layout: {
                        ...p.layout,
                        sections: {
                            ...p.layout.sections,
                            [sectionIndex]: { ...currentSection, [key]: [...list, newItem] }
                        }
                    }
                };
            });
        }

        case ACTIONS.MOVE_ITEM: {
            const { fromSection, toSection, itemId, type, newProps } = action.payload;
            return updateActiveProject(state, p => {
                const key = getItemKey(type);
                const sourceSection = p.layout.sections[fromSection] || {};
                const targetSection = p.layout.sections[toSection] || {};
                const sourceList = sourceSection[key] || [];
                const targetList = targetSection[key] || [];
                const itemIndex = sourceList.findIndex(i => i.id === itemId);
                if (itemIndex === -1) return p;
                const item = sourceList[itemIndex];
                const newSourceList = sourceList.filter((_, idx) => idx !== itemIndex);
                const newItem = { ...item, ...newProps };
                return {
                    ...p,
                    layout: {
                        ...p.layout,
                        sections: {
                            ...p.layout.sections,
                            [fromSection]: { ...sourceSection, [key]: newSourceList },
                            [toSection]: { ...targetSection, [key]: [...targetList, newItem] }
                        }
                    }
                };
            });
        }

        case ACTIONS.MOVE_ITEMS_BATCH: {
            const { sourceSectionIndex, targetSectionIndex, itemIds, type } = action.payload;
            if (sourceSectionIndex === targetSectionIndex) return state;
            return updateActiveProject(state, p => {
                const key = getItemKey(type);
                const sourceSection = p.layout.sections[sourceSectionIndex] || {};
                const targetSection = p.layout.sections[targetSectionIndex] || {};
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
                    ...item, y: startY + (index * ((item.height || 18) + 20))
                }));
                return {
                    ...p,
                    layout: {
                        ...p.layout,
                        sections: {
                            ...p.layout.sections,
                            [sourceSectionIndex]: { ...sourceSection, [key]: newSourceList },
                            [targetSectionIndex]: { ...targetSection, [key]: [...targetList, ...movedItems] }
                        }
                    }
                };
            });
        }

        // ─── Cost Rates ─────────────────────────────
        case ACTIONS.SET_COST_RATES:
            return updateActiveProject(state, p => ({
                ...p, costRates: { ...p.costRates, ...action.payload }
            }));

        // ─── Quotation ──────────────────────────────
        case ACTIONS.SET_QUOTATION:
            return updateActiveProject(state, p => ({
                ...p, quotation: action.payload
            }));

        // ─── Work Order ─────────────────────────────
        case ACTIONS.SET_WORK_ORDER:
            return updateActiveProject(state, p => ({
                ...p, workOrder: action.payload
            }));

        case ACTIONS.UPDATE_WO_STATUS:
            return updateActiveProject(state, p => ({
                ...p,
                workOrder: p.workOrder
                    ? { ...p.workOrder, status: action.payload }
                    : null
            }));

        // ─── Optimization ───────────────────────────
        case ACTIONS.SET_OPTIMIZATION:
            return updateActiveProject(state, p => ({
                ...p, optimizationResult: action.payload
            }));

        // ─── Inventory ──────────────────────────────
        case ACTIONS.UPDATE_INVENTORY:
            return {
                ...state,
                inventory: { ...state.inventory, ...action.payload }
            };

        case ACTIONS.DEDUCT_INVENTORY: {
            const deductions = action.payload; // { boards: 3, edgeBanding: 12, ... }
            const newInventory = { ...state.inventory };
            Object.entries(deductions).forEach(([key, amount]) => {
                if (newInventory[key]) {
                    newInventory[key] = {
                        ...newInventory[key],
                        qty: Math.max(0, newInventory[key].qty - amount)
                    };
                }
            });
            return { ...state, inventory: newInventory };
        }

        case ACTIONS.RESTOCK_INVENTORY: {
            const { item, amount } = action.payload;
            if (!state.inventory[item]) return state;
            return {
                ...state,
                inventory: {
                    ...state.inventory,
                    [item]: {
                        ...state.inventory[item],
                        qty: state.inventory[item].qty + amount
                    }
                }
            };
        }

        // ─── Reporting ──────────────────────────────
        case ACTIONS.RECORD_COMPLETED_JOB: {
            const job = action.payload;
            const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
            const currentMonthRevenue = state.reporting.monthlyRevenue[monthKey] || 0;
            return {
                ...state,
                reporting: {
                    completedJobs: [...state.reporting.completedJobs, job],
                    monthlyRevenue: {
                        ...state.reporting.monthlyRevenue,
                        [monthKey]: currentMonthRevenue + (job.revenue || 0)
                    }
                }
            };
        }

        // ─── Load State ─────────────────────────────
        case ACTIONS.LOAD_STATE:
            return action.payload;

        case ACTIONS.LOAD_PROJECT_FILE: {
            const importedData = action.payload;
            const newProject = {
                ...createDefaultProject(importedData.name || 'Proyecto Importado'),
                dimensions: importedData.dimensions || CABINET_DEFAULTS[CABINET_TYPES.CLOSET],
                materials: { ...DEFAULT_MATERIALS, ...(importedData.materials || {}) },
                layout: importedData.layout || { dividers: [], sections: {} },
                totalDoors: importedData.totalDoors || 0,
            };
            if (newProject.materials.thickness) {
                newProject.materials.thickness = parseInt(newProject.materials.thickness) || 18;
            }
            return {
                ...state,
                projects: [...state.projects, newProject],
                activeProjectId: newProject.id,
            };
        }

        default:
            return state;
    }
};

// ═══════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════
const StoreContext = createContext(null);

export const StoreProvider = ({ children }) => {
    const [state, dispatch] = useReducer(storeReducer, null, createInitialState);

    // Autosave with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (e) { console.warn('Autosave failed:', e); }
        }, 1500);
        return () => clearTimeout(timer);
    }, [state]);

    return (
        <StoreContext.Provider value={{ state, dispatch }}>
            {children}
        </StoreContext.Provider>
    );
};

// ═══════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════
export const useStore = () => {
    const ctx = useContext(StoreContext);
    if (!ctx) throw new Error('useStore must be used within StoreProvider');
    return ctx;
};

/**
 * Convenience hook — returns active project and bound dispatch actions.
 */
export const useActiveProject = () => {
    const { state, dispatch } = useStore();
    const project = state.projects.find(p => p.id === state.activeProjectId)
        || state.projects[0];

    const actions = {
        setDimensions: (dims) => dispatch({ type: ACTIONS.SET_DIMENSIONS, payload: dims }),
        setMaterials: (mats) => dispatch({ type: ACTIONS.SET_MATERIALS, payload: mats }),
        setCabinetType: (t) => dispatch({ type: ACTIONS.SET_CABINET_TYPE, payload: t }),
        setDoors: (val) => dispatch({ type: ACTIONS.SET_DOORS, payload: val }),

        addDivider: () => {
            const thick = parseInt(project.materials.thickness) || 18;
            const width = project.dimensions.width - (2 * thick);
            const count = project.layout.dividers.length + 2;
            const newDivs = Array.from({ length: count - 1 }, (_, i) =>
                Math.round((width / count) * (i + 1))
            );
            dispatch({ type: ACTIONS.UPDATE_DIVIDERS, payload: newDivs });
        },
        removeDivider: () => {
            if (project.layout.dividers.length === 0) return;
            dispatch({ type: ACTIONS.UPDATE_DIVIDERS, payload: project.layout.dividers.slice(0, -1) });
        },
        updateDividerPos: (index, newX) => {
            const newDivs = [...project.layout.dividers];
            newDivs[index] = Math.round(newX);
            dispatch({ type: ACTIONS.UPDATE_DIVIDERS, payload: newDivs });
        },

        addItem: (sectionIndex, type, config = {}) => {
            if (sectionIndex === null || sectionIndex === undefined) return;
            dispatch({ type: ACTIONS.ADD_ITEM, payload: { sectionIndex, type, config } });
        },
        removeItem: (sectionIndex, type) => {
            if (sectionIndex === null || sectionIndex === undefined) return;
            const key = getItemKey(type);
            const list = project.layout.sections[sectionIndex]?.[key] || [];
            if (list.length === 0) return;
            dispatch({
                type: ACTIONS.UPDATE_SECTION,
                payload: { sectionIndex, updates: { [key]: list.slice(0, -1) } }
            });
        },
        updateItem: (sectionIndex, itemId, type, updates) => {
            if (sectionIndex === null || sectionIndex === undefined) return;
            const key = getItemKey(type);
            const list = project.layout.sections[sectionIndex]?.[key] || [];
            const newList = list.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
            );
            dispatch({
                type: ACTIONS.UPDATE_SECTION,
                payload: { sectionIndex, updates: { [key]: newList } }
            });
        },
        moveItem: (fromSection, toSection, itemId, type, newProps) => {
            dispatch({ type: ACTIONS.MOVE_ITEM, payload: { fromSection, toSection, itemId, type, newProps } });
        },
        moveItemsBatch: (sourceSectionIndex, targetSectionIndex, itemIds, type) => {
            dispatch({ type: ACTIONS.MOVE_ITEMS_BATCH, payload: { sourceSectionIndex, targetSectionIndex, itemIds, type } });
        },

        setCostRates: (rates) => dispatch({ type: ACTIONS.SET_COST_RATES, payload: rates }),
        setQuotation: (q) => dispatch({ type: ACTIONS.SET_QUOTATION, payload: q }),
        setWorkOrder: (wo) => dispatch({ type: ACTIONS.SET_WORK_ORDER, payload: wo }),
        updateWoStatus: (s) => dispatch({ type: ACTIONS.UPDATE_WO_STATUS, payload: s }),
        setOptimization: (data) => dispatch({ type: ACTIONS.SET_OPTIMIZATION, payload: data }),
    };

    return { project, actions, dispatch };
};
