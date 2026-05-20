import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Users, Building2, GitFork,
    CalendarDays, FileText, Bell, LogOut, ScanFace, ChevronLeft,
    ChevronRight, Settings, UserCircle, ClipboardList
} from 'lucide-react';
import './Sidebar.css';

const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/employees', icon: Users, label: 'Employés' },
    { to: '/departments', icon: Building2, label: 'Départements' },
    { to: '/teams', icon: GitFork, label: 'Équipes' },
    { to: '/leaves', icon: CalendarDays, label: 'Congés' },
    { to: '/schedules', icon: Settings, label: 'Horaires' },
    { to: '/reports', icon: FileText, label: 'Rapports' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
];

const employeeLinks = [
    { to: '/punch', icon: ScanFace, label: 'Pointer maintenant' },
    { to: '/scanner', icon: ClipboardList, label: 'Scanner QR' },
    { to: '/profile', icon: UserCircle, label: 'Mon profil' },
    { to: '/leaves', icon: CalendarDays, label: 'Mes congés' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
];

export default function Sidebar() {
    const { currentUser, userRole, userProfile, logout } = useAuth();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);

    if (!currentUser) return null;

    const links = userRole === 'admin' ? adminLinks : employeeLinks;

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const initials = `${userProfile?.firstName?.[0] || ''}${userProfile?.lastName?.[0] || ''}`.toUpperCase() || '?';

    return (
        <aside className={`sidebar-nav ${collapsed ? 'collapsed' : ''}`}>
            {/* Logo */}
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <ScanFace size={28} className="logo-icon" />
                    {!collapsed && <span className="logo-text text-gradient">FacialPoint</span>}
                </div>
                <button
                    className="collapse-btn"
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? 'Développer' : 'Réduire'}
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            {/* User Info */}
            <div className="sidebar-user">
                <div className="user-avatar">{initials}</div>
                {!collapsed && (
                    <div className="user-meta">
                        <span className="user-name">{userProfile?.firstName} {userProfile?.lastName}</span>
                        <span className={`role-badge ${userRole === 'admin' ? 'badge-admin' : 'badge-emp'}`}>
                            {userRole === 'admin' ? 'Administrateur' : 'Employé'}
                        </span>
                    </div>
                )}
            </div>

            {/* Nav Links */}
            <nav className="sidebar-links">
                {!collapsed && <span className="nav-section-label">Navigation</span>}
                {links.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        title={collapsed ? label : ''}
                    >
                        <Icon size={20} className="link-icon" />
                        {!collapsed && <span>{label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                <button className="sidebar-link logout-btn" onClick={handleLogout}>
                    <LogOut size={20} className="link-icon" />
                    {!collapsed && <span>Déconnexion</span>}
                </button>
            </div>
        </aside>
    );
}
