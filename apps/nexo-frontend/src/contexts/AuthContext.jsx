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
        // Note: The backend lazy-initializes the profile in 'users' on the first API call.
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
