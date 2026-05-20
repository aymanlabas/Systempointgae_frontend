import React, { useState, useEffect } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    Users, Clock, AlertTriangle, CheckCircle2, TrendingUp,
    Activity, Calendar, Target
} from 'lucide-react';
import FirebaseService from '../services/FirebaseService';
import StatCard from '../components/StatCard';
import { getTodayString, getLastNDays, formatDate } from '../utils/dateUtils';
import {
    calcTodayStats, buildWeeklyAttendanceData,
    buildHoursPerEmployee, calcPunctualityRate, getAbsentEmployees
} from '../utils/attendanceUtils';
import NotificationBell from '../components/NotificationBell';
import './Dashboard.css';

const CHART_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip">
                <p className="chart-tooltip-label">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color }} className="chart-tooltip-value">
                        {p.name}: <strong>{p.value}</strong>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [recentLogs, setRecentLogs] = useState([]);
    const [weeklyData, setWeeklyData] = useState([]);
    const [hoursData, setHoursData] = useState([]);
    const [absentEmployees, setAbsentEmployees] = useState([]);
    const [punctualityRate, setPunctualityRate] = useState(100);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('presence');

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const [users, attendances] = await Promise.all([
                    FirebaseService.getData('users'),
                    FirebaseService.getData('attendance'),
                ]);

                attendances.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                const todayStr = getTodayString();
                const todayStats = calcTodayStats(attendances, users, todayStr);
                setStats(todayStats);

                setRecentLogs(attendances.slice(0, 12));

                const weekly = buildWeeklyAttendanceData(attendances, users);
                setWeeklyData(weekly);

                const hours = buildHoursPerEmployee(attendances, users, {
                    start: getLastNDays(30)[0],
                    end: todayStr
                });
                setHoursData(hours);

                const absent = getAbsentEmployees(attendances, users, todayStr);
                setAbsentEmployees(absent);

                const rate = calcPunctualityRate(attendances);
                setPunctualityRate(rate);

            } catch (error) {
                console.error('Erreur Dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const pieData = stats ? [
        { name: 'Présents', value: stats.presentCount },
        { name: 'Absents', value: stats.absentCount },
        { name: 'Retards', value: stats.lateCount },
    ] : [];

    const getStatusBadge = (log) => {
        if (log.type === 'check-in') {
            return log.time > '09:00:00'
                ? <span className="badge badge-warning">Retard</span>
                : <span className="badge badge-success">À l'heure</span>;
        }
        return <span className="badge badge-secondary">Sortie</span>;
    };

    const today = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="dashboard-v2 animate-fade-in">
            {/* Header */}
            <div className="dash-header">
                <div>
                    <h1 className="dash-title">Tableau de Bord</h1>
                    <p className="dash-subtitle text-muted capitalize">{today}</p>
                </div>
                <div className="dash-header-actions">
                    <NotificationBell />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <StatCard
                    title="Total Employés"
                    value={stats?.totalEmployees}
                    icon={<Users size={22} />}
                    color="blue"
                    loading={loading}
                />
                <StatCard
                    title="Présents Aujourd'hui"
                    value={stats?.presentCount}
                    icon={<CheckCircle2 size={22} />}
                    color="green"
                    subtitle={stats ? `${Math.round((stats.presentCount / Math.max(stats.totalEmployees, 1)) * 100)}% de présence` : ''}
                    loading={loading}
                />
                <StatCard
                    title="En Retard"
                    value={stats?.lateCount}
                    icon={<Clock size={22} />}
                    color="warning"
                    subtitle="Après 09h00"
                    loading={loading}
                />
                <StatCard
                    title="Absents"
                    value={stats?.absentCount}
                    icon={<AlertTriangle size={22} />}
                    color="danger"
                    loading={loading}
                />
                <StatCard
                    title="Taux de Ponctualité"
                    value={`${punctualityRate}%`}
                    icon={<TrendingUp size={22} />}
                    color="purple"
                    loading={loading}
                />
                <StatCard
                    title="Heures Aujourd'hui"
                    value={stats?.totalHoursToday?.toFixed(1) ?? '0'}
                    icon={<Activity size={22} />}
                    color="blue"
                    subtitle="Total heures travaillées"
                    loading={loading}
                />
            </div>

            {/* Charts Row */}
            <div className="charts-grid">
                {/* Présence 7 jours */}
                <div className="chart-card glass-panel">
                    <div className="chart-header">
                        <h3>Présence – 7 Derniers Jours</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                            <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="presents" name="Présents" stroke="#10b981" fill="url(#gradPresent)" strokeWidth={2} />
                            <Area type="monotone" dataKey="absents" name="Absents" stroke="#ef4444" fill="url(#gradAbsent)" strokeWidth={2} />
                            <Area type="monotone" dataKey="retards" name="Retards" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="4 2" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Répartition présence pie */}
                <div className="chart-card glass-panel">
                    <div className="chart-header">
                        <h3>Répartition Aujourd'hui</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={85}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={index} fill={CHART_COLORS[index]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend iconType="circle" iconSize={10} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Heures par employé */}
            {hoursData.length > 0 && (
                <div className="chart-card glass-panel">
                    <div className="chart-header">
                        <h3>Heures Travaillées par Employé (30 jours)</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={hoursData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                            <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="heures" name="Heures" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Bottom Row */}
            <div className="dash-bottom-grid">
                {/* Derniers pointages */}
                <div className="content-card glass-panel">
                    <div className="card-header pb-4">
                        <h2>Derniers Pointages</h2>
                    </div>
                    <div className="table-responsive mt-4">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Employé</th>
                                    <th>Date</th>
                                    <th>Heure</th>
                                    <th>Type</th>
                                    <th>Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center p-8 text-muted">Chargement...</td></tr>
                                ) : recentLogs.length > 0 ? recentLogs.map(log => (
                                    <tr key={log.id}>
                                        <td className="font-medium text-primary-light">{log.userName || log.userId}</td>
                                        <td className="text-muted">{log.date}</td>
                                        <td className="font-medium">{log.time?.substring(0, 5)}</td>
                                        <td>
                                            <span className={`badge ${log.type === 'check-in' ? 'badge-primary' : 'badge-secondary'}`}>
                                                {log.type === 'check-in' ? '↗ Entrée' : '↙ Sortie'}
                                            </span>
                                        </td>
                                        <td>{getStatusBadge(log)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="5" className="text-center p-8 text-muted">Aucun pointage.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Absents aujourd'hui */}
                <div className="absent-card glass-panel">
                    <div className="card-header pb-4">
                        <h2>Absents Aujourd'hui</h2>
                        <span className="badge badge-danger">{absentEmployees.length}</span>
                    </div>
                    {absentEmployees.length === 0 ? (
                        <div className="no-absent">
                            <CheckCircle2 size={32} className="text-success" />
                            <p>Tous les employés sont présents !</p>
                        </div>
                    ) : (
                        <ul className="absent-list mt-4">
                            {absentEmployees.map(emp => (
                                <li key={emp.uid} className="absent-item">
                                    <div className="emp-avatar-sm">
                                        {(emp.firstName?.[0] || '') + (emp.lastName?.[0] || '')}
                                    </div>
                                    <div>
                                        <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                                        <p className="text-muted" style={{ fontSize: '0.78rem' }}>{emp.email}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
