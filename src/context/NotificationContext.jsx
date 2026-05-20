import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import NotificationService from '../services/NotificationService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export function useNotifications() {
    return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
    const { currentUser, userRole } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const notifs = await NotificationService.getNotificationsForUser(currentUser.uid, userRole);
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.isRead).length);
        } catch (e) {
            console.error('Error fetching notifications:', e);
        } finally {
            setLoading(false);
        }
    }, [currentUser, userRole]);

    useEffect(() => {
        fetchNotifications();
        // Poll toutes les 30 secondes
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const markAsRead = async (id) => {
        await NotificationService.markAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllAsRead = async () => {
        await NotificationService.markAllAsRead(currentUser?.uid, userRole);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
    };

    const deleteNotification = async (id) => {
        await NotificationService.deleteNotification(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        setUnreadCount(prev => {
            const wasUnread = notifications.find(n => n.id === id && !n.isRead);
            return wasUnread ? Math.max(0, prev - 1) : prev;
        });
    };

    const addNotification = async (data) => {
        await NotificationService.createNotification(data);
        await fetchNotifications();
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            fetchNotifications,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            addNotification,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}
