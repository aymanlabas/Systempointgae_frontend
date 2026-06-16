import FirebaseService from './FirebaseService';

/**
 * Service de gestion des notifications
 */
class NotificationService {

    /**
     * Crée une notification
     */
    async createNotification({ userId = null, title, message, type = 'info', targetRole = 'admin' }) {
        const notif = {
            userId,
            title,
            message,
            type, // 'info' | 'success' | 'warning' | 'danger'
            targetRole,
            isRead: false,
            createdAt: new Date().toISOString(),
        };
        return await FirebaseService.saveData('notifications', notif);
    }

    /**
     * Récupère les notifications pour un utilisateur ou globales (admin)
     */
    async getNotificationsForUser(userId, role) {
        const all = await FirebaseService.getData('notifications');
        const filtered = all.filter(n => {
            if (role === 'admin') return true;
            return n.userId === userId || n.userId === null;
        });
        return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Marque une notification comme lue
     */
    async markAsRead(notifId) {
        return await FirebaseService.updateData('notifications', notifId, { isRead: true });
    }

    /**
     * Marque toutes les notifications comme lues pour un utilisateur
     */
    async markAllAsRead(userId, role) {
        const notifs = await this.getNotificationsForUser(userId, role);
        const unread = notifs.filter(n => !n.isRead);
        await Promise.all(unread.map(n => this.markAsRead(n.id)));
    }

    /**
     * Compte les notifications non lues
     */
    async getUnreadCount(userId, role) {
        const notifs = await this.getNotificationsForUser(userId, role);
        return notifs.filter(n => !n.isRead).length;
    }

    /**
     * Envoie une notification RH lors du pointage d'un employé,
     * incluant sa localisation GPS sous forme de lien Google Maps.
     *
     * @param {string}  employeeName  - Nom complet de l'employé
     * @param {string}  actionType    - 'check-in' ou 'check-out'
     * @param {string}  time          - Heure locale formatée
     * @param {object|null} location  - { lat, lng, accuracy } ou null
     * @param {string}  userId        - ID Firestore de l'employé (optionnel)
     */
    async notifyHRWithLocation(employeeName, actionType, time, location, userId = null) {
        const actionLabel = actionType === 'check-in' ? '🟢 Entrée' : '🔴 Sortie';
        let locationText;

        if (location && location.lat && location.lng) {
            const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
            locationText = `📍 [Voir sur Google Maps](${mapsUrl}) (précision: ±${Math.round(location.accuracy || 0)}m)`;
        } else {
            locationText = '📍 Localisation non disponible';
        }

        return await this.createNotification({
            userId,
            title: `${actionLabel} — ${employeeName}`,
            message: `Pointage à ${time}.\n${locationText}`,
            type: actionType === 'check-in' ? 'success' : 'info',
            targetRole: 'admin',
            location: location || null,
        });
    }

    /**
     * Supprime une notification
     */
    async deleteNotification(notifId) {
        return await FirebaseService.deleteData('notifications', notifId);
    }
}

export default new NotificationService();
