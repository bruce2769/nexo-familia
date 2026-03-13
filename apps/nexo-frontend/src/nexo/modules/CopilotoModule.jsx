import React, { useState, useRef, useEffect } from 'react';
import { simulateCopilotResponse } from '../engine/localCopilot.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

const BACKEND_URL = import.meta.env.VITE_NEXO_BACKEND_URL || 'http://localhost:8001';

export default function CopilotoModule() {
    const { currentUser } = useAuth();
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'copilot',
            text: `¡Hola ${currentUser?.displayName || 'estratega'}! Soy **NEXO**, tu copiloto legal IA.\n\nEstoy especializado en Derecho de Familia chileno y puedo orientarte sobre pensiones, embargos, visitas, mediación y más.\n\n¿Qué consulta tienes sobre tu situación judicial?`
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [ollamaStatus, setOllamaStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
    const bottomRef = useRef(null);

    const suggestQueries = [
        "¿Me pueden embargar el sueldo por deudas de pensión?",
        "Perdí mi trabajo, ¿cómo pido una rebaja?",
        "Mi ex pareja no me deja ver a mi hijo",
        "¿Qué es exactamente una liquidación?"
    ];

    // Verificar si Ollama está disponible al montar el componente
    useEffect(() => {
        const checkOllama = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/v1/copiloto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mensaje: 'ping', historial: [] }),
                    signal: AbortSignal.timeout(5000)
                });
                setOllamaStatus(res.ok ? 'online' : 'offline');
            } catch {
                setOllamaStatus('offline');
            }
        };
        checkOllama();
    }, []);

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
            const responseText = await simulateCopilotResponse(text);
            setOllamaStatus('online');
            setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'copilot', text: responseText }]);
        } catch (err) {
            setOllamaStatus('offline');
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'error',
                text: `⚠️ Ollama no está disponible en este momento. Asegúrate de que esté corriendo con \`ollama serve\` en tu PC.\n\nHasta entonces, puedes consultar los módulos de **Guías Legales** y **Glosario**.`
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const statusConfig = {
        checking: { color: '#f59e0b', text: 'Verificando Ollama...' },
        online:   { color: 'var(--nf-green)', text: 'Ollama llama3.1 — Activo' },
        offline:  { color: 'var(--nf-red)', text: 'Ollama no disponible — Modo fallback' },
    };
    const status = statusConfig[ollamaStatus];

    return (
        <div className="nf-animate-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxWidth: 800, margin: '20px auto', background: 'var(--nf-bg2)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--nf-border)', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>

            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--nf-border)', background: 'var(--nf-bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--nf-accent), var(--nf-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }}>
                        🤖
                    </div>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Copiloto Legal AI</h2>
                        <div style={{ fontSize: 13, color: status.color, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <div style={{
                                width: 8, height: 8, background: status.color, borderRadius: '50%',
                                animation: ollamaStatus === 'online' ? 'nf-pulse 2s infinite' : 'none'
                            }} />
                            {status.text}
                        </div>
                    </div>
                </div>

                {/* Modelo info badge */}
                <div style={{ fontSize: 11, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', borderRadius: 20, padding: '4px 10px', fontFamily: 'monospace' }}>
                    llama3.1 · local
                </div>
            </div>

            {/* Aviso offline */}
            {ollamaStatus === 'offline' && (
                <div style={{ padding: '10px 20px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', fontSize: 13, color: 'var(--nf-red)', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>⚠️</span>
                    <span>Ollama no está corriendo. Ejecuta <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>ollama serve</code> en tu terminal para activar el copiloto IA.</span>
                </div>
            )}

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
                        <span style={{ fontSize: 14, color: 'var(--nf-text3)', marginLeft: 8, fontStyle: 'italic' }}>Consultando Ollama (llama3.1)...</span>
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

            {/* Input Area */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--nf-border)', background: 'var(--nf-bg)', display: 'flex', gap: 12 }}>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder={ollamaStatus === 'offline' ? 'Ollama no disponible — respuestas de fallback activas' : 'Escribe tu consulta legal aquí...'}
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
