const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');

/**
 * @route POST /api/attendance/punch
 * @desc Enregistrer un pointage sécurisé
 */
router.post('/punch', authenticate, async (req, res) => {
    try {
        const { type, method, location, scheduleStart, userName } = req.body;
        const userId = req.user.uid;

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('fr-FR', { hour12: false });

        // Logique de détection de retard backend
        const limitTime = scheduleStart || '09:00';
        const isLate = type === 'check-in' && timeStr.substring(0, 5) > limitTime;

        const record = {
            userId,
            userName,
            type,
            date: dateStr,
            time: timeStr,
            timestamp: now.toISOString(),
            method: method || 'face',
            isLate,
            location: location || null,
        };

        const docRef = await db.collection('attendance').add(record);
        res.status(201).json({ id: docRef.id, ...record });

    } catch (error) {
        console.error('Punch Error:', error);
        res.status(500).json({ error: 'Erreur lors du pointage' });
    }
});

/**
 * @route GET /api/attendance/stats
 * @desc Récupérer les statistiques globales pour le dashboard (Admin)
 */
router.get('/stats', authenticate, async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];

        const [usersSnap, attendanceSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('attendance').where('date', '==', todayStr).get()
        ]);

        const totalEmployees = usersSnap.size - 1; // Exclure l'admin
        const checkInsToday = attendanceSnap.docs.filter(d => d.data().type === 'check-in');

        const presentCount = new Set(checkInsToday.map(d => d.data().userId)).size;
        const lateCount = checkInsToday.filter(d => d.data().isLate).size;
        const absentCount = Math.max(0, totalEmployees - presentCount);

        res.json({
            totalEmployees,
            presentCount,
            lateCount,
            absentCount,
            date: todayStr
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur stats' });
    }
});

module.exports = router;
