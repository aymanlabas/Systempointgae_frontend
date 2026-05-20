import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Users, Save } from 'lucide-react';
import FirebaseService from '../services/FirebaseService';
import Modal from '../components/Modal';
import './Projects.css';

export default function Departments() {
    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', managerId: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [d, u] = await Promise.all([
                FirebaseService.getData('departments'),
                FirebaseService.getData('users'),
            ]);
            setDepartments(d.sort((a, b) => a.name?.localeCompare(b.name)));
            setUsers(u);
        } finally { setLoading(false); }
    };

    const openCreate = () => { setEditing(null); setForm({ name: '', description: '', managerId: '' }); setModalOpen(true); };
    const openEdit = (d) => { setEditing(d); setForm({ name: d.name || '', description: d.description || '', managerId: d.managerId || '' }); setModalOpen(true); };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const data = { ...form, updatedAt: new Date().toISOString() };
            if (editing) {
                await FirebaseService.updateData('departments', editing.id, data);
            } else {
                await FirebaseService.saveData('departments', { ...data, createdAt: new Date().toISOString(), isActive: true });
            }
            setModalOpen(false);
            await fetchData();
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer ce département ?')) return;
        await FirebaseService.deleteData('departments', id);
        await fetchData();
    };

    const getMemberCount = (deptId) => users.filter(u => u.departmentId === deptId).length;
    const getManagerName = (id) => {
        const u = users.find(u => u.uid === id);
        return u ? `${u.firstName} ${u.lastName}` : '—';
    };

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><Building2 size={28} className="page-title-icon" /> Départements</h1>
                    <p className="text-muted">Gérer la structure organisationnelle</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Nouveau Département</button>
            </div>

            {loading ? (
                <div className="loading-grid"><div className="project-skeleton" /><div className="project-skeleton" /><div className="project-skeleton" /></div>
            ) : departments.length === 0 ? (
                <div className="empty-state glass-panel">
                    <Building2 size={48} />
                    <h3>Aucun département</h3>
                    <p className="text-muted">Créez votre structure organisationnelle</p>
                    <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Créer un département</button>
                </div>
            ) : (
                <div className="projects-grid">
                    {departments.map(dept => (
                        <div key={dept.id} className="project-card glass-panel">
                            <div className="project-card-header">
                                <div className="project-icon-wrap" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent)' }}>
                                    <Building2 size={20} />
                                </div>
                                <span className={`badge ${dept.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                    {dept.isActive ? 'Actif' : 'Inactif'}
                                </span>
                            </div>
                            <h3 className="project-name">{dept.name}</h3>
                            <p className="project-desc text-muted">{dept.description || 'Aucune description'}</p>
                            <div className="project-meta">
                                <div className="meta-item"><Users size={13} /><span>{getMemberCount(dept.id)} employés</span></div>
                                <div className="meta-item"><span style={{ fontSize: '0.78rem' }}>👤 {getManagerName(dept.managerId)}</span></div>
                            </div>
                            <div className="project-card-footer">
                                <button className="btn-icon-sm" onClick={() => openEdit(dept)}><Edit2 size={16} /></button>
                                <button className="btn-icon-sm danger" onClick={() => handleDelete(dept.id)}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le Département' : 'Nouveau Département'} size="md"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Save size={16} />{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
                </>}>
                <div className="input-group">
                    <label>Nom du département *</label>
                    <input className="input-field" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Ressources Humaines" />
                </div>
                <div className="input-group">
                    <label>Description</label>
                    <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description..." />
                </div>
                <div className="input-group">
                    <label>Responsable</label>
                    <select className="input-field" value={form.managerId} onChange={e => setForm(p => ({ ...p, managerId: e.target.value }))}>
                        <option value="">— Sélectionner —</option>
                        {users.map(u => <option key={u.uid} value={u.uid}>{u.firstName} {u.lastName}</option>)}
                    </select>
                </div>
            </Modal>
        </div>
    );
}
