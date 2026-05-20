import React, { useRef, useState, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import FaceRecognitionService from '../services/FaceRecognitionService';
import FirebaseService from '../services/FirebaseService';
import TelegramService from '../services/TelegramService';
import ApiService from '../services/ApiService';
import useWelcomeSound from '../hooks/useWelcomeSound';
import './Punch.css';

export default function Punch() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const [isReady, setIsReady] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('Analyse du système...');

    // Instance from Class Diagram: FaceMatcher identifies Employee from FaceData
    const [faceMatcher, setFaceMatcher] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [identifiedUser, setIdentifiedUser] = useState(null);

    // ── Welcome Sound ────────────────────────────────────────────────────────
    // Switch mode to 'mp3' and set audioSrc if you prefer the static file.
    // mode: 'tts'  → uses browser SpeechSynthesis (no file needed)
    // mode: 'mp3'  → plays /public/audio/welcome.mp3 (falls back to TTS if blocked)
    const { playWelcome } = useWelcomeSound({
        mode: 'tts',            // ← Change to 'mp3' for Solution 1
        // audioSrc: '/audio/welcome.mp3',  // ← Uncomment for Solution 1
        delayMs: 500,           // small delay before sound plays
        cooldownMs: 10_000,     // 10-second cooldown per person
        ttsLang: 'fr-FR',
    });

    useEffect(() => {
        const initializeSystem = async () => {
            try {
                setMessage("Chargement des modèles IA...");
                await FaceRecognitionService.loadModels();

                setMessage("Récupération des données faciales...");
                const usersData = await FirebaseService.getData('users');
                setEmployees(usersData);

                const matcher = FaceRecognitionService.createFaceMatcher(usersData);
                if (matcher) {
                    setFaceMatcher(matcher);
                } else {
                    console.warn("Aucune empreinte faciale trouvée dans la base de données.");
                }

                setIsReady(true);
                setStatus('idle');
                setMessage('Veuillez vous positionner devant la caméra.');
                startVideo();
            } catch (err) {
                console.error("Erreur d'initialisation:", err);
                setMessage("Erreur du système (Modèles ou Base de données inaccessibles).");
                setStatus('error');
            }
        };

        initializeSystem();
        return () => stopVideo();
    }, []);

    const startVideo = () => {
        navigator.mediaDevices.getUserMedia({ video: {} })
            .then((stream) => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setIsCameraActive(true);
            })
            .catch((err) => {
                setMessage("Impossible d'accéder à la webcam.");
                setStatus('error');
            });
    };

    const stopVideo = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
    };

    const handleVideoPlay = () => {
        if (!isReady || !faceMatcher || status === 'success') return;

        const scanInterval = setInterval(async () => {
            // Stop scanning if completed or unmounted
            if (!videoRef.current || status === 'success') {
                clearInterval(scanInterval);
                return;
            }

            const detections = await FaceRecognitionService.detectFace(videoRef.current);

            if (canvasRef.current && videoRef.current) {
                FaceRecognitionService.drawDetections(canvasRef.current, videoRef.current, detections);

                if (detections.length === 1) {
                    setStatus('scanning');
                    setMessage('Recherche dans la base de données...');

                    const capturedDescriptor = FaceRecognitionService.extractDescriptor(detections[0]);

                    // Identifier avec FaceMatcher
                    const matchResult = FaceRecognitionService.identifyFace(faceMatcher, capturedDescriptor);

                    if (matchResult && matchResult.label !== 'unknown' && matchResult.distance < 0.55) {
                        clearInterval(scanInterval);
                        const matchedEmployee = employees.find(emp => emp.id === matchResult.label);
                        handleCheckIn(matchedEmployee, matchResult.distance);
                    } else {
                        setMessage('Visage non reconnu (Accès refusé).');
                        setStatus('error');
                    }
                } else if (detections.length > 1) {
                    setStatus('error');
                    setMessage('Attention: Plusieurs visages détectés !');
                } else {
                    if (status !== 'success') {
                        setStatus('idle');
                        setMessage('En attente de détection...');
                        setIdentifiedUser(null);
                    }
                }
            }
        }, 1000); // 1 scan par seconde pour optimiser
    };

    const handleCheckIn = async (employee, distance) => {
        setIdentifiedUser(employee);

        try {
            const time = new Date().toLocaleTimeString();
            const todayDate = new Date().toLocaleDateString('fr-CA'); // YYYY-MM-DD

            // On récupère l'historique du pointage de cet employé
            const history = await FirebaseService.getDataByCondition('attendance', 'userId', '==', employee.id);

            // On garde seulement ceux d'aujourd'hui et on trie par le plus récent d'abord
            const todayPunches = history
                .filter(record => record.date === todayDate)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // --- VÉRIFICATION DU DÉLAI (Anti-spam d'1 minute) ---
            if (todayPunches.length > 0) {
                const lastPunchTime = new Date(todayPunches[0].timestamp).getTime();
                const diffTime = (new Date().getTime() - lastPunchTime) / 1000; // en secondes

                if (diffTime < 60) { // S'il a pointé il y a moins de 60 secondes
                    setStatus('error');
                    setMessage(`Pointage refusé: Vous venez de pointer il y a moins d'une minute.`);
                    setTimeout(() => {
                        setStatus('idle');
                        setMessage('Prêt pour le prochain pointage.');
                        setIdentifiedUser(null);
                        handleVideoPlay();
                    }, 4000);
                    return; // On stoppe l'enregistrement ici
                }
            }

            // Déterminer automatiquement si c'est une Entrée ou une Sortie
            let actionType = 'check-in';
            if (todayPunches.length > 0 && todayPunches[0].type === 'check-in') {
                actionType = 'check-out';
            }

            setStatus('success'); // Succès confirmé avant affichage du msg

            // ── 🔊 Play welcome audio on successful recognition ───────────────
            // Triggered here — right after identity is confirmed & before DB save.
            // Only plays for check-in; remove the condition if you also want it
            // to play on check-out.
            if (actionType === 'check-in') {
                playWelcome(employee.name); // e.g. "Bonjour Ayman, bienvenue !"
            }

            // --- GÉOLOCALISATION ---
            let location = null;
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
            } catch (geoErr) {
                console.warn("Géolocalisation inaccessible:", geoErr);
                // On continue quand même le pointage, mais sans location
            }

            // Message dynamique pour l'écran
            const greetingMsg = actionType === 'check-in'
                ? `Entrée: Bienvenue ${employee.name} !`
                : `Sortie: À bientôt ${employee.name} !`;

            setMessage(greetingMsg);

            const attendanceRecord = {
                userId: employee.id,
                userName: employee.name,
                type: actionType,
                location: location, // ← Coordonnées GPS ajoutées ici
                method: 'face',
                confidence: distance
            };

            // Utilisation de l'ApiService (Backend Express) au lieu de Firebase direct
            // Note: ApiService s'occupe du timestamp et de la date côté serveur pour plus de sécurité
            await ApiService.punch(attendanceRecord);

            // Notification Telegram Automatique
            TelegramService.sendNotification(employee.name, employee.department, actionType, time);

        } catch (error) {
            console.log("Erreur de sauvegarde de la présence Firestore.", error);
            setMessage(`Erreur lors de l'enregistrement.`);
        }

        // Reset après 4 secondes pour le prochain employé
        setTimeout(() => {
            setStatus('idle');
            setMessage('Prêt pour le prochain pointage.');
            setIdentifiedUser(null);
            handleVideoPlay(); // redémarrer le scan
        }, 4000);
    };

    return (
        <div className="punch-container animate-fade-in">
            <div className="punch-header">
                <h1>Borne de Pointage</h1>
                <p className="text-muted">Analyse Faciale Automatique en Temps Réel</p>
            </div>

            <div className="punch-content">
                <div className="camera-card glass-panel flex flex-col justify-between">
                    <div className="camera-wrapper">
                        {!isReady && status !== 'error' && (
                            <div className="loading-overlay">
                                <RefreshCw className="spinner" size={32} />
                                <p className="mt-2">{message}</p>
                                {!faceMatcher && <p className="text-sm mt-2 text-warning">Assurez-vous qu'au moins un employé avec Face ID est inscrit.</p>}
                            </div>
                        )}

                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            onPlay={handleVideoPlay}
                            className={`video-element ${!isCameraActive ? 'hidden' : ''}`}
                        />
                        <canvas ref={canvasRef} className="overlay-canvas" />

                        {!isCameraActive && status === 'error' && (
                            <div className="error-overlay">
                                <Camera size={48} className="text-muted mb-4" />
                                <p>{message}</p>
                                <button onClick={() => window.location.reload()} className="btn btn-primary mt-4">
                                    Rafraîchir
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={`status-panel mt-4 ${status}`}>
                        {status === 'success' && <CheckCircle size={24} />}
                        {status === 'error' && <XCircle size={24} />}
                        {status === 'scanning' && <RefreshCw size={24} className="spinner" />}
                        {status === 'idle' && <Camera size={24} />}

                        <p className="status-message">{message}</p>
                    </div>
                </div>

                <div className="info-card glass-panel relative">
                    <h3>Instructions</h3>
                    <ul className="instructions-list mt-8">
                        <li><span className="step-num">1</span> Placez-vous bien en face de l'objectif.</li>
                        <li><span className="step-num">2</span> Retirez masques et lunettes.</li>
                        <li><span className="step-num">3</span> Le système vous identifiera automatiquement.</li>
                        <li><span className="step-num">4</span> Attendez le message de validation vert.</li>
                    </ul>

                    <div className="user-profile mt-12 p-4" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)' }}>
                        <h4 className="text-muted">Dernière Identification</h4>
                        <div className="profile-details mt-2">
                            <span className="font-medium text-lg text-primary-light">
                                {identifiedUser ? identifiedUser.name : (status === 'success' ? 'Validation...' : '---')}
                            </span>
                            <span className="text-sm text-muted mt-1">
                                {identifiedUser ? `${new Date().toLocaleTimeString()} - Pointage enregistré` : 'En attente...'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
