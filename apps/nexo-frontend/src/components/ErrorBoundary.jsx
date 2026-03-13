import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('MueblePro Error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    handleClearAndReset = () => {
        try {
            localStorage.removeItem('mueblePro_autosave');
        } catch (e) { /* ignore */ }
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    background: '#f8f9fa',
                    fontFamily: 'Inter, sans-serif',
                    color: '#1f2937',
                    padding: 40
                }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: 12,
                        padding: 40,
                        maxWidth: 500,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Algo salió mal</h2>
                        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>
                            Ocurrió un error inesperado en MueblePro Designer.
                            Puedes intentar continuar o reiniciar la aplicación.
                        </p>
                        <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 24, fontFamily: 'monospace', background: '#f3f4f6', padding: 12, borderRadius: 6, textAlign: 'left', wordBreak: 'break-all' }}>
                            {this.state.error?.message || 'Error desconocido'}
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReset}
                                style={{
                                    background: '#3498db',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '10px 24px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Intentar Continuar
                            </button>
                            <button
                                onClick={this.handleClearAndReset}
                                style={{
                                    background: '#e74c3c',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '10px 24px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Reiniciar App
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
