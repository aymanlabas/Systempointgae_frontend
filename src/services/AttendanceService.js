import FirebaseService from './FirebaseService';
import { getTodayString, isLate } from '../utils/dateUtils';

/**
 * Service métier pour la gestion des présences
 */
class AttendanceService {

    /**
     * Récupère toutes les présences avec tri par date desc
     */
    async getAllAttendances() {
        const data = await FirebaseService.getData('attendance');
        return data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Pointage avec détection retard automatique
     */
    async punch(userId, userName, type, method = 'face', location = null, scheduleStart = '09:00') {
        const now = new Date();
        const date = getTodayString();
        const time = now.toLocaleTimeString('fr-FR', { hour12: false });
        const late = type === 'check-in' ? isLate(time, scheduleStart) : false;

        const record = {
            userId,
            userName,
            type,
            date,
            time,
            timestamp: now.toISOString(),
            method,
            isLate: late,
            location: location || null,
        };

        return await FirebaseService.saveData('attendance', record);
    }

    /**
     * Récupère le dernier pointage d'un employé aujourd'hui
     */
    async getLastPunchToday(userId) {
        const todayStr = getTodayString();
        const records = await FirebaseService.getDataByCondition('attendance', 'userId', '==', userId);
        const todayRecords = records.filter(r => r.date === todayStr);
        if (!todayRecords.length) return null;
        todayRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return todayRecords[0];
    }

    /**
     * Récupère les présences d'un employé
     */
    async getAttendanceByUser(userId) {
        const data = await FirebaseService.getDataByCondition('attendance', 'userId', '==', userId);
        return data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Détecte les employés absents aujourd'hui et crée des notifications
     */
    async detectAbsencesAndNotify(users, notificationService) {
        const todayStr = getTodayString();
        const now = new Date();
        const hour = now.getHours();

        // On ne déclenche la détection qu'après 10h
        if (hour < 10) return;

        const attendances = await this.getAllAttendances();
        const presentIds = new Set(
            attendances
                .filter(l => l.date === todayStr && l.type === 'check-in')
                .map(l => l.userId)
        );

        const absentEmployees = users.filter(u => u.role !== 'admin' && !presentIds.has(u.uid));

        for (const emp of absentEmployees) {
            await notificationService.createNotification({
                userId: emp.uid,
                title: 'Absence détectée',
                message: `${emp.firstName} ${emp.lastName} est absent(e) aujourd'hui.`,
                type: 'warning',
                targetRole: 'admin',
            });
        }

        return absentEmployees;
    }
}

export default new AttendanceService();
