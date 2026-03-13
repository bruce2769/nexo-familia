import React, { useState } from 'react';
import { useStore, createDefaultProject, ACTIONS } from '../core/store.js';

export const ProjectSelector = ({ onClose }) => {
    const { state, dispatch } = useStore();
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    const handleCreate = () => {
        const name = newName.trim() || 'Nuevo Proyecto';
        dispatch({ type: ACTIONS.ADD_PROJECT, payload: { name } });
        setNewName('');
    };

    const handleSelect = (id) => {
        dispatch({ type: ACTIONS.SET_ACTIVE_PROJECT, payload: id });
        if (onClose) onClose();
    };

    const handleDelete = (id) => {
        if (state.projects.length <= 1) return;
        if (confirm('¿Eliminar este proyecto?')) {
            dispatch({ type: ACTIONS.DELETE_PROJECT, payload: id });
        }
    };

    const handleDuplicate = (id) => {
        dispatch({ type: ACTIONS.DUPLICATE_PROJECT, payload: id });
    };

    const handleRename = (id) => {
        if (editName.trim()) {
            dispatch({ type: ACTIONS.RENAME_PROJECT, payload: { id, name: editName.trim() } });
            setEditingId(null);
        }
    };

    return (
        <div className="project-selector-overlay" onClick={onClose}>
            <div className="project-selector" onClick={e => e.stopPropagation()}>
                <div className="ps-header">
                    <h2>📁 Proyectos</h2>
                    <button className="ps-close" onClick={onClose}>✕</button>
                </div>

                <div className="ps-create">
                    <input
                        type="text"
                        placeholder="Nombre del proyecto..."
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        className="ps-input"
                    />
                    <button className="ps-btn-create" onClick={handleCreate}>+ Crear</button>
                </div>

                <div className="ps-list">
                    {state.projects.map(p => (
                        <div
                            key={p.id}
                            className={`ps-item ${p.id === state.activeProjectId ? 'active' : ''}`}
                        >
                            <div className="ps-item-main" onClick={() => handleSelect(p.id)}>
                                <span className="ps-item-icon">
                                    {p.id === state.activeProjectId ? '📌' : '📄'}
                                </span>
                                <div className="ps-item-info">
                                    {editingId === p.id ? (
                                        <input
                                            className="ps-edit-input"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            onBlur={() => handleRename(p.id)}
                                            onKeyDown={e => e.key === 'Enter' && handleRename(p.id)}
                                            autoFocus
                                            onClick={e => e.stopPropagation()}
                                        />
                                    ) : (
                                        <>
                                            <span className="ps-item-name">{p.name}</span>
                                            <span className="ps-item-date">
                                                {new Date(p.updatedAt || p.createdAt).toLocaleDateString('es-CO')}
                                                {' · '}
                                                {p.dimensions?.width}×{p.dimensions?.height}mm
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="ps-item-actions">
                                <button
                                    title="Renombrar"
                                    onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                                >✏️</button>
                                <button
                                    title="Duplicar"
                                    onClick={() => handleDuplicate(p.id)}
                                >📋</button>
                                <button
                                    title="Eliminar"
                                    onClick={() => handleDelete(p.id)}
                                    disabled={state.projects.length <= 1}
                                >🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="ps-footer">
                    {state.projects.length} proyecto(s)
                </div>
            </div>
        </div>
    );
};
