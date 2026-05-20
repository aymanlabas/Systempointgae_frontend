import React, { useState, useEffect } from 'react';
import { Target, Plus, Edit2, Trash2, TrendingUp, CheckCircle2, Clock, Save } from 'lucide-react';
import FirebaseService from '../services/FirebaseService';
import Modal from '../components/Modal';
import './Projects.css';

const emptyObjective = {
    title: '', description: '', targetDate: '', progress: 0, status: 'en_cours'
};

export default function Objectives() {
    const [objectives, setObjectives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyObjective);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await FirebaseService.getData('objectives');
            setObjectives(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        } finally { setLoading(false); }
    };

    const openCreate = () => { setEditing(null); setForm(emptyObjective); setModalOpen(true); };
    const openEdit = (obj) => {
        setEditing(obj);
        setForm({ ...obj });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.title.trim()) return;
        setSaving(true);
        try {
            const data = { ...form, progress: Number(form.progress), updatedAt: new Date().toISOString() };
            if (editing) {
                await FirebaseService.updateData('objectives', editing.id, data);
            } else {
                await FirebaseService.saveData('objectives', { ...data, createdAt: new Date().toISOString() });
            }
            setModalOpen(false);
            await fetchData();
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer cet objectif ?')) return;
        await FirebaseService.deleteData('objectives', id);
        await fetchData();
    };

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><Target size={28} className="page-title-icon" /> Objectifs Stratégiques</h1>
                    <p className="text-muted">Suivi des objectifs de croissance et performance de l'entreprise</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Nouvel Objectif</button>
            </div>

            {loading ? (
                <div className="loading-grid"><div className="project-skeleton" /><div className="project-skeleton" /></div>
            ) : objectives.length === 0 ? (
                <div className="empty-state glass-panel">
                    <Target size={48} />
                    <h3>Aucun objectif défini</h3>
                    <p className="text-muted">Fixez les caps de votre entreprise pour l'année</p>
                    <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Définir un objectif</button>
                </div>
            ) : (
                <div className="projects-grid">
                    {objectives.map(obj => (
                        <div key={obj.id} className="project-card glass-panel">
                            <div className="project-card-header">
                                <div className="project-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                                    <TrendingUp size={20} />
                                </div>
                                <span className={`badge ${obj.status === 'termine' ? 'badge-success' : 'badge-warning'}`}>
                                    {obj.status === 'termine' ? 'Atteint' : 'En cours'}
                                </span>
                            </div>
                            <h3 className="project-name">{obj.title}</h3>
                            <p className="project-desc text-muted">{obj.description}</p>

                            <div className="progress-section">
                                <div className="progress-info">
                                    <span className="text-muted" style={{ fontSize: '0.78rem' }}>Réalisation</span>
                                    <span className="progress-val">{obj.progress}%</span>
                                </div>
                                <div className="progress-bar-bg">
                                    <div className={`progress-bar-fill ${obj.progress === 100 ? 'fill-green' : 'fill-blue'}`} style={{ width: `${obj.progress}%` }} />
                                </div>
                            </div>

                            <div className="project-meta mt-2">
                                <div className="meta-item"><Clock size={13} /><span>Échéance: {obj.targetDate || 'Non définie'}</span></div>
                            </div>

                            <div className="project-card-footer">
                                <button className="btn-icon-sm" onClick={() => openEdit(obj)}><Edit2 size={16} /></button>
                                <button className="btn-icon-sm danger" onClick={() => handleDelete(obj.id)}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier l\'Objectif' : 'Nouvel Objectif Stratégique'} size="md"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Save size={16} />{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
                </>}>
                <div className="input-group">
                    <label>Titre de l'objectif *</label>
                    <input className="input-field" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Augmenter le CA de 20%" />
                </div>
                <div className="input-group">
                    <label>Description / KPI de mesure</label>
                    <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Comment mesurer cet objectif..." />
                </div>
                <div className="form-grid-2">
                    <div className="input-group">
                        <label>Échéance cible</label>
                        <input className="input-field" type="date" value={form.targetDate} onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))} />
                    </div>
                    <div className="input-group">
                        <label>Statut</label>
                        <select className="input-field" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                            <option value="en_cours">En cours</option>
                            <option value="termine">Terminé / Atteint</option>
                            <option value="suspendu">Suspendu</option>
                        </select>
                    </div>
                </div>
                <div className="input-group">
                    <label>Progression: {form.progress}%</label>
                    <input type="range" className="range-input" min={0} max={100} value={form.progress} onChange={e => setForm(p => ({ ...p, progress: e.target.value }))} />
                </div>
            </Modal>
        </div>
    );
}
