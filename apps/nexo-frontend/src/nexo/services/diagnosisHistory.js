import { saveDiagnosisToCloud } from '../../firebase/db.js';

const STORAGE_KEY = 'nexo_diagnosis_history';

export async function saveDiagnosis(diagnosisResult, formData, userId) {
    try {
        const history = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

        // Add current date and uniquely identify the record
        const record = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
            date: new Date().toISOString(),
            materia: formData.materia,
            rol: formData.rol,
            riesgoLiteral: diagnosisResult.riesgoLiteral,
            score: diagnosisResult.score,
            reglasAplicadasCount: diagnosisResult.reglasAplicadas?.length || 0,
        };

        // Keep max 50 records local
        history.unshift(record);
        if (history.length > 50) history.pop();

        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

        // Save to Firebase Cloud if userId exists
        if (userId) {
            try {
                await saveDiagnosisToCloud(userId, record, formData);
            } catch (cloudErr) {
                console.error('Non-critical: Failed saving to cloud but local saved', cloudErr);
            }
        }

        return record;
    } catch (err) {
        console.error('Error saving diagnosis history:', err);
        return null;
    }
}

export function getDiagnosisHistory() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}
