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
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user && !user.isAnonymous) {
                try {
                    const { getDoc, doc } = await import('firebase/firestore');
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        setUserData(userDoc.data());
                    } else {
                        setUserData({ role: 'user' });
                    }
                } catch (e) {
                    console.warn('Error fetching user data:', e);
                    setUserData({ role: 'user' });
                }
            } else {
                setUserData(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const login = (email, password) =>
        signInWithEmailAndPassword(auth, email, password);

    const register = async (email, password, name) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        try {
            await setDoc(doc(db, 'users', cred.user.uid), {
                displayName: name,
                email,
                role: 'user',
                createdAt: serverTimestamp()
            });
        } catch (e) {
            console.warn('No se pudo guardar perfil en Firestore:', e.message);
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
        loginAnonymously
    };

    if (loading) return null;

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
