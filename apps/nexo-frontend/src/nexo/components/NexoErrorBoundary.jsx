import React from 'react';

/**
 * NexoErrorBoundary — Captura crashes de módulos individuales
 * sin romper el resto de la aplicación.
 */
export class NexoErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[Nexo] Error en módulo:', this.props.moduleName || 'desconocido', error, info);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="nf-card nf-animate-in" style={{
                    textAlign: 'center',
                    padding: 40,
                    border: '1px solid var(--nf-red)',
                    background: 'rgba(239,68,68,0.05)',
                }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                    <h3 style={{ color: 'var(--nf-text)', marginBottom: 8 }}>
                        Error en {this.props.moduleName || 'este módulo'}
                    </h3>
                    <p style={{ color: 'var(--nf-text2)', fontSize: 13, marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
                        {this.state.error?.message || 'Ocurrió un error inesperado. Intenta recargar el módulo.'}
                    </p>
                    <button className="nf-btn nf-btn-outline" onClick={this.handleRetry}>
                        🔄 Reintentar
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
