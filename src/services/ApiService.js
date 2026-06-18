import { auth } from '../firebase';

// On utilise la variable d'environnement (si elle existe en prod), sinon on garde localhost en local
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Service centralisé pour communiquer avec le backend Express
 */
const ApiService = {
    /**
     * Helper pour inclure le jeton JWT Firebase dans les requêtes
     */
    async getAuthHeaders() {
        return new Promise((resolve, reject) => {
            // On attend que Firebase nous donne l'état actuel de l'utilisateur
            const unsubscribe = auth.onAuthStateChanged(async (user) => {
                unsubscribe();
                if (user) {
                    try {
                        const token = await user.getIdToken();
                        resolve({
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        });
                    } catch (e) {
                        reject(new Error('Impossible de générer le jeton de sécurité'));
                    }
                } else {
                    reject(new Error('Utilisateur non connecté (Session expirée ou compte local non reconnu par Firebase)'));
                }
            });
        });
    },

    // --- ATTENDANCE ---

    async punch(data) {
        const headers = await this.getAuthHeaders();
        const res = await fetch(`${API_URL}/attendance/punch`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async getStats() {
        const headers = await this.getAuthHeaders();
        const res = await fetch(`${API_URL}/attendance/stats`, { headers });
        return res.json();
    },

    // --- PROJECTS ---

    async getProjects() {
        const headers = await this.getAuthHeaders();
        const res = await fetch(`${API_URL}/projects`, { headers });
        return res.json();
    },

    async createProject(data) {
        const headers = await this.getAuthHeaders();
        const res = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });
        return res.json();
    },

    // --- HR ---

    async getLeaves() {
        const headers = await this.getAuthHeaders();
        const res = await fetch(`${API_URL}/hr/leaves`, { headers });
        return res.json();
    },

    async reviewLeave(id, status) {
        const headers = await this.getAuthHeaders();
        const res = await fetch(`${API_URL}/hr/leaves/${id}/review`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status })
        });
        return res.json();
    },

    async deleteUser(uid) {
        const headers = await this.getAuthHeaders();
        const res = await fetch(`${API_URL}/hr/users/${uid}`, {
            method: 'DELETE',
            headers
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Erreur lors de la suppression de l\'utilisateur');
        }
        return res.json();
    },

    async createUser(userData) {
        const headers = await this.getAuthHeaders();
        const res = await fetch(`${API_URL}/hr/users`, {
            method: 'POST',
            headers,
            body: JSON.stringify(userData)
        });
        const data = await res.json();
        if (!res.ok) {
            const err = new Error(data.error || 'Erreur lors de la création de l\'utilisateur');
            err.code = res.status === 409 ? 'auth/email-already-in-use' : 'unknown';
            throw err;
        }
        return data;
    }
};

export default ApiService;
