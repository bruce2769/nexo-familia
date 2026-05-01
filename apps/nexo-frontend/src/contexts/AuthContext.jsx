// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInAnonymously
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [credits, setCredits] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                // Sincronizar créditos en tiempo real
                if (user.isAnonymous) {
                    setCredits(1);
                    setUserData({ role: 'guest' });
                } else {
                    const { getDoc, doc, onSnapshot } = await import('firebase/firestore');
                    onSnapshot(doc(db, 'users', user.uid), (snap) => {
                        if (snap.exists()) {
                            const data = snap.data();
                            setCredits(data.credits ?? 0);
                            setUserData(data);
                        } else {
                            setCredits(0);
                            setUserData({ role: 'user' });
                        }
                    });
                }
            } else {
                setUserData(null);
                setCredits(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const login = (email, password) =>
        signInWithEmailAndPassword(auth, email, password);

    const register = async (email, password, name) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Inicializar perfil en backend → otorga 3 créditos gratuitos
        try {
            const BACKEND = import.meta.env.VITE_NEXO_BACKEND_URL || 'http://localhost:8001';
            const token = await cred.user.getIdToken();
            await fetch(`${BACKEND}/api/v1/users/init`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ name: name || '', email: email || '' }),
            });
        } catch (e) {
            console.warn('[Auth] No se pudo inicializar perfil en backend:', e);
        }
        return cred;
    };

    const logout = () => signOut(auth);
    const loginAnonymously = () => signInAnonymously(auth);

    const value = {
        currentUser,
        userData,
        login,
        register,
        logout,
        loginAnonymously,
        credits
    };

    if (loading) return null;

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
