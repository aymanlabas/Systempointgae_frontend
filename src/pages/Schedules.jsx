import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, Clock, Save } from 'lucide-react';
import FirebaseService from '../services/FirebaseService';
import Modal from '../components/Modal';
import './Projects.css';

const DAYS_OPTIONS = [
    { value: 'Mon', label: 'Lun' },
    { value: 'Tue', label: 'Mar' },
    { value: 'Wed', label: 'Mer' },
    { value: 'Thu', label: 'Jeu' },
    { value: 'Fri', label: 'Ven' },
    { value: 'Sat', label: 'Sam' },
    { value: 'Sun', label: 'Dim' },
];

const emptySchedule = {
    name: '',
    startTime: '08:30',
    endTime: '17:30',
    workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    toleranceMinutes: 15,
};

export default function Schedules() {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptySchedule);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await FirebaseService.getData('schedules');
            setSchedules(data.sort((a, b) => a.name?.localeCompare(b.name)));
        } finally { setLoading(false); }
    };

    const openCreate = () => { setEditing(null); setForm(emptySchedule); setModalOpen(true); };
    const openEdit = (s) => {
        setEditing(s);
        setForm({ name: s.name, startTime: s.startTime, endTime: s.endTime, workDays: s.workDays || [], toleranceMinutes: s.toleranceMinutes || 15 });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const data = { ...form, toleranceMinutes: Number(form.toleranceMinutes), updatedAt: new Date().toISOString() };
            if (editing) {
                await FirebaseService.updateData('schedules', editing.id, data);
            } else {
                await FirebaseService.saveData('schedules', { ...data, createdAt: new Date().toISOString() });
            }
            setModalOpen(false);
            await fetchData();
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer cet horaire ?')) return;
        await FirebaseService.deleteData('schedules', id);
        await fetchData();
    };

    const toggleDay = (day) => {
        setForm(prev => ({
            ...prev,
            workDays: prev.workDays.includes(day)
                ? prev.workDays.filter(d => d !== day)
                : [...prev.workDays, day],
        }));
    };

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><Settings size={28} className="page-title-icon" /> Horaires de Travail</h1>
                    <p className="text-muted">Définir les plages horaires et jours de travail</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Nouvel Horaire</button>
            </div>

            {loading ? (
                <div className="loading-grid"><div className="project-skeleton" /><div className="project-skeleton" /></div>
            ) : schedules.length === 0 ? (
                <div className="empty-state glass-panel">
                    <Clock size={48} />
                    <h3>Aucun horaire défini</h3>
                    <p className="text-muted">Créez les plages horaires de votre entreprise</p>
                    <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Créer un horaire</button>
                </div>
            ) : (
                <div className="projects-grid">
                    {schedules.map(schedule => (
                        <div key={schedule.id} className="project-card glass-panel">
                            <div className="project-card-header">
                                <div className="project-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                                    <Clock size={20} />
                                </div>
                                <span className="badge badge-success">{schedule.workDays?.length || 0}j/sem</span>
                            </div>
                            <h3 className="project-name">{schedule.name}</h3>
                            <div className="schedule-time-display">
                                <span className="time-chip">{schedule.startTime}</span>
                                <span className="time-separator">→</span>
                                <span className="time-chip">{schedule.endTime}</span>
                            </div>
                            <div className="days-display">
                                {DAYS_OPTIONS.map(d => (
                                    <span key={d.value} className={`day-chip ${schedule.workDays?.includes(d.value) ? 'active' : ''}`}>
                                        {d.label}
                                    </span>
                                ))}
                            </div>
                            <p className="text-muted" style={{ fontSize: '0.78rem' }}>
                                Tolérance: {schedule.toleranceMinutes} min
                            </p>
                            <div className="project-card-footer">
                                <button className="btn-icon-sm" onClick={() => openEdit(schedule)}><Edit2 size={16} /></button>
                                <button className="btn-icon-sm danger" onClick={() => handleDelete(schedule.id)}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Modifier l'Horaire" : 'Nouvel Horaire'} size="md"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Save size={16} />{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
                </>}>
                <div className="input-group">
                    <label>Nom de l'horaire *</label>
                    <input className="input-field" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Standard 8h30-17h30" />
                </div>
                <div className="form-grid-2">
                    <div className="input-group">
                        <label>Heure de début</label>
                        <input className="input-field" type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} />
                    </div>
                    <div className="input-group">
                        <label>Heure de fin</label>
                        <input className="input-field" type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} />
                    </div>
                </div>
                <div className="input-group">
                    <label>Tolérance retard (minutes)</label>
                    <input className="input-field" type="number" min={0} max={60} value={form.toleranceMinutes} onChange={e => setForm(p => ({ ...p, toleranceMinutes: e.target.value }))} />
                </div>
                <div className="input-group">
                    <label>Jours de travail</label>
                    <div className="days-picker">
                        {DAYS_OPTIONS.map(d => (
                            <button
                                key={d.value}
                                type="button"
                                className={`day-picker-btn ${form.workDays.includes(d.value) ? 'active' : ''}`}
                                onClick={() => toggleDay(d.value)}
                            >{d.label}</button>
                        ))}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
