import React, { useState, useEffect } from 'react';
import { GitFork, Plus, Edit2, Trash2, Users, Save } from 'lucide-react';
import FirebaseService from '../services/FirebaseService';
import Modal from '../components/Modal';
import './Projects.css';

export default function Teams() {
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', departmentId: '', leaderId: '', memberIds: [] });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [t, u, d] = await Promise.all([
                FirebaseService.getData('teams'),
                FirebaseService.getData('users'),
                FirebaseService.getData('departments'),
            ]);
            setTeams(t);
            setUsers(u);
            setDepartments(d);
        } finally { setLoading(false); }
    };

    const openCreate = () => { setEditing(null); setForm({ name: '', departmentId: '', leaderId: '', memberIds: [] }); setModalOpen(true); };
    const openEdit = (t) => {
        setEditing(t);
        setForm({ name: t.name || '', departmentId: t.departmentId || '', leaderId: t.leaderId || '', memberIds: t.memberIds || [] });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const data = { ...form, updatedAt: new Date().toISOString() };
            if (editing) {
                await FirebaseService.updateData('teams', editing.id, data);
            } else {
                await FirebaseService.saveData('teams', { ...data, createdAt: new Date().toISOString(), isActive: true });
            }
            setModalOpen(false);
            await fetchData();
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer cette équipe ?')) return;
        await FirebaseService.deleteData('teams', id);
        await fetchData();
    };

    const toggleMember = (uid) => {
        setForm(prev => ({
            ...prev,
            memberIds: prev.memberIds.includes(uid)
                ? prev.memberIds.filter(id => id !== uid)
                : [...prev.memberIds, uid],
        }));
    };

    const getDeptName = (id) => departments.find(d => d.id === id)?.name || '—';
    const getLeaderName = (id) => {
        const u = users.find(u => u.uid === id);
        return u ? `${u.firstName} ${u.lastName}` : '—';
    };

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><GitFork size={28} className="page-title-icon" /> Équipes</h1>
                    <p className="text-muted">Gérer les équipes et leurs membres</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Nouvelle Équipe</button>
            </div>

            {loading ? (
                <div className="loading-grid"><div className="project-skeleton" /><div className="project-skeleton" /><div className="project-skeleton" /></div>
            ) : teams.length === 0 ? (
                <div className="empty-state glass-panel">
                    <GitFork size={48} />
                    <h3>Aucune équipe</h3>
                    <p className="text-muted">Créez vos premières équipes</p>
                    <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Créer une équipe</button>
                </div>
            ) : (
                <div className="projects-grid">
                    {teams.map(team => (
                        <div key={team.id} className="project-card glass-panel">
                            <div className="project-card-header">
                                <div className="project-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                                    <GitFork size={20} />
                                </div>
                                <span className="badge badge-blue">{getDeptName(team.departmentId)}</span>
                            </div>
                            <h3 className="project-name">{team.name}</h3>
                            <div className="project-meta">
                                <div className="meta-item"><Users size={13} /><span>{team.memberIds?.length || 0} membres</span></div>
                                <div className="meta-item"><span style={{ fontSize: '0.78rem' }}>🏆 {getLeaderName(team.leaderId)}</span></div>
                            </div>
                            <div className="members-grid mt-2">
                                {(team.memberIds || []).slice(0, 5).map(uid => {
                                    const u = users.find(u => u.uid === uid);
                                    return u ? (
                                        <div key={uid} className="member-chip selected" style={{ pointerEvents: 'none' }}>
                                            <div className="member-chip-avatar">{(u.firstName?.[0] || '') + (u.lastName?.[0] || '')}</div>
                                            <span>{u.firstName}</span>
                                        </div>
                                    ) : null;
                                })}
                                {(team.memberIds || []).length > 5 && (
                                    <div className="member-chip">+{team.memberIds.length - 5}</div>
                                )}
                            </div>
                            <div className="project-card-footer">
                                <button className="btn-icon-sm" onClick={() => openEdit(team)}><Edit2 size={16} /></button>
                                <button className="btn-icon-sm danger" onClick={() => handleDelete(team.id)}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Modifier l'Équipe" : 'Nouvelle Équipe'} size="lg"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Save size={16} />{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
                </>}>
                <div className="form-grid-2">
                    <div className="input-group" style={{ gridColumn: '1/-1' }}>
                        <label>Nom de l'équipe *</label>
                        <input className="input-field" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Équipe Frontend" />
                    </div>
                    <div className="input-group">
                        <label>Département</label>
                        <select className="input-field" value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}>
                            <option value="">— Sélectionner —</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Chef d'équipe</label>
                        <select className="input-field" value={form.leaderId} onChange={e => setForm(p => ({ ...p, leaderId: e.target.value }))}>
                            <option value="">— Sélectionner —</option>
                            {users.map(u => <option key={u.uid} value={u.uid}>{u.firstName} {u.lastName}</option>)}
                        </select>
                    </div>
                    <div className="input-group" style={{ gridColumn: '1/-1' }}>
                        <label>Membres</label>
                        <div className="members-grid">
                            {users.map(u => (
                                <label key={u.uid} className={`member-chip ${form.memberIds.includes(u.uid) ? 'selected' : ''}`}>
                                    <input type="checkbox" checked={form.memberIds.includes(u.uid)} onChange={() => toggleMember(u.uid)} style={{ display: 'none' }} />
                                    <div className="member-chip-avatar">{(u.firstName?.[0] || '') + (u.lastName?.[0] || '')}</div>
                                    <span>{u.firstName} {u.lastName}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
