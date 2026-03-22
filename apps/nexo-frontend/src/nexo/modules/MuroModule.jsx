import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { db } from '../../firebase/db.js';
import {
    collection, addDoc, onSnapshot, query,
    orderBy, deleteDoc, doc, updateDoc,
    serverTimestamp, increment
} from 'firebase/firestore';

const CATEGORIES = [
    { id: 'all',        label: 'Todos',       icon: '📌' },
    { id: 'pregunta',   label: 'Pregunta',    icon: '❓' },
    { id: 'comentario', label: 'Comentario',  icon: '💬' },
    { id: 'experiencia',label: 'Experiencia', icon: '📖' },
    { id: 'comparacion',label: 'Comparación', icon: '⚖️' },
];

const AVATARS = ['🧑', '👩', '👤', '🙋', '🙎', '👨', '🧔', '👧'];
const SORT_OPTIONS = [
    { id: 'recent',  label: '🕐 Recientes' },
    { id: 'popular', label: '🔥 Populares' },
];

// ── Nombre anónimo basado en uid parcial ──────────────────────────────────────
const anonNombre = (uid) => {
    if (uid === 'nexo-admin') return '🏛️ Abogado Nexo';
    return uid ? `Usuario ${uid.slice(-4).toUpperCase()}` : 'Anónimo';
};

const MOCK_POSTS = [
    {
        id: 'mock1',
        category: 'pregunta',
        autorUid: 'mock-1111',
        text: "¿Alguien sabe cuánto demora en promedio una retención del 10% de la AFP si el demandado no ha pagado la pensión en 6 meses? Ya hice la solicitud en la ventanilla virtual.",
        likes: 12,
        repliesCount: 2,
        creadoAt: new Date(Date.now() - 172800000), // 2 days ago
        avatar: 1,
        mockReplies: [
            { id: 'r1', autorUid: 'nexo-admin', text: 'Hola. Una vez ingresada la solicitud, el tribunal oficia a la AFP (suele tardar 5-10 días hábiles). Luego la AFP tiene 15 días hábiles para transferir los fondos. Te recomiendo revisar la Oficina Judicial Virtual constatemente.', creadoAt: new Date(Date.now() - 86400000), avatar: 0 },
            { id: 'r2', autorUid: 'mock-2222', text: 'A mí me tardó como 3 semanas en total desde la liquidación hasta el pago. ¡Paciencia!', creadoAt: new Date(Date.now() - 40000000), avatar: 3 }
        ]
    },
    {
        id: 'mock2',
        category: 'experiencia',
        autorUid: 'mock-3333',
        text: "Acabo de generar mi primer escrito para rebaja de pensión alimenticia usando Nexo Familia. Me ahorré casi 60 lucas que me cobraba un abogado solo por redactarlo jajaja. ¿Ahora solo lo subo a la Oficina Judicial Virtual con mi Clave Única?",
        likes: 24,
        repliesCount: 1,
        creadoAt: new Date(Date.now() - 36000000), // 10 hours ago
        avatar: 4,
        mockReplies: [
            { id: 'r3', autorUid: 'nexo-admin', text: '¡Exactamente! Solo asegúrate de subirlo como PDF en la sección "Ingreso de Escritos" de tu causa usando tu Clave Única. Recuerda que para rebaja temporal o permanente también debes adjuntar el certificado de mediación frustrada.', creadoAt: new Date(Date.now() - 18000000), avatar: 0 }
        ]
    }
];

