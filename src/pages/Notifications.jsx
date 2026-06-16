import React, { useState } from 'react';
import { Bell, Trash2, CheckCheck, Check, AlertCircle, Info, CheckCircle, XCircle, MapPin } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { formatDate } from '../utils/dateUtils';
import './Projects.css';

const typeConfig = {
    info: { icon: Info, color: 'blue', label: 'Info' },
    success: { icon: CheckCircle, color: 'green', label: 'Succès' },
    warning: { icon: AlertCircle, color: 'warning', label: 'Avertissement' },
    danger: { icon: XCircle, color: 'danger', label: 'Urgent' },
};

export default function Notifications() {
    const { notifications, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
    const [filter, setFilter] = useState('all');

    // Converts markdown-style [text](url) links inside a message string into
    // real <a> elements so the HR can click the Google Maps link directly.
    const renderMessage = (text) => {
        if (!text) return null;
        const parts = text.split(/\[([^\]]+)\]\(([^)]+)\)/);
        return parts.map((part, i) => {
            // Every triplet: text before, link label, url
            if (i % 3 === 1) {
                const url = parts[i + 1];
                return (
                    <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--primary)', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                        <MapPin size={13} />{part}
                    </a>
                );
            }
            if (i % 3 === 2) return null; // URL part, already consumed above
            return <span key={i} style={{ whiteSpace: 'pre-line' }}>{part}</span>;
        });
    };

    const filtered = notifications.filter(n => {
        if (filter === 'unread') return !n.isRead;
        if (filter === 'read') return n.isRead;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Bell size={28} className="page-title-icon" /> Notifications
                        {unreadCount > 0 && <span className="badge badge-danger" style={{ marginLeft: '0.5rem' }}>{unreadCount}</span>}
                    </h1>
                    <p className="text-muted">Historique des alertes et notifications</p>
                </div>
                {unreadCount > 0 && (
                    <button className="btn btn-secondary" onClick={markAllAsRead}>
                        <CheckCheck size={16} /> Tout marquer comme lu
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="filter-bar glass-panel">
                <div className="filter-chips">
                    {[
                        { value: 'all', label: `Toutes (${notifications.length})` },
                        { value: 'unread', label: `Non lues (${unreadCount})` },
                        { value: 'read', label: 'Lues' },
                    ].map(f => (
                        <button key={f.value} className={`chip ${filter === f.value ? 'active' : ''}`} onClick={() => setFilter(f.value)}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Notifications List */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div className="text-center p-8 text-muted">Chargement...</div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state" style={{ padding: '3rem' }}>
                        <Bell size={48} />
                        <h3>Aucune notification</h3>
                        <p className="text-muted">Vous êtes à jour !</p>
                    </div>
                ) : (
                    <div>
                        {filtered.map((notif, index) => {
                            const config = typeConfig[notif.type] || typeConfig.info;
                            const Icon = config.icon;
                            return (
                                <div
                                    key={notif.id}
                                    className={`notif-row ${!notif.isRead ? 'notif-unread' : ''}`}
                                    style={{ borderBottom: index < filtered.length - 1 ? 'var(--glass-border)' : 'none' }}
                                >
                                    <div className={`notif-type-icon color-${config.color}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div className="notif-row-content" onClick={() => !notif.isRead && markAsRead(notif.id)}>
                                        <div className="notif-row-header">
                                            <span className="notif-row-title">{notif.title}</span>
                                            <span className={`badge badge-${config.color}`}>{config.label}</span>
                                        </div>
                                        <p className="notif-row-msg">{renderMessage(notif.message)}</p>
                                        <span className="notif-row-time">{formatDate(notif.createdAt)}</span>
                                    </div>
                                    <div className="notif-row-actions">
                                        {!notif.isRead && (
                                            <button className="btn-icon-sm" onClick={() => markAsRead(notif.id)} title="Marquer comme lu">
                                                <Check size={15} />
                                            </button>
                                        )}
                                        <button className="btn-icon-sm danger" onClick={() => deleteNotification(notif.id)} title="Supprimer">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
