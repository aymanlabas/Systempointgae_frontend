import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, CheckCircle, XCircle, RefreshCw, Info, Camera } from 'lucide-react';
import FirebaseService from '../services/FirebaseService';
import TelegramService from '../services/TelegramService';
import NotificationService from '../services/NotificationService';
import './Scanner.css';

export default function Scanner() {
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('Initialisation de la caméra...');
    const [isCameraReady, setIsCameraReady] = useState(false);
    const isProcessing = useRef(false);
    const html5QrCode = useRef(null);

    useEffect(() => {
        // Initialisation du moteur de scan
        html5QrCode.current = new Html5Qrcode("reader");

        const startCamera = async () => {
            try {
                const config = {
                    fps: 15,
                    qrbox: { width: 250, height: 250 }
                };

                // On tente d'utiliser la caméra arrière en priorité
                await html5QrCode.current.start(
                    { facingMode: "environment" },
                    config,
                    onScanSuccess
                );

                setIsCameraReady(true);
                setMessage('Prêt à scanner votre QR Code.');
            } catch (err) {
                console.error("Erreur caméra:", err);
                // Fallback sur n'importe quelle caméra si la caméra arrière échoue
                try {
                    await html5QrCode.current.start(
                        { facingMode: "user" },
                        config,
                        onScanSuccess
                    );
                    setIsCameraReady(true);
                    setMessage('Prêt à scanner votre QR Code.');
                } catch (fallbackErr) {
                    setStatus('error');
                    setMessage("Impossible d'accéder à la caméra.");
                }
            }
        };

        startCamera();

        return () => {
            if (html5QrCode.current && html5QrCode.current.isScanning) {
                html5QrCode.current.stop().catch(err => console.error("Stop error", err));
            }
        };
    }, []);

    const onScanSuccess = async (decodedText) => {
        if (isProcessing.current) return;

        isProcessing.current = true;
        console.log("QR Code détecté:", decodedText);

        // Signal visuel de détection (optionnel : faire vibrer le téléphone si possible)
        if (navigator.vibrate) navigator.vibrate(100);

        await handleCheckIn(decodedText);
    };

    const handleCheckIn = async (userId) => {
        setStatus('scanning');
        setMessage('Vérification...');

        try {
            const users = await FirebaseService.getDataByCondition('users', 'uid', '==', userId);
            const employee = users.length > 0 ? users[0] : null;

            if (!employee) {
                setStatus('error');
                setMessage('Employé non trouvé.');
                resetAfterDelay();
                return;
            }

            const time = new Date().toLocaleTimeString();
            const todayDate = new Date().toLocaleDateString('fr-CA');

            const history = await FirebaseService.getDataByCondition('attendance', 'userId', '==', employee.id);
            const todayPunches = history
                .filter(record => record.date === todayDate)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            if (todayPunches.length > 0) {
                const lastPunchTime = new Date(todayPunches[0].timestamp).getTime();
                const diffTime = (Date.now() - lastPunchTime) / 1000;

                if (diffTime < 60) {
                    setStatus('error');
                    setMessage(`Déjà pointé il y a ${Math.round(diffTime)}s.`);
                    resetAfterDelay();
                    return;
                }
            }

            let actionType = 'check-in';
            if (todayPunches.length > 0 && todayPunches[0].type === 'check-in') {
                actionType = 'check-out';
            }

            // --- GÉOLOCALISATION ---
            let location = null;
            try {
                const position = await new Promise((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
                );
                location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
            } catch (geoErr) {
                console.warn('Géolocalisation inaccessible:', geoErr);
            }

            const attendanceRecord = {
                userId: employee.id,
                userName: employee.name || `${employee.firstName} ${employee.lastName}`,
                date: todayDate,
                time: time,
                timestamp: new Date().toISOString(),
                type: actionType,
                method: 'QR_CODE',
                location: location,
            };

            await FirebaseService.saveData('attendance', attendanceRecord);
            await TelegramService.sendNotification(attendanceRecord.userName, employee.department, actionType, time, location);

            // 🔔 Notification RH avec localisation GPS
            NotificationService.notifyHRWithLocation(
                attendanceRecord.userName,
                actionType,
                time,
                location,
                employee.id
            );

            setStatus('success');
            setMessage(actionType === 'check-in' ? `Entrée : Bonjour ${employee.firstName} !` : `Sortie : Au revoir ${employee.firstName} !`);

        } catch (error) {
            console.error("Erreur:", error);
            setStatus('error');
            setMessage('Erreur technique.');
        }

        resetAfterDelay();
    };

    const resetAfterDelay = () => {
        setTimeout(() => {
            setStatus('idle');
            setMessage('Prêt pour le prochain scan.');
            isProcessing.current = false;
        }, 4000);
    };

    return (
        <div className="scanner-page animate-fade-in">
            <div className="scanner-header">
                <h1>Borne de Pointage QR</h1>
                <p className="text-muted">Lecteur Automatique de Badge Numérique</p>
            </div>

            <div className="scanner-content">
                <div className="scanner-card glass-panel">
                    <div className="reader-wrapper">
                        <div id="reader"></div>
                        <div className="scan-overlay">
                            <div className="scan-region"></div>
                        </div>
                        {!isCameraReady && status !== 'error' && (
                            <div className="camera-loading">
                                <RefreshCw className="spinner" size={32} />
                                <p>Démarrage caméra...</p>
                            </div>
                        )}
                    </div>

                    <div className={`scanner-status ${status}`}>
                        {status === 'idle' && <QrCode size={24} />}
                        {status === 'scanning' && <RefreshCw size={24} className="spinner" />}
                        {status === 'success' && <CheckCircle size={24} />}
                        {status === 'error' && <XCircle size={24} />}
                        <p>{message}</p>
                    </div>
                </div>

                <div className="instructions-card glass-panel">
                    <h3>Instructions</h3>
                    <ul className="instructions-list mt-6">
                        <li><span className="step-num">1</span> Ouvrez votre QR Code sur votre profil.</li>
                        <li><span className="step-num">2</span> Placez-le dans le carré de lecture.</li>
                        <li><span className="step-num">3</span> Gardez l'image stable un court instant.</li>
                        <li><span className="step-num">4</span> La validation sera automatique.</li>
                    </ul>

                    <div className="qr-preview-box mt-8">
                        <div className="qr-outline">
                            <QrCode size={40} className="text-muted" />
                        </div>
                        <p className="text-xs text-muted mt-4">Zone de lecture optimale</p>
                    </div>

                    <button onClick={() => window.location.reload()} className="btn btn-secondary w-full mt-4">
                        <Camera size={16} /> Relancer la caméra
                    </button>
                </div>
            </div>
        </div>
    );
}