export default function MuroModule() {
    const { currentUser } = useAuth();

    const [posts, setPosts]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [sort, setSort]     = useState('recent');
    const [search, setSearch] = useState('');
    const [newPost, setNewPost] = useState({ text: '', category: 'pregunta' });
    const [posting, setPosting] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [expandedReplies, setExpandedReplies] = useState({});
    const [likedPosts, setLikedPosts] = useState(() => {
        try { return JSON.parse(localStorage.getItem('nexo-muro-likes-v3') || '{}'); } catch { return {}; }
    });

    // ── Firestore: escuchar posts en tiempo real ──────────────────────────────
    useEffect(() => {
        const q = query(
            collection(db, 'muro'),
            orderBy('creadoAt', 'desc')
        );
        const unsub = onSnapshot(q, (snap) => {
            setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (err) => {
            console.error('[MuroModule] Firestore:', err);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // ── Persistir likes localmente ────────────────────────────────────────────
    useEffect(() => {
        localStorage.setItem('nexo-muro-likes-v3', JSON.stringify(likedPosts));
    }, [likedPosts]);

    // ── Publicar post ─────────────────────────────────────────────────────────
    const handlePost = useCallback(async (e) => {
        e.preventDefault();
        if (!newPost.text.trim()) return;
        if (!currentUser) {
            alert('Debes iniciar sesión (o modo anónimo) para publicar en el Muro.');
            return;
        }
        setPosting(true);
        try {
            await addDoc(collection(db, 'muro'), {
                category: newPost.category,
                text: newPost.text.trim(),
                likes: 0,
                creadoAt: serverTimestamp(),
                avatar: Math.floor(Math.random() * AVATARS.length),
                autorUid: currentUser.uid,
                repliesCount: 0,
            });
            setNewPost({ text: '', category: 'pregunta' });
        } catch (err) {
            console.error('[MuroModule] Error publicando:', err);
        } finally {
            setPosting(false);
        }
    }, [newPost, currentUser]);

    // ── Like / Unlike ─────────────────────────────────────────────────────────
    const toggleLike = useCallback(async (postId) => {
        if (!currentUser) return;
        const isLiked = likedPosts[postId];
        setLikedPosts(prev => ({ ...prev, [postId]: !isLiked }));
        try {
            await updateDoc(doc(db, 'muro', postId), {
                likes: increment(isLiked ? -1 : 1)
            });
        } catch (err) {
            // Revertir si falla
            setLikedPosts(prev => ({ ...prev, [postId]: isLiked }));
        }
    }, [currentUser, likedPosts]);

    // ── Eliminar post propio ──────────────────────────────────────────────────
    const handleDelete = useCallback(async (postId) => {
        if (!currentUser) return;
        try {
            await deleteDoc(doc(db, 'muro', postId));
        } catch (err) {
            console.error('[MuroModule] Error eliminando:', err);
        }
    }, [currentUser]);

    // ── Responder post ────────────────────────────────────────────────────────
    const handleReply = useCallback(async (postId) => {
        if (!replyText.trim() || !currentUser) return;
        try {
            await addDoc(collection(db, 'muro', postId, 'replies'), {
                text: replyText.trim(),
                creadoAt: serverTimestamp(),
                avatar: Math.floor(Math.random() * AVATARS.length),
                autorUid: currentUser.uid,
                likes: 0,
            });
            // Incrementar contador de replies
            await updateDoc(doc(db, 'muro', postId), { repliesCount: increment(1) });
            setReplyText('');
            setReplyTo(null);
            setExpandedReplies(prev => ({ ...prev, [postId]: true }));
        } catch (err) {
            console.error('[MuroModule] Error respondiendo:', err);
        }
    }, [replyText, currentUser]);

    // ── Filtrar y ordenar posts ───────────────────────────────────────────────
    const combinedPosts = [...MOCK_POSTS, ...posts];
    let filtered = filter === 'all' ? combinedPosts : combinedPosts.filter(p => p.category === filter);
    if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(p => p.text.toLowerCase().includes(q));
    }
    if (sort === 'popular') {
        filtered = [...filtered].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else {
        filtered = [...filtered].sort((a, b) => {
            const timeA = a.creadoAt?.toDate ? a.creadoAt.toDate().getTime() : new Date(a.creadoAt).getTime();
            const timeB = b.creadoAt?.toDate ? b.creadoAt.toDate().getTime() : new Date(b.creadoAt).getTime();
            return timeB - timeA;
        });
    }

    const catOf = (id) => CATEGORIES.find(c => c.id === id);
    const formatTime = (ts) => {
        if (!ts) return 'Justo ahora';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const diff = (Date.now() - d.getTime()) / 1000;
        if (diff < 60) return 'Hace un momento';
        if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
        return `Hace ${Math.floor(diff / 86400)} días`;
    };

    return (
        <div>
            <div className="nf-module-header nf-animate-in">
                <h1>💬 Muro Comunitario</h1>
                <p>Espacio anónimo para compartir experiencias, preguntas y apoyo. Las publicaciones se guardan en la nube.</p>
            </div>

            {/* Badge de estado */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                {currentUser ? (
                    <span className="nf-badge green">☁️ Publicando como {anonNombre(currentUser.uid)}</span>
                ) : (
                    <span className="nf-badge yellow">⚠️ Inicia sesión para publicar</span>
                )}
            </div>

            {/* Nuevo Post */}
            <div className="nf-card nf-animate-in" style={{ animationDelay: '.08s', marginBottom: 24 }}>
                <form className="nf-post-form" onSubmit={handlePost}>
                    <div className="nf-row">
                        <div className="nf-field" style={{ flex: 1 }}>
                            <select className="nf-select" value={newPost.category}
                                onChange={e => setNewPost({ ...newPost, category: e.target.value })}>
                                {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                                    <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button type="submit" className="nf-btn nf-btn-primary"
                                disabled={!newPost.text.trim() || posting || !currentUser}>
                                {posting ? '⏳' : 'Publicar'}
                            </button>
                        </div>
                    </div>
                    <textarea className="nf-textarea"
                        placeholder={currentUser
                            ? 'Comparte tu experiencia, pregunta o comentario de forma anónima...'
                            : 'Inicia sesión para poder publicar en el Muro...'}
                        value={newPost.text}
                        onChange={e => setNewPost({ ...newPost, text: e.target.value })}
                        disabled={!currentUser}
                        style={{ minHeight: 80 }} />
                </form>
            </div>

            {/* Búsqueda + Filtros */}
            <div className="nf-animate-in" style={{ animationDelay: '.12s', marginBottom: 20 }}>
                <input className="nf-input" type="text" placeholder="🔍 Buscar en el muro..."
                    value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 12 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div className="nf-filter-bar" style={{ marginBottom: 0 }}>
                        {CATEGORIES.map(c => (
                            <button key={c.id} className={`nf-filter-chip${filter === c.id ? ' active' : ''}`}
                                onClick={() => setFilter(c.id)}>
                                {c.icon} {c.label}
                            </button>
                        ))}
                    </div>
                    <div className="nf-filter-bar" style={{ marginBottom: 0 }}>
                        {SORT_OPTIONS.map(s => (
                            <button key={s.id} className={`nf-filter-chip${sort === s.id ? ' active' : ''}`}
                                onClick={() => setSort(s.id)}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Posts */}
            <div className="nf-posts">
                {loading ? (
                    <div className="nf-card" style={{ textAlign: 'center', padding: 48, color: 'var(--nf-text3)' }}>
                        <p style={{ fontSize: 32, marginBottom: 8 }}>⏳</p>
                        <p>Cargando publicaciones...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="nf-card" style={{ textAlign: 'center', padding: 40, color: 'var(--nf-text3)' }}>
                        <p style={{ fontSize: 32, marginBottom: 8 }}>🫥</p>
                        <p>No se encontraron publicaciones. {search ? 'Intenta otra búsqueda.' : '¡Sé el primero!'}</p>
                    </div>
                ) : (
                    filtered.map(post => {
                        const cat = catOf(post.category);
                        const isOwn = currentUser && post.autorUid === currentUser.uid;
                        const showReplies = expandedReplies[post.id];
                        return (
                            <div className="nf-post" key={post.id}>
                                <div className="nf-post-top">
                                    <div className="nf-post-avatar">{AVATARS[(post.avatar || 0) % AVATARS.length]}</div>
                                    <div className="nf-post-meta">
                                        <div className="nf-post-author">
                                            {anonNombre(post.autorUid)}
                                            {isOwn && <span style={{ fontSize: 11, color: 'var(--nf-text3)', marginLeft: 6 }}>(tú)</span>}
                                        </div>
                                        <div className="nf-post-time">{formatTime(post.creadoAt)}</div>
                                    </div>
                                    {cat && <span className="nf-badge purple">{cat.icon} {cat.label}</span>}
                                    {isOwn && (
                                        <button
                                            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--nf-text3)', cursor: 'pointer', fontSize: 13 }}
                                            onClick={() => handleDelete(post.id)}>
                                            🗑️
                                        </button>
                                    )}
                                </div>
                                <div className="nf-post-body">{post.text}</div>
                                <div className="nf-post-actions">
                                    <button
                                        className={`nf-post-action${likedPosts[post.id] ? ' liked' : ''}`}
                                        onClick={() => toggleLike(post.id)}
                                        disabled={!currentUser}>
                                        {likedPosts[post.id] ? '💜' : '🤍'} {post.likes || 0}
                                    </button>
                                    <button className="nf-post-action"
                                        onClick={() => setReplyTo(replyTo === post.id ? null : post.id)}>
                                        💬 {post.repliesCount > 0 ? post.repliesCount : 'Responder'}
                                    </button>
                                    {(post.repliesCount > 0) && (
                                        <button className="nf-post-action"
                                            onClick={() => setExpandedReplies(prev => ({ ...prev, [post.id]: !showReplies }))}>
                                            {showReplies ? '▲ Ocultar' : `▼ Ver ${post.repliesCount} respuesta${post.repliesCount > 1 ? 's' : ''}`}
                                        </button>
                                    )}
                                </div>

                                {/* Reply Form */}
                                {replyTo === post.id && currentUser && (
                                    <div className="nf-reply-form nf-animate-in">
                                        <input className="nf-input" placeholder="Escribe tu respuesta..."
                                            value={replyText} onChange={e => setReplyText(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(post.id); } }} />
                                        <button className="nf-btn nf-btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}
                                            onClick={() => handleReply(post.id)} disabled={!replyText.trim()}>
                                            Enviar
                                        </button>
                                    </div>
                                )}

                                {/* Replies Thread — se cargan bajo demanda desde Firestore */}
                                {showReplies && <RepliesThread postId={post.id} mockReplies={post.mockReplies} />}
                            </div>
                        );
                    })
                )}
            </div>

            <div className="nf-disclaimer" style={{ marginTop: 24 }}>
                <span>📋</span>
                Espacio moderado. No se permite asesoría legal directa. Las publicaciones son anónimas y están almacenadas en Firestore.
            </div>
        </div>
    );
}

// ── Sub-componente: Replies (carga lazy desde Firestore) ──────────────────────
function RepliesThread({ postId, mockReplies }) {
    const [replies, setReplies] = useState(mockReplies || []);

    useEffect(() => {
        if (mockReplies) return; // Skip Firestore fetching for mock posts
        
        const q = query(
            collection(db, 'muro', postId, 'replies'),
            orderBy('creadoAt', 'asc')
        );
        const unsub = onSnapshot(q, snap => {
            setReplies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [postId, mockReplies]);

    const formatTime = (ts) => {
        if (!ts) return 'Justo ahora';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const diff = (Date.now() - d.getTime()) / 1000;
        if (diff < 3600) return `Hace ${Math.max(1, Math.floor(diff / 60))} min`;
        if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
        return `Hace ${Math.floor(diff / 86400)} días`;
    };

    const AVATARS = ['🧑', '👩', '👤', '🙋', '🙎', '👨', '🧔', '👧'];

    return (
        <div className="nf-replies">
            {replies.map(r => (
                <div className="nf-reply nf-animate-in" key={r.id}>
                    <div className="nf-post-avatar" style={{ width: 28, height: 28, fontSize: 13 }}>
                        {AVATARS[(r.avatar || 0) % AVATARS.length]}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>
                                {r.autorUid === 'nexo-admin' ? '🏛️ Abogado Nexo' : `Usuario ${(r.autorUid || '----').slice(-4).toUpperCase()}`}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--nf-text3)' }}>{formatTime(r.creadoAt)}</span>
                        </div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{r.text}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
