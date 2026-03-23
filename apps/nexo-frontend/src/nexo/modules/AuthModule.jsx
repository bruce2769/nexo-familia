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
    const [successMessage, setSuccessMessage] = useState('');
 
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);
 
        try {
            if (isLogin) {
                await login(email, password);
                onNavigate('diagnostico');
            } else {
                // 1. Crear usuario en Firebase Auth
                const cred = await register(email, password, name);
 
                // 2. Llamar al backend para inicializar perfil con 3 créditos
                try {
                    const token = await cred.user.getIdToken();
                    const backendUrl = import.meta.env.VITE_NEXO_BACKEND_URL;
                    const res = await fetch(`${backendUrl}/api/v1/users/init`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ name, email })
                    });
                    if (!res.ok) {
                        console.warn('Backend init respondió con error:', res.status);
                    } else {
                        console.log('✅ Perfil inicializado con 3 créditos.');
                    }
                } catch (backendErr) {
                    // No bloquear el flujo si el backend falla
                    // Los créditos se inicializarán en lazy-init al primer uso
                    console.warn('Backend init falló (lazy-init activo):', backendErr.message);
                }
 
                // 3. Mostrar mensaje de bienvenida y recargar
                setSuccessMessage('¡Cuenta creada! Bienvenido/a a Nexo Familia 🎉');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
 
        } catch (err) {
            console.error('Auth error:', err);
 
            // Errores conocidos de Firebase con mensajes amigables
            const firebaseErrors = {
                'auth/email-already-in-use': 'Este correo ya está registrado. Intenta iniciar sesión.',
                'auth/invalid-email': 'El correo electrónico no es válido.',
                'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
                'auth/user-not-found': 'No existe una cuenta con este correo.',
                'auth/wrong-password': 'Contraseña incorrecta. Intenta de nuevo.',
                'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
                'auth/network-request-failed': 'Sin conexión a internet. Verifica tu red.',
            };
 
            const mensaje = firebaseErrors[err.code] || err.message || 'Error al autenticar.';
 
            // Si el error es de Firestore pero Auth fue exitoso, navegar igual
            if (err.code === 'permission-denied' || err.message?.includes('permissions')) {
                console.warn('Firestore sync issue, pero Auth exitoso. Navegando...');
                onNavigate('diagnostico');
            } else {
                setError(mensaje);
            }
 
        } finally {
            setLoading(false);
        }
    };
 
    const handleAnonymous = async () => {
        setError('');
        setLoading(true);
        try {
            await loginAnonymously();
            onNavigate('diagnostico');
        } catch (err) {
            setError('Error al ingresar como invitado. Intenta de nuevo.');
        } finally {
            setLoading(false);
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
                        {isLogin
                            ? 'Accede a tus diagnósticos y radar'
                            : 'Regístrate y obtén 3 créditos gratis'}
                    </p>
                </div>
 
                {/* Error */}
                {error && (
                    <div style={{
                        padding: 12,
                        background: 'rgba(239,68,68,0.1)',
                        color: 'var(--nf-red)',
                        borderRadius: 8,
                        marginBottom: 16,
                        fontSize: 13
                    }}>
                        ⚠️ {error}
                    </div>
                )}
 
                {/* Éxito */}
                {successMessage && (
                    <div style={{
                        padding: 12,
                        background: 'rgba(34,197,94,0.1)',
                        color: '#16a34a',
                        borderRadius: 8,
                        marginBottom: 16,
                        fontSize: 13,
                        textAlign: 'center'
                    }}>
                        ✅ {successMessage}
                    </div>
                )}
 
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {!isLogin && (
                        <div>
                            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--nf-text2)' }}>
                                Nombre / Apodo
                            </label>
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
                        <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--nf-text2)' }}>
                            Correo Electrónico
                        </label>
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
                        <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--nf-text2)' }}>
                            Contraseña
                        </label>
                        <input
                            type="password"
                            className="nf-input"
                            placeholder="Mínimo 6 caracteres"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
 
                    <button
                        type="submit"
                        className="nf-btn nf-btn-primary"
                        style={{ marginTop: 8 }}
                        disabled={loading}
                    >
                        {loading
                            ? (isLogin ? 'Iniciando sesión...' : 'Creando cuenta...')
                            : (isLogin ? 'Entrar' : 'Registrarse — 3 créditos gratis')}
                    </button>
 
                    {isLogin && (
                        <button
                            type="button"
                            className="nf-btn nf-btn-ghost"
                            onClick={handleAnonymous}
                            disabled={loading}
                            style={{ opacity: 0.7 }}
                        >
                            {loading ? 'Cargando...' : 'Continuar como invitado oculto'}
                        </button>
                    )}
                </form>
 
                <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--nf-text3)' }}>
                    {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                    <button
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--nf-accent)',
                            marginLeft: 8,
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                        onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMessage(''); }}
                    >
                        {isLogin ? 'Crear cuenta' : 'Inicia Sesión'}
                    </button>
                </div>
            </div>
        </div>
    );
}
