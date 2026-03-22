import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = import.meta.env.VITE_NEXO_BACKEND_URL || 'http://localhost:8001';

export default function Topbar({ onNavigate }) {
    const { currentUser } = useAuth();
    const [credits, setCredits] = useState(null);
    const [loadingTopup, setLoadingTopup] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!currentUser) return;

        if (currentUser.isAnonymous) {
            // Guests get 3 free credits virtually until they generate something
            setCredits(3);
            return;
        }

        const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (docObj) => {
            if (docObj.exists()) {
                setCredits(docObj.data().credits || 0);
            } else {
                setCredits(0);
            }
        });

        return () => unsub();
    }, [currentUser]);

    const handleTopUp = async (method = 'stripe') => {
        setLoadingTopup(method);
        try {
            const endpoint = method === 'stripe' ? 'create-checkout-session' : 'mercadopago/create-preference';
            const res = await fetch(`${BACKEND_URL}/causas/procesar`.replace('/causas/procesar', `/payments/${endpoint}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.uid, amount: 5 })
            }); // Hack to use the right root URL, normally we'd just use BACKEND_URL
            
            const rawBack = BACKEND_URL; 
            // the cleaner way to call the backend:
            const realRes = await fetch(`${rawBack}/payments/${endpoint}`.replace('/api/v1/payments','/api/v1/payments'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.uid, amount: 5 })
            });

            if (!realRes.ok) throw new Error(`Error al inicializar sesión de pago con ${method}`);
            const data = await realRes.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error(err);
            alert('Falló el intento de comunicar con la pasarela de pagos.');
        } finally {
            setLoadingTopup(false);
            setDropdownOpen(false);
        }
    };

    if (!currentUser || credits === null) return null;

    const isGuest = currentUser.isAnonymous;
    
    // Style determinators
    let badgeColor = 'var(--nf-green)';
    let badgeBg = 'rgba(34, 197, 94, 0.1)';
    
    if (credits === 0) {
        badgeColor = 'var(--nf-red)';
        badgeBg = 'rgba(239, 68, 68, 0.1)';
    } else if (credits <= 3) {
        badgeColor = 'var(--nf-yellow)';
        badgeBg = 'rgba(234, 179, 8, 0.1)';
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '16px 24px',
            borderBottom: '1px solid var(--nf-border)',
            background: 'var(--nf-bg-secondary)',
            marginBottom: '20px',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                
                {/* Credits Indicator */}
                <div 
                    title={isGuest ? "Créditos de prueba gratuitos" : "Créditos disponibles para generar documentos"}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: badgeBg,
                        border: `1px solid ${badgeColor}`,
                        color: badgeColor,
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'default'
                    }}
                >
                    <span>🪙</span> {credits} Créditos
                </div>

                {/* Actions */}
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

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '8px',
                                background: 'var(--nf-bg)',
                                border: '1px solid var(--nf-border)',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                width: '240px',
                                padding: '12px',
                                zIndex: 1000,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <div style={{ fontSize: '12px', color: 'var(--nf-text2)', marginBottom: '4px', textAlign: 'center', fontWeight: 600 }}>Selecciona Pasarela</div>
                                
                                <button 
                                    onClick={() => handleTopUp('stripe')}
                                    disabled={loadingTopup !== false}
                                    style={{
                                        background: '#635BFF',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        cursor: loadingTopup ? 'not-allowed' : 'pointer',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        opacity: loadingTopup ? 0.7 : 1,
                                        textAlign: 'left',
                                        display: 'flex',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <span>🌐 Stripe</span>
                                    <span>$5 USD</span>
                                </button>

                                <button 
                                    onClick={() => handleTopUp('mercadopago')}
                                    disabled={loadingTopup !== false}
                                    style={{
                                        background: '#00B1EA',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        cursor: loadingTopup ? 'not-allowed' : 'pointer',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        opacity: loadingTopup ? 0.7 : 1,
                                        textAlign: 'left',
                                        display: 'flex',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <span>🤝 Mercado Pago</span>
                                    <span>$4.500 CLP</span>
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
        </div>
    );
}
