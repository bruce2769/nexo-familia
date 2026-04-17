import React from 'react';

export default function CreditBanner({ credits, onNavigate }) {
    if (credits === null || credits > 1) return null;

    const isZero = credits === 0;

    return (
        <div className="nf-card nf-animate-in" style={{
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(167, 139, 250, 0.05))',
            border: `1px solid ${isZero ? 'var(--nf-red)' : 'var(--nf-yellow)'}`,
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background decoration */}
            <div style={{
                position: 'absolute',
                right: '-10px',
                top: '-10px',
                fontSize: '60px',
                opacity: 0.1,
                transform: 'rotate(15deg)',
                pointerEvents: 'none'
            }}>
                💰
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{
                    fontSize: '24px',
                    background: isZero ? 'var(--nf-red-bg)' : 'var(--nf-yellow-bg)',
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    {isZero ? '⚠️' : '💡'}
                </div>
                <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--nf-text)' }}>
                        {isZero ? 'Sin créditos disponibles' : 'Créditos casi agotados'}
                    </h4>
                    <p style={{ fontSize: '13px', color: 'var(--nf-text2)', marginTop: 2, lineHeight: 1.4 }}>
                        {isZero 
                            ? 'Necesitas recargar para generar nuevos escritos legales o usar el Copiloto avanzado.' 
                            : 'Te queda solo 1 crédito. Recarga ahora para no interrumpir tu trámite.'}
                    </p>
                </div>
            </div>

            <button 
                className="nf-btn nf-btn-primary" 
                style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                onClick={() => onNavigate('auth')}
            >
                💳 Recargar Créditos
            </button>
        </div>
    );
}
