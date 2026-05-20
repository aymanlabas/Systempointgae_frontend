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
     * Supprime une notification
     */
    async deleteNotification(notifId) {
        return await FirebaseService.deleteData('notifications', notifId);
    }
}

export default new NotificationService();
