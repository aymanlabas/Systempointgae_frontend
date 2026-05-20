import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Edit2, Trash2, Building2, Save } from 'lucide-react';
import FirebaseService from '../services/FirebaseService';
import Modal from '../components/Modal';
import './Projects.css';

export default function Positions() {
    const [positions, setPositions] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', departmentId: '', description: '', level: 'junior' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [p, d, u] = await Promise.all([
                FirebaseService.getData('positions'),
                FirebaseService.getData('departments'),
                FirebaseService.getData('users'),
            ]);
            setPositions(p.sort((a, b) => a.name?.localeCompare(b.name)));
            setDepartments(d);
            setUsers(u);
        } finally { setLoading(false); }
    };

    const openCreate = () => { setEditing(null); setForm({ name: '', departmentId: '', description: '', level: 'junior' }); setModalOpen(true); };
    const openEdit = (p) => {
        setEditing(p);
        setForm({ name: p.name || '', departmentId: p.departmentId || '', description: p.description || '', level: p.level || 'junior' });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const data = { ...form, updatedAt: new Date().toISOString() };
            if (editing) {
                await FirebaseService.updateData('positions', editing.id, data);
            } else {
                await FirebaseService.saveData('positions', { ...data, createdAt: new Date().toISOString() });
            }
            setModalOpen(false);
            await fetchData();
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer ce poste ?')) return;
        await FirebaseService.deleteData('positions', id);
        await fetchData();
    };

    const getDeptName = (id) => departments.find(d => d.id === id)?.name || '—';
    const getEmployeeCount = (posName) => users.filter(u => u.position === posName).length;

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><Briefcase size={28} className="page-title-icon" /> Gestion des Postes</h1>
                    <p className="text-muted">Définir les rôles et niveaux de responsabilité</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Nouveau Poste</button>
            </div>

            {loading ? (
                <div className="loading-grid"><div className="project-skeleton" /><div className="project-skeleton" /><div className="project-skeleton" /></div>
            ) : positions.length === 0 ? (
                <div className="empty-state glass-panel">
                    <Briefcase size={48} />
                    <h3>Aucun poste défini</h3>
                    <p className="text-muted">Créez les fiches de postes de votre entreprise</p>
                    <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Créer un poste</button>
                </div>
            ) : (
                <div className="projects-grid">
                    {positions.map(pos => (
                        <div key={pos.id} className="project-card glass-panel">
                            <div className="project-card-header">
                                <div className="project-icon-wrap" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary-light)' }}>
                                    <Briefcase size={20} />
                                </div>
                                <span className="badge badge-blue">{pos.level}</span>
                            </div>
                            <h3 className="project-name">{pos.name}</h3>
                            <div className="meta-item"><Building2 size={13} /><span>{getDeptName(pos.departmentId)}</span></div>
                            <p className="project-desc text-muted">{pos.description || 'Aucune description'}</p>
                            <div className="project-meta mt-2">
                                <div className="badge badge-muted">{getEmployeeCount(pos.name)} employés</div>
                            </div>
                            <div className="project-card-footer">
                                <button className="btn-icon-sm" onClick={() => openEdit(pos)}><Edit2 size={16} /></button>
                                <button className="btn-icon-sm danger" onClick={() => handleDelete(pos.id)}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le Poste' : 'Nouveau Poste'} size="md"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Save size={16} />{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
                </>}>
                <div className="input-group">
                    <label>Nom du poste *</label>
                    <input className="input-field" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Développeur Fullstack Senior" />
                </div>
                <div className="input-group">
                    <label>Département</label>
                    <select className="input-field" value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}>
                        <option value="">— Sélectionner —</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
                <div className="input-group">
                    <label>Niveau</label>
                    <select className="input-field" value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}>
                        <option value="intern">Stagiaire</option>
                        <option value="junior">Junior</option>
                        <option value="mid">Confirmé</option>
                        <option value="senior">Senior</option>
                        <option value="lead">Lead</option>
                        <option value="manager">Manager / Directeur</option>
                    </select>
                </div>
                <div className="input-group">
                    <label>Description des missions</label>
                    <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Responsabilités..." />
                </div>
            </Modal>
        </div>
    );
}
