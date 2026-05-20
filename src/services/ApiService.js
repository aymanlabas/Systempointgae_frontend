import { auth } from '../firebase';

const API_URL = 'http://localhost:5000/api';

/**
 * Service centralisé pour communiquer avec le backend Express
 */
const ApiService = {
    /**
     * Helper pour inclure le jeton JWT Firebase dans les requêtes
     */
    async getAuthHeaders() {
        const user = auth.currentUser;
        if (!user) throw new Error('Utilisateur non connecté');
        const token = await user.getIdToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
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
    }
};

export default ApiService;
