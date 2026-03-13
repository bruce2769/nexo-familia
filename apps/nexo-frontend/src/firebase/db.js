// src/firebase/db.js
export { db } from './config.js'; // Instancia real de Firestore
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    doc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';

// COLECCIÓN: HISTORIAL DE DIAGNÓSTICOS
export const saveDiagnosisToCloud = async (userId, diagnosticData, formInputs) => {
    try {
        const docRef = await addDoc(collection(db, 'diagnosticos'), {
            userId,
            ...diagnosticData,
            formInputs,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error saving diagnosis:", error);
        throw error;
    }
};

export const getUserDiagnoses = async (userId) => {
    try {
        const q = query(
            collection(db, 'diagnosticos'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching diagnoses:", error);
        return [];
    }
};

// COLECCIÓN: RADAR (CAUSAS EN VIGILANCIA)
export const subscribeToRadarCloud = async (userId, rit, tribunalData) => {
    try {
        const docRef = await addDoc(collection(db, 'radar_causas'), {
            userId,
            rit,
            tribunal: tribunalData,
            status: 'monitoreando',
            lastChecked: serverTimestamp(),
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error subscribing to radar:", error);
        throw error;
    }
};

export const getUserRadarSubscriptions = async (userId) => {
    try {
        const q = query(
            collection(db, 'radar_causas'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching radar subs:", error);
        return [];
    }
};
