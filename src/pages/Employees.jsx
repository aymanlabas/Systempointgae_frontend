import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Search, X, Camera, Check, Eye } from 'lucide-react';
import FirebaseService from '../services/FirebaseService';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import FaceRecognitionService from '../services/FaceRecognitionService';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './Employees.css';

export default function Employees() {
    const [searchTerm, setSearchTerm] = useState('');
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State (Add/Edit)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEmp, setCurrentEmp] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'employee', departmentId: '', descriptor: null, photo: null });
    const [isEditing, setIsEditing] = useState(false);
    const [empFormError, setEmpFormError] = useState('');

    // Historique State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedEmpHistory, setSelectedEmpHistory] = useState([]);
    const [viewingEmp, setViewingEmp] = useState(null);

    // Camera state for registering face
    const videoRef = useRef(null);
    const [isScanningFace, setIsScanningFace] = useState(false);
    const [scanMessage, setScanMessage] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [empData, deptData, scheduleData] = await Promise.all([
                FirebaseService.getData('users'),
                FirebaseService.getData('departments'),
                FirebaseService.getData('schedules')
            ]);
            setEmployees(empData);
            setDepartments(deptData);
            setSchedules(scheduleData);
        } catch (error) {
            console.error("Erreur serveur :", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        FaceRecognitionService.loadModels();
    }, []);

    const filteredEmployees = employees.filter(emp =>
        (emp.name && emp.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleOpenAdd = () => {
        setCurrentEmp({ name: '', email: '', password: '', confirmPassword: '', role: 'employee', departmentId: '', scheduleId: '', descriptor: null, photo: null });
        setEmpFormError('');
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (emp) => {
        setCurrentEmp({ ...emp, password: '', confirmPassword: '', departmentId: emp.departmentId || emp.department || '', scheduleId: emp.scheduleId || '' });
        setEmpFormError('');
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleOpenHistory = async (emp) => {
        setViewingEmp(emp);
        setIsHistoryModalOpen(true);
        try {
            const q = query(collection(db, 'attendance'), where('userId', '==', emp.id));
            const querySnapshot = await getDocs(q);
            const history = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setSelectedEmpHistory(history);
        } catch (error) {
            console.error("Erreur de récupération de l'historique", error);
            setSelectedEmpHistory([]);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Voulez-vous vraiment supprimer cet employé ?")) {
            try {
                // On tente la suppression complète (Auth + Firestore) via le backend
                await ApiService.deleteUser(id);
                alert("Employé supprimé avec succès (Compte + Données).");
                fetchData();
            } catch (error) {
                console.error("Erreur de suppression complète:", error);

                // Si l'erreur est liée à la connexion (compte mock admin), on propose le mode dégradé
                if (error.message.includes("non connecté") || error.message.includes("401") || error.message.includes("403")) {
                    if (window.confirm("Note : Vous utilisez un compte admin local. Le compte Firebase Auth ne peut pas être supprimé automatiquement sans authentification réelle. \n\nVoulez-vous supprimer uniquement les données de l'employé de la liste ?")) {
                        try {
                            await FirebaseService.deleteData('users', id);
                            fetchData();
                        } catch (err) {
                            alert("Erreur lors de la suppression des données: " + err.message);
                        }
                    }
                } else {
                    alert("Erreur: " + error.message);
                }
            }
        }
    };

    // ----- FEATURE: Scan du Visage + Photo -----
    const startFaceScan = async () => {
        setIsScanningFace(true);
        setScanMessage('Initialisation de la caméra...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            setScanMessage("Impossible d'accéder à la webcam.");
            return;
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setIsScanningFace(false);
    };

    const handleVideoPlay = () => {
        setScanMessage('Analyse en cours... Veuillez rester immobile.');
        const scanInterval = setInterval(async () => {
            if (!isScanningFace || !videoRef.current) {
                clearInterval(scanInterval);
                return;
            }

            const detections = await FaceRecognitionService.detectFace(videoRef.current);

            if (detections.length === 1) {
                const descriptor = FaceRecognitionService.extractDescriptor(detections[0]);

                const canvas = document.createElement('canvas');
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
                const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);

                setCurrentEmp(prev => ({ ...prev, descriptor, photo: photoDataUrl }));
                setScanMessage('Visage et photo enregistrés !');
                clearInterval(scanInterval);
                setTimeout(() => stopCamera(), 1500);
            } else if (detections.length > 1) {
                setScanMessage('Erreur: Plusieurs visages détectés.');
            }
        }, 1000);
    };
    // --------------------------------------------------

    const handleSubmit = async (e) => {
        e.preventDefault();
        setEmpFormError('');

        // Password validation (only required when adding)
        if (!isEditing) {
            if (!currentEmp.password || currentEmp.password.length < 6) {
                setEmpFormError('Le mot de passe doit contenir au moins 6 caractères.');
                return;
            }
            if (currentEmp.password !== currentEmp.confirmPassword) {
                setEmpFormError('Les mots de passe ne correspondent pas.');
                return;
            }
        } else if (currentEmp.password) {
            // If editing and password is filled, validate it
            if (currentEmp.password.length < 6) {
                setEmpFormError('Le mot de passe doit contenir au moins 6 caractères.');
                return;
            }
            if (currentEmp.password !== currentEmp.confirmPassword) {
                setEmpFormError('Les mots de passe ne correspondent pas.');
                return;
            }
        }

        try {
            if (isEditing) {
                const { id, confirmPassword, ...dataToUpdate } = currentEmp;
                // Don't save empty password on edit
                if (!dataToUpdate.password) delete dataToUpdate.password;
                await FirebaseService.updateData('users', id, dataToUpdate);
            } else {
                const { email, password, name, role, departmentId, photo, descriptor } = currentEmp;

                // On utilise AuthService.register (Client-side) pour que ça marche même avec le compte mock admin
                const newUser = await AuthService.register(email, password);

                // Sauvegarde des données complémentaires dans Firestore
                await FirebaseService.setDocument('users', newUser.uid, {
                    uid: newUser.uid,
                    email: email,
                    name: name,
                    role: role || 'employee',
                    departmentId: departmentId || '',
                    scheduleId: scheduleId || '',
                    photo: photo || null,
                    descriptor: descriptor || null,
                    createdAt: new Date().toISOString()
                });
                alert("Employé créé avec succès !");
            }
            fetchData();
            setIsModalOpen(false);
            stopCamera();
        } catch (error) {
            console.error("Erreur complète:", error);
            if (error.code === 'auth/email-already-in-use') {
                setEmpFormError('Cet email est déjà utilisé dans Firebase Auth.');
            } else {
                setEmpFormError(`Erreur: ${error.message}`);
            }
        }
    };

    return (
        <div className="dashboard animate-fade-in relative">
            <div className="dashboard-header mb-6 flex justify-between items-center">
                <div>
                    <h1>Gestion des Employés</h1>
                    <p className="text-muted">Profils, Empreintes faciales (Photos) et Historiques</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleOpenAdd} className="btn btn-primary">
                        <Plus size={18} /> Nouvel Employé
                    </button>
                </div>
            </div>

            <div className="content-card glass-panel">
                <div className="card-header pb-4 flex justify-between items-center">
                    <h2>Liste des Employés</h2>
                    <div className="input-wrapper" style={{ minWidth: '250px' }}>
                        <Search className="input-icon" size={18} />
                        <input
                            type="text"
                            className="input-field with-icon"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-responsive mt-4">
                    <table className="data-table align-middle">
                        <thead>
                            <tr>
                                <th>Photo</th>
                                <th>Nom</th>
                                <th>Département</th>
                                <th>Rôle</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center p-8">Chargement...</td></tr>
                            ) : filteredEmployees.length > 0 ? (
                                filteredEmployees.map(emp => (
                                    <tr key={emp.id}>
                                        <td>
                                            {emp.photo ? (
                                                <img src={emp.photo} alt={emp.name} className="emp-avatar" />
                                            ) : (
                                                <div className="emp-avatar undefined-avatar">?</div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="font-medium">{emp.name || 'N/A'}</div>
                                            <div className="text-sm text-muted">{emp.email}</div>
                                        </td>
                                        <td>{departments.find(d => d.id === (emp.departmentId || emp.department))?.name || '-'}</td>
                                        <td>
                                            <span className={`badge ${emp.role === 'admin' ? 'badge-admin' : 'badge-emp'}`}>
                                                {emp.role}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleOpenHistory(emp)} className="btn-icon text-accent" title="Voir l'historique">
                                                    <Eye size={18} />
                                                </button>
                                                <button onClick={() => handleOpenEdit(emp)} className="btn-icon" title="Modifier">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(emp.id)} className="btn-icon" style={{ color: 'var(--danger)' }} title="Supprimer">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center p-8 text-muted">Aucun employé trouvé.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODAL AJOUT/EDITION --- */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-card glass-panel animate-fade-in" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h2>{isEditing ? 'Modifier Employé' : 'Ajouter un Employé'}</h2>
                            <button className="btn-icon" onClick={() => { setIsModalOpen(false); stopCamera(); setEmpFormError(''); }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-body gap-4">
                            {empFormError && (
                                <div className="error-alert mb-4">
                                    {empFormError}
                                </div>
                            )}

                            <div className="input-group mb-0">
                                <label>Nom complet</label>
                                <input type="text" className="input-field" value={currentEmp.name} onChange={e => setCurrentEmp({ ...currentEmp, name: e.target.value })} required />
                            </div>

                            <div className="input-group mb-0">
                                <label>Email</label>
                                <input type="email" className="input-field" value={currentEmp.email} onChange={e => setCurrentEmp({ ...currentEmp, email: e.target.value })} required />
                            </div>

                            <div className="input-group mb-0">
                                <label>{isEditing ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    placeholder={isEditing ? 'Laisser vide pour ne pas modifier' : 'Minimum 6 caractères'}
                                    value={currentEmp.password}
                                    onChange={e => setCurrentEmp({ ...currentEmp, password: e.target.value })}
                                    required={!isEditing}
                                />
                            </div>

                            <div className="input-group mb-0">
                                <label>Confirmer le mot de passe</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    placeholder="Confirmez le mot de passe"
                                    value={currentEmp.confirmPassword}
                                    onChange={e => setCurrentEmp({ ...currentEmp, confirmPassword: e.target.value })}
                                    required={!isEditing || !!currentEmp.password}
                                />
                            </div>

                            {/* Zone Face ID & Photo */}
                            <div className="face-id-section p-4 mt-2" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)' }}>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-sm font-medium">Empreinte & Photo</h3>
                                    {currentEmp.photo ? (
                                        <span className="badge badge-primary"><Check size={12} /> Actif</span>
                                    ) : (
                                        <span className="badge badge-secondary">Optionnel</span>
                                    )}
                                </div>

                                {currentEmp.photo && !isScanningFace && (
                                    <div className="text-center mt-2 mb-4">
                                        <img src={currentEmp.photo} alt="preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%', border: '2px solid var(--primary-light)' }} />
                                    </div>
                                )}

                                {isScanningFace ? (
                                    <div className="camera-preview mt-4">
                                        <video ref={videoRef} autoPlay muted onPlay={handleVideoPlay} style={{ width: '100%', borderRadius: 'var(--radius-sm)' }} />
                                        <p className="text-center text-sm mt-2 text-primary-light">{scanMessage}</p>
                                        <button type="button" onClick={stopCamera} className="btn btn-secondary w-full mt-2 text-sm">Annuler le scan</button>
                                    </div>
                                ) : (
                                    <button type="button" onClick={startFaceScan} className="btn btn-secondary w-full mt-2 justify-center">
                                        <Camera size={16} /> {currentEmp.descriptor ? 'Mettre à jour la photo' : 'Prendre la photo'}
                                    </button>
                                )}
                            </div>

                            <div className="input-group mb-0 mt-2">
                                <label>Département</label>
                                <select
                                    className="input-field"
                                    style={{ backgroundColor: 'rgb(20,20,30)' }}
                                    value={currentEmp.departmentId}
                                    onChange={e => setCurrentEmp({ ...currentEmp, departmentId: e.target.value })}
                                >
                                    <option value="">— Aucun —</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group mb-0 mt-2">
                                <label>Horaire de travail</label>
                                <select
                                    className="input-field"
                                    style={{ backgroundColor: 'rgb(20,20,30)' }}
                                    value={currentEmp.scheduleId}
                                    onChange={e => setCurrentEmp({ ...currentEmp, scheduleId: e.target.value })}
                                >
                                    <option value="">— Standard (09:00) —</option>
                                    {schedules.map(sch => (
                                        <option key={sch.id} value={sch.id}>{sch.name} ({sch.startTime}-{sch.endTime})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group mb-0 mt-2">
                                <label>Rôle</label>
                                <select className="input-field" style={{ backgroundColor: 'rgb(20,20,30)' }} value={currentEmp.role} onChange={e => setCurrentEmp({ ...currentEmp, role: e.target.value })}>
                                    <option value="employee">Employé(e)</option>
                                    <option value="admin">Administrateur</option>
                                </select>
                            </div>

                            <div className="modal-footer mt-4 flex gap-4">
                                <button type="button" onClick={() => { setIsModalOpen(false); stopCamera(); setEmpFormError(''); }} className="btn btn-secondary w-full">Annuler</button>
                                <button type="submit" disabled={isScanningFace} className="btn btn-primary w-full">
                                    {isEditing ? 'Mettre à jour' : "Créer l'employé"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL HISTORIQUE (CHECK-IN / OUT) --- */}
            {isHistoryModalOpen && viewingEmp && (
                <div className="modal-overlay">
                    <div className="modal-card glass-panel animate-fade-in" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <div className="flex items-center gap-4">
                                {viewingEmp.photo && <img src={viewingEmp.photo} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />}
                                <div>
                                    <h2>Historique: {viewingEmp.name}</h2>
                                    <p className="text-sm text-muted">{viewingEmp.email}</p>
                                </div>
                            </div>
                            <button className="btn-icon" onClick={() => setIsHistoryModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {selectedEmpHistory.length > 0 ? (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Heure</th>
                                            <th>Opération</th>
                                            <th>Confiance (IA)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedEmpHistory.map(log => (
                                            <tr key={log.id}>
                                                <td>{log.date}</td>
                                                <td className="font-medium">{log.time}</td>
                                                <td>
                                                    <span className="badge badge-primary">DÉTECTION (Visage)</span>
                                                </td>
                                                <td className="text-sm text-muted">
                                                    {log.confidence ? `${(100 - (log.confidence * 100)).toFixed(1)}%` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center p-8 text-muted">Aucun pointage enregistré pour cet employé.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}