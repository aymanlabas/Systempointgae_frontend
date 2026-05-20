import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { formatDate } from '../utils/dateUtils';
import './NotificationBell.css';

const typeColors = {
    info: 'blue',
    success: 'green',
    warning: 'warning',
    danger: 'danger',
};

export default function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Ferme le panel si clic extérieur
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="notif-bell-wrapper" ref={ref}>
            <button
                className="notif-bell-btn"
                onClick={() => setOpen(!open)}
                title="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {open && (
                <div className="notif-panel glass-panel animate-fade-in">
                    <div className="notif-panel-header">
                        <span className="notif-panel-title">Notifications</span>
                        {unreadCount > 0 && (
                            <button className="notif-mark-all" onClick={markAllAsRead} title="Tout marquer lu">
                                <CheckCheck size={15} /> Tout lire
                            </button>
                        )}
                    </div>

                    <div className="notif-list">
                        {notifications.length === 0 ? (
                            <div className="notif-empty">
                                <Bell size={32} />
                                <p>Aucune notification</p>
                            </div>
                        ) : (
                            notifications.slice(0, 15).map(n => (
                                <div
                                    key={n.id}
                                    className={`notif-item ${!n.isRead ? 'unread' : ''} color-${typeColors[n.type] || 'blue'}`}
                                >
                                    <div className="notif-dot" />
                                    <div className="notif-content" onClick={() => markAsRead(n.id)}>
                                        <span className="notif-msg-title">{n.title}</span>
                                        <span className="notif-msg">{n.message}</span>
                                        <span className="notif-time">{formatDate(n.createdAt)}</span>
                                    </div>
                                    <div className="notif-actions">
                                        {!n.isRead && (
                                            <button onClick={() => markAsRead(n.id)} title="Marquer lu">
                                                <Check size={13} />
                                            </button>
                                        )}
                                        <button onClick={() => deleteNotification(n.id)} title="Supprimer">
                                            <X size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
