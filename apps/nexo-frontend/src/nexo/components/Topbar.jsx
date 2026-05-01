import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = import.meta.env.VITE_NEXO_BACKEND_URL || 'http://localhost:8001';

export default function Topbar({ onNavigate }) {
    const { currentUser } = useAuth();
    const [credits, setCredits]           = useState(null);
    const [loadingTopup, setLoadingTopup] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const dropdownRef = useRef(null);

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Escuchar créditos en tiempo real desde Firestore
    useEffect(() => {
        if (!currentUser) return;
        if (currentUser.isAnonymous) {
            setCredits(1);
            return;
        }
        const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (docObj) => {
            setCredits(docObj.exists() ? (docObj.data().credits ?? 0) : 0);
        });
        return () => unsub();
    }, [currentUser]);

    const handleTopUp = async (method = 'stripe') => {
        setLoadingTopup(true);
        setPaymentError('');
        try {
            const endpoint = method === 'stripe'
                ? 'create-checkout-session'
                : 'mercadopago/create-preference';

            const res = await fetch(`${BACKEND_URL}/api/v1/payments/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.uid, amount: 5 }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } catch (err) {
            console.error('[Topbar] Error en pago:', err);
            setPaymentError('No se pudo conectar con la pasarela. Intenta de nuevo.');
            setTimeout(() => setPaymentError(''), 5000);
        } finally {
            setLoadingTopup(false);
            setDropdownOpen(false);
        }
    };

    if (!currentUser || credits === null) return null;

    const isGuest = currentUser.isAnonymous;

    // Badge color según créditos
    let badgeColor = 'var(--nf-green)';
    let badgeBg    = 'rgba(34, 197, 94, 0.1)';
    if (credits === 0)  { badgeColor = 'var(--nf-red)';    badgeBg = 'rgba(239, 68, 68, 0.1)'; }
    else if (credits <= 3) { badgeColor = 'var(--nf-yellow)'; badgeBg = 'rgba(234, 179, 8, 0.1)'; }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            borderBottom: '1px solid var(--nf-border)',
            background: 'var(--nf-bg-secondary)',
            marginBottom: '20px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
        }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px', alignItems: 'center', gap: '16px' }}>

                {/* Badge de créditos */}
                <div
                    title={isGuest ? 'Crédito de prueba gratuito' : 'Créditos disponibles'}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: badgeBg, border: `1px solid ${badgeColor}`,
                        color: badgeColor, padding: '6px 14px', borderRadius: '20px',
                        fontWeight: 600, fontSize: '14px', cursor: 'default',
                    }}
                >
                    <span>💰</span> {credits} Créditos
                </div>

                {/* Botón acción */}
                {isGuest ? (
                    <button
                        className="nf-btn nf-btn-primary"
                        onClick={() => onNavigate('auth')}
                        style={{ padding: '6px 16px', fontSize: '14px' }}
                    >
                        Registro Gratis
                    </button>
                ) : (
                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                        <button
                            className="nf-btn nf-btn-outline"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            style={{ padding: '6px 16px', fontSize: '14px', borderColor: 'var(--nf-primary)', color: 'var(--nf-primary)' }}
                        >
                            💳 Recargar Saldo
                        </button>

                        {/* Dropdown de pasarelas */}
                        {dropdownOpen && (
                            <div style={{
                                position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                                background: 'var(--nf-bg)', border: '1px solid var(--nf-border)',
                                borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                width: '240px', padding: '12px', zIndex: 1000,
                                display: 'flex', flexDirection: 'column', gap: '8px',
                            }}>
                                <div style={{ fontSize: '12px', color: 'var(--nf-text2)', textAlign: 'center', fontWeight: 600, marginBottom: '4px' }}>
                                    Selecciona Pasarela
                                </div>

                                {/* Stripe */}
                                <button
                                    onClick={() => handleTopUp('stripe')}
                                    disabled={loadingTopup}
                                    style={{
                                        background: '#635BFF', color: '#fff', border: 'none',
                                        padding: '10px', borderRadius: '8px', cursor: loadingTopup ? 'not-allowed' : 'pointer',
                                        fontWeight: 600, fontSize: '13px', opacity: loadingTopup ? 0.7 : 1,
                                        textAlign: 'left', display: 'flex', justifyContent: 'space-between',
                                    }}
                                >
                                    <span>🌐 Stripe</span><span>$5 USD</span>
                                </button>

                                {/* Mercado Pago */}
                                <button
                                    onClick={() => handleTopUp('mercadopago')}
                                    disabled={loadingTopup}
                                    style={{
                                        background: '#00B1EA', color: '#fff', border: 'none',
                                        padding: '10px', borderRadius: '8px', cursor: loadingTopup ? 'not-allowed' : 'pointer',
                                        fontWeight: 600, fontSize: '13px', opacity: loadingTopup ? 0.7 : 1,
                                        textAlign: 'left', display: 'flex', justifyContent: 'space-between',
                                    }}
                                >
                                    <span>🏦 Mercado Pago</span><span>$4.500 CLP</span>
                                </button>

                                {loadingTopup && (
                                    <div style={{ fontSize: '11px', textAlign: 'center', color: 'var(--nf-text2)', marginTop: '4px' }}>
                                        Redirigiendo de forma segura...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Error inline (reemplaza alert() nativo) */}
            {paymentError && (
                <div style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid var(--nf-red)',
                    color: 'var(--nf-red)', padding: '8px 24px', fontSize: '13px', textAlign: 'center',
                }}>
                    ⚠️ {paymentError}
                </div>
            )}
        </div>
    );
}
