// src/nexo/components/CreditBanner.jsx
import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = import.meta.env.VITE_NEXO_BACKEND_URL || 'http://localhost:8001';

export default function CreditBanner() {
    const { currentUser } = useAuth();
    const [credits, setCredits] = useState(null);
    const [loadingTopup, setLoadingTopup] = useState(false);

    useEffect(() => {
        if (!currentUser || currentUser.isAnonymous) return;

        const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (docObj) => {
            if (docObj.exists()) {
                setCredits(docObj.data().credits || 0);
            } else {
                setCredits(null);
            }
        });

        return () => unsub();
    }, [currentUser]);

    const handleTopUp = async (method = 'stripe') => {
        setLoadingTopup(method);
        try {
            const endpoint = method === 'stripe' ? 'create-checkout-session' : 'mercadopago/create-preference';
            const res = await fetch(`${BACKEND_URL}/api/v1/payments/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.uid, amount: 5 })
            });
            if (!res.ok) throw new Error(`Error al inicializar sesión de pago con ${method}`);
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url; // Redirect to Payment Provider
            }
        } catch (err) {
            console.error(err);
            alert('Falló el intento de comunicar con la pasarela de pagos.');
        } finally {
            setLoadingTopup(false);
        }
    };

    if (!currentUser || currentUser.isAnonymous) return null;

    // Show credit banner only if initialized or explicitly 0
    if (credits === null) return null;

    return (
        <div style={{
            background: credits <= 0 ? 'rgba(239, 68, 68, 0.08)' : 'var(--nf-bg-secondary)',
            color: credits <= 0 ? 'var(--nf-red)' : 'var(--nf-text)',
            padding: '14px 20px',
            borderRadius: '12px',
            border: `1.5px solid ${credits <= 0 ? 'rgba(239, 68, 68, 0.6)' : 'var(--nf-border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '28px' }}>🪙</span>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: credits <= 0 ? 'var(--nf-red)' : 'var(--nf-primary)' }}>
                        {credits > 0 ? `Te quedan ${credits} créditos.` : 'Has agotado tus créditos.'}
                    </div>
                    {credits <= 0 && (
                        <div style={{ fontSize: '13px', color: 'var(--nf-text2)', marginTop: '4px' }}>
                            Recarga tu cuenta para continuar generando documentos legales certificados.
                        </div>
                    )}
                </div>
            </div>
            {(credits <= 3) && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                        onClick={() => handleTopUp('stripe')} 
                        disabled={loadingTopup !== false}
                        style={{
                            background: '#1a1f36',
                            color: '#fff',
                            border: 'none',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            cursor: loadingTopup ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '13px',
                            opacity: loadingTopup ? 0.7 : 1,
                            boxShadow: '0 2px 4px rgba(0,0,0, 0.2)',
                        }}
                    >
                        {loadingTopup === 'stripe' ? '...' : '💳 Stripe (Internacional)'}
                    </button>
                    <button 
                        onClick={() => handleTopUp('mercadopago')} 
                        disabled={loadingTopup !== false}
                        style={{
                            background: '#009ee3',
                            color: '#fff',
                            border: 'none',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            cursor: loadingTopup ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '13px',
                            opacity: loadingTopup ? 0.7 : 1,
                            boxShadow: '0 2px 4px rgba(0, 158, 227, 0.3)',
                        }}
                    >
                        {loadingTopup === 'mercadopago' ? '...' : '🤝 Redcompra (Local)'}
                    </button>
                </div>
            )}
        </div>
    );
}
