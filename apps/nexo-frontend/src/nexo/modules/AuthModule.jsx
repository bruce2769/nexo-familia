import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthModule({ onNavigate }) {
    const { login, register, loginAnonymously } = useAuth();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await register(email, password, name);
            }
            // Navigate to main diagnostic module after successful auth
            onNavigate('diagnostico');

        } catch (err) {
            console.error("Auth error:", err);
            setError(err.message || 'Error al autenticar. Verifica tu correo y contraseña.');
        } finally {
            setLoading(false);
        }
    };

    const handleAnonymous = async () => {
        setLoading(true);
        try {
            await loginAnonymously();
            onNavigate('diagnostico');
        } catch (err) {
            setError('Error al ingresar como invitado.');
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: '40px auto' }}>
            <div className="nf-card nf-animate-in">
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div className="nf-card-icon" style={{ fontSize: 40, background: 'none', margin: '0 auto 12px', width: 'auto' }}>
                        ⚖️
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 'bold' }}>
                        {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                    </h2>
                    <p style={{ color: 'var(--nf-text3)', marginTop: 8 }}>
                        {isLogin ? 'Accede a tus diagnósticos y radar' : 'Regístrate para guardar tu historial'}
                    </p>
                </div>

                {error && (
                    <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', color: 'var(--nf-red)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {!isLogin && (
                        <div>
                            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--nf-text2)' }}>Nombre / Apodo</label>
                            <input
                                type="text"
                                className="nf-input"
                                placeholder="Ej: Juan Pérez"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--nf-text2)' }}>Correo Electrónico</label>
                        <input
                            type="email"
                            className="nf-input"
                            placeholder="correo@ejemplo.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--nf-text2)' }}>Contraseña</label>
                        <input
                            type="password"
                            className="nf-input"
                            placeholder="Mínimo 6 caracteres"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="nf-btn nf-btn-primary"
                        style={{ marginTop: 8 }}
                        disabled={loading}
                    >
                        {loading ? 'Cargando...' : (isLogin ? 'Entrar' : 'Registrarse')}
                    </button>

                    {isLogin && (
                        <button
                            type="button"
                            className="nf-btn nf-btn-ghost"
                            onClick={handleAnonymous}
                            disabled={loading}
                            style={{ opacity: 0.7 }}
                        >
                            Continuar como invitado oculto
                        </button>
                    )}
                </form>

                <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--nf-text3)' }}>
                    {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                    <button
                        style={{ background: 'none', border: 'none', color: 'var(--nf-accent)', marginLeft: 8, cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin ? 'Crear cuenta' : 'Inicia Sesión'}
                    </button>
                </div>
            </div>
        </div>
    );
}
