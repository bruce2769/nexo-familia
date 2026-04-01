import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getAuth } from "firebase/auth";

const BACKEND_URL = import.meta.env.VITE_NEXO_BACKEND_URL || 'http://localhost:8001';

export default function CopilotoModule() {
    const { currentUser } = useAuth();
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'copilot',
            text: `¡Hola ${currentUser?.displayName || 'estratega'}! Soy **NEXO**, tu Abogado IA 24/7.\n\nEstoy especializado en Derecho de Familia chileno y puedo orientarte sobre pensiones, embargos, visitas, mediación y más.\n\n¿Qué consulta tienes sobre tu situación judicial?`
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [iaOnline, setIaOnline] = useState(true);
    const bottomRef = useRef(null);

    const suggestQueries = [
        "¿Me pueden embargar el sueldo por deudas de pensión?",
        "Perdí mi trabajo, ¿cómo pido una rebaja?",
        "Mi ex pareja no me deja ver a mi hijo",
        "¿Qué es exactamente una liquidación?"
    ];

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping]);

    const handleSend = async (text = input) => {
        if (!text.trim()) return;

        const userMsg = { id: Date.now(), sender: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            let token = "";
            const auth = getAuth();
            if (auth.currentUser) {
                token = await auth.currentUser.getIdToken(true);
            } else if (currentUser) {
                token = await currentUser.getIdToken(true);
            }

            const res = await fetch(`${BACKEND_URL}/api/v1/copiloto`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: text })
            });

            if (!res.ok) throw new Error('Error de red al consultar el copiloto');

            const data = await res.json();
            const responseText = data.response || data.reply || data.message || "Respuesta recibida, pero con formato inesperado.";

            setIaOnline(true);
            setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'copilot', text: responseText }]);
        } catch (err) {
            console.error("[Copiloto] Error:", err);
            setIaOnline(false);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'error',
                text: '⚠️ El servicio de IA no está disponible en este momento. Por favor, inténtalo de nuevo en unos instantes.'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="nf-animate-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxWidth: 800, margin: '20px auto', background: 'var(--nf-bg2)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--nf-border)', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>

            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--nf-border)', background: 'var(--nf-bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--nf-accent), var(--nf-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }}>
                        🤖
                    </div>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Abogado IA 24/7</h2>
                        <div style={{ fontSize: 13, color: iaOnline ? 'var(--nf-green)' : 'var(--nf-red)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <div style={{
                                width: 8, height: 8,
                                background: iaOnline ? 'var(--nf-green)' : 'var(--nf-red)',
                                borderRadius: '50%',
                                animation: iaOnline ? 'nf-pulse 2s infinite' : 'none'
                            }} />
                            {iaOnline ? 'GPT-4o Mini — Activo' : 'IA no disponible'}
                        </div>
                    </div>
                </div>

                <div style={{ fontSize: 11, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', borderRadius: 20, padding: '4px 10px', fontFamily: 'monospace' }}>
                    gpt-4o-mini · cloud
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {messages.map(msg => (
                    <div key={msg.id} style={{
                        alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4
                    }}>
                        <div style={{
                            fontSize: 12,
                            color: 'var(--nf-text3)',
                            fontWeight: 600,
                            marginLeft: msg.sender === 'user' ? 'auto' : 4
                        }}>
                            {msg.sender === 'user' ? (currentUser?.displayName || 'Tú') : msg.sender === 'error' ? '⚠️ Sistema' : 'NEXO · Copiloto'}
                        </div>
                        <div style={{
                            background: msg.sender === 'user' ? 'var(--nf-accent)' : msg.sender === 'error' ? 'rgba(239,68,68,0.08)' : 'var(--nf-bg)',
                            color: msg.sender === 'user' ? '#fff' : msg.sender === 'error' ? 'var(--nf-red)' : 'var(--nf-text)',
                            padding: '16px 20px',
                            borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                            border: msg.sender === 'user' ? 'none' : msg.sender === 'error' ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--nf-border)',
                            lineHeight: 1.6,
                            fontSize: 15,
                            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {msg.text}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div style={{ alignSelf: 'flex-start', background: 'var(--nf-bg)', padding: '16px 20px', borderRadius: '20px 20px 20px 4px', border: '1px solid var(--nf-border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div className="nf-typing-dot" style={{ animationDelay: '0s' }} />
                        <div className="nf-typing-dot" style={{ animationDelay: '0.2s' }} />
                        <div className="nf-typing-dot" style={{ animationDelay: '0.4s' }} />
                        <span style={{ fontSize: 14, color: 'var(--nf-text3)', marginLeft: 8, fontStyle: 'italic' }}>Consultando NEXO IA...</span>
                    </div>
                )}
                <div ref={bottomRef} style={{ height: 1 }} />
            </div>

            {/* Suggestions */}
            {messages.length === 1 && (
                <div style={{ padding: '0 20px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {suggestQueries.map(q => (
                        <button
                            key={q}
                            onClick={() => handleSend(q)}
                            className="nf-btn nf-btn-ghost"
                            style={{ fontSize: 13, padding: '8px 16px', background: 'var(--nf-bg)', borderRadius: 20, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
                        >
                            {q}
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--nf-border)', background: 'var(--nf-bg)', display: 'flex', gap: 12 }}>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Escribe tu consulta legal aquí..."
                    className="nf-input"
                    style={{ flex: 1, borderRadius: 24, paddingLeft: 20, fontSize: 16 }}
                />
                <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isTyping}
                    className="nf-btn nf-btn-primary"
                    style={{ width: 50, height: 50, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!input.trim() || isTyping) ? 0.5 : 1 }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5"></line>
                        <polyline points="5 12 12 5 19 12"></polyline>
                    </svg>
                </button>
            </div>
        </div>
    );
}
