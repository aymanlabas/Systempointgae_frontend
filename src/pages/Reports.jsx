import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Users, TrendingUp, Clock } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import FirebaseService from '../services/FirebaseService';
import { getLastNDays, getTodayString } from '../utils/dateUtils';
import {
    buildWeeklyAttendanceData, buildHoursPerEmployee, calcPunctualityRate
} from '../utils/attendanceUtils';
import './Projects.css';

export default function Reports() {
    const [attendances, setAttendances] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('7');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [a, u] = await Promise.all([
                FirebaseService.getData('attendance'),
                FirebaseService.getData('users'),
            ]);
            setAttendances(a);
            setUsers(u);
        } finally { setLoading(false); }
    };

    const days = getLastNDays(Number(period));
    const weeklyData = buildWeeklyAttendanceData(attendances, users, days);
    const hoursData = buildHoursPerEmployee(attendances, users, { start: days[0], end: getTodayString() });
    const rate = calcPunctualityRate(attendances);
    const employees = users.filter(u => u.role !== 'admin');
    const totalAttendances = attendances.filter(a => a.type === 'check-in').length;

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><FileText size={28} className="page-title-icon" /> Rapports & Analytiques</h1>
                    <p className="text-muted">Analyse des données RH et statistiques de présence</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <select className="input-field" style={{ width: 'auto', marginBottom: 0 }} value={period} onChange={e => setPeriod(e.target.value)}>
                        <option value="7">7 derniers jours</option>
                        <option value="14">14 derniers jours</option>
                        <option value="30">30 derniers jours</option>
                    </select>
                </div>
            </div>

            {/* KPI Summary */}
            <div className="kpi-mini-grid">
                <div className="kpi-mini glass-panel">
                    <Users size={24} style={{ color: 'var(--primary-light)' }} />
                    <div>
                        <div className="kpi-mini-val">{employees.length}</div>
                        <div className="kpi-mini-label">Total Employés</div>
                    </div>
                </div>
                <div className="kpi-mini glass-panel">
                    <TrendingUp size={24} style={{ color: 'var(--success)' }} />
                    <div>
                        <div className="kpi-mini-val">{rate}%</div>
                        <div className="kpi-mini-label">Ponctualité</div>
                    </div>
                </div>
                <div className="kpi-mini glass-panel">
                    <Clock size={24} style={{ color: 'var(--accent)' }} />
                    <div>
                        <div className="kpi-mini-val">{totalAttendances}</div>
                        <div className="kpi-mini-label">Pointages Totaux</div>
                    </div>
                </div>
                <div className="kpi-mini glass-panel">
                    <Calendar size={24} style={{ color: 'var(--warning)' }} />
                    <div>
                        <div className="kpi-mini-val">{period}j</div>
                        <div className="kpi-mini-label">Période analysée</div>
                    </div>
                </div>
            </div>

            {/* Attendance Chart */}
            <div className="chart-card glass-panel">
                <div className="chart-header">
                    <h3>Présence sur {period} jours</h3>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="presents" name="Présents" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="absents" name="Absents" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="retards" name="Retards" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Hours per Employee */}
            {hoursData.length > 0 && (
                <div className="chart-card glass-panel">
                    <div className="chart-header">
                        <h3>Heures travaillées par employé (Top 10)</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={hoursData} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={100} />
                            <Tooltip />
                            <Bar dataKey="heures" name="Heures" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Attendance Table */}
            <div className="table-card glass-panel">
                <div className="card-header pb-4" style={{ marginBottom: '1rem' }}>
                    <h2>Résumé de présence par employé</h2>
                </div>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Employé</th>
                                <th>Jours présent</th>
                                <th>Retards</th>
                                <th>Taux présence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" className="text-center p-8 text-muted">Chargement...</td></tr>
                            ) : employees.map(emp => {
                                const empAtts = attendances.filter(a => a.userId === emp.uid && a.type === 'check-in' && days.includes(a.date));
                                const lates = empAtts.filter(a => a.time > '09:00:00').length;
                                const rate = Math.round((empAtts.length / days.length) * 100);
                                return (
                                    <tr key={emp.uid}>
                                        <td className="font-medium text-primary-light">{emp.firstName} {emp.lastName}</td>
                                        <td><span className="badge badge-success">{empAtts.length}j</span></td>
                                        <td><span className="badge badge-warning">{lates}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div className="progress-bar-bg" style={{ flex: 1 }}>
                                                    <div className="progress-bar-fill fill-blue" style={{ width: `${rate}%` }} />
                                                </div>
                                                <span style={{ fontSize: '0.78rem', fontWeight: 600, minWidth: 36 }}>{rate}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
