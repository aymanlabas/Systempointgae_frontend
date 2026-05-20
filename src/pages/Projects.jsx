import React, { useState, useEffect } from 'react';
import {
    FolderKanban, Plus, Search, Edit2, Trash2, Users, Calendar,
    ChevronRight, CheckCircle, Pause, Play, BarChart3, X, Save
} from 'lucide-react';
import FirebaseService from '../services/FirebaseService';
import Modal from '../components/Modal';
import { formatDate, getProjectStatusLabel } from '../utils/dateUtils';
import './Projects.css';

const statusOptions = [
    { value: 'en_cours', label: 'En cours', color: 'blue', icon: Play },
    { value: 'termine', label: 'Terminé', color: 'green', icon: CheckCircle },
    { value: 'suspendu', label: 'Suspendu', color: 'warning', icon: Pause },
];

const emptyProject = {
    name: '', description: '', managerId: '', memberIds: [],
    status: 'en_cours', startDate: '', endDate: '', progress: 0, budget: '',
};

export default function Projects() {
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [detailModal, setDetailModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [form, setForm] = useState(emptyProject);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [p, u] = await Promise.all([
                FirebaseService.getData('projects'),
                FirebaseService.getData('users'),
            ]);
            setProjects(p.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setUsers(u);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setForm(emptyProject);
        setModalOpen(true);
    };

    const openEdit = (project) => {
        setEditing(project);
        setForm({
            name: project.name || '',
            description: project.description || '',
            managerId: project.managerId || '',
            memberIds: project.memberIds || [],
            status: project.status || 'en_cours',
            startDate: project.startDate || '',
            endDate: project.endDate || '',
            progress: project.progress || 0,
            budget: project.budget || '',
        });
        setModalOpen(true);
    };

    const openDetail = (project) => {
        setSelectedProject(project);
        setDetailModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const data = { ...form, progress: Number(form.progress), updatedAt: new Date().toISOString() };
            if (editing) {
                await FirebaseService.updateData('projects', editing.id, data);
            } else {
                await FirebaseService.saveData('projects', { ...data, createdAt: new Date().toISOString() });
            }
            setModalOpen(false);
            await fetchData();
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer ce projet ?')) return;
        await FirebaseService.deleteData('projects', id);
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

    const filtered = projects.filter(p => {
        const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'all' || p.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const getManagerName = (id) => {
        const u = users.find(u => u.uid === id);
        return u ? `${u.firstName} ${u.lastName}` : '—';
    };

    return (
        <div className="page-container animate-fade-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title"><FolderKanban size={28} className="page-title-icon" /> Gestion de Projets</h1>
                    <p className="text-muted">Suivi des projets et affectation des équipes</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>
                    <Plus size={18} /> Nouveau Projet
                </button>
            </div>

            {/* Filters */}
            <div className="filter-bar glass-panel">
                <div className="search-input-wrap">
                    <Search size={16} className="search-icon" />
                    <input
                        className="input-field search-field"
                        placeholder="Rechercher un projet..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="filter-chips">
                    <button
                        className={`chip ${filterStatus === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('all')}
                    >Tous</button>
                    {statusOptions.map(s => (
                        <button
                            key={s.value}
                            className={`chip chip-${s.color} ${filterStatus === s.value ? 'active' : ''}`}
                            onClick={() => setFilterStatus(s.value)}
                        >{s.label}</button>
                    ))}
                </div>
            </div>

            {/* Projects Grid */}
            {loading ? (
                <div className="loading-grid">
                    {[...Array(6)].map((_, i) => <div key={i} className="project-skeleton" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="empty-state glass-panel">
                    <FolderKanban size={48} />
                    <h3>Aucun projet trouvé</h3>
                    <p className="text-muted">Créez votre premier projet pour commencer</p>
                    <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Créer un projet</button>
                </div>
            ) : (
                <div className="projects-grid">
                    {filtered.map(project => {
                        const sl = getProjectStatusLabel(project.status);
                        return (
                            <div key={project.id} className="project-card glass-panel">
                                <div className="project-card-header">
                                    <div className="project-icon-wrap">
                                        <FolderKanban size={20} />
                                    </div>
                                    <span className={`badge badge-${sl.color}`}>{sl.label}</span>
                                </div>

                                <h3 className="project-name">{project.name}</h3>
                                <p className="project-desc text-muted">{project.description || 'Aucune description'}</p>

                                {/* Progress bar */}
                                <div className="progress-section">
                                    <div className="progress-info">
                                        <span className="text-muted" style={{ fontSize: '0.78rem' }}>Avancement</span>
                                        <span className="progress-val">{project.progress || 0}%</span>
                                    </div>
                                    <div className="progress-bar-bg">
                                        <div
                                            className={`progress-bar-fill fill-${sl.color}`}
                                            style={{ width: `${project.progress || 0}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="project-meta">
                                    <div className="meta-item">
                                        <Users size={13} />
                                        <span>{project.memberIds?.length || 0} membres</span>
                                    </div>
                                    {project.endDate && (
                                        <div className="meta-item">
                                            <Calendar size={13} />
                                            <span>Fin: {formatDate(project.endDate)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="project-card-footer">
                                    <button className="btn-icon-sm" onClick={() => openDetail(project)} title="Détails">
                                        <ChevronRight size={16} />
                                    </button>
                                    <button className="btn-icon-sm" onClick={() => openEdit(project)} title="Modifier">
                                        <Edit2 size={16} />
                                    </button>
                                    <button className="btn-icon-sm danger" onClick={() => handleDelete(project.id)} title="Supprimer">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? 'Modifier le Projet' : 'Nouveau Projet'}
                size="lg"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </>
                }
            >
                <div className="form-grid-2">
                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Nom du projet *</label>
                        <input className="input-field" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Refonte site web" />
                    </div>
                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Description</label>
                        <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description du projet..." />
                    </div>
                    <div className="input-group">
                        <label>Chef de projet</label>
                        <select className="input-field" value={form.managerId} onChange={e => setForm(p => ({ ...p, managerId: e.target.value }))}>
                            <option value="">— Sélectionner —</option>
                            {users.map(u => <option key={u.uid} value={u.uid}>{u.firstName} {u.lastName}</option>)}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Statut</label>
                        <select className="input-field" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                            {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Date début</label>
                        <input className="input-field" type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
                    </div>
                    <div className="input-group">
                        <label>Date fin</label>
                        <input className="input-field" type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
                    </div>
                    <div className="input-group">
                        <label>Avancement: {form.progress}%</label>
                        <input type="range" min={0} max={100} value={form.progress} onChange={e => setForm(p => ({ ...p, progress: e.target.value }))} className="range-input" />
                    </div>
                    <div className="input-group">
                        <label>Budget (DZD)</label>
                        <input className="input-field" type="number" value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} placeholder="0" />
                    </div>
                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Membres de l'équipe</label>
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

            {/* Detail Modal */}
            {selectedProject && (
                <Modal
                    isOpen={detailModal}
                    onClose={() => setDetailModal(false)}
                    title={selectedProject.name}
                    size="lg"
                >
                    <div className="project-detail">
                        <div className="detail-section">
                            <h4>Informations</h4>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Statut</span>
                                    <span className={`badge badge-${getProjectStatusLabel(selectedProject.status).color}`}>
                                        {getProjectStatusLabel(selectedProject.status).label}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Chef de projet</span>
                                    <span>{getManagerName(selectedProject.managerId)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Début</span>
                                    <span>{formatDate(selectedProject.startDate) || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Fin prévue</span>
                                    <span>{formatDate(selectedProject.endDate) || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Budget</span>
                                    <span>{selectedProject.budget ? `${selectedProject.budget} DZD` : '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Membres</span>
                                    <span>{selectedProject.memberIds?.length || 0} employés</span>
                                </div>
                            </div>
                        </div>
                        <div className="detail-section">
                            <h4>Avancement</h4>
                            <div className="progress-bar-bg large">
                                <div className="progress-bar-fill fill-blue" style={{ width: `${selectedProject.progress || 0}%` }} />
                            </div>
                            <p className="text-muted mt-1" style={{ fontSize: '0.875rem' }}>{selectedProject.progress || 0}% complété</p>
                        </div>
                        {selectedProject.description && (
                            <div className="detail-section">
                                <h4>Description</h4>
                                <p className="text-muted">{selectedProject.description}</p>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}
