import React from 'react';

export default function Loader({ message = 'Cargando módulo...' }) {
    return (
        <div style={{ 
            padding: '60px 20px', 
            textAlign: 'center', 
            color: 'var(--nf-text3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px'
        }}>
            <div style={{
                width: 48,
                height: 48,
                border: '3px solid var(--nf-surface2)',
                borderTopColor: 'var(--nf-accent)',
                borderRadius: '50%',
                animation: 'nf-spin 1s linear infinite',
                marginBottom: '20px'
            }} />
            <p style={{ fontSize: '15px', fontWeight: 500 }}>{message}</p>
            <style>{`
                @keyframes nf-spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
