import React, { useState, useEffect } from 'react';
import { CalendarDays, Plus, Check, X, Clock, Search, Filter, Save } from 'lucide-react';
import FirebaseService from '../services/FirebaseService';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { formatDate, getLeaveStatusLabel, workDaysBetween } from '../utils/dateUtils';
import './Projects.css';

const LEAVE_TYPES = [
    { value: 'conge', label: 'Congé annuel' },
    { value: 'maladie', label: 'Congé maladie' },
    { value: 'urgent', label: 'Congé urgent' },
    { value: 'maternel', label: 'Congé maternité' },
    { value: 'autre', label: 'Autre' },
];

export default function Leaves() {
    const { currentUser, userRole, userProfile } = useAuth();
    const isAdmin = userRole === 'admin';

    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ type: 'conge', startDate: '', endDate: '', reason: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            let data = await FirebaseService.getData('leaves');
            if (!isAdmin) data = data.filter(l => l.userId === currentUser.uid);
            data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setLeaves(data);
        } finally { setLoading(false); }
    };

    const handleSubmit = async () => {
        if (!form.startDate || !form.endDate) return;
        setSaving(true);
        try {
            const days = workDaysBetween(form.startDate, form.endDate);
            await FirebaseService.saveData('leaves', {
                ...form,
                userId: currentUser.uid,
                userName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || currentUser.email,
                days,
                status: 'en_attente',
                createdAt: new Date().toISOString(),
                reviewedBy: null,
                reviewedAt: null,
            });
            setModalOpen(false);
            setForm({ type: 'conge', startDate: '', endDate: '', reason: '' });
            await fetchData();
        } finally { setSaving(false); }
    };

    const handleReview = async (leaveId, status) => {
        await FirebaseService.updateData('leaves', leaveId, {
            status,
            reviewedBy: currentUser.uid,
            reviewedAt: new Date().toISOString(),
        });
        await fetchData();
    };

    const filtered = leaves.filter(l => {
        const matchStatus = filterStatus === 'all' || l.status === filterStatus;
        const matchSearch = !search || l.userName?.toLowerCase().includes(search.toLowerCase()) || l.reason?.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const StatusBadge = ({ status }) => {
        const { label, color } = getLeaveStatusLabel(status);
        return <span className={`badge badge-${color}`}>{label}</span>;
    };

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><CalendarDays size={28} className="page-title-icon" /> Gestion des Congés</h1>
                    <p className="text-muted">{isAdmin ? 'Valider et gérer les demandes de congés' : 'Mes demandes de congés'}</p>
                </div>
                {!isAdmin && (
                    <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                        <Plus size={18} /> Demander un congé
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="filter-bar glass-panel">
                {isAdmin && (
                    <div className="search-input-wrap">
                        <Search size={16} className="search-icon" />
                        <input className="input-field search-field" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                )}
                <div className="filter-chips">
                    {['all', 'en_attente', 'accepte', 'refuse'].map(s => (
                        <button key={s} className={`chip ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
                            {s === 'all' ? 'Tous' : getLeaveStatusLabel(s).label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats (admin) */}
            {isAdmin && (
                <div className="kpi-mini-grid">
                    <div className="kpi-mini glass-panel">
                        <Clock size={20} style={{ color: 'var(--warning)' }} />
                        <div>
                            <div className="kpi-mini-val">{leaves.filter(l => l.status === 'en_attente').length}</div>
                            <div className="kpi-mini-label">En attente</div>
                        </div>
                    </div>
                    <div className="kpi-mini glass-panel">
                        <Check size={20} style={{ color: 'var(--success)' }} />
                        <div>
                            <div className="kpi-mini-val">{leaves.filter(l => l.status === 'accepte').length}</div>
                            <div className="kpi-mini-label">Acceptés</div>
                        </div>
                    </div>
                    <div className="kpi-mini glass-panel">
                        <X size={20} style={{ color: 'var(--danger)' }} />
                        <div>
                            <div className="kpi-mini-val">{leaves.filter(l => l.status === 'refuse').length}</div>
                            <div className="kpi-mini-label">Refusés</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="table-card glass-panel">
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                {isAdmin && <th>Employé</th>}
                                <th>Type</th>
                                <th>Début</th>
                                <th>Fin</th>
                                <th>Jours</th>
                                <th>Motif</th>
                                <th>Statut</th>
                                {isAdmin && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" className="text-center p-8 text-muted">Chargement...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="8" className="text-center p-8 text-muted">Aucune demande de congé.</td></tr>
                            ) : filtered.map(leave => (
                                <tr key={leave.id}>
                                    {isAdmin && <td className="font-medium text-primary-light">{leave.userName}</td>}
                                    <td>{LEAVE_TYPES.find(t => t.value === leave.type)?.label || leave.type}</td>
                                    <td className="text-muted">{formatDate(leave.startDate)}</td>
                                    <td className="text-muted">{formatDate(leave.endDate)}</td>
                                    <td><span className="badge badge-blue">{leave.days || '—'} j</span></td>
                                    <td className="text-muted" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {leave.reason || '—'}
                                    </td>
                                    <td><StatusBadge status={leave.status} /></td>
                                    {isAdmin && leave.status === 'en_attente' && (
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.375rem' }}>
                                                <button className="btn-icon-sm" style={{ color: 'var(--success)' }} onClick={() => handleReview(leave.id, 'accepte')} title="Accepter">
                                                    <Check size={15} />
                                                </button>
                                                <button className="btn-icon-sm danger" onClick={() => handleReview(leave.id, 'refuse')} title="Refuser">
                                                    <X size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                    {isAdmin && leave.status !== 'en_attente' && <td className="text-muted" style={{ fontSize: '0.78rem' }}>Traité</td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Leave Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Demande de Congé" size="md"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}><Save size={16} />{saving ? 'Envoi...' : 'Envoyer la demande'}</button>
                </>}>
                <div className="input-group">
                    <label>Type de congé</label>
                    <select className="input-field" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                        {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
                <div className="form-grid-2">
                    <div className="input-group">
                        <label>Date début *</label>
                        <input className="input-field" type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
                    </div>
                    <div className="input-group">
                        <label>Date fin *</label>
                        <input className="input-field" type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
                    </div>
                </div>
                {form.startDate && form.endDate && (
                    <div className="kpi-mini glass-panel mb-4" style={{ flexDirection: 'row', padding: '0.625rem 1rem' }}>
                        <CalendarDays size={18} style={{ color: 'var(--primary-light)' }} />
                        <span><strong>{workDaysBetween(form.startDate, form.endDate)}</strong> jours ouvrables</span>
                    </div>
                )}
                <div className="input-group">
                    <label>Motif</label>
                    <textarea className="input-field" rows={3} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Précisez le motif de votre demande..." />
                </div>
            </Modal>
        </div>
    );
}
